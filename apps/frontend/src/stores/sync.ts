import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner';
import { useMutation } from '@tanstack/vue-query';
import type { Product, Transaction } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { api, getStoreId } from '@/services/api';
import { queryClient } from '@/lib/queryClient';

const BATCH_SIZE = 100;

/**
 * Offline mutation queue + auto background sync (FR-SYNC-03, FR-SYNC-04).
 * `@tanstack/vue-query` useMutation membungkus pengiriman batch ke API server.
 * Dexie = queue persisten; saat online, produk & transaksi isSynced=false
 * dikirim idempotent lalu ditandai synced. Produk disinkron lebih dulu agar
 * transaksi (yang mereferensikan productId) valid saat sampai di server.
 */
export const useSyncStore = defineStore('sync', () => {
  const pendingCount = ref(0);
  const pendingProducts = ref(0);
  const isSyncingInternal = ref(false);
  const lastSyncAt = ref<number | null>(null);
  const lastError = ref<string | null>(null);

  // TanStack Query Mutation untuk Product Sync
  const syncProductsMutation = useMutation(
    {
      mutationFn: (batch: Product[]) =>
        api.syncProducts({ storeId: getStoreId(), products: batch }),
    },
    queryClient,
  );

  // TanStack Query Mutation untuk Transaction Sync
  const syncTransactionsMutation = useMutation(
    {
      mutationFn: (batch: Transaction[]) =>
        api.syncTransactions({ storeId: getStoreId(), transactions: batch }),
    },
    queryClient,
  );

  const syncing = computed(
    () =>
      isSyncingInternal.value ||
      syncProductsMutation.isPending.value ||
      syncTransactionsMutation.isPending.value,
  );

  const pendingUnsynced = computed(() => pendingCount.value);

  /** Toast error hanya untuk pesan yang BERUBAH — hindari spam tiap retry. */
  let lastNotifiedError: string | null = null;
  function notifyLastError() {
    if (lastError.value && lastError.value !== lastNotifiedError) {
      lastNotifiedError = lastError.value;
      toast.error(lastError.value, { description: 'Cek apakah server (backend) sudah berjalan.' });
    }
  }

  // Notifikasi stok menipis memakai endpoint server GET /inventory/low-stock
  // (PRD §5.1.1). Dibatasi jeda agar tidak spam tiap siklus auto-sync.
  const LOW_STOCK_NOTIFY_MS = 10 * 60 * 1000;
  let lastLowStockNotify = 0;

  async function notifyLowStock() {
    if (!navigator.onLine) return;
    const now = Date.now();
    if (now - lastLowStockNotify < LOW_STOCK_NOTIFY_MS) return;
    try {
      const low = await api.getLowStock();
      if (low.length === 0) return;
      lastLowStockNotify = now;
      toast.warning(`${low.length} produk stok menipis.`, {
        description:
          low
            .slice(0, 3)
            .map((p) => `${p.name} (sisa ${p.stock} ${p.unit})`)
            .join(', ') + (low.length > 3 ? `, +${low.length - 3} lainnya` : ''),
      });
    } catch {
      // offline/gagal — abaikan, coba lagi di siklus berikutnya
    }
  }

  async function refreshCount() {
    pendingCount.value = await db.transactions.filter((t) => !t.isSynced).count();
    pendingProducts.value = await db.products.filter((p) => p.isSynced === false).count();
  }

  /** Kirim satu batch produk; return true bila ada yang tersinkron. */
  async function syncProductsBatch(): Promise<boolean> {
    if (syncing.value) return false;
    if (!navigator.onLine) return false;

    const batch = await db.products
      .filter((p) => p.isSynced === false)
      .limit(BATCH_SIZE)
      .toArray();
    if (batch.length === 0) return false;

    isSyncingInternal.value = true;
    lastError.value = null;
    try {
      const result = await syncProductsMutation.mutateAsync(batch);
      const toDelete: string[] = [];
      const toUpdate: Array<{ key: string; changes: any }> = [];

      for (const r of result.synced) {
        const local = batch.find((p) => p.id === r.id);
        if (!local) continue;
        if (local.isDeleted) {
          toDelete.push(r.id);
        } else {
          const photoPending = local.image?.startsWith('data:') && !r.image;
          toUpdate.push({
            key: r.id,
            changes: photoPending
              ? { isSynced: false }
              : { isSynced: true, image: r.image ?? local.image ?? undefined },
          });
        }
      }

      if (toDelete.length > 0) await db.products.bulkDelete(toDelete);
      if (toUpdate.length > 0) await db.products.bulkUpdate(toUpdate);

      const syncedCount = toDelete.length + toUpdate.filter((c) => c.changes.isSynced).length;
      if (syncedCount > 0) {
        lastSyncAt.value = Date.now();
        toast.success(`${syncedCount} produk tersinkron.`);
      }
      await refreshCount();
      return syncedCount > 0;
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : 'Gagal sinkronisasi produk';
      return false;
    } finally {
      isSyncingInternal.value = false;
    }
  }

  /** Kirim satu batch transaksi; return true bila ada yang tersinkron. */
  async function syncBatch(): Promise<boolean> {
    if (syncing.value) return false;
    if (!navigator.onLine) return false;

    const batch = await db.transactions
      .filter((t) => !t.isSynced)
      .limit(BATCH_SIZE)
      .toArray();
    if (batch.length === 0) {
      // Tidak ada yang perlu disinkron — bersihkan pesan error usang agar
      // peringatan "logout & login lagi" tidak menggantung di layar.
      lastError.value = null;
      await refreshCount();
      return false;
    }

    isSyncingInternal.value = true;
    lastError.value = null;
    try {
      const result = await syncTransactionsMutation.mutateAsync(batch);
      const syncedIds = new Set([...result.synced, ...(result.skipped ?? [])]);
      await db.transactions.bulkUpdate(
        batch
          .filter((t) => syncedIds.has(t.id))
          .map((t) => ({
            key: t.id,
            changes: {
              isSynced: true,
              // Server membetulkan invoiceNo yang bentrok -> perbarui lokal
              // agar nomor di Laporan/struk sesuai dengan yang tersimpan.
              ...(result.invoiceNoMap?.[t.id]
                ? { invoiceNo: result.invoiceNoMap[t.id] }
                : {}),
            },
          })),
      );
      if (result.synced.length > 0) {
        lastSyncAt.value = Date.now();
        toast.success(`${result.synced.length} transaksi tersinkron.`);
      }
      if (result.skipped && result.skipped.length > 0) {
        toast.warning(`${result.skipped.length} transaksi dilewati (produk tidak ditemukan di server).`);
      }
      await refreshCount();
      return syncedIds.size > 0;
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : 'Gagal sinkronisasi';
      return false;
    } finally {
      isSyncingInternal.value = false;
    }
  }

  /** Drain antrean produk dulu (FK transaksi), lalu transaksi. */
  async function runSync() {
    if (!navigator.onLine) return;
    let more = true;
    while (more && navigator.onLine) {
      const ok = await syncProductsBatch();
      if (!ok) break;
      more = pendingProducts.value > 0;
      if (more) await new Promise((r) => setTimeout(r, 250));
    }
    more = true;
    while (more && navigator.onLine) {
      const ok = await syncBatch();
      if (!ok) break;
      more = pendingCount.value > 0;
      if (more) await new Promise((r) => setTimeout(r, 250));
    }
    notifyLastError();
    await notifyLowStock();
  }

  /**
   * Pemulihan riwayat: tarik semua transaksi dari server lalu isi IndexedDB
   * (idempoten per id). Dipanggil otomatis saat lokal kosong (mis. setelah
   * clear site data / ganti HP) dan bisa dipicu manual dari layar Sync.
   */
  async function restoreTransactionsFromServer(): Promise<number> {
    if (!navigator.onLine) return 0;
    try {
      const rows = await api.getTransactions(getStoreId());
      if (rows.length === 0) return 0;
      const existingIds = new Set(
        (await db.transactions.toArray()).map((t) => t.id),
      );
      const toAdd = rows.filter((t) => !existingIds.has(t.id));
      if (toAdd.length > 0) await db.transactions.bulkAdd(toAdd);
      await refreshCount();
      return toAdd.length;
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : 'Gagal memulihkan riwayat dari server';
      return 0;
    }
  }

  /**
   * Pemulihan katalog: tarik produk dari server lalu TIMPA IndexedDB lokal
   * (server = sumber otoritatif utk data yang sudah synced). Dipanggil otomatis
   * saat katalog lokal kosong (setelah clear site data / ganti HP) sehingga
   * produk baru/edit yang sudah disinkron tidak hilang.
   */
  async function restoreProductsFromServer(): Promise<number> {
    if (!navigator.onLine) return 0;
    try {
      const rows = await api.getProducts(getStoreId());
      if (rows.length === 0) return 0;
      const withSync = rows.map((p) => ({ ...p, isSynced: true }));
      await db.products.bulkPut(withSync);
      await refreshCount();
      return rows.length;
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : 'Gagal memulihkan katalog dari server';
      return 0;
    }
  }

  /**
   * Self-heal: produk yang stoknya berkurang karena transaksi yang BELUM
   * tersinkron ditandai isSynced=false, sehingga stok terbaru ikut dikirim
   * lewat product sync. Dipanggil sekali saat bootstrap — menangani transaksi
   * lama (pra-fix) agar stoknya benar di server.
   */
  async function ensurePendingStockDirty(): Promise<void> {
    try {
      const pending = await db.transactions.filter((t) => !t.isSynced).toArray();
      const ids = Array.from(new Set(pending.flatMap((t) => t.items.map((i) => i.productId))));
      if (ids.length === 0) return;
      const products = await db.products.bulkGet(ids);
      const updates = products
        .filter((p): p is Product => p !== undefined && p.isSynced !== false)
        .map((p) => ({ key: p.id, changes: { isSynced: false } }));
      if (updates.length > 0) await db.products.bulkUpdate(updates);
    } catch {
      // abaikan — akan ter-handle di sinkronisasi berikutnya
    }
  }

  return {
    pendingCount,
    pendingProducts,
    syncing,
    lastSyncAt,
    lastError,
    pendingUnsynced,
    refreshCount,
    syncProductsBatch,
    syncBatch,
    runSync,
    restoreTransactionsFromServer,
    restoreProductsFromServer,
    ensurePendingStockDirty,
    syncProductsMutation,
    syncTransactionsMutation,
  };
});

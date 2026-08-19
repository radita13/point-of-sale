import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner';
import type { Product } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { api, getStoreId } from '@/services/api';

const BATCH_SIZE = 100;

export const useSyncStore = defineStore('sync', () => {
  const pendingCount = ref(0);
  const pendingProducts = ref(0);
  const isSyncingInternal = ref(false);
  const lastSyncAt = ref<number | null>(null);
  const lastError = ref<string | null>(null);
  const lastProductPullAt = ref<number | null>(null);
  const productsUpdatedListeners: Array<() => void> = [];

  function onProductsUpdated(cb: () => void) {
    productsUpdatedListeners.push(cb);
    return () => {
      const idx = productsUpdatedListeners.indexOf(cb);
      if (idx !== -1) productsUpdatedListeners.splice(idx, 1);
    };
  }

  function notifyProductsUpdated() {
    for (const listener of productsUpdatedListeners) {
      try {
        listener();
      } catch (e) {
        console.error('[sync] Error in productsUpdated listener:', e);
      }
    }
  }

  const syncing = computed(() => isSyncingInternal.value);
  const pendingUnsynced = computed(() => pendingCount.value);

  let lastNotifiedError: string | null = null;
  function notifyLastError() {
    if (lastError.value && lastError.value !== lastNotifiedError) {
      lastNotifiedError = lastError.value;
      toast.error(lastError.value, { description: 'Cek apakah server (backend) sudah berjalan.' });
    }
  }

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
    } catch {}
  }

  async function refreshCount() {
    pendingCount.value = await db.transactions.filter((t) => !t.isSynced).count();
    pendingProducts.value = await db.products.filter((p) => p.isSynced === false).count();
  }

  async function syncProductsBatch(): Promise<boolean> {
    if (syncing.value || !navigator.onLine) return false;

    const batch = await db.products
      .filter((p) => p.isSynced === false)
      .limit(BATCH_SIZE)
      .toArray();
    if (batch.length === 0) return false;

    isSyncingInternal.value = true;
    lastError.value = null;
    try {
      const result = await api.syncProducts({ storeId: getStoreId(), products: batch });
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

  async function syncBatch(): Promise<boolean> {
    if (syncing.value || !navigator.onLine) return false;

    const batch = await db.transactions
      .filter((t) => !t.isSynced)
      .limit(BATCH_SIZE)
      .toArray();
    if (batch.length === 0) {
      lastError.value = null;
      await refreshCount();
      return false;
    }

    isSyncingInternal.value = true;
    lastError.value = null;
    try {
      const result = await api.syncTransactions({ storeId: getStoreId(), transactions: batch });
      const syncedIds = new Set([...result.synced, ...(result.skipped ?? [])]);
      await db.transactions.bulkUpdate(
        batch
          .filter((t) => syncedIds.has(t.id))
          .map((t) => ({
            key: t.id,
            changes: {
              isSynced: true,
              ...(result.invoiceNoMap?.[t.id] ? { invoiceNo: result.invoiceNoMap[t.id] } : {}),
            },
          }))
      );
      if (result.synced.length > 0) {
        lastSyncAt.value = Date.now();
        toast.success(`${result.synced.length} transaksi tersinkron.`);
      }
      if (result.skipped && result.skipped.length > 0) {
        toast.warning(
          `${result.skipped.length} transaksi dilewati (produk tidak ditemukan di server).`
        );
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

  async function pullProductsFromServer(): Promise<number> {
    if (!navigator.onLine) return 0;
    try {
      const since = lastProductPullAt.value ?? undefined;
      const startTime = Date.now();
      const serverProducts = await api.getProducts(getStoreId(), undefined, undefined, since);
      if (!serverProducts || serverProducts.length === 0) {
        lastProductPullAt.value = startTime;
        return 0;
      }

      const localProducts = await db.products.toArray();
      const localMap = new Map(localProducts.map((p) => [p.id, p]));

      const toPut: Product[] = [];
      const toDeleteIds: string[] = [];

      for (const sp of serverProducts) {
        const local = localMap.get(sp.id);
        if (local && local.isSynced === false) {
          // Jangan timpa jika ada perubahan lokal yang belum tersimpan ke server
          continue;
        }

        if (sp.isDeleted) {
          if (local) toDeleteIds.push(sp.id);
        } else {
          toPut.push({
            ...sp,
            stock: Number(sp.stock),
            minStock: Number(sp.minStock),
            step: sp.step != null ? Number(sp.step) : undefined,
            costPrice: Number(sp.costPrice),
            sellingPrice: Number(sp.sellingPrice),
            smallPrice: sp.smallPrice != null ? Number(sp.smallPrice) : undefined,
            isSynced: true,
          });
        }
      }

      if (toDeleteIds.length > 0) {
        await db.products.bulkDelete(toDeleteIds);
      }
      if (toPut.length > 0) {
        await db.products.bulkPut(toPut);
      }

      lastProductPullAt.value = startTime;

      if (toPut.length > 0 || toDeleteIds.length > 0) {
        notifyProductsUpdated();
      }

      return toPut.length + toDeleteIds.length;
    } catch (err) {
      console.warn('[sync] Incremental product pull failed:', err);
      return 0;
    }
  }

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
    await pullProductsFromServer();
    notifyLastError();
    await notifyLowStock();
  }

  async function restoreTransactionsFromServer(): Promise<number> {
    if (!navigator.onLine) return 0;
    try {
      const rows = await api.getTransactions(getStoreId());
      if (rows.length === 0) return 0;
      const existingIds = new Set((await db.transactions.toArray()).map((t) => t.id));
      const toAdd = rows.filter((t) => !existingIds.has(t.id));
      if (toAdd.length > 0) await db.transactions.bulkAdd(toAdd);
      await refreshCount();
      return toAdd.length;
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : 'Gagal memulihkan riwayat dari server';
      return 0;
    }
  }

  async function restoreProductsFromServer(): Promise<number> {
    if (!navigator.onLine) return 0;
    try {
      const rows = await api.getProducts(getStoreId());
      if (rows.length === 0) return 0;
      const withSync = rows.map((p) => ({
        ...p,
        stock: Number(p.stock),
        minStock: Number(p.minStock),
        step: p.step != null ? Number(p.step) : undefined,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        smallPrice: p.smallPrice != null ? Number(p.smallPrice) : undefined,
        isSynced: true,
      }));
      await db.products.bulkPut(withSync);
      await refreshCount();
      return rows.length;
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : 'Gagal memulihkan katalog dari server';
      return 0;
    }
  }

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
    } catch {}
  }

  async function cleanupOldTransactions(): Promise<number> {
    try {
      const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
      const cutoffTime = Date.now() - SIX_MONTHS_MS;

      const oldTransactions = await db.transactions
        .filter((t) => Boolean(t.isSynced) && t.timestamp < cutoffTime)
        .toArray();

      if (oldTransactions.length === 0) return 0;

      const oldIds = oldTransactions.map((t) => t.id);
      await db.transactions.bulkDelete(oldIds);
      console.info(
        `[Housekeeping] ${oldIds.length} transaksi lokal > 6 bulan telah dibersihkan dari IndexedDB.`
      );
      return oldIds.length;
    } catch (err) {
      console.warn('[Housekeeping] Gagal membersihkan transaksi lama:', err);
      return 0;
    }
  }

  async function retrySingleTransaction(txId: string): Promise<boolean> {
    if (!navigator.onLine) {
      toast.error('Perangkat sedang offline.');
      return false;
    }
    const tx = await db.transactions.get(txId);
    if (!tx) return false;

    isSyncingInternal.value = true;
    try {
      const result = await api.syncTransactions({ storeId: getStoreId(), transactions: [tx] });
      if (result.synced.includes(tx.id)) {
        await db.transactions.update(tx.id, {
          isSynced: true,
          syncError: undefined,
          ...(result.invoiceNoMap?.[tx.id] ? { invoiceNo: result.invoiceNoMap[tx.id] } : {}),
        });
        toast.success(`Transaksi ${tx.invoiceNo} berhasil tersinkron.`);
        await refreshCount();
        return true;
      } else if (result.skipped?.includes(tx.id)) {
        await db.transactions.update(tx.id, {
          isSynced: true,
          syncError: 'Dilewati: Produk dalam transaksi tidak ditemukan di server.',
        });
        toast.warning(`Transaksi ${tx.invoiceNo} dilewati oleh server.`);
        await refreshCount();
        return true;
      }
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal retry sync';
      await db.transactions.update(tx.id, { syncError: msg });
      toast.error(`Gagal sync ${tx.invoiceNo}: ${msg}`);
      return false;
    } finally {
      isSyncingInternal.value = false;
    }
  }

  return {
    pendingCount,
    pendingProducts,
    syncing,
    lastSyncAt,
    lastError,
    pendingUnsynced,
    onProductsUpdated,
    pullProductsFromServer,
    refreshCount,
    syncProductsBatch,
    syncBatch,
    runSync,
    restoreTransactionsFromServer,
    restoreProductsFromServer,
    ensurePendingStockDirty,
    cleanupOldTransactions,
    retrySingleTransaction,
  };
});

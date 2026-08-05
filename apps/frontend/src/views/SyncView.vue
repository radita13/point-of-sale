<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { RefreshCw, HardDrive, Trash2, X, AlertTriangle, Package, ArrowLeft, Settings } from 'lucide-vue-next';
import type { Product, Transaction } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { formatPrice } from '@/lib/utils';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import { useNetworkStore } from '@/stores';
import { useSyncStore } from '@/stores/sync';

const router = useRouter();
const network = useNetworkStore();
const sync = useSyncStore();
const pending = ref<Transaction[]>([]);
const pendingProductsList = ref<Product[]>([]);

const isAuthError = computed(() => /401|token|Authorization|otentikasi|authentication/i.test(sync.lastError ?? ''));

// --- Penyimpanan lokal ---
const storage = ref({ bytes: 0, quota: 0, products: 0, transactions: 0 });
const showClearConfirm = ref(false);
const clearing = ref(false);
const usedPercent = computed(() =>
  storage.value.quota > 0 ? Math.min(100, Math.round((storage.value.bytes / storage.value.quota) * 100)) : 0,
);
const isNearlyFull = computed(() => usedPercent.value >= 80);

function formatBytes(n: number): string {
  if (!n || n <= 0) return '0 KB';
  const mb = n / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}
function formatQuota(n: number): string {
  const gb = n / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(n / (1024 * 1024)).toFixed(0)} MB`;
}

async function estimateLocalData() {
  // Hitung pemakaian asli origin (IndexedDB + cache + metadata) via API
  // browser — angka ini sama dengan yang terlihat di F12 > Application > Storage.
  let usage = 0;
  let quota = 0;
  try {
    const est = await navigator.storage?.estimate?.();
    usage = est?.usage ?? 0;
    quota = est?.quota ?? 0;
  } catch {
    usage = 0;
    quota = 0;
  }
  if (usage === 0) {
    // Fallback bila API storage tidak tersedia: perkiraan dari data bisnis.
    const [products, transactions] = await Promise.all([
      db.products.toArray(),
      db.transactions.toArray(),
    ]);
    usage = JSON.stringify({ products, transactions }).length * 2;
    storage.value.products = products.length;
    storage.value.transactions = transactions.length;
  } else {
    const [products, transactions] = await Promise.all([
      db.products.count(),
      db.transactions.count(),
    ]);
    storage.value.products = products;
    storage.value.transactions = transactions;
  }
  storage.value.bytes = usage;
  storage.value.quota = quota;
}

/** Hapus seluruh data lokal (produk & transaksi).
 *
 * Memakai `db.delete()` (bukan `clear()` per tabel) agar IndexedDB benar-benar
 * dihapus & ruangnya langsung bebas. Setelah itu kita TIDAK langsung seed /
 * restore di bootstrap — ini sebabnya storage dulu tampak naik (data ditulis
 * ulang oleh auto-restore + ruang lama belum dilepas browser). Katalog
 * dipulihkan otomatis saat user membuka Kasir/Inventaris & riwayat di Laporan.
 * Antrean offline yang belum tersinkron akan hilang (sudah diperingatkan). */
async function confirmClearLocal() {
  clearing.value = true;
  try {
    sessionStorage.setItem('pos_local_cleared', '1');
    await db.delete();
    window.location.reload();
  } finally {
    clearing.value = false;
  }
}

async function reloadPending() {
  const [txs, prods] = await Promise.all([
    db.transactions.filter((t) => !t.isSynced).reverse().sortBy('timestamp'),
    db.products.filter((p) => p.isSynced === false).reverse().sortBy('updatedAt'),
  ]);
  pending.value = txs;
  pendingProductsList.value = prods;
}

async function refreshAll() {
  await reloadPending();
  await sync.refreshCount();
  await estimateLocalData();
}

onMounted(() => {
  refreshAll();
  window.addEventListener('online', refreshAll);
});
onUnmounted(() => window.removeEventListener('online', refreshAll));

function forceSyncNow() {
  if (!network.isOnline) return;
  void sync.runSync().then(refreshAll);
}
</script>

<template>
  <div class="min-h-[100dvh] bg-canvas">
    <!-- Header halaman terpisah -->
    <header class="mx-auto max-w-7xl px-3 pt-3 sm:px-6">
      <div class="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-surface p-3 shadow-hard-md sm:p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-card-blue text-white shadow-hard-sm">
            <Settings class="h-5 w-5" />
          </div>
          <div class="leading-tight">
            <h1 class="text-base font-extrabold sm:text-lg">Pengaturan Sync</h1>
            <p class="text-[11px] font-bold text-ink/50">Offline Engine &amp; Background Sync</p>
          </div>
        </div>
        <Button variant="secondary" @click="router.push({ name: 'kasir' })">
          <ArrowLeft class="h-4 w-4" /> Kembali
        </Button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-3 py-4 sm:px-6">
      <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-md">
      <div>
        <h2 class="text-lg font-extrabold">Offline Engine & Background Sync</h2>
        <p class="text-xs font-semibold text-gray-600">IndexedDB Queue & Status Auto-Sync Server</p>
        <p v-if="sync.lastError" class="mt-1 text-[11px] font-bold text-card-coral">Terakhir gagal: {{ sync.lastError }}</p>
        <p v-if="isAuthError" class="mt-1 text-[11px] font-bold text-card-coral">
          Sesi login kedaluwarsa/tidak valid — keluar lalu masuk lagi lewat Supabase untuk mendapatkan token baru.
        </p>
      </div>
      <Button :disabled="(pending.length === 0 && sync.pendingProducts === 0) || !network.isOnline" @click="forceSyncNow">
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': sync.syncing }" />
        {{ sync.syncing ? 'Menyinkronkan...' : 'Sync Antrean Sekarang' }}
      </Button>
    </div>

    <Card class="p-4">
      <div class="mb-2 flex flex-wrap items-center gap-2 border-b-2 border-ink pb-2">
        <h3 class="text-sm font-extrabold">Antrean Belum Tersinkron</h3>
        <span class="ml-auto flex items-center gap-1.5 text-[10px] font-black">
          <span class="rounded-full border border-ink bg-canvas px-2.5 py-0.5">Transaksi: {{ pending.length }}</span>
          <span class="h-1 w-1 rounded-full bg-ink/40" aria-hidden="true" />
          <span class="rounded-full border border-ink bg-canvas px-2.5 py-0.5">Produk: {{ pendingProductsList.length }}</span>
        </span>
      </div>

      <div v-if="pending.length === 0 && pendingProductsList.length === 0" class="py-8 text-center text-xs font-bold text-gray-500">
        Semua data lokal telah tersinkronisasi.
      </div>

      <!-- Transaksi offline -->
      <template v-if="pending.length > 0">
        <div class="mb-1.5 flex items-center gap-2">
          <h4 class="text-[11px] font-black uppercase tracking-wider text-gray-500">Transaksi</h4>
          <div class="h-px flex-1 bg-ink/15" />
        </div>
        <div class="space-y-2">
          <div v-for="t in pending" :key="t.id" class="flex items-center justify-between rounded-xl border-2 border-ink bg-canvas p-3 text-xs font-bold">
            <div>
              <h4 class="font-extrabold">{{ t.invoiceNo }}</h4>
              <p class="text-[10px] text-gray-600">Total: Rp {{ formatPrice(t.finalAmount) }} • {{ t.paymentMethod }}</p>
            </div>
            <span class="rounded-full border border-ink bg-card-coral px-2.5 py-1 text-[10px] font-black text-white">OFFLINE QUEUE</span>
          </div>
        </div>
      </template>

      <!-- Produk offline -->
      <template v-if="pendingProductsList.length > 0">
        <div :class="['flex items-center gap-2', pending.length > 0 ? 'mt-3' : '']">
          <h4 class="text-[11px] font-black uppercase tracking-wider text-gray-500">Produk</h4>
          <div class="h-px flex-1 bg-ink/15" />
        </div>
        <div class="mt-1.5 space-y-2">
          <div v-for="p in pendingProductsList" :key="p.id" class="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-canvas p-3 text-xs font-bold">
            <div class="flex min-w-0 items-center gap-2.5">
              <img v-if="p.image" :src="p.image" :alt="p.name" class="h-9 w-9 shrink-0 rounded-lg border border-ink bg-white object-cover" />
              <div v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink bg-white text-ink/30"><Package class="h-4 w-4" /></div>
              <div class="min-w-0">
                <h4 class="truncate font-extrabold">{{ p.name }}</h4>
                <p class="text-[10px] text-gray-600">SKU: #{{ p.sku }} • Stok: {{ p.stock }} {{ p.unit }}</p>
              </div>
            </div>
            <span class="shrink-0 rounded-full border border-ink bg-card-blue px-2.5 py-1 text-[10px] font-black text-white">BELUM SYNC</span>
          </div>
        </div>
      </template>
    </Card>

    <Card class="p-4">
      <div class="mb-3 flex items-center gap-2 border-b-2 border-ink pb-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-card-blue text-white shadow-hard-sm"><HardDrive class="h-4 w-4" /></div>
        <h3 class="text-sm font-extrabold">Penyimpanan Lokal</h3>
        <span
          v-if="isNearlyFull"
          class="ml-auto inline-flex items-center gap-1 rounded-full border border-ink bg-card-coral px-2 py-0.5 text-[10px] font-black text-white"
        >
          <AlertTriangle class="h-3 w-3" /> HAMPIR PENUH
        </span>
        <span v-else class="ml-auto rounded-full border border-ink bg-card-green px-2 py-0.5 text-[10px] font-black text-white">SEHAT</span>
      </div>

      <div class="space-y-2 text-xs font-bold">
        <div class="flex items-baseline justify-between">
          <span class="text-gray-600">Data terpakai</span>
          <span><b class="text-base font-extrabold text-brand">{{ formatBytes(storage.bytes) }}</b>
            <span class="text-gray-500"> / {{ storage.quota ? formatQuota(storage.quota) : 'tidak diketahui' }}</span>
          </span>
        </div>
        <div class="h-2.5 w-full overflow-hidden rounded-full border border-ink bg-canvas">
          <div
            class="h-full rounded-full transition-all"
            :class="isNearlyFull ? 'bg-card-coral' : 'bg-brand'"
            :style="{ width: usedPercent + '%' }"
          />
        </div>
        <p class="text-[10px] text-gray-600">{{ usedPercent }}% dari kuota browser</p>

        <div class="grid grid-cols-3 gap-2 border-t-2 border-ink pt-2 text-center">
          <div class="rounded-xl border border-ink bg-canvas p-2">
            <p class="text-sm font-extrabold">{{ storage.products }}</p>
            <p class="text-[9px] text-gray-600">Produk</p>
          </div>
          <div class="rounded-xl border border-ink bg-canvas p-2">
            <p class="text-sm font-extrabold">{{ storage.transactions }}</p>
            <p class="text-[9px] text-gray-600">Transaksi</p>
          </div>
          <div class="rounded-xl border border-ink bg-canvas p-2">
            <p class="text-sm font-extrabold">{{ pending.length + sync.pendingProducts }}</p>
            <p class="text-[9px] text-gray-600">Belum Sync</p>
          </div>
        </div>

        <Button variant="destructive" class="w-full" @click="showClearConfirm = true">
          <Trash2 class="h-4 w-4" /> Hapus Data Lokal
        </Button>
        <p class="text-[10px] leading-relaxed text-gray-500">
          Data yang sudah tersinkron akan otomatis dipulihkan dari server. Antrean offline yang belum tersinkron akan hilang.
        </p>
      </div>
    </Card>

    <!-- Confirm hapus data lokal -->
    <div v-if="showClearConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div class="w-full max-w-sm rounded-2xl border-2 border-ink bg-surface p-5 text-center shadow-hard-xl">
        <h3 class="mb-1 text-base font-extrabold">Hapus Data Lokal?</h3>
        <p class="mb-4 text-xs font-bold text-gray-700">
          Seluruh data di perangkat ini akan dihapus ({{ storage.products }} produk, {{ storage.transactions }} transaksi).
          Data yang sudah tersinkron akan kembali otomatis dari server saat aplikasi dimuat ulang.
          <span class="mt-1 block text-card-coral">Antrean offline yang belum tersinkron akan hilang permanen.</span>
        </p>
        <div class="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" :disabled="clearing" @click="showClearConfirm = false">
            <X class="h-4 w-4" /> Batal
          </Button>
          <Button variant="destructive" :disabled="clearing" @click="confirmClearLocal">
            <Trash2 class="h-4 w-4" /> {{ clearing ? 'Menghapus...' : 'Ya, Hapus' }}
          </Button>
        </div>
      </div>
    </div>

      </div>
    </main>
  </div>
</template>
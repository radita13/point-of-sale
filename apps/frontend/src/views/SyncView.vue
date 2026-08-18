<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  RefreshCw,
  HardDrive,
  Trash2,
  X,
  AlertTriangle,
  Package,
  ArrowLeft,
  Settings,
} from 'lucide-vue-next';
import type { Product, Transaction } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { formatPrice, formatQty } from '@/lib/utils';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import { useNetworkStore } from '@/stores';
import { useSyncStore } from '@/stores/sync';

const router = useRouter();
const network = useNetworkStore();
const sync = useSyncStore();
const pending = ref<Transaction[]>([]);
const pendingProductsList = ref<Product[]>([]);
const failedTxs = ref<Transaction[]>([]);
const selectedErrorTx = ref<Transaction | null>(null);

const isAuthError = computed(() =>
  /401|token|Authorization|otentikasi|authentication/i.test(sync.lastError ?? '')
);

// --- Penyimpanan lokal ---
const storage = ref({ bytes: 0, quota: 0, products: 0, transactions: 0 });
const showClearConfirm = ref(false);
const clearing = ref(false);
const usedPercent = computed(() =>
  storage.value.quota > 0
    ? Math.min(100, Math.round((storage.value.bytes / storage.value.quota) * 100))
    : 0
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
  const [txs, prods, errored] = await Promise.all([
    db.transactions
      .filter((t) => !t.isSynced)
      .reverse()
      .sortBy('timestamp'),
    db.products
      .filter((p) => p.isSynced === false)
      .reverse()
      .sortBy('updatedAt'),
    db.transactions
      .filter((t) => Boolean(t.syncError))
      .reverse()
      .sortBy('timestamp'),
  ]);
  pending.value = txs;
  pendingProductsList.value = prods;
  failedTxs.value = errored;
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

async function handleRetrySingle(tx: Transaction) {
  await sync.retrySingleTransaction(tx.id);
  await refreshAll();
  if (selectedErrorTx.value?.id === tx.id) {
    selectedErrorTx.value = (await db.transactions.get(tx.id)) ?? null;
  }
}
</script>

<template>
  <div class="bg-canvas min-h-[100dvh]">
    <!-- Header halaman terpisah -->
    <header class="mx-auto max-w-7xl px-3 pt-3 sm:px-6">
      <div
        class="border-ink bg-surface shadow-hard-md flex items-center justify-between gap-3 rounded-2xl border-2 p-3 sm:p-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="border-ink bg-card-blue shadow-hard-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-white"
          >
            <Settings class="h-5 w-5" />
          </div>
          <div class="leading-tight">
            <h1 class="text-base font-extrabold sm:text-lg">Pengaturan Sinkronisasi Data</h1>
            <p class="text-ink/50 text-[11px] font-bold">
              Sinkronkan semua aktifitas toko ke server
            </p>
          </div>
        </div>
        <Button variant="secondary" @click="router.push({ name: 'kasir' })" class="cursor-pointer">
          <ArrowLeft class="h-4 w-4" /> Kembali
        </Button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-3 py-4 sm:px-6">
      <div class="space-y-4">
        <div
          class="border-ink bg-surface shadow-hard-md flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 p-4"
        >
          <div>
            <h2 class="text-lg font-extrabold">Status Sinkronisasi</h2>
            <p class="text-xs font-semibold text-gray-600">
              Klik tombol <b>Sinkronisasi</b> untuk, sinkronisasi manual
            </p>
            <p v-if="sync.lastError" class="text-card-coral mt-1 text-[11px] font-bold">
              Terakhir gagal: {{ sync.lastError }}
            </p>
            <p v-if="isAuthError" class="text-card-coral mt-1 text-[11px] font-bold">
              Sesi login kedaluwarsa/tidak valid — keluar lalu masuk lagi lewat Supabase untuk
              mendapatkan token baru.
            </p>
          </div>
          <Button
            :disabled="(pending.length === 0 && sync.pendingProducts === 0) || !network.isOnline"
            @click="forceSyncNow"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': sync.syncing }" />
            {{ sync.syncing ? 'Menyinkronkan...' : 'Sinkronkan' }}
          </Button>
        </div>

        <Card class="p-4">
          <div class="border-ink mb-2 flex flex-wrap items-center gap-2 border-b-2 pb-2">
            <h3 class="text-sm font-extrabold">Antrean Belum Tersinkron</h3>
            <span class="ml-auto flex items-center gap-1.5 text-[10px] font-black">
              <span class="border-ink bg-canvas rounded-full border px-2.5 py-0.5"
                >Transaksi: {{ pending.length }}</span
              >
              <span class="bg-ink/40 h-1 w-1 rounded-full" aria-hidden="true" />
              <span class="border-ink bg-canvas rounded-full border px-2.5 py-0.5"
                >Produk: {{ pendingProductsList.length }}</span
              >
            </span>
          </div>

          <div
            v-if="pending.length === 0 && pendingProductsList.length === 0"
            class="py-8 text-center text-xs font-bold text-gray-500"
          >
            Semua data lokal telah tersinkronisasi.
          </div>

          <!-- Transaksi offline -->
          <template v-if="pending.length > 0">
            <div class="mb-1.5 flex items-center gap-2">
              <h4 class="text-[11px] font-black tracking-wider text-gray-500 uppercase">
                Transaksi
              </h4>
              <div class="bg-ink/15 h-px flex-1" />
            </div>
            <div class="space-y-2">
              <div
                v-for="t in pending"
                :key="t.id"
                class="border-ink bg-canvas flex items-center justify-between rounded-xl border-2 p-3 text-xs font-bold"
              >
                <div>
                  <h4 class="font-extrabold">{{ t.invoiceNo }}</h4>
                  <p class="text-[10px] text-gray-600">
                    Total: Rp {{ formatPrice(t.finalAmount) }} • {{ t.paymentMethod }}
                  </p>
                </div>
                <span
                  class="border-ink bg-card-coral rounded-full border px-2.5 py-1 text-[10px] font-black text-white"
                  >OFFLINE QUEUE</span
                >
              </div>
            </div>
          </template>

          <!-- Produk offline -->
          <template v-if="pendingProductsList.length > 0">
            <div :class="['flex items-center gap-2', pending.length > 0 ? 'mt-3' : '']">
              <h4 class="text-[11px] font-black tracking-wider text-gray-500 uppercase">Produk</h4>
              <div class="bg-ink/15 h-px flex-1" />
            </div>
            <div class="mt-1.5 space-y-2">
              <div
                v-for="p in pendingProductsList"
                :key="p.id"
                class="border-ink bg-canvas flex items-center justify-between gap-3 rounded-xl border-2 p-3 text-xs font-bold"
              >
                <div class="flex min-w-0 items-center gap-2.5">
                  <img
                    v-if="p.image"
                    :src="p.image"
                    :alt="p.name"
                    class="border-ink h-9 w-9 shrink-0 rounded-lg border bg-white object-cover"
                  />
                  <div
                    v-else
                    class="border-ink text-ink/30 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white"
                  >
                    <Package class="h-4 w-4" />
                  </div>
                  <div class="min-w-0">
                    <h4 class="truncate font-extrabold">{{ p.name }}</h4>
                    <p class="text-[10px] text-gray-600">
                      SKU: #{{ p.sku }} • Stok: {{ formatQty(p.stock) }} {{ p.unit }}
                    </p>
                  </div>
                </div>
                <span
                  class="border-ink bg-card-blue shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black text-white"
                  >BELUM SYNC</span
                >
              </div>
            </div>
          </template>
        </Card>

        <!-- Visual Log & Retry Sync Transaksi Bermasalah / Failed -->
        <Card class="p-4">
          <div class="border-ink mb-3 flex items-center justify-between border-b-2 pb-2">
            <div class="flex items-center gap-2">
              <div
                class="border-ink bg-card-coral shadow-hard-sm flex h-8 w-8 items-center justify-center rounded-lg border-2 text-white"
              >
                <AlertTriangle class="h-4 w-4" />
              </div>
              <div>
                <h3 class="text-sm font-extrabold">Log Riwayat Error Sinkronisasi</h3>
                <p class="text-[10px] font-semibold text-gray-600">
                  Daftar transaksi yang dilewati atau bermasalah saat sinkronisasi server
                </p>
              </div>
            </div>
            <span
              class="border-ink bg-canvas rounded-full border px-2.5 py-0.5 text-[10px] font-black"
            >
              Total: {{ failedTxs.length }}
            </span>
          </div>

          <div
            v-if="failedTxs.length === 0"
            class="py-6 text-center text-xs font-bold text-gray-500"
          >
            Tidak ada transaksi yang mengalami masalah/error.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="t in failedTxs"
              :key="t.id"
              class="border-ink bg-canvas flex flex-col gap-2 rounded-xl border-2 p-3 text-xs font-bold sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h4 class="font-extrabold">{{ t.invoiceNo }}</h4>
                  <span
                    :class="t.isSynced ? 'bg-card-yellow text-ink' : 'bg-card-coral text-white'"
                    class="border-ink rounded-md border px-2 py-0.5 text-[9px] font-black"
                  >
                    {{ t.isSynced ? 'SKIPPED (TERLEWATI)' : 'FAILED' }}
                  </span>
                </div>
                <p class="text-card-coral mt-0.5 truncate text-[11px] font-semibold">
                  ⚠️ {{ t.syncError }}
                </p>
                <p class="text-[10px] text-gray-500">
                  Total: Rp {{ formatPrice(t.finalAmount) }} •
                  {{ new Date(t.timestamp).toLocaleString('id-ID') }}
                </p>
              </div>

              <div class="flex shrink-0 items-center gap-2">
                <Button variant="secondary" class="text-xs font-bold" @click="selectedErrorTx = t">
                  Detail Error
                </Button>
                <Button
                  v-if="!t.isSynced"
                  variant="primary"
                  class="text-xs font-bold"
                  :disabled="!network.isOnline || sync.syncing"
                  @click="handleRetrySingle(t)"
                >
                  <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': sync.syncing }" /> Retry
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="border-ink mb-3 flex items-center gap-2 border-b-2 pb-2">
            <div
              class="border-ink bg-card-blue shadow-hard-sm flex h-8 w-8 items-center justify-center rounded-lg border-2 text-white"
            >
              <HardDrive class="h-4 w-4" />
            </div>
            <h3 class="text-sm font-extrabold">Penyimpanan Lokal</h3>
            <span
              v-if="isNearlyFull"
              class="border-ink bg-card-coral ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black text-white"
            >
              <AlertTriangle class="h-3 w-3" /> HAMPIR PENUH
            </span>
            <span
              v-else
              class="border-ink bg-card-green ml-auto rounded-full border px-2 py-0.5 text-[10px] font-black text-white"
              >SEHAT</span
            >
          </div>

          <div class="space-y-2 text-xs font-bold">
            <div class="flex items-baseline justify-between">
              <span class="text-gray-600">Data terpakai</span>
              <span
                ><b class="text-brand text-base font-extrabold">{{ formatBytes(storage.bytes) }}</b>
                <span class="text-gray-500">
                  / {{ storage.quota ? formatQuota(storage.quota) : 'tidak diketahui' }}</span
                >
              </span>
            </div>
            <div class="border-ink bg-canvas h-2.5 w-full overflow-hidden rounded-full border">
              <div
                class="h-full rounded-full transition-all"
                :class="isNearlyFull ? 'bg-card-coral' : 'bg-brand'"
                :style="{ width: usedPercent + '%' }"
              />
            </div>
            <p class="text-[10px] text-gray-600">{{ usedPercent }}% dari kuota browser</p>

            <div class="border-ink grid grid-cols-3 gap-2 border-t-2 pt-2 text-center">
              <div class="border-ink bg-canvas rounded-xl border p-2">
                <p class="text-sm font-extrabold">{{ storage.products }}</p>
                <p class="text-[9px] text-gray-600">Produk</p>
              </div>
              <div class="border-ink bg-canvas rounded-xl border p-2">
                <p class="text-sm font-extrabold">{{ storage.transactions }}</p>
                <p class="text-[9px] text-gray-600">Transaksi</p>
              </div>
              <div class="border-ink bg-canvas rounded-xl border p-2">
                <p class="text-sm font-extrabold">{{ pending.length + sync.pendingProducts }}</p>
                <p class="text-[9px] text-gray-600">Belum Sync</p>
              </div>
            </div>

            <Button variant="destructive" class="w-full" @click="showClearConfirm = true">
              <Trash2 class="h-4 w-4" /> Hapus Data Lokal
            </Button>
            <p class="text-[10px] leading-relaxed text-gray-500">
              Data yang sudah tersinkron akan otomatis dipulihkan dari server. Antrean offline yang
              belum tersinkron akan hilang.
            </p>
          </div>
        </Card>

        <!-- Confirm hapus data lokal -->
        <div
          v-if="showClearConfirm"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            class="border-ink bg-surface shadow-hard-xl w-full max-w-sm rounded-2xl border-2 p-5 text-center"
          >
            <h3 class="mb-1 text-base font-extrabold">Hapus Data Lokal?</h3>
            <p class="mb-4 text-xs font-bold text-gray-700">
              Seluruh data di perangkat ini akan dihapus ({{ storage.products }} produk,
              {{ storage.transactions }} transaksi). Data yang sudah tersinkron akan kembali
              otomatis dari server saat aplikasi dimuat ulang.
              <span class="text-card-coral mt-1 block"
                >Antrean offline yang belum tersinkron akan hilang permanen.</span
              >
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

        <!-- Modal Detail Error Transaksi -->
        <div
          v-if="selectedErrorTx"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div
            class="border-ink bg-surface shadow-hard-xl w-full max-w-lg rounded-2xl border-2 p-5 font-sans"
          >
            <div class="border-ink mb-3 flex items-center justify-between border-b-2 pb-2">
              <div class="flex items-center gap-2">
                <AlertTriangle class="text-card-coral h-5 w-5" />
                <h3 class="text-base font-extrabold">
                  Detail Error Transaksi {{ selectedErrorTx.invoiceNo }}
                </h3>
              </div>
              <button
                @click="selectedErrorTx = null"
                class="neo-press border-ink rounded-lg border p-1"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <div class="space-y-3 text-xs font-bold">
              <div class="border-ink rounded-xl border bg-red-50 p-3 text-red-700">
                <p class="text-[11px] font-black tracking-wider text-red-500 uppercase">
                  Penyebab Masalah / Pesan Server:
                </p>
                <p class="mt-1 text-xs font-extrabold">{{ selectedErrorTx.syncError }}</p>
              </div>

              <div class="border-ink bg-canvas space-y-1 rounded-xl border p-3">
                <div class="flex justify-between">
                  <span>No Invoice:</span
                  ><span class="font-extrabold">{{ selectedErrorTx.invoiceNo }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Waktu Transaksi:</span
                  ><span>{{ new Date(selectedErrorTx.timestamp).toLocaleString('id-ID') }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Total Pembayaran:</span
                  ><span>Rp {{ formatPrice(selectedErrorTx.finalAmount) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Status Sync:</span
                  ><span :class="selectedErrorTx.isSynced ? 'text-amber-600' : 'text-red-600'">{{
                    selectedErrorTx.isSynced
                      ? 'Skipped (Dilewati Server)'
                      : 'Unsynced (Gagal Terkirim)'
                  }}</span>
                </div>
              </div>

              <div>
                <p class="mb-1 text-[11px] font-black text-gray-500 uppercase">
                  Daftar Item Belanja:
                </p>
                <div
                  class="border-ink max-h-36 space-y-1 overflow-y-auto rounded-xl border bg-white p-2"
                >
                  <div
                    v-for="it in selectedErrorTx.items"
                    :key="it.productId"
                    class="flex justify-between text-[11px]"
                  >
                    <span>{{ it.productName }} x {{ it.qty }} {{ it.unit }}</span>
                    <span>Rp {{ formatPrice(it.subtotal) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="border-ink mt-4 flex items-center justify-end gap-2 border-t pt-2">
              <Button
                v-if="!selectedErrorTx.isSynced"
                variant="primary"
                :disabled="!network.isOnline || sync.syncing"
                @click="handleRetrySingle(selectedErrorTx)"
              >
                <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': sync.syncing }" /> Retry
                Sync Ini
              </Button>
              <Button variant="secondary" @click="selectedErrorTx = null">Tutup</Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

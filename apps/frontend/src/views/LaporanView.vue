<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  Calculator,
  ChartLine,
  Coins,
  History,
  ReceiptText,
  TrendingUp,
  Trophy,
} from 'lucide-vue-next';
import type { Product, Transaction, TransactionItem } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { formatPrice } from '@/lib/utils';
import { useSyncStore } from '@/stores/sync';
import Select, { type SelectOption } from '@/components/ui/Select.vue';
import Badge from '@/components/ui/Badge.vue';

type ReportFilter = 'today' | 'week' | 'month' | 'all';

const FILTER_OPTIONS: SelectOption[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'week', label: '7 Hari Terakhir' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'all', label: 'Semua Waktu' },
];

const reportFilter = ref<ReportFilter>('today');
const transactions = ref<Transaction[]>([]);
const products = ref<Product[]>([]);
const restoring = ref(false);
const restoreError = ref<string | null>(null);
const currentPage = ref(1);
const pageSize = 10;
const sync = useSyncStore();

async function load() {
  const [txs, prods] = await Promise.all([
    db.transactions.orderBy('timestamp').reverse().toArray(),
    db.products.toArray(),
  ]);
  transactions.value = txs;
  products.value = prods;
}

onMounted(async () => {
  await load();
  if (navigator.onLine) {
    restoring.value = true;
    restoreError.value = null;
    try {
      const n = await sync.restoreTransactionsFromServer();
      if (n > 0) await load();
    } finally {
      restoring.value = false;
    }
    if (sync.lastError) restoreError.value = sync.lastError;
  }
});

function inPeriod(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  switch (reportFilter.value) {
    case 'today':
      return d.toDateString() === now.toDateString();
    case 'week':
      return (now.getTime() - d.getTime()) / (1000 * 3600 * 24) <= 7;
    case 'month':
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    case 'all':
      return true;
  }
}

const filteredTransactions = computed(() => transactions.value.filter((tx) => inPeriod(tx.timestamp)));

const totalPages = computed(() => Math.ceil(filteredTransactions.value.length / pageSize) || 1);

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredTransactions.value.slice(start, start + pageSize);
});

/** HPP produk saat ini (fallback bila item transaksi tidak menyimpan snapshot costPrice). */
const costByProduct = computed(() => {
  const map = new Map<string, number>();
  for (const p of products.value) map.set(p.id, p.costPrice);
  return map;
});

/** HPP per item: pakai snapshot saat transaksi; kalau tidak ada (data lama /
 * hasil restore dari server), fallback ke HPP produk saat ini. */
function itemCost(item: TransactionItem): number {
  if (typeof item.costPrice === 'number') return item.costPrice;
  return costByProduct.value.get(item.productId) ?? 0;
}

const reportMetrics = computed(() => {
  let totalRevenue = 0;
  let totalCost = 0;
  for (const tx of filteredTransactions.value) {
    totalRevenue += tx.finalAmount || 0;
    for (const it of tx.items) totalCost += itemCost(it) * it.qty;
  }
  const count = filteredTransactions.value.length;
  return {
    totalRevenue,
    totalProfit: totalRevenue - totalCost,
    count,
    averageTicket: count > 0 ? Math.round(totalRevenue / count) : 0,
  };
});

const productSalesSummary = computed(() => {
  const map = new Map<
    string,
    { name: string; unit: string; totalQty: number; totalSales: number; totalProfit: number }
  >();
  for (const tx of filteredTransactions.value) {
    for (const it of tx.items) {
      const entry = map.get(it.productName) ?? {
        name: it.productName,
        unit: it.unit,
        totalQty: 0,
        totalSales: 0,
        totalProfit: 0,
      };
      entry.totalQty += it.qty;
      entry.totalSales += it.price * it.qty;
      entry.totalProfit += (it.price - itemCost(it)) * it.qty;
      map.set(it.productName, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.totalSales - a.totalSales);
});
</script>

<template>
  <div class="space-y-4">
    <!-- Header Laporan & Filter Periode -->
    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-md"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink bg-brand text-white shadow-hard-sm">
          <ChartLine class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-extrabold">Laporan &amp; Rekapitulasi Penjualan</h2>
          <p class="text-xs font-semibold text-gray-600">Pantau omset, estimasi laba kotor, dan riwayat transaksi toko</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Select
          v-model="reportFilter"
          :options="FILTER_OPTIONS"
          variant="neo"
          class="w-44"
        />
      </div>
    </div>

    <!-- Metric KPI Cards -->
    <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <div class="flex flex-col justify-between rounded-2xl border-2 border-ink bg-brand p-4 text-white shadow-hard-md">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-extrabold uppercase tracking-wider text-white/80">Total Omset</span>
          <span class="rounded-lg bg-white/20 p-1.5"><Coins class="h-[18px] w-[18px]" /></span>
        </div>
        <h3 class="text-2xl font-black">Rp {{ formatPrice(reportMetrics.totalRevenue) }}</h3>
        <p class="mt-1 text-[11px] font-bold text-white/80">{{ reportMetrics.count }} Transaksi Selesai</p>
      </div>

      <div class="flex flex-col justify-between rounded-2xl border-2 border-ink bg-card-green p-4 text-white shadow-hard-md">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-extrabold uppercase tracking-wider text-white/80">Estimasi Laba Kotor</span>
          <span class="rounded-lg bg-white/20 p-1.5"><TrendingUp class="h-[18px] w-[18px]" /></span>
        </div>
        <h3 class="text-2xl font-black">Rp {{ formatPrice(reportMetrics.totalProfit) }}</h3>
        <p class="mt-1 text-[11px] font-bold text-white/80">Selisih Omset vs HPP Modal</p>
      </div>

      <div class="flex flex-col justify-between rounded-2xl border-2 border-ink bg-card-purple p-4 text-white shadow-hard-md">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-extrabold uppercase tracking-wider text-white/80">Jumlah Transaksi</span>
          <span class="rounded-lg bg-white/20 p-1.5"><ReceiptText class="h-[18px] w-[18px]" /></span>
        </div>
        <h3 class="text-2xl font-black">{{ reportMetrics.count }} Struk</h3>
        <p class="mt-1 text-[11px] font-bold text-white/80">Nota Terbit</p>
      </div>

      <div class="flex flex-col justify-between rounded-2xl border-2 border-ink bg-card-coral p-4 text-white shadow-hard-md">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-extrabold uppercase tracking-wider text-white/80">Rata-rata Nota</span>
          <span class="rounded-lg bg-white/20 p-1.5"><Calculator class="h-[18px] w-[18px]" /></span>
        </div>
        <h3 class="text-2xl font-black">Rp {{ formatPrice(reportMetrics.averageTicket) }}</h3>
        <p class="mt-1 text-[11px] font-bold text-white/80">Rata-rata Pembelian per Struk</p>
      </div>
    </div>

    <!-- Grid: Produk Terlaris & Riwayat Transaksi -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <!-- Produk Terlaris -->
      <div class="space-y-3 rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-md lg:col-span-5">
        <div class="flex items-center justify-between border-b-2 border-ink pb-2.5">
          <h3 class="flex items-center gap-2 text-sm font-extrabold">
            <Trophy class="h-[18px] w-[18px] text-card-yellow" />
            <span>Produk Terlaris (Top Sales)</span>
          </h3>
          <span class="rounded border border-ink bg-canvas px-2 py-0.5 font-mono text-[10px] font-bold">
            {{ productSalesSummary.length }} Item
          </span>
        </div>

        <div
          v-if="productSalesSummary.length === 0"
          class="rounded-xl border border-ink bg-canvas py-10 text-center text-xs font-bold text-gray-500"
        >
          Belum ada data penjualan pada periode ini.
        </div>

        <div v-else class="neo-scroll max-h-[420px] space-y-2 overflow-y-auto pr-1">
          <div
            v-for="(prod, idx) in productSalesSummary"
            :key="prod.name"
            class="flex items-center justify-between rounded-xl border-2 border-ink bg-canvas p-2.5 text-xs font-bold"
          >
            <div class="flex items-center gap-2.5">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ink text-[11px] font-black text-white">
                #{{ idx + 1 }}
              </span>
              <div>
                <h4 class="text-xs font-extrabold leading-tight text-ink">{{ prod.name }}</h4>
                <p class="mt-0.5 text-[10px] font-semibold text-gray-600">
                  Terjual: <span class="font-black text-brand">{{ prod.totalQty }} {{ prod.unit }}</span>
                </p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-xs font-extrabold text-card-green">Rp {{ formatPrice(prod.totalSales) }}</span>
              <p class="text-[10px] font-bold text-gray-500">Laba: +Rp {{ formatPrice(prod.totalProfit) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Riwayat Transaksi -->
      <div class="space-y-3 rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-md lg:col-span-7">
        <div class="flex items-center justify-between border-b-2 border-ink pb-2.5">
          <h3 class="flex items-center gap-2 text-sm font-extrabold">
            <History class="h-[18px] w-[18px] text-brand" />
            <span>Riwayat Transaksi Penjualan</span>
          </h3>
          <span class="rounded border border-ink bg-canvas px-2 py-0.5 font-mono text-[10px] font-bold">
            {{ filteredTransactions.length }} Nota
          </span>
        </div>

        <!-- <div
          v-if="restoring"
          class="rounded-xl border border-ink bg-canvas p-3 text-center text-xs font-bold text-gray-500"
        >
          Memulihkan riwayat dari server...
        </div>
        <div
          v-else-if="restoreError"
          class="rounded-xl border-2 border-card-coral bg-card-coral/10 p-4 text-center"
        >
          <p class="text-xs font-bold text-card-coral">Tidak dapat menarik riwayat dari server.</p>
          <p class="mt-1 text-[11px] font-semibold text-gray-600">
            {{ restoreError }} — coba lagi dalam beberapa saat (auto-sync berjalan tiap 30 detik).
          </p>
        </div> -->

        <div
          v-if="!restoring && filteredTransactions.length === 0"
          class="rounded-xl border border-ink bg-canvas py-10 text-center text-xs font-bold text-gray-500"
        >
          Tidak ada catatan transaksi pada periode yang dipilih.
        </div>

        <div v-else class="space-y-2.5">
          <div class="neo-scroll max-h-105 space-y-2.5 overflow-y-auto pr-1 pb-1">
            <div
              v-for="tx in paginatedTransactions"
              :key="tx.id"
              class="flex flex-col gap-2 rounded-xl border-2 border-ink bg-canvas p-3 shadow-hard-sm"
            >
              <div class="flex items-center justify-between gap-2 border-b border-gray-300 pb-2">
                <div class="flex items-center gap-2">
                  <span class="rounded border border-ink bg-white px-2 py-0.5 font-mono text-xs font-extrabold">{{ tx.invoiceNo }}</span>
                  <span class="text-[10px] font-bold text-gray-600">{{ new Date(tx.timestamp).toLocaleString('id-ID') }}</span>
                </div>
                <Badge :class="tx.isSynced ? 'bg-card-green text-white' : 'bg-offline text-ink'">
                  {{ tx.isSynced ? 'SYNCED' : 'OFFLINE QUEUE' }}
                </Badge>
              </div>
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="truncate text-[11px] text-gray-700">{{ tx.items.map((i) => `${i.productName} (${i.qty}${i.unit})`).join(', ') }}</span>
                <span class="shrink-0 font-extrabold text-brand">Rp {{ formatPrice(tx.finalAmount) }}</span>
              </div>
              <div class="text-[10px] font-bold text-gray-500">
                Bayar: Rp {{ formatPrice(tx.payAmount) }} • Kembali: Rp {{ formatPrice(tx.changeAmount) }}
              </div>
            </div>
          </div>

          <!-- Pagination Controls (Neo-Brutalism Style) -->
          <div v-if="totalPages > 1" class="flex items-center justify-between border-t-2 border-ink pt-3 text-xs font-extrabold">
            <button
              :disabled="currentPage === 1"
              @click="currentPage--"
              class="neo-press rounded-xl border-2 border-ink bg-surface px-3 py-1.5 shadow-hard-sm disabled:opacity-40"
            >
              &larr; Prev
            </button>
            <span>Halaman {{ currentPage }} dari {{ totalPages }}</span>
            <button
              :disabled="currentPage === totalPages"
              @click="currentPage++"
              class="neo-press rounded-xl border-2 border-ink bg-surface px-3 py-1.5 shadow-hard-sm disabled:opacity-40"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

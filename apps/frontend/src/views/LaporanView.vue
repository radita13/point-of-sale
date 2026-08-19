<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  Calculator,
  ChartLine,
  ChevronLeft,
  ChevronRight,
  Coins,
  History,
  ReceiptText,
  TrendingUp,
  Trophy,
} from 'lucide-vue-next';
import type { Product, Transaction } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { formatPrice } from '@/lib/utils';
import { useSyncStore } from '@/stores/sync';
import Select from '@/components/ui/Select.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import { useReportMetrics, type ReportFilter } from '@/composables/useReportMetrics';
import { FILTER_OPTIONS } from '@/constants/product';

const reportFilter = ref<ReportFilter>('today');
const transactions = ref<Transaction[]>([]);
const products = ref<Product[]>([]);
const isLoading = ref(true);
const restoring = ref(false);
const restoreError = ref<string | null>(null);
const pageSize = 10;
const sync = useSyncStore();

const {
  currentPage,
  totalPages,
  filteredTransactions,
  paginatedTransactions,
  reportMetrics,
  productSalesSummary,
} = useReportMetrics(transactions, products, reportFilter, pageSize);

async function load() {
  const [txs, prods] = await Promise.all([
    db.transactions.orderBy('timestamp').reverse().toArray(),
    db.products.toArray(),
  ]);
  transactions.value = txs;
  products.value = prods;
  currentPage.value = 1;
}

onMounted(async () => {
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
  await load();
  isLoading.value = false;
});
</script>

<template>
  <div class="space-y-4">
    <!-- Header Laporan & Filter Periode -->
    <div
      class="border-ink bg-surface shadow-hard-md flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 p-4"
    >
      <div class="flex items-center gap-3">
        <div
          class="border-ink bg-brand shadow-hard-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-white"
        >
          <ChartLine class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-extrabold">Laporan Penjualan Toko</h2>
          <p class="text-xs font-semibold text-gray-600">
            Pantau omset, estimasi laba kotor, dan riwayat transaksi toko
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Select v-model="reportFilter" :options="FILTER_OPTIONS" variant="neo" class="w-44" />
      </div>
    </div>

    <!-- Metric KPI Cards -->
    <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <div
        class="border-ink bg-brand shadow-hard-md flex flex-col justify-between rounded-2xl border-2 p-4 text-white"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-extrabold tracking-wider text-white/80 uppercase"
            >Total Omset</span
          >
          <span class="rounded-lg bg-white/20 p-1.5"><Coins class="h-4.5 w-4.5" /></span>
        </div>
        <h3 class="text-2xl font-black">Rp {{ formatPrice(reportMetrics.totalRevenue) }}</h3>
        <p class="mt-1 text-[11px] font-bold text-white/80">
          {{ reportMetrics.count }} Transaksi Selesai
        </p>
      </div>

      <div
        class="border-ink bg-card-green shadow-hard-md flex flex-col justify-between rounded-2xl border-2 p-4 text-white"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-extrabold tracking-wider text-white/80 uppercase"
            >Estimasi Laba Kotor</span
          >
          <span class="rounded-lg bg-white/20 p-1.5"><TrendingUp class="h-4.5 w-4.5" /></span>
        </div>
        <h3 class="text-2xl font-black">Rp {{ formatPrice(reportMetrics.totalProfit) }}</h3>
        <p class="mt-1 text-[11px] font-bold text-white/80">Selisih Omset vs HPP Modal</p>
      </div>

      <div
        class="border-ink bg-card-purple shadow-hard-md flex flex-col justify-between rounded-2xl border-2 p-4 text-white"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-extrabold tracking-wider text-white/80 uppercase"
            >Jumlah Transaksi</span
          >
          <span class="rounded-lg bg-white/20 p-1.5"><ReceiptText class="h-4.5 w-4.5" /></span>
        </div>
        <h3 class="text-2xl font-black">{{ reportMetrics.count }} Struk</h3>
        <p class="mt-1 text-[11px] font-bold text-white/80">Nota Terbit</p>
      </div>

      <div
        class="border-ink bg-card-coral shadow-hard-md flex flex-col justify-between rounded-2xl border-2 p-4 text-white"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-extrabold tracking-wider text-white/80 uppercase"
            >Rata-rata Nota</span
          >
          <span class="rounded-lg bg-white/20 p-1.5"><Calculator class="h-4.5 w-4.5" /></span>
        </div>
        <h3 class="text-2xl font-black">Rp {{ formatPrice(reportMetrics.averageTicket) }}</h3>
        <p class="mt-1 text-[11px] font-bold text-white/80">Rata-rata Pembelian per Struk</p>
      </div>
    </div>

    <!-- Grid: Produk Terlaris & Riwayat Transaksi -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <!-- Produk Terlaris -->
      <div
        class="border-ink bg-surface shadow-hard-md space-y-3 rounded-2xl border-2 p-4 lg:col-span-5"
      >
        <div class="border-ink flex items-center justify-between border-b-2 pb-2.5">
          <h3 class="flex items-center gap-2 text-sm font-extrabold">
            <Trophy class="text-card-yellow h-4.5 w-4.5" />
            <span>Produk Terlaris (Top Sales)</span>
          </h3>
          <span
            class="border-ink bg-canvas rounded border px-2 py-0.5 font-mono text-[10px] font-bold"
          >
            {{ productSalesSummary.length }} Item
          </span>
        </div>

        <div
          v-if="productSalesSummary.length === 0"
          class="border-ink bg-canvas rounded-xl border py-10 text-center text-xs font-bold text-gray-500"
        >
          Belum ada data penjualan pada periode ini.
        </div>

        <div v-else class="neo-scroll max-h-105 space-y-2 overflow-y-auto pr-1">
          <div
            v-for="(prod, idx) in productSalesSummary"
            :key="prod.name"
            class="border-ink bg-canvas shadow-hard-sm mb-2 flex items-center justify-between rounded-xl border-2 p-2.5 text-xs font-bold"
          >
            <div class="flex items-center gap-2.5">
              <span
                class="bg-ink flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black text-white"
              >
                #{{ idx + 1 }}
              </span>
              <div>
                <h4 class="text-ink text-xs leading-tight font-extrabold">{{ prod.name }}</h4>
                <p class="mt-0.5 text-[10px] font-semibold text-gray-600">
                  Terjual:
                  <span class="text-brand font-black">{{ prod.totalQty }} {{ prod.unit }}</span>
                </p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-card-green text-xs font-extrabold"
                >Rp {{ formatPrice(prod.totalSales) }}</span
              >
              <p class="text-[10px] font-bold text-gray-500">
                Laba: +Rp {{ formatPrice(prod.totalProfit) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Riwayat Transaksi -->
      <div
        class="border-ink bg-surface shadow-hard-md space-y-3 rounded-2xl border-2 p-4 lg:col-span-7"
      >
        <div class="border-ink flex items-center justify-between border-b-2 pb-2.5">
          <h3 class="flex items-center gap-2 text-sm font-extrabold">
            <History class="text-brand h-4.5 w-4.5" />
            <span>Riwayat Transaksi Penjualan</span>
          </h3>
          <span
            class="border-ink bg-canvas rounded border px-2 py-0.5 font-mono text-[10px] font-bold"
          >
            {{ filteredTransactions.length }} Nota
          </span>
        </div>

        <div v-if="isLoading" class="flex min-h-24 items-center justify-center">
          <div
            class="border-ink bg-brand shadow-hard-sm h-9 w-9 animate-spin rounded-xl border-2"
          ></div>
        </div>

        <div
          v-else-if="filteredTransactions.length === 0"
          class="border-ink bg-canvas flex min-h-24 items-center justify-center rounded-xl border p-4 text-center text-xs font-bold text-gray-500"
        >
          Tidak ada catatan transaksi pada periode yang dipilih.
        </div>

        <div v-else class="space-y-2.5">
          <div class="neo-scroll max-h-105 space-y-2.5 overflow-y-auto pr-1 pb-1">
            <div
              v-for="tx in paginatedTransactions"
              :key="tx.id"
              class="border-ink bg-canvas shadow-hard-sm flex flex-col gap-2 rounded-xl border-2 p-3"
            >
              <div class="flex items-center justify-between gap-2 border-b border-gray-300 pb-2">
                <div class="flex items-center gap-2">
                  <span
                    class="border-ink rounded border bg-white px-2 py-0.5 font-mono text-xs font-extrabold"
                    >{{ tx.invoiceNo }}</span
                  >
                  <span class="text-[10px] font-bold text-gray-600">{{
                    new Date(tx.timestamp).toLocaleString('id-ID')
                  }}</span>
                </div>
                <Badge :class="tx.isSynced ? 'bg-card-green text-white' : 'bg-offline text-ink'">
                  {{ tx.isSynced ? 'SYNCED' : 'OFFLINE' }}
                </Badge>
              </div>
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="truncate text-[11px] text-gray-700">{{
                  tx.items.map((i) => `${i.productName} (${i.qty}${i.unit})`).join(', ')
                }}</span>
                <span class="text-brand shrink-0 font-extrabold"
                  >Rp {{ formatPrice(tx.finalAmount) }}</span
                >
              </div>
              <div class="text-[10px] font-bold text-gray-500">
                Bayar: Rp {{ formatPrice(tx.payAmount) }} • Kembali: Rp
                {{ formatPrice(tx.changeAmount) }}
              </div>
            </div>
          </div>

          <!-- Pagination Controls (Neo-Brutalism Style) -->
          <div
            v-if="filteredTransactions.length > 0"
            class="border-ink flex flex-wrap items-center justify-between gap-3 border-t-2 pt-3 text-xs font-extrabold"
          >
            <div class="text-gray-600">
              Menampilkan {{ (currentPage - 1) * pageSize + 1 }}
              -
              {{ Math.min(currentPage * pageSize, filteredTransactions.length) }}
              dari {{ filteredTransactions.length }} transaksi
            </div>

            <div class="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="icon"
                :disabled="currentPage === 1"
                @click="currentPage--"
                class="h-8 w-8 cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft class="h-4 w-4" />
              </Button>
              <span class="px-2"> {{ currentPage }} / {{ totalPages }} </span>
              <Button
                variant="secondary"
                size="icon"
                :disabled="currentPage === totalPages"
                @click="currentPage++"
                class="h-8 w-8 cursor-pointer disabled:opacity-40"
              >
                <ChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

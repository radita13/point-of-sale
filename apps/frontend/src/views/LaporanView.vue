<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  ChartLine,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-vue-next';
import type { Product, Transaction } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { formatPrice, formatDate } from '@/lib/utils';
import { useSyncStore } from '@/stores/sync';
import Select, { type SelectOption } from '@/components/ui/Select.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import { useReportMetrics, type ReportFilter } from '@/composables/useReportMetrics';
import ReportMetricsCards from '@/components/laporan/ReportMetricsCards.vue';
import TopProductsCard from '@/components/laporan/TopProductsCard.vue';

const FILTER_OPTIONS: SelectOption[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'week', label: '7 Hari Terakhir' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'all', label: 'Semua Waktu' },
];

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
  topProducts,
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
    <!-- Header Filter & Title -->
    <div
      class="border-ink bg-surface shadow-hard-md flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 p-4"
    >
      <div class="flex items-center gap-2">
        <ChartLine class="h-6 w-6 text-brand" />
        <div>
          <h2 class="text-base font-extrabold sm:text-lg">Laporan Penjualan</h2>
          <p class="text-[11px] font-bold text-gray-500">
            Analisis Omset, Laba Bersih &amp; Top Produk
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Select v-model="reportFilter" :options="FILTER_OPTIONS" class="w-40 font-bold" />
      </div>
    </div>

    <!-- Indicator loading / error -->
    <div
      v-if="isLoading || restoring"
      class="border-ink bg-surface rounded-2xl border-2 p-8 text-center"
    >
      <div
        class="border-brand h-8 w-8 animate-spin rounded-full border-4 border-t-transparent mx-auto mb-2"
      />
      <p class="text-xs font-bold text-gray-600">Memuat data laporan...</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Cards Metrics -->
      <ReportMetricsCards
        :total-revenue="reportMetrics.totalRevenue"
        :net-profit="reportMetrics.netProfit"
        :count="reportMetrics.count"
        :avg-transaction="reportMetrics.avgTransaction"
      />

      <!-- Top Products Peringkat -->
      <TopProductsCard :products="topProducts" />

      <!-- Tabel Riwayat Transaksi -->
      <div class="border-ink bg-surface shadow-hard-md rounded-2xl border-2 p-4">
        <div class="mb-3 flex items-center justify-between border-b-2 border-ink pb-2">
          <div class="flex items-center gap-2">
            <History class="h-4 w-4" />
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-gray-700">
              Riwayat Transaksi ({{ filteredTransactions.length }})
            </h3>
          </div>
        </div>

        <div v-if="filteredTransactions.length === 0" class="py-8 text-center text-xs font-bold text-gray-500">
          Tidak ada transaksi pada periode ini.
        </div>

        <div v-else class="space-y-3">
          <div class="neo-scroll overflow-x-auto">
            <table class="w-full text-left text-xs font-bold">
              <thead>
                <tr class="border-ink border-b-2 bg-canvas text-gray-600">
                  <th class="p-2.5">No. Nota</th>
                  <th class="p-2.5">Waktu</th>
                  <th class="p-2.5">Item Belanja</th>
                  <th class="p-2.5 text-right">Total</th>
                  <th class="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="tx in paginatedTransactions"
                  :key="tx.id"
                  class="border-ink/20 border-b hover:bg-canvas/50"
                >
                  <td class="p-2.5 font-mono font-extrabold">{{ tx.invoiceNo }}</td>
                  <td class="p-2.5 text-gray-600">
                    {{ formatDate(tx.timestamp) }}
                  </td>
                  <td class="p-2.5">
                    <div class="max-w-xs truncate text-[11px]">
                      {{ tx.items.map((i) => `${i.productName} (${i.qty} ${i.unit})`).join(', ') }}
                    </div>
                  </td>
                  <td class="p-2.5 text-right font-black">Rp {{ formatPrice(tx.finalAmount) }}</td>
                  <td class="p-2.5 text-center">
                    <Badge :class="tx.isSynced ? 'bg-card-green text-white' : 'bg-card-yellow text-ink'">
                      {{ tx.isSynced ? 'Synced' : 'Offline' }}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Control -->
          <div
            v-if="totalPages > 1"
            class="flex items-center justify-between border-t-2 border-ink pt-3 text-xs font-bold"
          >
            <span class="text-[11px] text-gray-500">
              Halaman {{ currentPage }} dari {{ totalPages }}
            </span>
            <div class="flex gap-1.5">
              <Button
                variant="secondary"
                size="icon"
                :disabled="currentPage <= 1"
                @click="currentPage--"
              >
                <ChevronLeft class="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                :disabled="currentPage >= totalPages"
                @click="currentPage++"
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

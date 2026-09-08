<script setup lang="ts">
import { ChartLine, History, Trophy } from 'lucide-vue-next';
import { formatPrice, formatQty } from '@/lib/utils';
import Select from '@/components/ui/Select.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import PaginationControls from '@/components/ui/Pagination.vue';
import ReceiptModal from '@/components/common/ReceiptModal.vue';
import ReportMetricsGrid from '@/components/laporan/ReportMetricsGrid.vue';
import TransactionHistoryRow from '@/components/laporan/TransactionHistoryRow.vue';
import { useReport } from '@/composables/report/useReport';
import { FILTER_OPTIONS } from '@/constants/product.constants';

const {
  reportFilter,
  reportMetrics,
  isLoading,
  pageSize,
  currentPage,
  totalPages,
  topProductsPage,
  totalTopProductsPages,
  filteredTransactions,
  paginatedTransactions,
  productSalesSummary,
  paginatedTopProducts,
  showReceiptModal,
  selectedReceiptData,
  openReceiptModal,
  printReceiptNow,
} = useReport();
</script>

<template>
  <div class="space-y-4">
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
        <Select
          id="report-period-filter"
          name="reportFilter"
          v-model="reportFilter"
          :options="FILTER_OPTIONS"
          variant="neo"
          class="w-44"
        />
      </div>
    </div>

    <ReportMetricsGrid :metrics="reportMetrics" :is-loading="isLoading" />

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div
        class="border-ink bg-surface shadow-hard-md flex h-fit flex-col justify-between space-y-3 rounded-2xl border-2 p-4 lg:col-span-5"
      >
        <div>
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

          <Skeleton v-if="isLoading" type="top-sales" :count="10" />

          <div
            v-else-if="productSalesSummary.length === 0"
            class="border-ink bg-canvas mt-3 rounded-xl border py-10 text-center text-xs font-bold text-gray-500"
          >
            Belum ada data penjualan pada periode ini.
          </div>

          <div v-else class="mt-3 flex-1 space-y-2">
            <div
              v-for="(prod, idx) in paginatedTopProducts"
              :key="prod.name"
              class="border-ink bg-canvas shadow-hard-sm flex items-center justify-between rounded-xl border-2 p-2 text-xs font-bold"
            >
              <div class="flex items-center gap-2.5">
                <span
                  class="bg-ink flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black text-white"
                >
                  #{{ (topProductsPage - 1) * 10 + idx + 1 }}
                </span>
                <div>
                  <h4 class="text-ink text-xs leading-tight font-extrabold">{{ prod.name }}</h4>
                  <p class="mt-0.5 text-[10px] font-semibold text-gray-600">
                    Terjual:
                    <span class="text-brand font-black"
                      >{{ formatQty(prod.totalQty) }} {{ prod.unit }}</span
                    >
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

        <PaginationControls
          v-if="!isLoading && productSalesSummary.length > 0"
          v-model:page="topProductsPage"
          :total-pages="totalTopProductsPages"
          :total-items="productSalesSummary.length"
          :page-size="10"
          item-name="item"
          id-prefix="top-products"
        />
      </div>

      <div
        class="border-ink bg-surface shadow-hard-md flex flex-col justify-between space-y-3 rounded-2xl border-2 p-4 lg:col-span-7"
      >
        <div>
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

          <Skeleton v-if="isLoading" type="transactions" :count="pageSize" />

          <div
            v-else-if="filteredTransactions.length === 0"
            class="border-ink bg-canvas mt-3 flex min-h-24 items-center justify-center rounded-xl border p-4 text-center text-xs font-bold text-gray-500"
          >
            Tidak ada catatan transaksi pada periode yang dipilih.
          </div>

          <div v-else class="mt-3 flex-1 space-y-2.5">
            <TransactionHistoryRow
              v-for="tx in paginatedTransactions"
              :key="tx.id"
              :transaction="tx"
              @view-receipt="openReceiptModal(tx)"
            />
          </div>
        </div>

        <PaginationControls
          v-if="!isLoading && filteredTransactions.length > 0"
          v-model:page="currentPage"
          :total-pages="totalPages"
          :total-items="filteredTransactions.length"
          :page-size="pageSize"
          item-name="Nota"
          id-prefix="transactions"
        />
      </div>
    </div>

    <ReceiptModal
      :open="showReceiptModal"
      :data="selectedReceiptData"
      @close="showReceiptModal = false"
      @print="printReceiptNow"
    />
  </div>
</template>

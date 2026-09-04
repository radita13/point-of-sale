<script setup lang="ts">
import { Calculator, Coins, ReceiptText, TrendingUp } from 'lucide-vue-next';
import { formatPrice } from '@/lib/utils';

defineProps<{
  metrics: {
    totalRevenue: number;
    totalProfit: number;
    count: number;
    averageTicket: number;
  };
  isLoading: boolean;
}>();
</script>

<template>
  <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
    <!-- Total Omset -->
    <div
      class="border-ink bg-brand shadow-hard-md flex flex-col justify-between rounded-2xl border-2 p-4 text-white"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-extrabold tracking-wider text-white/80 uppercase">
          Total Omset
        </span>
        <span class="rounded-lg bg-white/20 p-1.5"><Coins class="h-4.5 w-4.5" /></span>
      </div>
      <div v-if="isLoading" class="space-y-1.5 py-0.5">
        <div class="h-8 w-36 animate-pulse rounded-lg bg-white/25"></div>
        <div class="h-3 w-28 animate-pulse rounded bg-white/20"></div>
      </div>
      <template v-else>
        <h3 class="text-2xl font-black">Rp {{ formatPrice(metrics.totalRevenue) }}</h3>
        <p class="mt-1 text-[11px] font-bold text-white/80">
          {{ metrics.count }} Transaksi Selesai
        </p>
      </template>
    </div>

    <!-- Estimasi Laba Kotor -->
    <div
      class="border-ink bg-card-green shadow-hard-md flex flex-col justify-between rounded-2xl border-2 p-4 text-white"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-extrabold tracking-wider text-white/80 uppercase">
          Estimasi Laba Kotor
        </span>
        <span class="rounded-lg bg-white/20 p-1.5"><TrendingUp class="h-4.5 w-4.5" /></span>
      </div>
      <div v-if="isLoading" class="space-y-1.5 py-0.5">
        <div class="h-8 w-36 animate-pulse rounded-lg bg-white/25"></div>
        <div class="h-3 w-32 animate-pulse rounded bg-white/20"></div>
      </div>
      <template v-else>
        <h3 class="text-2xl font-black">Rp {{ formatPrice(metrics.totalProfit) }}</h3>
        <p class="mt-1 text-[11px] font-bold text-white/80">Selisih Omset vs HPP Modal</p>
      </template>
    </div>

    <!-- Jumlah Transaksi -->
    <div
      class="border-ink bg-card-purple shadow-hard-md flex flex-col justify-between rounded-2xl border-2 p-4 text-white"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-extrabold tracking-wider text-white/80 uppercase">
          Jumlah Transaksi
        </span>
        <span class="rounded-lg bg-white/20 p-1.5"><ReceiptText class="h-4.5 w-4.5" /></span>
      </div>
      <div v-if="isLoading" class="space-y-1.5 py-0.5">
        <div class="h-8 w-24 animate-pulse rounded-lg bg-white/25"></div>
        <div class="h-3 w-20 animate-pulse rounded bg-white/20"></div>
      </div>
      <template v-else>
        <h3 class="text-2xl font-black">{{ metrics.count }} Struk</h3>
        <p class="mt-1 text-[11px] font-bold text-white/80">Nota Terbit</p>
      </template>
    </div>

    <!-- Rata-rata Nota -->
    <div
      class="border-ink bg-card-coral shadow-hard-md flex flex-col justify-between rounded-2xl border-2 p-4 text-white"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-extrabold tracking-wider text-white/80 uppercase">
          Rata-rata Nota
        </span>
        <span class="rounded-lg bg-white/20 p-1.5"><Calculator class="h-4.5 w-4.5" /></span>
      </div>
      <div v-if="isLoading" class="space-y-1.5 py-0.5">
        <div class="h-8 w-32 animate-pulse rounded-lg bg-white/25"></div>
        <div class="h-3 w-36 animate-pulse rounded bg-white/20"></div>
      </div>
      <template v-else>
        <h3 class="text-2xl font-black">Rp {{ formatPrice(metrics.averageTicket) }}</h3>
        <p class="mt-1 text-[11px] font-bold text-white/80">Rata-rata Pembelian per Struk</p>
      </template>
    </div>
  </div>
</template>

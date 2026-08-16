<script setup lang="ts">
import { Coins, TrendingUp, ReceiptText, Calculator } from 'lucide-vue-next';
import Card from '@/components/ui/Card.vue';
import { formatPrice } from '@/lib/utils';

defineProps<{
  totalRevenue: number;
  netProfit: number;
  count: number;
  avgTransaction: number;
}>();
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <!-- Total Omset -->
    <Card class="border-ink bg-card-blue p-3.5 text-white">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-extrabold uppercase tracking-wider text-white/80">Total Omset</span>
        <Coins class="h-4 w-4 text-white/80" />
      </div>
      <p class="mt-1 text-base font-extrabold sm:text-lg">Rp {{ formatPrice(totalRevenue) }}</p>
      <p class="text-[10px] font-bold text-white/70">Pendapatan Kotor</p>
    </Card>

    <!-- Keuntungan Bersih -->
    <Card class="border-ink bg-card-green p-3.5 text-white">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-extrabold uppercase tracking-wider text-white/80">Laba Bersih</span>
        <TrendingUp class="h-4 w-4 text-white/80" />
      </div>
      <p class="mt-1 text-base font-extrabold sm:text-lg">Rp {{ formatPrice(netProfit) }}</p>
      <p class="text-[10px] font-bold text-white/70">Estimasi Margin Keuntungan</p>
    </Card>

    <!-- Jumlah Transaksi -->
    <Card class="border-ink bg-card-purple p-3.5 text-white">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-extrabold uppercase tracking-wider text-white/80">Transaksi</span>
        <ReceiptText class="h-4 w-4 text-white/80" />
      </div>
      <p class="mt-1 text-base font-extrabold sm:text-lg">{{ count }}</p>
      <p class="text-[10px] font-bold text-white/70">Nota Sukses</p>
    </Card>

    <!-- Rata-rata per Nota -->
    <Card class="border-ink bg-card-teal p-3.5 text-white">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-extrabold uppercase tracking-wider text-white/80">Rata-rata Nota</span>
        <Calculator class="h-4 w-4 text-white/80" />
      </div>
      <p class="mt-1 text-base font-extrabold sm:text-lg">Rp {{ formatPrice(avgTransaction) }}</p>
      <p class="text-[10px] font-bold text-white/70">Nilai per Keranjang</p>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { Trophy } from 'lucide-vue-next';
import Card from '@/components/ui/Card.vue';
import { formatPrice } from '@/lib/utils';

defineProps<{
  products: Array<{ name: string; qty: number; revenue: number; unit: string }>;
}>();
</script>

<template>
  <Card class="p-4">
    <div class="mb-3 flex items-center justify-between border-b-2 border-ink pb-2">
      <div class="flex items-center gap-2">
        <Trophy class="h-4 w-4 text-amber-500" />
        <h3 class="text-xs font-extrabold uppercase tracking-wider text-gray-700">Top 5 Produk Terlaris</h3>
      </div>
    </div>

    <div v-if="products.length === 0" class="py-4 text-center text-xs font-bold text-gray-500">
      Belum ada data penjualan pada periode ini.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="(p, idx) in products"
        :key="idx"
        class="flex items-center justify-between rounded-xl border border-ink bg-canvas p-2.5 text-xs font-bold"
      >
        <div class="flex items-center gap-2.5">
          <span
            :class="idx === 0 ? 'bg-amber-400 text-ink' : 'bg-surface text-ink/70'"
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-ink text-[11px] font-black"
          >
            #{{ idx + 1 }}
          </span>
          <div>
            <h4 class="font-extrabold text-ink">{{ p.name }}</h4>
            <p class="text-[10px] text-gray-500">Terjual: {{ p.qty }} {{ p.unit }}</p>
          </div>
        </div>
        <div class="text-right font-black text-brand">
          Rp {{ formatPrice(p.revenue) }}
        </div>
      </div>
    </div>
  </Card>
</template>

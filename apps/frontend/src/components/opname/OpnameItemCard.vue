<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next';
import type { Product } from '@point-of-sale/shared';
import { formatQty } from '@/lib/utils';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';

defineProps<{
  product: Product;
  currentChange: string;
  stockDiff: number | null;
}>();

const emit = defineEmits<{
  (e: 'adjust', delta: number): void;
  (e: 'update:change', val: string): void;
}>();
</script>

<template>
  <div
    :class="
      stockDiff === null
        ? 'border-ink bg-canvas'
        : stockDiff > 0
          ? 'border-card-green shadow-hard-md bg-green-50/50'
          : 'border-card-coral shadow-hard-md bg-red-50/50'
    "
    class="relative flex flex-col justify-between rounded-xl border-2 p-3 transition-all"
  >
    <div>
      <div class="flex items-start justify-between gap-2">
        <span class="text-[10px] font-black tracking-wider text-gray-500 uppercase">{{
          product.category
        }}</span>
        <Badge v-if="product.stock === 0" class="bg-card-coral text-white">Habis</Badge>
        <Badge v-else-if="product.stock <= product.minStock" class="bg-card-yellow text-white"
          >Stok Menipis</Badge
        >
        <Badge v-else class="bg-card-green text-white">Aman</Badge>
      </div>

      <h4 class="text-ink mt-1 leading-tight font-extrabold">{{ product.name }}</h4>
      <p class="font-mono text-[10px] text-gray-500">SKU: {{ product.sku }}</p>
    </div>

    <div class="border-ink/20 mt-3 border-t pt-2">
      <div class="flex items-center justify-between gap-2">
        <Label
          :for="`opname-stock-${product.id}`"
          class="text-[11px] font-extrabold text-gray-700"
        >
          Stok Fisik Baru:
        </Label>
        <div class="flex items-center gap-3">
          <div class="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              class="shrink-0 cursor-pointer"
              @click="emit('adjust', -1)"
            >
              <Minus class="h-3.5 w-3.5" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="icon"
              class="shrink-0 cursor-pointer"
              @click="emit('adjust', 1)"
            >
              <Plus class="h-3.5 w-3.5" />
            </Button>
          </div>

          <Input
            :id="`opname-stock-${product.id}`"
            :name="`opname_stock_${product.id}`"
            :value="currentChange"
            @input="(e: Event) => emit('update:change', (e.target as HTMLInputElement).value)"
            type="number"
            step="any"
            min="0"
            :placeholder="formatQty(product.stock)"
            class="h-8 w-16 rounded-xl text-right text-xs font-black"
          />
          <span class="text-[11px] font-bold text-gray-600">{{ product.unit }}</span>
        </div>
      </div>

      <!-- Diff Badge -->
      <div
        v-if="stockDiff !== null"
        class="mt-1.5 flex items-center justify-end text-[11px] font-black"
      >
        <span :class="stockDiff > 0 ? 'text-green-600' : 'text-red-600'">
          Selisih: {{ stockDiff > 0 ? '+' : '' }}{{ stockDiff }} {{ product.unit }}
        </span>
      </div>
    </div>
  </div>
</template>

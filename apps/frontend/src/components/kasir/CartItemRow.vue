<script setup lang="ts">
import { Minus, Plus, Trash2 } from 'lucide-vue-next';
import type { CartItem } from '@/stores/cart';
import { formatPrice } from '@/lib/utils';
import { lineSubtotal, splitPieces } from '@/stores/cart';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';

const props = defineProps<{
  item: CartItem;
}>();

const emit = defineEmits<{
  (e: 'increase'): void;
  (e: 'decrease'): void;
  (e: 'remove'): void;
  (e: 'update-pack', event: Event): void;
  (e: 'update-piece', event: Event): void;
}>();

function isPieces(): boolean {
  return !!props.item.product.piecesPerUnit && props.item.product.piecesPerUnit > 1;
}
</script>

<template>
  <div class="border-ink bg-canvas shadow-hard-sm flex flex-col gap-2 rounded-xl border-2 p-2.5">
    <!-- Product Header in Cart -->
    <div class="flex items-center justify-between gap-2">
      <div class="min-w-0">
        <h4 class="truncate text-sm font-extrabold">
          {{ item.product.name }}
        </h4>
        <p class="mt-0.5 text-[11px] font-bold text-gray-600">
          Rp {{ formatPrice(item.product.sellingPrice) }} /
          {{ item.product.unit }}
        </p>
      </div>
      <button
        type="button"
        @click="emit('remove')"
        class="hover:text-card-coral shrink-0 cursor-pointer p-1 text-gray-400"
        title="Hapus dari keranjang"
      >
        <Trash2 class="h-4 w-4" />
      </button>
    </div>

    <!-- Quantity & Subtotal Controls -->
    <div class="flex items-center justify-between border-t border-gray-300 pt-2">
      <div class="flex items-center gap-4">
        <div class="flex gap-2">
          <Button
            type="button"
            @click="emit('decrease')"
            variant="ghost"
            size="icon"
            class="cursor-pointer"
          >
            <Minus class="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            @click="emit('increase')"
            variant="ghost"
            size="icon"
            class="cursor-pointer"
          >
            <Plus class="h-3.5 w-3.5" />
          </Button>
        </div>

        <!-- Produk Tier Eceran: 2 input box (Pak + Batang) -->
        <div v-if="isPieces()" class="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            step="1"
            :value="splitPieces(item.product, item.qty).packs"
            @change="emit('update-pack', $event)"
            class="no-spin border-ink h-8 w-12 rounded-lg border bg-white py-1 text-center text-xs font-bold focus:outline-none"
          />
          <span class="text-[11px] font-bold text-gray-600">{{ item.product.unit }}</span>
          <span class="text-[11px] font-bold text-gray-400">+</span>
          <Input
            type="number"
            min="0"
            step="1"
            :value="splitPieces(item.product, item.qty).pieces"
            @change="emit('update-piece', $event)"
            class="no-spin border-ink h-8 w-12 rounded-lg border bg-white py-1 text-center text-xs font-bold focus:outline-none"
          />
          <span class="text-[11px] font-bold text-gray-600">{{
            item.product.smallUnit ?? 'bat'
          }}</span>
        </div>

        <!-- Produk Utuh Biasa: 1 input box -->
        <div v-else class="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            step="0.01"
            :value="item.qty"
            @change="(e: Event) => emit('update-pack', e)"
            class="no-spin border-ink h-8 w-16 rounded-lg border bg-white py-1 text-center text-xs font-bold focus:outline-none"
          />
          <span class="text-[11px] font-bold text-gray-600">{{ item.product.unit }}</span>
        </div>
      </div>

      <span class="text-sm font-extrabold whitespace-nowrap">
        Rp {{ formatPrice(lineSubtotal(item.product, item.qty)) }}
      </span>
    </div>
  </div>
</template>

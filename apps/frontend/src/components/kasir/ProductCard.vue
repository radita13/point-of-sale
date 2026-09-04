<script setup lang="ts">
import { PackageOpen } from 'lucide-vue-next';
import type { Product } from '@point-of-sale/shared';
import { formatPrice, formatQty } from '@/lib/utils';
import { getCategoryCardColor } from '@/constants/product';
import Badge from '@/components/ui/Badge.vue';

defineProps<{
  product: Product;
}>();

const emit = defineEmits<{
  (e: 'add', qty: number, pieceMode?: boolean): void;
}>();

function isPieces(p: Product): boolean {
  return !!p.piecesPerUnit && p.piecesPerUnit > 1;
}

function quickStep(p: Product): number {
  if (isPieces(p)) return 1 / (p.piecesPerUnit ?? 1);
  if (p.step) return p.step;
  return p.unit === 'kg' || p.unit === 'liter' ? 0.5 : 1;
}

function isUnitOnly(p: Product): boolean {
  return !isPieces(p) && quickStep(p) === 1;
}
</script>

<template>
  <div
    :class="getCategoryCardColor(product)"
    class="border-ink shadow-hard-md relative flex flex-col justify-between rounded-2xl border-2 p-3 text-white transition-transform hover:-translate-y-0.5"
  >
    <Badge
      v-if="product.stock <= product.minStock"
      :class="product.stock === 0 ? 'bg-card-coral' : 'bg-card-yellow'"
      class="shadow-hard-sm absolute -top-2 -right-2 z-10 text-white"
    >
      Stok {{ product.stock === 0 ? 'Habis' : 'Menipis' }}
    </Badge>

    <div>
      <div
        class="border-ink mb-2 flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border-2 bg-white sm:h-28"
      >
        <img
          v-if="product.image"
          :src="product.image"
          :alt="product.name"
          class="h-full w-full object-cover"
        />
        <PackageOpen v-else class="text-ink/30 h-8 w-8" />
      </div>

      <span class="text-[10px] font-bold tracking-wider uppercase opacity-80">
        {{ product.category }}
      </span>

      <h3 class="mt-0.5 truncate text-sm leading-tight font-extrabold sm:text-base">
        {{ product.name }}
      </h3>

      <p class="mt-0.5 text-xs font-bold text-white/90">
        Rp {{ formatPrice(product.sellingPrice) }} /
        <span class="underline underline-offset-2">{{ product.unit }}</span>
      </p>

      <p v-if="isPieces(product)" class="text-[10px] font-extrabold text-white/85">
        Ecer: Rp {{ formatPrice(product.smallPrice ?? 0) }} /
        {{ product.smallUnit ?? 'bagian' }}
      </p>
    </div>

    <!-- Actions -->
    <div class="mt-3 flex flex-col gap-1.5 border-t border-white/20 pt-2">
      <div class="flex items-center justify-between text-[11px] font-semibold text-white/90">
        <span>Stok: {{ formatQty(product.stock) }} {{ product.unit }}</span>
      </div>

      <!-- Single button -->
      <template v-if="isUnitOnly(product)">
        <button
          type="button"
          @click="emit('add', 1, false)"
          :disabled="product.stock <= 0"
          class="neo-press text-ink hover:bg-canvas col-span-2 cursor-pointer rounded-xl border border-black bg-white py-1.5 text-center text-[11px] font-extrabold disabled:opacity-50"
        >
          +1 {{ product.unit }}
        </button>
      </template>

      <!-- Two buttons -->
      <div v-else class="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          @click="isPieces(product) ? emit('add', 1, true) : emit('add', quickStep(product), false)"
          :disabled="product.stock <= 0"
          class="neo-press border-ink bg-ink hover:bg-brand cursor-pointer rounded-xl border py-1.5 text-[11px] font-extrabold text-white disabled:opacity-50"
        >
          +{{ isPieces(product) ? 1 : quickStep(product) }}
          {{ isPieces(product) ? (product.smallUnit ?? 'bagian') : product.unit }}
        </button>

        <button
          type="button"
          @click="emit('add', 1, false)"
          :disabled="product.stock <= 0"
          class="neo-press border-ink text-ink hover:bg-canvas cursor-pointer rounded-xl border bg-white py-1.5 text-[11px] font-extrabold disabled:opacity-50"
        >
          +1 {{ product.unit }}
        </button>
      </div>
    </div>
  </div>
</template>

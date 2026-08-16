<script setup lang="ts">
import { ShoppingCart, Trash2, Minus, Plus } from 'lucide-vue-next';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import { formatPrice } from '@/lib/utils';
import { useCartStore, lineSubtotal, fmtQty } from '@/stores/cart';
import type { CartItem } from '@/stores/cart';
import type { Product } from '@point-of-sale/shared';

defineProps<{
  isMobileDrawer?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'checkout'): void;
}>();

const cart = useCartStore();

function isPieces(p: Product): boolean {
  return !!p.piecesPerUnit && p.piecesPerUnit > 1;
}

function qtyStep(it: CartItem): number {
  if (it.pieceMode && isPieces(it.product)) {
    return (1 / it.product.piecesPerUnit!);
  }
  return it.product.step ?? 1;
}

function handleInputQty(it: CartItem, event: Event) {
  const val = Number((event.target as HTMLInputElement).value) || 0;
  cart.setQty(it.product.id, val);
}
</script>

<template>
  <div class="flex h-full flex-col justify-between">
    <div>
      <div class="border-ink flex items-center justify-between border-b-2 pb-3">
        <div class="flex items-center gap-2">
          <ShoppingCart class="h-5 w-5" />
          <h2 class="text-base font-extrabold sm:text-lg">Keranjang Belanja</h2>
        </div>
        <Button
          v-if="cart.items.length"
          variant="secondary"
          class="px-2.5 py-1 text-[11px]"
          @click="cart.clearCart()"
        >
          Kosongkan
        </Button>
      </div>

      <div
        v-if="cart.items.length === 0"
        class="py-12 text-center text-xs font-bold text-gray-500"
      >
        Keranjang masih kosong. Pilih produk di sebelah kiri.
      </div>

      <div
        v-else
        class="neo-scroll mt-3 space-y-3 overflow-y-auto pr-1"
        :class="isMobileDrawer ? 'max-h-[55vh]' : 'max-h-[calc(100vh-280px)]'"
      >
        <div
          v-for="it in cart.items"
          :key="it.product.id"
          class="border-ink bg-canvas rounded-xl border-2 p-3 font-bold"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <h4 class="text-xs font-extrabold">{{ it.product.name }}</h4>
              <p class="text-ink/60 text-[10px]">
                Rp {{ formatPrice(it.product.sellingPrice) }} / {{ it.product.unit }}
              </p>
            </div>
            <button
              @click="cart.removeFromCart(it.product.id)"
              class="text-card-coral p-1 hover:opacity-80"
              title="Hapus item"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <div class="mt-2.5 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1">
              <button
                @click="cart.decreaseQty(it.product.id, qtyStep(it))"
                class="neo-press border-ink bg-surface flex h-7 w-7 items-center justify-center rounded-lg border-2 text-xs font-black"
              >
                <Minus class="h-3 w-3" />
              </button>
              <Input
                :model-value="it.qty"
                @input="handleInputQty(it, $event)"
                type="number"
                step="any"
                class="h-7 w-16 px-1 text-center text-xs font-extrabold"
              />
              <button
                @click="cart.increaseQty(it.product.id, qtyStep(it))"
                class="neo-press border-ink bg-surface flex h-7 w-7 items-center justify-center rounded-lg border-2 text-xs font-black"
              >
                <Plus class="h-3 w-3" />
              </button>
            </div>
            <div class="text-right">
              <div class="text-xs font-black">
                Rp {{ formatPrice(lineSubtotal(it.product, it.qty)) }}
              </div>
              <div class="text-ink/60 text-[10px]">
                {{ fmtQty(it) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="border-ink border-t-2 pt-3">
      <div class="mb-3 flex items-baseline justify-between font-extrabold">
        <span class="text-xs text-gray-600">Total Belanja:</span>
        <span class="text-brand text-lg">Rp {{ formatPrice(cart.subtotal) }}</span>
      </div>
      <Button
        variant="primary"
        class="w-full text-sm font-extrabold"
        :disabled="cart.items.length === 0"
        @click="emit('checkout')"
      >
        Lanjut Pembayaran
      </Button>
    </div>
  </div>
</template>

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Product } from '@point-of-sale/shared';

export interface CartItem {
  product: Product;
  qty: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Batasi qty ke stok produk (cegah oversell di UI) dan minimal 0. */
function clampQty(qty: number, stock: number): number {
  return round2(Math.min(Math.max(0, qty), Math.max(0, stock)));
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);

  const subtotal = computed(() =>
    round2(items.value.reduce((sum, it) => sum + it.product.sellingPrice * it.qty, 0)),
  );
  const totalItems = computed(() =>
    round2(items.value.reduce((sum, it) => sum + it.qty, 0)),
  );

  function addToCart(product: Product, qty = 1) {
    const existing = items.value.find((it) => it.product.id === product.id);
    if (existing) {
      existing.qty = clampQty(existing.qty + qty, product.stock);
    } else {
      const clamped = clampQty(qty, product.stock);
      if (clamped > 0) items.value.push({ product, qty: clamped });
    }
  }

  function setQty(productId: string, qty: number) {
    const it = items.value.find((x) => x.product.id === productId);
    if (!it) return;
    const clamped = clampQty(qty, it.product.stock);
    if (clamped <= 0) {
      removeFromCart(productId);
    } else {
      it.qty = clamped;
    }
  }

  function increaseQty(productId: string, step = 1) {
    const it = items.value.find((x) => x.product.id === productId);
    if (it) it.qty = clampQty(it.qty + step, it.product.stock);
  }

  function decreaseQty(productId: string, step = 1) {
    const it = items.value.find((x) => x.product.id === productId);
    if (!it) return;
    const nextQty = clampQty(it.qty - step, it.product.stock);
    if (nextQty <= 0) {
      removeFromCart(productId);
    } else {
      it.qty = nextQty;
    }
  }

  function removeFromCart(productId: string) {
    items.value = items.value.filter((x) => x.product.id !== productId);
  }

  function clearCart() {
    items.value = [];
  }

  return {
    items,
    subtotal,
    totalItems,
    addToCart,
    setQty,
    increaseQty,
    decreaseQty,
    removeFromCart,
    clearCart,
  };
});
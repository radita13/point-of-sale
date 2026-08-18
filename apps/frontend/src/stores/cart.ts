import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Product } from '@point-of-sale/shared';

export interface CartItem {
  product: Product;
  qty: number;
  /** true = kasir input dalam satuan kecil (bat); false = satuan besar (pak). Default false. */
  pieceMode?: boolean;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/** Batasi qty ke stok produk (cegah oversell di UI) dan minimal 0. */
function clampQty(qty: number, stock: number): number {
  return round6(Math.min(Math.max(0, qty), Math.max(0, stock)));
}

/** Sub-total sebaris: tier produk dipecah utuh(unit) + sisa (unit kecil / spesifik). */
export function lineSubtotal(p: Product, qty: number): number {
  const packPrice = p.sellingPrice;
  const ppu = p.piecesPerUnit && p.piecesPerUnit > 1 ? p.piecesPerUnit : 1;
  if (ppu === 1) return round2(packPrice * qty);
  const sticks = Math.round(round6(qty * ppu));
  const fullPacks = Math.floor(sticks / ppu);
  const rem = sticks - fullPacks * ppu;
  const piecePrice = p.smallPrice ?? packPrice / ppu;
  return round2(fullPacks * packPrice + rem * piecePrice);
}

/** Jumlah & tampilan tier: pecahan qty (dalam satuan besar) jadi bilangan bulat kecil. */
export function splitPieces(p: Product, qty: number): { packs: number; pieces: number } {
  const ppu = p.piecesPerUnit && p.piecesPerUnit > 1 ? p.piecesPerUnit : 1;
  if (ppu === 1) return { packs: round6(qty), pieces: 0 };
  const sticks = Math.round(round6(qty * ppu));
  return { packs: Math.floor(sticks / ppu), pieces: sticks - Math.floor(sticks / ppu) * ppu };
}

/** Format qty untuk tampilan di keranjang: pieceMode → tampilkan "X pak + Y bat". */
export function fmtQty(it: { product: Product; qty: number; pieceMode?: boolean }, _unused?: boolean): string {
  const p = it.product;
  const isPiecesLocal = !!p.piecesPerUnit && p.piecesPerUnit > 1;
  if (isPiecesLocal) {
    const { packs, pieces } = splitPieces(p, it.qty);
    const parts: string[] = [];
    if (packs > 0) parts.push(`${packs} ${p.unit}`);
    if (pieces > 0) parts.push(`${pieces} ${p.smallUnit ?? 'bat'}`);
    return parts.length ? parts.join(' + ') : '0';
  }
  return `${it.qty} ${p.unit}`;
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);

  const subtotal = computed(() =>
    round2(items.value.reduce((sum, it) => sum + lineSubtotal(it.product, it.qty), 0)),
  );
  const totalItems = computed(() =>
    round6(items.value.reduce((sum, it) => sum + it.qty, 0)),
  );

  function addToCart(product: Product, qty = 1, pieceMode = false) {
    const existing = items.value.find((it) => it.product.id === product.id);
    if (existing) {
      existing.qty = clampQty(existing.qty + qty, product.stock);
      existing.pieceMode = pieceMode;
    } else {
      const clamped = clampQty(qty, product.stock);
      if (clamped > 0) items.value.push({ product, qty: clamped, pieceMode });
    }
  }

  function setQty(productId: string, displayQty: number, overridePieceMode?: boolean) {
    const it = items.value.find((x) => x.product.id === productId);
    if (!it) return;
    const mode = overridePieceMode !== undefined ? overridePieceMode : (it.pieceMode ?? false);
    if (overridePieceMode !== undefined) it.pieceMode = overridePieceMode;
    const ppu = mode && it.product.piecesPerUnit && it.product.piecesPerUnit > 1
      ? it.product.piecesPerUnit : 1;
    const qty = mode ? round6(displayQty / ppu) : round6(displayQty);
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

  function setPieceMode(productId: string, mode: boolean) {
    const it = items.value.find((x) => x.product.id === productId);
    if (it) it.pieceMode = mode;
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
    setPieceMode,
    clearCart,
  };
});
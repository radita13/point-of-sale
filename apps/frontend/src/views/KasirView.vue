<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { toast } from 'vue-sonner';
import {
  Search,
  ShoppingCart,
  Printer,
  Trash2,
  Minus,
  Plus,
  ReceiptText,
  X,
  PackageOpen,
  Bluetooth,
  Camera,
} from 'lucide-vue-next';
import type { Product, TransactionItem } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { formatPrice, formatQty } from '@/lib/utils';
import { useCartStore, lineSubtotal, splitPieces, round6 } from '@/stores/cart';
import { commitTransaction } from '@/services/transactions';
import { useBluetoothPrinter } from '@/composables/useBluetoothPrinter';
import { useSyncStore } from '@/stores/sync';
import { useStoreSettingsStore } from '@/stores/storeSettings';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import { useAuthStore } from '@/stores';
import { useRouter } from 'vue-router';
import { CATEGORIES, getCategoryCardColor } from '@/constants/product';
import BarcodeScannerModal from '@/components/kasir/BarcodeScannerModal.vue';

const router = useRouter();

const cart = useCartStore();
const printer = useBluetoothPrinter();
const sync = useSyncStore();
const auth = useAuthStore();
const storeSettings = useStoreSettingsStore();

const displayPhone = computed(() => {
  return storeSettings.settings.phone?.trim() || auth.userMetadata?.phone?.trim() || '';
});

const products = ref<Product[]>([]);
const searchQuery = ref('');
const selectedCategory = ref('Semua');
const showMobileCart = ref(false);
const showScannerModal = ref(false);

watch(showMobileCart, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

function handleResize() {
  if (window.innerWidth >= 1024) {
    showMobileCart.value = false;
    document.body.style.overflow = '';
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

let unsubscribeProducts: (() => void) | undefined;

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.body.style.overflow = '';
  if (unsubscribeProducts) unsubscribeProducts();
});

function cardColor(p: Product): string {
  return getCategoryCardColor(p);
}

async function loadProducts() {
  products.value = (await db.products.toArray()).filter((p) => !p.isDeleted);
}

onMounted(async () => {
  unsubscribeProducts = sync.onProductsUpdated(() => {
    loadProducts();
  });
  if (navigator.onLine && (await db.products.count()) === 0) {
    const restored = await sync.restoreProductsFromServer();
    if (restored > 0) {
      await loadProducts();
      return;
    }
  }
  await loadProducts();
});

const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return products.value.filter((p) => {
    const matchCat = selectedCategory.value === 'Semua' || p.category === selectedCategory.value;
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
});

function isPieces(p: Product): boolean {
  return !!p.piecesPerUnit && p.piecesPerUnit > 1;
}

function quickStep(p: Product): number {
  if (isPieces(p)) return 1 / (p.piecesPerUnit ?? 1);
  if (p.step) return p.step;
  return p.unit === 'kg' || p.unit === 'liter' ? 0.5 : 1;
}

/** Barang utuh biasa (step=1, tanpa eceran) → cukup satu tombol kasir. */
function isUnitOnly(p: Product): boolean {
  return !isPieces(p) && quickStep(p) === 1;
}

/** Step tombol +/- keranjang: tier bat → per batang, selain itu per satuan tampilan. */
function qtyStep(it: { product: Product; pieceMode?: boolean }): number {
  if (isPieces(it.product)) return it.pieceMode ? quickStep(it.product) : 1;
  return quickStep(it.product);
}

function updatePackQty(it: { product: Product; qty: number }, e: Event) {
  const val = Math.max(0, Number((e.target as HTMLInputElement).value) || 0);
  const { pieces } = splitPieces(it.product, it.qty);
  const ppu = it.product.piecesPerUnit ?? 1;
  cart.setQty(it.product.id, val + pieces / ppu, false);
}

function updatePieceQty(it: { product: Product; qty: number }, e: Event) {
  const val = Math.max(0, Number((e.target as HTMLInputElement).value) || 0);
  const { packs } = splitPieces(it.product, it.qty);
  const ppu = it.product.piecesPerUnit ?? 1;
  cart.setQty(it.product.id, packs + val / ppu, false);
}

function addToCart(p: Product, qty: number, pieceMode = false) {
  if (p.stock <= 0) return;
  const qtyInPack = isPieces(p) && pieceMode ? round6(qty / (p.piecesPerUnit ?? 1)) : qty;
  cart.addToCart(p, qtyInPack, pieceMode);
  const label = isPieces(p) && pieceMode ? `${qty} ${p.smallUnit ?? 'bagian'}` : `${qty} ${p.unit}`;
  toast.success(`${p.name} (+${label}) dimasukkan!`);
}

const payAmount = ref(0);
const finalAmount = computed(() => cart.subtotal);
const changeAmount = computed(() => payAmount.value - finalAmount.value);
const quickPresets = [10000, 20000, 50000, 100000];

function applyPreset(v: number) {
  payAmount.value = v;
}

const presetsWithPas = computed(() => [
  { label: 'Uang Pas', value: finalAmount.value },
  ...quickPresets.map((v) => ({
    label: `${(v / 1000).toLocaleString('id-ID')} Ribu`,
    value: v,
  })),
]);

interface Receipt {
  invoiceNo: string;
  date: string;
  items: TransactionItem[];
  total: number;
  pay: number;
  change: number;
}
const showReceipt = ref(false);
const lastReceipt = ref<Receipt | null>(null);

async function processPayment() {
  if (cart.items.length === 0) return;
  if (payAmount.value < finalAmount.value) return;

  const items: TransactionItem[] = cart.items.map((it) => ({
    productId: it.product.id,
    productName: it.product.name,
    sku: it.product.sku,
    qty: it.qty,
    unit: it.product.unit,
    price: it.product.sellingPrice,
    costPrice: it.product.costPrice,
    subtotal: lineSubtotal(it.product, it.qty),
  }));

  try {
    const { transaction } = await commitTransaction(items, {
      paymentMethod: 'CASH',
      payAmount: payAmount.value,
      changeAmount: changeAmount.value,
    });

    lastReceipt.value = {
      invoiceNo: transaction.invoiceNo,
      date: new Date(transaction.timestamp).toLocaleString('id-ID'),
      items: transaction.items,
      total: transaction.finalAmount,
      pay: transaction.payAmount,
      change: transaction.changeAmount,
    };

    cart.clearCart();
    payAmount.value = 0;
    showMobileCart.value = false;
    showReceipt.value = true;
    await loadProducts();
    sync.refreshCount();
    if (navigator.onLine) sync.runSync();
    toast.success('Transaksi Berhasil Dicatat!');
  } catch (err) {
    console.error(err);
    toast.error('Gagal menyimpan transaksi.');
  }
}

function receiptDesc(item: TransactionItem): string {
  const p = products.value.find((x) => x.id === item.productId);
  if (p && isPieces(p)) {
    const { packs, pieces } = splitPieces(p, item.qty);
    const parts: string[] = [];
    if (packs > 0) parts.push(`${packs} ${p.unit}`);
    if (pieces > 0) parts.push(`${pieces} ${p.smallUnit ?? 'bat'}`);
    return parts.length ? parts.join(' + ') : '0';
  }
  return `${item.qty} ${item.unit}`;
}

function printNow() {
  if (!lastReceipt.value) return;
  if (!printer.isConnected.value) {
    toast.info('Hubungkan printer Bluetooth dulu, atau tutup preview struk.');
    return;
  }
  printer
    .printReceipt({
      storeName: storeSettings.settings.storeName,
      address: storeSettings.settings.address,
      phone: displayPhone.value,
      invoiceNo: lastReceipt.value.invoiceNo,
      date: lastReceipt.value.date,
      cashier: 'Kasir',
      items: lastReceipt.value.items.map((i) => ({
        name: i.productName,
        qty: i.qty,
        unit: i.unit,
        price: i.price,
        subtotal: i.subtotal,
      })),
      total: lastReceipt.value.total,
      pay: lastReceipt.value.pay,
      change: lastReceipt.value.change,
      paymentMethod: 'CASH',
    })
    .then(() => toast.success('Struk dikirim ke printer Bluetooth.'))
    .catch((err) => toast.error(err instanceof Error ? err.message : 'Gagal cetak.'));
}

async function connectPrinter() {
  try {
    await printer.connect();
    toast.success(`Printer terhubung: ${printer.deviceName.value}`);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Gagal menghubungkan printer.');
  }
}

function normalizeCode(str: string): string {
  return str.trim().toLowerCase().replace(/^0+/, '').replace(/[^a-z0-9]/g, '');
}

function handleBarcodeScanned(skuText: string) {
  const rawCode = skuText.trim().toLowerCase();
  const cleanCode = normalizeCode(skuText);

  const found = products.value.find((p) => {
    const pSkuRaw = p.sku.trim().toLowerCase();
    const pSkuClean = normalizeCode(p.sku);
    const pNameRaw = p.name.trim().toLowerCase();
    const pNameClean = normalizeCode(p.name);

    return (
      pSkuRaw === rawCode ||
      pNameRaw === rawCode ||
      (cleanCode.length > 0 && (pSkuClean === cleanCode || pNameClean === cleanCode)) ||
      (pSkuRaw.length > 3 && rawCode.includes(pSkuRaw)) ||
      (rawCode.length > 3 && pSkuRaw.includes(rawCode))
    );
  });

  if (found) {
    if (found.stock <= 0) {
      toast.error(`Stok ${found.name} habis!`);
      return;
    }
    cart.addToCart(found, 1);
    toast.success(`${found.name} ditambahkan ke keranjang.`);
    showScannerModal.value = false;
  } else {
    searchQuery.value = skuText;
    showScannerModal.value = false;
    toast.warning(`Produk "${skuText}" belum terdaftar di katalog.`, {
      action: {
        label: '+ Tambah Barang',
        onClick: () => {
          router.push(`/inventaris?addSku=${encodeURIComponent(skuText)}`);
        },
      },
    });
  }
}
</script>

<template>
  <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
    <!-- Left: catalog -->
    <section class="space-y-4 lg:col-span-7">
      <div class="border-ink bg-surface shadow-hard-md space-y-3 rounded-2xl border-2 p-3.5">
        <div class="relative flex items-center gap-2">
          <Search class="text-ink/40 absolute left-3 h-5 w-5" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama barang atau SKU..."
            class="border-ink bg-canvas text-ink focus:ring-brand h-11 w-full rounded-xl border-2 pr-12 pl-9 text-sm font-bold focus:ring-2 focus:outline-none"
          />
          <button
            @click="showScannerModal = true"
            title="Scan Barcode / SKU Kamera"
            class="neo-press border-ink bg-brand text-ink shadow-hard-xs absolute right-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-2 font-bold"
          >
            <Camera class="h-4 w-4" />
          </button>
        </div>

        <div class="neo-scroll flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            v-for="cat in CATEGORIES"
            :key="cat"
            @click="selectedCategory = cat"
            :class="selectedCategory === cat ? 'bg-ink text-white' : 'bg-canvas text-ink'"
            class="neo-press border-ink cursor-pointer rounded-xl border px-3 py-1 text-[11px] font-extrabold whitespace-nowrap"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <div
        v-if="filteredProducts.length === 0"
        class="border-ink bg-surface rounded-2xl border-2 p-10 text-center"
      >
        <PackageOpen class="text-ink/30 mx-auto mb-2 h-10 w-10" />
        <p class="text-sm font-bold">Tidak ada produk ditemukan.</p>
      </div>

      <div class="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        <div
          v-for="p in filteredProducts"
          :key="p.id"
          :class="cardColor(p)"
          class="border-ink shadow-hard-md relative flex flex-col justify-between rounded-2xl border-2 p-3 text-white transition-transform hover:-translate-y-0.5"
        >
          <Badge
            v-if="p.stock <= p.minStock"
            class="bg-card-coral shadow-hard-sm absolute -top-2 -right-2 z-10 text-white"
          >
            Stok {{ p.stock <= 0 ? 'HABIS' : 'Menipis' }}
          </Badge>

          <div>
            <div
              class="border-ink mb-2 flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border-2 bg-white sm:h-28"
            >
              <img v-if="p.image" :src="p.image" :alt="p.name" class="h-full w-full object-cover" />
              <PackageOpen v-else class="text-ink/30 h-8 w-8" />
            </div>
            <span class="text-[10px] font-bold tracking-wider uppercase opacity-80">{{
              p.category
            }}</span>
            <h3 class="mt-0.5 truncate text-sm leading-tight font-extrabold sm:text-base">
              {{ p.name }}
            </h3>
            <p class="mt-0.5 text-xs font-bold text-white/90">
              Rp {{ formatPrice(p.sellingPrice) }} /
              <span class="underline underline-offset-2">{{ p.unit }}</span>
            </p>
            <p v-if="isPieces(p)" class="text-[10px] font-extrabold text-white/85">
              Ecer: Rp {{ formatPrice(p.smallPrice ?? 0) }} /
              {{ p.smallUnit ?? 'bagian' }}
            </p>
          </div>

          <div class="mt-3 flex flex-col gap-1.5 border-t border-white/20 pt-2">
            <div class="flex items-center justify-between text-[11px] font-semibold text-white/90">
              <span>Stok: {{ formatQty(p.stock) }} {{ p.unit }}</span>
            </div>
            <!-- Single button untuk barang step=1 & non-tier -->
            <template v-if="isUnitOnly(p)">
              <button
                @click="addToCart(p, 1)"
                :disabled="p.stock <= 0"
                class="neo-press text-ink hover:bg-canvas col-span-2 cursor-pointer rounded-xl border border-black bg-white py-1.5 text-center text-[11px] font-extrabold disabled:opacity-50"
              >
                +1 {{ p.unit }}
              </button>
            </template>
            <!-- Two buttons: pecahan (kg/liter) atau eceran tier (pak/bat) -->
            <div v-else class="grid grid-cols-2 gap-1.5">
              <button
                @click="isPieces(p) ? addToCart(p, 1, true) : addToCart(p, quickStep(p))"
                :disabled="p.stock <= 0"
                class="neo-press border-ink bg-ink hover:bg-brand cursor-pointer rounded-xl border py-1.5 text-[11px] font-extrabold text-white disabled:opacity-50"
              >
                +{{ isPieces(p) ? 1 : quickStep(p) }}
                {{ isPieces(p) ? (p.smallUnit ?? 'bagian') : p.unit }}
              </button>
              <button
                @click="isPieces(p) ? addToCart(p, 1, false) : addToCart(p, 1)"
                :disabled="p.stock <= 0"
                class="neo-press border-ink text-ink hover:bg-canvas cursor-pointer rounded-xl border bg-white py-1.5 text-[11px] font-extrabold disabled:opacity-50"
              >
                +1 {{ p.unit }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Right: cart sidebar (desktop) -->
    <aside
      class="border-ink bg-surface shadow-hard-lg sticky top-24 hidden h-[calc(100vh-150px)] flex-col justify-between rounded-2xl border-2 p-4 lg:col-span-5 lg:flex"
    >
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="border-ink mb-3 flex items-center justify-between border-b-2 pb-3">
          <h2 class="flex items-center gap-2 text-base font-extrabold">
            <ShoppingCart class="text-brand h-5 w-5" /> Keranjang Belanja
          </h2>
          <button
            v-if="cart.items.length"
            @click="
              cart.clearCart();
              payAmount = 0;
            "
            class="text-card-coral text-xs font-bold hover:underline"
          >
            Reset
          </button>
        </div>

        <div
          v-if="cart.items.length === 0"
          class="flex flex-1 flex-col items-center justify-center py-6 text-center text-gray-500"
        >
          <ShoppingCart class="text-ink/20 mx-auto mb-2 h-10 w-10" />
          <p class="text-ink text-sm font-bold">Keranjang masih kosong</p>
          <p class="text-ink/50 mt-0.5 text-xs">
            Pilih produk sembako dari katalog produk.
          </p>
        </div>

        <div v-else class="neo-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 pb-2">
          <div
            v-for="it in cart.items"
            :key="it.product.id"
            class="border-ink bg-canvas shadow-hard-sm flex flex-col gap-2 rounded-xl border-2 p-2.5"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <h4 class="truncate text-sm font-extrabold">
                  {{ it.product.name }}
                </h4>
                <p class="mt-0.5 text-[11px] font-bold text-gray-600">
                  Rp {{ formatPrice(it.product.sellingPrice) }} /
                  {{ it.product.unit }}
                </p>
              </div>
              <button
                @click="cart.removeFromCart(it.product.id)"
                class="hover:text-card-coral shrink-0 p-1 text-gray-400"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>

            <div class="flex items-center justify-between border-t border-gray-300 pt-2">
              <div class="flex items-center gap-4">
                <div class="flex gap-2">
                  <Button
                    @click="cart.decreaseQty(it.product.id, qtyStep(it))"
                    size="icon"
                    class="cursor-pointer"
                  >
                    <Minus class="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    @click="cart.increaseQty(it.product.id, qtyStep(it))"
                    size="icon"
                    class="cursor-pointer"
                  >
                    <Plus class="h-3.5 w-3.5" />
                  </Button>
                </div>
                <!-- Produk Tier Eceran: 2 input box (Pak + Batang) -->
                <div v-if="isPieces(it.product)" class="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    :value="splitPieces(it.product, it.qty).packs"
                    @change="(e: Event) => updatePackQty(it, e)"
                    class="no-spin border-ink h-8 w-12 rounded-lg border bg-white py-1 text-center text-xs font-bold focus:outline-none"
                  />
                  <span class="text-[11px] font-bold text-gray-600">{{ it.product.unit }}</span>
                  <span class="text-[11px] font-bold text-gray-400">+</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    :value="splitPieces(it.product, it.qty).pieces"
                    @change="(e: Event) => updatePieceQty(it, e)"
                    class="no-spin border-ink h-8 w-12 rounded-lg border bg-white py-1 text-center text-xs font-bold focus:outline-none"
                  />
                  <span class="text-[11px] font-bold text-gray-600">{{
                    it.product.smallUnit ?? 'bat'
                  }}</span>
                </div>
                <!-- Produk Utuh Biasa: 1 input box -->
                <div v-else class="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    :value="it.qty"
                    @change="
                      (e: Event) =>
                        cart.setQty(
                          it.product.id,
                          Number((e.target as HTMLInputElement).value),
                          false
                        )
                    "
                    class="no-spin border-ink h-8 w-16 rounded-lg border bg-white py-1 text-center text-xs font-bold focus:outline-none"
                  />
                  <span class="text-[11px] font-bold text-gray-600">{{ it.product.unit }}</span>
                </div>
              </div>
              <span class="text-sm font-extrabold"
                >Rp {{ formatPrice(lineSubtotal(it.product, it.qty)) }}</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Summary + checkout -->
      <div class="border-ink mt-3 space-y-2.5 border-t-2 pt-3">
        <div class="space-y-1 text-xs font-bold">
          <div class="flex justify-between text-gray-600">
            <span>Subtotal Barang:</span>
            <span>Rp {{ formatPrice(cart.subtotal) }}</span>
          </div>
          <div class="text-ink flex items-center justify-between text-sm font-extrabold">
            <span>Total Tagihan:</span>
            <span class="text-brand text-lg">Rp {{ formatPrice(finalAmount) }}</span>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-1.5">
          <button
            v-for="preset in presetsWithPas"
            :key="preset.label"
            @click="applyPreset(preset.value)"
            class="neo-press border-ink bg-canvas cursor-pointer rounded-lg border py-1.5 text-[10px] font-extrabold"
          >
            {{ preset.label }}
          </button>
        </div>

        <div class="flex items-center gap-2">
          <span class="w-28 text-sm font-extrabold">Uang Cash:</span>
          <input
            type="number"
            v-model.number="payAmount"
            placeholder="0"
            class="border-ink no-spin w-full rounded-xl border-2 bg-white px-3 py-1.5 text-sm font-extrabold focus:outline-none"
          />
        </div>

        <div class="flex justify-between text-sm font-bold">
          <span>Kembalian:</span>
          <span
            :class="changeAmount < 0 ? 'text-card-coral' : 'text-card-green'"
            class="font-extrabold"
          >
            Rp {{ formatPrice(changeAmount < 0 ? 0 : changeAmount) }}
          </span>
        </div>

        <div class="flex w-full items-center gap-2">
          <Button
            @click="connectPrinter"
            variant="secondary"
            :disabled="!printer.isSupported.value"
            :class="
              printer.isConnected.value
                ? 'bg-card-green border-ink text-white'
                : 'bg-surface text-ink border-ink'
            "
            class="flex-1 cursor-pointer"
            :title="
              printer.isConnected.value
                ? (printer.deviceName.value ?? 'Hubungkan Printer Bluetooth')
                : 'Hubungkan printer Bluetooth'
            "
          >
            <Bluetooth class="h-4 w-4" />
            {{ printer.isConnected.value ? printer.deviceName.value : 'Hubungkan Printer' }}
          </Button>
          <Button
            variant="primary"
            @click="processPayment"
            :disabled="cart.items.length === 0 || payAmount < finalAmount"
            class="flex-1 cursor-pointer"
          >
            <Printer class="h-4 w-4" />
            Bayar & Cetak Struk
          </Button>
        </div>
      </div>
    </aside>

    <!-- Mobile floating cart bar -->
    <div
      v-if="cart.items.length > 0"
      class="bg-ink shadow-hard-lg fixed inset-x-3 bottom-18 z-40 flex items-center justify-between rounded-2xl border-2 border-white p-3 text-white lg:hidden"
    >
      <div>
        <p class="text-[10px] font-bold tracking-wider text-gray-300 uppercase">
          {{ cart.totalItems }} Item dalam Keranjang
        </p>
        <p class="text-offline text-base font-black">Rp {{ formatPrice(finalAmount) }}</p>
      </div>
      <button
        @click="showMobileCart = true"
        class="neo-press bg-brand hover:bg-brand-hover flex items-center gap-1.5 rounded-xl border border-white px-4 py-2.5 text-xs font-extrabold uppercase"
      >
        <ShoppingCart class="h-4 w-4" /> Lihat
      </button>
    </div>

    <!-- Mobile bottom sheet -->
    <div
      v-if="showMobileCart"
      class="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden"
    >
      <div
        class="border-ink bg-surface shadow-hard-xl flex max-h-[85vh] flex-col justify-between rounded-t-3xl border-x-2 border-t-2 p-4"
      >
        <div>
          <div class="border-ink mb-3 flex items-center justify-between border-b-2 pb-3">
            <h2 class="flex items-center gap-2 text-base font-extrabold">
              <ShoppingCart class="text-brand h-5 w-5" /> Keranjang Belanja
            </h2>
            <div class="flex items-center gap-2">
              <button
                v-if="cart.items.length"
                @click="
                  cart.clearCart();
                  payAmount = 0;
                "
                class="text-card-coral text-xs font-bold hover:underline"
              >
                Reset
              </button>
              <button @click="showMobileCart = false" class="p-1 text-gray-600">
                <X class="h-5 w-5" />
              </button>
            </div>
          </div>
          <div
            v-if="cart.items.length === 0"
            class="flex flex-1 flex-col items-center justify-center py-8 text-center text-gray-500"
          >
            <ShoppingCart class="text-ink/20 mx-auto mb-2 h-10 w-10" />
            <p class="text-ink text-sm font-bold">Keranjang masih kosong</p>
            <p class="text-ink/50 mt-0.5 text-xs">
              Pilih produk sembako dari katalog produk.
            </p>
          </div>

          <div v-else class="neo-scroll max-h-60 space-y-2 overflow-y-auto overscroll-contain pr-1 pb-2">
            <div
              v-for="it in cart.items"
              :key="it.product.id"
              class="border-ink bg-canvas shadow-hard-sm flex flex-col gap-2 rounded-xl border-2 p-2.5"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <h4 class="truncate text-sm font-extrabold">
                    {{ it.product.name }}
                  </h4>
                  <p class="mt-0.5 text-[11px] font-bold text-gray-600">
                    Rp {{ formatPrice(it.product.sellingPrice) }} /
                    {{ it.product.unit }}
                  </p>
                </div>
                <button
                  @click="cart.removeFromCart(it.product.id)"
                  class="hover:text-card-coral shrink-0 p-1 text-gray-400"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>

              <div class="flex items-center justify-between border-t border-gray-300 pt-2">
                <div class="flex items-center gap-4">
                  <div class="flex gap-2">
                    <Button
                      @click="cart.decreaseQty(it.product.id, qtyStep(it))"
                      size="icon"
                      class="cursor-pointer"
                    >
                      <Minus class="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      @click="cart.increaseQty(it.product.id, qtyStep(it))"
                      size="icon"
                      class="cursor-pointer"
                    >
                      <Plus class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <!-- Produk Tier Eceran: 2 input box (Pak + Batang) -->
                  <div v-if="isPieces(it.product)" class="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      :value="splitPieces(it.product, it.qty).packs"
                      @change="(e: Event) => updatePackQty(it, e)"
                      class="no-spin border-ink h-8 w-12 rounded-lg border bg-white py-1 text-center text-xs font-bold focus:outline-none"
                    />
                    <span class="text-[11px] font-bold text-gray-600">{{ it.product.unit }}</span>
                    <span class="text-[11px] font-bold text-gray-400">+</span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      :value="splitPieces(it.product, it.qty).pieces"
                      @change="(e: Event) => updatePieceQty(it, e)"
                      class="no-spin border-ink h-8 w-12 rounded-lg border bg-white py-1 text-center text-xs font-bold focus:outline-none"
                    />
                    <span class="text-[11px] font-bold text-gray-600">{{
                      it.product.smallUnit ?? 'bat'
                    }}</span>
                  </div>
                  <!-- Produk Utuh Biasa: 1 input box -->
                  <div v-else class="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      :value="it.qty"
                      @change="
                        (e: Event) =>
                          cart.setQty(
                            it.product.id,
                            Number((e.target as HTMLInputElement).value),
                            false
                          )
                      "
                      class="no-spin border-ink h-8 w-16 rounded-lg border bg-white py-1 text-center text-xs font-bold focus:outline-none"
                    />
                    <span class="text-[11px] font-bold text-gray-600">{{ it.product.unit }}</span>
                  </div>
                </div>
                <span class="text-sm font-extrabold"
                  >Rp {{ formatPrice(lineSubtotal(it.product, it.qty)) }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <div class="border-ink mt-3 space-y-2.5 border-t-2 pt-3">
          <div class="space-y-1 text-xs font-bold">
            <div class="flex justify-between text-gray-600">
              <span>Subtotal Barang:</span>
              <span>Rp {{ formatPrice(cart.subtotal) }}</span>
            </div>
            <div class="text-ink flex items-center justify-between text-sm font-extrabold">
              <span>Total Tagihan:</span>
              <span class="text-brand text-lg">Rp {{ formatPrice(finalAmount) }}</span>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-1.5">
            <button
              v-for="preset in presetsWithPas"
              :key="preset.label"
              @click="applyPreset(preset.value)"
              class="neo-press border-ink bg-canvas cursor-pointer rounded-lg border py-1.5 text-[10px] font-extrabold"
            >
              {{ preset.label }}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <span class="w-28 text-sm font-extrabold">Uang Cash:</span>
            <input
              type="number"
              v-model.number="payAmount"
              placeholder="0"
              class="border-ink no-spin w-full rounded-xl border-2 bg-white px-3 py-1.5 text-sm font-extrabold focus:outline-none"
            />
          </div>

          <div class="flex justify-between text-sm font-bold">
            <span>Kembalian:</span>
            <span
              :class="changeAmount < 0 ? 'text-card-coral' : 'text-card-green'"
              class="font-extrabold"
            >
              Rp {{ formatPrice(changeAmount < 0 ? 0 : changeAmount) }}
            </span>
          </div>

          <div class="flex w-full flex-col gap-2">
            <Button
              @click="connectPrinter"
              variant="secondary"
              :disabled="!printer.isSupported.value"
              :class="
                printer.isConnected.value
                  ? 'bg-card-green border-ink text-white'
                  : 'bg-surface text-ink border-ink'
              "
              class="w-full cursor-pointer"
              :title="
                printer.isConnected.value
                  ? (printer.deviceName.value ?? 'Hubungkan Printer Bluetooth')
                  : 'Hubungkan printer Bluetooth'
              "
            >
              <Bluetooth class="h-4 w-4" />
              {{ printer.isConnected.value ? printer.deviceName.value : 'Hubungkan Printer' }}
            </Button>
            <Button
              variant="primary"
              @click="processPayment"
              :disabled="cart.items.length === 0 || payAmount < finalAmount"
              class="w-full cursor-pointer"
            >
              <Printer class="h-4 w-4" />
              Bayar & Cetak Struk
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Receipt modal -->
    <div
      v-if="showReceipt && lastReceipt"
      class="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        class="border-ink shadow-hard-xl w-full max-w-sm rounded-2xl border-2 bg-white p-6 font-mono text-xs"
      >
        <div class="border-ink mb-3 border-b-2 border-dashed pb-3 text-center">
          <h3 class="text-ink text-sm font-extrabold uppercase">
            {{ storeSettings.settings.storeName }}
          </h3>
          <p class="text-[10px] text-gray-600">
            {{ storeSettings.settings.address }}
          </p>
          <p v-if="displayPhone" class="text-[10px] text-gray-600">
            {{ displayPhone }}
          </p>
        </div>

        <div class="mb-3 space-y-1 text-[11px]">
          <div class="flex justify-between">
            <span>No. Nota:</span><span class="font-bold">{{ lastReceipt.invoiceNo }}</span>
          </div>
          <div class="flex justify-between">
            <span>Tanggal:</span><span>{{ lastReceipt.date }}</span>
          </div>
        </div>

        <div class="border-ink mb-3 space-y-1.5 border-y border-dashed py-2">
          <div v-for="item in lastReceipt.items" :key="item.productId" class="flex justify-between">
            <div>
              <div class="font-bold">{{ item.productName }}</div>
              <div class="text-[10px] text-gray-600">
                {{ receiptDesc(item) }}
              </div>
            </div>
            <div class="font-bold">Rp {{ formatPrice(item.subtotal) }}</div>
          </div>
        </div>

        <div class="mb-4 space-y-1 text-[11px] font-bold">
          <div class="flex justify-between">
            <span>TOTAL:</span><span class="text-sm">Rp {{ formatPrice(lastReceipt.total) }}</span>
          </div>
          <div class="flex justify-between">
            <span>BAYAR (CASH):</span><span>Rp {{ formatPrice(lastReceipt.pay) }}</span>
          </div>
          <div class="flex justify-between">
            <span>KEMBALI:</span><span>Rp {{ formatPrice(lastReceipt.change) }}</span>
          </div>
        </div>

        <div
          class="border-ink mb-4 border-t border-dashed pt-2 text-center text-[10px] whitespace-pre-line text-gray-600"
        >
          {{ storeSettings.settings.receiptFooter }}
        </div>

        <div class="grid grid-cols-2 gap-2 font-sans">
          <button
            @click="showReceipt = false"
            class="neo-press border-ink bg-canvas rounded-xl border-2 py-2 text-xs font-extrabold"
          >
            Tutup
          </button>
          <button
            @click="printNow"
            class="neo-press border-ink bg-brand shadow-hard-sm flex items-center justify-center gap-1 rounded-xl border-2 py-2 text-xs font-extrabold text-white"
          >
            <ReceiptText class="h-3.5 w-3.5" /> Cetak Sekarang
          </button>
        </div>
      </div>
    </div>

    <BarcodeScannerModal
      :open="showScannerModal"
      @close="showScannerModal = false"
      @scan="handleBarcodeScanned"
    />
  </div>
</template>

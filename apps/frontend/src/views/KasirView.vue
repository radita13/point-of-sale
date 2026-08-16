<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { toast } from 'vue-sonner';
import { Search, ShoppingCart, X, PackageOpen, Camera } from 'lucide-vue-next';
import type { Product, TransactionItem } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { formatPrice, formatDate } from '@/lib/utils';
import { useCartStore } from '@/stores/cart';
import { commitTransaction } from '@/services/transactions';
import { useBluetoothPrinter } from '@/composables/useBluetoothPrinter';
import { useSyncStore } from '@/stores/sync';
import { useStoreSettingsStore } from '@/stores/storeSettings';
import Badge from '@/components/ui/Badge.vue';
import { useAuthStore } from '@/stores';
import { useRouter } from 'vue-router';
import { CATEGORIES, getCategoryCardColor } from '@/constants/product';
import BarcodeScannerModal from '@/components/kasir/BarcodeScannerModal.vue';
import PaymentModal from '@/components/kasir/PaymentModal.vue';
import ReceiptModal from '@/components/kasir/ReceiptModal.vue';
import KasirCartSidebar from '@/components/kasir/KasirCartSidebar.vue';
import type { ReceiptData } from '@/composables/receipt';

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
const showPaymentModal = ref(false);
const showReceiptModal = ref(false);

const payAmount = ref(0);
const lastReceipt = ref<ReceiptData | null>(null);

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

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.body.style.overflow = '';
});

async function loadProducts() {
  products.value = (await db.products.toArray()).filter((p) => !p.isDeleted);
}

onMounted(async () => {
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

const finalAmount = computed(() => cart.subtotal);
const changeAmount = computed(() => payAmount.value - finalAmount.value);

const presetAmounts = computed(() => {
  const tot = finalAmount.value;
  const presets: number[] = [];
  if (tot <= 0) return presets;
  presets.push(tot);
  for (const step of [10000, 20000, 50000, 100000]) {
    const next = Math.ceil(tot / step) * step;
    if (next > tot && !presets.includes(next)) presets.push(next);
  }
  return presets.slice(0, 6);
});

function openPayment() {
  if (cart.items.length === 0) return;
  payAmount.value = finalAmount.value;
  showMobileCart.value = false;
  showPaymentModal.value = true;
}

async function processPayment() {
  if (cart.items.length === 0 || payAmount.value < finalAmount.value) return;

  const items: TransactionItem[] = cart.items.map((it) => ({
    productId: it.product.id,
    productName: it.product.name,
    sku: it.product.sku,
    qty: it.qty,
    unit: it.product.unit,
    price: it.product.sellingPrice,
    costPrice: it.product.costPrice,
    subtotal: it.qty * it.product.sellingPrice,
  }));

  try {
    const { transaction: tx } = await commitTransaction(items, {
      paymentMethod: 'CASH',
      payAmount: payAmount.value,
      changeAmount: changeAmount.value,
    });

    lastReceipt.value = {
      storeName: storeSettings.settings.storeName,
      address: storeSettings.settings.address,
      phone: displayPhone.value,
      invoiceNo: tx.invoiceNo,
      date: formatDate(tx.timestamp),
      cashier: 'Kasir',
      items: items.map((i) => ({
        name: i.productName,
        qty: i.qty,
        unit: i.unit,
        price: i.price,
        subtotal: i.subtotal,
      })),
      total: finalAmount.value,
      pay: payAmount.value,
      change: changeAmount.value,
      paymentMethod: 'CASH',
    };

    cart.clearCart();
    showPaymentModal.value = false;
    showReceiptModal.value = true;
    toast.success(`Transaksi ${tx.invoiceNo} tersimpan!`);
    await loadProducts();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Gagal menyimpan transaksi.');
  }
}

function printReceipt() {
  if (!lastReceipt.value) return;
  printer
    .printReceipt({
      storeName: storeSettings.settings.storeName,
      address: storeSettings.settings.address,
      phone: displayPhone.value,
      invoiceNo: lastReceipt.value.invoiceNo,
      date: lastReceipt.value.date,
      cashier: 'Kasir',
      items: lastReceipt.value.items.map((i) => ({
        name: i.name,
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
          :class="getCategoryCardColor(p)"
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
              Rp {{ formatPrice(p.sellingPrice) }} / {{ p.unit }}
            </p>
          </div>

          <div class="mt-3 flex gap-1.5">
            <button
              :disabled="p.stock <= 0"
              @click="cart.addToCart(p, p.step ?? 1, false)"
              class="neo-press border-ink bg-white text-ink shadow-hard-xs flex flex-1 items-center justify-center rounded-xl border-2 py-1.5 text-xs font-extrabold disabled:opacity-40"
            >
              +1 {{ p.unit }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Right: Desktop Sidebar Cart -->
    <aside class="hidden lg:col-span-5 lg:block">
      <div class="border-ink bg-surface shadow-hard-md sticky top-4 rounded-2xl border-2 p-4">
        <KasirCartSidebar @checkout="openPayment" />
      </div>
    </aside>

    <!-- Floating Action Button for Mobile -->
    <div
      v-if="cart.items.length > 0"
      class="fixed bottom-4 left-4 right-4 z-40 lg:hidden"
    >
      <button
        @click="showMobileCart = true"
        class="neo-press border-ink bg-brand text-ink shadow-hard-lg flex w-full items-center justify-between rounded-2xl border-2 p-4 font-extrabold"
      >
        <div class="flex items-center gap-2">
          <ShoppingCart class="h-5 w-5" />
          <span>{{ cart.totalItems }} Item</span>
        </div>
        <div>Rp {{ formatPrice(cart.subtotal) }}</div>
      </button>
    </div>

    <!-- Mobile Drawer Cart -->
    <div
      v-if="showMobileCart"
      class="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-xs lg:hidden"
    >
      <div class="border-ink bg-surface shadow-hard-xl w-full rounded-t-3xl border-t-2 p-4">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-base font-extrabold">Keranjang</h3>
          <button @click="showMobileCart = false" class="neo-press border-ink rounded-lg border p-1">
            <X class="h-4 w-4" />
          </button>
        </div>
        <KasirCartSidebar is-mobile-drawer @checkout="openPayment" />
      </div>
    </div>

    <!-- Modals -->
    <PaymentModal
      :open="showPaymentModal"
      :final-amount="finalAmount"
      :pay-amount="payAmount"
      :change-amount="changeAmount"
      :preset-amounts="presetAmounts"
      :can-submit="payAmount >= finalAmount"
      @update:pay-amount="payAmount = $event"
      @close="showPaymentModal = false"
      @process="processPayment"
    />

    <ReceiptModal
      :open="showReceiptModal"
      :receipt="lastReceipt"
      :phone="displayPhone"
      @close="showReceiptModal = false"
      @reprint="printReceipt"
    />

    <BarcodeScannerModal
      :open="showScannerModal"
      @close="showScannerModal = false"
      @scan="handleBarcodeScanned"
    />
  </div>
</template>

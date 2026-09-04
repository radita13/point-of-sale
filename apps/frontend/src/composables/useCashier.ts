import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { toast } from 'vue-sonner';
import type { Product, TransactionItem, ReceiptData } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { useCartStore, lineSubtotal, splitPieces, round6 } from '@/stores/cart';
import { commitTransaction } from '@/services/transactions';
import { useBluetoothPrinter } from '@/composables/useBluetoothPrinter';
import { useSyncStore } from '@/stores/sync';
import { useStoreSettingsStore } from '@/stores/storeSettings';
import { useAuthStore } from '@/stores';

export function useCashier() {
  const cart = useCartStore();
  const printer = useBluetoothPrinter();
  const sync = useSyncStore();
  const auth = useAuthStore();
  const storeSettings = useStoreSettingsStore();

  const displayPhone = computed(() => {
    return storeSettings.settings.phone?.trim() || auth.userMetadata?.phone?.trim() || '';
  });

  const products = ref<Product[]>([]);
  const isLoadingProducts = ref(true);
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

  let unsubscribeProducts: (() => void) | undefined;

  async function loadProducts(isInitial = false) {
    try {
      const startTime = Date.now();
      const data = (await db.products.toArray()).filter((p) => !p.isDeleted);
      if (isInitial) {
        const elapsed = Date.now() - startTime;
        const minDisplayTime = 500;
        if (elapsed < minDisplayTime) {
          await new Promise((resolve) => setTimeout(resolve, minDisplayTime - elapsed));
        }
      }
      products.value = data;
    } finally {
      isLoadingProducts.value = false;
    }
  }

  onMounted(() => {
    window.addEventListener('resize', handleResize);
    unsubscribeProducts = sync.onProductsUpdated(() => {
      loadProducts(false);
    });
    loadProducts(true);
    if (navigator.onLine) {
      db.products.count().then((count) => {
        if (count === 0) {
          sync.restoreProductsFromServer().then((restored) => {
            if (restored > 0) loadProducts(false);
          });
        }
      });
    }
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    document.body.style.overflow = '';
    if (unsubscribeProducts) unsubscribeProducts();
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

  const showReceipt = ref(false);
  const lastReceiptData = ref<ReceiptData | null>(null);

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
      const activeCashier = storeSettings.settings.cashierName?.trim() || 'Kasir';
      const { transaction } = await commitTransaction(items, {
        paymentMethod: 'CASH',
        payAmount: payAmount.value,
        changeAmount: payAmount.value - finalAmount.value,
        cashierName: activeCashier,
      });

      lastReceiptData.value = {
        storeName: storeSettings.settings.storeName,
        address: storeSettings.settings.address,
        phone: displayPhone.value,
        invoiceNo: transaction.invoiceNo,
        date: new Date(transaction.timestamp).toLocaleString('id-ID'),
        cashier: transaction.cashierName || activeCashier,
        items: transaction.items.map((i) => ({
          name: i.productName,
          qty: i.qty,
          unit: i.unit,
          price: i.price,
          subtotal: i.subtotal,
        })),
        total: transaction.finalAmount,
        pay: transaction.payAmount,
        change: transaction.changeAmount,
        paymentMethod: transaction.paymentMethod,
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

  function printNow() {
    if (!lastReceiptData.value) return;
    if (!printer.isConnected.value) {
      toast.info('Hubungkan printer Bluetooth dulu, atau tutup preview struk.');
      return;
    }
    printer
      .printReceipt(lastReceiptData.value)
      .then(() => toast.success('Struk dikirim ke printer Bluetooth.'))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Gagal cetak.'));
  }

  async function connectPrinter() {
    try {
      const name = await printer.connect();
      if (name) {
        toast.success(`Printer terhubung: ${name}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghubungkan printer.');
    }
  }

  function normalizeCode(str: string): string {
    return str
      .trim()
      .toLowerCase()
      .replace(/^0+/, '')
      .replace(/[^a-z0-9]/g, '');
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
    } else {
      toast.error(`Produk dengan SKU/Barcode "${skuText}" tidak ditemukan.`);
    }
  }

  return {
    cart,
    printer,
    products,
    isLoadingProducts,
    searchQuery,
    selectedCategory,
    filteredProducts,
    showMobileCart,
    showScannerModal,
    showReceipt,
    lastReceiptData,
    payAmount,
    finalAmount,
    qtyStep,
    updatePackQty,
    updatePieceQty,
    addToCart,
    processPayment,
    printNow,
    connectPrinter,
    handleBarcodeScanned,
  };
}

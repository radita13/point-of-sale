import { computed, onMounted, ref, watch } from 'vue';
import type { Product, Transaction, ReceiptData } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { useSyncStore } from '@/stores/sync';
import { useStoreSettingsStore } from '@/stores/storeSettings';
import { useAuthStore } from '@/stores/auth';
import { useBluetoothPrinter } from '@/composables/useBluetoothPrinter';
import { useReportMetrics, type ReportFilter } from '@/composables/useReportMetrics';

export function useReport() {
  const reportFilter = ref<ReportFilter>('today');
  const transactions = ref<Transaction[]>([]);
  const products = ref<Product[]>([]);
  const isLoading = ref(true);
  const restoring = ref(false);
  const restoreError = ref<string | null>(null);
  const pageSize = 5;
  const sync = useSyncStore();
  const storeSettings = useStoreSettingsStore();
  const auth = useAuthStore();
  const printer = useBluetoothPrinter();

  const showReceiptModal = ref(false);
  const selectedReceiptData = ref<ReceiptData | null>(null);

  const displayPhone = computed(() => {
    return storeSettings.settings.phone?.trim() || auth.userMetadata?.phone?.trim() || '';
  });

  function openReceiptModal(tx: Transaction) {
    selectedReceiptData.value = {
      storeName: storeSettings.settings.storeName,
      address: storeSettings.settings.address,
      phone: displayPhone.value,
      invoiceNo: tx.invoiceNo,
      date: new Date(tx.timestamp).toLocaleString('id-ID'),
      cashier: tx.cashierName || storeSettings.settings.cashierName || 'Kasir',
      items: tx.items.map((i) => ({
        name: i.productName,
        qty: i.qty,
        unit: i.unit,
        price: i.price,
        subtotal: i.subtotal,
      })),
      total: tx.finalAmount,
      pay: tx.payAmount,
      change: tx.changeAmount,
      paymentMethod: tx.paymentMethod,
    };
    showReceiptModal.value = true;
  }

  async function printReceiptNow() {
    if (!selectedReceiptData.value) return;
    try {
      await printer.printReceipt(selectedReceiptData.value);
    } catch (err) {
      console.warn('Gagal cetak struk via bluetooth:', err);
    }
  }

  const {
    currentPage,
    totalPages,
    topProductsPage,
    totalTopProductsPages,
    filteredTransactions,
    paginatedTransactions,
    reportMetrics,
    productSalesSummary,
    paginatedTopProducts,
  } = useReportMetrics(transactions, products, reportFilter, pageSize, 10);

  async function load() {
    const [txs, prods] = await Promise.all([
      db.transactions.orderBy('timestamp').reverse().toArray(),
      db.products.toArray(),
    ]);
    transactions.value = txs;
    products.value = prods;
    currentPage.value = 1;
  }

  watch(reportFilter, () => {
    isLoading.value = true;
    setTimeout(() => {
      isLoading.value = false;
    }, 500);
  });

  onMounted(async () => {
    if (navigator.onLine) {
      restoring.value = true;
      restoreError.value = null;
      try {
        const n = await sync.restoreTransactionsFromServer();
        if (n > 0) await load();
      } finally {
        restoring.value = false;
      }
      if (sync.lastError) restoreError.value = sync.lastError;
    }
    await load();
    isLoading.value = false;
  });

  return {
    reportFilter,
    transactions,
    products,
    isLoading,
    restoring,
    restoreError,
    pageSize,
    sync,
    storeSettings,
    auth,
    printer,
    showReceiptModal,
    selectedReceiptData,
    displayPhone,
    openReceiptModal,
    printReceiptNow,
    currentPage,
    totalPages,
    topProductsPage,
    totalTopProductsPages,
    filteredTransactions,
    paginatedTransactions,
    reportMetrics,
    productSalesSummary,
    paginatedTopProducts,
  };
}

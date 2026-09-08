import { ref, computed, watch, type Ref } from 'vue';
import type { Product, Transaction, TransactionItem } from '@point-of-sale/shared';

export type ReportFilter = 'today' | 'week' | 'month' | 'all';

export function useReportMetrics(
  transactions: Ref<Transaction[]>,
  products: Ref<Product[]>,
  reportFilter: Ref<ReportFilter>,
  pageSize = 10,
  topProductsPageSize = 5
) {
  const currentPage = ref(1);
  const topProductsPage = ref(1);

  watch(reportFilter, () => {
    currentPage.value = 1;
    topProductsPage.value = 1;
  });

  function inPeriod(ts: number): boolean {
    const d = new Date(ts);
    const now = new Date();
    switch (reportFilter.value) {
      case 'today':
        return d.toDateString() === now.toDateString();
      case 'week':
        return (now.getTime() - d.getTime()) / (1000 * 3600 * 24) <= 7;
      case 'month':
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      case 'all':
        return true;
    }
  }

  const filteredTransactions = computed(() =>
    transactions.value.filter((tx) => inPeriod(tx.timestamp))
  );

  const totalPages = computed(() => Math.ceil(filteredTransactions.value.length / pageSize) || 1);

  const paginatedTransactions = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    return filteredTransactions.value.slice(start, start + pageSize);
  });

  const costByProduct = computed(() => {
    const map = new Map<string, number>();
    for (const p of products.value) map.set(p.id, p.costPrice);
    return map;
  });

  function itemCost(item: TransactionItem): number {
    if (typeof item.costPrice === 'number' && item.costPrice > 0) {
      return item.costPrice;
    }
    return costByProduct.value.get(item.productId) ?? 0;
  }

  const reportMetrics = computed(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    for (const tx of filteredTransactions.value) {
      totalRevenue += tx.finalAmount || 0;
      for (const it of tx.items) totalCost += itemCost(it) * it.qty;
    }
    const count = filteredTransactions.value.length;
    return {
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      count,
      averageTicket: count > 0 ? Math.round(totalRevenue / count) : 0,
    };
  });

  const productSalesSummary = computed(() => {
    const map = new Map<
      string,
      { name: string; totalQty: number; totalSales: number; totalProfit: number; unit: string }
    >();
    for (const tx of filteredTransactions.value) {
      for (const it of tx.items) {
        const key = (it.sku?.trim() || it.productName).toLowerCase().trim();
        const cur = map.get(key) ?? {
          name: it.productName,
          totalQty: 0,
          totalSales: 0,
          totalProfit: 0,
          unit: it.unit,
        };
        const cost = itemCost(it);
        cur.totalQty += it.qty;
        cur.totalSales += it.subtotal;
        cur.totalProfit += it.subtotal - cost * it.qty;
        map.set(key, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales);
  });

  const totalTopProductsPages = computed(
    () => Math.ceil(productSalesSummary.value.length / topProductsPageSize) || 1
  );

  const paginatedTopProducts = computed(() => {
    const start = (topProductsPage.value - 1) * topProductsPageSize;
    return productSalesSummary.value.slice(start, start + topProductsPageSize);
  });

  return {
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

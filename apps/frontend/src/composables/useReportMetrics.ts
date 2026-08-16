import { ref, computed, watch, type Ref } from 'vue';
import type { Product, Transaction, TransactionItem } from '@point-of-sale/shared';

export type ReportFilter = 'today' | 'week' | 'month' | 'all';

export function useReportMetrics(
  transactions: Ref<Transaction[]>,
  products: Ref<Product[]>,
  reportFilter: Ref<ReportFilter>,
  pageSize = 10
) {
  const currentPage = ref(1);

  watch(reportFilter, () => {
    currentPage.value = 1;
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
    if (typeof item.costPrice === 'number') return item.costPrice;
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
      netProfit: totalRevenue - totalCost,
      count,
      avgTransaction: count > 0 ? Math.round(totalRevenue / count) : 0,
    };
  });

  const topProducts = computed(() => {
    const map = new Map<
      string,
      { name: string; qty: number; revenue: number; unit: string }
    >();
    for (const tx of filteredTransactions.value) {
      for (const it of tx.items) {
        const cur = map.get(it.productId) ?? {
          name: it.productName,
          qty: 0,
          revenue: 0,
          unit: it.unit,
        };
        cur.qty += it.qty;
        cur.revenue += it.subtotal;
        map.set(it.productId, cur);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  });

  return {
    currentPage,
    totalPages,
    filteredTransactions,
    paginatedTransactions,
    reportMetrics,
    topProducts,
  };
}

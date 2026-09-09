import { prisma } from "../db.js";

export interface InventoryStatusResult {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockItems: Array<{
    name: string;
    sku: string;
    category: string;
    stock: number;
    minStock: number;
    unit: string;
    sellingPrice: number;
  }>;
}

export interface FinancialSummaryResult {
  period: string;
  transactionCount: number;
  totalRevenue: number;
  estimatedHpp: number;
  estimatedGrossProfit: number;
  grossMarginPercent: number;
  averageTransactionValue: number;
}

export interface ProductMovementResult {
  topSelling: Array<{
    name: string;
    sku: string;
    category: string;
    totalQtySold: number;
    unit?: string;
    totalRevenue: number;
  }>;
  slowMoving: Array<{
    name: string;
    sku: string;
    category: string;
    currentStock: number;
    unit: string;
    sellingPrice: number;
  }>;
}

export interface StoreProfileResult {
  storeName: string;
  ownerName?: string;
  totalSku: number;
}

export async function getInventoryStatus(
  storeId: string,
): Promise<InventoryStatusResult> {
  const products = await prisma.product.findMany({
    where: { storeId, isDeleted: false },
    select: {
      name: true,
      sku: true,
      category: true,
      stock: true,
      minStock: true,
      unit: true,
      sellingPrice: true,
    },
    orderBy: { stock: "asc" },
  });

  const totalProducts = products.length;
  const lowStock = products.filter((p) => p.stock <= p.minStock && p.stock > 0);
  const outOfStock = products.filter((p) => p.stock <= 0);

  return {
    totalProducts,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    lowStockItems: [...outOfStock, ...lowStock].slice(0, 10).map((p) => ({
      name: p.name,
      sku: p.sku,
      category: p.category,
      stock: p.stock,
      minStock: p.minStock,
      unit: p.unit,
      sellingPrice: p.sellingPrice.toNumber(),
    })),
  };
}

export async function getFinancialSummary(
  storeId: string,
  period:
    | "today"
    | "yesterday"
    | "week"
    | "last_7_days"
    | "month"
    | "last_30_days"
    | "all" = "today",
): Promise<FinancialSummaryResult> {
  const now = new Date();
  let startDate: Date;
  let endDate: Date | undefined;

  switch (period) {
    case "yesterday": {
      const start = new Date(now);
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      startDate = start;
      endDate = end;
      break;
    }
    case "week":
    case "last_7_days": {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case "month": {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    }
    case "last_30_days": {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case "all": {
      startDate = new Date(0);
      break;
    }
    case "today":
    default: {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
  }

  const timestampFilter: { gte: Date; lte?: Date } = { gte: startDate };
  if (endDate) {
    timestampFilter.lte = endDate;
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      storeId,
      timestamp: timestampFilter,
    },
    include: {
      items: {
        select: {
          qty: true,
          price: true,
          costPrice: true,
          subtotal: true,
        },
      },
    },
  });

  const transactionCount = transactions.length;
  let totalRevenue = 0;
  let estimatedHpp = 0;

  for (const t of transactions) {
    totalRevenue += t.finalAmount.toNumber();
    for (const item of t.items) {
      const hppUnit = item.costPrice ? item.costPrice.toNumber() : 0;
      estimatedHpp += hppUnit * item.qty;
    }
  }

  const estimatedGrossProfit = totalRevenue - estimatedHpp;
  const grossMarginPercent =
    totalRevenue > 0
      ? Math.round((estimatedGrossProfit / totalRevenue) * 100)
      : 0;
  const averageTransactionValue =
    transactionCount > 0 ? Math.round(totalRevenue / transactionCount) : 0;

  return {
    period,
    transactionCount,
    totalRevenue: Math.round(totalRevenue),
    estimatedHpp: Math.round(estimatedHpp),
    estimatedGrossProfit: Math.round(estimatedGrossProfit),
    grossMarginPercent,
    averageTransactionValue,
  };
}

export async function getProductMovement(
  storeId: string,
  limit = 10,
  period: "today" | "yesterday" | "week" | "last_7_days" | "month" | "last_30_days" | "all" = "all",
): Promise<ProductMovementResult> {
  const now = new Date();
  let startDate: Date;
  let endDate: Date | undefined;

  switch (period) {
    case "today": {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case "yesterday": {
      const start = new Date(now);
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      startDate = start;
      endDate = end;
      break;
    }
    case "week":
    case "last_7_days": {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case "month": {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    }
    case "last_30_days": {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case "all":
    default: {
      startDate = new Date(0);
      break;
    }
  }

  const timestampFilter: { gte: Date; lte?: Date } = { gte: startDate };
  if (endDate) {
    timestampFilter.lte = endDate;
  }

  const items = await prisma.transactionItem.findMany({
    where: {
      transaction: {
        storeId,
        timestamp: timestampFilter,
      },
    },
    select: {
      productId: true,
      productName: true,
      sku: true,
      qty: true,
      unit: true,
      subtotal: true,
    },
  });

  const salesMap = new Map<
    string,
    { name: string; sku: string; qty: number; unit: string; revenue: number }
  >();

  for (const it of items) {
    const prev = salesMap.get(it.productId) ?? {
      name: it.productName,
      sku: it.sku ?? "-",
      qty: 0,
      unit: it.unit ?? "pcs",
      revenue: 0,
    };
    prev.qty += it.qty;
    prev.revenue += it.subtotal.toNumber();
    salesMap.set(it.productId, prev);
  }

  const topSelling = Array.from(salesMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit)
    .map((item) => ({
      name: item.name,
      sku: item.sku,
      category: "-",
      totalQtySold: Math.round(item.qty * 100) / 100,
      unit: item.unit,
      totalRevenue: Math.round(item.revenue),
    }));

  const allActiveProducts = await prisma.product.findMany({
    where: { storeId, isDeleted: false, stock: { gt: 0 } },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      stock: true,
      unit: true,
      sellingPrice: true,
    },
  });

  const soldProductIds = new Set(items.map((it) => it.productId));
  const slowMoving = allActiveProducts
    .filter((p) => !soldProductIds.has(p.id))
    .slice(0, limit)
    .map((p) => ({
      name: p.name,
      sku: p.sku,
      category: p.category,
      currentStock: p.stock,
      unit: p.unit,
      sellingPrice: p.sellingPrice.toNumber(),
    }));

  return {
    topSelling,
    slowMoving,
  };
}

export async function getStoreProfile(
  storeId: string,
  ownerName?: string,
): Promise<StoreProfileResult> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { name: true },
  });
  const totalSku = await prisma.product.count({
    where: { storeId, isDeleted: false },
  });

  return {
    storeName: store?.name ?? "Toko Warung",
    ownerName: ownerName || undefined,
    totalSku,
  };
}

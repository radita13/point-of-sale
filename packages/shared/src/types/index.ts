/**
 * Shared domain types FE <-> BE
 */

export type Unit = "kg" | "pcs" | "liter" | "pak" | "saset" | "bat";

export type PaymentMethod = "CASH";

export type SyncStatus =
  | "Draft"
  | "CommittedLocal"
  | "QueuedForSync"
  | "Syncing"
  | "Synced";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: Unit;
  step?: number;
  piecesPerUnit?: number;
  smallUnit?: Unit;
  smallPrice?: number;
  image?: string;
  isSynced?: boolean;
  isDeleted?: boolean;
  updatedAt: number;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  sku?: string;
  qty: number;
  unit: Unit;
  price: number;
  subtotal: number;
  costPrice?: number;
}

export interface Transaction {
  id: string;
  invoiceNo: string;
  timestamp: number;
  cashierName?: string;
  items: TransactionItem[];
  totalAmount: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  payAmount: number;
  changeAmount: number;
  isSynced: boolean;
  syncError?: string;
}

export interface SyncPayload {
  storeId?: string;
  transactions: Transaction[];
}

export interface ProductSyncPayload {
  storeId?: string;
  products: Product[];
}

export interface ProductSyncResult {
  id: string;
  image: string | null;
}

export interface SyncStatusResult {
  id: string;
  isSynced: boolean;
  syncedAt?: number | null;
}

export interface InventoryAdjustment {
  id: string;
  productId: string;
  quantity: number;
  note?: string;
  adjustedAt: number;
}

export interface InventoryAdjustmentsPayload {
  storeId?: string;
  adjustments: InventoryAdjustment[];
}

export interface GetProductsQuery {
  storeId?: string;
  page?: number;
  limit?: number;
  since?: number;
}

export interface GetTransactionsQuery {
  storeId?: string;
  page?: number;
  limit?: number;
}

export interface GetLowStockQuery {
  storeId?: string;
}

export interface SyncStatusQuery {
  ids: string[];
  storeId?: string;
}

export interface UpdateStorePayload {
  name: string;
}

export interface ReceiptLine {
  name: string;
  qty: number;
  unit: string;
  price: number;
  subtotal: number;
}

export interface ReceiptData {
  storeName: string;
  address: string;
  phone: string;
  invoiceNo: string;
  date: string;
  cashier: string;
  items: ReceiptLine[];
  total: number;
  pay: number;
  change: number;
  paymentMethod: string;
}

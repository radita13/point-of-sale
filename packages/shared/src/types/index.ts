/**
 * Shared domain types FE <-> BE (PRD §9, §7.3).
 * Mirrors IndexedDB schema (PRD §9.2) plus server extras.
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
  storeId: string;
  transactions: Transaction[];
}

export interface ProductSyncPayload {
  storeId: string;
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

/**
 * Shared domain types FE <-> BE (PRD §9, §7.3).
 * Mirrors IndexedDB schema (PRD §9.2) plus server extras.
 */

export type Unit = 'kg' | 'pcs' | 'liter' | 'pak' | 'saset';

// V1 hanya tunai (CASH); QRIS di-hold ke V2.
export type PaymentMethod = 'CASH';

/**
 * Sync state machine (PRD §7.3).
 * - Draft -> CommittedLocal -> QueuedForSync -> Syncing -> Synced
 */
export type SyncStatus =
  | 'Draft'
  | 'CommittedLocal'
  | 'QueuedForSync'
  | 'Syncing'
  | 'Synced';

export interface Product {
  /** local UUID v4 (FE), server_id on server */
  id: string;
  /** SKU otomatis (FE generate saat tambah barang) */
  sku: string;
  name: string;
  category: string;
  /** HPP / modal */
  costPrice: number;
  sellingPrice: number;
  /** decimal quantities supported (e.g. 0.25) */
  stock: number;
  minStock: number;
  unit: Unit;
  /** optional product photo (URL or data URL — diunggah saat sync) */
  image?: string;
  /** false sampai berhasil tersinkron ke server (offline-first) */
  isSynced?: boolean;
  /** true bila produk dihapus secara lokal dan perlu disinkronkan ke server */
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
  /** sellingPrice * qty */
  subtotal: number;
  /** HPP/modal per satuan saat transaksi dicatat (snapshot utk laporan laba kotor) */
  costPrice?: number;
}

export interface Transaction {
  /** local UUID v4 — sync endpoint is idempotent on this id */
  id: string;
  /** e.g. INV-20260802-0001 */
  invoiceNo: string;
  timestamp: number;
  items: TransactionItem[];
  totalAmount: number;
  /** tanpa diskon (fitur diskon di-hold V1) */
  finalAmount: number;
  paymentMethod: PaymentMethod;
  payAmount: number;
  changeAmount: number;
  isSynced: boolean;
}

/** Integrity payload sent to POST /api/v1/transactions/sync */
export interface SyncPayload {
  storeId: string;
  transactions: Transaction[];
}

/** Integrity payload sent to POST /api/v1/products/sync (offline-first katalog) */
export interface ProductSyncPayload {
  storeId: string;
  products: Product[];
}

export interface ProductSyncResult {
  id: string;
  /** URL publik foto di server setelah upload (null bila tanpa foto / upload gagal) */
  image: string | null;
}

export interface SyncStatusResult {
  id: string;
  isSynced: boolean;
  syncedAt?: number | null;
}

/** Inventory stock adjustment (operational opname), FR-INV-03 */
export interface InventoryAdjustment {
  id: string;
  productId: string;
  /** new physical stock after adjustment */
  quantity: number;
  note?: string;
  adjustedAt: number;
}
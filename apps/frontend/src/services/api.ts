import type { InventoryAdjustment, Product, ProductSyncPayload, ProductSyncResult, SyncPayload, SyncStatusResult, Transaction } from '@point-of-sale/shared';
import { currentAccessToken } from './supabase';

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000/api/v1';

// StoreId default = seed tetap di backend (apps/backend/prisma/seed.ts),
// bisa dioverride via VITE_STORE_ID di .env.
export function getStoreId(): string {
  return (import.meta.env.VITE_STORE_ID as string | undefined) ??
    '11111111-1111-4111-8111-111111111111';
}

interface ApiOptions {
  token?: string | null;
  signal?: AbortSignal;
}

async function request<T>(path: string, init: RequestInit & ApiOptions = {}): Promise<T> {
  const token = init.token ?? (await currentAccessToken());
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseURL}${path}`, {
    ...init,
    headers,
    signal: init.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return (await res.json()) as T;
}

export const api = {
  getProducts(storeId: string): Promise<Product[]> {
    return request<Product[]>(`/products?storeId=${storeId}`);
  },

  /** Idempotent sync batch — server ignores/exposes by local id. Server dapat
   * membetulkan nomor invoice yang bentrok (key di `invoiceNoMap`). */
  syncTransactions(
    payload: SyncPayload,
    opts: ApiOptions = {},
  ): Promise<{ synced: string[]; skipped?: string[]; failed?: string[]; invoiceNoMap?: Record<string, string> }> {
    return request<{ synced: string[]; skipped?: string[]; failed?: string[]; invoiceNoMap?: Record<string, string> }>(
      '/transactions/sync',
      {
        method: 'POST',
        body: JSON.stringify({ ...payload, storeId: getStoreId() }),
        ...opts,
      },
    );
  },

  syncStatus(ids: string[]): Promise<SyncStatusResult[]> {
    return request<SyncStatusResult[]>(`/transactions/sync-status?storeId=${getStoreId()}&ids=${ids.join(',')}`);
  },

  /** Tarik riwayat transaksi dari server (pemulihan setelah clear data / ganti HP). */
  async getTransactions(storeId: string, page = 1, limit = 10): Promise<Transaction[]> {
    const res = await request<{ data: Transaction[] } | Transaction[]>(`/transactions?storeId=${storeId}&page=${page}&limit=${limit}`);
    return Array.isArray(res) ? res : res.data;
  },

  /** Idempotent sync katalog (produk baru/edit + foto). Foto data:... diupload
   * server ke Supabase Storage; hasilnya URL publik. */
  syncProducts(payload: ProductSyncPayload): Promise<{ synced: ProductSyncResult[] }> {
    return request<{ synced: ProductSyncResult[] }>('/products/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getLowStock(): Promise<Product[]> {
    return request<Product[]>(`/inventory/low-stock?storeId=${getStoreId()}`);
  },

  postAdjustments(adjustments: InventoryAdjustment[]): Promise<void> {
    return request<void>('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify({ storeId: getStoreId(), adjustments }),
    });
  },
};
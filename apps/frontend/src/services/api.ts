import type {
  InventoryAdjustment,
  Product,
  ProductSyncPayload,
  ProductSyncResult,
  SyncPayload,
  SyncStatusResult,
  Transaction,
} from '@point-of-sale/shared';
import { currentAccessToken } from './supabase';

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

let dynamicStoreId: string | null = null;

export function setStoreId(id: string) {
  dynamicStoreId = id;
}

export function getStoreId(): string | undefined {
  return dynamicStoreId || (import.meta.env.VITE_STORE_ID as string | undefined) || undefined;
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

  try {
    const res = await fetch(`${baseURL}${path}`, {
      ...init,
      headers,
      signal: init.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      if (res.status === 401) {
        console.warn('[API Interceptor] Sesi token kedaluwarsa atau tidak valid (HTTP 401).');
      }
      throw new Error(`API ${res.status}: ${detail}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      try {
        const { useNetworkStore } = await import('@/stores');
        useNetworkStore().setOnline(false);
      } catch {}
    }
    throw error;
  }
}

export const api = {
  async getProducts(
    storeId?: string,
    page?: number,
    limit?: number,
    since?: number
  ): Promise<Product[]> {
    const sid = storeId || getStoreId();
    let url = `/products`;
    const params = new URLSearchParams();
    if (sid) params.append('storeId', sid);
    if (page !== undefined) params.append('page', String(page));
    if (limit !== undefined) params.append('limit', String(limit));
    if (since !== undefined) params.append('since', String(since));

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const res = await request<{ data: Product[] } | Product[]>(url);
    return Array.isArray(res) ? res : res.data;
  },

  syncTransactions(
    payload: SyncPayload,
    opts: ApiOptions = {}
  ): Promise<{
    synced: string[];
    skipped?: string[];
    failed?: string[];
    invoiceNoMap?: Record<string, string>;
  }> {
    const sid = getStoreId();
    const bodyPayload = sid ? { ...payload, storeId: sid } : payload;
    return request<{
      synced: string[];
      skipped?: string[];
      failed?: string[];
      invoiceNoMap?: Record<string, string>;
    }>('/transactions/sync', {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
      ...opts,
    });
  },

  syncStatus(ids: string[]): Promise<SyncStatusResult[]> {
    const sid = getStoreId();
    let url = `/transactions/sync-status?ids=${ids.join(',')}`;
    if (sid) url += `&storeId=${sid}`;
    return request<SyncStatusResult[]>(url);
  },

  async getTransactions(storeId?: string, page = 1, limit = 10): Promise<Transaction[]> {
    const sid = storeId || getStoreId();
    let url = `/transactions?page=${page}&limit=${limit}`;
    if (sid) url += `&storeId=${sid}`;
    const res = await request<{ data: Transaction[] } | Transaction[]>(url);
    return Array.isArray(res) ? res : res.data;
  },

  syncProducts(payload: ProductSyncPayload): Promise<{ synced: ProductSyncResult[] }> {
    const sid = getStoreId();
    const bodyPayload = sid && !payload.storeId ? { ...payload, storeId: sid } : payload;
    return request<{ synced: ProductSyncResult[] }>('/products/sync', {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
    });
  },

  getLowStock(): Promise<Product[]> {
    const sid = getStoreId();
    const url = sid ? `/inventory/low-stock?storeId=${sid}` : '/inventory/low-stock';
    return request<Product[]>(url);
  },

  postAdjustments(adjustments: InventoryAdjustment[]): Promise<void> {
    const sid = getStoreId();
    const bodyPayload = sid ? { storeId: sid, adjustments } : { adjustments };
    return request<void>('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
    });
  },

  getMyStore(): Promise<{ store: { id: string; name: string } }> {
    return request<{ store: { id: string; name: string } }>('/stores/me');
  },
};

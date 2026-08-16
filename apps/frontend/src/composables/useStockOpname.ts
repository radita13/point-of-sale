import { ref, computed, watch, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import type { InventoryAdjustment, Product } from '@point-of-sale/shared';
import { inventoryAdjustmentSchema } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { makeUuid } from '@/lib/utils';
import { api } from '@/services/api';
import { useSyncStore } from '@/stores/sync';

export function useStockOpname() {
  const sync = useSyncStore();
  const products = ref<Product[]>([]);
  const changes = ref<Record<string, string>>({});

  const searchQuery = ref('');
  const selectedCategory = ref('Semua');
  const currentPage = ref(1);
  const pageSize = ref(12);

  async function refresh() {
    products.value = (await db.products.orderBy('name').toArray()).filter((p) => !p.isDeleted);
  }

  onMounted(refresh);

  function hasChange(id: string): boolean {
    const raw = changes.value[id]?.trim();
    if (raw === undefined || raw === '') return false;
    const num = Number(raw);
    const prod = products.value.find((p) => p.id === id);
    return !Number.isNaN(num) && prod !== undefined && num !== prod.stock;
  }

  const changedCount = computed(() => {
    return products.value.filter((p) => hasChange(p.id)).length;
  });

  const filteredProducts = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    return products.value.filter((p) => {
      const matchCat = selectedCategory.value === 'Semua' || p.category === selectedCategory.value;
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  });

  watch([searchQuery, selectedCategory, pageSize], () => {
    currentPage.value = 1;
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredProducts.value.length / pageSize.value) || 1;
  });

  const paginatedProducts = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredProducts.value.slice(start, start + pageSize.value);
  });

  function getStockDiff(p: Product): number | null {
    const raw = changes.value[p.id]?.trim();
    if (raw === undefined || raw === '') return null;
    const num = Number(raw);
    if (Number.isNaN(num) || num === p.stock) return null;
    return Math.round((num - p.stock) * 100) / 100;
  }

  async function saveOpname() {
    const adjustments: InventoryAdjustment[] = [];
    const now = Date.now();
    for (const p of products.value) {
      const raw = changes.value[p.id]?.trim();
      if (raw === undefined || raw === '') continue;
      const newStock = Number(raw);
      if (Number.isNaN(newStock) || newStock === p.stock) continue;
      adjustments.push({
        id: makeUuid(),
        productId: p.id,
        quantity: newStock,
        adjustedAt: now,
        note: 'stock opname',
      });
    }
    if (adjustments.length === 0) {
      toast.info('Tidak ada perubahan stok.');
      return;
    }

    for (const a of adjustments) {
      const parse = inventoryAdjustmentSchema.safeParse(a);
      if (!parse.success) {
        toast.error(
          'Koreksi stok tidak valid: ' + (parse.error.issues[0]?.message ?? 'Format salah')
        );
        return;
      }
    }

    await db.transaction('rw', db.products, async () => {
      for (const a of adjustments) {
        await db.products.update(a.productId, { stock: a.quantity, updatedAt: now, isSynced: false });
      }
    });

    if (navigator.onLine) {
      const [, pushed] = await Promise.allSettled([sync.runSync(), api.postAdjustments(adjustments)]);
      if (pushed.status === 'rejected') {
        toast.success(
          `${adjustments.length} koreksi stok tersinkron (produk), catatan audit tertunda.`
        );
      } else {
        toast.success(`${adjustments.length} koreksi stok tersinkron.`);
      }
    } else {
      toast.success(`${adjustments.length} koreksi stok tersimpan lokal (akan tersinkron saat online).`);
    }

    changes.value = {};
    await refresh();
  }

  return {
    products,
    changes,
    searchQuery,
    selectedCategory,
    currentPage,
    pageSize,
    changedCount,
    totalPages,
    paginatedProducts,
    hasChange,
    getStockDiff,
    saveOpname,
    refresh,
  };
}

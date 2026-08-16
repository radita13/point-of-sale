import { ref, onMounted } from 'vue';
import type { Product } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { useSyncStore } from '@/stores/sync';

export function useProductCatalog() {
  const products = ref<Product[]>([]);
  const loading = ref(false);
  const sync = useSyncStore();

  async function loadProducts() {
    loading.value = true;
    try {
      products.value = (await db.products.toArray()).filter((p) => !p.isDeleted);
    } finally {
      loading.value = false;
    }
  }

  async function initCatalog() {
    if (navigator.onLine && (await db.products.count()) === 0) {
      const restored = await sync.restoreProductsFromServer();
      if (restored > 0) {
        await loadProducts();
        return;
      }
    }
    await loadProducts();
  }

  function filterCatalog(searchQuery: string, selectedCategory: string) {
    const q = searchQuery.trim().toLowerCase();
    return products.value.filter((p) => {
      const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }

  onMounted(initCatalog);

  return {
    products,
    loading,
    loadProducts,
    initCatalog,
    filterCatalog,
  };
}

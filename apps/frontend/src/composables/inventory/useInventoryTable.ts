import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import { createProductColumns } from '@/components/inventaris/productColumns';
import { useInventory } from '@/composables/inventory/useInventory';
import type { Product } from '@point-of-sale/shared';

import {
  useVueTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  FlexRender,
  type SortingState,
  type PaginationState,
} from '@tanstack/vue-table';

export function useInventoryTable(inventory: ReturnType<typeof useInventory>) {
  const { products, form, openAdd, openEdit, askDelete, importCsv } = inventory;

  const fileInputRef = ref<HTMLInputElement | null>(null);
  const isImporting = ref(false);
  const route = useRoute();

  async function onCsvFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    isImporting.value = true;
    try {
      const { success, failed } = await importCsv(file);
      if (success > 0) {
        toast.success(
          `Berhasil mengimport ${success} produk!${failed > 0 ? ` (${failed} diabaikan / duplikat)` : ''}`
        );
      } else {
        toast.error(`Gagal mengimport produk (${failed} tidak valid atau duplikat)`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memproses file CSV');
    } finally {
      isImporting.value = false;
      input.value = '';
    }
  }

  const sorting = ref<SortingState>([]);
  const globalFilter = ref('');
  const pagination = ref<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const selectedCategory = ref('Semua');

  onMounted(() => {
    const addSku = route.query.addSku as string | undefined;
    if (addSku) {
      openAdd();
      form.sku = addSku.trim();
      toast.info(`Form barang baru dibuka dengan SKU: ${form.sku}`);
    }
  });

  const filteredData = computed(() => {
    if (selectedCategory.value === 'Semua') {
      return products.value;
    }
    return products.value.filter((p: Product) => p.category === selectedCategory.value);
  });

  watch([selectedCategory, globalFilter], () => {
    pagination.value.pageIndex = 0;
  });

  watch(filteredData, (newData) => {
    const maxPageIndex = Math.max(0, Math.ceil(newData.length / pagination.value.pageSize) - 1);
    if (pagination.value.pageIndex > maxPageIndex) {
      pagination.value.pageIndex = maxPageIndex;
    }
  });

  const columns = createProductColumns(openEdit, askDelete);

  const table = useVueTable({
    data: filteredData,
    columns,
    autoResetPageIndex: false,
    state: {
      get sorting() {
        return sorting.value;
      },
      get globalFilter() {
        return globalFilter.value;
      },
      get pagination() {
        return pagination.value;
      },
    },
    onSortingChange: (updaterOrValue) => {
      sorting.value =
        typeof updaterOrValue === 'function' ? updaterOrValue(sorting.value) : updaterOrValue;
    },
    onGlobalFilterChange: (updaterOrValue) => {
      globalFilter.value =
        typeof updaterOrValue === 'function' ? updaterOrValue(globalFilter.value) : updaterOrValue;
    },
    onPaginationChange: (updaterOrValue) => {
      pagination.value =
        typeof updaterOrValue === 'function' ? updaterOrValue(pagination.value) : updaterOrValue;
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return {
    table,
    globalFilter,
    selectedCategory,
    fileInputRef,
    isImporting,
    onCsvFileSelect,
    FlexRender,
  };
}

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  Package,
  ChevronLeft,
  ChevronRight,
  Search,
  FileUp,
  FileSpreadsheet,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import { useInventory } from '@/composables/useInventory';
import ProductFormModal from '@/components/inventaris/ProductFormModal.vue';
import DeleteConfirmModal from '@/components/inventaris/DeleteConfirmModal.vue';
import { createProductColumns } from '@/components/inventaris/productColumns';

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

const {
  products,
  showModal,
  isEdit,
  form,
  errors,
  deleteTarget,
  imageSizeKb,
  CATEGORIES,
  openAdd,
  openEdit,
  closeModal,
  regenerateSku,
  onImageFile,
  saveProduct,
  askDelete,
  executeDelete,
  importCsv,
  downloadCsvTemplate,
} = useInventory();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isImporting = ref(false);
const route = useRoute();

onMounted(() => {
  const addSku = route.query.addSku as string | undefined;
  if (addSku) {
    openAdd();
    form.sku = addSku.trim();
    toast.info(`Form barang baru dibuka dengan SKU: ${form.sku}`);
  }
});

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
const filteredData = computed(() => {
  if (selectedCategory.value === 'Semua') {
    return products.value;
  }
  return products.value.filter((p) => p.category === selectedCategory.value);
});

watch([selectedCategory, globalFilter], () => {
  pagination.value.pageIndex = 0;
});

const columns = createProductColumns(openEdit, askDelete);

const table = useVueTable({
  data: filteredData,
  columns,
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
</script>

<template>
  <div class="space-y-4">
    <div
      class="border-ink bg-surface shadow-hard-md flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 p-4"
    >
      <div class="flex items-center gap-3">
        <div
          class="border-ink bg-card-green shadow-hard-sm flex h-10 w-10 items-center justify-center rounded-xl border-2 text-white"
        >
          <Package class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-extrabold">Manajemen Inventaris Sembako</h2>
          <p class="text-xs font-semibold text-gray-600">
            Total Katalog: {{ products.length }} Barang (SKU)
          </p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <input
          ref="fileInputRef"
          type="file"
          accept=".csv"
          class="hidden"
          @change="onCsvFileSelect"
        />
        <Button
          variant="secondary"
          @click="downloadCsvTemplate"
          class="cursor-pointer text-xs"
          title="Unduh contoh file CSV untuk diisi"
        >
          <FileSpreadsheet class="h-4 w-4" />
          Template CSV
        </Button>
        <Button
          variant="secondary"
          :disabled="isImporting"
          @click="fileInputRef?.click()"
          class="cursor-pointer text-xs"
        >
          <FileUp class="h-4 w-4" />
          {{ isImporting ? 'Mengimport...' : 'Import CSV' }}
        </Button>
        <Button @click="openAdd" class="cursor-pointer text-xs">
          <Package class="h-4 w-4" />
          Tambah Barang Baru
        </Button>
      </div>
    </div>

    <Card>
      <div class="flex flex-col gap-3 p-4">
        <div class="relative">
          <Search class="text-ink/40 absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2" />
          <input
            v-model="globalFilter"
            type="text"
            placeholder="Cari nama barang atau SKU..."
            class="border-ink bg-canvas text-ink focus:ring-brand h-11 w-full rounded-xl border-2 pr-4 pl-11 text-sm font-bold focus:ring-2 focus:outline-none"
          />
        </div>
        <div class="neo-scroll flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            v-for="cat in ['Semua', ...CATEGORIES]"
            :key="cat"
            @click="selectedCategory = cat"
            :class="
              selectedCategory === cat
                ? 'bg-ink text-white'
                : 'bg-canvas text-ink hover:bg-gray-200'
            "
            class="neo-press border-ink cursor-pointer rounded-xl border px-3 py-1.5 text-[11px] font-extrabold whitespace-nowrap"
          >
            {{ cat }}
          </button>
        </div>
      </div>
    </Card>

    <Card class="overflow-hidden">
      <div class="neo-scroll overflow-x-auto">
        <table class="w-full border-collapse text-left text-xs font-bold">
          <thead
            class="border-ink bg-ink border-b-2 text-[11px] tracking-wider text-white uppercase"
          >
            <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <th
                v-for="header in headerGroup.headers"
                :key="header.id"
                class="p-3"
                :class="{ 'cursor-pointer select-none': header.column.getCanSort() }"
                @click="header.column.getToggleSortingHandler()?.($event)"
              >
                <FlexRender
                  v-if="!header.isPlaceholder"
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                />
                <span v-if="header.column.getIsSorted() === 'asc'"> 🔼</span>
                <span v-else-if="header.column.getIsSorted() === 'desc'"> 🔽</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-ink divide-y-2">
            <tr v-for="row in table.getRowModel().rows" :key="row.id" class="hover:bg-canvas">
              <td v-for="cell in row.getVisibleCells()" :key="cell.id" class="p-3">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </td>
            </tr>
            <tr v-if="table.getRowModel().rows.length === 0">
              <td colspan="8" class="p-4 text-center font-semibold text-gray-500">
                Tidak ada barang inventaris.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination controls -->
      <div
        v-if="table.getFilteredRowModel().rows.length > 0"
        class="border-ink bg-surface flex flex-wrap items-center justify-between gap-2 border-t-2 p-3 text-xs font-extrabold"
      >
        <div class="whitespace-nowrap text-gray-600">
          <span class="hidden sm:inline">Menampilkan </span>
          <span
            >{{
              table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
            }}-{{
              Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )
            }}</span
          >
          <span class="font-normal text-gray-400"> / </span>
          <span>{{ table.getFilteredRowModel().rows.length }}</span>
          <span class="hidden sm:inline"> barang</span>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1">
            <select
              :value="table.getState().pagination.pageSize"
              @change="
                (e: Event) => table.setPageSize(Number((e.target as HTMLSelectElement).value))
              "
              class="border-ink rounded-lg border-2 bg-white px-1.5 py-1 text-xs font-extrabold focus:outline-none"
              title="Baris per halaman"
            >
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </div>

          <div class="flex items-center gap-1">
            <Button
              variant="secondary"
              size="icon"
              :disabled="!table.getCanPreviousPage()"
              @click="table.previousPage()"
              class="h-8 w-8 cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <span class="px-1 text-[11px] whitespace-nowrap">
              {{ table.getState().pagination.pageIndex + 1 }}/{{ table.getPageCount() }}
            </span>
            <Button
              variant="secondary"
              size="icon"
              :disabled="!table.getCanNextPage()"
              @click="table.nextPage()"
              class="h-8 w-8 cursor-pointer disabled:opacity-40"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <!-- Add/Edit modal -->
    <ProductFormModal
      :open="showModal"
      :is-edit="isEdit"
      :form="form"
      :errors="errors"
      :image-size-kb="imageSizeKb"
      @close="closeModal"
      @save="saveProduct"
      @regenerate-sku="regenerateSku"
      @image-select="onImageFile"
    />

    <!-- Delete confirm modal -->
    <DeleteConfirmModal
      :open="!!deleteTarget"
      :target="deleteTarget"
      @close="deleteTarget = null"
      @confirm="executeDelete"
    />
  </div>
</template>

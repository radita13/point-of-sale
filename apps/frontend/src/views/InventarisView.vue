<script setup lang="ts">
import { ref, h, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  Package,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  FileUp,
  FileSpreadsheet,
  Camera,
} from 'lucide-vue-next';
import type { Product } from '@point-of-sale/shared';
import { toast } from 'vue-sonner';
import { formatPrice } from '@/lib/utils';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Select from '@/components/ui/Select.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import { useInventory } from '@/composables/useInventory';
import BarcodeScannerModal from '@/components/kasir/BarcodeScannerModal.vue';

import {
  useVueTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  FlexRender,
  createColumnHelper,
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
  UNITS,
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
const showFormScanner = ref(false);
const route = useRoute();

onMounted(() => {
  const addSku = route.query.addSku as string | undefined;
  if (addSku) {
    openAdd();
    form.sku = addSku.trim();
    toast.info(`Form barang baru dibuka dengan SKU: ${form.sku}`);
  }
});

function handleFormScan(skuText: string) {
  form.sku = skuText.trim();
  showFormScanner.value = false;
  toast.success(`Kode Barcode / SKU terisi: ${form.sku}`);
}

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

const columnHelper = createColumnHelper<Product>();
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

const columns = [
  columnHelper.accessor('image', {
    header: 'Foto',
    cell: (info) => {
      const src = info.getValue();
      const name = info.row.original.name;
      if (src) {
        return h('img', {
          src,
          alt: name,
          class: 'h-10 w-10 rounded-lg border border-ink bg-white object-cover',
        });
      }
      return h(
        'div',
        {
          class:
            'flex h-10 w-10 items-center justify-center rounded-lg border border-ink bg-white text-ink/30',
        },
        [h(Package, { class: 'h-5 w-5' })]
      );
    },
  }),
  columnHelper.accessor('sku', {
    header: 'SKU',
    cell: (info) => h('span', { class: 'font-mono text-gray-700' }, `#${info.getValue()}`),
  }),
  columnHelper.accessor('name', {
    header: 'Nama Produk',
    cell: (info) => h('span', { class: 'font-extrabold text-sm' }, info.getValue()),
  }),
  columnHelper.accessor('category', {
    header: 'Kategori',
    cell: (info) =>
      h(
        'span',
        { class: 'rounded-md border border-ink bg-canvas px-2 py-0.5 text-[10px]' },
        info.getValue()
      ),
  }),
  columnHelper.accessor('sellingPrice', {
    header: 'Harga Jual',
    cell: (info) =>
      h('span', { class: 'font-extrabold text-brand' }, `Rp ${formatPrice(info.getValue())}`),
  }),
  columnHelper.accessor((row) => `${row.stock} ${row.unit}`, {
    id: 'stock',
    header: 'Stok',
    cell: (info) => h('span', { class: 'font-extrabold' }, info.getValue()),
  }),
  columnHelper.accessor((row) => row.stock <= row.minStock, {
    id: 'status',
    header: 'Status',
    cell: (info) => {
      const isLow = info.getValue();
      return h(
        'span',
        {
          class: `inline-block rounded-md border border-ink px-2 py-0.5 text-[10px] font-extrabold ${
            isLow ? 'bg-card-coral text-white' : 'bg-card-green text-white'
          }`,
        },
        isLow ? 'STOK MENIPIS' : 'AMAN'
      );
    },
  }),
  columnHelper.display({
    id: 'actions',
    header: () => h('div', { class: 'text-center' }, 'Aksi'),
    cell: (info) =>
      h('div', { class: 'flex items-center justify-center gap-1.5' }, [
        h(
          'button',
          {
            onClick: () => openEdit(info.row.original),
            class:
              'neo-press rounded-lg border border-ink bg-white p-1.5 hover:bg-canvas cursor-pointer',
          },
          [h(Pencil, { class: 'h-4 w-4' })]
        ),
        h(
          'button',
          {
            onClick: () => askDelete(info.row.original),
            class:
              'neo-press rounded-lg border border-ink bg-card-coral p-1.5 text-white hover:brightness-95 cursor-pointer',
          },
          [h(Trash2, { class: 'h-4 w-4' })]
        ),
      ]),
  }),
];

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
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        class="border-ink bg-surface shadow-hard-xl w-full max-w-lg rounded-2xl border-2 p-5 sm:p-6"
      >
        <div class="border-ink mb-4 flex items-center justify-between border-b-2 pb-3">
          <h3 class="text-base font-extrabold">
            {{ isEdit ? 'Edit Data Barang' : 'Tambah Barang Baru' }}
          </h3>
          <button @click="closeModal" class="hover:text-card-coral p-1 text-gray-600">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="saveProduct" class="space-y-3 text-xs font-bold">
          <div>
            <Label>SKU / Kode Barcode</Label>
            <div class="flex items-center gap-2">
              <Input
                v-model="form.sku"
                placeholder="Scan barcode fisik atau isi manual"
                class="font-mono"
              />
              <button
                type="button"
                @click="showFormScanner = true"
                class="neo-press border-ink bg-brand text-ink shadow-hard-sm shrink-0 rounded-xl border-2 p-2"
                title="Scan Barcode Fisik dengan Kamera"
              >
                <Camera class="h-4 w-4" />
              </button>
              <button
                type="button"
                @click="regenerateSku"
                class="neo-press border-ink bg-canvas text-ink shadow-hard-sm shrink-0 rounded-xl border-2 p-2"
                title="Buat SKU acak otomatis"
              >
                <RefreshCw class="h-4 w-4" />
              </button>
            </div>
            <p class="mt-1 text-[10px] font-semibold text-gray-500">
              Scan barcode fisik produk dengan kamera atau buat kode acak otomatis.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label required>Kategori Produk</Label>
              <Select v-model="form.category" class="w-full">
                <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
              </Select>
            </div>
            <div>
              <Label required>Satuan Unit</Label>
              <Select v-model="form.unit" class="w-full">
                <option v-for="u in UNITS" :key="u" :value="u">{{ u }}</option>
              </Select>
            </div>
          </div>

          <div>
            <Label required>Nama Barang / Sembako</Label>
            <Input
              v-model="form.name"
              placeholder="Contoh: Minyak Goreng Kemasan 1L"
              :class="errors.name ? 'border-card-coral focus:ring-card-coral' : ''"
              @input="errors.name = ''"
            />
            <p v-if="errors.name" class="text-card-coral mt-1 text-[11px] font-bold">
              {{ errors.name }}
            </p>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <Label required>HPP (Modal)</Label>
              <Input
                v-model.number="form.costPrice"
                type="number"
                min="0"
                :class="errors.costPrice ? 'border-card-coral focus:ring-card-coral' : ''"
                @input="errors.costPrice = ''"
              />
              <p v-if="errors.costPrice" class="text-card-coral mt-1 text-[11px] font-bold">
                {{ errors.costPrice }}
              </p>
            </div>
            <div>
              <Label required class="text-brand">Harga Jual (Utuh)</Label>
              <Input
                v-model.number="form.sellingPrice"
                type="number"
                min="0"
                class="font-extrabold"
                :class="errors.sellingPrice ? 'border-card-coral focus:ring-card-coral' : ''"
                title="Harga per satuan besar (contoh: per bungkus)"
                @input="errors.sellingPrice = ''"
              />
              <p v-if="errors.sellingPrice" class="text-card-coral mt-1 text-[11px] font-bold">
                {{ errors.sellingPrice }}
              </p>
            </div>
            <div>
              <Label required>Stok</Label>
              <Input
                v-model.number="form.stock"
                type="number"
                min="0"
                step="0.01"
                :class="errors.stock ? 'border-card-coral focus:ring-card-coral' : ''"
                @input="errors.stock = ''"
              />
              <p v-if="errors.stock" class="text-card-coral mt-1 text-[11px] font-bold">
                {{ errors.stock }}
              </p>
            </div>
          </div>

          <div class="border-ink bg-canvas rounded-xl border-2 p-3">
            <p class="mb-2 text-[10px] font-extrabold tracking-wider text-gray-500 uppercase">
              Jual Eceran (per batang) — opsional
            </p>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label>Batang per Satuan Utuh</Label>
                <Input
                  v-model.number="form.piecesPerUnit"
                  type="number"
                  min="0"
                  placeholder="cth: 12"
                  :class="errors.piecesPerUnit ? 'border-card-coral focus:ring-card-coral' : ''"
                  title="Berapa batang dalam 1 satuan utuh (1 bungkus = 12 batang). Kosongkan bila tidak jual eceran."
                  @input="errors.piecesPerUnit = ''"
                />
                <p v-if="errors.piecesPerUnit" class="text-card-coral mt-1 text-[11px] font-bold">
                  {{ errors.piecesPerUnit }}
                </p>
              </div>
              <div>
                <Label>Harga per Batang</Label>
                <Input
                  v-model.number="form.smallPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="cth: 3000"
                  :class="errors.smallPrice ? 'border-card-coral focus:ring-card-coral' : ''"
                  title="Harga jual per batang (eceran)"
                  @input="errors.smallPrice = ''"
                />
                <p v-if="errors.smallPrice" class="text-card-coral mt-1 text-[11px] font-bold">
                  {{ errors.smallPrice }}
                </p>
              </div>
            </div>
            <p class="mt-1.5 text-[10px] font-semibold text-gray-500">
              Kosongkan "Batang per Satuan Utuh" agar produk dijual utuh saja. Saat diisi, kasir
              bisa jual per batang otomatis.
            </p>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <Label required>Stok Minimal</Label>
              <Input
                v-model.number="form.minStock"
                type="number"
                min="0"
                :class="errors.minStock ? 'border-card-coral focus:ring-card-coral' : ''"
                @input="errors.minStock = ''"
              />
              <p v-if="errors.minStock" class="text-card-coral mt-1 text-[11px] font-bold">
                {{ errors.minStock }}
              </p>
            </div>
            <div>
              <Label>Satuan Kelipatan</Label>
              <Input
                v-model.number="form.step"
                type="number"
                min="0"
                step="0.01"
                title="Kelipatan qty tombol kiri kasir (cth: 0.5 untuk setengah kg, 2 untuk per 2 unit)"
              />
            </div>
            <div>
              <Label>Foto URL (opsional)</Label>
              <Input v-model="form.image" placeholder="https://... atau unggah" />
            </div>
          </div>

          <div class="border-ink bg-canvas flex items-center gap-3 rounded-xl border-2 p-3">
            <div
              class="border-ink flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-white"
            >
              <img v-if="form.image" :src="form.image" class="h-full w-full object-cover" />
              <Package v-else class="text-ink/30 h-6 w-6" />
            </div>
            <label
              class="neo-press border-ink hover:bg-canvas inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 bg-white px-3 py-2 text-xs font-extrabold"
            >
              {{ form.image ? 'Ganti Foto' : 'Unggah Foto...' }}
              <input type="file" accept="image/*" class="hidden" @change="onImageFile" />
            </label>
            <span v-if="form.image" class="ml-auto text-[10px] font-bold text-gray-600">
              Terkompres: <b class="text-brand">{{ imageSizeKb }} KB</b>
            </span>
          </div>

          <div class="border-ink grid grid-cols-2 gap-2 border-t-2 pt-3">
            <Button type="button" variant="secondary" @click="closeModal" class="cursor-pointer"
              >Batal</Button
            >
            <Button type="submit" variant="primary" class="cursor-pointer">{{
              isEdit ? 'Simpan Perubahan' : 'Tambah Barang'
            }}</Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete confirm -->
    <div
      v-if="deleteTarget"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        class="border-ink bg-surface shadow-hard-xl w-full max-w-sm rounded-2xl border-2 p-5 text-center"
      >
        <h3 class="mb-1 text-base font-extrabold">Hapus Barang Ini?</h3>
        <p class="mb-4 text-xs font-bold text-gray-700">
          Apakah Anda yakin ingin menghapus
          <span class="text-card-coral underline">{{ deleteTarget.name }}</span
          >?
        </p>
        <div class="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" @click="deleteTarget = null">Batal</Button>
          <Button variant="destructive" @click="executeDelete">Ya, Hapus</Button>
        </div>
      </div>
    </div>

    <BarcodeScannerModal
      :open="showFormScanner"
      @close="showFormScanner = false"
      @scan="handleFormScan"
    />
  </div>
</template>

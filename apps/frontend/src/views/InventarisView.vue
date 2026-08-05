<script setup lang="ts">
import { ref, h } from 'vue';
import { Package, Pencil, Trash2, X, RefreshCw } from 'lucide-vue-next';
import type { Product } from '@point-of-sale/shared';
import { formatPrice } from '@/lib/utils';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import { useInventory } from '@/composables/useInventory';

import {
  useVueTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  FlexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/vue-table';

const {
  products,
  showModal,
  isEdit,
  form,
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
} = useInventory();

const columnHelper = createColumnHelper<Product>();
const sorting = ref<SortingState>([]);
const globalFilter = ref('');

const columns = [
  columnHelper.accessor('image', {
    header: 'Foto',
    cell: (info) => {
      const src = info.getValue();
      const name = info.row.original.name;
      if (src) {
        return h('img', { src, alt: name, class: 'h-10 w-10 rounded-lg border border-ink bg-white object-cover' });
      }
      return h('div', { class: 'flex h-10 w-10 items-center justify-center rounded-lg border border-ink bg-white text-ink/30' }, [
        h(Package, { class: 'h-5 w-5' }),
      ]);
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
    cell: (info) => h('span', { class: 'rounded-md border border-ink bg-canvas px-2 py-0.5 text-[10px]' }, info.getValue()),
  }),
  columnHelper.accessor('sellingPrice', {
    header: 'Harga Jual',
    cell: (info) => h('span', { class: 'font-extrabold text-brand' }, `Rp ${formatPrice(info.getValue())}`),
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
        isLow ? 'STOK MENIPIS' : 'AMAN',
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
            class: 'neo-press rounded-lg border border-ink bg-white p-1.5 hover:bg-canvas',
          },
          [h(Pencil, { class: 'h-4 w-4' })],
        ),
        h(
          'button',
          {
            onClick: () => askDelete(info.row.original),
            class: 'neo-press rounded-lg border border-ink bg-card-coral p-1.5 text-white hover:brightness-95',
          },
          [h(Trash2, { class: 'h-4 w-4' })],
        ),
      ]),
  }),
];

const table = useVueTable({
  data: products,
  columns,
  state: {
    get sorting() {
      return sorting.value;
    },
    get globalFilter() {
      return globalFilter.value;
    },
  },
  onSortingChange: (updaterOrValue) => {
    sorting.value = typeof updaterOrValue === 'function' ? updaterOrValue(sorting.value) : updaterOrValue;
  },
  onGlobalFilterChange: (updaterOrValue) => {
    globalFilter.value = typeof updaterOrValue === 'function' ? updaterOrValue(globalFilter.value) : updaterOrValue;
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-md">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink bg-card-green text-white shadow-hard-sm">
          <Package class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-extrabold">Manajemen Inventaris Sembako</h2>
          <p class="text-xs font-semibold text-gray-600">Total Katalog: {{ products.length }} Barang (SKU)</p>
        </div>
      </div>
      <Button @click="openAdd"><Package class="h-4 w-4" /> Tambah Barang Baru</Button>
    </div>

    <Card class="overflow-hidden">
      <div class="neo-scroll overflow-x-auto">
        <table class="w-full border-collapse text-left text-xs font-bold">
          <thead class="border-b-2 border-ink bg-ink text-[11px] uppercase tracking-wider text-white">
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
          <tbody class="divide-y-2 divide-ink">
            <tr v-for="row in table.getRowModel().rows" :key="row.id" class="hover:bg-canvas">
              <td v-for="cell in row.getVisibleCells()" :key="cell.id" class="p-3">
                <FlexRender
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </td>
            </tr>
            <tr v-if="table.getRowModel().rows.length === 0">
              <td colspan="8" class="p-4 text-center text-gray-500 font-semibold">Tidak ada barang inventaris.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <!-- Add/Edit modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div class="w-full max-w-lg rounded-2xl border-2 border-ink bg-surface p-5 shadow-hard-xl sm:p-6">
        <div class="mb-4 flex items-center justify-between border-b-2 border-ink pb-3">
          <h3 class="text-base font-extrabold">{{ isEdit ? 'Edit Data Barang' : 'Tambah Barang Baru' }}</h3>
          <button @click="closeModal" class="p-1 text-gray-600 hover:text-card-coral"><X class="h-5 w-5" /></button>
        </div>

        <form @submit.prevent="saveProduct" class="space-y-3 text-xs font-bold">
          <div>
            <label class="mb-1 block">SKU (otomatis)</label>
            <div class="flex items-center gap-2">
              <input
                :value="form.sku"
                readonly
                class="w-full rounded-xl border-2 border-ink bg-gray-100 px-3 py-2 font-mono text-ink/70 focus:outline-none"
                title="SKU dibuat otomatis saat tambah barang"
              />
              <button
                type="button"
                :disabled="isEdit"
                @click="regenerateSku"
                class="neo-press shrink-0 rounded-xl border-2 border-ink bg-canvas p-2 text-ink shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-40"
                :title="isEdit ? 'SKU tidak diubah saat edit' : 'Buat SKU baru'"
              >
                <RefreshCw class="h-4 w-4" />
              </button>
            </div>
            <p class="mt-1 text-[10px] font-semibold text-gray-500">
              {{ isEdit ? 'SKU tidak dapat diubah saat edit.' : 'Kode dihasilkan otomatis — tidak perlu diisi manual.' }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block">Kategori Produk</label>
              <select v-model="form.category" class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2 focus:outline-none">
                <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block">Satuan Unit</label>
              <select v-model="form.unit" class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2 focus:outline-none">
                <option v-for="u in UNITS" :key="u" :value="u">{{ u }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="mb-1 block">Nama Barang / Sembako</label>
            <input v-model="form.name" placeholder="Contoh: Minyak Goreng Kemasan 1L" class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="mb-1 block">HPP (Modal)</label>
              <input v-model.number="form.costPrice" type="number" class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2" />
            </div>
            <div>
              <label class="mb-1 block text-brand">Harga Jual</label>
              <input v-model.number="form.sellingPrice" type="number" class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2 font-extrabold" />
            </div>
            <div>
              <label class="mb-1 block">Stok</label>
              <input v-model.number="form.stock" type="number" step="0.01" class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block">Stok Minimal</label>
              <input v-model.number="form.minStock" type="number" class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2" />
            </div>
            <div>
              <label class="mb-1 block">Foto URL (opsional)</label>
              <input v-model="form.image" placeholder="https://... atau unggah" class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2" />
            </div>
          </div>

          <div class="flex items-center gap-3 rounded-xl border-2 border-ink bg-canvas p-3">
            <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-white">
              <img v-if="form.image" :src="form.image" class="h-full w-full object-cover" />
              <Package v-else class="h-6 w-6 text-ink/30" />
            </div>
            <label class="neo-press inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-ink bg-white px-3 py-2 text-xs font-extrabold hover:bg-canvas">
              {{ form.image ? 'Ganti Foto' : 'Unggah Foto...' }}
              <input type="file" accept="image/*" class="hidden" @change="onImageFile" />
            </label>
            <span v-if="form.image" class="ml-auto text-[10px] font-bold text-gray-600">
              Terkompres: <b class="text-brand">{{ imageSizeKb }} KB</b>
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 border-t-2 border-ink pt-3">
            <Button type="button" variant="secondary" @click="closeModal">Batal</Button>
            <Button type="submit" variant="primary">{{ isEdit ? 'Simpan Perubahan' : 'Tambah Barang' }}</Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div class="w-full max-w-sm rounded-2xl border-2 border-ink bg-surface p-5 text-center shadow-hard-xl">
        <h3 class="mb-1 text-base font-extrabold">Hapus Barang Ini?</h3>
        <p class="mb-4 text-xs text-gray-700 font-bold">
          Apakah Anda yakin ingin menghapus <span class="text-card-coral underline">{{ deleteTarget.name }}</span>?
        </p>
        <div class="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" @click="deleteTarget = null">Batal</Button>
          <Button variant="destructive" @click="executeDelete">Ya, Hapus</Button>
        </div>
      </div>
    </div>
  </div>
</template>

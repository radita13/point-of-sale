<script setup lang="ts">
import { Package, FileSpreadsheet, FileUp } from 'lucide-vue-next';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import PaginationControls from '@/components/ui/Pagination.vue';
import ProductFilterCard from '@/components/common/ProductFilterCard.vue';
import ProductFormModal from '@/components/inventaris/ProductFormModal.vue';
import DeleteConfirmModal from '@/components/inventaris/DeleteConfirmModal.vue';
import { useInventoryTable } from '@/composables/inventory/useInventoryTable';
import { useInventory } from '@/composables/inventory/useInventory';
import { FlexRender } from '@tanstack/vue-table';

const inventory = useInventory();

const { table, globalFilter, selectedCategory, fileInputRef, isImporting, onCsvFileSelect } =
  useInventoryTable(inventory);

const {
  products,
  isLoading,
  showModal,
  isEdit,
  form,
  errors,
  deleteTarget,
  imageSizeKb,
  openAdd,
  closeModal,
  regenerateSku,
  onImageFile,
  saveProduct,
  executeDelete,
  downloadCsvTemplate,
} = inventory;
</script>

<template>
  <div class="space-y-4">
    <div
      class="border-ink bg-surface shadow-hard-md flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 p-4"
    >
      <div class="flex items-center gap-3">
        <div
          class="border-ink bg-card-green shadow-hard-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-white"
        >
          <Package class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-extrabold">Manajemen Inventaris Toko</h2>
          <p class="text-xs font-semibold text-gray-600">
            Total Katalog: {{ products.length }} Barang (SKU)
          </p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <input
          id="inventory-csv-file"
          name="csvFile"
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
          Tambah Produk
        </Button>
      </div>
    </div>

    <ProductFilterCard
      v-model:search="globalFilter"
      v-model:category="selectedCategory"
      inputId="inventory-search-filter"
      inputName="globalFilter"
    />

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
                <span v-if="header.column.getIsSorted() === 'asc'"> </span>
                <span v-else-if="header.column.getIsSorted() === 'desc'"> </span>
              </th>
            </tr>
          </thead>
          <Skeleton v-if="isLoading" type="table-rows" :count="10" :columns="8" />
          <tbody v-else class="divide-ink divide-y-2">
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

      <PaginationControls
        v-if="table.getFilteredRowModel().rows.length > 0"
        :page="table.getState().pagination.pageIndex + 1"
        @update:page="(p) => table.setPageIndex(p - 1)"
        :page-size="table.getState().pagination.pageSize"
        @update:page-size="(s) => table.setPageSize(s)"
        :total-pages="table.getPageCount()"
        :total-items="table.getFilteredRowModel().rows.length"
        :page-size-options="[10, 20, 50]"
        item-name="barang"
        id-prefix="inventory"
        class="p-3 pr-16 sm:pr-3"
      />
    </Card>

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

    <DeleteConfirmModal
      :open="!!deleteTarget"
      :target="deleteTarget"
      @close="deleteTarget = null"
      @confirm="executeDelete"
    />
  </div>
</template>

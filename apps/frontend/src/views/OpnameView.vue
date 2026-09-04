<script setup lang="ts">
import { ClipboardCheck, Save } from 'lucide-vue-next';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import PaginationControls from '@/components/ui/Pagination.vue';
import ProductFilterCard from '@/components/common/ProductFilterCard.vue';
import OpnameItemCard from '@/components/opname/OpnameItemCard.vue';
import { useStockOpname } from '@/composables/useStockOpname';

const {
  changes,
  selectedStockStatus,
  searchQuery,
  selectedCategory,
  currentPage,
  pageSize,
  stockCounts,
  filteredProducts,
  totalPages,
  paginatedProducts,
  getStockDiff,
  adjustStock,
  updateChange,
  saveOpname,
} = useStockOpname();
</script>

<template>
  <div class="space-y-4">
    <div
      class="border-ink bg-surface shadow-hard-md flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 p-4"
    >
      <div class="flex items-center gap-3">
        <div
          class="border-ink bg-offline shadow-hard-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-white"
        >
          <ClipboardCheck class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-extrabold">Manajemen Stok Toko</h2>
          <p class="text-xs font-semibold text-gray-600">
            Sesuaikan jumlah stok sistem dengan stok riil di toko.
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="primary" @click="saveOpname" class="cursor-pointer text-xs">
          <Save class="h-4 w-4" /> Simpan Stok
        </Button>
      </div>
    </div>

    <!-- Search & Category Filter Card -->
    <ProductFilterCard
      v-model:search="searchQuery"
      v-model:category="selectedCategory"
      inputId="opname-search-input"
      inputName="opnameSearch"
    />

    <!-- Segmented Filter Status Stok -->
    <Card>
      <div class="p-4">
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            @click="selectedStockStatus = 'all'"
            :class="
              selectedStockStatus === 'all'
                ? 'border-ink bg-ink shadow-hard-xs text-white'
                : 'border-ink/40 bg-canvas text-ink hover:border-ink'
            "
            class="neo-press flex cursor-pointer items-center justify-between rounded-xl border-2 px-3 py-2 text-xs font-black transition-all"
          >
            <span>Semua Stok</span>
            <span
              :class="
                selectedStockStatus === 'all' ? 'bg-white/20 text-white' : 'bg-ink/10 text-ink'
              "
              class="rounded-full px-2 py-0.5 text-[10px]"
            >
              {{ stockCounts.all }}
            </span>
          </button>

          <button
            type="button"
            @click="selectedStockStatus = 'safe'"
            :class="
              selectedStockStatus === 'safe'
                ? 'border-ink bg-card-green shadow-hard-xs text-white'
                : 'border-ink/40 bg-canvas text-ink hover:border-ink'
            "
            class="neo-press flex cursor-pointer items-center justify-between rounded-xl border-2 px-3 py-2 text-xs font-black transition-all"
          >
            <span class="flex items-center gap-1.5">
              <span
                class="h-2 w-2 rounded-full bg-green-500"
                :class="{ 'bg-white': selectedStockStatus === 'safe' }"
              />
              Aman
            </span>
            <span
              :class="
                selectedStockStatus === 'safe'
                  ? 'bg-white/20 text-white'
                  : 'bg-green-100 text-green-800'
              "
              class="rounded-full px-2 py-0.5 text-[10px]"
            >
              {{ stockCounts.safe }}
            </span>
          </button>

          <button
            type="button"
            @click="selectedStockStatus = 'low'"
            :class="
              selectedStockStatus === 'low'
                ? 'border-ink bg-card-yellow shadow-hard-xs text-white'
                : 'border-ink/40 bg-canvas text-ink hover:border-ink'
            "
            class="neo-press flex cursor-pointer items-center justify-between rounded-xl border-2 px-3 py-2 text-xs font-black transition-all"
          >
            <span class="flex items-center gap-1.5">
              <span
                class="h-2 w-2 rounded-full bg-amber-500"
                :class="{ 'bg-white': selectedStockStatus === 'low' }"
              />
              Menipis
            </span>
            <span
              :class="
                selectedStockStatus === 'low'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-800'
              "
              class="rounded-full px-2 py-0.5 text-[10px]"
            >
              {{ stockCounts.low }}
            </span>
          </button>

          <button
            type="button"
            @click="selectedStockStatus = 'out'"
            :class="
              selectedStockStatus === 'out'
                ? 'border-ink bg-card-coral shadow-hard-xs text-white'
                : 'border-ink/40 bg-canvas text-ink hover:border-ink'
            "
            class="neo-press flex cursor-pointer items-center justify-between rounded-xl border-2 px-3 py-2 text-xs font-black transition-all"
          >
            <span class="flex items-center gap-1.5">
              <span
                class="h-2 w-2 rounded-full bg-red-500"
                :class="{ 'bg-white': selectedStockStatus === 'out' }"
              />
              Habis
            </span>
            <span
              :class="
                selectedStockStatus === 'out' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-800'
              "
              class="rounded-full px-2 py-0.5 text-[10px]"
            >
              {{ stockCounts.out }}
            </span>
          </button>
        </div>
      </div>
    </Card>

    <!-- Tabel Opname Grid -->
    <Card class="p-4">
      <div
        v-if="paginatedProducts.length === 0"
        class="py-12 text-center text-xs font-bold text-gray-500"
      >
        Tidak ada produk ditemukan.
      </div>

      <div v-else class="space-y-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <OpnameItemCard
            v-for="p in paginatedProducts"
            :key="p.id"
            :product="p"
            :current-change="changes[p.id] ?? ''"
            :stock-diff="getStockDiff(p)"
            @adjust="(delta) => adjustStock(p, delta)"
            @update:change="(val) => updateChange(p.id, val)"
          />
        </div>

        <!-- Pagination -->
        <PaginationControls
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :total-pages="totalPages"
          :total-items="filteredProducts.length"
          :page-size-options="[6, 12, 24, 48]"
          item-name="barang"
          id-prefix="opname"
          class="pr-14 sm:pr-0"
        />
      </div>
    </Card>
  </div>
</template>

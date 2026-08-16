<script setup lang="ts">
import { ClipboardCheck, Save, Search, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Badge from '@/components/ui/Badge.vue';
import Select from '@/components/ui/Select.vue';
import { CATEGORIES } from '@/constants/product';
import { useStockOpname } from '@/composables/useStockOpname';

const {
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
} = useStockOpname();
</script>

<template>
  <div class="space-y-4">
    <!-- Header Controls -->
    <div class="border-ink bg-surface shadow-hard-md flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 p-4">
      <div>
        <div class="flex items-center gap-2">
          <ClipboardCheck class="h-6 w-6 text-brand" />
          <h2 class="text-base font-extrabold sm:text-lg">Stock Opname</h2>
        </div>
        <p class="text-xs font-semibold text-gray-600">
          Penyesuaian &amp; Koreksi Stok Fisik Toko
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Badge v-if="changedCount > 0" class="bg-card-coral text-white animate-pulse">
          {{ changedCount }} Produk Diubah
        </Badge>
        <Button :disabled="changedCount === 0" variant="primary" @click="saveOpname">
          <Save class="h-4 w-4" /> Simpan Koreksi Stok
        </Button>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="border-ink bg-surface shadow-hard-md flex flex-col gap-3 rounded-2xl border-2 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1">
        <Search class="text-ink/40 absolute left-3 top-3 h-4 w-4" />
        <Input
          v-model="searchQuery"
          placeholder="Cari nama barang atau SKU..."
          class="pl-9 text-xs font-bold"
        />
      </div>

      <div class="neo-scroll flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        <button
          v-for="cat in CATEGORIES"
          :key="cat"
          @click="selectedCategory = cat"
          :class="selectedCategory === cat ? 'bg-ink text-white' : 'bg-canvas text-ink'"
          class="neo-press border-ink cursor-pointer rounded-xl border px-3 py-1.5 text-[11px] font-extrabold whitespace-nowrap"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- Tabel Opname Grid/Card -->
    <Card class="p-4">
      <div v-if="paginatedProducts.length === 0" class="py-12 text-center text-xs font-bold text-gray-500">
        Tidak ada produk ditemukan.
      </div>

      <div v-else class="space-y-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="p in paginatedProducts"
            :key="p.id"
            :class="hasChange(p.id) ? 'border-card-coral bg-red-50/50 shadow-hard-md' : 'border-ink bg-canvas'"
            class="relative flex flex-col justify-between rounded-xl border-2 p-3 transition-all"
          >
            <div>
              <div class="flex items-start justify-between gap-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-gray-500">{{ p.category }}</span>
                <Badge :class="p.stock <= p.minStock ? 'bg-card-coral text-white' : 'bg-card-green text-white'">
                  Stok: {{ p.stock }} {{ p.unit }}
                </Badge>
              </div>

              <h4 class="mt-1 font-extrabold text-ink leading-tight">{{ p.name }}</h4>
              <p class="text-[10px] font-mono text-gray-500">SKU: {{ p.sku }}</p>
            </div>

            <div class="mt-3 border-t border-ink/20 pt-2">
              <div class="flex items-center justify-between gap-2">
                <label class="text-[11px] font-extrabold text-gray-700">Stok Fisik Baru:</label>
                <div class="flex items-center gap-1.5">
                  <Input
                    v-model="changes[p.id]"
                    type="number"
                    step="any"
                    min="0"
                    :placeholder="String(p.stock)"
                    class="h-8 w-24 text-right text-xs font-black"
                  />
                  <span class="text-[11px] font-bold text-gray-600">{{ p.unit }}</span>
                </div>
              </div>

              <!-- Diff Badge -->
              <div v-if="getStockDiff(p) !== null" class="mt-1.5 flex items-center justify-end text-[11px] font-black">
                <span :class="getStockDiff(p)! > 0 ? 'text-green-600' : 'text-red-600'">
                  Selisih: {{ getStockDiff(p)! > 0 ? '+' : '' }}{{ getStockDiff(p) }} {{ p.unit }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination Footer -->
        <div class="flex items-center justify-between border-t-2 border-ink pt-3 text-xs font-bold">
          <div class="flex items-center gap-2">
            <span class="text-gray-600">Per halaman:</span>
            <Select v-model.number="pageSize" class="h-8 text-xs font-extrabold">
              <option :value="6">6</option>
              <option :value="12">12</option>
              <option :value="24">24</option>
              <option :value="48">48</option>
            </Select>
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-[11px] text-gray-600">Halaman {{ currentPage }} / {{ totalPages }}</span>
            <Button variant="secondary" size="icon" :disabled="currentPage <= 1" @click="currentPage--">
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" :disabled="currentPage >= totalPages" @click="currentPage++">
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>

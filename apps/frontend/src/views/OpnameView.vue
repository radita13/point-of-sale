<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { toast } from 'vue-sonner';
import { ClipboardCheck, Save, Search, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { InventoryAdjustment, Product } from '@point-of-sale/shared';
import { inventoryAdjustmentSchema } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { makeUuid } from '@/lib/utils';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Badge from '@/components/ui/Badge.vue';
import { api } from '@/services/api';
import { useSyncStore } from '@/stores/sync';

const sync = useSyncStore();
const products = ref<Product[]>([]);
const changes = ref<Record<string, string>>({});

const searchQuery = ref('');
const selectedCategory = ref('Semua');
const currentPage = ref(1);
const pageSize = ref(12);

const CATEGORIES = [
  'Semua',
  'Beras & Minyak',
  'Bumbu Dapur',
  'Minuman',
  'Makanan & Snack',
  'Rokok',
  'Kebutuhan Harian',
];

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
    toast.success(
      `${adjustments.length} koreksi stok disimpan lokal (offline) — akan tersinkron otomatis.`
    );
  }
  changes.value = {};
  refresh();
}
void sync;
</script>

<template>
  <div class="space-y-4">
    <!-- Header Opname -->
    <div
      class="border-ink bg-surface shadow-hard-md flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 p-4"
    >
      <div class="flex items-center gap-3">
        <div
          class="border-ink bg-offline shadow-hard-sm flex h-10 w-10 items-center justify-center rounded-xl border-2 text-white"
        >
          <ClipboardCheck class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-extrabold">Stock Opname & Koreksi Fisik Rak</h2>
          <p class="text-xs font-semibold text-gray-600">
            Sesuaikan jumlah stok sistem dengan stok riil di toko.
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Badge v-if="changedCount > 0" class="bg-brand text-white border-ink">
          {{ changedCount }} Koreksi Siap Disimpan
        </Badge>
        <Button variant="primary" @click="saveOpname" class="cursor-pointer">
          <Save class="h-4 w-4" /> Simpan Stok Baru
        </Button>
      </div>
    </div>

    <!-- Search & Category Card Terpisah seperti Inventaris -->
    <Card>
      <div class="flex flex-col gap-3 p-4">
        <div class="relative">
          <Search class="text-ink/40 absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2" />
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama barang atau SKU..."
            class="pl-11"
          />
        </div>
        <div class="neo-scroll flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            v-for="cat in CATEGORIES"
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

    <!-- Konten Utama Product Grid & Pagination -->
    <Card class="p-4 space-y-4">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="p in paginatedProducts"
          :key="p.id"
          :class="
            hasChange(p.id)
              ? 'border-brand bg-brand/5 shadow-hard-md'
              : 'border-ink bg-canvas shadow-hard-sm'
          "
          class="flex items-center justify-between gap-3 rounded-xl border-2 p-3 transition-all"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <h4 class="truncate text-xs font-extrabold">{{ p.name }}</h4>
              <span
                v-if="getStockDiff(p) !== null"
                :class="
                  getStockDiff(p)! > 0 ? 'bg-card-green text-white' : 'bg-card-coral text-white'
                "
                class="rounded-md px-1.5 py-0.5 font-mono text-[9px] font-black shrink-0"
              >
                {{ getStockDiff(p)! > 0 ? `+${getStockDiff(p)}` : getStockDiff(p) }} {{ p.unit }}
              </span>
            </div>
            <p class="text-[10px] font-bold text-gray-600">Stok Sistem: {{ p.stock }} {{ p.unit }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <input
              type="number"
              step="0.1"
              :placeholder="String(p.stock)"
              :value="changes[p.id] ?? ''"
              @input="(e) => (changes[p.id] = (e.target as HTMLInputElement).value)"
              class="border-ink focus:ring-brand w-16 rounded-md border bg-white py-1 text-center text-xs font-bold focus:ring-2 focus:outline-none"
              :class="{ 'border-brand ring-brand text-brand font-black ring-2': hasChange(p.id) }"
            />
            <span class="text-[10px] font-bold">{{ p.unit }}</span>
          </div>
        </div>

        <div
          v-if="paginatedProducts.length === 0"
          class="col-span-full py-8 text-center text-xs font-semibold text-gray-500"
        >
          Tidak ada barang yang cocok dengan pencarian / filter.
        </div>
      </div>

      <!-- Pagination Controls -->
      <div
        v-if="filteredProducts.length > 0"
        class="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink pt-3 text-xs font-extrabold"
      >
        <div class="text-gray-600 whitespace-nowrap">
          <span class="hidden sm:inline">Menampilkan </span>
          <span>{{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filteredProducts.length) }}</span>
          <span class="text-gray-400 font-normal"> / </span>
          <span>{{ filteredProducts.length }}</span>
          <span class="hidden sm:inline"> barang</span>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1">
            <select
              :value="pageSize"
              @change="(e: Event) => (pageSize = Number((e.target as HTMLSelectElement).value))"
              class="border-ink bg-white rounded-lg border-2 px-1.5 py-1 text-xs font-extrabold focus:outline-none"
              title="Jumlah item per halaman"
            >
              <option :value="12">12</option>
              <option :value="24">24</option>
              <option :value="48">48</option>
            </select>
          </div>

          <div class="flex items-center gap-1">
            <Button
              variant="secondary"
              size="icon"
              :disabled="currentPage <= 1"
              @click="currentPage--"
              class="h-8 w-8 cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <span class="px-1 text-[11px] whitespace-nowrap"> {{ currentPage }}/{{ totalPages }} </span>
            <Button
              variant="secondary"
              size="icon"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
              class="h-8 w-8 cursor-pointer disabled:opacity-40"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>

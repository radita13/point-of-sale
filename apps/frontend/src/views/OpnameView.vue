<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { ClipboardCheck, Save } from 'lucide-vue-next';
import type { InventoryAdjustment, Product } from '@point-of-sale/shared';
import { inventoryAdjustmentSchema } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { makeUuid } from '@/db/seed';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import { api } from '@/services/api';
import { useSyncStore } from '@/stores/sync';

const sync = useSyncStore();
const products = ref<Product[]>([]);
const changes = ref<Record<string, string>>({});

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
  <Card class="p-4">
    <div class="mb-4 flex items-center gap-3">
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

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="p in products"
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
              class="rounded-md px-1.5 py-0.5 font-mono text-[9px] font-black"
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
    </div>

    <div class="border-ink mt-4 border-t-2 pt-3 text-right">
      <Button variant="primary" @click="saveOpname" class="cursor-pointer">
        <Save class="h-4 w-4" /> Simpan Stok Baru
      </Button>
    </div>
  </Card>
</template>

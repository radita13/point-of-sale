<script setup lang="ts">
import { ReceiptText } from 'lucide-vue-next';
import { formatPrice } from '@/lib/utils';
import { useStoreSettingsStore } from '@/stores/storeSettings';
import type { ReceiptData } from '@/composables/receipt';

defineProps<{
  open: boolean;
  receipt: ReceiptData | null;
  phone: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'reprint'): void;
}>();

const storeSettings = useStoreSettingsStore();
</script>

<template>
  <div
    v-if="open && receipt"
    class="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
  >
    <div
      class="border-ink shadow-hard-xl w-full max-w-sm rounded-2xl border-2 bg-white p-6 font-mono text-xs"
    >
      <div class="border-ink mb-3 border-b-2 border-dashed pb-3 text-center">
        <h3 class="text-ink text-sm font-extrabold uppercase">
          {{ storeSettings.settings.storeName }}
        </h3>
        <p class="text-[10px] text-gray-600">
          {{ storeSettings.settings.address }}
        </p>
        <p v-if="phone" class="text-[10px] text-gray-600">
          {{ phone }}
        </p>
      </div>

      <div class="mb-3 space-y-1 text-[11px]">
        <div class="flex justify-between">
          <span>No. Nota:</span><span class="font-bold">{{ receipt.invoiceNo }}</span>
        </div>
        <div class="flex justify-between">
          <span>Tanggal:</span><span>{{ receipt.date }}</span>
        </div>
      </div>

      <div class="border-ink mb-3 space-y-1.5 border-y border-dashed py-2">
        <div v-for="(item, idx) in receipt.items" :key="idx" class="flex justify-between">
          <div>
            <div class="font-bold">{{ item.name }}</div>
            <div class="text-[10px] text-gray-600">
              {{ item.qty }} {{ item.unit }} @ Rp {{ formatPrice(item.price) }}
            </div>
          </div>
          <div class="font-bold">Rp {{ formatPrice(item.subtotal) }}</div>
        </div>
      </div>

      <div class="mb-4 space-y-1 text-[11px] font-bold">
        <div class="flex justify-between">
          <span>TOTAL:</span><span class="text-sm">Rp {{ formatPrice(receipt.total) }}</span>
        </div>
        <div class="flex justify-between">
          <span>BAYAR (CASH):</span><span>Rp {{ formatPrice(receipt.pay) }}</span>
        </div>
        <div class="flex justify-between">
          <span>KEMBALI:</span><span>Rp {{ formatPrice(receipt.change) }}</span>
        </div>
      </div>

      <div
        class="border-ink mb-4 border-t border-dashed pt-2 text-center text-[10px] whitespace-pre-line text-gray-600"
      >
        {{ storeSettings.settings.receiptFooter }}
      </div>

      <div class="grid grid-cols-2 gap-2 font-sans">
        <button
          @click="emit('close')"
          class="neo-press border-ink bg-canvas rounded-xl border-2 py-2 text-xs font-extrabold"
        >
          Tutup
        </button>
        <button
          @click="emit('reprint')"
          class="neo-press border-ink bg-brand shadow-hard-sm flex items-center justify-center gap-1 rounded-xl border-2 py-2 text-xs font-extrabold text-white"
        >
          <ReceiptText class="h-3.5 w-3.5" /> Cetak Sekarang
        </button>
      </div>
    </div>
  </div>
</template>

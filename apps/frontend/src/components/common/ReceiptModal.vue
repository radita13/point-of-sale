<script setup lang="ts">
import { ReceiptText } from 'lucide-vue-next';
import type { ReceiptData } from '@point-of-sale/shared';
import { formatPrice } from '@/lib/utils';
import { useStoreSettingsStore } from '@/stores/storeSettings';
import Button from '@/components/ui/Button.vue';

defineProps<{
  open: boolean;
  data: ReceiptData | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'print'): void;
}>();

const storeSettings = useStoreSettingsStore();
</script>

<template>
  <div
    v-if="open && data"
    class="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
  >
    <div
      class="border-ink shadow-hard-xl w-full max-w-sm rounded-2xl border-2 bg-white p-6 font-mono text-xs"
    >
      <!-- Store Header -->
      <div class="border-ink mb-3 border-b-2 border-dashed pb-3 text-center">
        <h3 class="text-ink text-sm font-extrabold uppercase">
          {{ data.storeName || storeSettings.settings.storeName }}
        </h3>
        <p class="text-[10px] text-gray-600">
          {{ data.address || storeSettings.settings.address }}
        </p>
        <p v-if="data.phone" class="text-[10px] text-gray-600">
          {{ data.phone }}
        </p>
      </div>

      <!-- Metadata (Invoice, Date, Cashier) -->
      <div class="mb-3 space-y-1 text-[11px]">
        <div class="flex justify-between">
          <span>No. Nota:</span><span class="font-bold">{{ data.invoiceNo }}</span>
        </div>
        <div class="flex justify-between">
          <span>Tanggal:</span><span>{{ data.date }}</span>
        </div>
        <div class="flex justify-between">
          <span>Kasir:</span><span class="font-bold">{{ data.cashier }}</span>
        </div>
      </div>

      <!-- Items List -->
      <div class="border-ink mb-3 space-y-1.5 border-y border-dashed py-2">
        <div v-for="(item, idx) in data.items" :key="idx" class="flex justify-between">
          <div>
            <div class="font-bold">{{ item.name }}</div>
            <div class="text-[10px] text-gray-600">
              {{ item.qty }} {{ item.unit }} x {{ formatPrice(item.price) }}
            </div>
          </div>
          <div class="font-bold">Rp {{ formatPrice(item.subtotal) }}</div>
        </div>
      </div>

      <!-- Totals & Payment -->
      <div class="mb-4 space-y-1 text-[11px] font-bold">
        <div class="flex justify-between">
          <span>TOTAL:</span><span class="text-sm">Rp {{ formatPrice(data.total) }}</span>
        </div>
        <div class="flex justify-between">
          <span>BAYAR ({{ data.paymentMethod }}):</span><span>Rp {{ formatPrice(data.pay) }}</span>
        </div>
        <div class="flex justify-between">
          <span>KEMBALI:</span><span>Rp {{ formatPrice(data.change) }}</span>
        </div>
      </div>

      <!-- Footer Message -->
      <div
        class="border-ink mb-4 border-t border-dashed pt-2 text-center text-[10px] whitespace-pre-line text-gray-600"
      >
        {{ storeSettings.settings.receiptFooter }}
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-2 font-sans">
        <Button @click="emit('close')" class="cursor-pointer" variant="secondary" size="icon">
          Tutup
        </Button>
        <Button @click="emit('print')" variant="primary" class="cursor-pointer" size="icon">
          <ReceiptText class="h-3.5 w-3.5" /> Cetak Sekarang
        </Button>
      </div>
    </div>
  </div>
</template>

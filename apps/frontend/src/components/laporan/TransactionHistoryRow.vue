<script setup lang="ts">
import { ReceiptText } from 'lucide-vue-next';
import type { Transaction } from '@point-of-sale/shared';
import { formatPrice } from '@/lib/utils';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';

defineProps<{
  transaction: Transaction;
}>();

const emit = defineEmits<{
  (e: 'viewReceipt'): void;
}>();
</script>

<template>
  <div
    class="border-ink bg-canvas shadow-hard-sm flex flex-col gap-2 rounded-xl border-2 p-3"
  >
    <div class="flex items-center justify-between gap-2 border-b border-gray-300 pb-2">
      <div class="flex items-center gap-2">
        <span
          class="border-ink rounded border bg-white px-2 py-0.5 font-mono text-xs font-extrabold"
        >
          {{ transaction.invoiceNo }}
        </span>
        <span class="text-[10px] font-bold text-gray-600">
          {{ new Date(transaction.timestamp).toLocaleString('id-ID') }}
        </span>
      </div>
      <Badge :class="transaction.isSynced ? 'bg-card-green text-white' : 'bg-offline text-ink'">
        {{ transaction.isSynced ? 'SYNCED' : 'OFFLINE' }}
      </Badge>
    </div>

    <div class="flex items-center justify-between text-xs font-bold">
      <span class="truncate text-[11px] text-gray-700">
        {{ transaction.items.map((i) => `${i.productName} (${i.qty}${i.unit})`).join(', ') }}
      </span>
      <span class="text-brand shrink-0 font-extrabold">
        Rp {{ formatPrice(transaction.finalAmount) }}
      </span>
    </div>

    <div class="flex items-center justify-between text-[10px] font-bold text-gray-500">
      <span>
        Bayar: Rp {{ formatPrice(transaction.payAmount) }} - Kembali: Rp
        {{ formatPrice(transaction.changeAmount) }}
      </span>
      <Button
        variant="secondary"
        size="sm"
        @click="emit('viewReceipt')"
        class="h-7 cursor-pointer px-2 text-[11px] font-extrabold"
      >
        <ReceiptText class="text-brand h-3.5 w-3.5" />
        <span>Detail Struk</span>
      </Button>
    </div>
  </div>
</template>

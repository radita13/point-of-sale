<script setup lang="ts">
import { computed } from 'vue';
import { Bluetooth, Printer } from 'lucide-vue-next';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';

const props = defineProps<{
  subtotal: number;
  finalAmount: number;
  payAmount: number;
  isPrinterConnected: boolean;
  isPrinterSupported: boolean;
  printerDeviceName?: string | null;
  hasItems: boolean;
  idPrefix?: string;
}>();

const emit = defineEmits<{
  (e: 'update:payAmount', val: number): void;
  (e: 'processPayment'): void;
  (e: 'connectPrinter'): void;
}>();

const changeAmount = computed(() => props.payAmount - props.finalAmount);
const quickPresets = [10000, 20000, 50000, 100000];

const presetsWithPas = computed(() => [
  { label: 'Uang Pas', value: props.finalAmount },
  ...quickPresets.map((v) => ({
    label: `${(v / 1000).toLocaleString('id-ID')} Ribu`,
    value: v,
  })),
]);
</script>

<template>
  <div class="border-ink mt-3 space-y-2.5 border-t-2 pt-3">
    <div class="space-y-1 text-xs font-bold">
      <div class="flex justify-between text-gray-600">
        <span>Subtotal Barang:</span>
        <span>Rp {{ formatPrice(subtotal) }}</span>
      </div>
      <div class="text-ink flex items-center justify-between text-sm font-extrabold">
        <span>Total Tagihan:</span>
        <span class="text-brand text-lg">Rp {{ formatPrice(finalAmount) }}</span>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-1.5">
      <Button
        v-for="preset in presetsWithPas"
        :key="preset.label"
        type="button"
        variant="ghost"
        size="sm"
        @click="emit('update:payAmount', preset.value)"
        class="border text-[10px] font-extrabold"
      >
        {{ preset.label }}
      </Button>
    </div>

    <!-- Cash Input -->
    <div class="flex items-center gap-2">
      <Label :for="`${idPrefix || 'checkout'}-pay-amount`" class="w-28 text-sm font-extrabold">
        Uang Cash:
      </Label>
      <Input
        :id="`${idPrefix || 'checkout'}-pay-amount`"
        name="payAmount"
        type="number"
        autocomplete="off"
        :model-value="payAmount"
        @update:model-value="emit('update:payAmount', Number($event) || 0)"
        placeholder="0"
        class="h-10 font-extrabold"
      />
    </div>

    <div class="flex justify-between text-sm font-bold">
      <span>Kembalian:</span>
      <span
        :class="changeAmount < 0 ? 'text-card-coral' : 'text-card-green'"
        class="font-extrabold"
      >
        Rp {{ formatPrice(changeAmount < 0 ? 0 : changeAmount) }}
      </span>
    </div>

    <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      <Button
        type="button"
        @click="emit('connectPrinter')"
        variant="secondary"
        :disabled="!isPrinterSupported"
        :class="
          isPrinterConnected
            ? 'bg-card-green border-ink text-white'
            : 'bg-surface text-ink border-ink'
        "
        class="flex-1 cursor-pointer"
        :title="
          isPrinterConnected
            ? (printerDeviceName ?? 'Hubungkan Printer Bluetooth')
            : 'Hubungkan printer Bluetooth'
        "
      >
        <Bluetooth class="h-4 w-4" />
        {{ isPrinterConnected ? printerDeviceName : 'Hubungkan Printer' }}
      </Button>
      <Button
        type="button"
        variant="primary"
        @click="emit('processPayment')"
        :disabled="!hasItems || payAmount < finalAmount"
        class="flex-1 cursor-pointer"
      >
        <Printer class="h-4 w-4" />
        Bayar &amp; Cetak Struk
      </Button>
    </div>
  </div>
</template>

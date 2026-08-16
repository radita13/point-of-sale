<script setup lang="ts">
import { Printer, Bluetooth } from 'lucide-vue-next';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import { formatPrice } from '@/lib/utils';
import { useBluetoothPrinter } from '@/composables/useBluetoothPrinter';
import { toast } from 'vue-sonner';

defineProps<{
  open: boolean;
  finalAmount: number;
  payAmount: number;
  changeAmount: number;
  presetAmounts: number[];
  canSubmit: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:payAmount', value: number): void;
  (e: 'process'): void;
}>();

const printer = useBluetoothPrinter();

async function connectPrinter() {
  try {
    await printer.connect();
    toast.success(`Printer terhubung: ${printer.deviceName.value}`);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Gagal menghubungkan printer.');
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
  >
    <div
      class="border-ink bg-surface shadow-hard-xl flex w-full max-w-md flex-col overflow-hidden rounded-2xl border-2 p-5 sm:p-6"
    >
      <div class="border-ink mb-4 flex items-center justify-between border-b-2 pb-3">
        <h3 class="text-base font-extrabold">Pembayaran Tunai</h3>
        <button @click="emit('close')" class="neo-press border-ink rounded-lg border p-1 font-bold">
          ✕
        </button>
      </div>

      <div class="space-y-4 text-xs font-bold">
        <div class="border-ink bg-canvas flex justify-between rounded-xl border-2 p-3">
          <span class="text-ink/70">Total Tagihan:</span>
          <span class="text-brand text-base font-extrabold"
            >Rp {{ formatPrice(finalAmount) }}</span
          >
        </div>

        <div>
          <label class="text-ink/80 mb-1 block">Uang Diterima (Cash)</label>
          <Input
            :model-value="payAmount"
            @update:model-value="emit('update:payAmount', Number($event) || 0)"
            type="number"
            min="0"
            class="text-base font-extrabold"
          />
        </div>

        <div>
          <span class="text-ink/60 mb-1.5 block text-[10px] uppercase tracking-wider"
            >Nominal Cepat</span
          >
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="amt in presetAmounts"
              :key="amt"
              @click="emit('update:payAmount', amt)"
              class="neo-press border-ink bg-canvas text-ink rounded-xl border-2 py-2 text-xs font-extrabold"
            >
              Rp {{ formatPrice(amt) }}
            </button>
          </div>
        </div>

        <div
          class="border-ink flex justify-between rounded-xl border-2 p-3"
          :class="payAmount >= finalAmount ? 'bg-card-green text-white' : 'bg-canvas text-ink'"
        >
          <span>Kembalian:</span>
          <span class="text-sm font-extrabold"
            >Rp {{ formatPrice(Math.max(0, changeAmount)) }}</span
          >
        </div>

        <div class="flex w-full flex-col gap-2 pt-2">
          <Button
            @click="connectPrinter"
            variant="secondary"
            :disabled="!printer.isSupported.value"
            :class="
              printer.isConnected.value
                ? 'bg-card-green border-ink text-white'
                : 'bg-surface text-ink border-ink'
            "
            class="w-full cursor-pointer"
          >
            <Bluetooth class="h-4 w-4" />
            {{ printer.isConnected.value ? printer.deviceName.value : 'Hubungkan Printer' }}
          </Button>
          <Button
            variant="primary"
            @click="emit('process')"
            :disabled="!canSubmit"
            class="w-full cursor-pointer"
          >
            <Printer class="h-4 w-4" />
            Bayar & Cetak Struk
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

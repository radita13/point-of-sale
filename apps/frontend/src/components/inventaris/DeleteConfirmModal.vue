<script setup lang="ts">
import Button from '@/components/ui/Button.vue';
import type { Product } from '@point-of-sale/shared';

defineProps<{
  open: boolean;
  target: Product | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <div
    v-if="open && target"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
  >
    <div
      class="border-ink bg-surface shadow-hard-xl w-full max-w-sm rounded-2xl border-2 p-5 text-center"
    >
      <h3 class="mb-1 text-base font-extrabold">Hapus Barang Ini?</h3>
      <p class="mb-4 text-xs font-bold text-gray-700">
        Apakah Anda yakin ingin menghapus
        <span class="text-card-coral underline">{{ target.name }}</span
        >?
      </p>
      <div class="grid grid-cols-2 gap-2.5">
        <Button variant="secondary" @click="emit('close')">Batal</Button>
        <Button variant="destructive" @click="emit('confirm')">Ya, Hapus</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Download, X, Share } from 'lucide-vue-next';
import { usePwaInstall } from '@/composables/usePwaInstall';
import Button from '@/components/ui/Button.vue';

const { canInstall, isInstalled, isDismissed, isIos, promptInstall, dismiss } = usePwaInstall();
</script>

<template>
  <div
    v-if="!isInstalled && !isDismissed && (canInstall || isIos)"
    class="border-ink bg-surface shadow-hard-xl fixed right-4 bottom-4 left-4 z-50 mx-auto max-w-md rounded-2xl border-2 p-4 sm:bottom-6"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <div
          class="border-ink bg-card-yellow text-ink shadow-hard-sm flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2"
        >
          <Download class="h-6 w-6" />
        </div>
        <div>
          <h4 class="text-ink text-sm font-extrabold">Instal Aplikasi Point of Sale</h4>
          <p class="text-xs font-semibold text-gray-700">
            Akses kasir lebih cepat &amp; 100% offline tanpa browser!
          </p>
        </div>
      </div>
      <button @click="dismiss" class="hover:text-ink text-gray-500">
        <X class="h-5 w-5" />
      </button>
    </div>

    <!-- Android / Chrome Install button -->
    <div v-if="canInstall" class="mt-3 flex justify-end">
      <Button variant="primary" size="sm" @click="promptInstall" class="w-full sm:w-auto">
        <Download class="mr-1.5 h-4 w-4" /> Instal Sekarang
      </Button>
    </div>

    <!-- iOS Safari Guide -->
    <div
      v-else-if="isIos"
      class="border-ink bg-canvas text-ink mt-3 rounded-xl border p-2.5 text-[11px] font-bold"
    >
      <ul class="flex list-inside list-disc flex-col">
        <li>
          <div class="inline-flex flex-row gap-1">
            <span>Tekan tombol</span>
            <Share class="text-brand inline h-3 w-3.5" />
          </div>
        </li>
        <li>lalu pilih <b>"Tambah ke Layar Utama"</b></li>
      </ul>
    </div>
  </div>
</template>

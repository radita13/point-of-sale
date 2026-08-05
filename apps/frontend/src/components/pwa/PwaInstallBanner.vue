<script setup lang="ts">
import { Download, X, Share } from 'lucide-vue-next';
import { usePwaInstall } from '@/composables/usePwaInstall';
import Button from '@/components/ui/Button.vue';

const { canInstall, isInstalled, isDismissed, isIos, promptInstall, dismiss } = usePwaInstall();
</script>

<template>
  <div
    v-if="!isInstalled && !isDismissed && (canInstall || isIos)"
    class="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-xl sm:bottom-6"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-card-yellow text-ink shadow-hard-sm">
          <Download class="h-6 w-6" />
        </div>
        <div>
          <h4 class="text-sm font-extrabold text-ink">Instal Aplikasi Point of Sale</h4>
          <p class="text-xs font-semibold text-gray-700">
            Akses kasir lebih cepat &amp; 100% offline tanpa browser!
          </p>
        </div>
      </div>
      <button @click="dismiss" class="text-gray-500 hover:text-ink">
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
    <div v-else-if="isIos" class="mt-3 rounded-xl border border-ink bg-canvas p-2.5 text-[11px] font-bold text-ink">
      <p class="flex items-center gap-1">
        <span>Tekan tombol Bagikan</span>
        <Share class="h-3.5 w-3.5 inline text-brand" />
        <span>lalu pilih <b>"Tambah ke Layar Utama"</b></span>
      </p>
    </div>
  </div>
</template>

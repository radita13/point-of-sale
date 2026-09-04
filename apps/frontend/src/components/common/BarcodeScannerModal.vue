<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera } from 'lucide-vue-next';
import Button from '@/components/ui/Button.vue';
import Label from '../ui/Label.vue';
import Select from '../ui/Select.vue';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'scan', result: string): void;
}>();

const scannerContainerId = 'barcode-reader-viewport';
let html5Qrcode: Html5Qrcode | null = null;
const isScanning = ref(false);
const errorMessage = ref<string | null>(null);
const cameras = ref<Array<{ id: string; label: string }>>([]);
const selectedCameraId = ref<string>('');
const lastScannedCode = ref<string>('');
const isFlashing = ref(false);
const scanStatusText = ref<string>('');
let cooldownTimer: ReturnType<typeof setTimeout> | null = null;

function playBeepSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {}
}

function handleScanDetected(decodedText: string) {
  const code = decodedText.trim();
  if (!code) return;

  if (lastScannedCode.value === code) return;

  lastScannedCode.value = code;
  scanStatusText.value = `Terdeteksi: ${code}`;
  playBeepSound();

  isFlashing.value = true;
  setTimeout(() => {
    isFlashing.value = false;
  }, 400);

  emit('scan', code);

  if (cooldownTimer) clearTimeout(cooldownTimer);
  cooldownTimer = setTimeout(() => {
    lastScannedCode.value = '';
    scanStatusText.value = '';
  }, 1800);
}

async function startScanner() {
  errorMessage.value = null;
  await nextTick();

  const element = document.getElementById(scannerContainerId);
  if (!element) return;

  try {
    if (!html5Qrcode) {
      html5Qrcode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });
    }

    let availableCameras = [];
    try {
      availableCameras = await Html5Qrcode.getCameras();
    } catch {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      availableCameras = await Html5Qrcode.getCameras();
    }

    if (availableCameras && availableCameras.length > 0) {
      cameras.value = availableCameras;
      if (!selectedCameraId.value) {
        const backCamera = availableCameras.find(
          (c) =>
            c.label.toLowerCase().includes('back') ||
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('environment')
        );
        selectedCameraId.value = backCamera ? backCamera.id : availableCameras[0].id;
      }
    }

    const cameraConfig = selectedCameraId.value
      ? { deviceId: selectedCameraId.value }
      : { facingMode: 'environment' };

    await html5Qrcode.start(
      cameraConfig,
      {
        fps: 25,
        qrbox: undefined,
      },
      (decodedText) => {
        handleScanDetected(decodedText);
      },
      () => {}
    );
    isScanning.value = true;
  } catch (err) {
    console.error('[BarcodeScanner] Gagal memulai kamera:', err);
    errorMessage.value = err instanceof Error ? err.message : 'Gagal mengakses kamera';
    isScanning.value = false;
  }
}

async function handleCameraSelectChange() {
  if (!selectedCameraId.value) return;
  await stopScanner();
  await startScanner();
}

async function stopScanner() {
  if (html5Qrcode && isScanning.value) {
    try {
      await html5Qrcode.stop();
    } catch (err) {
      console.warn('[BarcodeScanner] Gagal menghentikan scanner:', err);
    } finally {
      isScanning.value = false;
    }
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await startScanner();
    } else {
      await stopScanner();
    }
  },
  { immediate: true }
);

onUnmounted(async () => {
  await stopScanner();
  if (html5Qrcode) {
    html5Qrcode.clear();
    html5Qrcode = null;
  }
});

function handleClose() {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        class="border-ink bg-surface shadow-hard-lg relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border-2 p-5"
      >
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Camera class="text-ink h-5 w-5" />
            <h3 class="text-ink text-base font-extrabold">Scan Barcode / SKU</h3>
          </div>
          <Button variant="secondary" @click="handleClose" size="icon">
            <X class="h-4 w-4" />
          </Button>
        </div>

        <!-- Camera Viewport -->
        <div
          :class="isFlashing ? 'border-brand ring-brand/50 ring-4' : 'border-ink'"
          class="min-h-65] relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-black transition-all duration-150"
        >
          <div :id="scannerContainerId" class="w-full"></div>

          <div
            v-if="scanStatusText"
            class="bg-brand text-ink border-ink absolute top-2 right-2 left-2 z-20 animate-bounce rounded-lg border-2 p-2 text-center text-xs font-black shadow-md"
          >
            {{ scanStatusText }}
          </div>

          <div
            v-if="errorMessage"
            class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white p-4 text-center"
          >
            <p class="mb-3 text-sm font-bold text-red-600">{{ errorMessage }}</p>
            <p class="text-ink/70 mb-4 text-xs font-semibold">
              Pastikan izin akses kamera diizinkan di browser Anda.
            </p>
            <Button variant="secondary" @click="startScanner">Coba Lagi</Button>
          </div>
        </div>

        <p class="text-ink/60 mt-3 text-center text-xs font-bold">
          Arahkan kamera ke barcode produk atau SKU barang.
        </p>

        <!-- Footer / Camera Dropdown -->
        <div class="mt-4 flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div v-if="cameras.length > 0" class="w-full sm:max-w-60">
            <Label for="camera-select-dropdown" class="sr-only">Pilih Kamera</Label>
            <Select
              id="camera-select-dropdown"
              name="selectedCameraId"
              v-model="selectedCameraId"
              @change="handleCameraSelectChange"
              class="font-extrabold"
            >
              <option v-for="(cam, idx) in cameras" :key="cam.id" :value="cam.id">
                {{ cam.label || `Kamera ${idx + 1}` }}
              </option>
            </Select>
          </div>

          <Button
            variant="secondary"
            class="w-full text-xs font-bold sm:ml-auto sm:w-auto"
            @click="handleClose"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
#barcode-reader-viewport :deep(video) {
  width: 100% !important;
  height: auto !important;
  border-radius: 0.5rem;
  object-fit: cover;
}
</style>

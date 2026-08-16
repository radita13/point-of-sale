<script setup lang="ts">
import { ref } from 'vue';
import { X, RefreshCw, Camera } from 'lucide-vue-next';
import type { Product } from '@point-of-sale/shared';
import Button from '@/components/ui/Button.vue';
import Select from '@/components/ui/Select.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import BarcodeScannerModal from '@/components/kasir/BarcodeScannerModal.vue';
import { PRODUCT_CATEGORIES as CATEGORIES, UNITS } from '@/constants/product';

const props = defineProps<{
  open: boolean;
  isEdit: boolean;
  form: Product;
  errors: Record<string, string>;
  imageSizeKb: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save'): void;
  (e: 'regenerateSku'): void;
  (e: 'imageSelect', event: Event): void;
}>();

const showScanner = ref(false);

function handleScan(skuText: string) {
  props.form.sku = skuText.trim();
  showScanner.value = false;
}

function handleFileChange(event: Event) {
  emit('imageSelect', event);
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
  >
    <div
      class="border-ink bg-surface shadow-hard-xl max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 p-5 sm:p-6"
    >
      <div class="border-ink mb-4 flex items-center justify-between border-b-2 pb-3">
        <h3 class="text-base font-extrabold">
          {{ isEdit ? 'Edit Data Barang' : 'Tambah Barang Baru' }}
        </h3>
        <button @click="emit('close')" class="hover:text-card-coral p-1 text-gray-600">
          <X class="h-5 w-5" />
        </button>
      </div>

      <form @submit.prevent="emit('save')" class="space-y-3 text-xs font-bold">
        <div>
          <Label>SKU / Kode Barcode</Label>
          <div class="flex items-center gap-2">
            <Input
              v-model="form.sku"
              placeholder="Scan barcode fisik atau isi manual"
              class="font-mono"
            />
            <button
              type="button"
              @click="showScanner = true"
              class="neo-press border-ink bg-brand text-ink shadow-hard-sm shrink-0 rounded-xl border-2 p-2"
              title="Scan Barcode Fisik dengan Kamera"
            >
              <Camera class="h-4 w-4" />
            </button>
            <button
              type="button"
              @click="emit('regenerateSku')"
              class="neo-press border-ink bg-canvas text-ink shadow-hard-sm shrink-0 rounded-xl border-2 p-2"
              title="Buat SKU acak otomatis"
            >
              <RefreshCw class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <Label required>Kategori Produk</Label>
            <Select v-model="form.category" class="w-full">
              <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </Select>
          </div>
          <div>
            <Label required>Satuan Unit</Label>
            <Select v-model="form.unit" class="w-full">
              <option v-for="u in UNITS" :key="u" :value="u">{{ u }}</option>
            </Select>
          </div>
        </div>

        <div>
          <Label required>Nama Barang / Sembako</Label>
          <Input
            v-model="form.name"
            placeholder="Contoh: Minyak Goreng Kemasan 1L"
            :class="errors.name ? 'border-card-coral focus:ring-card-coral' : ''"
          />
          <p v-if="errors.name" class="text-card-coral mt-1 text-[11px] font-bold">
            {{ errors.name }}
          </p>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div>
            <Label required>HPP (Modal)</Label>
            <Input v-model.number="form.costPrice" type="number" min="0" />
          </div>
          <div>
            <Label required>Harga Jual</Label>
            <Input v-model.number="form.sellingPrice" type="number" min="0" />
          </div>
          <div>
            <Label required>Stok</Label>
            <Input v-model.number="form.stock" type="number" min="0" step="any" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <Label required>Batas Stok Minimal</Label>
            <Input v-model.number="form.minStock" type="number" min="0" step="any" />
          </div>
          <div>
            <Label>Foto Barang (opsional)</Label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              @change="handleFileChange"
              class="border-ink bg-canvas w-full rounded-xl border-2 p-1.5 text-xs font-bold"
            />
            <p v-if="imageSizeKb > 0" class="mt-0.5 text-[10px] text-gray-500">
              Ukuran foto: ~{{ imageSizeKb }} KB (dikompres otomatis)
            </p>
          </div>
        </div>

        <div class="border-ink mt-4 flex justify-end gap-2 border-t-2 pt-4">
          <Button type="button" variant="secondary" @click="emit('close')">Batal</Button>
          <Button type="submit" variant="primary">Simpan Barang</Button>
        </div>
      </form>
    </div>

    <BarcodeScannerModal
      :open="showScanner"
      @close="showScanner = false"
      @scan="handleScan"
    />
  </div>
</template>

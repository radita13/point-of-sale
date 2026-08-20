<script setup lang="ts">
import { ref } from 'vue';
import { X, RefreshCw, Camera, Package } from 'lucide-vue-next';
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

const showFormScanner = ref(false);

function handleScan(skuText: string) {
  props.form.sku = skuText.trim();
  showFormScanner.value = false;
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
      class="neo-scroll border-ink bg-surface shadow-hard-xl max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 p-5 sm:p-6"
    >
      <div class="border-ink mb-4 flex items-center justify-between border-b-2 pb-3">
        <h3 class="text-base font-extrabold">
          {{ isEdit ? 'Edit Data Barang' : 'Tambah Barang Baru' }}
        </h3>
        <button
          @click="emit('close')"
          class="hover:text-card-coral cursor-pointer p-1 text-gray-600"
        >
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
              @click="showFormScanner = true"
              class="neo-press border-ink bg-brand text-ink shadow-hard-sm shrink-0 cursor-pointer rounded-xl border-2 p-2"
              title="Scan Barcode Fisik dengan Kamera"
            >
              <Camera class="h-4 w-4" />
            </button>
            <button
              type="button"
              @click="emit('regenerateSku')"
              class="neo-press border-ink bg-canvas text-ink shadow-hard-sm shrink-0 cursor-pointer rounded-xl border-2 p-2"
              title="Buat SKU acak otomatis"
            >
              <RefreshCw class="h-4 w-4" />
            </button>
          </div>
          <p class="mt-1 text-[10px] font-semibold text-gray-500">
            Scan barcode fisik produk dengan kamera atau buat kode acak otomatis.
          </p>
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
            @input="errors.name = ''"
          />
          <p v-if="errors.name" class="text-card-coral mt-1 text-[11px] font-bold">
            {{ errors.name }}
          </p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label required>HPP (Modal)</Label>
            <Input
              v-model.number="form.costPrice"
              type="number"
              min="0"
              :class="errors.costPrice ? 'border-card-coral focus:ring-card-coral' : ''"
              @input="errors.costPrice = ''"
            />
            <p v-if="errors.costPrice" class="text-card-coral mt-1 text-[11px] font-bold">
              {{ errors.costPrice }}
            </p>
          </div>
          <div>
            <Label required class="text-brand">Harga Jual (Utuh)</Label>
            <Input
              v-model.number="form.sellingPrice"
              type="number"
              min="0"
              class="font-extrabold"
              :class="errors.sellingPrice ? 'border-card-coral focus:ring-card-coral' : ''"
              title="Harga per satuan besar (contoh: per bungkus)"
              @input="errors.sellingPrice = ''"
            />
            <p v-if="errors.sellingPrice" class="text-card-coral mt-1 text-[11px] font-bold">
              {{ errors.sellingPrice }}
            </p>
          </div>
          <div>
            <Label required>Stok</Label>
            <Input
              v-model.number="form.stock"
              type="number"
              min="0"
              step="0.01"
              :class="errors.stock ? 'border-card-coral focus:ring-card-coral' : ''"
              @input="errors.stock = ''"
            />
            <p v-if="errors.stock" class="text-card-coral mt-1 text-[11px] font-bold">
              {{ errors.stock }}
            </p>
          </div>
        </div>

        <!-- Tier Eceran (Optional) -->
        <div class="border-ink bg-canvas rounded-xl border-2 p-3">
          <p class="mb-2 text-[10px] font-extrabold tracking-wider text-gray-500 uppercase">
            Jual Eceran (per batang) — opsional
          </p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label>Batang per Satuan Utuh</Label>
              <Input
                v-model.number="form.piecesPerUnit"
                type="number"
                min="0"
                placeholder="cth: 12"
                :class="errors.piecesPerUnit ? 'border-card-coral focus:ring-card-coral' : ''"
                title="Berapa batang dalam 1 satuan utuh (1 bungkus = 12 batang). Kosongkan bila tidak jual eceran."
                @input="errors.piecesPerUnit = ''"
              />
              <p v-if="errors.piecesPerUnit" class="text-card-coral mt-1 text-[11px] font-bold">
                {{ errors.piecesPerUnit }}
              </p>
            </div>
            <div>
              <Label>Harga per Batang</Label>
              <Input
                v-model.number="form.smallPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="cth: 3000"
                :class="errors.smallPrice ? 'border-card-coral focus:ring-card-coral' : ''"
                title="Harga jual per batang (eceran)"
                @input="errors.smallPrice = ''"
              />
              <p v-if="errors.smallPrice" class="text-card-coral mt-1 text-[11px] font-bold">
                {{ errors.smallPrice }}
              </p>
            </div>
          </div>
          <p class="mt-1.5 text-[10px] font-semibold text-gray-500">
            Kosongkan "Batang per Satuan Utuh" agar produk dijual utuh saja. Saat diisi, kasir bisa
            jual per batang otomatis.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <Label required>Stok Minimal</Label>
            <Input
              v-model.number="form.minStock"
              type="number"
              min="0"
              :class="errors.minStock ? 'border-card-coral focus:ring-card-coral' : ''"
              @input="errors.minStock = ''"
            />
            <p v-if="errors.minStock" class="text-card-coral mt-1 text-[11px] font-bold">
              {{ errors.minStock }}
            </p>
          </div>
          <div>
            <Label>Satuan Kelipatan</Label>
            <Input
              v-model.number="form.step"
              type="number"
              min="0"
              step="0.01"
              title="Kelipatan qty tombol kiri kasir (cth: 0.5 untuk setengah kg, 2 untuk per 2 unit)"
            />
          </div>
        </div>

        <div class="border-ink bg-canvas flex items-center gap-3 rounded-xl border-2 p-3">
          <div
            class="border-ink flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-white"
          >
            <img v-if="form.image" :src="form.image" class="h-full w-full object-cover" />
            <Package v-else class="text-ink/30 h-6 w-6" />
          </div>
          <label
            class="neo-press border-ink hover:bg-canvas inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 bg-white px-3 py-2 text-xs font-extrabold"
          >
            {{ form.image ? 'Ganti Foto' : 'Unggah Foto...' }}
            <input type="file" accept="image/*" class="hidden" @change="handleFileChange" />
          </label>
          <span v-if="form.image" class="ml-auto text-[10px] font-bold text-gray-600">
            Terkompres: <b class="text-brand">{{ imageSizeKb }} KB</b>
          </span>
        </div>

        <div class="border-ink grid grid-cols-2 gap-2 border-t-2 pt-3">
          <Button type="button" variant="secondary" @click="emit('close')" class="cursor-pointer"
            >Batal</Button
          >
          <Button type="submit" variant="primary" class="cursor-pointer">{{
            isEdit ? 'Simpan Perubahan' : 'Tambah Barang'
          }}</Button>
        </div>
      </form>
    </div>

    <BarcodeScannerModal
      :open="showFormScanner"
      @close="showFormScanner = false"
      @scan="handleScan"
    />
  </div>
</template>

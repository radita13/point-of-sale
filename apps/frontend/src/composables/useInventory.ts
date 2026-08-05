import { ref, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import type { Product } from '@point-of-sale/shared';
import { productSyncSchema } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { makeUuid } from '@/db/seed';
import { useSyncStore } from '@/stores/sync';
import { useForm } from '@tanstack/vue-form';

export function useInventory() {
  const products = ref<Product[]>([]);
  const showModal = ref(false);
  const isEdit = ref(false);
  const form = ref<Product>(emptyForm());
  const deleteTarget = ref<Product | null>(null);
  const imageSizeKb = ref(0);

  const CATEGORIES = ['Beras & Minyak', 'Bumbu Dapur', 'Minuman', 'Rokok & Snack'];
  const UNITS = ['kg', 'pcs', 'liter', 'pak', 'saset'] as const;

  function emptyForm(): Product {
    return {
      id: makeUuid(),
      sku: '',
      name: '',
      category: CATEGORIES[0],
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
      minStock: 5,
      unit: 'pcs',
      isSynced: false,
      updatedAt: Date.now(),
    };
  }

  async function refresh() {
    products.value = (await db.products.orderBy('name').toArray()).filter((p) => !p.isDeleted);
  }

  async function refreshWithRestore() {
    if (navigator.onLine && (await db.products.count()) === 0) {
      await useSyncStore().restoreProductsFromServer();
    }
    await refresh();
  }

  onMounted(refreshWithRestore);

  const tanstackForm = useForm({
    defaultValues: emptyForm(),
    onSubmit: async ({ value }) => {
      const result = productSyncSchema.safeParse(value);
      if (!result.success) {
        toast.error(result.error.issues[0]?.message || 'Input produk tidak valid!');
        return;
      }
      const product = { ...value, updatedAt: Date.now(), isSynced: false } as Product;
      try {
        if (isEdit.value) {
          await db.products.put(product);
          toast.success(`Produk "${product.name}" diperbarui.`);
        } else {
          await db.products.add(product);
          toast.success(`Produk baru "${product.name}" ditambahkan.`);
        }
        closeModal();
        refresh();
      } catch (err) {
        toast.error(`Gagal menyimpan produk: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  async function generateSku(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const rand = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
      const sku = `SKU-${rand}`;
      if ((await db.products.where('sku').equals(sku).count()) === 0) return sku;
    }
    return `SKU-${Date.now().toString(36).toUpperCase()}`;
  }

  async function openAdd() {
    isEdit.value = false;
    const initial = { ...emptyForm(), sku: await generateSku() };
    form.value = initial;
    tanstackForm.reset(initial);
    imageSizeKb.value = 0;
    showModal.value = true;
  }

  async function regenerateSku() {
    const newSku = await generateSku();
    form.value.sku = newSku;
    tanstackForm.setFieldValue('sku', newSku);
  }

  function openEdit(p: Product) {
    isEdit.value = true;
    form.value = { ...p };
    tanstackForm.reset({ ...p });
    imageSizeKb.value = p.image ? formatImageSize(p.image) : 0;
    showModal.value = true;
  }

  function closeModal() {
    showModal.value = false;
  }

  function formatImageSize(dataUrl: string): number {
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
    const bytes = Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
    return Math.round((bytes / 1024) * 10) / 10;
  }

  async function compressImage(file: File): Promise<string> {
    let width = 0;
    let height = 0;
    let drawSource: CanvasImageSource;

    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      width = bmp.width;
      height = bmp.height;
      drawSource = bmp;
    } catch {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const el = new Image();
        el.onload = () => { URL.revokeObjectURL(url); resolve(el); };
        el.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal membaca file gambar')); };
        el.src = url;
      });
      width = img.width;
      height = img.height;
      drawSource = img;
    }

    const scale = Math.min(1, 800 / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas tidak didukung');
    ctx.drawImage(drawSource, 0, 0, w, h);
    if ('close' in drawSource && typeof drawSource.close === 'function') drawSource.close();

    const mime = canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
    let q = 0.75;
    let url = canvas.toDataURL(mime, q);
    while (q > 0.45 && Math.floor(((url.slice(url.indexOf(',') + 1).length * 3) / 4)) > 64 * 1024) {
      q = Math.max(0.45, q - 0.08);
      url = canvas.toDataURL(mime, q);
    }
    return url;
  }

  async function onImageFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      form.value.image = compressed;
      tanstackForm.setFieldValue('image', compressed);
      imageSizeKb.value = formatImageSize(compressed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat foto');
      form.value.image = undefined;
      tanstackForm.setFieldValue('image', undefined);
      imageSizeKb.value = 0;
    } finally {
      input.value = '';
    }
  }

  async function saveProduct() {
    await tanstackForm.handleSubmit();
  }

  function askDelete(p: Product) {
    deleteTarget.value = p;
  }

  async function executeDelete() {
    if (!deleteTarget.value) return;
    await db.products.update(deleteTarget.value.id, {
      isDeleted: true,
      isSynced: false,
      updatedAt: Date.now(),
    });
    toast.success(`Produk "${deleteTarget.value.name}" dihapus.`);
    deleteTarget.value = null;
    await refresh();
    await useSyncStore().refreshCount();
    if (navigator.onLine) await useSyncStore().runSync();
  }

  return {
    products,
    showModal,
    isEdit,
    form,
    deleteTarget,
    imageSizeKb,
    CATEGORIES,
    UNITS,
    openAdd,
    openEdit,
    closeModal,
    regenerateSku,
    onImageFile,
    saveProduct,
    askDelete,
    executeDelete,
  };
}

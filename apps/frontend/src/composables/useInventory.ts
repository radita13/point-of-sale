import { ref, onMounted, onUnmounted, reactive } from 'vue';
import { toast } from 'vue-sonner';
import type { Product } from '@point-of-sale/shared';
import { productSyncSchema } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { makeUuid } from '@/lib/utils';
import { useSyncStore } from '@/stores/sync';

import { PRODUCT_CATEGORIES as CATEGORIES, UNITS } from '@/constants/product';

export function useInventory() {
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

  const products = ref<Product[]>([]);
  const showModal = ref(false);
  const isEdit = ref(false);
  const form = reactive<Product>(emptyForm());
  const deleteTarget = ref<Product | null>(null);
  const imageSizeKb = ref(0);

  const errors = reactive<Record<string, string>>({
    name: '',
    sellingPrice: '',
    costPrice: '',
    stock: '',
    minStock: '',
    piecesPerUnit: '',
    smallPrice: '',
  });

  function clearErrors() {
    errors.name = '';
    errors.sellingPrice = '';
    errors.costPrice = '';
    errors.stock = '';
    errors.minStock = '';
    errors.piecesPerUnit = '';
    errors.smallPrice = '';
  }

  async function refresh() {
    products.value = (await db.products.toArray()).filter((p) => !p.isDeleted);
  }

  async function refreshWithRestore() {
    if (navigator.onLine && (await db.products.count()) === 0) {
      await useSyncStore().restoreProductsFromServer();
    }
    await refresh();
  }

  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    refreshWithRestore();
    unsubscribe = useSyncStore().onProductsUpdated(() => {
      refresh();
    });
  });

  onUnmounted(() => {
    if (unsubscribe) unsubscribe();
  });

  async function saveProduct() {
    clearErrors();
    let hasError = false;

    if (!form.name.trim()) {
      errors.name = 'Nama barang wajib diisi';
      hasError = true;
    }

    if (
      form.sellingPrice === undefined ||
      form.sellingPrice === null ||
      isNaN(form.sellingPrice) ||
      form.sellingPrice <= 0
    ) {
      errors.sellingPrice = 'Harga jual wajib diisi dan harus lebih dari 0';
      hasError = true;
    }

    if (form.costPrice !== undefined && form.costPrice !== null && form.costPrice < 0) {
      errors.costPrice = 'HPP tidak boleh negatif';
      hasError = true;
    }

    if (form.stock !== undefined && form.stock !== null && form.stock < 0) {
      errors.stock = 'Stok tidak boleh negatif';
      hasError = true;
    }

    if (form.minStock !== undefined && form.minStock !== null && form.minStock < 0) {
      errors.minStock = 'Stok minimal tidak boleh negatif';
      hasError = true;
    }

    if (
      form.piecesPerUnit !== undefined &&
      form.piecesPerUnit !== null &&
      form.piecesPerUnit > 0 &&
      form.piecesPerUnit <= 1
    ) {
      errors.piecesPerUnit = 'Isi eceran minimal 2 batang';
      hasError = true;
    }

    if (form.piecesPerUnit && form.piecesPerUnit > 1) {
      if (
        form.smallPrice === undefined ||
        form.smallPrice === null ||
        isNaN(form.smallPrice) ||
        form.smallPrice <= 0
      ) {
        errors.smallPrice = 'Harga per batang wajib diisi & > 0';
        hasError = true;
      }
    }

    if (hasError) {
      toast.error('Periksa kembali input yang belum diisi');
      return;
    }

    const product = { ...form } as Product;
    if (typeof product.stock === 'number') product.stock = Number(product.stock.toFixed(3));
    if (typeof product.minStock === 'number')
      product.minStock = Number(product.minStock.toFixed(3));
    if (typeof product.step === 'number') product.step = Number(product.step.toFixed(3));
    for (const key of ['step', 'piecesPerUnit', 'smallPrice'] as const) {
      const n = (product as unknown as Record<string, unknown>)[key];
      if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0)
        delete (product as unknown as Record<string, unknown>)[key];
    }
    if (product.image === null || product.image === '') delete product.image;
    if (product.step === null) delete product.step;
    if (product.piecesPerUnit === undefined || product.piecesPerUnit === null || product.piecesPerUnit <= 1) {
      delete product.piecesPerUnit;
      delete product.smallUnit;
      delete product.smallPrice;
    } else {
      product.smallUnit = 'bat';
    }
    const result = productSyncSchema.safeParse(product);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message || 'Input produk tidak valid!');
      return;
    }
    const saved = { ...product, updatedAt: Date.now(), isSynced: false } as Product;
    try {
      if (isEdit.value) {
        const nameExists = await db.products
          .filter(
            (p) =>
              !p.isDeleted &&
              p.id !== saved.id &&
              p.name.toLowerCase().trim() === saved.name.toLowerCase().trim()
          )
          .first();

        if (nameExists) {
          errors.name = `Nama "${saved.name}" sudah digunakan (SKU: ${nameExists.sku})`;
          toast.error(
            `Gagal: Nama "${saved.name}" sudah digunakan oleh produk lain (SKU: ${nameExists.sku})`
          );
          return;
        }

        await db.products.put(saved);
        toast.success(`Produk "${saved.name}" diperbarui.`);
      } else {
        const nameExists = await db.products
          .filter(
            (p) => !p.isDeleted && p.name.toLowerCase().trim() === saved.name.toLowerCase().trim()
          )
          .first();

        if (nameExists) {
          errors.name = `Produk "${saved.name}" sudah terdaftar (SKU: ${nameExists.sku})`;
          toast.error(`Gagal: Produk "${saved.name}" sudah terdaftar (SKU: ${nameExists.sku})`);
          return;
        }

        await db.products.add(saved);
        toast.success(`Produk baru "${saved.name}" ditambahkan.`);
      }
      closeModal();
      await refresh();
      await useSyncStore().refreshCount();
      if (navigator.onLine) useSyncStore().runSync();
    } catch (err) {
      toast.error(`Gagal menyimpan produk: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

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
    clearErrors();
    const initial = { ...emptyForm(), sku: await generateSku() };
    Object.assign(form, initial);
    imageSizeKb.value = 0;
    showModal.value = true;
  }

  async function regenerateSku() {
    form.sku = await generateSku();
  }

  function openEdit(p: Product) {
    isEdit.value = true;
    clearErrors();
    Object.assign(form, p);
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
        el.onload = () => {
          URL.revokeObjectURL(url);
          resolve(el);
        };
        el.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Gagal membaca file gambar'));
        };
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
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas tidak didukung');
    ctx.drawImage(drawSource, 0, 0, w, h);
    if ('close' in drawSource && typeof drawSource.close === 'function') drawSource.close();

    const mime = canvas.toDataURL('image/webp').startsWith('data:image/webp')
      ? 'image/webp'
      : 'image/jpeg';
    let q = 0.75;
    let url = canvas.toDataURL(mime, q);
    while (q > 0.45 && Math.floor((url.slice(url.indexOf(',') + 1).length * 3) / 4) > 64 * 1024) {
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
      form.image = compressed;
      imageSizeKb.value = formatImageSize(compressed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat foto');
      form.image = undefined;
      imageSizeKb.value = 0;
    } finally {
      input.value = '';
    }
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

  async function importCsv(file: File): Promise<{ success: number; failed: number }> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      throw new Error('File CSV kosong atau hanya berisi header');
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
    const nameIdx = headers.indexOf('name');
    const sellingPriceIdx = headers.indexOf('sellingprice');

    if (nameIdx === -1 || sellingPriceIdx === -1) {
      throw new Error('CSV wajib memiliki header "name" dan "sellingPrice"');
    }

    const categoryIdx = headers.indexOf('category');
    const costPriceIdx = headers.indexOf('costprice');
    const stockIdx = headers.indexOf('stock');
    const unitIdx = headers.indexOf('unit');
    const minStockIdx = headers.indexOf('minstock');
    const skuIdx = headers.indexOf('sku');
    const piecesPerUnitIdx = headers.indexOf('piecesperunit');
    const smallPriceIdx = headers.indexOf('smallprice');

    const allLocalProducts = (await db.products.toArray()).filter((p) => !p.isDeleted);
    const existingMapByName = new Map<string, Product>();
    const existingMapBySku = new Map<string, Product>();

    for (const p of allLocalProducts) {
      existingMapByName.set(p.name.toLowerCase().trim(), p);
      if (p.sku) existingMapBySku.set(p.sku.toLowerCase().trim(), p);
    }

    let successCount = 0;
    let failedCount = 0;
    const now = Date.now();
    const newProducts: Product[] = [];
    const updateProducts: Product[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      const name = cols[nameIdx];
      const sellingPrice = parseFloat(cols[sellingPriceIdx] || '0');

      if (!name || isNaN(sellingPrice) || sellingPrice < 0) {
        failedCount++;
        continue;
      }

      const inputSku = skuIdx !== -1 && cols[skuIdx] ? cols[skuIdx].trim() : '';
      const nameKey = name.toLowerCase().trim();
      const skuKey = inputSku.toLowerCase();

      const existing =
        existingMapByName.get(nameKey) || (skuKey ? existingMapBySku.get(skuKey) : undefined);

      const category = categoryIdx !== -1 && cols[categoryIdx] ? cols[categoryIdx] : CATEGORIES[0];
      const costPrice = costPriceIdx !== -1 ? parseFloat(cols[costPriceIdx] || '0') : 0;
      const unit = unitIdx !== -1 && cols[unitIdx] ? (cols[unitIdx] as any) : 'pcs';
      const minStock = minStockIdx !== -1 ? parseFloat(cols[minStockIdx] || '5') : 5;
      const piecesPerUnit =
        piecesPerUnitIdx !== -1 ? parseInt(cols[piecesPerUnitIdx] || '0', 10) : undefined;
      const smallPrice = smallPriceIdx !== -1 ? parseFloat(cols[smallPriceIdx] || '0') : undefined;

      if (existing) {
        const updatedProduct: Product = {
          ...existing,
          name,
          category,
          costPrice: isNaN(costPrice) ? existing.costPrice : costPrice,
          sellingPrice,
          minStock: isNaN(minStock) ? existing.minStock : minStock,
          unit,
          isSynced: false,
          updatedAt: now,
        };

        if (inputSku) updatedProduct.sku = inputSku;

        if (piecesPerUnit && piecesPerUnit > 1 && smallPrice && smallPrice > 0) {
          updatedProduct.piecesPerUnit = piecesPerUnit;
          updatedProduct.smallUnit = 'bat';
          updatedProduct.smallPrice = smallPrice;
        } else {
          delete updatedProduct.piecesPerUnit;
          delete updatedProduct.smallUnit;
          delete updatedProduct.smallPrice;
        }

        updateProducts.push(updatedProduct);
      } else {
        const sku = inputSku || (await generateSku());
        const stock = stockIdx !== -1 ? parseFloat(cols[stockIdx] || '0') : 0;

        const newP: Product = {
          id: makeUuid(),
          sku,
          name,
          category,
          costPrice: isNaN(costPrice) ? 0 : costPrice,
          sellingPrice,
          stock: isNaN(stock) ? 0 : stock,
          minStock: isNaN(minStock) ? 5 : minStock,
          unit,
          isSynced: false,
          updatedAt: now,
        };

        if (piecesPerUnit && piecesPerUnit > 1 && smallPrice && smallPrice > 0) {
          newP.piecesPerUnit = piecesPerUnit;
          newP.smallUnit = 'bat';
          newP.smallPrice = smallPrice;
        }

        newProducts.push(newP);
        existingMapByName.set(nameKey, newP);
        if (sku) existingMapBySku.set(sku.toLowerCase().trim(), newP);
      }

      successCount++;
    }

    if (newProducts.length > 0) {
      await db.products.bulkAdd(newProducts);
    }
    if (updateProducts.length > 0) {
      await db.products.bulkPut(updateProducts);
    }

    if (newProducts.length > 0 || updateProducts.length > 0) {
      await refresh();
      await useSyncStore().refreshCount();
      if (navigator.onLine) useSyncStore().runSync();
    }

    return { success: successCount, failed: failedCount };
  }

  function downloadCsvTemplate() {
    const csvContent =
      'name,category,sellingPrice,costPrice,stock,unit,minStock,sku,piecesPerUnit,smallPrice\n' +
      'Aqua 1.5L,Minuman,7000,0,10,pcs,5,SEM-001,,\n' +
      'Gula Pasir 1/2kg,Bumbu Dapur,12000,0,10,pcs,5,SEM-002,,\n' +
      'Mie Sedaap All Variant,Makanan & Snack,4000,0,10,pcs,5,SEM-003,,\n' +
      'Rokok Gudang Garam Surya,Rokok,40000,0,10,pak,2,SEM-004,16,2500\n' +
      'Sweety Pants Popok XL,Kebutuhan Harian,3000,0,10,pcs,5,SEM-005,,';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_katalog_produk.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    products,
    showModal,
    isEdit,
    form,
    errors,
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
    importCsv,
    downloadCsvTemplate,
  };
}

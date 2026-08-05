-- Hapus kolom barcode dari produk (fitur barcode dihapus total;
-- penggantinya SKU yang dibuat otomatis di kasir).
ALTER TABLE "products" DROP COLUMN IF EXISTS "barcode";

-- Hapus fitur diskon (di-hold V1). QRIS tidak pernah jadi kolom terpisah;
-- nilai paymentMethod disimpan sebagai string, sehingga tidak ada migrasi QRIS.
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "discount";
-- Tambah kolom step (increment tombol kasir ; default 1).
ALTER TABLE "products" ADD COLUMN "step" DECIMAL(12, 3) DEFAULT 1;

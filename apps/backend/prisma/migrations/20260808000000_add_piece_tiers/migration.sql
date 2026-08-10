-- Tier eceran: isi per satuan besar (piecesPerUnit), satuan kecil, harga per bagian.
ALTER TABLE "products" ADD COLUMN "piecesPerUnit" INTEGER;
ALTER TABLE "products" ADD COLUMN "smallUnit" TEXT;
ALTER TABLE "products" ADD COLUMN "smallPrice" DECIMAL(12, 2);

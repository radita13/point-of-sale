-- Tambah kolom ownerId (Supabase user UUID) untuk tenant isolation antar toko.
-- null = store belum diklaim; user pertama yang mengakses akan diklaim sebagai
-- pemilik (model V1: satu pengguna, satu toko).
ALTER TABLE "Store" ADD COLUMN "ownerId" UUID;

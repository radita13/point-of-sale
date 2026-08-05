-- Snapshot HPP/modal per item transaksi (kolom costPrice) agar laporan
-- laba kotor tetap akurat bahkan setelah data dipulihkan dari server.
ALTER TABLE "transaction_items" ADD COLUMN "costPrice" DECIMAL(12, 2);
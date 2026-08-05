import type { Product, Unit } from '@point-of-sale/shared';
import { db } from './database';

export function makeUuid(): string {
  const u = crypto.randomUUID();
  return u;
}

// id = UUID deterministik, harus SAMA dengan serverId di `apps/backend/prisma/seed.ts`
// agar Product.serverId == Product.id FE → referensi transaksi & inventory cocok saat sync.
const seedProducts: Array<Omit<Product, 'updatedAt'> & { id: string }> = [
{ id: '0448e272-057e-4439-a574-31cc818425bd', sku: 'SEM-001', name: 'Minyak Goreng Curah', category: 'Beras & Minyak', costPrice: 13500, sellingPrice: 15500, stock: 12.5, minStock: 5, unit: 'kg', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop&q=80' },
  { id: '61e5230e-08a4-4865-b833-a167f655787d', sku: 'SEM-002', name: 'Gula Pasir Laris', category: 'Bumbu Dapur', costPrice: 14500, sellingPrice: 17000, stock: 3.0, minStock: 5, unit: 'kg', image: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=300&auto=format&fit=crop&q=80' },
  { id: '57d09c74-7420-4e4e-825d-10c6744edd15', sku: 'SEM-003', name: 'Kopi Saset Mantap', category: 'Minuman', costPrice: 1200, sellingPrice: 1500, stock: 48, minStock: 10, unit: 'pcs', image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80' },
  { id: '301318a1-7f63-48f2-96c3-ae8b7ba88b1d', sku: 'SEM-004', name: 'Beras Medium Ramos', category: 'Beras & Minyak', costPrice: 11000, sellingPrice: 13000, stock: 45.0, minStock: 10, unit: 'kg', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80' },
  { id: '37bf8d1a-ce97-4863-ab14-0d46a46307c8', sku: 'SEM-005', name: 'Tepung Terigu Segitiga', category: 'Bumbu Dapur', costPrice: 9500, sellingPrice: 11500, stock: 2.5, minStock: 4, unit: 'kg', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80' },
  { id: 'b6aa24ce-3f05-46b8-a3b2-48e08d7a29d8', sku: 'SEM-006', name: 'Teh Celup Celup', category: 'Minuman', costPrice: 4500, sellingPrice: 6000, stock: 20, minStock: 5, unit: 'pak', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop&q=80' },
  { id: 'd1c78b2c-1f01-4b99-8b29-386faa171f9f', sku: 'SEM-007', name: 'Telur Ayam Negeri', category: 'Beras & Minyak', costPrice: 24000, sellingPrice: 27500, stock: 15.0, minStock: 5, unit: 'kg', image: 'https://images.unsplash.com/photo-1582722872444-44dc5f7e3c8f?w=300&auto=format&fit=crop&q=80' },
  { id: 'c4fd4c3e-0806-475c-9017-740960a63923', sku: 'SEM-008', name: 'Mie Instan Goreng', category: 'Rokok & Snack', costPrice: 2800, sellingPrice: 3200, stock: 120, minStock: 20, unit: 'pcs', image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&auto=format&fit=crop&q=80' },
];

/** Seed katalog hanya jika tabel kosong. */
export async function seedProductsIfEmpty(): Promise<void> {
  const count = await db.products.count();
  if (count > 0) return;
  const now = Date.now();
  const rows: Product[] = seedProducts.map((p) => ({
    id: p.id ?? makeUuid(),
    sku: p.sku,
    name: p.name,
    category: p.category,
    costPrice: p.costPrice,
    sellingPrice: p.sellingPrice,
    stock: p.stock,
    minStock: p.minStock,
    unit: p.unit as Unit,
    image: p.image,
    // Sudah ada di server (seed backend punya serverId yang sama) —
    // jangan dikirim ulang agar stok server tidak di-reset ke nilai seed.
    isSynced: true,
    updatedAt: now,
  }));
  await db.products.bulkAdd(rows);
}
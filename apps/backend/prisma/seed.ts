// Prisma seed: Point of Sale (Supabase Postgres).
// Jalankan via `prisma db seed`. Idempoten: tidak duplikat store.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STORE_ID = '11111111-1111-4111-8111-111111111111'; // store tetap

// serverId = UUID lokal yang sama persis dengan seed FE `apps/frontend/src/db/seed.ts`,
// sehingga id produk (sync & inventory adjustment) cocok antara HP kasir dan server.
const PRODUCTS = [
  {
    serverId: '0448e272-057e-4439-a574-31cc818425bd',
    sku: 'SEM-001',
    name: 'Minyak Goreng Curah',
    category: 'Beras & Minyak',
    costPrice: 13500,
    sellingPrice: 15500,
    stock: 12.5,
    minStock: 5,
    unit: 'kg',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop&q=80',
  },
  {
    serverId: '61e5230e-08a4-4865-b833-a167f655787d',
    sku: 'SEM-002',
    name: 'Gula Pasir Laris',
    category: 'Bumbu Dapur',
    costPrice: 14500,
    sellingPrice: 17000,
    stock: 3.0,
    minStock: 5,
    unit: 'kg',
    image: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=300&auto=format&fit=crop&q=80',
  },
  {
    serverId: '57d09c74-7420-4e4e-825d-10c6744edd15',
    sku: 'SEM-003',
    name: 'Kopi Saset Mantap',
    category: 'Minuman',
    costPrice: 1200,
    sellingPrice: 1500,
    stock: 48,
    minStock: 10,
    unit: 'pcs',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80',
  },
  {
    serverId: '301318a1-7f63-48f2-96c3-ae8b7ba88b1d',
    sku: 'SEM-004',
    name: 'Beras Medium Ramos',
    category: 'Beras & Minyak',
    costPrice: 11000,
    sellingPrice: 13000,
    stock: 45.0,
    minStock: 10,
    unit: 'kg',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80',
  },
  {
    serverId: '37bf8d1a-ce97-4863-ab14-0d46a46307c8',
    sku: 'SEM-005',
    name: 'Tepung Terigu Segitiga',
    category: 'Bumbu Dapur',
    costPrice: 9500,
    sellingPrice: 11500,
    stock: 2.5,
    minStock: 4,
    unit: 'kg',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80',
  },
  {
    serverId: 'b6aa24ce-3f05-46b8-a3b2-48e08d7a29d8',
    sku: 'SEM-006',
    name: 'Teh Celup Celup',
    category: 'Minuman',
    costPrice: 4500,
    sellingPrice: 6000,
    stock: 20,
    minStock: 5,
    unit: 'pak',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop&q=80',
  },
  {
    serverId: 'd1c78b2c-1f01-4b99-8b29-386faa171f9f',
    sku: 'SEM-007',
    name: 'Telur Ayam Negeri',
    category: 'Beras & Minyak',
    costPrice: 24000,
    sellingPrice: 27500,
    stock: 15.0,
    minStock: 5,
    unit: 'kg',
    image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c87?w=300&auto=format&fit=crop&q=80',
  },
  {
    serverId: 'c4fd4c3e-0806-475c-9017-740960a63923',
    sku: 'SEM-008',
    name: 'Mie Instan Goreng',
    category: 'Rokok & Snack',
    costPrice: 2800,
    sellingPrice: 3200,
    stock: 120,
    minStock: 20,
    unit: 'pcs',
    image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&auto=format&fit=crop&q=80',
  },
];

async function main() {
  const store = await prisma.store.upsert({
    where: { id: STORE_ID },
    update: {
      name: 'Toko Sembako Sumber Rejeki',
      description: 'Warung sembako POS utama',
    },
    create: {
      id: STORE_ID,
      name: 'Toko Sembako Sumber Rejeki',
      description: 'Warung sembako POS utama',
    },
  });
  console.log(`✓ Store: ${store.name} (${store.id})`);

  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { serverId: p.serverId },
      update: {
        sku: p.sku,
        name: p.name,
        category: p.category,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        stock: p.stock,
        minStock: p.minStock,
        unit: p.unit,
        image: p.image,
        storeId: STORE_ID,
      },
      create: {
        id: p.serverId,
        serverId: p.serverId,
        sku: p.sku,
        name: p.name,
        category: p.category,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        stock: p.stock,
        minStock: p.minStock,
        unit: p.unit,
        image: p.image,
        storeId: STORE_ID,
      },
    });
  }
  console.log(`✓ Seed ${PRODUCTS.length} produk untuk store ${STORE_ID}.`);
}

main()
  .then(() => console.log('Seed selesai.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
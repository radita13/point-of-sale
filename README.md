<div align="center">

<img src="./apps/frontend/public/icon-512.svg" alt="Point of Sale logo" width="96" height="96" />

# Point of Sale (POS)

Offline-first Progressive Web App (PWA) cash register designed for retail stores and grocery shops.  
_Aplikasi kasir Progressive Web App (PWA) offline-first untuk toko kelontong dan ritel._

[![Node version](https://img.shields.io/badge/Node.js->=20-3c873a?style=flat-square)](https://nodejs.org)
[![pnpm version](https://img.shields.io/badge/pnpm->=9-f69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4fc08d?style=flat-square&logo=vuejs&logoColor=white)](https://vuejs.org)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io)

**[English](#english)** • **[Bahasa Indonesia](#bahasa-indonesia)**

</div>

---

<a name="english"></a>

## English

> [!NOTE]
> This application runs 100% offline using client-side IndexedDB (`Dexie.js`). Transactions and catalogue edits are persisted locally first, then synced to the PostgreSQL backend when network connectivity is available.

### Features

- **Offline-First Cashier**: Process sales without internet latency. Transactions are stored locally in IndexedDB and synced in batches when online.
- **Dual-Tier Pricing & Decimal Units**: Support bulk and retail pricing per item (e.g. pack vs single piece), with fractional quantities (`kg`, `liter`, `pcs`, `sachet`).
- **Barcode Scanner**: In-browser camera scanning via `html5-qrcode` alongside physical USB scanner input.
- **ESC/POS Thermal Receipt Printing**: Direct Bluetooth receipt printing from the browser using the Web Bluetooth API.
- **Visual Stock Opname**: Real-time stock counts, threshold alerts (`SAFE`, `LOW`, `EMPTY`), soft-deletion safeguards, and CSV catalogue import/export.
- **Reports & Analytics**: Real-time turnover, COGS (`costPrice`) profit calculations, top-selling products, and historical filtering.
- **AI Assistant**: Google Gemini-powered promotion generator for marketing drafts and customer messaging.

### Architecture

```
point-of-sale/
├── apps/
│   ├── frontend/         # Vue 3, Vite, Pinia, Tailwind CSS v4, Dexie.js, TanStack Suite
│   └── backend/          # Express.js, TypeScript, Prisma ORM, Supabase Auth (JWT)
└── packages/
    └── shared/           # Shared domain types and Zod validation schemas
```

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Vue 3 (Composition API), Vite, `vite-plugin-pwa`, Pinia, Tailwind CSS v4 |
| **Local Storage & State** | Dexie.js v4 (IndexedDB), `@tanstack/vue-query`, `@tanstack/vue-table`, `@tanstack/vue-form` |
| **Backend API** | Node.js (>=20), Express.js, TypeScript |
| **Database & Auth** | PostgreSQL, Prisma ORM, Supabase Auth (JWT Bearer tokens) |
| **AI Integration** | `@google/genai` (Google Gemini) |

#### Core Architectural Decisions

1. **Offline-First Data Pipeline**:
   - Client writes directly to IndexedDB (`Dexie.js`) via optimistic updates.
   - PUSH sync: local unsynced transactions (`isSynced === false`) are sent in batches (up to 100 items) to `/api/v1/transactions/sync`. Invalid transactions are skipped without blocking the batch.
   - PULL sync: delta fetch retrieves product updates since `lastProductPullAt` timestamp (`/api/v1/products/sync?since=...`).
   - Local housekeeping: synced transactions older than 6 months are automatically pruned from client storage.

2. **Access Control & RBAC**:
   - Dual interface modes: **Owner Mode** (full store settings, inventory, reporting, AI assistant) vs. **Cashier Mode** (restricted to cashier register and stock counts, protected by PIN).
   - Backend routes guarded via Supabase JWT Bearer token and store tenant verification (`Store.ownerId`).

3. **Decimal Quantity & Dual-Tier Pricing**:
   - Stock and quantities use IEEE 754 float / `Float` with step increments (`kg`, `liter`, `meter`).
   - Monies and pricing use PostgreSQL `Decimal(12,2)` / `Decimal(14,2)` to prevent round-off errors.
   - Dual-tier: single SKU supports package price and subdivided unit price (`piecesPerUnit`, `smallUnit`, `smallPrice`).

### Getting Started

#### Prerequisites

- [Node.js](https://nodejs.org/) `>= 20.0.0`
- [pnpm](https://pnpm.io/) `>= 9.0.0`
- PostgreSQL 15+ (local or Supabase)

#### Quick Start

```bash
# 1. Clone & install dependencies
git clone <your-repo-url>
cd point-of-sale
pnpm install

# 2. Setup environment variables
cp .env.example apps/backend/.env
# Configure apps/backend/.env and apps/frontend/.env

# 3. Build shared types & schemas
pnpm --filter @point-of-sale/shared build

# 4. Generate Prisma Client & run migrations
pnpm --filter @point-of-sale/backend prisma:generate
pnpm --filter @point-of-sale/backend prisma:migrate

# 5. Start development servers (FE: 5173, BE: 4000)
pnpm dev
```

---

<a name="bahasa-indonesia"></a>

## Bahasa Indonesia

> [!NOTE]
> Aplikasi ini dapat beroperasi 100% tanpa internet menggunakan IndexedDB lokal (`Dexie.js`). Transaksi dan pembaruan katalog disimpan secara lokal terlebih dahulu, lalu disinkronkan ke server PostgreSQL saat koneksi internet tersedia.

### Fitur Utama

- **Kasir Offline-First**: Proses transaksi instan tanpa latensi jaringan. Data disimpan di IndexedDB dan disinkronkan otomatis saat kembali online.
- **Dual-Tier Harga & Unit Desimal**: Mendukung 2 tier harga (harga grosir/pak vs eceran) serta takaran desimal (`kg`, `liter`, `pcs`, `saset`).
- **Pemindai Barcode**: Pindai barcode langsung menggunakan kamera perangkat via `html5-qrcode` maupun barcode scanner USB fisik.
- **Cetak Struk Thermal**: Hubungkan langsung ke printer thermal Bluetooth dari browser melalui Web Bluetooth API (ESC/POS).
- **Stok Opname Visual**: Penyesuaian persediaan fisik, indikator status stok (`AMAN`, `MENIPIS`, `HABIS`), proteksi _soft-delete_, serta import CSV katalog.
- **Laporan & Analisis Laba**: Metrik omset real-time, estimasi profit berbasis HPP (`costPrice`), produk terlaris, dan riwayat transaksi.
- **Asisten AI**: Pembuat draf promosi WhatsApp dan pesan pelanggan otomatis ditenagai Google Gemini.

### Arsitektur

```
point-of-sale/
├── apps/
│   ├── frontend/         # Vue 3, Vite, Pinia, Tailwind CSS v4, Dexie.js, TanStack Suite
│   └── backend/          # Express.js, TypeScript, Prisma ORM, Supabase Auth (JWT)
└── packages/
    └── shared/           # Shared TypeScript domain types & skema validasi Zod
```

| Lapisan | Teknologi |
| :--- | :--- |
| **Frontend** | Vue 3 (Composition API), Vite, `vite-plugin-pwa`, Pinia, Tailwind CSS v4 |
| **Penyimpanan Lokal & State** | Dexie.js v4 (IndexedDB), `@tanstack/vue-query`, `@tanstack/vue-table`, `@tanstack/vue-form` |
| **Backend API** | Node.js (>=20), Express.js, TypeScript |
| **Database & Autentikasi** | PostgreSQL, Prisma ORM, Supabase Auth (JWT Bearer tokens) |
| **Integrasi AI** | `@google/genai` (Google Gemini) |

#### Keputusan Inti Arsitektur

1. **Pipeline Data Offline-First**:
   - Klien menulis langsung ke IndexedDB (`Dexie.js`) via pembaruan optimistis.
   - Sinkronisasi PUSH: transaksi lokal yang belum sinkron (`isSynced === false`) dikirim dalam batch (maksimal 100 item) ke `/api/v1/transactions/sync`. Transaksi tidak valid dilewati tanpa memblokir batch.
   - Sinkronisasi PULL: pembaruan katalog ditarik secara delta berdasarkan cap waktu `lastProductPullAt` (`/api/v1/products/sync?since=...`).
   - Pembersihan lokal: transaksi yang sudah tersinkron dan berusia lewat 6 bulan dihapus otomatis dari penyimpanan perangkat.

2. **Kontrol Akses & RBAC**:
   - Dua mode antarmuka: **Owner Mode** (pengaturan toko, inventaris, laporan, asisten AI) vs. **Cashier Mode** (dibatasi pada modul kasir dan hitung stok, dilindungi PIN).
   - Rute backend diamankan via token Supabase JWT Bearer dan verifikasi tenant toko (`Store.ownerId`).

3. **Kuantitas Desimal & Harga Dual-Tier**:
   - Stok dan kuantitas memakai tipe float IEEE 754 / `Float` dengan langkah bertahap (`kg`, `liter`, `meter`).
   - Uang dan harga memakai `Decimal(12,2)` / `Decimal(14,2)` PostgreSQL untuk mencegah kesalahan pembulatan.
   - Dual-tier: satu SKU mendukung harga kemasan dan harga satuan eceran (`piecesPerUnit`, `smallUnit`, `smallPrice`).

### Panduan Memulai

#### Prasyarat

- [Node.js](https://nodejs.org/) `>= 20.0.0`
- [pnpm](https://pnpm.io/) `>= 9.0.0`
- PostgreSQL 15+ (lokal atau Supabase)

#### Langkah Pemasangan

```bash
# 1. Klon repositori & pasang dependensi
git clone <your-repo-url>
cd point-of-sale
pnpm install

# 2. Siapkan variabel lingkungan
cp .env.example apps/backend/.env
# Sesuaikan apps/backend/.env dan apps/frontend/.env

# 3. Build paket shared
pnpm --filter @point-of-sale/shared build

# 4. Generate Prisma Client & jalankan migrasi
pnpm --filter @point-of-sale/backend prisma:generate
pnpm --filter @point-of-sale/backend prisma:migrate

# 5. Jalankan server pengembangan (FE: 5173, BE: 4000)
pnpm dev
```

---

## Environment Variables / Variabel Lingkungan

### Backend (`apps/backend/.env`)

```env
DATABASE_URL=postgresql://user:password@host:5432/postgres
DIRECT_URL=postgresql://user:password@host:5432/postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_JWT_SECRET=<jwt-secret>
CORS_ORIGINS=http://localhost:5173,http://localhost:4000
PORT=4000
GEMINI_API_KEY=<gemini-api-key>
```

### Frontend (`apps/frontend/.env`)

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

---

## Development Scripts / Perintah Pengembangan

| Command / Perintah                                   | Description / Deskripsi                                               |
| :--------------------------------------------------- | :-------------------------------------------------------------------- |
| `pnpm dev`                                           | Run all applications concurrently / Jalankan seluruh aplikasi paralel |
| `pnpm build`                                         | Build all packages and applications / Build seluruh paket aplikasi    |
| `pnpm typecheck`                                     | Run type checking across workspaces / Jalankan pengecekan tipe data   |
| `pnpm --filter @point-of-sale/backend prisma:studio` | Open Prisma Studio GUI / Buka antarmuka Prisma Studio                 |

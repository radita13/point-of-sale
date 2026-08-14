# Point of Sale (POS) PWA Monorepo

Aplikasi kasir Point of Sale (POS) berbasis **Progressive Web App (PWA)** dengan pendekatan **Offline-First**, dirancang khusus untuk operasional warung sembako dan toko ritel.

---

## ⚡ Fitur Utama

- **Offline-First Architecture**: 100% dapat beroperasi penuh tanpa jaringan internet (menggunakan Dexie.js / IndexedDB).
- **Kuantitas Desimal**: Mendukung komoditas eceran (kg, liter, gram).
- **Background Sync**: Otomatis mentransfer data transaksi ke cloud saat internet kembali online.
- **Cetak Struk Thermal**: Dukungan cetak struk via Web Bluetooth API.
- **Visual Stock Opname**: Penyesuaian stok real-time dengan proteksi kesalahan input.

---

## 🛠️ Tech Stack

- **Monorepo**: pnpm Workspaces
- **Frontend (`apps/frontend`)**: Vue 3, Vite, Pinia, Tailwind CSS, Dexie.js, `@tanstack/vue-query`, `@tanstack/vue-table`, `@tanstack/vue-form`
- **Backend (`apps/backend`)**: Express.js, TypeScript, Prisma ORM, PostgreSQL, Supabase Auth (JWT)
- **Shared (`packages/shared`)**: Shared types & Zod validation schemas

---

## 🚀 Panduan Memulai (Quick Start)

### Prasyarat
- **Node.js**: `>= 20`
- **pnpm**: `>= 9`

### Pemasangan & Jalankan

```bash
# 1. Install seluruh dependensi
pnpm install

# 2. Build package shared
pnpm --filter @point-of-sale/shared build

# 3. Jalankan environment pengembangan (FE + BE paralel)
pnpm dev
```

---

## 🔒 Lisensi

Proprietary / All Rights Reserved.

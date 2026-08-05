import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import './auth.js';

/**
 * Pastikan `storeId` adalah milik user yang terautentikasi (req.auth.sub).
 * Isolasi tenant: tanpa ini, siapa pun dengan JWT valid bisa membaca/menulis
 * toko mana pun hanya dengan menebak storeId.
 *
 * Bila store belum punya pemilik (ownerId null) — instalasi baru — user pertama
 * yang mengakses dianggap pemilik (first-adopter). Cocok dengan model V1:
 * satu pengguna, satu toko (multi-user / multi-outlet = V2).
 *
 * Mengembalikan false (dan sudah menulis respons error) saat akses ditolak.
 */
export async function requireStoreAccess(
  req: any,
  res: any,
  storeId: string,
): Promise<boolean> {
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  if (!storeId) {
    res.status(400).json({ error: 'storeId wajib diisi' });
    return false;
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    res.status(404).json({ error: `Store dengan ID ${storeId} tidak ditemukan` });
    return false;
  }

  if (store.ownerId === null) {
    // Klaim pertama: user yang mengakses pertama kali jadi pemilik.
    await prisma.store.update({ where: { id: storeId }, data: { ownerId: sub } });
    return true;
  }

  if (store.ownerId !== sub) {
    res.status(403).json({ error: 'Forbidden: Anda bukan pemilik toko ini' });
    return false;
  }

  return true;
}

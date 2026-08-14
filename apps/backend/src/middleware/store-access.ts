import { prisma } from "../db.js";
import "./auth.js";

export async function requireStoreAccess(
  req: any,
  res: any,
  storeId: string,
): Promise<boolean> {
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  if (!storeId) {
    res.status(400).json({ error: "storeId wajib diisi" });
    return false;
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    res
      .status(404)
      .json({ error: `Store dengan ID ${storeId} tidak ditemukan` });
    return false;
  }

  if (store.ownerId === null) {
    const claimed = await prisma.store.updateMany({
      where: { id: storeId, ownerId: null },
      data: { ownerId: sub },
    });
    if (claimed.count > 0) return true;
    const rechecked = await prisma.store.findUnique({ where: { id: storeId } });
    if (rechecked?.ownerId !== sub) {
      res.status(403).json({ error: "Forbidden: Anda bukan pemilik toko ini" });
      return false;
    }
    return true;
  }

  if (store.ownerId !== sub) {
    res.status(403).json({ error: "Forbidden: Anda bukan pemilik toko ini" });
    return false;
  }

  return true;
}

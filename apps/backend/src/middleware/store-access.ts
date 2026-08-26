import { prisma } from "../db.js";
import "./auth.js";

export async function requireStoreAccess(
  req: any,
  res: any,
  providedStoreId?: string,
): Promise<{ ok: boolean; storeId?: string }> {
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: "Unauthorized" });
    return { ok: false };
  }

  let targetStoreId = providedStoreId;

  if (!targetStoreId) {
    let store = await prisma.store.findFirst({
      where: { ownerId: sub },
    });

    if (!store) {
      const unownedStore = await prisma.store.findFirst({
        where: { ownerId: null },
      });

      if (unownedStore) {
        store = await prisma.store.update({
          where: { id: unownedStore.id },
          data: { ownerId: sub },
        });
      } else {
        const ownerEmail = req.auth?.email ?? "User";
        const storeName = `Toko ${ownerEmail.split("@")[0]}`;
        store = await prisma.store.create({
          data: {
            name: storeName,
            ownerId: sub,
          },
        });
      }
    }
    targetStoreId = store.id;
  }

  // Verifikasi kepemilikan store
  const store = await prisma.store.findUnique({ where: { id: targetStoreId } });
  if (!store) {
    res
      .status(404)
      .json({ error: `Store dengan ID ${targetStoreId} tidak ditemukan` });
    return { ok: false };
  }

  if (store.ownerId === null) {
    const claimed = await prisma.store.updateMany({
      where: { id: targetStoreId, ownerId: null },
      data: { ownerId: sub },
    });
    if (claimed.count > 0) return { ok: true, storeId: targetStoreId };
    const rechecked = await prisma.store.findUnique({
      where: { id: targetStoreId },
    });
    if (rechecked?.ownerId !== sub) {
      res.status(403).json({ error: "Forbidden: Anda bukan pemilik toko ini" });
      return { ok: false };
    }
    return { ok: true, storeId: targetStoreId };
  }

  if (store.ownerId !== sub) {
    res.status(403).json({ error: "Forbidden: Anda bukan pemilik toko ini" });
    return { ok: false };
  }

  return { ok: true, storeId: targetStoreId };
}

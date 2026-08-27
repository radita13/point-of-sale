import type { Request, Response } from "express";
import { prisma } from "../db";
import type { Store } from "../generated/client";
import "./auth";

/**
 * Resolves an existing store owned by the user, claims an unowned store,
 * or creates a default store for the authenticated user.
 */
export async function resolveOrCreateUserStore(
  userId: string,
  userEmail?: string,
): Promise<Store> {
  let store = await prisma.store.findFirst({
    where: { ownerId: userId },
  });

  if (!store) {
    const unownedStore = await prisma.store.findFirst({
      where: { ownerId: null },
    });

    if (unownedStore) {
      store = await prisma.store.update({
        where: { id: unownedStore.id },
        data: { ownerId: userId },
      });
    } else {
      const email = userEmail ?? "User";
      const storeName = `Toko ${email.split("@")[0]}`;
      store = await prisma.store.create({
        data: {
          name: storeName,
          ownerId: userId,
        },
      });
    }
  }

  return store;
}

export async function requireStoreAccess(
  req: Request,
  res: Response,
  providedStoreId?: string,
): Promise<{ ok: boolean; storeId?: string }> {
  const sub = req.auth?.sub;
  if (!sub) {
    res.status(401).json({ error: "Unauthorized" });
    return { ok: false };
  }

  let targetStoreId = providedStoreId;

  if (!targetStoreId) {
    const store = await resolveOrCreateUserStore(sub, req.auth?.email ?? undefined);
    targetStoreId = store.id;
  }

  // Verify store access and ownership
  const store = await prisma.store.findUnique({ where: { id: targetStoreId } });
  if (!store) {
    res
      .status(404)
      .json({ error: `Store with ID ${targetStoreId} not found` });
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
      res.status(403).json({ error: "Forbidden: You are not the owner of this store" });
      return { ok: false };
    }
    return { ok: true, storeId: targetStoreId };
  }

  if (store.ownerId !== sub) {
    res.status(403).json({ error: "Forbidden: You are not the owner of this store" });
    return { ok: false };
  }

  return { ok: true, storeId: targetStoreId };
}

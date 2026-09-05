import type { Response } from "express";
import type { ValidatedRequest } from "../types/http";
import { resolveOrCreateUserStore } from "../middleware/store-access";
import { prisma } from "../db";
import type { UpdateStorePayload } from "@point-of-sale/shared";

export async function getMyStore(
  req: ValidatedRequest,
  res: Response,
): Promise<void | Response> {
  const sub = req.auth?.sub;
  if (!sub) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const store = await resolveOrCreateUserStore(
    sub,
    req.auth?.email ?? undefined,
  );

  return res.json({ store });
}

export async function updateMyStore(
  req: ValidatedRequest<UpdateStorePayload>,
  res: Response,
): Promise<void | Response> {
  const sub = req.auth?.sub;
  if (!sub) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { name } = req.validated;
  const store = await resolveOrCreateUserStore(
    sub,
    req.auth?.email ?? undefined,
  );

  const updated = await prisma.store.update({
    where: { id: store.id },
    data: { name: name.trim() },
  });

  return res.json({ success: true, store: updated });
}

import type { Response } from "express";
import type { ValidatedRequest } from "../types/http";
import { resolveOrCreateUserStore } from "../middleware/store-access";

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

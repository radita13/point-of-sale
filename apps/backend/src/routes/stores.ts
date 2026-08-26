import { Router } from "express";
import { authGuard } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/validate.js";
import { prisma } from "../db.js";

const router = Router();

router.use(authGuard);

router.get(
  "/me",
  asyncHandler(async (req: any, res: any) => {
    const sub = req.auth?.sub;
    if (!sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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

    return res.json({ store });
  }),
);

export default router;

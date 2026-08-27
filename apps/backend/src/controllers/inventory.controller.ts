import type { Response } from "express";
import { prisma } from "../db";
import { toPrismaError } from "../lib/errors";
import { requireStoreAccess } from "../middleware/store-access";
import type { ValidatedRequest } from "../types/http";
import type { Prisma } from "../generated/client";
import type {
  GetLowStockQuery,
  InventoryAdjustmentsPayload,
} from "@point-of-sale/shared";

export async function getLowStock(
  req: ValidatedRequest<GetLowStockQuery>,
  res: Response,
): Promise<void> {
  const { storeId: providedStoreId } = req.validated;
  const access = await requireStoreAccess(req, res, providedStoreId);
  if (!access.ok || !access.storeId) return;
  const storeId = access.storeId;
  try {
    const low = await prisma.$queryRaw<
      Array<{
        serverId: string;
        sku: string;
        name: string;
        stock: number;
        minStock: number;
        unit: string;
      }>
    >`
      SELECT "serverId", "sku", "name", "stock", "minStock", "unit"
      FROM "products"
      WHERE "storeId" = ${storeId}::uuid
        AND "isDeleted" = false
        AND "stock" <= "minStock"
      ORDER BY "stock" ASC
    `;
    res.json(
      low.map((p) => ({
        id: p.serverId,
        sku: p.sku,
        name: p.name,
        stock: Number(p.stock),
        minStock: Number(p.minStock),
        unit: p.unit,
      })),
    );
  } catch (e: unknown) {
    res.status(500).json({ error: toPrismaError(e) });
  }
}

export async function adjustInventory(
  req: ValidatedRequest<InventoryAdjustmentsPayload>,
  res: Response,
): Promise<void> {
  const { storeId: providedStoreId, adjustments } = req.validated;
  const access = await requireStoreAccess(req, res, providedStoreId);
  if (!access.ok || !access.storeId) return;
  const storeId = access.storeId;
  try {
    const results = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const rows = [];
        for (const a of adjustments) {
          const existing = await tx.inventoryAdjustment.findUnique({
            where: { id: a.id },
          });
          if (existing) continue;
          const product = await tx.product.findUnique({
            where: { serverId: a.productId },
          });
          if (!product) continue;
          await tx.product.update({
            where: { id: product.id },
            data: {
              stock: Number(a.quantity),
              updatedAt: new Date(a.adjustedAt),
            },
          });
          const created = await tx.inventoryAdjustment.create({
            data: {
              id: a.id,
              storeId,
              productId: product.id,
              quantity: Number(a.quantity),
              note: a.note ?? null,
              adjustedAt: new Date(a.adjustedAt),
            },
          });
          rows.push(created);
        }
        return rows;
      },
    );
    res.status(201).json({ updated: results.length });
  } catch (e: unknown) {
    res.status(500).json({ error: toPrismaError(e) });
  }
}

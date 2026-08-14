import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { toPrismaError } from '../lib/errors.js';
import { requireStoreAccess } from '../middleware/store-access.js';
import { inventoryAdjustmentSchema } from '@point-of-sale/shared';

const adjustmentsPayloadSchema = z.object({
  storeId: z.string().min(1),
  adjustments: z.array(inventoryAdjustmentSchema).min(1).max(100),
});

export async function getLowStock(req: any, res: any): Promise<void> {
  const storeId = String(req.query.storeId ?? '');
  if (!storeId) {
    res.status(400).json({ error: 'storeId query parameter required' });
    return;
  }
  if (!(await requireStoreAccess(req, res, storeId))) return;
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
      SELECT "serverId", "sku", "name", "stock"::float, "minStock"::float, "unit"
      FROM "products"
      WHERE "storeId" = ${storeId}::uuid
        AND "isDeleted" = false
        AND "stock" <= "minStock"
      ORDER BY "stock" ASC
    `;
    res.json(
      low.map((p: any) => ({
        id: p.serverId,
        sku: p.sku,
        name: p.name,
        stock: Number(p.stock),
        minStock: Number(p.minStock),
        unit: p.unit,
      })),
    );
  } catch (e) {
    res.status(500).json({ error: toPrismaError(e) });
  }
}

export async function adjustInventory(req: any, res: any): Promise<void> {
  const { storeId, adjustments } = req.validated ?? req.body ?? {};
  if (!storeId || !adjustments) {
    res.status(400).json({ error: 'Payload tidak valid' });
    return;
  }
  if (!(await requireStoreAccess(req, res, storeId))) return;
  try {
    const results = await prisma.$transaction(async (tx: any) => {
      const rows = [];
      for (const a of adjustments) {
        const existing = await tx.inventoryAdjustment.findUnique({
          where: { id: a.id },
        });
        if (existing) continue;
        const product = await tx.product.findUnique({ where: { serverId: a.productId } });
        if (!product) continue;
        await tx.product.update({
          where: { id: product.id },
          data: { stock: a.quantity },
        });
        rows.push(
          await tx.inventoryAdjustment.create({
            data: {
              id: a.id,
              storeId,
              productId: product.id,
              quantity: a.quantity,
              note: a.note ?? 'stock opname',
              adjustedAt: new Date(a.adjustedAt),
            },
          }),
        );
      }
      return rows;
    });
    res.status(201).json({ synced: results.length });
  } catch (e) {
    res.status(500).json({ error: toPrismaError(e) });
  }
}

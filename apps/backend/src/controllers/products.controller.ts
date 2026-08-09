import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { toPrismaError } from '../lib/errors.js';
import { requireStoreAccess } from '../middleware/store-access.js';
import { productSyncPayloadSchema } from '@point-of-sale/shared';
import { uploadProductImage } from '../lib/storage.js';

export async function getProducts(req: any, res: any): Promise<void> {
  const storeId = String(req.query.storeId ?? '');
  if (!storeId) {
    res.status(400).json({ error: 'storeId query parameter required' });
    return;
  }
  if (!(await requireStoreAccess(req, res, storeId))) return;

  const page = req.query.page !== undefined ? Math.max(1, parseInt(String(req.query.page), 10) || 1) : undefined;
  const limit = req.query.limit !== undefined ? Math.max(1, parseInt(String(req.query.limit), 10) || 10) : 10;

  try {
    const where = { storeId, isDeleted: false };

    if (page !== undefined) {
      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const formatted = products.map((p: any) => ({
        id: p.serverId,
        sku: p.sku,
        name: p.name,
        category: p.category,
        costPrice: p.costPrice.toNumber(),
        sellingPrice: p.sellingPrice.toNumber(),
        stock: p.stock.toNumber(),
        minStock: p.minStock.toNumber(),
        unit: p.unit,
        step: p.step?.toNumber() ?? undefined,
        piecesPerUnit: p.piecesPerUnit ?? undefined,
        smallUnit: p.smallUnit ?? undefined,
        smallPrice: p.smallPrice?.toNumber() ?? undefined,
        image: p.image,
        isDeleted: p.isDeleted,
        updatedAt: p.updatedAt.getTime(),
      }));

      res.json({
        data: formatted,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
      return;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(
      products.map((p: any) => ({
        id: p.serverId,
        sku: p.sku,
        name: p.name,
        category: p.category,
        costPrice: p.costPrice.toNumber(),
        sellingPrice: p.sellingPrice.toNumber(),
        stock: p.stock.toNumber(),
        minStock: p.minStock.toNumber(),
        unit: p.unit,
        step: p.step?.toNumber() ?? undefined,
        piecesPerUnit: p.piecesPerUnit ?? undefined,
        smallUnit: p.smallUnit ?? undefined,
        smallPrice: p.smallPrice?.toNumber() ?? undefined,
        image: p.image,
        isDeleted: p.isDeleted,
        updatedAt: p.updatedAt.getTime(),
      })),
    );
  } catch (e) {
    res.status(500).json({ error: toPrismaError(e) });
  }
}

export async function syncProducts(req: any, res: any): Promise<void> {
  const parsed = productSyncPayloadSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Validasi gagal', issues: parsed.error.issues });
    return;
  }
  const { storeId, products } = parsed.data;
  if (!(await requireStoreAccess(req, res, storeId))) return;
  const synced: Array<{ id: string; image: string | null }> = [];

  for (const p of products) {
    let image = p.image ?? null;
    if (image && image.startsWith('data:')) {
      try {
        image = await uploadProductImage(image, p.id);
      } catch (err) {
        console.warn('[products/sync] upload foto gagal, foto di-skip:', err);
        image = null;
      }
    }
    const sku = p.sku?.trim() ? p.sku : `SKU-${p.id.slice(0, 8).toUpperCase()}`;
    const data = {
      sku,
      name: p.name,
      category: p.category,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      stock: p.stock,
      minStock: p.minStock,
      unit: p.unit,
      step: p.step ?? null,
      piecesPerUnit: p.piecesPerUnit ?? null,
      smallUnit: p.smallUnit ?? null,
      smallPrice: p.smallPrice ?? null,
      image,
      isDeleted: p.isDeleted ?? false,
      storeId,
    };
    await prisma.product.upsert({
      where: { serverId: p.id },
      update: data,
      create: { serverId: p.id, ...data },
    });
    synced.push({ id: p.id, image });
  }

  res.status(201).json({ synced });
}

import { prisma } from "../db.js";
import { toPrismaError } from "../lib/errors.js";
import { requireStoreAccess } from "../middleware/store-access.js";
import { productSyncPayloadSchema } from "@point-of-sale/shared";
import { uploadProductImage } from "../lib/storage.js";

function cleanQty(val: any): number {
  if (val === undefined || val === null) return 0;
  const num = Number(val);
  if (isNaN(num)) return 0;
  return num;
}

export async function getProducts(req: any, res: any): Promise<void> {
  const storeId = String(req.query.storeId ?? "");
  if (!storeId) {
    res.status(400).json({ error: "storeId query parameter required" });
    return;
  }
  if (!(await requireStoreAccess(req, res, storeId))) return;

  const page =
    req.query.page !== undefined
      ? Math.max(1, parseInt(String(req.query.page), 10) || 1)
      : undefined;
  const limit =
    req.query.limit !== undefined
      ? Math.max(1, parseInt(String(req.query.limit), 10) || 10)
      : 10;

  try {
    const sinceParam = req.query.since ? parseInt(String(req.query.since), 10) : undefined;
    const sinceDate = sinceParam && !isNaN(sinceParam) ? new Date(sinceParam) : undefined;

    const where: any = { storeId };
    if (sinceDate) {
      where.updatedAt = { gte: sinceDate };
    } else {
      where.isDeleted = false;
    }

    if (page !== undefined) {
      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: { name: "asc" },
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
        stock: cleanQty(p.stock),
        minStock: cleanQty(p.minStock),
        unit: p.unit,
        step: p.step ? cleanQty(p.step) : undefined,
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
      orderBy: { name: "asc" },
    });

    res.json(
      products.map((p: any) => ({
        id: p.serverId,
        sku: p.sku,
        name: p.name,
        category: p.category,
        costPrice: p.costPrice.toNumber(),
        sellingPrice: p.sellingPrice.toNumber(),
        stock: cleanQty(p.stock),
        minStock: cleanQty(p.minStock),
        unit: p.unit,
        step: p.step ? cleanQty(p.step) : undefined,
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
  const { storeId, products } = req.validated ?? req.body ?? {};
  if (!storeId || !products) {
    res.status(400).json({ error: "Payload tidak valid" });
    return;
  }
  if (!(await requireStoreAccess(req, res, storeId))) return;
  const synced: Array<{ id: string; image: string | null }> = [];

  for (const p of products) {
    if (p.isDeleted) {
      const existingProduct = await prisma.product.findUnique({
        where: { serverId: p.id },
        include: {
          transactionItems: { take: 1 },
          adjustments: { take: 1 },
        },
      });

      if (existingProduct) {
        const hasTransactions = existingProduct.transactionItems.length > 0;
        const hasAdjustments = existingProduct.adjustments.length > 0;

        if (!hasTransactions && !hasAdjustments) {
          await prisma.product.delete({ where: { id: existingProduct.id } });
          synced.push({ id: p.id, image: null });
          continue;
        }
      }
    }

    let image = p.image ?? null;
    if (p.isDeleted) {
      image = null;
    } else if (image && image.startsWith("data:")) {
      try {
        image = await uploadProductImage(image, p.id);
      } catch (err) {
        console.warn("[products/sync] upload foto gagal, foto di-skip:", err);
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
      stock: cleanQty(p.stock) ?? 0,
      minStock: cleanQty(p.minStock) ?? 0,
      unit: p.unit,
      step: cleanQty(p.step) ?? null,
      piecesPerUnit: p.piecesPerUnit ?? null,
      smallUnit: p.smallUnit ?? null,
      smallPrice: p.smallPrice ?? null,
      image,
      isDeleted: p.isDeleted ?? false,
      storeId,
    };
    const updatedProduct = await prisma.product.upsert({
      where: { serverId: p.id },
      update: data,
      create: { serverId: p.id, ...data },
    });

    if (p.costPrice && Number(p.costPrice) > 0) {
      await prisma.transactionItem.updateMany({
        where: {
          productId: updatedProduct.id,
          OR: [{ costPrice: 0 }, { costPrice: null }],
        },
        data: {
          costPrice: p.costPrice,
        },
      });
    }

    synced.push({ id: p.id, image });
  }

  res.status(201).json({ synced });
}

import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { toPrismaError } from '../lib/errors.js';
import { requireStoreAccess } from '../middleware/store-access.js';
import { syncPayloadSchema } from '@point-of-sale/shared';
import type { PaymentMethod, Unit } from '@point-of-sale/shared';

async function nextInvoiceNoForStore(
  tx: any,
  storeId: string,
  invoiceNo: string,
): Promise<string> {
  const lastDash = invoiceNo.lastIndexOf('-');
  const prefix = invoiceNo.slice(0, lastDash + 1);
  const rows = await tx.transaction.findMany({
    where: { storeId, invoiceNo: { startsWith: prefix } },
    select: { invoiceNo: true },
  });
  let maxSeq = 0;
  for (const r of rows) {
    const m = r.invoiceNo.match(/-(\d{4})$/);
    if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

export async function syncTransactions(req: any, res: any): Promise<void> {
  const { storeId, transactions } = req.body ?? ({} as any);
  if (!storeId || !Array.isArray(transactions) || transactions.length === 0) {
    res.status(400).json({ error: 'storeId dan transactions wajib diisi' });
    return;
  }
  const parsed = syncPayloadSchema.safeParse({ storeId, transactions });
  if (!parsed.success) {
    res.status(400).json({ error: 'Validasi gagal', issues: parsed.error.issues });
    return;
  }
  if (!(await requireStoreAccess(req, res, parsed.data.storeId))) return;

  try {
    const feProductIds = Array.from(
      new Set(parsed.data.transactions.flatMap((t: any) => t.items.map((it: any) => it.productId))),
    );

    const foundProducts = await prisma.product.findMany({
      where: {
        OR: [{ id: { in: feProductIds } }, { serverId: { in: feProductIds } }],
      },
    });

    const productIdMap = new Map<string, string>();
    for (const p of foundProducts) {
      productIdMap.set(p.id, p.id);
      productIdMap.set(p.serverId, p.id);
    }

    const updated: string[] = [];
    const skipped: string[] = [];
    const invoiceNoMap: Record<string, string> = {};

    for (const t of parsed.data.transactions) {
      const existing = await prisma.transaction.findUnique({ where: { id: t.id } });
      if (existing) {
        updated.push(t.id);
        continue;
      }

      const invalidItem = t.items.find((it) => !productIdMap.has(it.productId));
      if (invalidItem) {
        console.warn(
          `[transactions/sync] skip ${t.id} (${t.invoiceNo}): produk '${invalidItem.productName}' (${invalidItem.productId}) tidak ditemukan di server.`,
        );
        skipped.push(t.id);
        continue;
      }

      let invoiceNo = t.invoiceNo;
      let created = false;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        try {
          await prisma.transaction.create({
            data: {
              id: t.id,
              invoiceNo,
              timestamp: new Date(t.timestamp),
              totalAmount: t.totalAmount,
              finalAmount: t.finalAmount,
              paymentMethod: t.paymentMethod,
              payAmount: t.payAmount,
              changeAmount: t.changeAmount,
              storeId: parsed.data.storeId,
              items: {
                create: t.items.map((it) => ({
                  productId: productIdMap.get(it.productId)!,
                  productName: it.productName,
                  sku: it.sku,
                  qty: it.qty,
                  unit: it.unit,
                  price: it.price,
                  costPrice: it.costPrice ?? null,
                  subtotal: it.subtotal,
                })),
              },
            },
          });
          created = true;
          } catch (err: any) {
            if (err?.code === 'P2002') {
            invoiceNo = await nextInvoiceNoForStore(prisma, parsed.data.storeId, invoiceNo);
            if (invoiceNo !== t.invoiceNo) invoiceNoMap[t.id] = invoiceNo;
            continue;
          }
          throw err;
        }
      }
      if (!created) {
        res.status(500).json({ error: 'Gagal menyimpan transaksi setelah beberapa percobaan.' });
        return;
      }
      updated.push(t.id);
    }
    res.status(201).json({ synced: updated, skipped: skipped, invoiceNoMap });
  } catch (e) {
    res.status(500).json({ error: toPrismaError(e) });
  }
}

export async function getSyncStatus(req: any, res: any): Promise<void> {
  const ids = String(req.query.ids ?? '')
    .split(',')
    .map((x) => x.trim());
  if (ids.length === 0) {
    res.status(400).json({ error: 'ids query parameter required' });
    return;
  }
  const storeId = String(req.query.storeId ?? '');
  if (storeId && !(await requireStoreAccess(req, res, storeId))) return;
  try {
    const where = storeId
      ? { id: { in: ids }, storeId }
      : { id: { in: ids } };
    const found = await prisma.transaction.findMany({ where });
    const byId = new Map(found.map((tx: any) => [tx.id, tx.timestamp.getTime()]));
    const result = ids.map((id) => ({
      id,
      isSynced: byId.has(id),
      syncedAt: byId.get(id) ?? null,
    }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: toPrismaError(e) });
  }
}

export async function getTransactions(req: any, res: any): Promise<void> {
  const storeId = String(req.query.storeId ?? '');
  if (!storeId) {
    res.status(400).json({ error: 'storeId query parameter required' });
    return;
  }
  if (!(await requireStoreAccess(req, res, storeId))) return;

  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10) || 10));
  const skip = (page - 1) * limit;

  try {
    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { storeId },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: { items: true },
      }),
      prisma.transaction.count({ where: { storeId } }),
    ]);

      res.json({
        data: rows.map((t: any) => ({
          id: t.id,
          invoiceNo: t.invoiceNo,
          timestamp: t.timestamp.getTime(),
          items: t.items.map((it: any) => ({
          productId: it.productId,
          productName: it.productName,
          sku: it.sku ?? undefined,
          qty: it.qty.toNumber(),
          unit: it.unit as Unit,
          price: it.price.toNumber(),
          costPrice: it.costPrice ? it.costPrice.toNumber() : undefined,
          subtotal: it.subtotal.toNumber(),
        })),
        totalAmount: t.totalAmount.toNumber(),
        finalAmount: t.finalAmount.toNumber(),
        paymentMethod: t.paymentMethod as PaymentMethod,
        payAmount: t.payAmount.toNumber(),
        changeAmount: t.changeAmount.toNumber(),
        isSynced: true,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    res.status(500).json({ error: toPrismaError(e) });
  }
}

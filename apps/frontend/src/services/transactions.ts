import type { PaymentMethod, Transaction, TransactionItem } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { makeUuid } from '@/lib/utils';

export async function nextInvoiceNo(now = new Date()): Promise<string> {
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `INV-${ymd}-`;
  const rows = await db.transactions.where('invoiceNo').startsWith(prefix).toArray();
  let maxSeq = 0;
  for (const r of rows) {
    const m = r.invoiceNo.match(/-(\d{4})$/);
    if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
  }
  const seq = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

export interface CommitResult {
  transaction: Transaction;
}

export async function commitTransaction(
  items: TransactionItem[],
  opts: {
    paymentMethod: PaymentMethod;
    payAmount: number;
    changeAmount: number;
  },
): Promise<CommitResult> {
  const totalAmount = items.reduce((s, it) => s + it.subtotal, 0);
  const finalAmount = totalAmount;
  const now = Date.now();
  const invoiceNo = await nextInvoiceNo(new Date(now));

  for (const it of items) {
    const prod = await db.products.get(it.productId);
    if (prod && prod.stock < it.qty) {
      throw new Error(`Stok ${prod.name} tidak cukup (tersisa ${prod.stock} ${prod.unit}).`);
    }
  }

  const transaction: Transaction = {
    id: makeUuid(),
    invoiceNo,
    timestamp: now,
    items,
    totalAmount,
    finalAmount,
    paymentMethod: opts.paymentMethod,
    payAmount: opts.payAmount,
    changeAmount: opts.changeAmount,
    isSynced: false,
  };

  await db.transaction('rw', db.transactions, db.products, async () => {
    await db.transactions.add(transaction);
    for (const it of items) {
      const prod = await db.products.get(it.productId);
      if (prod) {
        await db.products.update(prod.id, {
          stock: Math.max(0, prod.stock - it.qty),
          updatedAt: now,
          isSynced: false,
        });
      }
    }
  });

  return { transaction };
}

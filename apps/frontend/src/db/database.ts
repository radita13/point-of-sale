import Dexie, { type Table } from "dexie";
import type { Product, Transaction } from "@point-of-sale/shared";

export class POSDatabase extends Dexie {
  products!: Table<Product, string>;
  transactions!: Table<Transaction, string>;

  constructor() {
    super("PointOfSaleDB");
    this.version(1).stores({
      products: "id, barcode, name, category, stock, updatedAt",
      transactions: "id, invoiceNo, timestamp, paymentMethod, isSynced",
    });
    this.version(2).stores({
      products: "id, sku, name, category, stock, updatedAt",
    });
  }
}

export const db = new POSDatabase();

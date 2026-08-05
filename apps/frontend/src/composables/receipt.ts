export interface ReceiptLine {
  name: string;
  qty: number;
  unit: string;
  price: number;
  subtotal: number;
}

export interface ReceiptData {
  storeName: string;
  address: string;
  phone: string;
  invoiceNo: string;
  date: string;
  cashier: string;
  items: ReceiptLine[];
  total: number;
  pay: number;
  change: number;
  paymentMethod: string;
}
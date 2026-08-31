import { ref } from 'vue';
import type { ReceiptData } from './receipt';
import { formatPrice } from '@/lib/utils';

type NavigatorWithBLE = Navigator & {
  bluetooth?: {
    requestDevice: (opts: unknown) => Promise<BluetoothDevice>;
  };
};

const SERVICE_UUID = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
const WRITE_CHAR_UUID = '49535343-8841-43f4-a8d4-ecbe34729bb3';

export function useBluetoothPrinter() {
  const isSupported = ref(typeof navigator !== 'undefined' && 'bluetooth' in navigator);
  const isConnected = ref(false);
  const deviceName = ref<string | null>(null);

  let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async function connect(): Promise<string | null> {
    const nav = navigator as NavigatorWithBLE;
    if (!nav.bluetooth) throw new Error('Web Bluetooth tidak didukung di browser ini.');
    try {
      const device = await nav.bluetooth.requestDevice({ filters: [{ services: [SERVICE_UUID] }] });
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Gagal terhubung ke printer Bluetooth.');
      const service = await server.getPrimaryService(SERVICE_UUID);
      characteristic = await service.getCharacteristic(WRITE_CHAR_UUID);
      deviceName.value = device.name ?? 'Printer Thermal';
      isConnected.value = true;
      return deviceName.value;
    } catch (err) {
      if (
        (err instanceof DOMException && err.name === 'NotFoundError') ||
        (err instanceof Error && err.message.toLowerCase().includes('cancelled'))
      ) {
        return null;
      }
      throw err;
    }
  }

  async function printReceipt(r: ReceiptData): Promise<void> {
    if (!characteristic) throw new Error('Printer belum terhubung.');

    let payload =
      `\x1b@\x1ba\x01${r.storeName}\n\x1ba\x00${r.address}\n${r.phone}\n\n` +
      `================================\nNo. Nota : ${r.invoiceNo}\nTanggal  : ${r.date}\nKasir    : ${r.cashier}\n================================\n`;

    for (const it of r.items) {
      payload += `${it.name}\n  ${it.qty} ${it.unit} x ${formatPrice(it.price)}\n${' '.repeat(16)}${formatPrice(it.subtotal)}\n`;
    }

    payload +=
      `--------------------------------\n${'Subtotal'.padEnd(16)}${formatPrice(r.items.reduce((s, i) => s + i.subtotal, 0))}\n` +
      `${'TOTAL'.padEnd(16)}${formatPrice(r.total)}\n` +
      `${'BAYAR'.padEnd(16)}${formatPrice(r.pay)}\n` +
      `${'KEMBALI'.padEnd(16)}${formatPrice(r.change)}\n` +
      `\x1ba\x01\n*** TERIMA KASIH ***\nBarang yang sudah dibeli tidak dapat ditukar.\n\x1ba\x00\n\n\n\x1d\x56\x42`;

    await characteristic.writeValue(new TextEncoder().encode(payload) as unknown as BufferSource);
  }

  return { isSupported, isConnected, deviceName, connect, printReceipt };
}

export type { ReceiptData } from './receipt';

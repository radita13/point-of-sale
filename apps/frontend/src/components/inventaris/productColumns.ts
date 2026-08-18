import { h } from 'vue';
import { createColumnHelper } from '@tanstack/vue-table';
import { Package, Pencil, Trash2 } from 'lucide-vue-next';
import type { Product } from '@point-of-sale/shared';
import { formatPrice, formatQty } from '@/lib/utils';

const columnHelper = createColumnHelper<Product>();

export function createProductColumns(
  onEdit: (product: Product) => void,
  onDelete: (product: Product) => void
) {
  return [
    columnHelper.accessor('image', {
      header: 'Foto',
      cell: (info) => {
        const src = info.getValue();
        const name = info.row.original.name;
        if (src) {
          return h('img', {
            src,
            alt: name,
            class: 'h-10 w-10 rounded-lg border border-ink bg-white object-cover',
          });
        }
        return h(
          'div',
          {
            class:
              'flex h-10 w-10 items-center justify-center rounded-lg border border-ink bg-white text-ink/30',
          },
          [h(Package, { class: 'h-5 w-5' })]
        );
      },
    }),
    columnHelper.accessor('sku', {
      header: 'SKU',
      cell: (info) => h('span', { class: 'font-mono text-gray-700' }, `#${info.getValue()}`),
    }),
    columnHelper.accessor('name', {
      header: 'Nama Produk',
      cell: (info) => h('span', { class: 'font-extrabold text-sm' }, info.getValue()),
    }),
    columnHelper.accessor('category', {
      header: 'Kategori',
      cell: (info) =>
        h(
          'span',
          { class: 'rounded-md border border-ink bg-canvas px-2 py-0.5 text-[10px]' },
          info.getValue()
        ),
    }),
    columnHelper.accessor('sellingPrice', {
      header: 'Harga Jual',
      cell: (info) =>
        h('span', { class: 'font-extrabold text-brand' }, `Rp ${formatPrice(info.getValue())}`),
    }),
    columnHelper.accessor((row) => `${formatQty(row.stock)} ${row.unit}`, {
      id: 'stock',
      header: 'Stok',
      cell: (info) => h('span', { class: 'font-extrabold' }, info.getValue()),
    }),
    columnHelper.accessor((row) => row.stock <= row.minStock, {
      id: 'status',
      header: 'Status',
      cell: (info) => {
        const isLow = info.getValue();
        return h(
          'span',
          {
            class: `inline-block rounded-md border border-ink px-2 py-0.5 text-[10px] font-extrabold ${
              isLow ? 'bg-card-coral text-white' : 'bg-card-green text-white'
            }`,
          },
          isLow ? 'STOK MENIPIS' : 'AMAN'
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: () => h('div', { class: 'text-center' }, 'Aksi'),
      cell: (info) =>
        h('div', { class: 'flex items-center justify-center gap-1.5' }, [
          h(
            'button',
            {
              onClick: () => onEdit(info.row.original),
              class:
                'neo-press rounded-lg border border-ink bg-white p-1.5 hover:bg-canvas cursor-pointer',
            },
            [h(Pencil, { class: 'h-4 w-4' })]
          ),
          h(
            'button',
            {
              onClick: () => onDelete(info.row.original),
              class:
                'neo-press rounded-lg border border-ink bg-card-coral p-1.5 text-white hover:brightness-95 cursor-pointer',
            },
            [h(Trash2, { class: 'h-4 w-4' })]
          ),
        ]),
    }),
  ];
}

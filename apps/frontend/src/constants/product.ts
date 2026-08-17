import { type SelectOption } from '@/components/ui/Select.vue';
import type { Product } from '@point-of-sale/shared';

export const CATEGORIES = [
  'Semua',
  'Beras & Minyak',
  'Bumbu Dapur',
  'Minuman',
  'Makanan & Snack',
  'Rokok',
  'Kebutuhan Harian',
] as const;

export const PRODUCT_CATEGORIES = CATEGORIES.filter((c) => c !== 'Semua');

export const UNITS = ['kg', 'pcs', 'liter', 'pak', 'saset', 'bat'] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  'Beras & Minyak': 'bg-card-yellow text-ink',
  'Bumbu Dapur': 'bg-card-green text-white',
  Minuman: 'bg-card-coral text-white',
  'Makanan & Snack': 'bg-card-purple text-white',
  Rokok: 'bg-card-blue text-white',
  'Kebutuhan Harian': 'bg-card-teal text-white',
};

export const FILTER_OPTIONS: SelectOption[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'week', label: '7 Hari Terakhir' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'all', label: 'Semua Waktu' },
];

export function getCategoryCardColor(p: Product): string {
  return CATEGORY_COLORS[p.category] ?? 'bg-card-teal text-white';
}

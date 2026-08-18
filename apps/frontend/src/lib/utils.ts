import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number | undefined | null): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(value ?? 0));
}

export function formatDate(value: number | Date | undefined | null): string {
  if (!value) return '-';
  const d = typeof value === 'number' ? new Date(value) : value;
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatQty(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';
  return Number(num.toFixed(3)).toString();
}

export function makeUuid(): string {
  return crypto.randomUUID();
}

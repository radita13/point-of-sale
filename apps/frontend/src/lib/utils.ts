import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number | undefined | null): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(value ?? 0));
}

export function makeUuid(): string {
  return crypto.randomUUID();
}
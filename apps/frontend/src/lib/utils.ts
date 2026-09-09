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

export function formatDateSeparator(dateStr?: string): string {
  if (!dateStr) return 'Hari Ini';
  const target = new Date(dateStr);
  const now = new Date();

  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  if (targetDay === today) {
    return 'Hari Ini';
  }
  if (targetDay === yesterday) {
    return 'Kemarin';
  }

  return target.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function shouldShowDateSeparator(
  messages: Array<{ createdAt?: string }>,
  currentIdx: number
): boolean {
  if (currentIdx === 0) return true;

  const currentMsg = messages[currentIdx];
  const prevMsg = messages[currentIdx - 1];
  const currentDate = currentMsg?.createdAt
    ? new Date(currentMsg.createdAt).toDateString()
    : new Date().toDateString();
  const prevDate = prevMsg?.createdAt
    ? new Date(prevMsg.createdAt).toDateString()
    : new Date().toDateString();

  return currentDate !== prevDate;
}


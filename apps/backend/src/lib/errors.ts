import { Prisma } from '@prisma/client';

/** Bedakan mnemonic error Prisma (mis. unique key) -> pesan HTTP ramah. */
export function toPrismaError(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return 'Duplikasi data (unique constraint dilanggar).';
    if (e.code === 'P2025') return 'Data tidak ditemukan.';
    return `Terjadi kesalahan database (${e.code}).`;
  }
  if (e instanceof Error) return e.message;
  return 'Terjadi kesalahan yang tidak diketahui.';
}
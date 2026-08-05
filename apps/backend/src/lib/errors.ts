export function toPrismaError(e: any): string {
  if (e && typeof e === "object" && "code" in e) {
    if (e.code === "P2002")
      return "Duplikasi data (unique constraint dilanggar).";
    if (e.code === "P2025") return "Data tidak ditemukan.";
    return `Terjadi kesalahan database (${e.code}).`;
  }
  if (e instanceof Error) return e.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

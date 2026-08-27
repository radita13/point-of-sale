export function toPrismaError(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    const err = e as { code: string };
    if (err.code === "P2002")
      return "Unique constraint violation: data already exists.";
    if (err.code === "P2025") return "Record not found.";
    return `Database error occurred (${err.code}).`;
  }
  if (e instanceof Error) return e.message;
  return "An unexpected error occurred.";
}

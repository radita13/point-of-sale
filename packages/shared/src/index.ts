export * from "./types/index.js";
export * from "./schemas/index.js";

export const toCents = (amount: number): number =>
  Math.round((amount || 0) * 100);
export const fromCents = (cents: number): number => (cents || 0) / 100;
export const roundQty = (qty: number): number =>
  Math.round((qty || 0) * 1e6) / 1e6;

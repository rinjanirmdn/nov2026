export function rp(n: number): string {
  return (n < 0 ? "-" : "") + "Rp " + Math.abs(Math.round(n)).toLocaleString("id-ID");
}

/** "1.250.000" atau "Rp 1,250,000" -> 1250000. Bukan angka -> 0. */
export function parseAmount(s: unknown): number {
  return parseInt(String(s ?? "").replace(/\D/g, ""), 10) || 0;
}

export function formatAmountInput(n: number | string | null | undefined): string {
  const v = typeof n === "number" ? n : parseAmount(n);
  return v ? v.toLocaleString("id-ID") : "";
}

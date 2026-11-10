/* Tanggal disimpan di database sebagai kolom DATE dan di aplikasi sebagai string "YYYY-MM-DD".
   Bulan sebagai "YYYY-MM". Semua konversi ke Date memakai UTC supaya tidak bergeser karena zona waktu. */
import { TIME_ZONE } from "./constants";

const ISO_DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const ISO_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isIsoDay(s: unknown): s is string {
  if (typeof s !== "string" || !ISO_DAY.test(s)) return false;
  return toDate(s).toISOString().slice(0, 10) === s; // tolak 2026-02-31
}

export function isIsoMonth(s: unknown): s is string {
  return typeof s === "string" && ISO_MONTH.test(s);
}

export function todayIso(now = new Date(), timeZone = TIME_ZONE): string {
  // en-CA menghasilkan format YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

export function toDate(iso: string): Date {
  return new Date(iso + "T00:00:00.000Z");
}

export function fromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

/** Rentang [awal, awal bulan berikutnya) untuk query database. */
export function monthRange(month: string): { gte: Date; lt: Date } {
  return { gte: toDate(month + "-01"), lt: toDate(shiftMonth(month, 1) + "-01") };
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function longDate(iso: string): string {
  return toDate(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function monthLabel(month: string): string {
  return toDate(month + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
}

import "server-only";
import { isIsoMonth, todayIso } from "./dates";

/** Bulan dari ?bulan=YYYY-MM, default bulan ini. */
export async function pickMonth(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const today = todayIso();
  const q = (await searchParams).bulan;
  return { today, month: isIsoMonth(q) ? q : today.slice(0, 7) };
}

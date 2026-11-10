/* Perhitungan keuangan. Fungsi murni tanpa database, supaya mudah dites.

   Jenis transaksi (kind):
     INCOME    uang masuk
     EXPENSE   pengeluaran yang dibayar tunai/transfer
     PAYLATER  belanja pakai paylater: uang belum keluar, tapi hutang (debtId) bertambah
     PAYMENT   bayar cicilan: uang keluar, hutang (debtId) berkurang
*/
import { daysInMonth } from "./dates";
import { rp } from "./format";
import type { DebtTypeKey } from "./constants";

export type TxKind = "INCOME" | "EXPENSE" | "PAYLATER" | "PAYMENT";

export interface Tx {
  id: string;
  kind: TxKind;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string;
  userId: string | null;
  note: string;
  debtId: string | null;
}

export interface Debt {
  id: string;
  name: string;
  type: DebtTypeKey;
  ownerId: string | null;
  startBalance: number;
  monthly: number;
  dueDay: number | null;
  rate: number | null; // % per bulan
  adjustmentTotal: number;
}

/** Ringkasan per hutang dari seluruh transaksi yang menyentuhnya (bukan hanya bulan ini). */
export interface DebtTotals {
  paylater: number;
  paid: number;
}

export function sum<T>(list: readonly T[], fn: (x: T) => number): number {
  return list.reduce((a, x) => a + fn(x), 0);
}

export function ofKind(list: readonly Tx[], kind: TxKind): Tx[] {
  return list.filter((t) => t.kind === kind);
}

export function debtBalance(d: Debt, totals: DebtTotals | undefined): number {
  return d.startBalance + (totals?.paylater ?? 0) - (totals?.paid ?? 0) + d.adjustmentTotal;
}

export interface MonthSummary {
  income: number;
  spent: number;
  paylater: number;
  paid: number;
  left: number;
  /** paylater - paid: positif artinya hutang bertambah bulan ini. */
  debtDelta: number;
  /** Persen pemasukan yang dipakai untuk cicilan, null kalau tidak relevan. */
  installmentRatio: number | null;
  byCategory: { category: string; amount: number }[];
}

export function summarizeMonth(tx: readonly Tx[]): MonthSummary {
  const income = sum(ofKind(tx, "INCOME"), (t) => t.amount);
  const spent = sum(ofKind(tx, "EXPENSE"), (t) => t.amount);
  const paylater = sum(ofKind(tx, "PAYLATER"), (t) => t.amount);
  const paid = sum(ofKind(tx, "PAYMENT"), (t) => t.amount);

  const cat = new Map<string, number>();
  for (const t of tx) {
    if (t.kind === "EXPENSE" || t.kind === "PAYLATER") cat.set(t.category, (cat.get(t.category) ?? 0) + t.amount);
  }
  const byCategory = [...cat].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);

  return {
    income,
    spent,
    paylater,
    paid,
    left: income - spent - paid,
    debtDelta: paylater - paid,
    installmentRatio: income > 0 && paid > 0 ? Math.round((paid / income) * 100) : null,
    byCategory,
  };
}

export function perPerson(tx: readonly Tx[], userId: string) {
  const mine = tx.filter((t) => t.userId === userId);
  return {
    income: sum(ofKind(mine, "INCOME"), (t) => t.amount),
    out: sum(mine.filter((t) => t.kind !== "INCOME"), (t) => t.amount),
  };
}

export interface DueStatus {
  day: number;
  text: string;
  tone: "" | "good" | "warn" | "bad";
  done: boolean;
}

/**
 * Status jatuh tempo sebuah hutang di bulan `month`.
 * `monthTx` = transaksi bulan itu, `today` = YYYY-MM-DD hari ini.
 */
export function dueStatus(d: Debt, monthTx: readonly Tx[], month: string, today: string): DueStatus {
  const paid = sum(monthTx.filter((t) => t.kind === "PAYMENT" && t.debtId === d.id), (t) => t.amount);
  const day = Math.min(d.dueDay ?? 1, daysInMonth(month));
  if (d.monthly > 0 && paid >= d.monthly) return { day, text: "Sudah dibayar", tone: "good", done: true };

  let text = "Tanggal " + day;
  let tone: DueStatus["tone"] = "";
  if (month === today.slice(0, 7)) {
    const diff = day - Number(today.slice(8, 10));
    if (diff > 0) {
      text += `, ${diff} hari lagi`;
      if (diff <= 3) tone = "warn";
    } else if (diff === 0) {
      text += ", hari ini";
      tone = "warn";
    } else {
      text += `, lewat ${-diff} hari`;
      tone = "bad";
    }
  }
  if (paid > 0) text += ". Baru dibayar " + rp(paid);
  return { day, text, tone, done: false };
}

export type PayoffOrder = "kecil" | "bunga";

/** Urutan pelunasan: saldo terkecil dulu (snowball) atau bunga tertinggi dulu (avalanche). */
export function payoffOrder<T extends { balance: number; rate: number | null }>(open: readonly T[], order: PayoffOrder): T[] {
  return [...open].sort((a, b) =>
    order === "bunga" ? (b.rate ?? 0) - (a.rate ?? 0) || a.balance - b.balance : a.balance - b.balance,
  );
}

/** Perkiraan bulan sampai lunas tanpa bunga dan tanpa hutang baru. */
export function monthsToPayoff(balance: number, monthly: number): number | null {
  return balance > 0 && monthly > 0 ? Math.ceil(balance / monthly) : null;
}

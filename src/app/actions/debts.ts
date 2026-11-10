"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { loadDebts } from "@/lib/data";
import { toDate, todayIso } from "@/lib/dates";
import { parseAmount } from "@/lib/format";
import { MAX_AMOUNT } from "@/lib/constants";
import type { ActionResult } from "@/lib/form";
import { assertMember, done, fields, invalid, zAmount, zAmountOptional, zDay } from "./_shared";

const debtSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama belum diisi.").max(40),
  type: z.enum(["PAYLATER", "PINJOL", "LAIN"]),
  userId: z.string().min(1),
  startBalance: z.string().optional(),
  monthly: zAmountOptional,
  dueDay: z
    .string()
    .transform((s) => (s ? Number(s) : null))
    .pipe(z.number().int().min(1, "Tanggal jatuh tempo 1-31.").max(31, "Tanggal jatuh tempo 1-31.").nullable()),
  rate: z
    .string()
    .transform((s) => (s ? Number(s.replace(",", ".")) : null))
    .pipe(z.number().min(0).max(100, "Bunga 0-100%.").nullable()),
});

export async function saveDebt(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const p = debtSchema.safeParse(fields(fd));
  if (!p.success) return invalid(p.error);
  const v = p.data;
  const hid = user.householdId;
  if (!(await assertMember(hid, v.userId))) return { error: "Orang yang dipilih tidak dikenal." };

  const data = { name: v.name, type: v.type, ownerId: v.userId, monthly: v.monthly, dueDay: v.dueDay, rate: v.rate };
  if (v.id) {
    const r = await db.debt.updateMany({ where: { id: v.id, householdId: hid }, data });
    if (r.count !== 1) return { error: "Hutang tidak ditemukan." };
  } else {
    const start = parseAmount(v.startBalance);
    if (!start) return { error: "Sisa hutang belum diisi." };
    if (start > MAX_AMOUNT) return { error: "Sisa hutang terlalu besar." };
    await db.debt.create({ data: { ...data, startBalance: start, householdId: hid } });
  }
  return done();
}

const paySchema = z.object({
  id: z.string().optional(),
  debtId: z.string().min(1),
  amount: zAmount("Jumlah"),
  date: zDay,
  userId: z.string().min(1),
});

/** Catat (atau ubah) pembayaran cicilan: uang keluar, hutang berkurang. */
export async function payDebt(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const p = paySchema.safeParse(fields(fd));
  if (!p.success) return invalid(p.error);
  const v = p.data;
  const hid = user.householdId;

  const debt = await db.debt.findFirst({ where: { id: v.debtId, householdId: hid }, select: { id: true } });
  if (!debt) return { error: "Hutang tidak ditemukan." };
  if (!(await assertMember(hid, v.userId))) return { error: "Orang yang dipilih tidak dikenal." };

  const data = { amount: v.amount, date: toDate(v.date), userId: v.userId };
  if (v.id) {
    const r = await db.transaction.updateMany({ where: { id: v.id, householdId: hid, kind: "PAYMENT", debtId: debt.id }, data });
    if (r.count !== 1) return { error: "Pembayaran tidak ditemukan." };
  } else {
    await db.transaction.create({
      data: { ...data, householdId: hid, kind: "PAYMENT", debtId: debt.id, category: "Bayar hutang", note: "" },
    });
  }
  return done({ month: v.date.slice(0, 7) });
}

/** Samakan saldo dengan angka di aplikasi pinjaman. Selisihnya disimpan sebagai penyesuaian. */
export async function adjustDebt(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const f = fields(fd);
  const target = parseAmount(f.balance);
  if (target > MAX_AMOUNT) return { error: "Angka terlalu besar." };

  const debt = (await loadDebts(user.householdId)).find((d) => d.id === f.debtId);
  if (!debt) return { error: "Hutang tidak ditemukan." };

  const diff = target - debt.balance;
  if (diff) await db.debtAdjustment.create({ data: { debtId: debt.id, amount: diff, date: toDate(todayIso()) } });
  return done();
}

export async function deleteDebt(id: string) {
  const user = await requireUser();
  // Transaksi yang sudah dicatat tetap ada (debtId jadi kosong lewat onDelete: SetNull).
  await db.debt.deleteMany({ where: { id, householdId: user.householdId } });
  done();
}

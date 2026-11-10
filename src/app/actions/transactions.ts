"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toDate } from "@/lib/dates";
import type { ActionResult } from "@/lib/form";
import { assertMember, done, fields, invalid, zAmount, zDay } from "./_shared";

const schema = z.object({
  id: z.string().optional(),
  kind: z.enum(["INCOME", "EXPENSE"]),
  amount: zAmount("Jumlah"),
  date: zDay,
  category: z.string().min(1).max(80),
  userId: z.string().min(1),
  method: z.string().optional(), // id hutang paylater, atau kosong = tunai
  note: z.string().max(80).default(""),
});

/** Tambah atau ubah pemasukan/pengeluaran. Pengeluaran dengan `method` = belanja paylater. */
export async function saveTransaction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const p = schema.safeParse(fields(fd));
  if (!p.success) return invalid(p.error);
  const v = p.data;
  const hid = user.householdId;

  if (!(await assertMember(hid, v.userId))) return { error: "Orang yang dipilih tidak dikenal." };

  let kind: "INCOME" | "EXPENSE" | "PAYLATER" = v.kind;
  let debtId: string | null = null;
  if (v.kind === "EXPENSE" && v.method) {
    const debt = await db.debt.findFirst({ where: { id: v.method, householdId: hid, type: "PAYLATER" }, select: { id: true } });
    if (!debt) return { error: "Akun paylater tidak ditemukan." };
    kind = "PAYLATER";
    debtId = debt.id;
  }

  const data = {
    kind,
    debtId,
    amount: v.amount,
    date: toDate(v.date),
    category: v.category,
    userId: v.userId,
    note: v.note,
  };

  if (v.id) {
    const r = await db.transaction.updateMany({ where: { id: v.id, householdId: hid, kind: { not: "PAYMENT" } }, data });
    if (r.count !== 1) return { error: "Transaksi tidak ditemukan." };
  } else {
    await db.transaction.create({ data: { ...data, householdId: hid } });
  }
  return done({ month: v.date.slice(0, 7) });
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();
  await db.transaction.deleteMany({ where: { id, householdId: user.householdId } });
  done();
}

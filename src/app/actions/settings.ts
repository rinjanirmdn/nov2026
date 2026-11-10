"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { toDate } from "@/lib/dates";
import { parseLegacy } from "@/lib/legacy-import";
import type { ActionResult } from "@/lib/form";
import { done, fields, invalid, newInviteCode } from "./_shared";

export async function updateName(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const p = z
    .object({ name: z.string().min(1, "Nama belum diisi.").max(20, "Nama paling panjang 20 karakter.") })
    .safeParse(fields(fd));
  if (!p.success) return invalid(p.error);
  const clash = await db.user.count({
    where: { householdId: user.householdId, id: { not: user.id }, name: { equals: p.data.name, mode: "insensitive" } },
  });
  if (clash) return { error: "Nama ini sudah dipakai pasangan." };
  await db.user.update({ where: { id: user.id }, data: { name: p.data.name } });
  return done({ message: "Nama disimpan." });
}

export async function changePassword(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const p = z
    .object({
      current: z.string().min(1, "Password lama belum diisi."),
      next: z.string().min(8, "Password baru minimal 8 karakter.").max(200),
    })
    .safeParse(fields(fd));
  if (!p.success) return invalid(p.error);
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(p.data.current, row.passwordHash))) return { error: "Password lama salah." };
  // Naikkan sessionVersion: semua perangkat lain yang login dengan akun ini ikut keluar.
  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(p.data.next, 10), sessionVersion: { increment: 1 } },
  });
  await createSession(updated.id, updated.sessionVersion);
  return done({ message: "Password diganti. Perangkat lain yang memakai akun ini perlu masuk lagi." });
}

export async function regenerateInvite() {
  const user = await requireUser();
  await db.household.update({ where: { id: user.householdId }, data: { inviteCode: newInviteCode() } });
  done();
}

/** Ganti semua data rumah tangga dengan isi file ekspor (dari aplikasi lama atau dari menu Ekspor). */
export async function importData(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const hid = user.householdId;
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih file hasil ekspor dulu." };
  if (file.size > 10 * 1024 * 1024) return { error: "File terlalu besar (maks 10 MB)." };
  if (fd.get("confirm") !== "on") return { error: "Centang dulu pernyataan bahwa data sekarang akan diganti." };

  const parsed = parseLegacy(await file.text());
  if ("error" in parsed) return parsed;
  const { people, tx, debts } = parsed.data;

  // Nama orang di file -> akun di rumah tangga ini, dipilih di form (map0, map1).
  const members = await db.user.findMany({ where: { householdId: hid }, select: { id: true } });
  const ids = new Set(members.map((m) => m.id));
  const byName = new Map<string, string>();
  people.forEach((name, i) => {
    const target = String(fd.get("map" + i) ?? "");
    byName.set(name, ids.has(target) ? target : user.id);
  });
  const who = (name: string) => byName.get(name) ?? user.id;

  const debtIds = new Map<string, string>();
  await db.$transaction(
    async (q) => {
      await q.transaction.deleteMany({ where: { householdId: hid } });
      await q.debt.deleteMany({ where: { householdId: hid } });

      for (const d of debts) {
        const created = await q.debt.create({
          data: {
            householdId: hid,
            name: d.name,
            type: d.type.toUpperCase() as "PAYLATER" | "PINJOL" | "LAIN",
            ownerId: who(d.who),
            startBalance: d.start,
            monthly: d.monthly,
            dueDay: d.dueDay || null,
            rate: d.rate || null,
            adjustments: { create: d.adjust.map((a) => ({ date: toDate(a.date), amount: a.amount })) },
          },
          select: { id: true },
        });
        debtIds.set(d.id, created.id);
      }

      await q.transaction.createMany({
        data: tx.map((t) => {
          const debtId = t.debtId ? debtIds.get(t.debtId) ?? null : null;
          // Belanja paylater / cicilan yang hutangnya sudah tidak ada: tetap disimpan sebagai pengeluaran biasa.
          const kind = (t.kind === "paylater" || t.kind === "payment") && !debtId ? "EXPENSE" : (t.kind.toUpperCase() as "INCOME");
          return {
            householdId: hid,
            kind,
            debtId,
            date: toDate(t.date),
            amount: t.amount,
            category: t.category,
            userId: who(t.who),
            note: t.note.slice(0, 80),
          };
        }),
      });
    },
    { timeout: 60_000 },
  );

  return done({ message: `Impor selesai: ${tx.length} transaksi dan ${debts.length} hutang.` });
}

export async function resetData(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (fields(fd).confirm !== "HAPUS") return { error: 'Ketik HAPUS (huruf besar) untuk melanjutkan.' };
  await db.$transaction([
    db.transaction.deleteMany({ where: { householdId: user.householdId } }),
    db.debt.deleteMany({ where: { householdId: user.householdId } }),
  ]);
  return done({ message: "Semua transaksi dan hutang sudah dihapus." });
}

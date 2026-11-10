"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { MAX_MEMBERS } from "@/lib/constants";
import type { ActionResult } from "@/lib/form";
import { fields, invalid, newInviteCode } from "./_shared";

// Hash pembanding saat email tidak ditemukan, supaya waktu respons sama.
const DUMMY_HASH = bcrypt.hashSync("tidak-dipakai", 10);

const email = z.string().trim().toLowerCase().email("Email tidak valid.").max(120);
const password = z.string().min(8, "Password minimal 8 karakter.").max(200);

const registerSchema = z.object({
  name: z.string().trim().min(1, "Nama belum diisi.").max(20, "Nama paling panjang 20 karakter."),
  email,
  password,
  mode: z.enum(["baru", "gabung"]),
  inviteCode: z.string().trim().toUpperCase().optional(),
});

export async function register(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = registerSchema.safeParse(fields(fd));
  if (!p.success) return invalid(p.error);
  const { name, mode, inviteCode } = p.data;

  if (await db.user.findUnique({ where: { email: p.data.email }, select: { id: true } })) {
    return { error: "Email ini sudah terdaftar. Silakan masuk." };
  }
  const passwordHash = await bcrypt.hash(p.data.password, 10);

  let user;
  if (mode === "gabung") {
    if (!inviteCode) return { error: "Kode undangan belum diisi." };
    const household = await db.household.findUnique({
      where: { inviteCode },
      include: { members: { select: { name: true } } },
    });
    if (!household) return { error: "Kode undangan tidak ditemukan. Cek lagi di menu Pengaturan milik pasangan." };
    if (household.members.length >= MAX_MEMBERS) return { error: "Rumah tangga ini sudah berisi dua orang." };
    if (household.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      return { error: "Nama ini sudah dipakai pasangan. Pakai nama lain." };
    }
    user = await db.user.create({ data: { name, email: p.data.email, passwordHash, householdId: household.id } });
  } else {
    user = await db.user.create({
      data: {
        name,
        email: p.data.email,
        passwordHash,
        household: { create: { inviteCode: newInviteCode() } },
      },
    });
  }

  await createSession(user.id, user.sessionVersion);
  redirect(mode === "baru" ? "/pengaturan?baru=1" : "/");
}

export async function login(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = z.object({ email, password: z.string().min(1, "Password belum diisi.") }).safeParse(fields(fd));
  if (!p.success) return invalid(p.error);

  const user = await db.user.findUnique({ where: { email: p.data.email } });
  const ok = await bcrypt.compare(p.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Email atau password salah." };

  await createSession(user.id, user.sessionVersion);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/masuk");
}

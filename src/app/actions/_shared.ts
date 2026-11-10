import "server-only";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { isIsoDay } from "@/lib/dates";
import { parseAmount } from "@/lib/format";
import { MAX_AMOUNT } from "@/lib/constants";
import type { ActionResult } from "@/lib/form";

export const zAmount = (label: string) =>
  z
    .unknown()
    .transform(parseAmount)
    .pipe(z.number().int().min(1, `${label} belum diisi.`).max(MAX_AMOUNT, `${label} terlalu besar.`));

export const zAmountOptional = z
  .unknown()
  .transform(parseAmount)
  .pipe(z.number().int().min(0).max(MAX_AMOUNT, "Jumlah terlalu besar."));

export const zDay = z.string().refine(isIsoDay, "Tanggal tidak valid.");

/** FormData -> objek biasa (nilai kosong tetap string kosong). */
export function fields(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd) if (typeof v === "string") out[k] = v.trim();
  return out;
}

export function invalid(error: z.ZodError): ActionResult {
  return { error: error.issues[0]?.message ?? "Isian belum lengkap." };
}

export function done(extra: Omit<ActionResult, "ok" | "error"> = {}): ActionResult {
  revalidatePath("/", "layout");
  return { ...extra, ok: Date.now() };
}

/** Pastikan userId adalah anggota rumah tangga yang sama. */
export async function assertMember(householdId: string, userId: string) {
  const n = await db.user.count({ where: { id: userId, householdId } });
  return n === 1;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/O dan 1/I supaya tidak tertukar

export function newInviteCode(): string {
  return Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

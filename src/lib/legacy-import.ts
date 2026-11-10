/* Membaca file hasil "Ekspor data" dari aplikasi versi lama (localStorage, satu file index.html).
   Bentuknya: { version: 1, people: [a, b], tx: [...], debts: [...] }. */
import { z } from "zod";
import { isIsoDay } from "./dates";
import { MAX_AMOUNT } from "./constants";

const day = z.string().refine(isIsoDay, "tanggal tidak valid");
const money = z.number().int().min(-MAX_AMOUNT).max(MAX_AMOUNT);

const legacyTx = z.object({
  id: z.string(),
  kind: z.enum(["income", "expense", "paylater", "payment"]),
  date: day,
  amount: money.min(0),
  category: z.string().max(80).default("Lainnya"),
  who: z.string().optional().default(""),
  note: z.string().max(200).optional().default(""),
  debtId: z.string().optional(),
});

const legacyDebt = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  type: z.enum(["paylater", "pinjol", "lain"]).catch("lain"),
  who: z.string().optional().default(""),
  start: money,
  monthly: money.min(0).optional().default(0),
  dueDay: z.number().int().min(0).max(31).optional().default(0),
  rate: z.number().min(0).max(100).optional().default(0),
  adjust: z.array(z.object({ date: day, amount: money })).optional().default([]),
});

export const legacyFile = z.object({
  people: z.array(z.string()).min(1).max(2),
  tx: z.array(legacyTx).max(50_000),
  debts: z.array(legacyDebt).max(500),
});

export type LegacyFile = z.infer<typeof legacyFile>;

export function parseLegacy(text: string): { data: LegacyFile } | { error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "File ini bukan JSON. Pilih file hasil Ekspor dari aplikasi lama." };
  }
  const r = legacyFile.safeParse(json);
  if (!r.success) {
    const issue = r.error.issues[0];
    return { error: `File ini bukan hasil ekspor Keuangan Berdua (${issue.path.join(".")}: ${issue.message}).` };
  }
  return { data: r.data };
}

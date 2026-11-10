/* Ekspor seluruh data rumah tangga sebagai JSON.
   Bentuknya sama dengan ekspor aplikasi versi lama (people/tx/debts, orang disebut dengan nama),
   jadi file ini bisa diimpor lagi lewat menu Pengaturan. */
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fromDate, todayIso } from "@/lib/dates";

export async function GET() {
  const user = await getUser();
  if (!user) return new Response("Belum masuk", { status: 401 });
  const hid = user.householdId;

  const [members, debts, tx] = await Promise.all([
    db.user.findMany({ where: { householdId: hid }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
    db.debt.findMany({ where: { householdId: hid }, include: { adjustments: true }, orderBy: { createdAt: "asc" } }),
    db.transaction.findMany({ where: { householdId: hid }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
  ]);
  const name = new Map(members.map((m) => [m.id, m.name]));
  const who = (id: string | null) => (id ? name.get(id) ?? "" : "");

  const body = {
    version: 2,
    exportedAt: new Date().toISOString(),
    people: members.map((m) => m.name),
    debts: debts.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type.toLowerCase(),
      who: who(d.ownerId),
      start: d.startBalance,
      monthly: d.monthly,
      dueDay: d.dueDay ?? 0,
      rate: d.rate ?? 0,
      adjust: d.adjustments.map((a) => ({ date: fromDate(a.date), amount: a.amount })),
    })),
    tx: tx.map((t) => ({
      id: t.id,
      kind: t.kind.toLowerCase(),
      date: fromDate(t.date),
      amount: t.amount,
      category: t.category,
      who: who(t.userId),
      note: t.note,
      ...(t.debtId ? { debtId: t.debtId } : {}),
    })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="keuangan-berdua-${todayIso()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

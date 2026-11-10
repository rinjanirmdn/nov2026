/* Pemuat data dari database ke bentuk polos yang dipakai finance.ts dan komponen.
   Semua query dibatasi householdId, jadi satu rumah tangga tidak bisa melihat data rumah tangga lain. */
import "server-only";
import { db } from "./db";
import { fromDate, monthRange } from "./dates";
import { debtBalance, type Debt, type DebtTotals, type Tx } from "./finance";

export interface Member {
  id: string;
  name: string;
}

export interface DebtView extends Debt {
  balance: number;
  totalPaid: number;
}

export async function loadMembers(householdId: string): Promise<Member[]> {
  return db.user.findMany({
    where: { householdId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function loadMonthTx(householdId: string, month: string): Promise<Tx[]> {
  const rows = await db.transaction.findMany({
    where: { householdId, date: monthRange(month) },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    date: fromDate(r.date),
    amount: r.amount,
    category: r.category,
    userId: r.userId,
    note: r.note,
    debtId: r.debtId,
  }));
}

export async function loadDebts(householdId: string): Promise<DebtView[]> {
  const [debts, adj, totals] = await Promise.all([
    db.debt.findMany({ where: { householdId }, orderBy: { createdAt: "asc" } }),
    db.debtAdjustment.groupBy({
      by: ["debtId"],
      where: { debt: { householdId } },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["debtId", "kind"],
      where: { householdId, debtId: { not: null }, kind: { in: ["PAYLATER", "PAYMENT"] } },
      _sum: { amount: true },
    }),
  ]);

  const adjBy = new Map(adj.map((a) => [a.debtId, a._sum.amount ?? 0]));
  const totalsBy = new Map<string, DebtTotals>();
  for (const t of totals) {
    const cur = totalsBy.get(t.debtId!) ?? { paylater: 0, paid: 0 };
    if (t.kind === "PAYLATER") cur.paylater += t._sum.amount ?? 0;
    else cur.paid += t._sum.amount ?? 0;
    totalsBy.set(t.debtId!, cur);
  }

  return debts.map((d) => {
    const debt: Debt = {
      id: d.id,
      name: d.name,
      type: d.type,
      ownerId: d.ownerId,
      startBalance: d.startBalance,
      monthly: d.monthly,
      dueDay: d.dueDay,
      rate: d.rate,
      adjustmentTotal: adjBy.get(d.id) ?? 0,
    };
    const t = totalsBy.get(d.id);
    return { ...debt, balance: debtBalance(debt, t), totalPaid: t?.paid ?? 0 };
  });
}

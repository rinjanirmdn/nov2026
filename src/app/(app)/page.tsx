import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadDebts, loadMembers, loadMonthTx } from "@/lib/data";
import { dueStatus, perPerson, sum, summarizeMonth } from "@/lib/finance";
import { rp } from "@/lib/format";
import { pickMonth } from "@/lib/page";
import { MonthNav } from "@/components/nav";
import { Bar, Card, Loading, Stat } from "@/components/ui";
import { PayForm, TxForm } from "@/components/forms";

async function SummaryPageContent({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const { month, today } = await pickMonth(searchParams);
  const [tx, debts, members] = await Promise.all([
    loadMonthTx(user.householdId, month),
    loadDebts(user.householdId),
    loadMembers(user.householdId),
  ]);

  const s = summarizeMonth(tx);
  const totalDebt = sum(debts, (d) => d.balance);
  const due = debts.filter((d) => d.dueDay && d.balance > 0).sort((a, b) => a.dueDay! - b.dueDay!);
  const paylaters = debts.filter((d) => d.type === "PAYLATER");
  const topCat = s.byCategory[0]?.amount ?? 1;

  return (
    <>
      <header className="top">
        <h1>Keuangan Berdua</h1>
        <MonthNav month={month} />
      </header>
      <main>
        <div className="stats">
          <Stat label="Pemasukan" value={rp(s.income)} tone="good" />
          <Stat label="Pengeluaran tunai" value={rp(s.spent)} />
          <Stat label="Bayar hutang" value={rp(s.paid)} />
          <Stat label="Sisa uang" value={rp(s.left)} tone={s.left < 0 ? "bad" : undefined} />
        </div>

        <Card title="Hutang">
          <div className="big">{rp(totalDebt)}</div>
          {!debts.length ? (
            <p className="muted">
              Belum ada hutang yang dicatat. Masukkan semua pinjaman dan paylater di menu Hutang supaya totalnya kelihatan.
            </p>
          ) : (
            <>
              <p className="muted">
                Bulan ini belanja pakai paylater {rp(s.paylater)}, bayar cicilan {rp(s.paid)}.
              </p>
              {s.debtDelta > 0 && <p className="bad">Hutang bertambah {rp(s.debtDelta)} bulan ini.</p>}
              {s.debtDelta < 0 && <p className="good">Hutang berkurang {rp(-s.debtDelta)} bulan ini.</p>}
              {s.installmentRatio !== null && (
                <p className={s.installmentRatio > 30 ? "warn" : "muted"}>
                  {s.installmentRatio}% pemasukan bulan ini dipakai untuk cicilan. Patokan yang umum dipakai: paling banyak 30%.
                </p>
              )}
            </>
          )}
        </Card>

        {due.length > 0 && (
          <Card title="Jatuh tempo bulan ini">
            {due.map((d) => {
              const st = dueStatus(d, tx, month, today);
              return (
                <div className="row" key={d.id}>
                  <div className="main">
                    {d.name}
                    <small className={st.tone}>{st.text}</small>
                  </div>
                  <span className="amt">{rp(d.monthly)}</span>
                  {!st.done && (
                    <PayForm debt={d} members={members} today={today} trigger="Bayar" triggerClass="small" />
                  )}
                </div>
              );
            })}
          </Card>
        )}

        {s.byCategory.length > 0 && (
          <Card title="Pengeluaran per kategori">
            <p className="muted">Termasuk yang dibayar pakai paylater.</p>
            {s.byCategory.map((c) => (
              <div className="row" key={c.category}>
                <div className="main">
                  {c.category}
                  <Bar percent={(c.amount / topCat) * 100} />
                </div>
                <span className="amt">{rp(c.amount)}</span>
              </div>
            ))}
          </Card>
        )}

        {tx.length ? (
          <Card title="Per orang">
            {members.map((m) => {
              const p = perPerson(tx, m.id);
              return (
                <div className="row" key={m.id}>
                  <div className="main">
                    {m.name}
                    <small>Keluar {rp(p.out)} (tunai, paylater, dan cicilan)</small>
                  </div>
                  <span className="amt good">+{rp(p.income)}</span>
                </div>
              );
            })}
          </Card>
        ) : (
          <Card>
            <p>Belum ada catatan di bulan ini.</p>
            <div className="actions">
              <TxForm members={members} paylaters={paylaters} today={today} kind="EXPENSE" trigger="Catat pengeluaran" triggerClass="primary" />
              <TxForm members={members} paylaters={paylaters} today={today} kind="INCOME" trigger="Catat pemasukan" />
            </div>
          </Card>
        )}
      </main>
    </>
  );
}

export default function SummaryPage(props: PageProps<"/">) {
  return (
    <Suspense fallback={<Loading title="Keuangan Berdua" />}>
      <SummaryPageContent {...props} />
    </Suspense>
  );
}

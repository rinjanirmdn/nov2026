import { Suspense } from "react";
import { Fragment } from "react";
import { requireUser } from "@/lib/auth";
import { loadDebts, loadMembers, loadMonthTx } from "@/lib/data";
import { longDate } from "@/lib/dates";
import { rp } from "@/lib/format";
import { pickMonth } from "@/lib/page";
import { deleteTransaction } from "@/app/actions/transactions";
import { MonthNav } from "@/components/nav";
import { Loading, Card } from "@/components/ui";
import { PayForm, TxForm } from "@/components/forms";
import { ConfirmButton } from "@/components/buttons";

async function TransactionsPageContent({ searchParams }: PageProps<"/transaksi">) {
  const user = await requireUser();
  const { month, today } = await pickMonth(searchParams);
  const [tx, debts, members] = await Promise.all([
    loadMonthTx(user.householdId, month),
    loadDebts(user.householdId),
    loadMembers(user.householdId),
  ]);
  const debtById = new Map(debts.map((d) => [d.id, d]));
  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const paylaters = debts.filter((d) => d.type === "PAYLATER");

  return (
    <>
      <header className="top">
        <h1>Transaksi</h1>
        <MonthNav month={month} />
      </header>
      <main>
        <div className="actions">
          <TxForm members={members} paylaters={paylaters} today={today} kind="EXPENSE" trigger="+ Pengeluaran" triggerClass="primary" />
          <TxForm members={members} paylaters={paylaters} today={today} kind="INCOME" trigger="+ Pemasukan" />
        </div>

        {!tx.length ? (
          <Card>
            <p className="muted">Belum ada transaksi di bulan ini.</p>
          </Card>
        ) : (
          <Card>
            {tx.map((t, i) => {
              const heading = i === 0 || tx[i - 1].date !== t.date ? <p className="day">{longDate(t.date)}</p> : null;
              const debt = t.debtId ? debtById.get(t.debtId) : undefined;
              const debtName = debt?.name ?? "hutang yang sudah dihapus";
              const title = t.kind === "PAYMENT" ? `Bayar ${debtName}` : t.category;
              const sub = [t.userId ? nameById.get(t.userId) : null, t.note].filter(Boolean).join(" · ");
              const isIncome = t.kind === "INCOME";
              return (
                <Fragment key={t.id}>
                  {heading}
                  <div className="row">
                    <div className="main">
                      {title}
                      {t.kind === "PAYLATER" && <span className="badge">{debtName}</span>}
                      <small>{sub}</small>
                    </div>
                    <span className={"amt" + (isIncome ? " good" : "")}>
                      {isIncome ? "+" : "-"}
                      {rp(t.amount)}
                    </span>
                    <div className="tools">
                      {t.kind === "PAYMENT" ? (
                        debt && <PayForm debt={debt} members={members} today={today} tx={t} trigger="Ubah" triggerClass="small" />
                      ) : (
                        <TxForm members={members} paylaters={paylaters} today={today} tx={t} trigger="Ubah" triggerClass="small" />
                      )}
                      <ConfirmButton action={deleteTransaction.bind(null, t.id)} confirmText="Hapus transaksi ini?" label="Hapus transaksi">
                        Hapus
                      </ConfirmButton>
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </Card>
        )}
      </main>
    </>
  );
}

export default function TransactionsPage(props: PageProps<"/transaksi">) {
  return (
    <Suspense fallback={<Loading title="Transaksi" />}>
      <TransactionsPageContent {...props} />
    </Suspense>
  );
}

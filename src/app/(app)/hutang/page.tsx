import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadDebts, loadMembers } from "@/lib/data";
import { monthsToPayoff, payoffOrder, sum, type PayoffOrder } from "@/lib/finance";
import { rp } from "@/lib/format";
import { todayIso } from "@/lib/dates";
import { DEBT_TYPE_LABEL } from "@/lib/constants";
import { deleteDebt } from "@/app/actions/debts";
import { Bar, Card, Loading } from "@/components/ui";
import { AdjustForm, DebtForm, PayForm } from "@/components/forms";
import { ConfirmButton } from "@/components/buttons";

async function DebtsPageContent({ searchParams }: PageProps<"/hutang">) {
  const user = await requireUser();
  const order: PayoffOrder = (await searchParams).urut === "bunga" ? "bunga" : "kecil";
  const today = todayIso();
  const [debts, members] = await Promise.all([loadDebts(user.householdId), loadMembers(user.householdId)]);
  const nameById = new Map(members.map((m) => [m.id, m.name]));

  const open = debts.filter((d) => d.balance > 0);
  const total = sum(debts, (d) => d.balance);
  const monthly = sum(open, (d) => d.monthly);
  const byRate = order === "bunga";

  return (
    <>
      <header className="top">
        <h1>Hutang</h1>
      </header>
      <main>
        <div className="actions">
          <DebtForm members={members} trigger="+ Hutang" triggerClass="primary" />
        </div>

        {!debts.length ? (
          <Card>
            <p>
              Catat setiap pinjaman dan paylater satu per satu: nama aplikasinya, sisa hutang hari ini, cicilan per bulan, dan tanggal
              jatuh temponya.
            </p>
            <p className="muted">Angka sisa hutang bisa dilihat di aplikasi masing-masing.</p>
          </Card>
        ) : (
          <>
            <Card title="Total hutang">
              <div className="big">{rp(total)}</div>
              <p className="muted">Cicilan wajib per bulan {rp(monthly)}.</p>
            </Card>

            {open.length > 1 && (
              <Card title="Urutan pelunasan">
                <p className="muted">
                  Bayar cicilan minimum semuanya. Kalau ada uang lebih, masukkan ke hutang nomor 1 sampai lunas, lalu lanjut ke nomor 2.
                </p>
                <div className="actions">
                  <Link href="/hutang" className={"btn small" + (byRate ? "" : " primary")} replace scroll={false}>
                    Saldo terkecil dulu
                  </Link>
                  <Link href="/hutang?urut=bunga" className={"btn small" + (byRate ? " primary" : "")} replace scroll={false}>
                    Bunga tertinggi dulu
                  </Link>
                </div>
                {payoffOrder(open, order).map((d, i) => (
                  <div className="row" key={d.id}>
                    <div className="main">
                      {i + 1}. {d.name}
                      {byRate && <small>Bunga {d.rate ?? 0}% per bulan</small>}
                    </div>
                    <span className="amt">{rp(d.balance)}</span>
                  </div>
                ))}
                <p className="muted">
                  {byRate
                    ? "Urutan ini paling hemat bunga."
                    : "Urutan ini paling cepat mengurangi jumlah tagihan yang harus diingat tiap bulan."}
                </p>
              </Card>
            )}

            {debts.map((d) => {
              const info = [DEBT_TYPE_LABEL[d.type], d.ownerId ? nameById.get(d.ownerId) : null];
              if (d.monthly) info.push(`cicilan ${rp(d.monthly)}/bulan`);
              if (d.dueDay) info.push(`jatuh tempo tgl ${d.dueDay}`);
              if (d.rate) info.push(`bunga ${d.rate}%/bulan`);
              const months = monthsToPayoff(d.balance, d.monthly);
              return (
                <Card key={d.id}>
                  <div className="row">
                    <div className="main">
                      <b>{d.name}</b>
                      <small>{info.filter(Boolean).join(" · ")}</small>
                    </div>
                    <span className="amt">{d.balance > 0 ? rp(d.balance) : <span className="good">Lunas</span>}</span>
                  </div>
                  {d.totalPaid > 0 && d.balance > 0 && (
                    <>
                      <Bar percent={(d.totalPaid / (d.totalPaid + d.balance)) * 100} />
                      <p className="muted">Sudah dibayar {rp(d.totalPaid)}.</p>
                    </>
                  )}
                  {months !== null && (
                    <p className="muted">
                      Kira-kira {months} bulan lagi dengan cicilan sekarang, kalau tidak ada hutang baru. Bunga dan denda belum dihitung.
                    </p>
                  )}
                  <div className="actions end">
                    {d.balance > 0 && (
                      <PayForm debt={d} members={members} today={today} trigger="Bayar" triggerClass="small primary" />
                    )}
                    <AdjustForm debt={d} trigger="Sesuaikan saldo" triggerClass="small" />
                    <DebtForm members={members} debt={d} trigger="Ubah" triggerClass="small" />
                    <ConfirmButton
                      action={deleteDebt.bind(null, d.id)}
                      confirmText={`Hapus ${d.name}? Transaksi yang sudah dicatat tetap ada.`}
                    >
                      Hapus
                    </ConfirmButton>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </main>
    </>
  );
}

export default function DebtsPage(props: PageProps<"/hutang">) {
  return (
    <Suspense fallback={<Loading title="Hutang" />}>
      <DebtsPageContent {...props} />
    </Suspense>
  );
}

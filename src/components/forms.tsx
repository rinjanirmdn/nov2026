"use client";

import { useState } from "react";
import { CATEGORIES, DEBT_TYPE_LABEL, type DebtTypeKey } from "@/lib/constants";
import { rp } from "@/lib/format";
import type { Member } from "@/lib/data";
import type { Tx } from "@/lib/finance";
import { saveTransaction } from "@/app/actions/transactions";
import { adjustDebt, payDebt, saveDebt } from "@/app/actions/debts";
import { FormDialog } from "./form-dialog";
import { AmountInput, DateInput, MemberSelect } from "./fields";

interface DebtOption {
  id: string;
  name: string;
}

/* ---------- transaksi (pemasukan / pengeluaran / belanja paylater) ---------- */

function TxFields({ members, paylaters, today, tx, initialKind }: {
  members: Member[];
  paylaters: DebtOption[];
  today: string;
  tx?: Tx;
  initialKind: "INCOME" | "EXPENSE";
}) {
  const [kind, setKind] = useState(initialKind);
  const cats: readonly string[] = CATEGORIES[kind];
  // Kategori lama yang tidak ada di daftar (mis. dari data impor) tetap bisa dipilih.
  const options = tx && !cats.includes(tx.category) ? [tx.category, ...cats] : cats;

  return (
    <>
      {tx && <input type="hidden" name="id" value={tx.id} />}
      <div className="seg">
        {(["EXPENSE", "INCOME"] as const).map((k) => (
          <label key={k}>
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
            <span>{k === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}</span>
          </label>
        ))}
      </div>
      <AmountInput label="Jumlah" defaultValue={tx?.amount} />
      <DateInput defaultValue={tx?.date ?? today} />
      <label>
        Kategori
        <select name="category" key={kind} defaultValue={tx && (tx.kind === "INCOME") === (kind === "INCOME") ? tx.category : undefined}>
          {options.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <MemberSelect label={kind === "INCOME" ? "Pemasukan siapa" : "Siapa yang belanja"} members={members} defaultValue={tx?.userId} />
      {kind === "EXPENSE" && (
        <>
          <label>
            Dibayar pakai
            <select name="method" defaultValue={tx?.kind === "PAYLATER" ? tx.debtId ?? "" : ""}>
              <option value="">Tunai / transfer / e-wallet</option>
              {paylaters.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          {!paylaters.length && (
            <p className="muted">Paylater belum muncul di sini? Tambahkan dulu di menu Hutang dengan jenis Paylater.</p>
          )}
        </>
      )}
      <label>
        Catatan (boleh kosong)
        <input name="note" maxLength={80} defaultValue={tx?.note} />
      </label>
    </>
  );
}

export function TxForm(props: {
  members: Member[];
  paylaters: DebtOption[];
  today: string;
  kind?: "INCOME" | "EXPENSE";
  tx?: Tx;
  trigger: React.ReactNode;
  triggerClass?: string;
}) {
  const { tx } = props;
  const initialKind = tx ? (tx.kind === "INCOME" ? "INCOME" : "EXPENSE") : props.kind ?? "EXPENSE";
  return (
    <FormDialog
      title={tx ? "Ubah transaksi" : "Catat transaksi"}
      trigger={props.trigger}
      triggerClass={props.triggerClass}
      action={saveTransaction}
    >
      <TxFields members={props.members} paylaters={props.paylaters} today={props.today} tx={tx} initialKind={initialKind} />
    </FormDialog>
  );
}

/* ---------- hutang ---------- */

export interface DebtFormValue {
  id: string;
  name: string;
  type: DebtTypeKey;
  ownerId: string | null;
  monthly: number;
  dueDay: number | null;
  rate: number | null;
}

export function DebtForm({ members, debt, trigger, triggerClass }: {
  members: Member[];
  debt?: DebtFormValue;
  trigger: React.ReactNode;
  triggerClass?: string;
}) {
  return (
    <FormDialog title={debt ? "Ubah hutang" : "Tambah hutang"} trigger={trigger} triggerClass={triggerClass} action={saveDebt}>
      {debt && <input type="hidden" name="id" value={debt.id} />}
      <label>
        Nama aplikasi / pemberi pinjaman
        <input name="name" required maxLength={40} defaultValue={debt?.name} placeholder="mis. SPayLater" />
      </label>
      <label>
        Jenis
        <select name="type" defaultValue={debt?.type ?? "PAYLATER"}>
          {Object.entries(DEBT_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <MemberSelect label="Atas nama" members={members} defaultValue={debt?.ownerId} />
      {!debt && <AmountInput label="Sisa hutang hari ini" name="startBalance" />}
      <AmountInput label="Cicilan per bulan" name="monthly" defaultValue={debt?.monthly} />
      <label>
        Tanggal jatuh tempo tiap bulan (1-31)
        <input name="dueDay" type="number" min={1} max={31} defaultValue={debt?.dueDay ?? ""} />
      </label>
      <label>
        Bunga per bulan dalam % (boleh kosong)
        <input name="rate" type="number" min={0} max={100} step="0.01" defaultValue={debt?.rate ?? ""} />
      </label>
    </FormDialog>
  );
}

export function PayForm({ debt, members, today, tx, trigger, triggerClass }: {
  debt: { id: string; name: string; balance: number; monthly: number; ownerId: string | null };
  members: Member[];
  today: string;
  /** Diisi saat mengubah pembayaran yang sudah dicatat. */
  tx?: Tx;
  trigger: React.ReactNode;
  triggerClass?: string;
}) {
  const suggested = Math.max(0, Math.min(debt.monthly || debt.balance, debt.balance));
  return (
    <FormDialog title={(tx ? "Ubah pembayaran " : "Bayar ") + debt.name} trigger={trigger} triggerClass={triggerClass} action={payDebt}>
      <input type="hidden" name="debtId" value={debt.id} />
      {tx && <input type="hidden" name="id" value={tx.id} />}
      <p className="muted">Sisa hutang {rp(debt.balance)}.</p>
      <AmountInput label="Jumlah dibayar" defaultValue={tx?.amount ?? suggested} />
      <DateInput defaultValue={tx?.date ?? today} />
      <MemberSelect label="Dibayar oleh" members={members} defaultValue={tx?.userId ?? debt.ownerId} />
    </FormDialog>
  );
}

export function AdjustForm({ debt, trigger, triggerClass }: {
  debt: { id: string; name: string; balance: number };
  trigger: React.ReactNode;
  triggerClass?: string;
}) {
  return (
    <FormDialog title={"Sesuaikan saldo " + debt.name} trigger={trigger} triggerClass={triggerClass} action={adjustDebt}>
      <input type="hidden" name="debtId" value={debt.id} />
      <p className="muted">
        Tercatat di sini {rp(debt.balance)}. Kalau angka di aplikasinya berbeda (misalnya karena bunga atau denda), isi angka yang
        benar.
      </p>
      <AmountInput label="Sisa hutang menurut aplikasi" name="balance" defaultValue={debt.balance} />
    </FormDialog>
  );
}

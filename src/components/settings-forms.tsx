"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { ActionResult, FormAction } from "@/lib/form";
import type { Member } from "@/lib/data";
import { importData } from "@/app/actions/settings";
import { ActionForm } from "./action-form";

/** Form biasa di halaman (bukan dialog) yang menampilkan pesan sukses / error di bawahnya. */
export function InlineForm({
  action,
  submitLabel,
  submitClass = "primary",
  children,
}: {
  action: FormAction;
  submitLabel: string;
  submitClass?: string;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, {});
  return (
    <ActionForm action={formAction} key={state.ok}>
      {children}
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && !state.error && (
        <p className="good" role="status">
          {state.message}
        </p>
      )}
      <button type="submit" className={submitClass} disabled={pending}>
        {pending ? "Memproses…" : submitLabel}
      </button>
    </ActionForm>
  );
}

/** Impor file ekspor. Nama orang di file dibaca di browser supaya bisa dipasangkan dengan akun di sini. */
export function ImportForm({ members, meId }: { members: Member[]; meId: string }) {
  const [people, setPeople] = useState<string[] | null>(null);
  const [summary, setSummary] = useState("");
  const [fileError, setFileError] = useState("");

  async function onFile(file: File | undefined) {
    setPeople(null);
    setSummary("");
    setFileError("");
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.people) || !Array.isArray(data.tx) || !Array.isArray(data.debts)) throw new Error();
      setPeople(data.people.map(String).slice(0, 2));
      setSummary(`${data.tx.length} transaksi, ${data.debts.length} hutang.`);
    } catch {
      setFileError("File ini bukan hasil ekspor Keuangan Berdua.");
    }
  }

  return (
    <InlineForm action={importData} submitLabel="Impor dan ganti data" submitClass="">
      <label>
        File ekspor (.json)
        <input type="file" name="file" accept="application/json,.json" required onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {fileError && <p className="error">{fileError}</p>}
      {people && (
        <>
          <p className="muted">Isi file: {summary} Pasangkan nama di file dengan akun di sini:</p>
          {people.map((name, i) => (
            <label key={i}>
              Catatan milik “{name}” masuk ke
              <select name={"map" + i} defaultValue={members[i]?.id ?? meId}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {members.length < 2 && (
            <p className="muted">
              Pasangan belum bergabung, jadi semua catatan masuk ke akun Anda. Supaya terpisah per orang, minta pasangan mendaftar
              dulu dengan kode undangan, lalu impor.
            </p>
          )}
          <label className="check">
            <input type="checkbox" name="confirm" />
            <span>Saya paham semua transaksi dan hutang yang sekarang ada di sini akan diganti dengan isi file.</span>
          </label>
        </>
      )}
    </InlineForm>
  );
}

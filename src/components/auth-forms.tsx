"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ActionResult } from "@/lib/form";
import { login, register } from "@/app/actions/auth";
import { ActionForm } from "./action-form";

function ErrorText({ state }: { state: ActionResult }) {
  return state.error ? (
    <p className="error" role="alert">
      {state.error}
    </p>
  ) : null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(login, {});
  return (
    <ActionForm action={action} className="card">
      <h2>Masuk</h2>
      <label>
        Email
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      <ErrorText state={state} />
      <div className="actions">
        <button type="submit" className="primary" disabled={pending}>
          {pending ? "Memeriksa…" : "Masuk"}
        </button>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        Belum punya akun? <Link href="/daftar">Daftar</Link>
      </p>
    </ActionForm>
  );
}

export function RegisterForm({ initialCode }: { initialCode?: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(register, {});
  const [mode, setMode] = useState<"baru" | "gabung">(initialCode ? "gabung" : "baru");
  return (
    <ActionForm action={action} className="card">
      <h2>Daftar</h2>
      <div className="seg">
        <label>
          <input type="radio" name="mode" value="baru" checked={mode === "baru"} onChange={() => setMode("baru")} />
          <span>Mulai baru</span>
        </label>
        <label>
          <input type="radio" name="mode" value="gabung" checked={mode === "gabung"} onChange={() => setMode("gabung")} />
          <span>Gabung dengan pasangan</span>
        </label>
      </div>
      <p className="muted">
        {mode === "baru"
          ? "Untuk orang pertama. Setelah daftar, Anda dapat kode undangan untuk pasangan."
          : "Pakai kode undangan dari menu Pengaturan di akun pasangan."}
      </p>
      {mode === "gabung" && (
        <label>
          Kode undangan
          <input name="inviteCode" required autoCapitalize="characters" autoComplete="off" defaultValue={initialCode} />
        </label>
      )}
      <label>
        Nama panggilan
        <input name="name" maxLength={20} required />
      </label>
      <label>
        Email
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label>
        Password (minimal 8 karakter)
        <input type="password" name="password" autoComplete="new-password" minLength={8} required />
      </label>
      <ErrorText state={state} />
      <div className="actions">
        <button type="submit" className="primary" disabled={pending}>
          {pending ? "Mendaftar…" : "Daftar"}
        </button>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        Sudah punya akun? <Link href="/masuk">Masuk</Link>
      </p>
    </ActionForm>
  );
}

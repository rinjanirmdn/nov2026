import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

/** Yang sudah masuk tidak perlu melihat halaman Masuk/Daftar. */
async function RedirectIfLoggedIn() {
  if (await getUser()) redirect("/");
  return null;
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth">
      <Suspense>
        <RedirectIfLoggedIn />
      </Suspense>
      <div>
        <h1>Keuangan Berdua</h1>
        <p className="muted">Catat pemasukan, pengeluaran, paylater, dan hutang berdua dari HP masing-masing.</p>
      </div>
      {children}
    </main>
  );
}

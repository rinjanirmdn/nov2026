import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Daftar · Keuangan Berdua" };

async function Form({ searchParams }: PageProps<"/daftar">) {
  const kode = (await searchParams).kode;
  return <RegisterForm initialCode={typeof kode === "string" ? kode : undefined} />;
}

export default function RegisterPage(props: PageProps<"/daftar">) {
  return (
    <Suspense
      fallback={
        <section className="card">
          <p className="muted">Memuat…</p>
        </section>
      }
    >
      <Form {...props} />
    </Suspense>
  );
}

import { Suspense } from "react";
import { Tabs } from "@/components/nav";

// Pemeriksaan login ada di setiap halaman (requireUser) dan setiap server action,
// bukan di sini, supaya kerangka halaman bisa tampil lebih dulu.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      {children}
      <Suspense>
        <Tabs />
      </Suspense>
    </div>
  );
}

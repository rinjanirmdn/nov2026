"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { shiftMonth } from "@/lib/dates";

const TABS = [
  { href: "/", label: "Ringkasan" },
  { href: "/transaksi", label: "Transaksi" },
  { href: "/hutang", label: "Hutang" },
  { href: "/pengaturan", label: "Pengaturan" },
];

export function Tabs() {
  const pathname = usePathname();
  const bulan = useSearchParams().get("bulan");
  return (
    <nav className="tabs" aria-label="Menu utama">
      {TABS.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={bulan ? `${t.href}?bulan=${bulan}` : t.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MonthNav({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const go = (m: string) => router.push(`${pathname}?bulan=${m}`);
  return (
    <div className="month">
      <button type="button" onClick={() => go(shiftMonth(month, -1))} aria-label="Bulan sebelumnya">
        ‹
      </button>
      <input type="month" value={month} aria-label="Pilih bulan" onChange={(e) => e.target.value && go(e.target.value)} />
      <button type="button" onClick={() => go(shiftMonth(month, 1))} aria-label="Bulan berikutnya">
        ›
      </button>
    </div>
  );
}

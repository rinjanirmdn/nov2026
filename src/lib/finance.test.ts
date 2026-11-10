import { describe, expect, it } from "vitest";
import { debtBalance, dueStatus, monthsToPayoff, payoffOrder, summarizeMonth, type Debt, type Tx } from "./finance";
import { isIsoDay, monthRange, shiftMonth, todayIso } from "./dates";
import { parseAmount, rp } from "./format";
import { parseLegacy } from "./legacy-import";

const tx = (p: Partial<Tx>): Tx => ({
  id: Math.random().toString(36),
  kind: "EXPENSE",
  date: "2026-11-05",
  amount: 0,
  category: "Lainnya",
  userId: "a",
  note: "",
  debtId: null,
  ...p,
});

const debt = (p: Partial<Debt>): Debt => ({
  id: "d1",
  name: "SPayLater",
  type: "PAYLATER",
  ownerId: "a",
  startBalance: 1_000_000,
  monthly: 250_000,
  dueDay: 10,
  rate: 2.95,
  adjustmentTotal: 0,
  ...p,
});

describe("summarizeMonth", () => {
  const list = [
    tx({ kind: "INCOME", amount: 5_000_000, category: "Gaji" }),
    tx({ kind: "EXPENSE", amount: 300_000, category: "Makan & belanja harian" }),
    tx({ kind: "PAYLATER", amount: 200_000, category: "Makan & belanja harian", debtId: "d1" }),
    tx({ kind: "PAYMENT", amount: 2_000_000, category: "Bayar hutang", debtId: "d1" }),
  ];
  const s = summarizeMonth(list);

  it("sisa uang = pemasukan - tunai - cicilan (paylater belum mengurangi uang)", () => {
    expect(s.left).toBe(5_000_000 - 300_000 - 2_000_000);
  });
  it("perubahan hutang = paylater - cicilan", () => {
    expect(s.debtDelta).toBe(200_000 - 2_000_000);
  });
  it("kategori menggabungkan tunai dan paylater, terurut terbesar", () => {
    expect(s.byCategory).toEqual([{ category: "Makan & belanja harian", amount: 500_000 }]);
  });
  it("rasio cicilan", () => {
    expect(s.installmentRatio).toBe(40);
  });
});

describe("debtBalance", () => {
  it("saldo awal + paylater - cicilan + penyesuaian", () => {
    expect(debtBalance(debt({ adjustmentTotal: 15_000 }), { paylater: 100_000, paid: 250_000 })).toBe(865_000);
  });
  it("tanpa transaksi = saldo awal", () => {
    expect(debtBalance(debt({}), undefined)).toBe(1_000_000);
  });
});

describe("dueStatus", () => {
  const d = debt({ dueDay: 31 });
  it("tanggal 31 di bulan Februari jadi tanggal terakhir", () => {
    expect(dueStatus(d, [], "2026-02", "2026-01-01").day).toBe(28);
  });
  it("lewat jatuh tempo di bulan berjalan", () => {
    const s = dueStatus(debt({ dueDay: 5 }), [], "2026-11", "2026-11-11");
    expect(s).toMatchObject({ tone: "bad", done: false });
    expect(s.text).toContain("lewat 6 hari");
  });
  it("sudah dibayar penuh", () => {
    const paid = [tx({ kind: "PAYMENT", amount: 250_000, debtId: "d1" })];
    expect(dueStatus(debt({}), paid, "2026-11", "2026-11-11").done).toBe(true);
  });
});

describe("payoffOrder", () => {
  const list = [
    { id: "a", balance: 500, rate: 1 },
    { id: "b", balance: 100, rate: 0 },
    { id: "c", balance: 900, rate: 4 },
  ];
  it("saldo terkecil dulu", () => expect(payoffOrder(list, "kecil").map((x) => x.id)).toEqual(["b", "a", "c"]));
  it("bunga tertinggi dulu", () => expect(payoffOrder(list, "bunga").map((x) => x.id)).toEqual(["c", "a", "b"]));
  it("perkiraan bulan", () => expect(monthsToPayoff(1_000_000, 300_000)).toBe(4));
});

describe("dates & format", () => {
  it("shiftMonth melewati tahun", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("monthRange", () => {
    const r = monthRange("2026-11");
    expect(r.gte.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(r.lt.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
  it("isIsoDay menolak tanggal yang tidak ada", () => {
    expect(isIsoDay("2026-02-29")).toBe(false);
    expect(isIsoDay("2028-02-29")).toBe(true);
  });
  it("todayIso memakai zona waktu Jakarta", () => {
    // 2026-11-10 18:00 UTC = 2026-11-11 01:00 WIB
    expect(todayIso(new Date("2026-11-10T18:00:00Z"), "Asia/Jakarta")).toBe("2026-11-11");
  });
  it("rupiah", () => {
    expect(parseAmount("Rp 1.250.000")).toBe(1_250_000);
    expect(rp(-1500)).toBe("-Rp 1.500");
  });
});

describe("parseLegacy", () => {
  it("menerima file ekspor versi lama", () => {
    const file = JSON.stringify({
      version: 1,
      people: ["Andi", "Sari"],
      tx: [{ id: "t1", kind: "paylater", date: "2026-10-02", amount: 50000, category: "Hiburan", who: "Sari", note: "", debtId: "x" }],
      debts: [{ id: "x", name: "Kredivo", type: "paylater", who: "Sari", start: 900000, monthly: 0, dueDay: 0, rate: 0, adjust: [] }],
    });
    const r = parseLegacy(file);
    expect("data" in r && r.data.tx.length).toBe(1);
  });
  it("menolak file lain", () => {
    expect("error" in parseLegacy('{"foo":1}')).toBe(true);
    expect("error" in parseLegacy("bukan json")).toBe(true);
  });
});

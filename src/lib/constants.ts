export const CATEGORIES = {
  INCOME: ["Gaji", "ShopeeFood", "Bonus/THR", "Lainnya"],
  EXPENSE: [
    "Makan & belanja harian",
    "Transport & bensin",
    "Sewa/kontrakan",
    "Listrik, air, internet",
    "Pulsa & kuota",
    "Kesehatan",
    "Keluarga",
    "Hiburan",
    "Lainnya",
  ],
} as const;

export const DEBT_TYPE_LABEL = {
  PAYLATER: "Paylater",
  PINJOL: "Pinjaman online",
  LAIN: "Lainnya",
} as const;

export type DebtTypeKey = keyof typeof DEBT_TYPE_LABEL;

/** Batas atas satu nominal. Kolom di database bertipe Int (maks ~2,1 miliar). */
export const MAX_AMOUNT = 2_000_000_000;

/** "Berdua": satu rumah tangga paling banyak dua akun. */
export const MAX_MEMBERS = 2;

/** Zona waktu untuk menentukan "hari ini" (jatuh tempo, tanggal default). */
export const TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Jakarta";

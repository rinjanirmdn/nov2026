/** Hasil server action yang dipakai bersama oleh semua form. */
export interface ActionResult {
  error?: string;
  /** Diisi angka berbeda setiap kali sukses, supaya dialog tahu harus menutup. */
  ok?: number;
  /** Kalau transaksi jatuh di bulan lain, halaman pindah ke bulan itu. */
  month?: string;
  message?: string;
}

export type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

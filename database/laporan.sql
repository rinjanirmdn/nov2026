-- =============================================================================
-- Keuangan Berdua: kumpulan query laporan untuk DBeaver
-- Jalankan satu per satu (taruh kursor di query, Ctrl+Enter).
-- Perhitungannya sama dengan src/lib/finance.ts di aplikasi.
-- =============================================================================

-- 1. Saldo setiap hutang = saldo awal + belanja paylater - pembayaran + penyesuaian
SELECT d.name,
       d.type,
       u.name                                            AS atas_nama,
       d.start_balance
         + COALESCE(t.paylater, 0)
         - COALESCE(t.dibayar, 0)
         + COALESCE(a.penyesuaian, 0)                    AS sisa_hutang,
       COALESCE(t.dibayar, 0)                            AS sudah_dibayar,
       d.monthly                                         AS cicilan_per_bulan,
       d.due_day                                         AS jatuh_tempo
FROM debts d
LEFT JOIN users u ON u.id = d.owner_id
LEFT JOIN (
  SELECT debt_id,
         SUM(amount) FILTER (WHERE kind = 'PAYLATER') AS paylater,
         SUM(amount) FILTER (WHERE kind = 'PAYMENT')  AS dibayar
  FROM transactions
  WHERE debt_id IS NOT NULL
  GROUP BY debt_id
) t ON t.debt_id = d.id
LEFT JOIN (SELECT debt_id, SUM(amount) AS penyesuaian FROM debt_adjustments GROUP BY debt_id) a ON a.debt_id = d.id
ORDER BY sisa_hutang DESC;

-- 2. Ringkasan per bulan: pemasukan, pengeluaran tunai, cicilan, sisa uang, perubahan hutang
SELECT to_char(date_trunc('month', date), 'YYYY-MM')               AS bulan,
       SUM(amount) FILTER (WHERE kind = 'INCOME')                   AS pemasukan,
       SUM(amount) FILTER (WHERE kind = 'EXPENSE')                  AS pengeluaran_tunai,
       SUM(amount) FILTER (WHERE kind = 'PAYMENT')                  AS bayar_hutang,
       COALESCE(SUM(amount) FILTER (WHERE kind = 'INCOME'), 0)
         - COALESCE(SUM(amount) FILTER (WHERE kind IN ('EXPENSE', 'PAYMENT')), 0) AS sisa_uang,
       COALESCE(SUM(amount) FILTER (WHERE kind = 'PAYLATER'), 0)
         - COALESCE(SUM(amount) FILTER (WHERE kind = 'PAYMENT'), 0) AS perubahan_hutang
FROM transactions
GROUP BY 1
ORDER BY 1 DESC;

-- 3. Pengeluaran per kategori bulan ini (tunai + paylater)
SELECT category, SUM(amount) AS total, COUNT(*) AS jumlah_transaksi
FROM transactions
WHERE kind IN ('EXPENSE', 'PAYLATER')
  AND date >= date_trunc('month', current_date)
  AND date <  date_trunc('month', current_date) + interval '1 month'
GROUP BY category
ORDER BY total DESC;

-- 4. Per orang bulan ini
SELECT u.name,
       COALESCE(SUM(t.amount) FILTER (WHERE t.kind = 'INCOME'), 0)  AS masuk,
       COALESCE(SUM(t.amount) FILTER (WHERE t.kind <> 'INCOME'), 0) AS keluar
FROM users u
LEFT JOIN transactions t
  ON t.user_id = u.id
 AND t.date >= date_trunc('month', current_date)
 AND t.date <  date_trunc('month', current_date) + interval '1 month'
GROUP BY u.name
ORDER BY u.name;

-- 5. Rumah tangga dan anggotanya
SELECT h.id, h.invite_code, h.created_at, string_agg(u.name || ' <' || u.email || '>', ', ' ORDER BY u.created_at) AS anggota
FROM households h
LEFT JOIN users u ON u.household_id = h.id
GROUP BY h.id
ORDER BY h.created_at DESC;

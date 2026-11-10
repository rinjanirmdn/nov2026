-- =============================================================================
-- Keuangan Berdua: data contoh (OPSIONAL)
-- Jalankan SETELAH schema.sql. Berguna untuk mencoba aplikasi dan melihat bentuk data di DBeaver.
--
-- Akun contoh (password keduanya: rahasia123)
--   andi@contoh.test
--   sari@contoh.test
--
-- Tanggal memakai bulan berjalan (date_trunc), jadi langsung tampil di Ringkasan.
-- Hapus lagi semua data contoh:  DELETE FROM households WHERE id = 'contoh_rumah';
-- =============================================================================

BEGIN;

INSERT INTO households (id, invite_code) VALUES ('contoh_rumah', 'CONTOH22');

INSERT INTO users (id, name, email, password_hash, household_id) VALUES
  ('contoh_andi', 'Andi', 'andi@contoh.test', '$2b$10$RxTeta0FEkRsTwXczhvit.jSpHZJzSz1UenUGe.ENOqBmMYnW6jLm', 'contoh_rumah'),
  ('contoh_sari', 'Sari', 'sari@contoh.test', '$2b$10$RxTeta0FEkRsTwXczhvit.jSpHZJzSz1UenUGe.ENOqBmMYnW6jLm', 'contoh_rumah');

INSERT INTO debts (id, household_id, name, type, owner_id, start_balance, monthly, due_day, rate) VALUES
  ('contoh_spay',    'contoh_rumah', 'SPayLater',   'PAYLATER', 'contoh_sari', 1500000, 350000, 5,  2.95),
  ('contoh_kredivo', 'contoh_rumah', 'Kredivo',     'PAYLATER', 'contoh_andi',  800000, 200000, 12, 2.6),
  ('contoh_pinjol',  'contoh_rumah', 'AdaKami',     'PINJOL',   'contoh_andi', 3000000, 750000, 25, 4);

-- Koreksi saldo karena denda keterlambatan
INSERT INTO debt_adjustments (id, debt_id, date, amount) VALUES
  ('contoh_adj1', 'contoh_pinjol', date_trunc('month', current_date)::date + 2, 45000);

INSERT INTO transactions (id, household_id, kind, date, amount, category, user_id, note, debt_id) VALUES
  ('contoh_t01', 'contoh_rumah', 'INCOME',   date_trunc('month', current_date)::date + 0,  4800000, 'Gaji',                   'contoh_andi', '',                 NULL),
  ('contoh_t02', 'contoh_rumah', 'INCOME',   date_trunc('month', current_date)::date + 0,  3200000, 'Gaji',                   'contoh_sari', '',                 NULL),
  ('contoh_t03', 'contoh_rumah', 'INCOME',   date_trunc('month', current_date)::date + 6,   450000, 'ShopeeFood',             'contoh_andi', 'Narik akhir pekan', NULL),
  ('contoh_t04', 'contoh_rumah', 'EXPENSE',  date_trunc('month', current_date)::date + 1,  1200000, 'Sewa/kontrakan',         'contoh_andi', '',                 NULL),
  ('contoh_t05', 'contoh_rumah', 'EXPENSE',  date_trunc('month', current_date)::date + 2,   350000, 'Listrik, air, internet', 'contoh_sari', '',                 NULL),
  ('contoh_t06', 'contoh_rumah', 'EXPENSE',  date_trunc('month', current_date)::date + 3,   150000, 'Transport & bensin',     'contoh_andi', '',                 NULL),
  ('contoh_t07', 'contoh_rumah', 'PAYLATER', date_trunc('month', current_date)::date + 3,   420000, 'Makan & belanja harian', 'contoh_sari', 'Belanja bulanan',  'contoh_spay'),
  ('contoh_t08', 'contoh_rumah', 'PAYLATER', date_trunc('month', current_date)::date + 7,   185000, 'Hiburan',                'contoh_andi', '',                 'contoh_kredivo'),
  ('contoh_t09', 'contoh_rumah', 'PAYMENT',  date_trunc('month', current_date)::date + 4,   350000, 'Bayar hutang',           'contoh_sari', '',                 'contoh_spay'),
  ('contoh_t10', 'contoh_rumah', 'PAYMENT',  date_trunc('month', current_date)::date + 4,   750000, 'Bayar hutang',           'contoh_andi', '',                 'contoh_pinjol');

COMMIT;

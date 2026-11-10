-- =============================================================================
-- Keuangan Berdua: skema database PostgreSQL
-- FILE INI DIBUAT OTOMATIS dari prisma/migrations oleh: npm run db:sql
-- Jangan diubah manual; ubah prisma/schema.prisma lalu buat migrasi baru.
--
-- Cara pakai di DBeaver:
--   1. Buat database baru (mis. keuangan_berdua), klik kanan -> SQL Editor -> Open SQL script.
--   2. Tempel/buka file ini, lalu Execute SQL Script (Alt+X).
--   3. Supaya Prisma tahu migrasi ini sudah dijalankan, dari folder proyek:
--        npx prisma migrate resolve --applied 20261111000000_init
-- Migrasi: 20261111000000_init
-- =============================================================================

BEGIN;

-- ============================== 20261111000000_init ==============================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "debt_type" AS ENUM ('PAYLATER', 'PINJOL', 'LAIN');

-- CreateEnum
CREATE TYPE "tx_kind" AS ENUM ('INCOME', 'EXPENSE', 'PAYLATER', 'PAYMENT');

-- CreateTable
CREATE TABLE "households" (
    "id" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "household_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debts" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "debt_type" NOT NULL,
    "owner_id" TEXT,
    "start_balance" INTEGER NOT NULL,
    "monthly" INTEGER NOT NULL DEFAULT 0,
    "due_day" INTEGER,
    "rate" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_adjustments" (
    "id" TEXT NOT NULL,
    "debt_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "kind" "tx_kind" NOT NULL,
    "date" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "user_id" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "debt_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "households_invite_code_key" ON "households"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_household_id_idx" ON "users"("household_id");

-- CreateIndex
CREATE INDEX "debts_household_id_idx" ON "debts"("household_id");

-- CreateIndex
CREATE INDEX "debt_adjustments_debt_id_idx" ON "debt_adjustments"("debt_id");

-- CreateIndex
CREATE INDEX "transactions_household_id_date_idx" ON "transactions"("household_id", "date");

-- CreateIndex
CREATE INDEX "transactions_debt_id_idx" ON "transactions"("debt_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_adjustments" ADD CONSTRAINT "debt_adjustments_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Ditambahkan manual (Prisma tidak membuat ini dari schema.prisma).
-- ---------------------------------------------------------------------------

-- Aturan data di level database, sebagai pengaman kedua selain validasi di aplikasi.
ALTER TABLE "debts" ADD CONSTRAINT "debts_start_balance_check" CHECK ("start_balance" >= 0);
ALTER TABLE "debts" ADD CONSTRAINT "debts_monthly_check" CHECK ("monthly" >= 0);
ALTER TABLE "debts" ADD CONSTRAINT "debts_due_day_check" CHECK ("due_day" IS NULL OR "due_day" BETWEEN 1 AND 31);
ALTER TABLE "debts" ADD CONSTRAINT "debts_rate_check" CHECK ("rate" IS NULL OR "rate" BETWEEN 0 AND 100);
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_check" CHECK ("amount" > 0);
-- Belanja paylater dan bayar cicilan harus menunjuk ke hutang (kecuali hutangnya sudah dihapus -> NULL).
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debt_kind_check"
  CHECK ("debt_id" IS NULL OR "kind" IN ('PAYLATER', 'PAYMENT'));

-- Keterangan tabel dan kolom (tampil di DBeaver: Properties -> Comment).
COMMENT ON TABLE "households" IS 'Rumah tangga: dua orang yang berbagi catatan keuangan';
COMMENT ON COLUMN "households"."invite_code" IS 'Kode untuk pasangan bergabung saat daftar';

COMMENT ON TABLE "users" IS 'Akun login. Satu rumah tangga paling banyak dua user (dibatasi di aplikasi)';
COMMENT ON COLUMN "users"."password_hash" IS 'Hash bcrypt, bukan password asli';
COMMENT ON COLUMN "users"."session_version" IS 'Naik saat password diganti; sesi lama jadi tidak berlaku';

COMMENT ON TABLE "debts" IS 'Hutang: paylater, pinjaman online, atau lainnya';
COMMENT ON COLUMN "debts"."owner_id" IS 'Atas nama siapa';
COMMENT ON COLUMN "debts"."start_balance" IS 'Sisa hutang (Rp) saat pertama dicatat';
COMMENT ON COLUMN "debts"."monthly" IS 'Cicilan per bulan (Rp)';
COMMENT ON COLUMN "debts"."due_day" IS 'Tanggal jatuh tempo tiap bulan, 1-31';
COMMENT ON COLUMN "debts"."rate" IS 'Bunga per bulan dalam persen';

COMMENT ON TABLE "debt_adjustments" IS 'Koreksi saldo hutang agar sama dengan angka di aplikasi pinjaman (bunga, denda)';
COMMENT ON COLUMN "debt_adjustments"."amount" IS 'Selisih (Rp): positif = hutang naik, negatif = turun';

COMMENT ON TABLE "transactions" IS 'Semua uang masuk/keluar. Saldo hutang = start_balance + PAYLATER - PAYMENT + adjustments';
COMMENT ON COLUMN "transactions"."kind" IS 'INCOME masuk, EXPENSE keluar tunai, PAYLATER belanja paylater (hutang naik), PAYMENT bayar cicilan (hutang turun)';
COMMENT ON COLUMN "transactions"."amount" IS 'Nominal (Rp), selalu positif; arah ditentukan oleh kind';
COMMENT ON COLUMN "transactions"."user_id" IS 'Siapa yang belanja / menerima / membayar';
COMMENT ON COLUMN "transactions"."debt_id" IS 'Hutang terkait untuk PAYLATER dan PAYMENT';

COMMIT;

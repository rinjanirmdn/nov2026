// Gabungkan semua migrasi Prisma jadi satu file database/schema.sql untuk diimpor lewat DBeaver/psql.
// Jalankan setelah membuat migrasi baru: npm run db:sql
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "prisma", "migrations");
const migrations = fs
  .readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const header = `-- =============================================================================
-- Keuangan Berdua: skema database PostgreSQL
-- FILE INI DIBUAT OTOMATIS dari prisma/migrations oleh: npm run db:sql
-- Jangan diubah manual; ubah prisma/schema.prisma lalu buat migrasi baru.
--
-- Cara pakai di DBeaver:
--   1. Buat database baru (mis. keuangan_berdua), klik kanan -> SQL Editor -> Open SQL script.
--   2. Tempel/buka file ini, lalu Execute SQL Script (Alt+X).
--   3. Supaya Prisma tahu migrasi ini sudah dijalankan, dari folder proyek:
${migrations.map((m) => `--        npx prisma migrate resolve --applied ${m}`).join("\n")}
-- Migrasi: ${migrations.join(", ")}
-- =============================================================================

BEGIN;
`;

const body = migrations
  .map((m) => {
    const sql = fs.readFileSync(path.join(dir, m, "migration.sql"), "utf8").replace(/\r\n/g, "\n").trim();
    return `\n-- ============================== ${m} ==============================\n\n${sql}\n`;
  })
  .join("");

const out = path.join(root, "database", "schema.sql");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, header + body + "\nCOMMIT;\n");
console.log(`database/schema.sql dibuat dari ${migrations.length} migrasi.`);

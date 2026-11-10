# Keuangan Berdua

Aplikasi web untuk mencatat pemasukan, pengeluaran, dan hutang dua orang. Dibuat untuk keadaan di mana gaji habis untuk cicilan dan belanja harian banyak memakai paylater: belanja paylater dicatat sebagai pengeluaran sekaligus menambah hutang, dan pembayaran cicilan mengurangi hutang.

Data tersimpan di database PostgreSQL. Masing-masing punya akun sendiri, keduanya tergabung dalam satu rumah tangga, jadi HP berdua melihat catatan yang sama.

## Status

Ini **pondasi** versi baru (server + database). Yang online di <https://rinjanirmdn.github.io/nov2026/>
adalah versi lama dari folder `legacy/` (satu file `index.html`, data di localStorage browser).

GitHub Pages hanya bisa menyajikan file statis, jadi **versi Next.js tidak bisa berjalan di GitHub Pages**:
login dan database butuh server Node.js. Untuk online nanti, pakai hosting Node.js (mis. Vercel, Railway,
Render, atau VPS) dan PostgreSQL yang bisa diakses dari sana.

## CI/CD (GitHub Actions)

File: `.github/workflows/ci.yml`. Cukup commit lalu push; tidak perlu langkah lain.

Setiap push:

1. **Cek** aplikasi baru: lint, typecheck, tes, migrasi ke PostgreSQL sungguhan, memastikan
   `database/schema.sql` sama dengan migrasi dan bisa diimpor (bersama `contoh-data.sql` dan `laporan.sql`),
   lalu build produksi.
2. **Terbitkan** `legacy/` ke GitHub Pages (hanya branch `claude/stoic-lamport-ebjphk`, dan hanya kalau langkah 1 lulus).

Hasilnya terlihat di tab **Actions** repo. Kalau ada yang gagal, GitHub mengirim email dan situs tetap memakai versi terakhir yang lulus.

**Pengaturan sekali saja:** di GitHub buka **Settings → Pages → Build and deployment → Source**, pilih
**GitHub Actions**. Setelah itu buka tab **Actions → CI/CD → Run workflow** (atau push apa saja) supaya situs terbit ulang.

## Teknologi

- [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions), TypeScript
- PostgreSQL dengan [Prisma 7](https://www.prisma.io) (driver adapter `pg`)
- Login dengan email + password (bcrypt), sesi di cookie httpOnly yang ditandatangani (JWT, `jose`)
- Validasi input dengan Zod, tes logika keuangan dengan Vitest
- Tailwind CSS 4 (tampilan diporting dari versi lama, mode gelap otomatis)

## Database (DBeaver)

Semua file SQL ada di folder `database/`:

| File | Isi |
| --- | --- |
| `schema.sql` | Membuat semua tabel, relasi, index, aturan (CHECK), dan keterangan kolom. **Jalankan pertama.** |
| `contoh-data.sql` | Opsional. Satu rumah tangga contoh berisi 2 akun, 3 hutang, 10 transaksi bulan berjalan. |
| `laporan.sql` | Query siap pakai: saldo tiap hutang, ringkasan per bulan, per kategori, per orang. |

Langkah di DBeaver:

1. Di koneksi PostgreSQL, klik kanan **Databases → Create New Database**, beri nama `keuangan_berdua`.
2. Klik kanan database itu → **SQL Editor → Open SQL script**, buka `database/schema.sql`, lalu **Execute SQL Script** (Alt+X).
3. (Opsional) Lakukan hal yang sama untuk `database/contoh-data.sql`. Akun contoh: `andi@contoh.test` dan `sari@contoh.test`, password `rahasia123`.
4. Di folder proyek, beri tahu Prisma bahwa skema sudah dibuat (sekali saja):
   ```bash
   npx prisma migrate resolve --applied 20261111000000_init
   ```

Tabel: `households` (rumah tangga), `users`, `debts` (hutang), `debt_adjustments` (koreksi saldo), `transactions`.
Nama tabel/kolom memakai snake_case; di kode TypeScript otomatis jadi camelCase (`household_id` → `householdId`).

### Mengubah struktur database

1. Ubah `prisma/schema.prisma`.
2. `npx prisma migrate dev --name nama_perubahan` (membuat file SQL baru di `prisma/migrations/` dan menjalankannya).
3. `npm run db:sql` untuk memperbarui `database/schema.sql`.

Kalau lebih suka menjalankan SQL-nya sendiri lewat DBeaver: buat file migrasi tanpa menjalankannya dengan
`npx prisma migrate dev --create-only --name nama_perubahan`, jalankan isinya di DBeaver, lalu
`npx prisma migrate resolve --applied <nama_folder_migrasi>`.

## Menjalankan di komputer sendiri

Butuh Node.js 20.9+ dan PostgreSQL (database yang dibuat di atas).

```bash
npm install
cp .env.example .env     # isi DATABASE_URL (user, password, port dari DBeaver) dan SESSION_SECRET
npm run dev              # buka http://localhost:3000
```

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | server development |
| `npm test` | tes logika keuangan, tanggal, dan impor |
| `npm run lint` | ESLint |
| `npm run typecheck` | cek tipe TypeScript |
| `npm run build` | build produksi (sekalian `prisma generate`) |
| `npm run db:sql` | buat ulang `database/schema.sql` dari migrasi |
| `npx prisma studio` | lihat isi database di browser |

## Cara memakai

1. Orang pertama membuka aplikasi, pilih **Daftar → Mulai baru**. Setelah daftar, menu Pengaturan menampilkan **kode undangan**.
2. Pasangan pilih **Daftar → Gabung dengan pasangan** dan memasukkan kode itu. Satu rumah tangga paling banyak dua orang.
3. Di menu **Hutang**, tambahkan setiap pinjaman dan paylater: sisa hutang hari ini, cicilan per bulan, tanggal jatuh tempo. Pilih jenis Paylater untuk akun yang dipakai belanja.
4. Di menu **Transaksi**, catat pemasukan dan pengeluaran. Kalau belanja pakai paylater, pilih akunnya di kolom "Dibayar pakai". Transaksi bisa diubah dan dihapus.
5. Saat membayar cicilan, tekan **Bayar** pada hutang yang bersangkutan.
6. Kalau angka di aplikasi pinjaman berbeda karena bunga atau denda, pakai **Sesuaikan saldo**.

Menu **Ringkasan** menampilkan sisa uang bulan itu, apakah total hutang naik atau turun, tagihan yang jatuh tempo, dan pengeluaran per kategori.

## Pindah dari versi lama

Versi lama (data di localStorage) ada di folder `legacy/` dan masih online di GitHub Pages.

1. Buka aplikasi lama di HP/laptop yang menyimpan datanya, buka **Pengaturan → Ekspor data**.
2. Di aplikasi baru, buka **Pengaturan → Impor**, pilih file tadi, lalu pasangkan nama di file dengan akun berdua.

Sebaiknya pasangan sudah bergabung sebelum impor, supaya catatan terbagi per orang.

## Struktur kode

```
.github/workflows/ci.yml    CI/CD: cek setiap push, terbitkan legacy/ ke GitHub Pages
legacy/                     aplikasi versi lama (yang online di GitHub Pages)
database/                   file SQL untuk DBeaver (skema, data contoh, laporan)
prisma/schema.prisma        definisi tabel; prisma/migrations/ berisi SQL per perubahan
src/lib/finance.ts          perhitungan (saldo hutang, ringkasan bulan, jatuh tempo, urutan pelunasan), tanpa database
src/lib/data.ts             query database -> data polos untuk finance.ts dan halaman
src/lib/auth.ts, session.ts login dan cookie sesi; src/proxy.ts mengalihkan yang belum login
src/app/actions/            server actions (semua query dibatasi ke rumah tangga pengguna)
src/app/(app)/              halaman Ringkasan, Transaksi, Hutang, Pengaturan
src/app/(auth)/             halaman Masuk dan Daftar
src/app/api/ekspor/         unduh data sebagai JSON
src/components/             form dan komponen tampilan
scripts/build-schema-sql.mjs  membuat database/schema.sql
```

Jenis transaksi: `INCOME` (uang masuk), `EXPENSE` (dibayar tunai/transfer), `PAYLATER` (belanja paylater: uang belum keluar, hutang bertambah), `PAYMENT` (bayar cicilan: uang keluar, hutang berkurang). Saldo hutang = saldo awal + belanja paylater − pembayaran + penyesuaian.

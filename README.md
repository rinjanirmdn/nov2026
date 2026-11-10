# Keuangan Berdua

Aplikasi web untuk mencatat pemasukan, pengeluaran, dan hutang dua orang. Dibuat untuk keadaan di mana gaji habis untuk cicilan dan belanja harian banyak memakai paylater, jadi belanja paylater dicatat sebagai pengeluaran sekaligus menambah hutang, dan pembayaran cicilan mengurangi hutang.

## Cara menjalankan

Buka `index.html` di browser. Tidak ada yang perlu diinstal.

## Cara memakai

1. Di menu Pengaturan, isi nama berdua.
2. Di menu Hutang, tambahkan setiap pinjaman dan paylater: sisa hutang hari ini, cicilan per bulan, tanggal jatuh tempo. Pilih jenis Paylater untuk akun yang dipakai belanja.
3. Di menu Transaksi, catat pemasukan (gaji, ShopeeFood) dan pengeluaran. Kalau belanja pakai paylater, pilih akunnya di kolom "Dibayar pakai".
4. Saat membayar cicilan, tekan Bayar pada hutang yang bersangkutan.
5. Kalau angka di aplikasi pinjaman berbeda karena bunga atau denda, pakai Sesuaikan saldo.

Menu Ringkasan menampilkan sisa uang bulan itu, apakah total hutang naik atau turun, dan tagihan yang jatuh tempo.

## Penyimpanan data

Data tersimpan di browser perangkat yang dipakai (localStorage). Perangkat lain tidak otomatis melihat data yang sama. Untuk memindahkan data atau membuat cadangan, pakai Ekspor dan Impor di menu Pengaturan. Menghapus data browser ikut menghapus catatan, jadi ekspor secara berkala.

## Struktur kode

- `index.html`: kerangka halaman, menu bawah, dan dialog form.
- `style.css`: tampilan, termasuk mode gelap.
- `app.js`: seluruh logika. Bagian atas file menjelaskan empat jenis transaksi.

Tanpa framework dan tanpa proses build.

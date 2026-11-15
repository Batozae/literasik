# DESIGN: Literasik (acuan UI sampai akhir proyek)

> Dibaca AI Agent bersama `00_MASTER_CONTEXT.md` dan `README.md`. Identitas visual berasal dari Google Stitch, disesuaikan dengan Master Context dan stack (Tailwind + shadcn/ui + Recharts + lucide-react).
> Aturan bisnis dan isi tampilan mengikuti Master Context; berkas ini hanya soal **tampilan**.

## 1. Prinsip

- Bersih, ringan, hangat. Siswa SMP: positif dan mendorong. Guru: padat data dan profesional.
- **Light mode saja.** Antarmuka **bahasa Indonesia** seluruhnya.
- Pakai **komponen shadcn/ui apa adanya** (Button, Card, Table, Dialog, Tabs, Badge, Select, Input, Progress). Jangan membuat komponen sendiri bila shadcn sudah punya.
- Warna hanya lewat variabel tema shadcn atau kelas Tailwind, **tanpa heks langsung di komponen**. Tidak ada pustaka UI, font, atau ikon lain di luar daftar ini.

## 2. Warna

| Peran             | Nilai                                   | Pemakaian                                                                            |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| Primer            | indigo-600 `#4F46E5` (hover indigo-700) | tombol utama, navigasi aktif, tautan, fokus                                          |
| Sekunder          | teal-600 `#0D9488`                      | bilah kemajuan level/materi, aksen kartu siswa                                       |
| Ganjaran          | amber-500 `#F59E0B`                     | ikon poin dan lencana, top 3 peringkat. **Hanya sebagai isi/ikon, bukan warna teks** |
| Latar halaman     | slate-50 `#F8FAFC`                      |                                                                                      |
| Permukaan (kartu) | putih, border slate-200                 |                                                                                      |
| Teks              | slate-900 (utama), slate-600 (sekunder) |                                                                                      |

**Status (selalu teks + ikon, tidak boleh hanya warna).** Pil: tinggi 24px, `rounded-full`, latar `-50`, teks `-700`, border `-200`.
| Label | Warna | Ikon (lucide) |
|---|---|---|
| Aman, Mudah, Selesai | emerald | `CheckCircle2` |
| Pantau, Sedang | amber | `Eye` |
| Perlu Pendampingan, Sulit, Terlewat | rose | `AlertCircle` |
| Berlangsung | sky | `Play` |
| Dijadwalkan, Belum Cukup Data, "Data belum cukup" | slate | `Clock` / `Minus` |

- Jawaban benar = emerald, salah = rose (disertai ikon centang/silang dan teks).
- Galat formulir: border dan pesan rose (variabel `destructive` shadcn).
- Pemetaan ke variabel shadcn (`--primary`, `--background`, `--card`, `--border`, `--destructive`, dst.) dikerjakan satu kali di Tahap 3, mengikuti tabel ini.
- Kontras teks terhadap latar harus memenuhi WCAG AA. **Perlu diverifikasi dengan alat pemeriksa kontras**, terutama slate-500/600 di atas latar abu dan teks pada pil status.

## 3. Tipografi

- **Satu font: Plus Jakarta Sans**, dimuat lewat `next/font/google` dengan fallback `sans-serif`. Angka KPI dan tabel memakai `tabular-nums`. (Stitch mengusulkan Inter untuk label; dihapus demi kesederhanaan.)
- Pakai **ukuran bawaan Tailwind**, tanpa ukuran khusus:

| Peran                         | Kelas                                                       |
| ----------------------------- | ----------------------------------------------------------- |
| Judul halaman (H1)            | `text-2xl font-bold` mobile, `text-3xl font-bold` desktop   |
| Judul bagian (H2)             | `text-xl font-semibold`                                     |
| Judul kartu                   | `text-base font-semibold` atau `text-lg font-semibold`      |
| Angka KPI                     | `text-3xl font-bold tabular-nums`                           |
| Isi                           | `text-base`; teks pendukung `text-sm text-slate-600`        |
| Label kecil (kolom, KPI, pil) | `text-xs font-medium` (KPI: huruf kapital, `tracking-wide`) |

## 4. Bentuk, Jarak, Elevasi

- Kartu `rounded-xl`; tombol, input, kontrol formulir `rounded-lg`; pil dan lencana `rounded-full`. Setel `--radius` shadcn agar sesuai.
- Jarak kelipatan 4: `p-4`/`gap-4` (mobile), `p-6`/`gap-6` (desktop); margin halaman `px-4` mobile, `px-8` desktop; wadah guru `max-w-7xl`.
- Elevasi hanya 3 tingkat: **datar** (latar), **kartu** (putih, `border-slate-200`, `shadow-sm`), **overlay** (dialog, menu, bilah menempel: `shadow-lg`). Kartu aktif/terpilih: `ring-2 ring-indigo-600`.
- Fokus: `ring-2 ring-indigo-500 ring-offset-2` pada semua elemen interaktif. Area sentuh minimal 44px.

## 5. Layout

- **Siswa:** mobile-first. Tab bar bawah (Beranda, Asesmen, Peringkat, Riwayat); di desktop berpindah ke bilah atas. Satu kolom, `max-w-2xl` di tengah.
- **Guru:** desktop-first. Sidebar kiri tetap (Dasbor, Bank Soal, Asesmen, Peringkat), konten di kanan. Tabel lebar boleh digulir horizontal.
- Setiap halaman: H1 + deskripsi satu baris + konten. Hanya satu tombol primer per area.

## 6. Pola Komponen

- **Status asesmen siswa:** Dijadwalkan, Berlangsung, Selesai, Terlewat (pil di bagian 2). **Status siswa:** Aman, Pantau, Perlu Pendampingan, Belum Cukup Data; detail menampilkan **alasan** (materi lemah). **Kategori materi:** Sulit, Sedang, Mudah, Data belum cukup.
- **Tombol:** primer (indigo, teks putih, `font-semibold`), sekunder/outline (putih, border slate-200), destruktif (rose). Tombol siswa: efek tekan `active:translate-y-0.5`.
- **Input:** putih, border slate-200, fokus border indigo. Label di atas, galat di bawah kolom, tombol kirim dinonaktifkan saat memproses.
- **Kartu level (siswa):** level + bilah kemajuan teal ke level berikutnya, total poin (ikon amber), lencana diperoleh; lencana belum diperoleh redup dengan syaratnya.
- **Kosong / memuat / galat:** setiap daftar dan grafik punya keadaan "Belum ada data" + satu kalimat penjelas, skeleton atau "Memuat...", dan pesan galat ramah tanpa jejak teknis.
- **Konfirmasi:** tindakan tak terbalikkan (Buka sekarang, Tutup sekarang, Nonaktifkan, Hapus) memakai Dialog konfirmasi.
- **Waktu:** WIB, format Indonesia ("15 Nov 2026, 09.00 WIB").

## 7. Grafik (Recharts, hanya di Client Component)

- Semua grafik punya judul, sumbu berlabel, tooltip, dan keadaan kosong.
- Warna pilar: Kecakapan indigo-600, Etika teal-600, Keamanan sky-600, Budaya violet-600. **Jangan memakai warna status** (emerald/amber/rose) untuk pilar.
- Tren akurasi: garis indigo-600; **catatan wajib D-08 di bawah grafik**. Pilar tanpa data tampil "Belum ada data".

## 8. Sesi Pengerjaan dan Peringkat

- Satu soal per layar, 4 opsi sebagai tombol besar, penanda "Soal 2 dari 5".
- **WAJIB:** setelah memilih hanya "Jawaban tersimpan", tanpa benar/salah dan penjelasan. **LATIHAN:** umpan balik langsung (benar/salah + penjelasan).
- **Peringkat:** top 25, baris siswa sendiri disorot (ring indigo), tiga teratas diberi ikon ganjaran amber; siswa di luar top 25 hanya melihat kartu "Belum masuk 25 besar. Poinmu: X" **tanpa nomor peringkat** (D-07).

## 9. Nada Bahasa

- Siswa: positif, tidak menghakimi ("Kamu sudah menjawab benar 3 dari 5. Ayo pelajari pembahasannya."). Hindari "gagal" atau "bodoh".
- Guru: netral dan tepat. Gunakan "Perlu Pendampingan", bukan "bermasalah".
- Istilah mengikuti Master Context: asesmen, latihan, poin, level, lencana, peringkat.

## 10. Yang Tidak Boleh

- Menambah pustaka UI, font, atau ikon di luar bagian 1; warna heks langsung; gaya inline; komponen duplikat dari shadcn.
- Status yang hanya dibedakan warna; teks Inggris pada antarmuka.
- Nomor peringkat di luar top 25; jawaban benar/penjelasan sebelum waktunya.
- Fitur yang tidak ada di Master Context: teks bacaan (stimulus), pengubah ukuran huruf, streak, XP, misi/quest, level kompetensi AKM, mode gelap, navigasi sidebar yang bisa dilipat.

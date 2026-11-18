# DESIGN: Literasik (acuan UI sampai akhir proyek)

> Dibaca AI Agent bersama `00_MASTER_CONTEXT.md` dan `README.md`. Identitas visual mengusung tema **Flat & Interaktif** (*Flat Colorful* di atas kanvas terang) berbasis Tailwind CSS v4 + Base UI / shadcn (`src/components/ui/*`) + Recharts + `lucide-react`.
> Aturan bisnis dan isi tampilan mengikuti `00_MASTER_CONTEXT.md`; berkas ini hanya soal **tampilan dan konsistensi UI/UX**.

## 1. Prinsip

- **Flat & Interaktif, bersih, ringan, hangat.** Permukaan kartu tampil datar tanpa garis tepi keras atau bayangan permanen; hirarki dibentuk melalui kontras kanvas (`bg-slate-100`) dan permukaan kartu putih (`bg-white`), kotak ikon berwarna solid, strip aksen tipis, serta umpan balik hover/tekan yang halus.
- Siswa SMP: positif, mendorong, komunikatif. Guru: padat data, rapi, dan cepat dipindai.
- **Light mode saja.** Antarmuka **bahasa Indonesia** seluruhnya.
- Pakai **komponen UI yang sudah ada di `src/components/ui/*`** (`Button`, `Card`, `Table`, `Dialog`, `Tabs`, `Badge`, `Select`, `Switch`, `Input`, `Label`, `Textarea`, `RadioGroup`, `Progress`). Jangan membuat komponen duplikat bila sudah tersedia.
- Warna hanya lewat variabel tema CSS (`src/app/globals.css`) atau kelas utilitas Tailwind, **tanpa kode heks langsung di komponen TSX** (kecuali konfigurasi warna SVG/tooltip `Recharts` di Client Component seperti `src/app/guru/dashboard-charts.tsx` yang memang membutuhkan nilai warna JS, serta gradien podium di `src/lib/podium.ts`). Tidak ada pustaka UI, font, atau ikon lain di luar daftar ini.

## 2. Warna dan Identitas Brand

**Token CSS (`src/app/globals.css`):**
- Kanvas & Latar: `--surface-canvas: #f1f5f9` (`slate-100`), `--background: #f8fafc` (`slate-50`), `--card: #ffffff`, `--foreground: #0f172a` (`slate-900`), `--muted: #f1f5f9`, `--muted-foreground: #475569` (`slate-600`).
- Semantik komponen: `--primary: #4f46e5` (`indigo-600`), `--secondary: #0d9488` (`teal-600`), `--accent: #eef2ff` (`--accent-foreground: #3730a3`), `--destructive: #e11d48` (`rose-600`), `--border: #e2e8f0`, `--input: #e2e8f0`, `--ring: #6366f1`.
- Grafik: `--chart-1: #4f46e5`, `--chart-2: #0d9488`, `--chart-3: #0284c7`, `--chart-4: #7c3aed`.

**Pemakaian Peran Warna:**

| Peran | Nilai / Kelas Tailwind | Pemakaian |
| --- | --- | --- |
| Navigasi & Panel Brand | `bg-indigo-950`, teks `white` / `indigo-100`, bubble `indigo-800/35`, `indigo-800/20`, `teal-500/10` | sidebar desktop Guru & Siswa, header mobile, panel kiri desktop Login |
| Aksi Primer | `bg-indigo-900` (hover `indigo-800`), `bg-indigo-700` (login), atau `bg-primary` | tombol CTA utama (Tambah soal, Selesai, Masuk), penanda soal aktif |
| Sekunder & Kemajuan | `teal-600` / `teal-500` | bilah kemajuan level, kartu Level Kamu, aksen latihan, ikon & merek |
| Poin & Lencana | `amber-400` / `amber-500` / `amber-50` | ikon poin, pill ringkasan lencana terbuka, kartu status di luar top 25 |
| Logout ("Keluar") | `bg-rose-100 text-rose-600` (hover `bg-rose-200 text-rose-700`) | tombol keluar di kiri bawah sidebar dan kanan header mobile |
| Kanvas & Permukaan | kanvas `bg-slate-100` (aplikasi) atau `bg-violet-100` (halaman login), kartu `bg-white` | latar ruang kerja aplikasi, latar halaman masuk, dan permukaan kartu datar |
| Kontrol Isian & Dropdown | `bg-slate-100` (hover `bg-slate-200/70`, fokus `bg-white` / `ring-indigo-500`) | trigger dropdown `SelectTrigger`, input form login, filter, dan asesmen |
| Teks | `slate-900` (utama), `slate-700` / `slate-600` / `slate-500` (sekunder/label) | judul, isi konten, label kolom, dan keterangan waktu |

**Peringkat Top 3 (`src/lib/podium.ts`):**
- **Peringkat 1 (Gold):** kartu `bg-linear-to-br from-[#FFD700] to-[#FFA500] text-slate-950`, pill `bg-amber-800 text-white`, badge angka tabel senada.
- **Peringkat 2 (Silver):** kartu `bg-linear-to-br from-[#E0E5EC] to-[#A0AEC0] text-slate-950`, pill `bg-slate-700 text-white`, badge angka tabel senada.
- **Peringkat 3 (Bronze):** kartu `bg-linear-to-br from-[#E69D6C] to-[#B86B35] text-slate-950`, pill `bg-orange-950/85 text-white`, badge angka tabel senada.

**Status (`StatusBadge` di `src/components/status-badge.tsx` — selalu teks + ikon).** Pil: `h-6`, `rounded-full border px-2.5 text-xs font-medium`, latar `-50`, teks `-700`, border `-200`:

| Label | Warna | Ikon (lucide) |
| --- | --- | --- |
| Aman, Mudah, Selesai | emerald | `CheckCircle2` |
| Pantau, Sedang | amber | `Eye` |
| Perlu Pendampingan, Sulit, Terlewat | rose | `AlertCircle` |
| Berlangsung | sky | `Play` |
| Dijadwalkan | slate | `Clock` |
| Belum Cukup Data, "Data belum cukup" | slate | `Minus` |

- **Tabel Bank Soal (`src/app/guru/soal/page.tsx`):**
  - Kolom **Kesulitan:** `Badge` berwarna (`Mudah` = `bg-emerald-50 text-emerald-700`, `Sedang` = `bg-amber-50 text-amber-700`, `Sulit` = `bg-rose-50 text-rose-700`).
  - Kolom **% Benar:** persentase benar khusus sesi WAJIB dengan angka `tabular-nums` (tampil `"—"` bila belum ada jawaban WAJIB).
  - Kolom **Status:** **hanya** kontrol `Switch` toggle `rounded-full` (hijau `bg-emerald-500` saat aktif, abu-abu `bg-slate-300` saat nonaktif) + teks `Aktif` / `Nonaktif` (tanpa pil `StatusBadge` ganda).
- **Jawaban & Galat:** jawaban benar = emerald, salah = rose (disertai ikon centang/silang dan teks). Galat formulir: latar `bg-rose-50`, border/ring `rose-500`, teks `rose-700`/`rose-900` (variabel `destructive`).
- **Kontras:** kontras teks terhadap latar wajib memenuhi WCAG AA.

**Identitas Brand & Maskot (`src/components/brand-logo.tsx`, `src/components/literasik-owl.tsx`):**
- **Maskot:** Komponen SVG interaktif `LiterasikOwl` khusus untuk branding platform **Literasik** — mendukung *eye-tracking* kursor, kedipan mata alami, pantulan klik, ekspresi suasana hati (`idle`, `happy`, `celebrate`, `encourage`, `focused`, `shy`, `peek`), cakar mengait (`hangSide="right"`), dan lambaian sayap halus (`waving`). Pengguna tetap tidak memakai foto avatar; podium memakai inisial `getInitials`:
  - `BrandSidebarLogo` (pojok kiri atas sidebar desktop): `LiterasikOwl size="xl"` (`h-28 w-28`), `BrandWordmark` (`text-2xl`), dan label `Literasi Digital` (`text-[10px] font-semibold tracking-[0.22em] text-indigo-200/80 uppercase`) dengan titik `bg-amber-400`.
  - `BrandCompactLogo` (header mobile): `LiterasikOwl size="sm"` (`h-11 w-11`) + `BrandWordmark` (`text-lg`).
  - Halaman Login (`src/app/login/login-form.tsx`): `LiterasikOwl size="xl" hangSide="right" waving` (`h-36 w-36`) menggantung sejajar tengah sisi kanan kartu login (`md:-right-28`) di desktop; `LiterasikOwl size="lg" waving` (`h-24 w-24`) di mobile.
  - Dekorasi navigasi gelap (`SidebarBubbles`, `MobileHeaderBubbles`): lingkaran flat lembut (`bg-indigo-800/35`, `bg-indigo-800/20`, `bg-teal-500/10`) di dalam sidebar dan header mobile.
- **Tipografi Wordmark (`BrandWordmark`):** `font-extrabold tracking-tight leading-none select-none`:
  - Di latar gelap (`darkBg={true}`): `Litera` (`text-white`), `sik` (`text-teal-300`), titik `.` (`text-amber-400`).
  - Di latar terang (`darkBg={false}`): `Litera` (`text-indigo-950`), `sik` (`text-teal-600`), titik `.` (`text-amber-500`).

## 3. Tipografi

- **Satu font: Plus Jakarta Sans**, dimuat lewat `next/font/google` (`--font-plus-jakarta-sans`, fallback `sans-serif`) di `src/app/layout.tsx`. Angka KPI, skor, waktu WIB, dan tabel memakai `tabular-nums`.
- Pakai **ukuran bawaan Tailwind**:

| Peran | Kelas |
| --- | --- |
| Judul halaman (H1) Guru | `text-2xl font-bold text-slate-900` mobile, `md:text-3xl` desktop |
| Judul halaman (H1) Siswa (`StudentPageHeader`) | `text-xl font-bold tracking-tight text-slate-900 sm:text-2xl` + kotak ikon `h-10 w-10 rounded-xl` + `border-b border-slate-200/90 pb-4` |
| Judul bagian (H2) | `text-xl font-bold` / `text-xl font-semibold`, atau `text-base font-bold sm:text-lg` dengan garis aksen `h-4 w-1` (`StudentSectionHeader`) |
| Judul kartu (`CardTitle`) | `text-base font-bold text-slate-900` (dialog: `text-lg font-bold`) |
| Angka KPI | `text-2xl` / `text-3xl font-bold tabular-nums` |
| Isi | `text-base` atau `text-sm leading-relaxed`; teks pendukung `text-sm text-slate-700` / `text-slate-600` |
| Label kecil (kolom, KPI, subjudul) | `text-xs font-medium` atau `text-xs font-semibold uppercase tracking-wide` |

## 4. Bentuk, Jarak, Elevasi

- **Radius konsisten:**
  - `rounded-3xl`: wadah utama kartu login.
  - `rounded-2xl`: kartu permukaan, kotak filter & tabel, kartu podium/lencana/agenda, `SelectContent`, `DialogContent`, dan kotak ikon `h-12 w-12` bila dipasangkan.
  - `rounded-xl`: `Button`, `SelectTrigger`, item dropdown, input formulir & login, kotak ikon (`h-10 w-10` s.d. `h-12 w-12`), stepper nomor soal, dan tombol `Keluar`.
  - `rounded-full`: `Switch` toggle, pil status & badge, lencana ringkasan kelas/level, garis aksen subbagian, serta tab aktif sidebar (`rounded-l-full`).
- **Elevasi (Flat & Overlay):**
  - **Kanvas:** `bg-slate-100` (ruang kerja Guru & Siswa); `bg-violet-100` dengan dekorasi bubble pastel (halaman `/login`).
  - **Permukaan (kartu & wadah):** datar (`bg-white border-0 shadow-none` atau `border border-slate-200 bg-white shadow-sm` pada kartu daftar asesmen/riwayat); kartu login memakai `shadow-xl shadow-indigo-950/10 ring-1 ring-indigo-950/5`.
  - **Flat Colorful (KPI & sorotan):** kotak ikon solid berwarna variatif (`indigo`, `sky`, `emerald`, `rose`, `teal`, `amber`, `violet`) dipadu pita vertikal `w-1.5` di sisi kiri kartu `overflow-hidden rounded-2xl` (melebar halus `group-hover:w-2` pada kartu yang dapat diklik).
  - **Overlay:** `shadow-lg ring-1 ring-slate-200/80` hanya untuk elemen mengambang (`DialogContent` dan `SelectContent`), dengan `backdrop-blur-sm` pada `DialogOverlay`.
- **Interaktivitas & Fokus:** `transition-all duration-150`, hover halus (`hover:bg-slate-50/90` atau `hover:-translate-y-1` pada podium), tekan (`active:scale-[0.98]` / `active:scale-95`), dan fokus `focus-visible:ring-2 focus-visible:ring-indigo-500`. Area sentuh minimal `40–44px`.
- **Jarak & Wadah:** kelipatan 4 (`gap-4`/`gap-6`, `p-4`/`p-5`/`p-6`); margin utama `px-4` mobile, `md:px-6`/`xl:px-8` desktop; wadah konten guru dan siswa `max-w-7xl`.

## 5. Layout

- **Shell Desktop Bersama (Guru & Siswa):**
  - **Sidebar kiri tetap (`w-64 bg-indigo-950`, tidak dapat dilipat):** `SidebarBubbles`, `BrandSidebarLogo` di kiri atas, menu navigasi tengah dengan tab aktif `.sidebar-active-tab` (`rounded-l-full text-indigo-950`, `background-color: var(--surface-canvas)` + cekungan radial `::before`/`::after` di `src/app/globals.css` yang menyatu ke kanvas), serta info pengguna/kelas dan tombol `Keluar` merah muda di kiri bawah.
  - **Header atas lengket (`sticky top-0 bg-white shadow-lg md:ml-64`):** sapaan *"Selamat datang, [Nama]"* serta pil kelas & peran di kanan (tanpa bilah pencarian header).
- **Guru (`/guru/*`):** desktop-first (`max-w-7xl`) dengan menu Dasbor, Bank Soal, Asesmen, Peringkat. Mobile menampilkan header `indigo-950` (`MobileHeaderBubbles`, `BrandCompactLogo`, nama, Keluar) dan navigasi 4 tab di atas. Tabel lebar dapat digulir horizontal.
- **Siswa (`/siswa/*`):**
  - Desktop (`max-w-7xl`): memakai sidebar kiri seragam 5 menu (*Beranda*, *Asesmen*, *Latihan*, *Peringkat*, *Riwayat*); Beranda menampilkan 4 kartu KPI *Flat Colorful* di baris atas + grid 12 kolom (Kemajuan Level & Jadwal Asesmen di kiri, Koleksi Lencana di kanan); sub-halaman (`asesmen`, `latihan`, `peringkat`, `riwayat`) memakai `StudentPageHeader`.
  - Mobile: header `indigo-950` (`MobileHeaderBubbles`, `BrandCompactLogo`, nama/kelas, Keluar) dan **bottom tab bar** tetap (`fixed inset-x-0 bottom-0 grid-cols-5 bg-white`, tab aktif `bg-indigo-950 text-white`) untuk Beranda, Asesmen, Latihan, Peringkat, Riwayat.
- **Halaman Masuk (`/login`):**
  - Latar belakang `bg-violet-100` dengan lingkaran bubble pastel flat (`violet-200/80`, `indigo-200/75`, `indigo-200/65`, `teal-200/55`, `amber-200/60`).
  - **Desktop (`md:max-w-4xl xl:max-w-5xl`, grid 12 kolom):** panel kiri `bg-indigo-950` berisi badge *"Literasi Digital SMP"*, tajuk *"Empat Pilar Kecakapan Digital Generasi Muda"*, 4 kartu pilar interaktif, dan catatan footer; panel kanan putih berisi `BrandWordmark`, judul, `LoginForm`, dan footer portal + waktu sistem WIB; maskot `LiterasikOwl` menggantung sejajar tengah di tepi kanan kartu (`md:-right-28`) sambil melambai.
  - **Mobile (`max-w-md`):** kartu tunggal terpusat dengan maskot `LiterasikOwl` (`size="lg"`), pill *"Asesmen Literasi Digital SMP"*, `BrandWordmark`, `LoginForm`, kotak info akun sekolah, serta indikator server aktif & waktu WIB.

## 6. Pola Komponen

- **Dropdown (`Select`):** `SelectTrigger` memakai `rounded-xl border-0 bg-slate-100 px-3.5`/`px-4` agar teks selalu memiliki ruang dari tepi kiri; `SelectContent` memakai `rounded-2xl bg-white shadow-lg ring-1 ring-slate-200/80`; item terpilih/fokus `bg-indigo-50 text-indigo-950`.
- **Toggle (`Switch`):** kapsul `rounded-full border-0`, hijau `bg-emerald-500` saat aktif dan abu-abu `bg-slate-300` saat nonaktif, dengan thumb bulat putih.
- **Tombol:** primer (`bg-indigo-900`, `bg-indigo-700`, atau `bg-primary` dengan teks putih, `rounded-xl font-semibold`), sekunder/netral (`bg-slate-100 text-slate-700` atau `bg-white shadow-sm text-indigo-700` di atas kanvas), destruktif lembut untuk logout (`bg-rose-100 text-rose-600`).
- **Status asesmen siswa:** Dijadwalkan, Berlangsung, Selesai, Terlewat (`StatusBadge` di bagian 2). **Status siswa:** Aman, Pantau, Perlu Pendampingan, Belum Cukup Data; detail siswa menampilkan alasan (daftar materi lemah). **Kategori materi:** Sulit, Sedang, Mudah, Data belum cukup.
- **Kartu level & Koleksi Lencana (Siswa `/siswa`):**
  - Kartu level menampilkan level + bilah kemajuan teal ke level berikutnya + tautan cepat berwarna ke Latihan (`teal`), Peringkat (`amber`), & Riwayat (`sky`).
  - **Koleksi Lencana:** lencana terbuka memakai kartu pastel lembut (`-50`), kotak ikon solid berwarna (`h-10 w-10 rounded-xl`), strip vertikal kiri (`w-1.5`), stempel waktu WIB, dan ikon `lucide-react` **variatif** sesuai kode lencana (`Footprints` `LANGKAH_PERTAMA`, `Target` `TELITI`, `CalendarCheck` `KONSISTEN`, `Compass` `PENJELAJAH`, `Zap` `RAJIN_BERLATIH`, `Laptop` `TUNTAS_KECAKAPAN`, `Scale` `TUNTAS_ETIKA`, `ShieldCheck` `TUNTAS_KEAMANAN`, `Globe` `TUNTAS_BUDAYA`, fallback `Award`). Lencana terkunci tampil dengan latar `bg-slate-100/80 opacity-80`, ikon abu-abu, ikon gembok (`Lock`), dan deskripsi syarat.
- **Kalender Asesmen (Guru `/guru`):** `AssessmentCalendar` menampilkan kalender bulanan zona WIB yang menyoroti jadwal asesmen dan daftar agenda pada tanggal terpilih.
- **Kosong / Memuat / Galat:** setiap daftar dan grafik punya keadaan `"Belum ada data"` + satu kalimat penjelas, skeleton (`src/app/guru/loading.tsx`, `src/app/siswa/loading.tsx`) atau `"Memuat..."`, dan pesan galat ramah tanpa jejak teknis.
- **Konfirmasi:** tindakan penting atau tak terbalikkan (Aktif/Nonaktifkan asesmen, Buka sekarang, Tutup sekarang, Nonaktifkan soal, Akhiri asesmen) memakai `Dialog` konfirmasi (`rounded-2xl`).
- **Waktu:** zona `Asia/Jakarta` (WIB), format Indonesia (`"15 Nov 2026, 09.00 WIB"`).

## 7. Grafik (Recharts, hanya di Client Component)

- Semua grafik punya judul, sumbu berlabel, tooltip gelap (`#0F172A`, radius `10px`), dan keadaan kosong (`"Belum ada data untuk periode ini."`).
- Warna pilar: Kecakapan `indigo-600` (`#4F46E5`), Etika `teal-600` (`#0D9488`), Keamanan `sky-600` (`#0284C7`), Budaya `violet-600` (`#7C3AED`). **Jangan memakai warna status** (emerald/amber/rose) untuk pilar.
- `PillarChart`: tata letak 2 kolom di desktop — legenda interaktif di kiri (hover/klik menyorot batang pilar tertentu) dan diagram batang Recharts di kanan.
- `TrendChart`: garis `indigo-600` (`#4F46E5`) dengan `ReferenceLine` `60%` (`rose`) dan `80%` (`emerald`) + **catatan wajib D-08 di bawah grafik**. Pilar tanpa data tampil `"Belum ada data"`.

## 8. Sesi Pengerjaan dan Peringkat

- Header sesi datar (`rounded-xl border border-slate-200 bg-white p-5 pl-6 shadow-sm`) dengan strip aksen kiri (`bg-indigo-700` untuk `WAJIB`, `bg-teal-500` untuk `LATIHAN`) dan maskot `LiterasikOwl size="sm" withBackdrop` (mood dinamis `focused`, `happy`, `celebrate`, `encourage`), stepper nomor soal `rounded-xl` (soal aktif `bg-indigo-900 text-white`, sudah dijawab `bg-emerald-50 text-emerald-700`, belum dijawab `bg-slate-100 text-slate-600`), satu soal per layar, dan 4 opsi `A–D`.
- **WAJIB:** setelah memilih hanya `"Jawaban tersimpan"`, tanpa benar/salah dan penjelasan. **LATIHAN:** umpan balik langsung (benar/salah + penjelasan).
- **Hasil (`/siswa/hasil/[id]`):** kartu ringkasan dengan `LiterasikOwl size="md" withBackdrop` sesuai akurasi (`celebrate`/`happy`/`encourage`) dan bagian pembahasan memakai `StudentSectionHeader`.
- **Peringkat:** Top 3 memakai kartu podium **Gold / Silver / Bronze** (`PODIUM_STYLES`), tabel Top 25 memakai badge angka **Gold / Silver / Bronze** untuk peringkat 1–3 (`RANK_BADGE_CLASSES`), dan baris siswa sendiri disorot; siswa di luar top 25 hanya melihat kartu `"Belum masuk 25 besar. Poinmu: X"` **tanpa nomor peringkat** (D-07).

## 9. Nada Bahasa

- Siswa: positif, tidak menghakimi (*"Kamu sudah menjawab benar 3 dari 5. Ayo pelajari pembahasannya."*). Hindari *"gagal"* atau *"bodoh"*.
- Guru: netral dan tepat. Gunakan *"Perlu Pendampingan"*, bukan *"bermasalah"*.
- Istilah mengikuti `00_MASTER_CONTEXT.md`: asesmen, latihan, poin, level, lencana, peringkat.

## 10. Yang Tidak Boleh

- Menambah pustaka UI, font, atau ikon di luar Bagian 1; gaya inline yang tidak perlu; warna heks langsung di TSX di luar konfigurasi chart Recharts dan gradien podium; komponen duplikat dari `src/components/ui/*`.
- Status yang hanya dibedakan warna tanpa teks/ikon (`StatusBadge` atau label `Aktif`/`Nonaktif` pada `Switch`); teks Inggris pada antarmuka pengguna.
- Nomor peringkat di luar top 25; jawaban benar/penjelasan sebelum waktunya (`D-04`, `D-11`).
- Fitur yang tidak ada di `00_MASTER_CONTEXT.md`: teks bacaan (stimulus), pengubah ukuran huruf, streak, XP, misi/quest, level kompetensi AKM, foto avatar pengguna, mode gelap, navigasi sidebar yang bisa dilipat.

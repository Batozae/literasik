# Fase_2: Alur Wajib dan Gamifikasi (serah-terima ke Fase 3)

> Dibaca bersama `docs/00_MASTER_CONTEXT.md`, `docs/DESIGN.md`, `README.md`, dan `docs/Fase_1.md`.

## 1. Selesai

| ID | Hasil | Uji singkat |
| --- | --- | --- |
| `scoring.ts` + test | Fungsi murni perhitungan level (`calculateLevel`), poin wajib & bonus (`calculateWajibPoints`), poin latihan harian (`calculatePracticePointsForAnswer`), format nama & pemeringkatan (`sortAndRankLeaderboard`), evaluasi 9 lencana (`evaluateBadges`) | `npm test` hijau (39 passed, 25 tests spesifik untuk `scoring.ts`) |
| SIS-02 | Daftar asesmen wajib aktif untuk angkatan siswa, status dinamis (Dijadwalkan, Berlangsung, Selesai, Terlewat) | Login `7a01`/`siswa123` buka `/siswa/asesmen` |
| SIS-03 | Sesi pengerjaan wajib: 1 soal per layar, opsi tombol besar, navigasi stepper nomor soal, auto-save jawaban tanpa membocorkan `isCorrect` (D-11), kunci satu sesi per siswa (`wajibKey`), bonus 20 poin jika selesai sebelum tutup & semua dijawab, dialog konfirmasi selesai, auto-close saat lewat `closesAt` | Kerjakan sesi aktif dari `/siswa/asesmen`, pilih opsi, lalu klik Selesaikan |
| SIS-04 | Hasil dan pembahasan tertunda: ringkasan skor/akurasi/poin, penundaan pembahasan sebelum `closesAt` lewat (tidak membocorkan kunci/penjelasan), pembahasan terbuka lengkap setelah `closesAt` | Buka `/siswa/hasil/[id]` untuk sesi selesai lampau vs sesi yang baru diselesaikan |
| GAM-01/02/03 | Poin (`PointEvent`), Level 1-5 dengan progress bar teal, 9 Lencana literasi digital (`StudentBadge`), evaluasi otomatis via `badge-evaluator.ts` | Buka `/siswa` (beranda) untuk melihat level, bilah kemajuan, dan status 9 lencana |
| SIS-01 | Beranda siswa: sapaan nama & kelas, kartu level + progress bar teal, total poin (amber), grid 9 lencana (terbuka vs terkunci/redup), banner asesmen sedang berlangsung (CTA langsung), pintasan menu | Login siswa ke `/siswa` |
| SIS-05 | Riwayat asesmen: daftar sesi selesai, skor, akurasi, poin diperoleh, tanggal WIB, status keterbukaan pembahasan, tautan ke hasil | Buka `/siswa/riwayat` |
| SIS-06 | Peringkat angkatan: Top 25 angkatan siswa, format nama "Nama Depan + inisial belakang (kelas)", baris siswa sendiri disorot, ikon top 3 ganjaran amber, kartu siswa di luar top 25 tanpa nomor peringkat | Buka `/siswa/peringkat` |
| DAT-02 | Seed historis (`npm run db:reset`): 606 sesi, 3015 jawaban, 2616 point event, 684 lencana; sebaran siswa: 12 Perlu Pendampingan (~10%), 18 Pantau (~15%), 3 Belum Cukup Data (`7a32`, `7b30`, `8b30`), 89 Aman; pola materi: Keamanan tersulit (~58-62%), Etika termudah (~80-81%), Kecakapan (~60-63%), Hoaks (~57%), kelas 7B di bawah 7A; 3 siswa absen; 2 siswa banyak latihan (`7a01`, `8a01`) membuktikan daily cap dan isolasi analitik | `npm run db:reset` berjalan sukses, verifikasi DB sesuai |

## 2. Tidak selesai / dipangkas

- Tidak ada. Semua fitur Fase 2 pada Master Context Bagian 9 selesai penuh dan teruji.
- Halaman latihan mandiri (`/siswa/latihan`) sengaja masih placeholder karena merupakan lingkup Fase 4 (**SIS-07**), namun model data latihan, point event, dan lencana `RAJIN_BERLATIH` sudah siap dan teruji lewat data historis.

## 3. Berkas dan fungsi penting (`src/lib/` dan `src/app/siswa/`)

| Berkas | Isi / Fungsi | Dipakai Fase 3 untuk |
| --- | --- | --- |
| `src/lib/scoring.ts` | `calculateLevel`, `calculateWajibPoints`, `calculatePracticePointsForAnswer`, `formatLeaderboardName`, `sortAndRankLeaderboard`, `evaluateBadges` | Leaderboard guru (GUR-08), perhitungan level dan akurasi |
| `src/lib/schedule.ts` | `getAssessmentStatus`, `canStartSession`, `getWibDate`, `formatWibDateTime` | Filter periode waktu analitik, format tampilan tanggal/waktu guru |
| `src/lib/badge-evaluator.ts` | `evaluateAndAwardBadges(studentId, now)` | Pengecekan otomatis perolehan lencana siswa |
| `src/components/status-badge.tsx` | Komponen visual pil status (Aman, Pantau, Perlu Pendampingan, Selesai, Berlangsung, Sulit, Sedang, Mudah, dll.) | Seluruh tabel status siswa, materi, dan KPI dashboard guru (GUR-01..GUR-06) |
| `src/app/siswa/actions.ts` | `startWajibSessionAction`, `saveAnswerAction`, `finishWajibSessionAction`, `finalizeExpiredSession` | Server actions alur asesmen siswa |

## 4. Perubahan terhadap Master Context

- **Tidak ada perubahan skema database** (`schema.prisma` tetap utuh sesuai Fase 1). Kolom `wajibKey` diisi konsisten `"{studentId}-{assessmentId}"` pada setiap sesi WAJIB untuk menegakkan batasan 1 sesi per siswa di tingkat database.
- `formatWibDateTime` ditambahkan ke `src/lib/schedule.ts` untuk standarisasi format waktu Indonesia ("15 Nov 2026, 09.00 WIB") sesuai `DESIGN.md`.

## 5. Hal yang meragukan / perlu diperiksa pemeriksa kode

- Penegakan D-11 (tidak membocorkan `isCorrect`, kunci jawaban, dan penjelasan sebelum `closesAt`): pada `src/app/siswa/sesi/[id]/page.tsx` query Prisma secara ketat hanya memilih `id, text, order` untuk opsi dan tidak memilih `isCorrect` maupun `explanation`.
- Pemeriksaan seluruh `page.tsx` memastikan semuanya memanggil `requireStudent()` atau `requireTeacher()` di baris awal.

## 6. Catatan untuk Fase 3 (Dashboard Guru dan Analitik)

- Data historis sudah tersedia lengkap di database melalui `npm run db:reset`.
- Fase 3 dapat langsung menggunakan data sesi WAJIB yang sudah ada untuk menghitung KPI (GUR-02), skor pilar (GUR-03), materi tersulit (GUR-04), tren akurasi per asesmen (GUR-05), tabel siswa & status (GUR-06), detail siswa & alasan materi lemah (GUR-07), peringkat guru (GUR-08), serta ekspor CSV (GUR-09).
- Ingat D-01: **Hanya sesi WAJIB** yang masuk analitik dan peringkat. Jawaban sesi LATIHAN yang ada di database tidak boleh dihitung ke akurasi materi atau KPI asesmen.

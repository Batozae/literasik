# Fase_3: Dashboard Guru dan Analitik (serah-terima ke Fase 4)

> Dibaca bersama `docs/00_MASTER_CONTEXT.md`, `docs/DESIGN.md`, `README.md`, dan dokumen fase sebelumnya (`docs/Fase_1.md`, `docs/Fase_2.md`).

## 1. Selesai

| ID | Hasil | Uji singkat |
| --- | --- | --- |
| `analytics.ts` + test | Fungsi murni perhitungan analitik: `computeTopicDifficulties`, `computeStudentStatus`, `computePillarScores`, `computeTrendExtended`, `computeKpi`, `applyPeriodFilter`, serta sanitasi dan pembuatan CSV (`sanitizeCsvCell`, `toCsvRow`, `buildCsv`) | `npm test` hijau (67 passed, 28 tests spesifik untuk `analytics.ts`) |
| GUR-01 | Filter kelas ("Semua kelas saya" atau per kelas) dan filter periode (7 hari, 30 hari, semua waktu, rentang kustom) berdasarkan waktu jawaban siswa (`answeredAt`). Semua widget analitik reaktif mengikuti filter | Login `guru1`/`guru123` buka `/guru`, ubah dropdown kelas dan periode |
| GUR-02 | Kartu KPI: Total Siswa, Partisipasi (% selesai terhadap total sesi yang dijadwalkan dalam periode), Rata-rata Akurasi WAJIB, Perlu Pendampingan, Sesi Latihan, Siswa Berlatih | Buka `/guru`, verifikasi 6 kartu KPI |
| GUR-03 | Visualisasi Skor Pilar (Recharts BarChart): persentase akurasi per 4 pilar literasi digital (Kecakapan, Etika, Keamanan, Budaya) sesuai warna `DESIGN.md`, dengan state kosong jika belum ada data | Buka `/guru`, lihat grafik pilar di kolom kiri |
| GUR-04 | Tabel Tingkat Kesulitan Materi: daftar materi diurutkan dari akurasi terendah, status pil (Sulit, Sedang, Mudah, Data belum cukup), dan tombol "Buat latihan" pada materi Sulit/Sedang | Buka `/guru`, lihat tabel materi tersulit |
| GUR-05 | Visualisasi Tren Akurasi (Recharts LineChart): satu titik per asesmen WAJIB (sumbu X: materi/tanggal, Y: akurasi), garis referensi 60% dan 80%, tooltip rincian jumlah peserta, dan catatan peringatan wajib D-08 di bawah grafik | Buka `/guru`, lihat grafik tren di kolom kanan |
| GUR-06 | Tabel Siswa & Status: daftar siswa diurutkan dari Perlu Pendampingan teratas, status pil, akurasi, poin wajib, jumlah sesi latihan, dan tautan ke detail siswa | Buka `/guru`, scroll ke tabel daftar siswa |
| GUR-07 | Detail Siswa (`/guru/siswa/[id]`): guard otorisasi per kelas guru, ringkasan level & progress bar teal, total poin & poin wajib, status siswa beserta daftar alasan materi lemah (jika status Perlu Pendampingan/Pantau), performa per materi, dan riwayat pengerjaan asesmen wajib | Buka `/guru/siswa/[id]` dari tombol "Lihat" di tabel siswa |
| GUR-08 | Peringkat Angkatan Guru (`/guru/peringkat`): Top 25 per angkatan kelas yang diajar guru, format nama "Nama Depan + inisial belakang (kelas)", ikon medali 3 besar, kumulatif seluruh waktu (tidak terpengaruh filter periode) | Buka `/guru/peringkat` |
| GUR-09 | Ekspor CSV (`/api/ekspor/siswa` dan `/api/ekspor/materi`): unduhan file CSV ber-BOM UTF-8, sanitasi injection formula, sesuai filter kelas dan periode aktif di dashboard | Klik tombol "Ekspor CSV Siswa" dan "Ekspor CSV Materi" di `/guru` |
| GUR-10 | Keterlibatan Latihan & Tutup Loop: integrasi data latihan ke KPI dashboard, serta server action `createPracticeFromTopicAction` untuk membuat asesmen latihan rekomendasi dari materi sulit/sedang | Klik tombol "Buat latihan" pada materi berlabel Sulit/Sedang di `/guru` |

## 2. Tidak selesai / dipangkas

- Tidak ada. Semua fitur Fase 3 (GUR-01 sampai GUR-10 dan `analytics.ts` + test) selesai penuh dan teruji.

## 3. Berkas dan fungsi penting yang dipakai fase berikutnya

| Berkas | Isi / Fungsi | Dipakai Fase 4 untuk |
| --- | --- | --- |
| `src/lib/analytics.ts` | Fungsi murni perhitungan analitik: `computeTopicDifficulties`, `computeStudentStatus`, `computePillarScores`, `computeTrendExtended`, `computeKpi`, CSV helpers | Evaluasi dampak latihan terhadap topik lemah dan verifikasi akhir |
| `src/lib/analytics-data.ts` | `getDashboardData`, `getTeacherLeaderboardData`, `getExportStudentData`, `getExportTopicData` | Data query server-side guru |
| `src/app/guru/actions.ts` | `createPracticeFromTopicAction` | ASM-05 (Tutup loop pengerjaan latihan rekomendasi guru) |
| `src/app/api/ekspor/siswa/route.ts` & `src/app/api/ekspor/materi/route.ts` | Route handler unduhan CSV | Pengujian skenario demo ekspor laporan |

## 4. Perubahan terhadap Master Context

- **Tidak ada perubahan skema database** (`schema.prisma` tetap utuh).
- Menambahkan pustaka `recharts` (^2.15.3) ke `package.json` untuk visualisasi grafik pilar dan tren sesuai mandat Bagian 3 dan `DESIGN.md`.
- Semua keputusan ini sudah dicatat di Master Context Bagian 13.

## 5. Hal yang meragukan / perlu diperiksa pemeriksa kode

- Penegakan D-01: Seluruh KPI asesmen, tren, skor pilar, dan status materi/siswa hanya dihitung dari jawaban pada sesi bertipe WAJIB. Sesi LATIHAN diisolasi dan hanya muncul pada metrik keterlibatan (GUR-10).
- Penegakan otorisasi: Guru 1 (kelas 7A & 7B) terbukti di-guard agar tidak dapat melihat siswa atau data kelas 8A/8B milik Guru 2, begitu pula sebaliknya (HTTP 404 pada URL `/guru/siswa/[id]` siswa kelas lain).
- Pemeriksaan script audit PowerShell untuk `requireTeacher()` / `requireStudent()` di seluruh `page.tsx` lulus bersih.

## 6. Catatan untuk Fase 4 (Penjadwalan, Latihan, Tutup Loop, Finalisasi)

- Alur pembuatan latihan rekomendasi dari dashboard (`createPracticeFromTopicAction`) membuat asesmen bertipe `LATIHAN` dengan status `isActive: false` dan mengarahkan guru ke `/guru/asesmen/[id]`.
- Di Fase 4, pengerja akan menyelesaikan halaman `/guru/asesmen` (ASM-03, ASM-04, ASM-06: susun, buka/tutup sekarang, aktifkan) dan `/siswa/latihan` (SIS-07: pengerjaan latihan mandiri & rekomendasi guru).
- Skenario demo end-to-end (tutup loop) siap dijalankan setelah Fase 4 mengimplementasikan aktivasi asesmen dan pengerjaan latihan oleh siswa.

# Fase_1: Fondasi dan Bank Soal (serah-terima ke Fase 2)

> Dibaca bersama `docs/00_MASTER_CONTEXT.md`, `docs/DESIGN.md`, dan `README.md`.
> Catatan kejujuran dokumen: nama fungsi di bagian 3 berasal dari prompt yang diberikan ke AI Agent. **Tanda tangan persisnya belum diperiksa pembuat dokumen ini; baca berkasnya sebelum memanggil.**

## 1. Selesai

| ID             | Hasil                                                                                                                                                  | Uji singkat                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| AUTH-01        | Login/logout, cookie sesi httpOnly (JWT, jose), galat generik                                                                                          | Login `7a01`/`siswa123` ke `/siswa`; `guru1`/`guru123` ke `/guru`                                          |
| AUTH-02        | Guard per peran; setiap `page.tsx` dan server action memanggil `requireStudent()`/`requireTeacher()` sendiri                                           | Siswa ke `/guru` ditolak dan sebaliknya; pemeriksaan semua `page.tsx` oleh pengerja Fase 1 menyatakan aman |
| DAT-01         | Seed struktur: 4 pilar, 12 materi, 60 soal (240 opsi), 9 lencana, 4 kelas, 122 siswa, 2 guru, 12 asesmen WAJIB (5 lampau + 1 Dijadwalkan per angkatan) | Prisma Studio                                                                                              |
| DAT-03         | `npm run db:reset` (hapus, migrasi, seed)                                                                                                              | Berjalan tanpa error                                                                                       |
| ASM-01, ASM-02 | CRUD bank soal + aktif/nonaktif, soal terkunci, cakupan per angkatan guru                                                                              | `/guru/soal`                                                                                               |
| (dasar)        | `schema.prisma`, `config.ts`, `schedule.ts` + test, layout siswa/guru, tema shadcn sesuai DESIGN.md                                                    | `npm test` hijau                                                                                           |

## 2. Tidak selesai / dipangkas

- Tidak ada. Semua fitur Fase 1 pada Master Context Bagian 9 selesai.
- Sesi, jawaban, poin, dan lencana siswa **sengaja belum ada** (milik Fase 2).

## 3. Berkas dan fungsi penting (`src/lib/`)

| Berkas                        | Isi                                                                                                             | Dipakai Fase 2/3/4 untuk                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `config.ts`                   | Semua konstanta Bagian 4                                                                                        | Ambang, poin, level (jangan mengarang angka lain)      |
| `schedule.ts`                 | `getAssessmentStatus`, `canStartSession`, `canEditComposition`, `canOpenNow`, `canCloseNow`, helper tanggal WIB | Mulai sesi, tutup otomatis, batas harian poin latihan  |
| `auth.ts`, `session-token.ts` | `getSession`, `requireStudent`, `requireTeacher`, `assertTeacherOfClass`, JWT                                   | Guard di setiap halaman dan server action baru         |
| `teacher-scope.ts`            | Cakupan angkatan guru, `assertTopicAccess`/`assertQuestionAccess`                                               | Pola otorisasi per angkatan/kelas di dasbor            |
| `question-rules.ts`           | Validasi soal, `isQuestionLocked`                                                                               | Fase 4: penjadwalan asesmen (konsistensi aturan kunci) |
| `prisma.ts`                   | Klien Prisma tunggal (prompt menyebut `db.ts`; berkas aktual `prisma.ts`)                                       | Semua akses DB                                         |

Rute yang sudah ada (placeholder "Segera hadir", sudah ber-guard): `/login`, `/siswa`, `/siswa/asesmen`, `/siswa/latihan`, `/siswa/peringkat`, `/siswa/riwayat`, `/guru`, `/guru/peringkat`, `/guru/asesmen`. `/guru/soal` (+`/baru`, `/[id]`) sudah berfungsi penuh. **Belum ada:** `/siswa/sesi/[id]`, `/siswa/hasil/[id]`, `/guru/siswa/[id]`, `/guru/asesmen/baru` dan `/[id]`, rute `/api/ekspor/*`.

Akun demo: guru `guru1` (kelas 7A+7B) dan `guru2` (8A+8B), sandi `guru123`; siswa `7a01` dan seterusnya (7A 32, 7B 30, 8A 30, 8B 30), sandi `siswa123`.

## 4. Perubahan terhadap Master Context

- **Keputusan Tahap 4 (harus ada di Bagian 13):** (a) guru hanya mengelola soal angkatannya; (b) soal terkunci bila sudah dijawab atau ada di asesmen yang sudah dibuka; (c) soal di asesmen Dijadwalkan/Berlangsung tidak boleh dinonaktifkan; (d) tidak ada hapus soal.
- `docs/DESIGN.md` ditambahkan sebagai acuan UI wajib (Bagian 10 aturan 1).
- Kolom `wajibKey` di `AssessmentSession` (unik, nullable, hanya diisi untuk sesi WAJIB) disarankan di Tahap 1. **wajibKey ada di `schema.prisma`.** Fase 2 wajib mengisinya `"{studentId}-{assessmentId}"` untuk sesi WAJIB.
- Skema **dibekukan**; perubahan hanya lewat kesepakatan kelompok (Bagian 11).

## 5. Hal yang meragukan / perlu diperiksa pemeriksa kode

- Otorisasi: tiap `page.tsx` dan server action harus memanggil `require*()` sendiri. Perintah pemeriksaan (PowerShell) ada di `README.md` bagian 6; jalankan ulang setiap fase.
- Aturan kunci soal (`isQuestionLocked`) dan cakupan angkatan guru perlu ditinjau anggota lain.
- Tanpa pembatasan percobaan login (di luar lingkup MVP); catat sebagai keterbatasan di laporan.
- Isi 60 soal ditulis berdasarkan prinsip umum; belum dicocokkan dengan modul resmi Komdigi/Siberkreasi. Soal Hak Cipta no. 2 dan no. 5 menyentuh aturan yang bisa berubah.
- Pembagian materi per angkatan di D-13 adalah usulan dan perlu verifikasi.

## 6. Catatan untuk Fase 2

- Mulai dari: `scoring.ts` + test (poin, level, lencana), alur siswa wajib (SIS-02/03/04), GAM-01/02/03, SIS-01/05/06, lalu **DAT-02 seed historis**.
- Seed historis harus memakai fungsi `scoring.ts` dan `schedule.ts` (bukan SQL manual), dengan acak ber-seed tetap dan pola di Master Context Bagian 8. Seed Fase 1 membuat `isActive = true` untuk asesmen WAJIB dan tidak membuat sesi/jawaban/poin.
- Terapkan D-11: `isCorrect`, opsi benar, dan penjelasan tidak boleh dikirim sebelum waktunya. Server memakai jam server (WIB).
- Lencana "Rajin Berlatih" baru teruji penuh di Fase 4 (latihan mandiri). Fase 2 cukup menyiapkan logika dan data seed.
- Bila butuh perubahan skema: jangan ubah; catat usulan di `README.md` bagian 4 dan bahas dengan kelompok.
- Tambahkan komponen shadcn yang dibutuhkan dengan `npx shadcn@latest add <nama>`; jangan membuat komponen buatan sendiri.

# STATUS: Literasik

Prototipe platform asesmen literasi digital gamifikasi dengan dashboard learning analytics untuk siswa SMP (Capstone kelompok, MVP lokal, data sintetis). README ini juga berfungsi sebagai dokumen **Status** proyek. Diperbarui di akhir setiap fase oleh pengerja fase tersebut.

> Dibaca AI Agent bersama `docs/00_MASTER_CONTEXT.md`, `docs/DESIGN.md`, dan dokumen fase sebelumnya (`docs/Fase_N.md`). Bila bertentangan dengan Master Context, Master Context yang berlaku.

## 1. Posisi Saat Ini

- **Fase selesai:** Fase 1, Fase 2. **Fase aktif:** Fase 3 (menunggu pengerja Ardan).
- **Versi Master Context:** v2.0 (+ keputusan Fase 1 & 2 di Bagian 13)
- **Versi pustaka terkunci:** `next` 16.4.6, `react` 19.3.0, `prisma` dan `@prisma/client` 6.19.3, `vitest` 5.1.0, `jose` 6.2.17, `bcryptjs` 3.0.3, `tsx` 4.23.15 (`shadcn/ui`, `lucide-react`, `tailwind` mengikuti hasil instalasi Tahap 3)

## 2. Papan Fase

| Fase                                | Pengerja | Status       | Dokumen keluaran |
| ----------------------------------- | -------- | ------------ | ---------------- |
| 1. Fondasi dan Bank Soal            | Fatih    | **Selesai**  | `docs/Fase_1.md` |
| 2. Alur Wajib dan Gamifikasi        | Ikfi     | **Selesai**  | `docs/Fase_2.md` |
| 3. Dashboard Guru dan Analitik      | Ardan    | Siap dimulai | `docs/Fase_3.md` |
| 4. Penjadwalan, Latihan, Finalisasi | Ihza     | Menunggu F3  | `docs/Fase_4.md` |

## 3. Status Fitur

Status: `Belum` / `Berjalan` / `Selesai (teruji)` / `Dipangkas`

| Fase | Fitur                                                                                   | Status           |
| ---- | --------------------------------------------------------------------------------------- | ---------------- |
| 1    | AUTH-01, AUTH-02, DAT-01, DAT-03, ASM-01, ASM-02, `schedule.ts`+test, layout, tema      | Selesai (teruji) |
| 2    | SIS-01, SIS-02, SIS-03, SIS-04, SIS-05, SIS-06, GAM-01/02/03, DAT-02, `scoring.ts`+test | Selesai (teruji) |
| 3    | GUR-01 s.d. GUR-10, `analytics.ts`+test                                                 | Belum            |
| 4    | ASM-03, ASM-04, ASM-05, ASM-06, SIS-07, uji akses, latihan demo                         | Belum            |

## 4. Isu Terbuka dan Hal yang Diwariskan

- Kolom `AssessmentSession.wajibKey` (unik, nullable) ditegakkan di kode server dan database dengan format `"{studentId}-{assessmentId}"` untuk sesi WAJIB.
- Data historis (DAT-02) ter-seed lengkap via `npm run db:reset` (606 sesi, 3015 jawaban, 2616 point event, 684 lencana) dengan sebaran siswa teruji: 12 Perlu Pendampingan (~10%), 18 Pantau (~15%), 3 Belum Cukup Data (`7a32`, `7b30`, `8b30`), 89 Aman. Pola kesulitan materi: Keamanan tersulit (~58-62%), Etika termudah (~80-81%), Kecakapan (~60-63%), Hoaks (~57%), kelas 7B di bawah 7A; 3 siswa absen; 2 siswa banyak latihan (`7a01`, `8a01`) membuktikan batas harian dan isolasi analitik. Siap dikonsumsi penuh oleh analitik Fase 3.
- Isi 60 soal belum dicocokkan dengan modul resmi Komdigi/Siberkreasi; pembagian materi D-13 perlu verifikasi.
- Tidak ada pembatasan percobaan login (di luar lingkup; catat sebagai keterbatasan di laporan).
- Perubahan skema tetap dibekukan tanpa perubahan dari Fase 1.

## 5. Cara Menjalankan

- **Prasyarat:** Node.js LTS (sesuai `@types/node` proyek), MySQL berjalan, Git. Database kosong bernama `literasik` (`utf8mb4`).
- **Setup:** salin `.env.example` menjadi `.env`; isi `DATABASE_URL` (mis. `mysql://root:PASSWORD@localhost:3306/literasik`) dan `SESSION_SECRET` (buat sendiri: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Jangan commit `.env`.
- **Perintah:**
  ```bash
  npm install
  npm run db:reset    # hapus, migrasi, seed (MENGHAPUS isi database)
  npm run dev         # http://localhost:3000
  npm test
  ```
- **Akun demo:** guru `guru1` (kelas 7A+7B) dan `guru2` (8A+8B), sandi `guru123`; siswa `7a01` dan seterusnya (7A 32, 7B 30, 8A 30, 8B 30), sandi `siswa123`.
- Tambah komponen UI: `npx shadcn@latest add <nama>`.

## 6. Pemeriksaan Wajib Setiap Fase

Setiap `page.tsx` harus memanggil `requireStudent()`/`requireTeacher()` sendiri. Hasil perintah ini (PowerShell) harus kosong:

```powershell
Get-ChildItem src/app/siswa,src/app/guru -Recurse -Filter page.tsx | Where-Object { -not (Select-String -Path $_.FullName -Pattern "require(Teacher|Student)" -Quiet) } | Select-Object FullName
```

Server action baru juga wajib memanggil `require*()` sendiri.

## 7. Alur Kerja Antar Fase

- Pengerja fase memberi AI: `docs/00_MASTER_CONTEXT.md`, `docs/DESIGN.md`, `README.md`, dan `docs/Fase_N.md` fase sebelumnya.
- Di akhir fase: perbarui README ini (bagian 1 sampai 4), tulis `docs/Fase_N.md` (format di bawah), catat keputusan baru di Master Context Bagian 13, lalu minta anggota lain memeriksa kode.

---

## Format `docs/Fase_N.md` (maksimal ±1 halaman)

1. **Selesai:** fitur (ID) dan cara menguji singkat
2. **Tidak selesai / dipangkas:** beserta alasannya
3. **Berkas dan fungsi penting** yang dipakai fase berikutnya (nama, tanda tangan, tempat)
4. **Perubahan terhadap Master Context** dan sudah dicatat di Bagian 13 atau belum
5. **Hal yang meragukan / perlu diperiksa pemeriksa kode**
6. **Catatan untuk fase berikutnya**

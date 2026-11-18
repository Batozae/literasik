# Fase_4: Penjadwalan, Latihan, Tutup Loop, dan Finalisasi

> Dibaca bersama `docs/00_MASTER_CONTEXT.md`, `docs/DESIGN.md`, `README.md`, dan dokumen fase sebelumnya (`docs/Fase_1.md`, `docs/Fase_2.md`, `docs/Fase_3.md`).

## 1. Selesai

| ID | Hasil | Uji singkat |
| --- | --- | --- |
| `assessment-rules.ts` + test | Fungsi murni aturan Fase 4: `isTopicUnlockedForPractice` (D-04), `parseWibDateTimeInput` & `formatWibDateTimeLocalInput` (zona WIB), `isAssessmentCompositionLocked` (D-14), `validateAssessmentInput` (D-04, D-10, D-14) | `npm test` hijau (7 file, 76 tes lulus, 9 tes spesifik untuk `assessment-rules.ts`) |
| ASM-03 | Susun & jadwalkan asesmen WAJIB dan LATIHAN di `/guru/asesmen`, `/guru/asesmen/baru`, dan `/guru/asesmen/[id]`: pilih soal per materi, urutkan soal (`order`), atur jendela WIB (`opensAt`/`closesAt`), pilih kelas sasaran (`targetClasses`), cegah duplikasi soal antar asesmen WAJIB (D-04), kunci komposisi & jadwal setelah `opensAt` lewat (D-14) | Login `guru1`/`guru123`, buka `/guru/asesmen`, `/guru/asesmen/baru`, dan `/guru/asesmen/[id]` |
| ASM-04 | Aktifkan / nonaktifkan asesmen (`Switch` + `Dialog` konfirmasi) dengan validasi kelengkapan soal, jadwal WIB, kelas sasaran, dan keterbukaan materi latihan (D-04) | Ubah toggle status aktif pada `/guru/asesmen` atau `/guru/asesmen/[id]` |
| ASM-05 | Tutup loop dari Dasbor Guru ke Siswa: tombol "Buat latihan" pada materi Sulit/Sedang di `/guru` mengarah ke draft latihan rekomendasi di `/guru/asesmen/[id]`; setelah diaktifkan guru, tampil di `/siswa/latihan` dengan label **Rekomendasi Guru** (D-10) | Klik "Buat latihan" di `/guru`, klik "Aktifkan Sekarang" di `/guru/asesmen/[id]`, lalu cek `/siswa/latihan` sebagai siswa `7a01` |
| ASM-06 | Simulasi jendela waktu langsung: tombol **Buka sekarang** (hanya untuk status Dijadwalkan) dan **Tutup sekarang** (hanya untuk status Berlangsung) dengan `Dialog` konfirmasi; menutup sekarang memfinalisasi sesi WAJIB yang belum selesai tanpa bonus waktu, membuka pembahasan soal, membuka materi latihan, dan memperbarui analitik dasbor (D-14) | Di `/guru/asesmen`, klik "Buka sekarang" pada asesmen *Jejak digital dan reputasi*, kerjakan sebagai siswa, lalu klik "Tutup sekarang" |
| SIS-07 | Halaman Latihan (`/siswa/latihan`), pengerjaan sesi latihan (`/siswa/sesi/[id]`), dan hasil latihan (`/siswa/hasil/[id]`): mendukung latihan rekomendasi guru & latihan mandiri per materi yang jendela WAJIB-nya sudah tertutup (D-04), boleh diulang, umpan balik langsung benar/salah + penjelasan setelah menjawab soal (D-11), poin latihan `+2/benar` maks. `20 poin/hari` WIB (D-05), evaluasi lencana `RAJIN_BERLATIH` & `KONSISTEN` (D-06), serta isolasi penuh dari analitik & peringkat (D-01) | Login `7a01`/`siswa123`, buka `/siswa/latihan`, mulai latihan rekomendasi atau mandiri, pilih opsi untuk melihat pembahasan langsung |
| (Opsional F4) | Kolom `% Benar` per soal pada tabel Bank Soal (`/guru/soal`) berdasarkan jawaban sesi WAJIB (D-01) | Buka `/guru/soal` dan periksa kolom `% Benar` |

## 2. Tidak selesai / dipangkas

- Tidak ada. Seluruh fitur wajib Fase 4 (`ASM-03`, `ASM-04`, `ASM-05`, `ASM-06`, `SIS-07`) beserta fitur opsional `% Benar` di Bank Soal telah diselesaikan dan diuji.

## 3. Berkas dan fungsi penting (`src/lib/`, `src/app/guru/asesmen/`, `src/app/siswa/`)

| Berkas | Isi / Fungsi | Kegunaan |
| --- | --- | --- |
| `src/lib/assessment-rules.ts` | `isTopicUnlockedForPractice`, `parseWibDateTimeInput`, `formatWibDateTimeLocalInput`, `isAssessmentCompositionLocked`, `validateAssessmentInput` | Validasi murni jadwal WIB, keterbukaan materi latihan (D-04), dan penguncian komposisi (D-14) |
| `src/lib/teacher-scope.ts` | `getTeacherClasses`, `assertAssessmentAccess` | Guard cakupan angkatan & kelas guru untuk asesmen (HTTP 404 lintas angkatan) |
| `src/app/guru/asesmen/actions.ts` | `createAssessmentAction`, `updateAssessmentAction`, `setAssessmentActiveAction`, `openAssessmentNowAction`, `closeAssessmentNowAction` | Server actions CRUD asesmen, toggle aktif, dan Buka/Tutup sekarang |
| `src/app/guru/asesmen/assessment-controls.tsx` & `assessment-form.tsx` | `AssessmentStatusToggle`, `AssessmentWindowActions`, `AssessmentForm` | Komponen interaktif pengelolaan jadwal, soal, dan konfirmasi dialog |
| `src/app/siswa/actions.ts` | `startRecommendedPracticeAction`, `startTopicPracticeAction`, `saveAnswerAction`, `finishPracticeSessionAction` | Server actions sesi latihan mandiri/rekomendasi, umpan balik per soal (D-11), dan batas poin harian |
| `src/app/siswa/latihan/page.tsx` | Halaman latihan mandiri & rekomendasi guru | Daftar latihan rekomendasi dan latihan per materi beserta status kunci D-04 |

## 4. Perubahan terhadap Master Context

- **Tidak ada perubahan skema database** (`prisma/schema.prisma` tetap utuh sesuai Fase 1).
- Seluruh keputusan teknis Fase 4 telah dicatat pada `docs/00_MASTER_CONTEXT.md` Bagian 13 dan status akhir diperbarui di `README.md`.

## 5. Hal yang meragukan / perlu diperiksa pemeriksa kode

- **Penegakan D-11 pada sesi LATIHAN:** `StudentSessionPage` (`src/app/siswa/sesi/[id]/page.tsx`) tetap hanya mengambil `id, text, order` pada opsi soal yang belum dijawab. Kunci jawaban (`correctOptionId`) dan `explanation` hanya dikirim oleh `saveAnswerAction` setelah siswa menjawab soal tersebut (atau saat memuat ulang soal yang sudah tercatat di `session.answers`).
- **Penegakan D-04 pada latihan:** Materi yang asesmen WAJIB-nya masih `Dijadwalkan` atau `Berlangsung` (mis. *Jejak digital dan reputasi* pada angkatan 7 sebelum ditutup) dikunci di UI `/siswa/latihan` maupun di server action `startTopicPracticeAction` / `startRecommendedPracticeAction` / `setAssessmentActiveAction`.
- **Otorisasi lintas guru:** `assertAssessmentAccess` memastikan Guru 1 (angkatan 7) dan Guru 2 (angkatan 8) tidak dapat mengakses atau memodifikasi asesmen milik angkatan lain (menghasilkan HTTP 404).

## 6. Catatan untuk Demo Akhir (8 Langkah Master Context Bagian 12)

1. Jalankan `npm run db:reset` bila ingin memulihkan state awal demo.
2. Login `guru1` (`guru123`) → buka `/guru/asesmen` → klik **Buka sekarang** pada asesmen *Jejak digital dan reputasi*.
3. Login siswa `7a01` (`siswa123`) → kerjakan asesmen *Jejak digital dan reputasi* di `/siswa/asesmen` (tanpa umpan balik per soal, pembahasan masih terkunci).
4. Kembali ke `guru1` → klik **Tutup sekarang** pada asesmen tersebut → pembahasan terbuka bagi siswa, skor pilar **Budaya** di `/guru` terisi, dan materi *Jejak digital dan reputasi* terbuka di `/siswa/latihan`.
5. Di `/guru`, klik **Buat latihan** pada materi Sulit/Sedang → tinjau di `/guru/asesmen/[id]` lalu klik **Aktifkan Sekarang** → siswa `7a01` membuka `/siswa/latihan`, mengerjakan latihan berlabel **Rekomendasi Guru** dengan umpan balik langsung, poin level bertambah (maks. 20/hari) tanpa mengubah peringkat maupun analitik wajib.


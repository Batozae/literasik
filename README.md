# STATUS: Literasik

> Diperbarui di **akhir setiap fase** oleh pengerja fase itu. Dibaca AI bersama `00_MASTER_CONTEXT.md` dan dokumen fase sebelumnya.
> Jika bertentangan dengan Master Context, Master Context yang berlaku.

## 1. Posisi Saat Ini
- **Fase aktif:** Fase 1 (belum dimulai)
- **Versi Master Context:** v2.0
- **Versi pustaka terkunci:** (isi saat inisialisasi: Next.js, Prisma, jose, bcryptjs, Vitest)

## 2. Papan Fase
| Fase | Pengerja | Status | Dokumen keluaran |
|---|---|---|---|
| 1. Fondasi dan Bank Soal | (nama) | Belum mulai | `Fase_1.md` |
| 2. Alur Wajib dan Gamifikasi | (nama) | Menunggu F1 | `Fase_2.md` |
| 3. Dashboard Guru dan Analitik | (nama) | Menunggu F2 | `Fase_3.md` |
| 4. Penjadwalan, Latihan, Finalisasi | (nama) | Menunggu F3 | `Fase_4.md` |

## 3. Status Fitur
Status: `Belum` / `Berjalan` / `Selesai (teruji)` / `Dipangkas`

| Fase | Fitur | Status |
|---|---|---|
| 1 | AUTH-01, AUTH-02, DAT-01, DAT-03, ASM-01, ASM-02, `schedule.ts`+test, layout | Belum |
| 2 | SIS-01, SIS-02, SIS-03, SIS-04, SIS-05, SIS-06, GAM-01/02/03, DAT-02, `scoring.ts`+test | Belum |
| 3 | GUR-01 s.d. GUR-10, `analytics.ts`+test | Belum |
| 4 | ASM-03, ASM-04, ASM-05, ASM-06, SIS-07, uji akses, README, latihan demo | Belum |

## 4. Isu Terbuka dan Hal yang Diwariskan
(Isi di akhir tiap fase: bug yang belum beres, keputusan menggantung, usulan perubahan skema, hal yang perlu diperiksa pengerja fase berikutnya.)

-

## 5. Cara Menjalankan (isi oleh Fase 1, perbarui bila berubah)
- Prasyarat dan versi: 
- Setup `.env` (tanpa nilai rahasia): 
- Perintah: `npm install`, `npm run db:reset`, `npm run dev`, `npm test`
- Akun demo: lihat README

---

# Format `Fase_N.md` (keluaran tiap fase, maksimal ±1 halaman)
1. **Selesai:** fitur (ID) yang jadi dan cara menguji singkat
2. **Tidak selesai / dipangkas:** beserta alasannya
3. **Berkas dan fungsi penting** yang dibuat (nama fungsi, tanda tangan, tempat), terutama yang akan dipanggil fase berikutnya
4. **Perubahan terhadap Master Context** (angka, aturan, skema) dan sudah dicatat di Bagian 13 atau belum
5. **Hal yang meragukan / perlu diperiksa pemeriksa kode**
6. **Catatan untuk fase berikutnya**

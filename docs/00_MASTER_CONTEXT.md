# 00_MASTER_CONTEXT: Literasik (v2.0, ringkas)

> Acuan tunggal proyek. Dibaca AI dan manusia di awal setiap sesi, bersama `README.md`.
> Jika dokumen fase bertentangan dengan dokumen ini, **dokumen ini yang berlaku**.

## 1. Ringkasan

- **Literasik:** prototipe platform asesmen gamifikasi berbasis web dengan dashboard learning analytics untuk memetakan literasi digital siswa SMP. Capstone kelompok (4 orang, 1 orang = 1 fase), **MVP lokal tanpa deploy**, data **sintetis** (nama fiktif).
- **Inti:** sekolah menjadwalkan asesmen **WAJIB** (serentak per angkatan, ada jendela waktu); siswa juga berlatih lewat asesmen **LATIHAN** (mandiri). Guru membaca analitik dari asesmen wajib, lalu memberi **latihan rekomendasi**. Gamifikasi: poin, level, lencana, peringkat angkatan.
- **Di luar lingkup (jangan dibuat):** registrasi mandiri, lupa sandi, OAuth, notifikasi, forum/chat, unggah materi, peran orang tua/admin, soal adaptif ML, mobile app, multi-sekolah, avatar, deploy, batas durasi sesi, asesmen susulan.
- **Batasan klaim (wajib di laporan):** dengan data sintetis, sistem **tidak boleh diklaim meningkatkan literasi digital**; yang dibuktikan hanya kebenaran logika (penjadwalan, penilaian, penandaan, visualisasi). Semua ambang di Bagian 4 adalah **asumsi desain**, bukan standar baku. Pemakaian data siswa nyata perlu persetujuan dan kajian UU PDP No. 27/2022 _(perlu verifikasi ke teks resmi)_.

## 2. Peran

| Peran | Boleh                                                                                                                                          | Tidak boleh                                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Siswa | Mengerjakan asesmen WAJIB angkatannya (dalam jendela), LATIHAN, melihat progres/poin/level/lencana/riwayat, peringkat **angkatannya** (top 25) | Melihat data siswa lain, halaman guru, jawaban benar/penjelasan sebelum waktunya |
| Guru  | Dashboard dan data siswa **hanya kelas yang diajar**, kelola bank soal dan asesmen, buat latihan rekomendasi, ekspor CSV                       | Melihat data kelas guru lain                                                     |

Asumsi: tiap guru memegang **semua kelas satu angkatan**.

## 3. Tech Stack dan Konvensi

- **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Recharts + MySQL via Prisma.** Pakai versi stabil terbaru saat inisialisasi, **kunci versi di `package.json`**, catat di Bagian 13. Cek dokumentasi resmi untuk dukungan Prisma-MySQL.
- Auth buatan sendiri: cookie httpOnly berisi JWT (`jose`), sandi di-hash `bcryptjs`. Tanpa Auth.js.
- Otorisasi dicek **di server pada setiap server action dan route handler** (middleware hanya tambahan). Recharts hanya di Client Component.
- **Waktu:** semua keputusan waktu memakai **jam server**, zona **Asia/Jakarta**, simpan UTC. Jam klien tidak dipercaya.
- Antarmuka berbahasa Indonesia; desktop-first untuk guru, responsif untuk siswa.
- Berkas kunci: `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/{config,scoring,analytics,schedule,auth}.ts`.
- Fungsi murni di `scoring.ts`, `analytics.ts`, `schedule.ts` **wajib punya unit test** (Vitest). Perintah reset satu langkah: `npm run db:reset` (hapus, migrasi, seed).

## 4. Konfigurasi (semua di `config.ts`; AI dilarang mengarang angka lain)

| Konstanta                   | Nilai        | Konstanta                   | Nilai                  |
| --------------------------- | ------------ | --------------------------- | ---------------------- |
| `TIMEZONE`                  | Asia/Jakarta | `HARD_TOPIC_THRESHOLD`      | 60%                    |
| `MIN_ANSWERS_STUDENT_TOPIC` | 3            | `EASY_TOPIC_THRESHOLD`      | 80%                    |
| `WEAK_TOPIC_THRESHOLD`      | 60%          | `POINTS_WAJIB_CORRECT`      | 10                     |
| `WEAK_STUDENT_TOPIC_COUNT`  | 2            | `POINTS_WAJIB_BONUS`        | 20                     |
| `LOW_OVERALL_THRESHOLD`     | 50%          | `POINTS_PRACTICE_CORRECT`   | 2                      |
| `MIN_ANSWERS_OVERALL`       | 10           | `POINTS_PRACTICE_DAILY_CAP` | 20                     |
| `MIN_ANSWERS_TOPIC_COHORT`  | 10           | `LEVEL_THRESHOLDS`          | [0, 60, 150, 250, 350] |
| `LEADERBOARD_TOP_N`         | 25           |                             |                        |

## 5. Aturan Bisnis (keputusan tetap)

**D-01 Sumber analitik.** Semua analitik (materi sulit, status siswa, skor pilar, tren, KPI, ekspor) **hanya dari jawaban sesi WAJIB**. Akurasi = benar / jumlah jawaban. Satu sesi WAJIB per siswa per asesmen (ditegakkan di kode server). Siswa yang tidak ikut = **tanpa data** (bukan skor 0) dan dihitung absen pada partisipasi. LATIHAN tidak pernah masuk analitik atau peringkat.

**D-02 Materi sulit** (per materi, semua siswa dalam filter): jawaban < 10 → "Data belum cukup"; akurasi < 60% → Sulit; 60% sampai < 80% → Sedang; ≥ 80% → Mudah. Urut dari akurasi terendah.

**D-03 Status siswa** (per periode filter). _Materi lemah_ = akurasi < 60% dengan ≥ 3 jawaban pada materi itu.

- **Perlu Pendampingan:** materi lemah ≥ 2, **atau** (total jawaban ≥ 10 dan akurasi keseluruhan < 50%)
- **Pantau:** tepat 1 materi lemah
- **Belum Cukup Data:** tidak ada materi dengan ≥ 3 jawaban dan total jawaban < 10
- **Aman:** selainnya
  Label UI "Perlu Pendampingan" (bukan "bermasalah"); detail siswa menampilkan **alasan** (daftar materi lemah).

**D-04 WAJIB vs LATIHAN**
| | WAJIB | LATIHAN |
|---|---|---|
| Waktu | Jendela buka-tutup per angkatan | Kapan saja |
| Percobaan | 1 sesi per siswa per asesmen | Boleh berulang |
| Umpan balik | Tidak ada per soal; pembahasan setelah `closesAt` | Langsung setelah menjawab |
| Analitik/peringkat | Ya (satu-satunya sumber) | Tidak (hanya data keterlibatan GUR-10) |
| Poin | 10/benar + bonus 20 jika semua soal dijawab sebelum tutup | 2/benar, maks 20/hari (tanggal WIB), tanpa bonus |
| Sumber soal | Asesmen guru/seed (soal hanya dipakai satu asesmen wajib) | Per materi (otomatis) dan latihan rekomendasi guru. **Soal materi baru terbuka setelah jendela WAJIB materi itu tertutup untuk angkatan siswa** |

**D-05 Poin dan level.** Dicatat sebagai `PointEvent` (`WAJIB_ANSWER`, `WAJIB_BONUS`, `LATIHAN_ANSWER`). Total poin = semua event; **poin peringkat = event WAJIB saja**. Level 1/2/3/4/5 mulai dari 0/60/150/250/350 poin.

**D-06 Lencana (9).** Langkah Pertama (1 sesi WAJIB selesai) · Teliti (semua benar di satu asesmen WAJIB) · Konsisten (sesi pada 3 tanggal berbeda) · Penjelajah (WAJIB dari keempat pilar) · Rajin Berlatih (3 sesi LATIHAN) · Tuntas Pilar x4 (Kecakapan, Etika, Keamanan, Budaya: semua asesmen WAJIB aktif pilar itu milik angkatannya, hanya dievaluasi jika jumlahnya ≥ 1 dan semuanya sudah dibuka).

**D-07 Peringkat angkatan.** Per angkatan, urut: poin peringkat ↓, akurasi WAJIB ↓, nama ↑. Siswa tanpa poin WAJIB tidak diperingkat. Kumulatif seluruh waktu (tidak ikut filter periode), dihitung saat halaman dibuka. Tampil **top 25**, nama "Nama Depan + inisial belakang (kelas)", baris siswa sendiri disorot. Siswa di luar top 25 hanya melihat kartu "Belum masuk 25 besar. Poinmu: X" **tanpa nomor peringkat**. Guru melihat tampilan yang sama untuk angkatan kelasnya.

**D-08 Filter, KPI, tren.**

- Filter: kelas ("Semua kelas saya" atau satu kelas yang diajar) dan periode (7 hari, 30 hari, semua waktu, rentang kustom; berdasarkan waktu jawaban). **Semua widget** mengikuti filter, kecuali peringkat.
- KPI: jumlah siswa; partisipasi (sesi WAJIB selesai / (asesmen wajib terbuka dalam periode x jumlah siswa)); rata-rata akurasi WAJIB; jumlah Perlu Pendampingan; jumlah sesi latihan dan siswa yang berlatih. Pilar tanpa data tampil "Belum ada data".
- Tren: **satu titik per asesmen WAJIB** (x = tanggal buka, y = akurasi, tooltip nama materi dan jumlah peserta), tidak per hari/minggu. **Catatan wajib di UI:** "Setiap titik adalah materi yang berbeda. Perbedaan skor antar titik dipengaruhi tingkat kesulitan materi, bukan hanya perkembangan siswa."

**D-09 Ekspor CSV** (route handler server, hanya guru, mengikuti filter): (1) hasil siswa: nama, kelas, total poin, poin peringkat, level, wajib diikuti ("4/5"), jumlah jawaban wajib, akurasi wajib, status, materi lemah (dipisah `;`), jumlah sesi latihan, terakhir aktif; (2) hasil per materi: angkatan, pilar, materi, jumlah jawaban, akurasi, kategori. UTF-8 dengan BOM; sel berawalan `=`, `+`, `-`, `@` diberi awalan `'`.

**D-10 Tutup loop.** Pada materi Sulit/Sedang, tombol "Buat latihan dari materi ini" membuat asesmen **LATIHAN** berisi semua soal aktif materi itu (judul "Latihan: {materi}", `sourceTopicId` terisi, kelas tujuan mengikuti filter, boleh diedit sebelum diaktifkan). Tampil di siswa dengan label "Rekomendasi Guru". Tidak mengubah analitik/peringkat; dampaknya terlihat di GUR-10.

**D-11 Pembahasan.** Server **tidak pernah mengirim** `isCorrect`, opsi benar, atau penjelasan sebelum waktunya: WAJIB sebelum `closesAt`; LATIHAN sebelum siswa menjawab soal itu.

**D-12 Soal.** Pilihan ganda, 4 opsi, tepat 1 benar, penjelasan wajib ada. Kesulitan (EASY/MEDIUM/HARD) hanya label.

**D-13 Konten.** 12 materi x 5 soal = **60 soal**, 12 asesmen WAJIB (6 per angkatan, 1 per materi). Soal ditulis tim (boleh dibantu AI, **wajib ditinjau manusia**). Pembagian di bawah adalah usulan; **cocokkan dengan modul resmi Komdigi/Siberkreasi**.

- **Angkatan 7:** Pencarian dan penilaian informasi (Kecakapan) · Komunikasi dan kolaborasi daring (Kecakapan) · Etika bermedia sosial (Etika) · Kata sandi dan autentikasi (Keamanan) · Phishing dan penipuan online (Keamanan) · Jejak digital dan reputasi (Budaya)
- **Angkatan 8:** Pengelolaan berkas dan penyimpanan daring (Kecakapan) · Perundungan siber (Etika) · Hak cipta dan plagiarisme (Etika) · Privasi dan data pribadi (Keamanan) · Hoaks dan verifikasi informasi (Budaya) · Keberagaman dan toleransi di ruang digital (Budaya)

**D-14 Jadwal.** Asesmen WAJIB punya `opensAt`/`closesAt`; jadwal harian tidak dikunci. Status siswa: Dijadwalkan, Berlangsung, Selesai, Terlewat. Sesi hanya bisa **dimulai** di dalam jendela dan jika belum punya sesi untuk asesmen itu; yang sudah dimulai boleh dilanjutkan selama jendela buka. Saat `closesAt` lewat, sesi belum selesai ditutup otomatis (jawaban terkirim tetap dihitung, tanpa bonus). **Komposisi soal dan jendela hanya bisa diubah sebelum `opensAt`.** "Buka sekarang" hanya untuk status Dijadwalkan; "Tutup sekarang" hanya untuk Berlangsung.

## 6. Model Data (Prisma)

User(nama, username unik, passwordHash, role STUDENT/TEACHER) · Class(nama, gradeLevel) · StudentProfile(userId, classId) · TeacherClass(teacherId, classId) · Pillar(kode, nama; 4 baris) · Topic(pillarId, nama, gradeLevel; 12 baris) · Question(topicId, teks, kesulitan, penjelasan, isActive) · Option(questionId, teks, isCorrect, urutan; 4 per soal) · Assessment(judul, deskripsi, type WAJIB/LATIHAN, gradeLevel, opensAt, closesAt, sourceTopicId?, isActive, createdById) · AssessmentQuestion(assessmentId, questionId, urutan) · AssessmentClass(assessmentId, classId; sasaran latihan rekomendasi) · AssessmentSession(studentId, kind, assessmentId?, topicId?, startedAt, finishedAt) · Answer(sessionId, studentId, questionId, selectedOptionId, isCorrect, answeredAt; unik per sessionId+questionId) · PointEvent(studentId, sessionId, tipe, poin, createdAt) · Badge / StudentBadge.

## 7. Rute

- Umum: `/login`
- Siswa: `/siswa`, `/siswa/asesmen`, `/siswa/latihan`, `/siswa/sesi/[id]`, `/siswa/hasil/[id]`, `/siswa/riwayat`, `/siswa/peringkat`
- Guru: `/guru`, `/guru/siswa/[id]`, `/guru/peringkat`, `/guru/soal` (+`/baru`, `/[id]`), `/guru/asesmen` (+`/baru`, `/[id]`)
- Ekspor: `/api/ekspor/siswa`, `/api/ekspor/materi`

## 8. Data Seed

- **Struktur:** 4 kelas (7A 32 siswa, 7B 30, 8A 30, 8B 30; nama fiktif), 2 guru (Guru 1 = 7A+7B, Guru 2 = 8A+8B), 12 asesmen WAJIB. Kata sandi demo ditulis di README.
- **Jadwal (relatif tanggal seed):** 5 asesmen WAJIB per angkatan sudah selesai (sekitar 2x/minggu, jam sekolah WIB, jendela beberapa jam); 1 per angkatan berstatus Dijadwalkan untuk demo "Buka sekarang": **Jejak digital dan reputasi** (angkatan 7) dan **Keberagaman dan toleransi** (angkatan 8). Pilar Budaya angkatan 7 awalnya kosong dan terisi saat demo.
- **Data historis (acak dengan seed tetap, dibuat lewat fungsi `scoring.ts`/`schedule.ts` yang sama dengan aplikasi, bukan SQL manual):**
  - Pola sengaja: Keamanan tersulit (phishing dan privasi ~45-55%, kata sandi ~55%), Etika termudah (~80%), Kecakapan ~65-70%, hoaks ~58%; kelas 7B sedikit di bawah 7A.
  - Sebaran siswa: ~10% Perlu Pendampingan, ~15% Pantau, sisanya Aman, 3 siswa "Belum Cukup Data".
  - 3 siswa absen di beberapa asesmen wajib; 2 siswa banyak sesi latihan (membuktikan latihan tidak mengubah analitik/peringkat dan batas harian bekerja); beberapa sesi latihan per materi dan 1-2 latihan rekomendasi.
  - Tidak ada pola "skor naik" (skor mengikuti kesulitan materi, lihat D-08).

## 9. Daftar Fitur dan Pembagian Fase

Estimasi beban (satuan relatif, **perkiraan awal, koreksi di Bagian 13 bila meleset**): F1 ≈ 16, F2 ≈ 16, F3 ≈ 15, F4 ≈ 14.

| Fase                                                | Fitur                                                                                                                                                                                                                                                                                                         | Hasil                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **1. Fondasi dan Bank Soal**                        | Init proyek, `schema.prisma`, `config.ts`, `schedule.ts` + test, **AUTH-01** login/logout, **AUTH-02** guard dan otorisasi per peran/kelas, **DAT-01** seed struktur + 60 soal, **DAT-03** `db:reset`, layout dasar siswa/guru, **ASM-01** CRUD bank soal, **ASM-02** aktif/nonaktif soal                     | Login dua peran, DB ter-seed, kerangka halaman, guru bisa kelola soal               |
| **2. Alur Wajib dan Gamifikasi**                    | `scoring.ts` + test, **SIS-02** daftar asesmen wajib + status, **SIS-03** sesi wajib, **SIS-04** hasil dan pembahasan tertunda, **GAM-01/02/03** poin, level, lencana, **SIS-01** beranda, **SIS-05** riwayat, **SIS-06** peringkat, **DAT-02** seed historis                                                 | Siswa mengerjakan asesmen wajib end-to-end; DB berisi data historis untuk dashboard |
| **3. Dashboard Guru dan Analitik**                  | `analytics.ts` + test, **GUR-01** filter, **GUR-02** KPI, **GUR-03** skor pilar, **GUR-04** materi tersulit, **GUR-05** tren, **GUR-06** tabel siswa + status, **GUR-07** detail siswa, **GUR-08** peringkat guru, **GUR-09** ekspor CSV, **GUR-10** keterlibatan latihan _(dipangkas dulu bila waktu ketat)_ | Dashboard lengkap, konsisten dengan filter                                          |
| **4. Penjadwalan, Latihan, Tutup Loop, Finalisasi** | **ASM-03** susun/jadwalkan asesmen wajib, **ASM-04** aktif/nonaktif asesmen, **ASM-06** Buka/Tutup sekarang, **SIS-07** latihan mandiri + rekomendasi guru, **ASM-05** tutup loop, uji akses end-to-end, perapian UI, README, latihan demo                                                                    | Prototipe siap demo                                                                 |

Catatan ketergantungan: F2 butuh F1 (skema, auth, soal); F3 butuh data historis dari F2; F4 butuh semuanya. Skema dibekukan setelah F1 (lihat Bagian 10 aturan 2).
_(Opsional F4 bila waktu ada: kolom "persentase benar per soal" di bank soal.)_

## 10. Aturan untuk AI (wajib)

1. Baca dokumen ini, `README.md`, `docs/DESIGN.md`dan dokumen fase sebelumnya sebelum menulis kode.
2. **Jangan mengubah `schema.prisma`** atau menjalankan migrasi tanpa instruksi eksplisit. Jika fase Anda butuh perubahan skema, catat usulannya di Status dan Bagian 13, lalu tanyakan.
3. Angka ambang dan konstanta hanya dari `config.ts`; **jangan mengarang angka baru**.
4. Analitik dan peringkat **hanya dari sesi WAJIB** (D-01).
5. Jangan kirim `isCorrect`, opsi benar, atau penjelasan sebelum waktunya (D-11).
6. Jendela waktu, satu sesi WAJIB, kunci komposisi, dan batas harian poin latihan ditegakkan **di server** dengan jam server (WIB).
7. Setiap server action dan route handler memeriksa sesi, peran, dan kepemilikan kelas.
8. Jangan menambah fitur atau dependensi di luar daftar tanpa bertanya. Jika instruksi tidak jelas atau bertentangan dengan dokumen ini, **berhenti dan tanyakan**.
9. Setelah tiap tugas, laporkan singkat: berkas diubah, cara uji, hal meragukan.

## 11. Aturan Kerja Kelompok

- **Satu orang per fase.** Anggota yang memegang fase juga memegang berkas fase itu; pemeriksa kode adalah **anggota lain** (fokus: otorisasi, jendela waktu, aturan bisnis).
- Pemilik `schema.prisma`: pengerja Fase 1; setelah itu perubahan skema hanya lewat kesepakatan kelompok dan dicatat di Bagian 13.
- Satu branch per fase/fitur, digabung ke `main` setelah diuji manual oleh orang lain. Commit kecil, pesan menyebut ID fitur (mis. `GUR-04`).
- Di akhir fase, pengerja memperbarui `README.md` lalu menulis `Fase_N.md` (format di `README.md`). Fase berikutnya memakai 3 dokumen: Master Context, Status, Fase_N sebelumnya.

## 12. Skenario Demo dan Kriteria Penerimaan

**Demo:** (1) Guru 1 "Buka sekarang" asesmen Jejak digital · (2) Siswa mengerjakan serentak tanpa umpan balik, melihat skor/poin, pembahasan belum ada · (3) Guru 1 "Tutup sekarang"; pembahasan terbuka, dashboard terbarui (Budaya terisi) · (4) Siswa melihat peringkat angkatan (top 25 atau kartu "Belum masuk 25 besar") · (5) Guru 1 pilih kelas dan periode: KPI, skor pilar, tren, materi tersulit (Keamanan), siswa Perlu Pendampingan beserta alasan · (6) Guru 1 "Buat latihan dari materi ini"; siswa mengerjakan dengan umpan balik langsung; poin pribadi naik, peringkat dan analitik tidak berubah, KPI keterlibatan bertambah · (7) Guru 1 ekspor CSV · (8) Guru 2 terbukti tidak bisa melihat kelas 7A/7B.

**Kriteria penerimaan:**

- Siswa tidak bisa membuka halaman/API guru (via URL maupun API); Guru 2 tidak bisa melihat data kelas Guru 1.
- Sesi WAJIB tidak bisa dimulai sebelum `opensAt`, setelah `closesAt`, atau dua kali per asesmen; respons selama sesi tidak memuat jawaban benar/penjelasan.
- Soal materi tidak tersedia di LATIHAN sebelum jendela WAJIB materi itu tertutup.
- LATIHAN (berapa pun) tidak mengubah akurasi, status siswa, materi sulit, tren, peringkat; poin latihan tidak melebihi batas harian.
- Komposisi dan jendela asesmen tidak bisa diubah setelah dibuka; Buka/Tutup sekarang hanya sesuai status.
- Pola seed muncul (Keamanan terendah, Etika tertinggi); ubah filter → semua widget selain peringkat berubah konsisten.
- Peringkat maks 25 baris per angkatan; siswa di luar top 25 tidak melihat nomor peringkat.
- CSV terbuka benar di Excel, sesuai filter, hanya bisa diunduh guru.
- Tutup loop berjalan dari dashboard sampai siswa mengerjakan latihan rekomendasi.
- Fungsi `scoring.ts`, `analytics.ts`, `schedule.ts` punya unit test yang lulus; `npm run db:reset` memulihkan data demo.

**Risiko / perlu verifikasi:** semua ambang adalah asumsi · pembagian materi perlu dicocokkan dengan modul resmi · tren per asesmen rawan salah tafsir (pertahankan catatan D-08) · absen mengurangi poin peringkat dan tidak bisa dipulihkan lewat latihan (bahas sebagai keterbatasan) · 5 soal per asesmen membuat hasil rawan tebakan (alasan ada jumlah minimum jawaban) · kebenaran 60 soal bergantung tinjauan manusia · penegakan jendela waktu bergantung kode server (area utama code review) · versi Next.js/Prisma/`jose` dan UU PDP perlu dicek di sumber resmi.

## 13. Keputusan dan Perubahan Antar Fase

- **Fase 1 (Fondasi dan Bank Soal):**
  1. Guru hanya mengelola bank soal angkatannya (`assertQuestionAccess`, `assertTopicAccess`).
  2. Soal terkunci bila sudah dijawab atau terdapat pada asesmen yang sudah dibuka (`isQuestionLocked`).
  3. Soal di asesmen Dijadwalkan/Berlangsung tidak boleh dinonaktifkan.
  4. Tidak ada fitur hapus soal (hanya nonaktifkan soal).
  5. Penambahan kolom `AssessmentSession.wajibKey` (unik, nullable) di `schema.prisma`.
  6. `docs/DESIGN.md` dijadikan acuan wajib UI.

- **Fase 2 (Alur Wajib dan Gamifikasi):**
  1. Penegakan 1 sesi per siswa per asesmen WAJIB via `wajibKey = "${studentId}-${assessmentId}"` di server action dan transaksi database.
  2. Penegakan ketat D-11: query data sesi ke siswa pada `src/app/siswa/sesi/[id]` hanya memilih `id, text, order` pada opsi dan tidak pernah memilih `isCorrect` atau `explanation`.
  3. Format waktu Indonesia distandarisasi melalui fungsi `formatWibDateTime(date)` di `src/lib/schedule.ts` ("15 Nov 2026, 09.00 WIB").
  4. Seed historis (DAT-02) mengimplementasikan sebaran D-03: 12 Perlu Pendampingan (~10%), 18 Pantau (~15%), 3 Belum Cukup Data (`7a32`, `7b30`, `8b30`), 89 Aman, dan pola kesulitan materi (Keamanan ~58-62%, Etika ~80-81%, Kecakapan ~60-63%, Hoaks ~57%, 7B di bawah 7A) dengan 3 siswa absen dan 2 siswa banyak latihan untuk membuktikan daily cap dan isolasi analitik.

- **Fase 3 (Dashboard Guru dan Analitik):**
  1. Pemasangan pustaka `recharts` (^2.15.3) untuk visualisasi grafik pilar dan tren akurasi di dashboard guru sesuai panduan `DESIGN.md`.
  2. Isolasi analitik D-01: seluruh metrik asesmen, tren, skor pilar, dan status materi/siswa diekstraksi eksklusif dari jawaban sesi WAJIB. Sesi LATIHAN diisolasi khusus untuk metrik keterlibatan (GUR-10).
  3. Otorisasi D-08 & GUR-07: Guru hanya dapat mengakses dan melihat data siswa dari kelas yang diajar; akses ke siswa di luar kelas diajar menghasilkan HTTP 404.
  4. Ekspor CSV D-09: Route handler server memvalidasi sesi guru, menerapkan filter aktif (kelas & periode), menyisipkan UTF-8 BOM, dan mensanitasi injeksi formula spreadsheet.
  5. Tutup Loop D-10: Tombol "Buat latihan" pada materi Sulit/Sedang memicu pembuatan asesmen LATIHAN terhubung `sourceTopicId` dan mendistribusikan ke kelas tujuan yang relevan.

- **Fase 4 (Penjadwalan, Latihan, Tutup Loop, Finalisasi):**
  1. Penjadwalan & komposisi asesmen (`src/lib/assessment-rules.ts`, `src/app/guru/asesmen/*`): menegakkan aturan D-04 (soal hanya boleh dipakai di satu asesmen WAJIB; soal materi baru terbuka untuk LATIHAN setelah jendela WAJIB materi itu tertutup) dan D-14 (komposisi soal dan jendela waktu WAJIB terkunci begitu `opensAt` lewat atau sudah memiliki sesi pengerjaan).
  2. Simulasi jendela langsung ASM-06 (`openAssessmentNowAction`, `closeAssessmentNowAction`): "Buka sekarang" hanya untuk status Dijadwalkan dan mengubah `opensAt` ke waktu server sekarang; "Tutup sekarang" hanya untuk status Berlangsung, memfinalisasi seluruh sesi WAJIB yang belum selesai tanpa bonus waktu (`finalizeExpiredSession`), serta mengubah `closesAt` ke waktu server sekarang sehingga pembahasan, materi latihan, dan analitik langsung terbuka/terbarui.
  3. Latihan mandiri & rekomendasi guru SIS-07 & ASM-05 (`src/app/siswa/latihan/page.tsx`, `src/app/siswa/actions.ts`, `src/app/siswa/sesi/*`): siswa dapat mengerjakan latihan rekomendasi guru (label "Rekomendasi Guru") maupun latihan mandiri per materi yang jendela WAJIB-nya sudah tertutup secara berulang, dengan umpan balik langsung per soal (benar/salah + penjelasan setelah menjawab sesuai D-11) dan poin latihan `+2/benar` dengan batas harian `20 poin/hari` (WIB) yang terisolasi dari analitik dan peringkat (D-01, D-05).
  4. Kolom opsional "% Benar" ditambahkan pada tabel Bank Soal (`/guru/soal`) berdasarkan jawaban sesi WAJIB (D-01).



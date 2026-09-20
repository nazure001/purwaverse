# PURWAVERSE MIGRATION HANDOVER DOCUMENT
**Panduan Teknis Komprehensif Migrasi Google Apps Script (GAS) + Google Sheets menuju Node.js + SQLite/PostgreSQL pada VPS Mandiri**

*Dokumen ini disusun oleh Lead Software Architect / Developer Utama Purwaverse IPA VIII sebagai referensi definitif serah terima teknis (handover) bagi developer migrasi. Seluruh spesifikasi arsitektur, logic bisnis, algoritma deterministik, skema database, keamanan, dan kontrak API di bawah ini berakar langsung pada kode produksi aktif repository.*

---

## DAFTAR ISI
1. [Bagian 1: Overview Project](#bagian-1-overview-project)
2. [Bagian 2: Current Architecture](#bagian-2-current-architecture)
3. [Bagian 3: File Map](#bagian-3-file-map)
4. [Bagian 4: Database & Data Ownership](#bagian-4-database--data-ownership)
5. [Bagian 5: Authentication & Security](#bagian-5-authentication--security)
6. [Bagian 6: Business Logic & Core Algorithms](#bagian-6-business-logic--core-algorithms)
7. [Bagian 7: API Contract (RPC Protocol)](#bagian-7-api-contract-rpc-protocol)
8. [Bagian 8: Migration Warning (Invariants yang Tidak Boleh Berubah)](#bagian-8-migration-warning-invariants-yang-tidak-boleh-berubah)
9. [Bagian 9: Current Limitations & Known Edge Cases](#bagian-9-current-limitations--known-edge-cases)
10. [Bagian 10: Migration Roadmap & Step-by-Step Recommendation](#bagian-10-migration-roadmap--step-by-step-recommendation)

---

## BAGIAN 1: OVERVIEW PROJECT

### PROJECT PURPOSE
Purwaverse IPA VIII adalah platform pembelajaran berbasis bukti (*evidence-based inquiry learning*) yang dirancang khusus untuk mata pelajaran IPA Kelas VIII SMP (merujuk pada Kurikulum Merdeka dan Buku Sekolah Elektronik / BSE IPA Kemendikbudristek 2021).

Tujuan utama Purwaverse bukan sekadar memindahkan materi ke layar digital atau membuat kuis pilihan ganda otomatis, melainkan menegakkan disiplin alur saintifik yang nyata:
1. Menjembatani literasi sains bacaan dengan penulisan rangkuman fisik bermakna di buku tulis siswa.
2. Memverifikasi pemahaman konsep secara manual oleh guru sebelum siswa diizinkan menempuh uji kompetensi.
3. Menilai keterampilan berpikir saintifik awal (Mission 0) secara kualitatif-kuantitatif tanpa membuat siswa merasa dihakimi/diranking.
4. Membentuk tim laboratorium heterogen yang seimbang (*Science Team*) secara komputasional berdasarkan profil penalaran siswa, bukan voting popularitas.
5. Memfasilitasi praktikum berbasis tim (*Group Lab*) yang kolaboratif dan menjunjung tinggi integritas data (mencatat data asli kegagalan uji coba tanpa rekayasa).

### MASALAH PENDIDIKAN YANG INGIN DISELESAIKAN
1. **Kebiasaan Copy-Paste & Generasi Jawaban AI**: Siswa sering kali hanya menyalin teks dari internet atau menggunakan LLM tanpa memahami konsep. Purwaverse mewajibkan rangkuman fisik di buku tulis dan menanam detektor integritas (honeypot terms & tab-switch tracker).
2. **Kesenjangan Kemampuan Kelompok (Free-Rider Problem)**: Dalam praktikum kelompok konvensional, siswa cerdas mendominasi pekerjaan sementara siswa lain menjadi penonton pasif. Purwaverse menyelesaikan ini dengan algoritma Snake Draft + 2-Opt Balance yang memastikan setiap kelompok memiliki Scientist Leader, Deputy, dan anggota dengan peran terdistribusi (*Lab Operator*, *Data Recorder*, *Evidence Checker*, *Communicator*), serta mewajibkan seluruh anggota menuntaskan materi sebelum LKPD tim terbuka.
3. **Ketergantungan Kuota & Smartphone di Kelas**: Purwaverse didesain ramah perangkat terbatas; materi dapat dibaca di rumah atau proyektor kelas, rangkuman ditulis tangan di buku fisik, dan LKPD dapat dicetak (Print-Ready) sehingga praktikum dapat berjalan tanpa ketergantungan layar ponsel.

### TARGET USER
1. **Siswa (Kelas 8A – 8E SMP)**:
   - Mengakses materi bacaan interaktif yang dilengkapi diagram SVG beranotasi.
   - Memberikan sinyal kesulitan (*confusion signal*: konsep, istilah, hitungan, praktik) secara privat dan aman tanpa takut nilainya berkurang.
   - Melaporkan bahwa rangkuman buku fisik siap diperiksa guru.
   - Mengerjakan kuis pemahaman konsep (*Quick Quiz*) berbatas waktu dengan pilihan jawaban acak deterministik.
   - Berkolaborasi dalam tim laboratorium untuk mengisi Lembar Kerja Praktik Tim (*Group Lab*).
   - Melihat papan peringkat publik yang menghargai ketuntasan dan integritas (*Public Leaderboard*).
2. **Guru IPA**:
   - Memantau dasbor kelas secara terpusat (*Teacher Dashboard*).
   - Memeriksa dan memvalidasi rangkuman fisik siswa dengan antrean terstruktur (*Teacher Check Queue*).
   - Menilai jawaban diagnostik kualitatif Mission 0 berdasarkan rubrik resmi skor 0–4.
   - Menghasilkan pembagian tim laboratorium otomatis (*Generate Science Teams*) dan melakukan override peran/anggota jika diperlukan.
   - Memberikan penilaian dan catatan perbaikan pada laporan praktikum tim (*Group Lab Evaluation*).
   - Memberikan pengecualian pembukaan materi (*Unlock Override*) untuk siswa berkebutuhan khusus atau remedial.
3. **Administrator Sistem / Kepala Lab**:
   - Mengelola master data kelas, siswa (roster), dan aktivitas kurikulum.
   - Mencetak kartu kredensial akun fisik (PDF 10 kartu per lembar A4 dengan QR aman tanpa memuat PIN).
   - Mengaudit jejak aktivitas dan log anomali (*Audit Log*).

### MAIN USER FLOW
```
[Siswa Baru / Awal Semester]
       │
       ▼
[Mission 0: Quick Diagnostic]
(5-9 Soal Penalaran Acak, Timer 210s/soal, Auto-submit saat timeout)
       │
       ▼
[Pemeriksaan Diagnostik oleh Guru (Skor 0-4)]
       │
       ▼
[Pembentukan Tim Laboratorium (Generate Science Teams)]
(Algoritma Snake Draft Heterogen Berbasis Leader Index & Reasoning)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                 SIKLUS PEMBELAJARAN PER UNIT                │
│                                                             │
│   [1. Baca Materi & Amati Ilustrasi Teranotasi]             │
│                     │                                       │
│   [2. Catat Rangkuman Konsep di Buku Tulis Siswa]           │
│                     │                                       │
│   [3. Klik "Saya Sudah Merangkum" -> Antrean Guru]          │
│                     │                                       │
│   [4. Guru Memeriksa Buku Fisik & Klik "Verified"]          │
│                     │                                       │
│   [5. Quick Quiz Terbuka (5-8 Soal, L/M/HOTS, Timer, KKM 70)]│
│                     │                                       │
│   [6. Seluruh Rekan Tim Tuntas Rangkuman & Kuis?]           │
│         ├── TIDAK ──► Bantu Rekan Tim (Peer Tutoring)       │
│         └── YA    ──► LKPD Praktik Tim Terbuka              │
│                           │                                 │
│   [7. Praktik Laboratorium & Pengisian Draft Laporan]       │
│                     │                                       │
│   [8. Leader / Deputy Mengirim Laporan Final Tim]           │
│                     │                                       │
│   [9. Guru Memeriksa Laporan Praktik & Nilai Terbit]        │
│                     │                                       │
│   [10. Kunci Submateri Berikutnya Terbuka Otomatis]         │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
[Kartu Kontrol Semester Terbit Setelah 21 Unit Selesai]
```

---

## BAGIAN 2: CURRENT ARCHITECTURE

### TOPOLOGI SAAT INI
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PERANGKAT PENGGUNA                              │
│  Browser Siswa & Guru (Chrome Android, Safari iOS, Desktop Chrome/Edge)    │
│  Mengakses: https://purwaverse.vercel.app ATAU URL GAS Exec (Redirector)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS (JSON RPC POST)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EDGE PROXY LAYER (VERCEL)                          │
│  File: api/purwa.js (Node.js Serverless Function)                           │
│  - Menyajikan static Single Page Application (public/index.html)            │
│  - Memproksikan API POST /api/purwa -> Google Apps Script Web App Exec      │
│  - Bypass CORS, mengatasi interstitial Google Drive Android Chrome          │
│  - Timeout controller: 45 detik dengan mekanisme auto-retry jika respon HTML│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS POST (Content-Type: text/plain)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND LAYER (GOOGLE APPS SCRIPT)                       │
│  V8 Runtime Web App (`doGet`, `doPost`)                                     │
│  - Dispatcher: api(action, payload)                                         │
│  - Controllers: Services.gs, LearningServices.gs                            │
│  - Security: Security.gs (Token auth, PIN hash, Rate limiter)               │
│  - Data Access: Repository.gs (SpreadsheetApp abstraction)                  │
│  - Concurrency Lock: LockService.getScriptLock() (Max wait 30s)             │
│  - Ephemeral Cache: CacheService.getScriptCache() (Max item 100KB, max 6 jam)│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Google Apps Script Spreadsheet Service
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER (GOOGLE SHEETS)                       │
│  Spreadsheet ID: Active Container Spreadsheet                               │
│  23 Sheets Berfungsi Sebagai Relational Tables                              │
│  (MASTER_STUDENTS, PROGRESS, QUIZ_ATTEMPTS, GROUP_LAB, dll.)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### KOMPONEN & DEPENDENCY SAAT INI
1. **Frontend**:
   - Berupa Single Page Application (SPA) HTML5 + Vanilla JavaScript (ES6) + CSS3 kustom modern.
   - Dibundel oleh skrip `scripts/build-web.js` yang menggabungkan `gas/Index.html`, `gas/Styles.html`, `gas/LearningStyles.html`, `gas/Scripts.html`, dan `gas/LearningScripts.html`.
   - Mengandung data kurikulum pra-bundel (`window.PURWAVERSE_STATIC_UNITS` & `window.PURWAVERSE_STATIC_CATALOG`) untuk mengeliminasi roundtrip pembacaan materi.
2. **Backend**:
   - Google Apps Script V8 Engine.
   - Titik masuk utama: `gas/Api.gs` melalui handler `doPost(e)` dan `doGet(e)`.
   - Menggunakan RPC (Remote Procedure Call) satu pintu: semua interaksi klien memanggil `POST /api/purwa` dengan body `{ action: "namaAksi", payload: { ... } }`.
3. **Database**:
   - Google Sheets dengan pembungkus repository `Repository.gs` yang memetakan baris menjadi array of objects berdasarkan header kolom baris ke-1.
4. **Alasan Krusial Migrasi ke VPS**:
   - **Eksekusi Lambat & Latensi Tinggi**: Setiap pembacaan Spreadsheet melalui `SpreadsheetApp.getActiveSpreadsheet()` memakan waktu 800ms – 2500ms.
   - **Koneksi Timeout (Batas 45–60 Detik GAS)**: Saat 40+ siswa mengerjakan kuis atau submit bersamaan di satu kelas, antrean LockService sering mencapai timeout.
   - **Google Drive Android Interstitial**: Pengguna Android Chrome yang login banyak akun Google sering terjebak di halaman warning interstitial Google Drive.
   - **Batas Kuota GAS**: Kuota eksekusi harian dan limit kuota pembacaan script cache (100KB per key) sangat membatasi penskalaan 5 kelas (207 siswa).

---

## BAGIAN 3: FILE MAP

Berikut adalah pemetaan menyeluruh seluruh file dalam repository, peran fungsionalnya, ketergantungannya, serta instruksi migrasinya.

### 1. `gas/Api.gs`
- **ROLE**: Entry Point HTTP Web App & API Dispatcher.
- **FUNCTION**: 
  - `doGet(e)`: Mengembalikan halaman web atau mengalihkan (*auto-redirect*) ke URL Vercel; menangani inisialisasi skema paksa (`ensureSchema=1`).
  - `doPost(e)`: Menerima payload JSON RPC `{ action, payload }`, memanggil `api(action, payload)`, dan mengembalikan respons JSON `{ ok: true, data }` atau `{ ok: false, error }`.
  - `publicBootstrap_()`: Menyediakan metadata awal (nama app, mode, daftar kelas aktif, daftar aktivitas publik, glosarium terindeks).
  - `api(action, payload)`: Switch-case raksasa yang merutekan 36 aksi API ke fungsi spesifik di `Services.gs` atau `LearningServices.gs`.
- **DEPENDENCY**: `Config.gs`, `Repository.gs`, `Security.gs`, `Services.gs`, `LearningServices.gs`.
- **MIGRATION NOTE**: Pada Express.js / Node.js, file ini digantikan oleh Router Express (misalnya `routes/api.js` atau controller RPC). Handler `doPost` diganti dengan route `app.post('/api/purwa', apiHandler)`.

### 2. `gas/Config.gs`
- **ROLE**: Konfigurasi Global & Definisi Skema Tabel.
- **FUNCTION**:
  - Menyimpan konstanta sistem `CONFIG` (`APP_NAME`, `SCHOOL_YEAR`, `CURRENT_SEMESTER`, `SESSION_HOURS: 8`, `TEAM_COUNT: 8`, `QUIZ_PASSING_SCORE: 70`, `LOGIN_MAX_ATTEMPTS: 5`, `LOGIN_BLOCK_SECONDS: 300`, `DIAGNOSTIC_SECONDS_PER_ITEM: 210`, `DOMAINS: [...]`).
  - Mendefinisikan struktur kolom 23 tabel di object `SHEETS`.
- **DEPENDENCY**: Mandiri (tidak ada dependency).
- **MIGRATION NOTE**: Pindahkan langsung ke `src/config/index.js` atau file konfigurasi environment `.env`. Skema kolom pada `SHEETS` menjadi dasar DDL pembuatan tabel SQLite/PostgreSQL.

### 3. `gas/Security.gs`
- **ROLE**: Keamanan Kredensial, Autentikasi, Hashing, & Throttling.
- **FUNCTION**:
  - `configureTeacherCredentials(username, password, classIds)`: Mengonfigurasi kredensial guru dengan salt UUID dan hash SHA-256.
  - `studentPinHash_(pin)`: Menghasilkan hash PIN siswa menggunakan `STUDENT_PIN_PEPPER`.
  - `verifyStudentPin_(student, pin)`: Memvalidasi PIN siswa dengan mencocokkan hash ber-pepper, serta fallback ke hash legacy unpeppred `hash_(pin)`.
  - `assertLoginAllowed_(type, identity)` & `recordLoginFailure_`: Rate limiter berbasis memori cache untuk mencegah brute-force login PIN/password.
  - `ensureTeacherClassAccess_(session, classId)`: Guard otorisasi guru untuk memastikan guru berhak mengakses kelas target (atau hak akses wildcard `*`).
- **DEPENDENCY**: `Repository.gs`, `Config.gs`.
- **MIGRATION NOTE**: Ganti implementasi SHA-256 dengan `bcrypt` atau `argon2` untuk hash kata sandi guru dan PIN siswa. Rate limiter diganti dengan `express-rate-limit` atau modul berbasis memori/Redis.

### 4. `gas/Repository.gs`
- **ROLE**: Data Access Object (DAO) & Abstraksi Spreadsheet.
- **FUNCTION**:
  - `ensureSchema_()`: Memvalidasi keberadaan sheet dan struktur header kolom; menyembunyikan sheet `PIN_ISSUANCE`.
  - `rows_(sheetName)`: Membaca seluruh data dari sheet tertentu dengan caching script cache.
  - `append_(sheetName, record)`: Menambahkan baris baru pada akhir sheet.
  - `upsert_(sheetName, key, record)`: Memperbarui baris jika primary key sudah ada, atau menambah baris baru jika belum ada.
  - `findOne_(sheetName, predicate)` & `findAll_(sheetName, predicate)`: Query in-memory sederhana.
  - `deleteWhere_(sheetName, predicate)`: Menghapus baris yang memenuhi kondisi tertentu.
  - `audit_(actor, action, entityType, entityId, detail)`: Mencatat jejak audit ke tabel `AUDIT_LOG`.
- **DEPENDENCY**: `Config.gs`.
- **MIGRATION NOTE**: Digantikan sepenuhnya oleh database driver SQL (misalnya `better-sqlite3` atau `pg` / Kysely / Prisma). Seluruh fungsi `findOne_`, `findAll_`, `upsert_` harus dikonversi menjadi SQL query (`SELECT`, `INSERT ... ON CONFLICT DO UPDATE`).

### 5. `gas/Services.gs`
- **ROLE**: Core Service Domain untuk Siswa, Guru, Diagnostik, Team Builder, dan Leaderboard.
- **FUNCTION**:
  - `loginStudent_` & `loginTeacher_`: Autentikasi dan pembuatan session token 8 jam.
  - `requireSession_(token, type)`: Middleware verifikasi token sesi aktif dan pengecekan status akun aktif siswa.
  - `diagnosticItemsForStudent_(studentId)`: Mengambil 5–9 butir diagnostik acak terdistribusi 5 domain dengan durasi 210 detik/soal.
  - `submitDiagnostic_(session, payload)`: Menyimpan jawaban Mission 0 siswa dengan penanganan timeout aman.
  - `buildProfile_(studentId, selfMapScore, speedSeconds)`: Menghitung skor rata-rata per domain, speed bonus (maks +0.25), leader index, dan status readiness (R1–R4).
  - `scoreDiagnosticResponse_(session, payload)`: Penilaian butir diagnostik oleh guru (skor 0–4).
  - `generateTeams_(teacherSession, classId, options)`: Algoritma Snake Draft + 2-Opt Balance untuk pembentukan tim laboratorium.
  - `publicLeaderboardData_(force)`: Menghitung skor gabungan siswa, lencana (*badges*), dan indikator integritas kelas (*integrityIndex*).
- **DEPENDENCY**: `Repository.gs`, `Security.gs`, `Config.gs`, `DiagnosticData.gs`.
- **MIGRATION NOTE**: Pindahkan seluruh business logic ini ke service layer Node.js (`src/services/coreService.js`). Jangan ubah formula matematika skor diagnostik, leader index, atau algoritma snake draft.

### 6. `gas/LearningServices.gs`
- **ROLE**: Learning Management Service (Materi, Rangkuman, Kuis, LKPD Praktik Tim).
- **FUNCTION**:
  - `unitState_(studentId, unit, index, units, context, teamContext)`: State machine penentu status kunci/buka setiap submateri.
  - `learningHome_` & `learningUnitForStudent_`: Mengambil jalur belajar dan detail isi submateri.
  - `submitSummaryForReview_`: Mengirim permintaan verifikasi rangkuman buku fisik siswa ke guru.
  - `saveTeacherChecks_`: Guru memverifikasi rangkuman (`summary`) atau LKPD (`practice`).
  - `startQuiz_` & `submitQuiz_`: Siklus kuis pemahaman (sampling deterministik LOTS/MOTS/HOTS, acak pilihan jawaban, penilaian otomatis KKM 70, speed bonus, penalti pindah tab).
  - `practiceWorkspace_` & `saveTeamPracticeReport_`: Pengisian draft dan pengiriman laporan praktikum kolaboratif tim oleh Leader/Deputy.
  - `saveGroupLab_`: Guru menilai laporan tim dan menyinkronkan bukti keterampilan ke tabel `SKILL_EVIDENCE`.
- **DEPENDENCY**: `Repository.gs`, `Security.gs`, `Config.gs`, `LearningData.gs`, `PracticeData.gs`.
- **MIGRATION NOTE**: Ini adalah jantung kurikulum Purwaverse. Seluruh state transition (kapan kuis terbuka, kapan LKPD tim terbuka) harus direplikasi persis di Node.js (`src/services/learningService.js`).

### 7. `gas/LearningData.gs`
- **ROLE**: Data Statis Kurikulum, Rangkuman, Anotasi SVG, dan Bank Soal Kuis.
- **FUNCTION**:
  - Mendefinisikan seluruh silabus Bab 1 s.d. Bab 6 (21 submateri).
  - Berisi konstanta `LEARNING_PATH_`, `SEMESTER_OUTLINE_`, `LEARNING_MATERIALS_`, `LEARNING_STANDARDS_`.
  - Berisi generator diagram SVG berlabel konsep `learningIllustration_(key)`.
  - `allQuizItems_()`: Bank soal kuis lengkap per submateri beserta kunci jawaban tersembunyi, level kognitif (LOTS/MOTS/HOTS), dan teks umpan balik spesifik.
- **DEPENDENCY**: Mandiri.
- **MIGRATION NOTE**: Pada Node.js, file ini dapat tetap berupa modul JavaScript statis (`src/data/learningData.js`) atau di-seed sebagian ke database SQL.

### 8. `gas/PracticeData.gs`
- **ROLE**: Data Statis Katalog LKPD Praktik & Panduan SOP Laboratorium.
- **FUNCTION**:
  - `PRACTICE_CATALOG_`: Menyimpan 16 instrumen LKPD lengkap (misi, konteks, alat & bahan, alternatif bahan dapur, prosedur, kriteria sukses, kolom tabel data).
  - `PRACTICE_GUIDE_`: SOP keselamatan kerja lab, matriks pembagian peran tim sains, dan contoh laporan sukses.
- **DEPENDENCY**: Mandiri.
- **MIGRATION NOTE**: Pindahkan sebagai modul statis di `src/data/practiceData.js`.

### 9. `gas/DiagnosticData.gs`
- **ROLE**: Bank Butir Diagnostik Resmi Mission 0 & Instrumen Pemetaan Minat.
- **FUNCTION**:
  - `OFFICIAL_DIAGNOSTIC_`: 25 butir soal narasi penalaran sains yang terbagi rata ke dalam 5 domain.
  - `OFFICIAL_SELF_MAP_`: Butir instrumen pemetaan disposisi dan minat sains siswa.
- **DEPENDENCY**: `Repository.gs`.
- **MIGRATION NOTE**: Pindahkan ke `src/data/diagnosticData.js` dan gunakan sebagai seed data ke tabel database `DIAGNOSTIC_ITEMS` dan `SELF_MAP_ITEMS`.

### 10. `gas/Seed.gs` & `gas/RosterData.gs`
- **ROLE**: Seeder Database & Manajemen Roster Siswa.
- **FUNCTION**:
  - `setupPurwaverse()`: Inisialisasi skema dan pengisian data awal master kelas, aktivitas, diagnostik, dan roster resmi.
  - `importOfficialStudents(records)`: Mengimpor roster 207 siswa resmi (Kelas 8A–8E), menghasilkan PIN acak unik 4-angka per kelas ke `PIN_ISSUANCE`, dan menyimpan hash PIN ke `MASTER_STUDENTS`.
- **DEPENDENCY**: `Repository.gs`, `Security.gs`, `Config.gs`, `RosterData.gs`.
- **MIGRATION NOTE**: Konversikan menjadi skrip migrasi/seeding CLI: `node src/scripts/seed.js`.

### 11. `gas/Tests.gs`
- **ROLE**: Suite Tes Integrasi Sistem Menyeluruh.
- **FUNCTION**:
  - `runIntegrationChecks()`: Memvalidasi 15+ kepatuhan sistem (integritas skema, integritas roster 207 siswa, determinisme kuis, validitas profil diagnostik, kelengkapan unit praktik).
- **DEPENDENCY**: Seluruh modul backend GAS.
- **MIGRATION NOTE**: Sangat berharga! Konversikan menjadi unit test & integration test modern menggunakan Jest, Vitest, atau Mocha pada backend Node.js untuk memvalidasi bahwa migrasi tidak merusak logic.

### 12. Frontend Files (`gas/Index.html`, `gas/Scripts.html`, `gas/Styles.html`, `gas/LearningScripts.html`, `gas/LearningStyles.html`)
- **ROLE**: Antarmuka Pengguna Klien (UI/UX).
- **FUNCTION**:
  - Mengelola rendering UI siswa dan guru, state management lokal, pemutakhiran tampilan timer, detektor kecurangan (pindah tab & honeypot keywords), interaksi kuis, dan pengisian form LKPD.
- **DEPENDENCY**: Memanggil endpoint backend melalui `callApi(action, payload)`.
- **MIGRATION NOTE**: **Tidak perlu dirombak total.** Cukup disajikan sebagai file statis oleh Nginx atau Express (`express.static('public')`). Klien hanya perlu mengarahkan endpoint `callApi` ke URL backend lokal VPS (`/api/purwa`).

### 13. Build & Proxy Files (`scripts/build-web.js` & `api/purwa.js`)
- **ROLE**: Skrip Bundling Klien & Serverless Proxy Vercel.
- **FUNCTION**:
  - `scripts/build-web.js`: Menyatukan file HTML/CSS/JS di `gas/` menjadi `public/index.html` dengan menyuntikkan data kurikulum statis.
  - `api/purwa.js`: Proxy Vercel yang meneruskan panggilan ke GAS.
- **MIGRATION NOTE**: Pada arsitektur VPS mandiri, `api/purwa.js` dibuang dan digantikan langsung oleh router Express.js. `scripts/build-web.js` tetap digunakan untuk membangun bundel `public/index.html`.

---

## BAGIAN 4: DATABASE & DATA OWNERSHIP

Berikut adalah spesifikasi 15 tabel utama beserta primary key, fungsi, hak akses baca/tulis, risiko perubahan, dan stabilitas ID.

| Nama Tabel / Sheet | Primary Key | Fungsi Utama | Reader | Writer | Risiko Jika Struktur Berubah |
|---|---|---|---|---|---|
| `MASTER_CLASSES` | `class_id` (e.g. `'8A'`) | Menyimpan data rombel kelas resmi dan status aktif | Publik / Siswa / Guru | Admin / Seeder | **Tinggi**: Putusnya relasi kelas dengan siswa dan tim laboratorium. |
| `MASTER_STUDENTS` | `student_id` (UUID/hash stabil) | Roster siswa, identitas NIS/NISN, nomor absen, dan hash PIN | Guru / Sistem (Publik hanya nama/absen) | Admin / Seeder | **Kritis**: Siswa tidak bisa login; progres belajar terputus. ID tidak boleh berubah. |
| `MASTER_ACTIVITIES` | `activity_id` (e.g. `'CH08-01-U01-LRN01'`) | Definisi master aktivitas (materi, kuis, praktik, tantangan) | Publik / Siswa / Guru | Admin / Seeder | **Kritis**: State machine kurikulum rusak jika ID aktivitas berubah format. |
| `PROGRESS` | `progress_id` (`student_id\|activity_id`) | Status ketuntasan aktivitas dan skor dasar siswa | Siswa (milik sendiri) / Guru | Siswa (draft/submit) / Guru / Sistem | **Tinggi**: Kehilangan rekam jejak progres siswa di leaderboard dan dashboard. |
| `DIAGNOSTIC_ITEMS` | `item_id` (e.g. `'D01'`) | Bank 25 butir soal narasi penalaran sains Mission 0 | Siswa (tanpa rubrik) / Guru | Admin / Seeder | **Tinggi**: Butir soal Mission 0 tidak muncul atau rubrik penilaian guru hilang. |
| `SELF_MAP_ITEMS` | `item_id` (e.g. `'SM01'`) | Butir angket disposisi dan minat belajar sains | Siswa / Guru | Admin / Seeder | **Rendah**: Pemetaan minat sains siswa gagal dihitung. |
| `SESSIONS` | `session_id` (SHA-256 token) | Penyimpanan sesi aktif token siswa dan guru (TTL 8 jam) | Sistem Auth | Sistem Auth (`login`, `logout`) | **Sedang**: Seluruh pengguna ter-logout paksa jika skema sesi diubah. |
| `DIAGNOSTIC_RESPONSES`| `response_id` (`student_id\|item_id`) | Menyimpan teks jawaban siswa dan skor penilaian guru (0–4) | Siswa (milik sendiri) / Guru | Siswa (submit jawaban) / Guru (menilai) | **Kritis**: Kehilangan data jawaban penalaran siswa; kalkulasi profil tim gagal. |
| `DIAGNOSTIC_PROFILES` | `profile_id` (`student_id`) | Nilai agregat 5 domain, overall reasoning, leader index, readiness | Siswa (milik sendiri) / Guru | Sistem (`buildProfile_`) | **Kritis**: Dasar pembentukan tim laboratorium (Snake Draft) menjadi lumpuh. |
| `TEAMS` | `team_id` (`8A-T01-V{timestamp}`) | Header kelompok laboratorium per kelas dan versi draft/final | Guru / Siswa (anggota tim) | Guru (`generateTeams`) | **Kritis**: Kelompok sains bubar, riwayat LKPD kehilangan relasi. |
| `TEAM_MEMBERS` | `membership_id` (`team_id\|student_id`)| Anggota tim, jabatan (*Leader/Deputy/Member*), status lock | Guru / Siswa (anggota tim) | Guru (override) / Sistem | **Kritis**: Kerusakan hak akses pengisian laporan praktikum tim. |
| `PIN_ISSUANCE` | `student_id` | Arsip PIN mentah untuk cetak kartu akun (Sangat Rahasia) | Guru / Admin Cetak | Seeder / Admin | **Kritis**: Kebocoran PIN siswa jika terekspos ke klien. Sheet wajib privat. |
| `GROUP_LAB` | `lab_result_id` (`team_id\|activity_id`)| Laporan LKPD tim (JSON 11 bagian), status, nilai, revisi | Guru / Siswa (anggota tim) | Leader / Deputy (laporan) / Guru (nilai) | **Kritis**: Hilangnya hasil riset kelompok dan riwayat revisi praktikum. |
| `STUDENT_ACTIVITY_STATE`| `state_id` (`student_id\|activity_id`)| Cache status penguncian jalur belajar per siswa | Siswa / Guru | Sistem Learning | **Sedang**: Performa melambat karena status harus dihitung ulang secara dinamis. |
| `TEACHER_CHECKS` | `check_id` (`CHK-{uuid}`) | Riwayat append-only pemeriksaan rangkuman dan LKPD guru | Guru / Siswa (milik sendiri) | Guru (pemeriksaan) / Siswa (lapor) | **Kritis**: Hilangnya validasi kelayakan kuis; revision history terhapus. |
| `QUIZ_ITEMS` | `quiz_item_id` | Bank soal kuis per materi (kunci jawaban, opsi, umpan balik) | Server Kuis (Kunci haram terekspos) | Admin / Seeder | **Kritis**: Kunci jawaban bocor ke browser jika dipaparkan lewat API. |
| `QUIZ_ATTEMPTS` | `attempt_id` (`QAT-{uuid}`) | Percobaan kuis siswa, riwayat nilai, status tuntas KKM | Siswa (milik sendiri) / Guru | Sistem Kuis (`submitQuiz`) | **Kritis**: Hilangnya nilai kuis dan riwayat kelulusan submateri. |
| `QUIZ_RESPONSES` | `response_id` (`attempt_id\|item_id`) | Log jawaban per butir kuis per percobaan | Siswa (milik sendiri) / Guru | Sistem Kuis | **Sedang**: Analisis butir soal salah/benar per siswa hilang. |
| `SKILL_EVIDENCE` | `evidence_id` (`student_id\|activity_id\|skill`)| Rekam jejak capaian keterampilan sains individu/tim | Guru / Siswa | Guru / Sistem (`saveGroupLab`) | **Tinggi**: Hilangnya riwayat kompetensi sains untuk rapor/kartu semester. |
| `UNLOCK_OVERRIDES` | `override_id` (`OVR-{uuid}`) | Catatan dispensasi pembukaan materi oleh guru dengan alasan | Guru / Siswa | Guru | **Sedang**: Siswa dispensasi kembali terkunci materinya. |
| `ATTENDANCE` | `attendance_id` (`student_id\|YYYY-MM-DD`)| Rekam kehadiran otomatis saat siswa login di hari KBM | Guru | Sistem Login Siswa | **Rendah**: Hilangnya presensi harian berbasis aplikasi. |
| `AUDIT_LOG` | `event_id` (`EVT-{uuid}`) | Log audit forensik peristiwa sensitif sistem | Administrator | Seluruh fungsi mutasi backend | **Tinggi**: Hilangnya jejak investigasi kecurangan atau perubahan data. |

### IDENTITAS YANG WAJIB STABIL
1. `student_id`: Merupakan identifier permanen (format: `STD-{hash}` atau `TST-8A-01`). Tidak boleh berubah saat siswa naik kelas atau ada koreksi nama/NIS.
2. `activity_id`: Format kode aktivitas (contoh: `CH08-01-U01-LRN01`, `CH08-01-U01-QZ01`, `CH08-01-U02-LAB01`). Menjadi acuan regex logika frontend dan state machine backend.
3. `class_id`: String pendek (`8A`, `8B`, `8C`, `8D`, `8E`).
4. `unit_id`: Format unit kurikulum (contoh: `CH08-01-U01`, `CH08-02-U03`).

### KLASIFIKASI PRIVASI DATA
- **Data Publik**: Daftar kelas, silabus materi, glosarium, leaderboard anonim/nama siswa dengan skor game.
- **Data Privat Siswa**: Teks jawaban diagnostik, riwayat kuis, catatan rangkuman, sinyal kebingungan (`confusion_signal`).
- **Data Sangat Rahasia (Confidential)**: Hash PIN siswa, Salt & Hash Password Guru, Isi sheet `PIN_ISSUANCE`, Kunci Jawaban Kuis (`answer_json`).

---

## BAGIAN 5: AUTHENTICATION & SECURITY

### PROSES LOGIN SISWA
1. Siswa memilih kelas (`classId`), nomor absen (`rollNo`), dan memasukkan 4-digit PIN (`pin`).
2. Server memeriksa rate limiter: identitas login `student|<classId>|<rollNo>` dibatasi maksimal 5 kali gagal berturut-turut dalam 300 detik.
3. Server mencari siswa di `MASTER_STUDENTS` dengan kriteria `class_id == classId`, `roll_no == rollNo`, dan `active == true`.
4. Server memverifikasi PIN melalui fungsi `verifyStudentPin_`:
   - Menghitung hash kandidat: `hash_(STUDENT_PIN_PEPPER + '|' + pin)`.
   - Mencocokkan dengan `student.pin_hash`.
   - Jika tidak cocok, periksa fallback backward compatibility: `hash_(pin)` (untuk data sebelum migrasi pepper).
5. Jika valid, server merekam presensi harian di tabel `ATTENDANCE` (`attendance_id = student_id + '|' + YYYY-MM-DD`).
6. Server membuat sesi baru di tabel `SESSIONS` dengan token acak UUID (`uid_('SES')`), mencatat `session_id = hash_(token)`, `actor_type = 'student'`, dan masa berlaku `expires_at = now + 8 jam`.

### PROSES LOGIN GURU
1. Guru memasukkan nama pengguna (`username`) dan kata sandi (`password`).
2. Server memeriksa rate limiter guru: identitas login `teacher|<username>`.
3. Server membaca konfigurasi kredensial dari Script Properties / Environment: `TEACHER_USERNAME`, `TEACHER_PASSWORD_SALT`, `TEACHER_PASSWORD_HASH`, dan `TEACHER_CLASSES`.
4. Server memvalidasi:
   - `username.toLowerCase() === TEACHER_USERNAME.toLowerCase()`
   - `hash_(TEACHER_PASSWORD_SALT + '|' + password) === TEACHER_PASSWORD_HASH`
5. Jika valid, server membuat sesi guru di `SESSIONS` dengan `actor_type = 'teacher'`, `actor_id = 'TEACHER-' + hash(username).slice(0,12)`, dan hak akses kelas `class_id = TEACHER_CLASSES` (bisa berupa daftar kelas `8A,8B,...` atau wildcard `*`).

### ARSITEKTUR SESI & OTORISASI PERAN
- Klien menyimpan token di `localStorage` (`purwa_session_token_v1` untuk siswa atau `purwa_teacher_token_v1` untuk guru).
- Setiap request API yang membutuhkan autentikasi mengirimkan token di dalam objek `payload.token`.
- Server memverifikasi token melalui fungsi `requireSession_(token, expectedType)`:
  - Mengambil hash token.
  - Memeriksa apakah sesi ada di tabel `SESSIONS` dan belum kedaluwarsa (`expires_at > now`).
  - Memeriksa apakah `session.actor_type === expectedType`.
  - Jika siswa, memeriksa apakah akun siswa berstatus aktif di `MASTER_STUDENTS`.

### BAGIAN YANG WAJIB DIPERKUAT SAAT PINDAH KE VPS
1. **Hashing Password & PIN**:
   - Ganti SHA-256 + Pepper sederhana dengan algoritma hashing adaptif industri: **Argon2id** atau **Bcrypt** (cost factor 10–12).
2. **Session Storage**:
   - Daripada menaruh session token di Spreadsheet yang lambat, gunakan session store cepat: **SQLite table terindeks** atau **Redis**, atau gunakan **JWT (JSON Web Token)** bertandatangan digital HMAC-SHA256 / EdDSA yang disimpan di **HttpOnly, Secure, SameSite=Strict Cookie** untuk mencegah pencurian token melalui serangan XSS.
3. **Penyimpanan Secret Environment**:
   - Pindahkan seluruh konfigurasi sensitif (`STUDENT_PIN_PEPPER`, `TEACHER_PASSWORD_SALT`, `JWT_SECRET`, `ADMIN_SECRET`) ke file `.env` di luar direktori publik web server dengan permission `chmod 600`.
4. **Anti-Brute Force Middleware**:
   - Terapkan rate limiter level reverse-proxy di Nginx (`limit_req_zone`) serta di middleware Express (`express-rate-limit`) untuk melindungi endpoint autentikasi.

---

## BAGIAN 6: BUSINESS LOGIC & CORE ALGORITHMS

### 1. STUDENT GATE FLOW (ALUR KELAYAKAN BELAJAR)
Purwaverse menggunakan finite state machine yang sangat ketat untuk mengendalikan pembelajaran:
```
[Unit Dimulai: Status 'reading']
         │
         ▼
[Siswa Menyusun Rangkuman Buku Tulis]
         │
         ▼
[Klik "Saya Sudah Merangkum" -> Status 'pending_review']
         │
         ▼
[Guru Memeriksa Buku Fisik -> Status 'verified']
         │
         ▼
[Quick Quiz Terbuka: Status 'quiz_ready']
         │
         ▼
[Siswa Mengerjakan Kuis & Memperoleh Nilai >= 70]
         │
         ├── BELUM LULUS (Nilai < 70) ──► Mengulang Kuis (Attempt Baru)
         └── LULUS (Nilai >= 70)
                 │
                 ▼
[Materi Selesai (materiSelesai = true)]
                 │
                 ▼
[Evaluasi Tim Laboratorium]
Semua anggota tim tuntas rangkuman & kuis unit ini?
         ├── BELUM ──► LKPD Praktik Terkunci ('laggingMembers' dimunculkan)
         └── SUDAH ──► LKPD Terbuka ('practice_ready')
                           │
                           ▼
[Pengerjaan Laporan Praktik Tim (Group Lab)]
                           │
                           ▼
[Leader / Deputy Submit Laporan -> Status 'submitted']
                           │
                           ▼
[Guru Memeriksa LKPD & Beri Nilai -> Status 'verified']
                           │
                           ▼
[Unit Tuntas Sempurna: Status 'completed']
                           │
                           ▼
[Submateri Berikutnya Terbuka Otomatis]
```

### 2. MISSION 0 (QUICK DIAGNOSTIC)
- **Tujuan**: Mengukur 5 domain penalaran ilmiah awal siswa:
  1. `observe_infer` (Observasi & Inferensi)
  2. `evidence_experiment` (Bukti & Eksperimen)
  3. `model_concept` (Model & Konsep)
  4. `systems_causality` (Sistem & Kausalitas)
  5. `technology_design` (Teknologi & Rancangan Solusi)
- **Input & Randomisasi**:
  - Jumlah butir: 5 hingga 9 butir acak per sesi.
  - Penentuan jumlah butir per siswa dihitung secara deterministik:
    `targetCount = 5 + (hash(studentId + '|diag_count|v4') % 5)`.
  - Komposisi: Wajib mengambil minimal 1 butir dari masing-masing 5 domain utama (`CONFIG.DOMAINS`). Jika `targetCount > 5`, sisa butir diambil secara acak dari bank butir yang tersisa.
  - Urutan tampil diacak penuh menggunakan `stableShuffle_`.
- **Timer & Auto-Submit**:
  - Durasi dialokasikan **210 detik (3.5 menit) per butir**. Total waktu: `items.length * 210` detik.
  - Jika waktu habis (*timeout*), form diagnostik otomatis terkirim tanpa tertahan atau error; butir yang belum sempat diisi otomatis diisi teks `[Waktu habis - belum sempat dijawab]`.
- **Penilaian Guru**: Guru memberikan skor integer 0 hingga 4 untuk setiap butir berdasarkan rubrik analitis resmi.
- **Kalkulasi Profil (`buildProfile_`)**:
  - Rata-rata skor per domain: $DomainScore_d = \frac{\sum Scores_d}{N_d}$.
  - Skor dasar penalaran: $BaseOverall = \frac{\sum_{d=1}^5 DomainScore_d}{5}$.
  - Bonus kecepatan (*Speed Bonus*): Sisa waktu menghasilkan efisiensi hingga +0.25 poin:
    $SpeedBonus = \min(0.25, \text{round}_2(\frac{SpeedSeconds}{1200} \times 0.25))$.
  - Skor keseluruhan: $OverallReasoning = \min(4.0, BaseOverall + SpeedBonus)$.
  - Minat sains (*Self Map Score*): Dinormalisasi ke skala 0–4: $SelfMap = \max(0, \min(4, RawScore - 1))$.
  - **Leader Index**:
    $$\mathbf{LeaderIndex = 0.75 \times OverallReasoning + 0.25 \times SelfMap}$$
  - Indeks Kesiapan Riset (*Research Readiness*):
    $ResearchIndex = \frac{Score_{evidence} + Score_{systems} + Score_{tech}}{3}$
    - $R4 \ge 3.25$ (Sangat Mandiri)
    - $R3 \ge 2.50$ (Mandiri)
    - $R2 \ge 1.50$ (Berkembang)
    - $R1 < 1.50$ (Perlu Bimbingan)

### 3. SCIENCE TEAM BUILDER ALGORITHM
- **Syarat Awal**: Minimal ada 8 siswa di kelas yang telah memiliki profil diagnostik lengkap (`DIAGNOSTIC_PROFILES`).
- **Langkah 1: Seleksi Leader**:
  - Siswa yang telah dinilai diurutkan berdasarkan `leader_index` tertinggi.
  - 8 siswa teratas otomatis ditetapkan sebagai calon **Scientist Leader** untuk Tim 1 s.d. Tim 8.
- **Langkah 2: Snake Draft (Distribusi Heterogen)**:
  - Sisa siswa yang bukan leader diurutkan berdasarkan `overall_reasoning` dari yang tertinggi ke terendah.
  - Didistribusikan ke dalam 8 tim menggunakan pola ular (*Snake Draft*):
    - Ronde 0: Tim 1 ke Tim 8
    - Ronde 1: Tim 8 ke Tim 1
    - Ronde 2: Tim 1 ke Tim 8, dan seterusnya.
- **Langkah 3: Optimasi 2-Opt Balance (`improveTeamBalance_`)**:
  - Dihitung fungsi objektif ketimpangan kelompok:
    $Obj = Spread_{overall} \times 2 + \frac{\sum_{d=1}^5 Spread_d}{5}$
  - Dilakukan penukaran pasangan anggota antar tim (*swap 2-opt*) selama 3 iterasi jika pertukaran tersebut menghasilkan nilai objektif ketimpangan yang lebih kecil secara signifikan.
- **Langkah 4: Skor Keseimbangan Tim**:
  $BalanceScore = \max(0, 100 - (\frac{\max(Means) - \min(Means)}{4} \times 100))$.
- **Langkah 5: Penetapan Peran Anggota**:
  - Indeks 0: `Scientist Leader`
  - Anggota dengan `leader_index` tertinggi berikutnya di tim: `Deputy Scientist Leader`
  - Sisa anggota: Dibagikan peran siklis: `Lab Operator`, `Data Recorder`, `Evidence Checker`, `Communicator`.
- **Lock & Override**: Guru dapat mengunci anggota tertentu (`locked: true`), mengubah perannya, atau memindahkan anggota secara manual dengan catatan supervisi (`override_note`).

### 4. QUIZ ENGINE (LOTS/MOTS/HOTS & ANTI-CHEAT)
- **Dynamic Sampling Deterministik**:
  - Kuis mengambil 5 hingga 8 butir soal secara proporsional dari bank soal per submateri.
  - Mengelompokkan soal berdasarkan tingkat kognitif: `LOTS`, `MOTS`, `HOTS`.
  - Komposisi penarikan seimbang (minimal 2 LOTS, 2 MOTS, 1-2 HOTS).
  - Deterministik: Siswa yang sama pada nomor percobaan (*attempt*) yang sama akan selalu menerima himpunan soal dan urutan yang sama persis: seed = `studentId|attemptNumber|activityId`.
- **Pengacakan Pilihan Jawaban (Deterministic Option Scramble)**:
  - Urutan opsi jawaban (A, B, C, D) diacak menggunakan seed: `studentId|attemptNumber|quiz_item_id|options`.
  - Kunci jawaban asli (`answer_json`) **TIDAK PERNAH DIKIRIMKAN KE BROWSER**. Klien hanya menerima array string teks opsi.
- **Scoring & Integrity Engine**:
  - Skor Mentah: $RawScore = \text{round}(\frac{\sum EarnedPoints}{\sum MaxPoints} \times 100)$.
  - Syarat Lulus: $RawScore \ge 70$.
  - Bonus Kecepatan Kuis: Jika lulus dan masih ada sisa waktu, mendapat bonus hingga +10 poin:
    $SpeedBonus = \min(10, \text{round}(\frac{TimeRemaining}{TotalTime} \times 10 \times \frac{RawScore}{100}))$.
  - Penalti Pindah Tab (*Tab Switch Penalty*):
    Toleransi pindah tab = $\lfloor \frac{N_{soal}}{2} \rfloor$. Jika siswa berpindah tab melebihi batas toleransi, skor dipotong penalti sebesar **20%**: $Penalty = \text{round}(RawScore \times 0.20)$.
  - Skor Akhir: $FinalScore = \max(0, \min(100, RawScore + SpeedBonus - Penalty))$.

---

## BAGIAN 7: API CONTRACT

Berikut adalah dokumentasi lengkap 36 endpoint JSON RPC yang wajib diimplementasikan 1:1 di backend Node.js. Format request selalu `POST /api/purwa` dengan body `{ "action": "namaAksi", "payload": { ... } }`.

```
Format Standar Response Sukses:
{
  "ok": true,
  "data": { ... }
}

Format Standar Response Error:
{
  "ok": false,
  "error": "Pesan error dalam Bahasa Indonesia"
}
```

---

### KELOMPOK 1: PUBLIC & BOOTSTRAP

#### 1. `bootstrap`
- **INPUT**: `{}`
- **PROCESS**: Mengambil metadata aplikasi, status kesiapan, semester aktif, ambang KKM kuis, nomor WA guru, daftar kelas aktif dari `MASTER_CLASSES`, aktivitas publik dari `MASTER_ACTIVITIES`, dan daftar glosarium terindeks.
- **OUTPUT**:
  ```json
  {
    "appName": "Purwaverse IPA VIII",
    "mode": "PRODUCTION",
    "sourceStatus": "READY",
    "currentSemester": 1,
    "quizPassingScore": 70,
    "teacherWaNumber": "085721215213",
    "classes": [{ "class_id": "8A", "class_name": "Kelas 8A", "active": true }],
    "activities": [{ "activity_id": "CH08-01-U01-LRN01", "title": "Sel sebagai Unit Kehidupan" }],
    "glossary": [["Organel", "Struktur khusus di dalam sel yang menjalankan fungsi tertentu"]]
  }
  ```
- **ERROR**: Database connection failure.

#### 2. `publicLeaderboard`
- **INPUT**: `{ "force": false }`
- **PROCESS**: Mengagregasi data siswa aktif, menghitung misi tuntas, skor mentah, lencana prestasi, mendeteksi flag anomali (pindah tab > 5x / kata kunci AI honeypot), dan menghitung persentase integritas kelas.
- **OUTPUT**:
  ```json
  {
    "updatedAt": "18 Sep 2026, 23:30",
    "totalStudents": 207,
    "integrityIndex": [
      { "classId": "8A", "percent": 98, "completionPercent": 45, "totalSubmissions": 120, "flaggedCount": 2 }
    ],
    "topTen": [
      { "rank": 1, "studentId": "STD-01", "name": "Ahmad", "classId": "8A", "netScore": 4200, "badges": [{ "icon": "💎", "name": "Diamond Mind" }] }
    ],
    "roster": [ ... ]
  }
  ```
- **ERROR**: Gagal memuat data progress atau roster siswa.

---

### KELOMPOK 2: AUTHENTICATION

#### 3. `loginStudent`
- **INPUT**: `{ "classId": "8A", "rollNo": 1, "pin": "1234" }`
- **PROCESS**: Validasi rate limiter -> verifikasi PIN terhadap `student.pin_hash` (dengan pepper dan legacy fallback) -> rekam presensi hari ini di `ATTENDANCE` -> terbitkan token sesi baru berdurasi 8 jam di `SESSIONS`.
- **OUTPUT**:
  ```json
  {
    "token": "SES-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "actorType": "student",
    "actorId": "STD-8A-01",
    "classId": "8A",
    "expiresAt": "2026-09-19T07:30:00.000Z"
  }
  ```
- **ERROR**: `"Kelas, nomor absen, atau PIN tidak sesuai."` / `"Terlalu banyak percobaan masuk. Coba kembali beberapa menit lagi."`

#### 4. `loginTeacher`
- **INPUT**: `{ "username": "guru", "password": "Password10Char" }`
- **PROCESS**: Validasi rate limiter -> verifikasi terhadap `TEACHER_PASSWORD_HASH` dengan `TEACHER_PASSWORD_SALT` -> terbitkan sesi guru 8 jam.
- **OUTPUT**:
  ```json
  {
    "token": "SES-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "actorType": "teacher",
    "actorId": "TEACHER-xxxxxxxxxxxx",
    "classId": "8A,8B,8C,8D,8E",
    "expiresAt": "2026-09-19T07:30:00.000Z"
  }
  ```
- **ERROR**: `"Login guru tidak sesuai."`

#### 5. `logout`
- **INPUT**: `{ "token": "SES-..." }`
- **PROCESS**: Mencari session berdasarkan hash token -> menetapkan `expires_at` ke waktu sekarang (invalidasi langsung) -> catat log audit.
- **OUTPUT**: `{ "loggedOut": true }`
- **ERROR**: Tidak ada (idempoten).

---

### KELOMPOK 3: STUDENT DASHBOARD & LEARNING

#### 6. `studentHome`
- **INPUT**: `{ "token": "SES-..." }`
- **PROCESS**: Memverifikasi sesi siswa -> mengambil profil siswa, seluruh riwayat progres di `PROGRESS`, percobaan kuis di `QUIZ_ATTEMPTS`, profil diagnostik di `DIAGNOSTIC_PROFILES`, dan informasi tim kelompok beserta progres rekan tim.
- **OUTPUT**:
  ```json
  {
    "session": { "actor_id": "STD-8A-01", "class_id": "8A" },
    "student": { "student_id": "STD-8A-01", "name": "Ahmad", "class_id": "8A", "roll_no": 1 },
    "progress": [{ "activity_id": "CH08-01-U01-LRN01", "status": "completed", "score": 100 }],
    "profile": { "overall_reasoning": 3.8, "leader_index": 3.75, "research_readiness": "R4" },
    "team": { "teamId": "8A-T01-V1", "role": "Scientist Leader", "members": [ ... ] }
  }
  ```
- **ERROR**: Sesi tidak valid atau akun dinonaktifkan.

#### 7. `refreshStudentTeam`
- **INPUT**: `{ "token": "SES-..." }`
- **PROCESS**: Mengambil status termutakhir dari tim siswa, progres rangkuman/kuis tiap anggota, dan kesenjangan submateri tim.
- **OUTPUT**: `{ "team": { "teamId": "...", "members": [ ... ] } }`
- **ERROR**: Sesi siswa tidak valid.

#### 8. `learningHome`
- **INPUT**: `{ "token": "SES-..." }`
- **PROCESS**: Mengevaluasi status setiap bab dan submateri (21 unit) untuk siswa terkait (apakah `reading`, `pending_review`, `quiz_ready`, `practice_ready`, atau `completed`), ringkasan kartu semester, dan progres tim.
- **OUTPUT**:
  ```json
  {
    "chapters": [
      {
        "chapter_id": "CH08-01",
        "title": "Bab 1: Pengenalan Sel",
        "units": [
          {
            "unit_id": "CH08-01-U01",
            "title": "Sel sebagai Unit Kehidupan",
            "state": {
              "contentUnlocked": true,
              "summaryVerified": true,
              "quizPassed": true,
              "practiceUnlocked": true,
              "learningStatus": "completed"
            }
          }
        ]
      }
    ],
    "outline": [ ... ],
    "semesterCard": { "eligible": false, "details": [ ... ] }
  }
  ```
- **ERROR**: Sesi siswa tidak valid.

#### 9. `learningUnit`
- **INPUT**: `{ "token": "SES-...", "unitId": "CH08-01-U01" }`
- **PROCESS**: Mengambil detail bacaan submateri, diagram ilustrasi SVG, pratinjau LKPD, sinyal kebingungan yang pernah disimpan siswa, dan status kunci unit.
- **OUTPUT**: Objek unit lengkap beserta field `illustration_svg`, `practice_preview`, `confusion_signal`, dan `state`.
- **ERROR**: `"Submateri masih terkunci. Selesaikan tahap sebelumnya."`

#### 10. `submitSummaryForReview`
- **INPUT**: `{ "token": "SES-...", "unitId": "CH08-01-U01" }`
- **PROCESS**: Memeriksa apakah submateri sudah terbuka -> mengecek apakah sudah ada pemeriksaan pending atau verified -> jika belum, buat baris baru di `TEACHER_CHECKS` dengan `check_type = 'summary'`, `status = 'pending_review'`, `note = 'Siswa melaporkan rangkuman di buku siap diperiksa.'`.
- **OUTPUT**: `{ "status": "pending_review", "alreadySubmitted": false, "submittedAt": "2026-09-18T..." }`
- **ERROR**: `"Submateri masih terkunci."`

#### 11. `saveConfusionSignal`
- **INPUT**: `{ "token": "SES-...", "unitId": "CH08-01-U01", "category": "concept" }`
- **PROCESS**: Kategori wajib salah satu dari: `concept`, `term`, `calculation`, `practice`, `clear`. Disimpan di `SETTINGS` dengan key `confusion|<studentId>|<unitId>`.
- **OUTPUT**: `{ "category": "concept", "updatedAt": "2026-09-18T..." }`
- **ERROR**: `"Pilihan kesulitan tidak valid."`

---

### KELOMPOK 4: MISSION 0 & DIAGNOSTIC

#### 12. `diagnosticItems`
- **INPUT**: `{ "token": "SES-..." }`
- **PROCESS**: Mengambil atau membangkitkan 5–9 butir soal acak terdistribusi deterministik per siswa (menghapus rubrik penskoran agar tidak bocor) dan menghitung durasi waktu (`items.length * 210` detik).
- **OUTPUT**: `{ "items": [ ... ], "durationSeconds": 1050, "totalCount": 5 }`
- **ERROR**: Bank soal diagnostik belum dimuat.

#### 13. `selfMapItems`
- **INPUT**: `{ "token": "SES-..." }`
- **PROCESS**: Mengambil daftar butir instrumen minat/disposisi sains aktif.
- **OUTPUT**: Array of items dari `SELF_MAP_ITEMS`.
- **ERROR**: Sesi tidak valid.

#### 14. `submitDiagnostic`
- **INPUT**:
  ```json
  {
    "token": "SES-...",
    "responses": [{ "itemId": "D01", "answer": "Teks jawaban siswa..." }],
    "remainingSeconds": 340,
    "selfMapScore": 3.8,
    "isTimeout": false
  }
  ```
- **PROCESS**: Memvalidasi kelengkapan jawaban (jika `isTimeout == true`, jawaban kosong ditoleransi dengan teks default) -> menyimpan ke `DIAGNOSTIC_RESPONSES` -> menyimpan data kecepatan dan self map ke `SETTINGS` -> mencatat status aktivitas `M0-QUICK` menjadi `submitted` di `PROGRESS`.
- **OUTPUT**: `{ "submitted": true, "scored": false, "speedBonusSeconds": 340 }`
- **ERROR**: Jawaban belum lengkap dan bukan dalam kondisi timeout.

#### 15. `diagnosticReview` (Teacher)
- **INPUT**: `{ "token": "SES-...", "classId": "8A" }`
- **PROCESS**: Otorisasi guru -> mengambil daftar seluruh siswa di kelas target beserta jawaban Mission 0 mereka, prompt soal, dan rubrik pedoman penskoran resmi.
- **OUTPUT**: Array siswa beserta array responses dan rubriknya.
- **ERROR**: Akses kelas ditolak.

#### 16. `scoreDiagnostic` (Teacher)
- **INPUT**: `{ "token": "SES-...", "studentId": "STD-8A-01", "itemId": "D01", "score": 3 }`
- **PROCESS**: Memvalidasi skor (harus integer 0–4) -> memperbarui skor butir di `DIAGNOSTIC_RESPONSES` -> mengecek apakah seluruh butir siswa sudah dinilai lengkap ($\ge 5$ butir) -> jika lengkap, picu kalkulasi `buildProfile_` dan mutasi status `M0-QUICK` di `PROGRESS` menjadi `completed`.
- **OUTPUT**: `{ "profile": { ... }, "scored": 5, "expected": 5, "complete": true }`
- **ERROR**: `"Skor harus bilangan 0-4."`

#### 17. `resetStudentDiagnostic` (Teacher)
- **INPUT**: `{ "token": "SES-...", "classId": "8A", "studentId": "STD-8A-01" }`
- **PROCESS**: Menghapus seluruh rekaman jawaban, profil kalkulasi, progres M0, dan cache setting sesi diagnostik siswa terkait untuk memungkinkan pengujian ulang.
- **OUTPUT**: `{ "reset": true, "studentId": "STD-8A-01" }`
- **ERROR**: Siswa tidak ditemukan atau akses kelas ditolak.

---

### KELOMPOK 5: QUIZ ENGINE

#### 18. `startQuiz`
- **INPUT**: `{ "token": "SES-...", "activityId": "CH08-01-U01-QZ01" }`
- **PROCESS**: Verifikasi bahwa rangkuman unit telah berstatus `verified` oleh guru (atau ada override) -> buat / lanjutkan rekaman `QUIZ_ATTEMPTS` -> lakukan sampling deterministik 5–8 soal kognitif (LOTS/MOTS/HOTS) -> acak opsi jawaban deterministik -> hitung limit waktu (`items.length * 90` detik) dan batas toleransi pindah tab.
- **OUTPUT**:
  ```json
  {
    "attemptId": "QAT-xxxxxxxx-xxxx",
    "attemptNumber": 1,
    "items": [
      {
        "quiz_item_id": "CH08-01-U01-QZ01-01",
        "prompt": "Bagian sel yang berfungsi mengatur...",
        "level": "LOTS",
        "options": ["Nukleus", "Mitokondria", "Ribosom", "Vakuola"]
      }
    ],
    "timeLimitSeconds": 450,
    "tabTolerance": 2
  }
  ```
- **ERROR**: `"Kuis terbuka setelah rangkuman diperiksa guru."`

#### 19. `submitQuiz`
- **INPUT**:
  ```json
  {
    "token": "SES-...",
    "attemptId": "QAT-...",
    "answers": [{ "itemId": "CH08-01-U01-QZ01-01", "answer": 0 }],
    "timeRemaining": 120,
    "tabSwitchCount": 1,
    "forcedLocked": false
  }
  ```
- **PROCESS**: Mengambil data attempt -> mengambil kembali susunan sampling soal dan pengacakan opsi pada attempt tersebut -> mencocokkan jawaban terhadap kunci rahasia -> mencatat ke `QUIZ_RESPONSES` -> hitung skor mentah, speed bonus, dan tab penalty -> simpan skor akhir dan status `passed` ($\ge 70$) di `QUIZ_ATTEMPTS` -> jika ada jawaban salah, siapkan daftar telaah konsep `reviewItems`.
- **OUTPUT**:
  ```json
  {
    "score": 85,
    "rawScore": 80,
    "speedBonus": 5,
    "penalty": 0,
    "passed": true,
    "passingScore": 70,
    "reviewItems": [
      { "itemId": "...", "prompt": "...", "feedback": "Tinjau kembali perbedaan sel hewan dan tumbuhan..." }
    ]
  }
  ```
- **ERROR**: `"Semua soal kuis perlu dijawab."` / Attempt sudah pernah disubmit sebelumnya.

---

### KELOMPOK 6: SCIENCE TEAMS & LKPD PRAKTIK TIM

#### 20. `generateTeams` (Teacher)
- **INPUT**: `{ "token": "SES-...", "classId": "8A", "options": { "teamCount": 8 } }`
- **PROCESS**: Verifikasi bahwa minimal 8 siswa di kelas telah memiliki profil diagnostik lengkap -> jalankan algoritma Snake Draft + optimasi 2-Opt Balance -> simpan header tim di `TEAMS` (status draft) dan keanggotaan di `TEAM_MEMBERS` beserta jabatan default.
- **OUTPUT**: `{ "classId": "8A", "balanceScore": 92.5, "teams": [ ... ] }`
- **ERROR**: `"Team Builder membutuhkan minimal 8 profil lengkap sebagai calon Science Leader."`

#### 21. `overrideTeamMember` (Teacher)
- **INPUT**:
  ```json
  {
    "token": "SES-...",
    "membershipId": "8A-T01-V1|STD-8A-01",
    "role": "Scientist Leader",
    "locked": true,
    "note": "Ditunjuk guru karena kemampuan kepemimpinan tinggi"
  }
  ```
- **PROCESS**: Memperbarui status lock, role, atau catatan pada rekaman keanggotaan tim.
- **OUTPUT**: Objek record `TEAM_MEMBERS` yang diperbarui.
- **ERROR**: Keanggotaan tidak ditemukan.

#### 22. `practiceWorksheet` (Student)
- **INPUT**: `{ "token": "SES-...", "unitId": "CH08-01-U02" }`
- **PROCESS**: Mengevaluasi apakah seluruh anggota tim sudah menyelesaikan materi dan kuis unit tersebut -> jika ya, ambil template instrumen LKPD, draft laporan tim yang tersimpan di `GROUP_LAB`, metadata penyunting terakhir, dan role editor pengguna (`leader`, `deputy`, atau `member`).
- **OUTPUT**: Workspace LKPD lengkap beserta draft laporan 11 bagian dan hak akses edit (`canEdit: true/false`).
- **ERROR**: `"LKPD terkunci karena rekan tim Anda belum tuntas materi/kuis bab ini: [Nama Anggota]"`

#### 23. `saveTeamPracticeDraft` (Student)
- **INPUT**:
  ```json
  {
    "token": "SES-...",
    "unitId": "CH08-01-U02",
    "report": { "prediction": "...", "tools": "...", "trial1": "...", ... },
    "clientVersion": "2026-09-18T10:00:00.000Z"
  }
  ```
- **PROCESS**: Memastikan pengedit adalah Leader atau Deputy -> validasi dirty checking (`clientVersion` vs `updated_at` di DB) -> bersihkan 11 field teks -> simpan laporan tim ke `GROUP_LAB` dengan status `'draft'`.
- **OUTPUT**: `{ "status": "draft", "updatedAt": "2026-09-18T...", "submitted": false }`
- **ERROR**: `"Draft berubah di perangkat lain. Muat ulang sebelum menyimpan."`

#### 24. `submitTeamPractice` (Student)
- **INPUT**: Sama dengan `saveTeamPracticeDraft`.
- **PROCESS**: Sama dengan draft, ditambah validasi ketat bahwa field-field wajib (`prediction`, `tools`, `trial1`, `data`, `evidence`, `conclusion`, `memberRoles`) tidak boleh kosong -> simpan laporan dengan status `'submitted'`.
- **OUTPUT**: `{ "status": "submitted", "updatedAt": "2026-09-18T...", "submitted": true }`
- **ERROR**: `"Lengkapi bagian wajib sebelum mengirim: ..."`

#### 25. `saveGroupLab` (Teacher)
- **INPUT**:
  ```json
  {
    "token": "SES-...",
    "teamId": "8A-T01-V1",
    "activityId": "CH08-01-U02-LAB01",
    "status": "verified",
    "score": 95,
    "note": "Analisis data sangat mendalam dan objektif",
    "result": { ... }
  }
  ```
- **PROCESS**: Otorisasi guru -> memperbarui status laporan tim di `GROUP_LAB` -> menyebarkan nilai dan status ke setiap anggota aktif tim di `TEACHER_CHECKS` (`check_type = 'practice'`) -> menyinkronkan rekaman keterampilan sains di tabel `SKILL_EVIDENCE`.
- **OUTPUT**: Objek record `GROUP_LAB` beserta field `membersUpdated: 5`.
- **ERROR**: Tim tidak ditemukan atau nilai di luar rentang 0–100.

#### 26. `groupLabDashboard` (Teacher)
- **INPUT**: `{ "token": "SES-...", "classId": "8A", "activityId": "CH08-01-U02-LAB01" }`
- **PROCESS**: Menampilkan rekapitulasi pengumpulan laporan seluruh kelompok untuk aktivitas praktik tertentu.
- **OUTPUT**: `{ "classId": "8A", "activityId": "...", "teams": [ ... ] }`
- **ERROR**: Akses kelas ditolak.

---

### KELOMPOK 7: TEACHER DASHBOARD & SUPERVISI

#### 27. `dashboard` (Teacher)
- **INPUT**: `{ "token": "SES-...", "classId": "8A" }`
- **PROCESS**: Menghitung statistik kelas: jumlah siswa aktif, jumlah siswa berprofil diagnostik lengkap, progres ketuntasan, status kelayakan pembentukan tim, dan daftar siswa dengan status individual.
- **OUTPUT**:
  ```json
  {
    "classId": "8A",
    "studentCount": 40,
    "diagnosedCount": 38,
    "progressCount": 120,
    "canGenerateTeams": true,
    "students": [ ... ]
  }
  ```
- **ERROR**: Sesi guru tidak valid atau akses kelas ditolak.

#### 28. `teacherLearningDashboard` (Teacher)
- **INPUT**: `{ "token": "SES-...", "classId": "8A", "activityId": "CH08-01-U01-LRN01", "checkType": "summary" }`
- **PROCESS**: Menampilkan antrean pemeriksaan untuk aktivitas belajar tertentu (rangkuman atau LKPD), rekap sinyal kebingungan siswa, serta status pemeriksaan dan nilai kuis terakhir per siswa.
- **OUTPUT**: Objek dashboard pemeriksaan beserta rekapitulasi `confusionSummary: { concept: 2, term: 1, ... }`.
- **ERROR**: Akses kelas ditolak.

#### 29. `saveTeacherChecks` (Teacher)
- **INPUT**:
  ```json
  {
    "token": "SES-...",
    "classId": "8A",
    "activityId": "CH08-01-U01-LRN01",
    "checkType": "summary",
    "status": "verified",
    "score": 100,
    "note": "Rangkuman sangat rapi dan mencakup konsep inti",
    "studentIds": ["STD-8A-01", "STD-8A-02"]
  }
  ```
- **PROCESS**: Menambahkan baris pemeriksaan baru (append-only dengan auto-increment `revision`) di tabel `TEACHER_CHECKS` untuk setiap siswa yang dipilih -> jika checkType `'practice'`, sinkronkan ke `SKILL_EVIDENCE`.
- **OUTPUT**: `{ "saved": 2 }`
- **ERROR**: Status atau jenis pemeriksaan tidak valid.

#### 30. `saveUnlockOverrides` (Teacher)
- **INPUT**:
  ```json
  {
    "token": "SES-...",
    "classId": "8A",
    "activityId": "CH08-01-U02-LRN01",
    "studentIds": ["STD-8A-05"],
    "allowed": true,
    "reason": "Dispensasi izin lomba sains sekolah"
  }
  ```
- **PROCESS**: Menyimpan izin pembukaan materi/kuis khusus di `UNLOCK_OVERRIDES` sehingga siswa dapat melompati prasyarat gerbang sistem.
- **OUTPUT**: `{ "saved": 1 }`
- **ERROR**: Siswa di luar kelas atau aktivitas tidak ditemukan.

#### 31. `teacherLearningCatalog` (Teacher)
- **INPUT**: `{ "token": "SES-..." }`
- **PROCESS**: Mengambil katalog lengkap 21 submateri kurikulum untuk mode pratinjau guru.
- **OUTPUT**: `{ "chapters": [ ... ] }`

#### 32. `teacherLearningUnit` (Teacher)
- **INPUT**: `{ "token": "SES-...", "unitId": "CH08-01-U01" }`
- **PROCESS**: Mengambil seluruh konten submateri, diagram ilustrasi, dan instrumen LKPD tanpa terhalang gerbang kunci belajar siswa (`preview: true`).
- **OUTPUT**: Objek unit kurikulum lengkap.

#### 33. `studentPracticeGuide` & `teacherPracticeGuide`
- **INPUT**: `{ "token": "SES-..." }`
- **PROCESS**: Mengambil buku panduan praktik lab, SOP keselamatan, matriks pembagian peran tim sains, dan contoh laporan sukses.
- **OUTPUT**: `{ "guide": { ... }, "catalog": [ ... ], "team": { ... } }`

#### 34. `semesterCard` (Student)
- **INPUT**: `{ "token": "SES-...", "semester": 1 }`
- **PROCESS**: Memeriksa kelayakan penerbitan kartu kontrol capaian semester: wajib menuntaskan seluruh 21 unit submateri (rangkuman terverifikasi, kuis lulus KKM, dan LKPD terverifikasi).
- **OUTPUT**:
  ```json
  {
    "student": { "name": "Ahmad", "classId": "8A", "rollNo": 1 },
    "schoolYear": "2026/2027",
    "semester": 1,
    "eligible": true,
    "curriculumComplete": true,
    "skills": ["observe", "predict", "record_data", "analyze", "conclude"],
    "details": [ ... ]
  }
  ```
- **ERROR**: Sesi tidak valid.

#### 35. `saveProgress` (Student Generic)
- **INPUT**: `{ "token": "SES-...", "activityId": "CH08-01-U01-EXP01", "status": "completed", "evidence": {} }`
- **PROCESS**: Menyimpan status aktivitas non-ujian (seperti eksplorasi mandiri). Siswa dilarang mengirimkan field `score`.
- **OUTPUT**: Objek record `PROGRESS`.
- **ERROR**: `"Nilai hanya dapat diberikan oleh sistem kuis atau guru."`

---

## BAGIAN 8: MIGRATION WARNING (INVARIANTS YANG TIDAK BOLEH BERUBAH)

Saat membangun backend Node.js dan database baru, pengembang migrasi **HARUS MEMATUHI ATURAN MUTLAK** berikut agar tidak merusak ekosistem yang sudah berjalan:

1. **Stabilitas Identifier Relasional**:
   - `student_id` harus tetap stabil (jangan pernah menggunakan auto-increment ID 1, 2, 3 sebagai foreign key relasi, gunakan string ID asli seperti `STD-8A-01`).
   - `activity_id` tidak boleh diganti atau diubah kapitalisasinya karena diacu secara kaku oleh frontend dan algoritma penskoran.
2. **Kerahasiaan Kunci Jawaban Kuis**:
   - Objek `answer_json` pada tabel `QUIZ_ITEMS` **HARAM DIKIRIMKAN KE BROWSER**. Klien hanya boleh menerima teks prompt dan opsi jawaban yang sudah diacak secara deterministik.
3. **Pengacakan Opsi Jawaban Deterministik**:
   - Pengacakan urutan opsi jawaban kuis wajib menggunakan seed: `studentId|attemptNumber|quizItemId|options` melalui Linear Congruential Generator (algoritma `stableShuffle_`). Jika seed ini diubah menjadi `Math.random()`, maka setiap kali browser me-refresh halaman saat kuis berlangsung, posisi opsi akan berantakan dan pencocokan jawaban siswa akan salah fatal!
4. **Verifikasi Guru Harus Server-Side**:
   - Siswa tidak boleh memiliki kemampuan menandai status rangkumannya sendiri sebagai `verified`. Status kelulusan hanya bisa diterbitkan melalui aksi guru `saveTeacherChecks` atau `saveGroupLab`.
5. **Skema Riwayat Pemeriksaan Append-Only**:
   - Tabel `TEACHER_CHECKS` tidak boleh di-*overwrite* (ditimpa). Setiap koreksi nilai atau revisi baru harus menambah baris baru dengan nomor `revision = revision + 1`.
6. **Penanganan Timeout Mission 0 Tanpa Blokir**:
   - Saat waktu diagnostik habis, pengiriman data harus sukses dan diterima server dengan menyematkan flag timeout, bukan melempar pesan error validasi isian kosong.
7. **Kerahasiaan Sheet `PIN_ISSUANCE`**:
   - PIN mentah siswa tidak boleh terekspos melalui API publik mana pun. Kredensial siswa di database hanya boleh disimpan dalam bentuk hash yang diperkuat dengan salt/pepper.
8. **Dirty-Checking pada Laporan Praktikum Tim**:
   - Endpoint `saveTeamPracticeDraft` dan `submitTeamPractice` harus tetap menjalankan pemeriksaan `clientVersion === current.updated_at` untuk mencegah penimpaan data tanpa sengaja saat dua siswa di tim yang sama mengedit form secara bersamaan.

---

## BAGIAN 9: CURRENT LIMITATIONS & KNOWN EDGE CASES

| Modul / Fitur | Status Kesiapan | Catatan Teknis & Edge Cases yang Harus Diketahui |
|---|---|---|
| **Autentikasi Siswa & Guru** | Selesai & Teruji | Berjalan stabil. Menggunakan session token 8 jam. Throttling saat ini menggunakan memory cache GAS yang bisa hilang saat worker restart. Pada Node.js perlu rate limiter persisten. |
| **Mission 0 (Quick Diagnostic)** | Selesai & Teruji | 5–9 butir acak per siswa dengan timer 210s/butir berjalan stabil. Penskoran kualitatif 0–4 dilakukan manual oleh guru. Belum ada auto-grading berbasis AI/NLP (guru tetap memegang kendali penuh). |
| **Science Team Builder** | Selesai & Teruji | Algoritma Snake Draft dan optimasi 2-opt berjalan sangat baik. Membutuhkan minimal 8 siswa per kelas yang berstatus *diagnosed* sebelum tombol generate aktif di antarmuka guru. |
| **Siklus Pembelajaran & Kuis** | Selesai & Teruji | State machine berjalan konsisten. Anti-cheat mencakup toleransi tab-switch dan deteksi kata kunci AI. Umpan balik spesifik konsep langsung muncul jika ada jawaban salah. |
| **Group Lab (LKPD Praktik Tim)** | Selesai secara Logika | Penyuntingan saat ini dibatasi hanya untuk Scientist Leader dan Deputy. Sinkronisasi multi-user menggunakan dirty-checking (optimistic locking). Belum menggunakan WebSocket/realtime collaboration (Google Docs style). |
| **Leaderboard & Gamifikasi** | Selesai & Teruji | Menghitung net score, badges, dan indeks integritas kelas. Hasil diagregasikan secara batch dengan cache 5 menit untuk menghemat resource. |
| **Kartu Kredensial Akun (PDF)** | Fitur Eksternal GAS | Skrip `CredentialCards.gs` memanfaatkan Google Docs Template & PDF Export di Google Drive untuk menghasilkan lembar kartu cetak. Pada Node.js, fitur ini perlu diimplementasikan menggunakan pustaka PDF seperti `pdfkit` atau `puppeteer`. |
| **Realtime Push Notifications** | Keterbatasan Arsitektur | Klien saat ini menggunakan polling berkala saat refresh view. Siswa belum menerima push notification saat rangkumannya diverifikasi guru secara realtime. |

---

## BAGIAN 10: MIGRATION ROADMAP & STEP-BY-STEP RECOMMENDATION

Berikut adalah panduan eksekusi bertahap bagi tim pengembang untuk memindahkan backend ke VPS tanpa *downtime* atau kerusakan logika:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FASE 1: DATABASE INITIALIZATION                       │
│  - Setup SQLite (dengan WAL mode) atau PostgreSQL pada VPS Ubuntu           │
│  - Eksekusi DDL Migration sesuai tabel Bagian 4                             │
│  - Export data eksisting dari Google Sheets (CSV/JSON) dan import ke SQL   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 FASE 2: REPOSITORY & CORE DATA SERVICE LAYER                │
│  - Bangun repository DAO Node.js menggunakan prepared statements            │
│  - Porting file data statis (LearningData.js, PracticeData.js, Diagnostic)   │
│  - Terapkan hashing PIN baru & verifikasi kompatibilitas PIN eksisting      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   FASE 3: BUSINESS LOGIC & RPC API ROUTER                   │
│  - Bangun Express.js server dengan route tunggal: POST /api/purwa           │
│  - Porting logic Services.gs & LearningServices.gs (1:1 tanpa modifikasi)    │
│  - Pasang middleware rate-limit, CORS, helmet, dan body-parser              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FASE 4: INTEGRATION & UNIT TESTING                     │
│  - Porting Tests.gs menjadi automated integration test suite (Jest/Vitest)  │
│  - Jalankan 15+ uji kepatuhan: roster, acak kuis, rubrik, formula tim       │
│  - Verifikasi seluruh response JSON identik dengan output GAS               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   FASE 5: FRONTEND BUNDLING & PROXY REDIRECT                │
│  - Update build-web.js untuk mengarahkan endpoint ke VPS                    │
│  - Konfigurasi Nginx di VPS: SSL Let's Encrypt + Reverse Proxy ke Express   │
│  - Tes menyeluruh di perangkat Android & Desktop pengguna                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FASE 6: CUT-OVER & GO-LIVE PRODUKSI                    │
│  - Bekukan mutasi data di Google Sheets (Read-Only)                         │
│  - Lakukan backup data final dari Sheets ke PostgreSQL/SQLite               │
│  - Arahkan domain/subdomain produksi ke IP VPS Nginx                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REKOMENDASI DDL DATABASE (SQLITE / POSTGRESQL)
Sebagai referensi siap pakai bagi developer migrasi, berikut adalah DDL tabel-tabel utama:

```sql
-- MASTER TABLES
CREATE TABLE master_classes (
    class_id VARCHAR(10) PRIMARY KEY,
    class_name VARCHAR(50) NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE master_students (
    student_id VARCHAR(32) PRIMARY KEY,
    nis VARCHAR(20),
    nisn VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(2),
    class_id VARCHAR(10) REFERENCES master_classes(class_id),
    roll_no INTEGER NOT NULL,
    pin_hash VARCHAR(128) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    source_row VARCHAR(20),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE master_activities (
    activity_id VARCHAR(50) PRIMARY KEY,
    chapter_id VARCHAR(20) NOT NULL,
    unit_id VARCHAR(20) NOT NULL,
    type VARCHAR(30) NOT NULL,
    title VARCHAR(150) NOT NULL,
    max_score NUMERIC(5,2) DEFAULT 0,
    required BOOLEAN DEFAULT TRUE,
    public BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE
);

-- AUTHENTICATION & SESSIONS
CREATE TABLE sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    actor_type VARCHAR(20) NOT NULL,
    actor_id VARCHAR(50) NOT NULL,
    class_id VARCHAR(50),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PROGRESS & STATE
CREATE TABLE progress (
    progress_id VARCHAR(100) PRIMARY KEY, -- student_id|activity_id
    student_id VARCHAR(32) REFERENCES master_students(student_id),
    activity_id VARCHAR(50) REFERENCES master_activities(activity_id),
    status VARCHAR(30) NOT NULL,
    score NUMERIC(5,2),
    evidence_json TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50)
);

-- DIAGNOSTIC MISSION 0
CREATE TABLE diagnostic_responses (
    response_id VARCHAR(100) PRIMARY KEY, -- student_id|item_id
    student_id VARCHAR(32) REFERENCES master_students(student_id),
    item_id VARCHAR(20) NOT NULL,
    answer TEXT,
    score INTEGER,
    scored_by VARCHAR(50),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE diagnostic_profiles (
    profile_id VARCHAR(32) PRIMARY KEY REFERENCES master_students(student_id),
    student_id VARCHAR(32) NOT NULL,
    observe_infer NUMERIC(4,2),
    evidence_experiment NUMERIC(4,2),
    model_concept NUMERIC(4,2),
    systems_causality NUMERIC(4,2),
    technology_design NUMERIC(4,2),
    overall_reasoning NUMERIC(4,2),
    self_map_score NUMERIC(4,2),
    leader_index NUMERIC(4,2),
    research_readiness VARCHAR(10),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SCIENCE TEAMS
CREATE TABLE teams (
    team_id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(10) REFERENCES master_classes(class_id),
    version BIGINT NOT NULL,
    balance_score NUMERIC(5,2),
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

CREATE TABLE team_members (
    membership_id VARCHAR(100) PRIMARY KEY, -- team_id|student_id
    team_id VARCHAR(50) REFERENCES teams(team_id),
    student_id VARCHAR(32) REFERENCES master_students(student_id),
    role VARCHAR(50) NOT NULL,
    is_leader BOOLEAN DEFAULT FALSE,
    locked BOOLEAN DEFAULT FALSE,
    override_note TEXT
);

-- GROUP LAB
CREATE TABLE group_lab (
    lab_result_id VARCHAR(100) PRIMARY KEY, -- team_id|activity_id
    class_id VARCHAR(10) REFERENCES master_classes(class_id),
    activity_id VARCHAR(50) REFERENCES master_activities(activity_id),
    team_id VARCHAR(50) REFERENCES teams(team_id),
    status VARCHAR(30) NOT NULL,
    score NUMERIC(5,2),
    result_json TEXT,
    teacher_note TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50)
);

-- TEACHER SUPERVISION & CHECKS
CREATE TABLE teacher_checks (
    check_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(32) REFERENCES master_students(student_id),
    activity_id VARCHAR(50) REFERENCES master_activities(activity_id),
    check_type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    score NUMERIC(5,2),
    note TEXT,
    checked_by VARCHAR(50),
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revision INTEGER DEFAULT 1
);

-- QUIZ SYSTEM
CREATE TABLE quiz_attempts (
    attempt_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(32) REFERENCES master_students(student_id),
    activity_id VARCHAR(50) REFERENCES master_activities(activity_id),
    attempt_number INTEGER NOT NULL,
    score NUMERIC(5,2),
    passed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP
);

CREATE TABLE quiz_responses (
    response_id VARCHAR(100) PRIMARY KEY, -- attempt_id|quiz_item_id
    attempt_id VARCHAR(50) REFERENCES quiz_attempts(attempt_id),
    quiz_item_id VARCHAR(50) NOT NULL,
    answer_json TEXT,
    score NUMERIC(5,2),
    feedback_code VARCHAR(50)
);

-- AUDIT & SETTINGS
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
    event_id VARCHAR(50) PRIMARY KEY,
    actor_type VARCHAR(20) NOT NULL,
    actor_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    detail_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## KESIMPULAN & TANDA TANGAN SERAH TERIMA TEKNIS

Purwaverse IPA VIII bukan sekadar sistem CMS materi atau kuis pilihan ganda sederhana. Di balik antarmukanya terdapat **arsitektur pedagogis saintifik berantai**, di mana integritas data, penilaian kualitatif guru, kerja sama kelompok berimbang, dan kejujuran akademis dijaga secara ketat oleh aturan-aturan komputasional yang telah diuji di lapangan.

Dokumen ini menjadi pegangan resmi developer migrasi untuk mereplikasi backend GAS ke Node.js VPS secara sempurna. Pertahankan semua invariant, jaga agar kontrak API tetap kompatibel dengan frontend, dan pastikan transisi database berjalan tanpa kehilangan satu pun rekam jejak capaian siswa.

*Dokumen Handover Selesai Disusun.*  
**Lead Software Architect - Purwaverse IPA VIII Project**

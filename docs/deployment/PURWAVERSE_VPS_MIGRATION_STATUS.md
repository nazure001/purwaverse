# PURWAVERSE VPS MIGRATION STATUS & ARCHITECTURAL AUDIT
**Dokumen Status Audit, Pemetaan Modul, Analisis Risiko, dan Rencana Implementasi Bertahap**
*Target: Migrasi Google Apps Script (GAS) + Google Sheets ke Node.js + SQLite pada VPS Ubuntu*

---

## 1. STRUKTUR REPOSITORY SAAT INI

Repository `purwaverse-ipa-viii-mvp-private` saat ini mengadopsi struktur hibrida antara Google Apps Script backend dan klien Web App statis:

```
d:\repo\purwaverse-ipa-viii-mvp-private\
├── .git\                                # Version Control Git
├── api\                                 # Edge Proxy Vercel Serverless
│   └── purwa.js                         # Proxy handler POST /api/purwa -> GAS Web App Exec
├── docs\                                # Dokumentasi Teknis & Panduan Operasional
│   ├── CONTENT_STANDARD.md              # Standar penulisan materi dan referensi BSE 2021
│   ├── INTEGRATION_CHECKLIST.md         # Checklist kepatuhan integrasi sistem
│   ├── PANDUAN_MIGRASI_VPS.md           # Catatan awal persiapan lingkungan VPS
│   ├── SCHEMA.md                        # Deskripsi skema database Google Sheets
│   └── WIKI_OPERASIONAL.md              # SOP operasional kelas, guru, dan laboratorium
├── gas\                                 # Monolit Kode Backend & Template Klien Apps Script
│   ├── .clasp.json                      # Konfigurasi deploy Google Clasp
│   ├── Amnesty.gs                       # Skrip rekonsiliasi dan perbaikan data anomali
│   ├── Api.gs                           # HTTP Entry Point (doGet/doPost) & RPC Action Dispatcher
│   ├── Config.gs                        # Konstanta global sistem & definisi skema tabel
│   ├── CredentialCards.gs               # Generator PDF kartu akun siswa (A4 10 kartu + QR aman)
│   ├── DiagnosticData.gs                # 25 Butir soal resmi Mission 0 & angket Self-Map
│   ├── Index.html                       # Shell HTML utama klien (SPA)
│   ├── LearningData.gs                  # Silabus 21 submateri, bank kuis, diagram anotasi SVG
│   ├── LearningScripts.html             # Logika interaksi frontend pembelajaran & LKPD
│   ├── LearningServices.gs              # Business logic kurikulum, gerbang kuis, dan praktikum
│   ├── LearningStyles.html              # CSS tema modul pembelajaran & form LKPD
│   ├── PracticeData.gs                  # 16 Katalog instrumen LKPD & SOP lab
│   ├── README.md                        # Panduan deploy GAS
│   ├── Repository.gs                    # Abstraksi akses data Spreadsheet (DAO) & audit log
│   ├── RosterData.gs                    # Master data 207 siswa resmi (Kelas 8A - 8E)
│   ├── Scripts.html                     # Logika klien umum, routing view, timer, dan deteksi cheat
│   ├── Security.gs                      # Hashing PIN/password, otorisasi peran, rate limiter
│   ├── Seed.gs                          # Skrip inisialisasi skema dan seeding awal
│   ├── Services.gs                      # Business logic umum, Mission 0, tim builder, leaderboard
│   ├── Styles.html                      # CSS global desain modern (glassmorphism & dark/light)
│   ├── Tests.gs                         # 15+ Uji kepatuhan integrasi sistem
│   └── appsscript.json                  # Manifest runtime V8 Google Apps Script
├── public\                              # Hasil Kompilasi Klien Siap Deploy
│   └── index.html                       # Bundel SPA mandiri (HTML + CSS + JS + static units)
├── scripts\                             # Build Tooling
│   └── build-web.js                     # Compiler penggabung file gas/*.html menjadi public/index.html
├── tmp\                                 # Direktori kerja sementara
├── package.json                         # Konfigurasi npm (skrip build & serve)
├── vercel.json                          # Routing config Vercel (rewrites /api/purwa -> api/purwa.js)
├── README.md                            # Dokumentasi root repository
└── PURWAVERSE_MIGRATION_HANDOVER.md     # Sumber Kebenaran Utama (Spesifikasi Teknis Lengkap)
```

---

## 2. FILE YANG AKAN DIMIGRASIKAN

Proses migrasi mengadopsi prinsip **Zero Business Logic Modification**. Seluruh logika bisnis dari modul `.gs` akan dipetakan 1:1 ke dalam arsitektur berlapis (*layered architecture*) Node.js di dalam direktori baru `server/`:

| File Sumber (GAS / Repo) | Modul Target di Node.js (`server/`) | Tanggung Jawab & Deskripsi Konversi |
|---|---|---|
| `gas/Api.gs` | `server/src/routes/purwaRoutes.js`<br>`server/src/controllers/purwaController.js` | Menerima request `POST /api/purwa`, memvalidasi payload `{ action, payload }`, dan mendistribusikan aksi ke service layer yang sesuai. Menggantikan `doPost` dan switch-case `api()`. |
| `gas/Config.gs` | `server/src/config/index.js` | Menyimpan seluruh konstanta konfigurasi (`CONFIG`) dan pemetaan skema kolom. Variabel lingkungan dibaca dari `.env`. |
| `gas/Repository.gs` | `server/src/database/db.js`<br>`server/src/database/repository.js`<br>`server/src/database/schema.sql` | Mengonversi fungsi Spreadsheet (`rows_`, `append_`, `upsert_`, `findOne_`, `findAll_`, `deleteWhere_`, `audit_`) menjadi query SQL SQLite (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) menggunakan *prepared statements*. |
| `gas/Security.gs` | `server/src/services/securityService.js`<br>`server/src/middleware/authMiddleware.js` | Mengelola hashing kredensial, verifikasi PIN siswa (dengan pepper & fallback SHA-256 legacy menuju format baru), verifikasi password guru, penerbitan token sesi, dan rate limiting brute-force. |
| `gas/Services.gs` | `server/src/services/coreService.js` | Logika autentikasi (`loginStudent`, `loginTeacher`, `logout`), Mission 0 (`diagnosticItems`, `submitDiagnostic`, `buildProfile_`), Team Builder (`generateTeams_` Snake Draft + 2-Opt), dan Leaderboard publik. |
| `gas/LearningServices.gs` | `server/src/services/learningService.js` | Finite State Machine jalur belajar 21 unit (`unitState_`), verifikasi rangkuman guru (`submitSummaryForReview`, `saveTeacherChecks`), pengerjaan LKPD praktikum tim (`practiceWorkspace`, `saveTeamPracticeReport`, `saveGroupLab`), dan kartu semester. |
| `gas/LearningData.gs` | `server/src/data/learningData.js` | Modul statis data kurikulum 21 submateri, glosarium, generator anotasi SVG konsep, dan bank butir soal kuis (LOTS/MOTS/HOTS). |
| `gas/PracticeData.gs` | `server/src/data/practiceData.js` | Modul statis katalog 16 aktivitas LKPD, panduan SOP keselamatan laboratorium, dan matriks peran kelompok sains. |
| `gas/DiagnosticData.gs` | `server/src/data/diagnosticData.js` | 25 Butir narasi penalaran sains Mission 0 beserta rubrik analitis skor 0–4 dan angket minat `SELF_MAP`. |
| `gas/RosterData.gs` & `gas/Seed.gs` | `server/src/database/seed.js` | Skrip CLI inisialisasi database SQLite dan pengisian data master rombel (8A–8E), 207 data siswa resmi, dan kredensial awal. |
| `gas/Tests.gs` | `server/tests/integration.test.js` | Suite tes integrasi otomatis (15+ kepatuhan sistem) untuk memvalidasi bahwa backend Node.js menghasilkan output yang identik dengan GAS. |
| `api/purwa.js` (Proxy) | `server/src/server.js` | Digantikan langsung oleh server Express lokal. Server Express melayani endpoint `/api/purwa` dan menyajikan static assets frontend dari direktori `public/`. |

---

## 3. DEPENDENCY ANTAR FILE

### 3.1 Diagram Aliran Dependensi Modul Node.js
```
[Client Browser]
       │
       ▼ HTTPS POST /api/purwa { action, payload }
[server.js] (Express App, CORS, Helmet, RateLimiter)
       │
       ▼
[routes/purwaRoutes.js]
       │
       ▼
[controllers/purwaController.js] ──► [middleware/authMiddleware.js] (requireSession)
       │
       ├──► [services/coreService.js] (Auth, M0 Diagnostic, Team Builder, Leaderboard)
       │         │
       │         ├──► [services/securityService.js] (Hashing, Session Lifecycle)
       │         ├──► [data/diagnosticData.js] (Bank Soal M0, Rubrik)
       │         └──► [database/repository.js] (DAO SQL)
       │
       └──► [services/learningService.js] (State Machine, Kuis Engine, Group Lab LKPD)
                 │
                 ├──► [data/learningData.js] (Kurikulum, Bank Kuis, SVG)
                 ├──► [data/practiceData.js] (Katalog LKPD, SOP Lab)
                 └──► [database/repository.js] (DAO SQL)
                           │
                           ▼
                 [database/db.js] (SQLite Connection + WAL Mode)
                           │
                           ▼
                 [database/purwaverse.db] (Storage File Lokal)
```

### 3.2 Ketergantungan Integritas Relasional Database
1. **`master_classes`**: Induk untuk pembagian rombel siswa (`master_students.class_id`) dan pengelompokan tim laboratorium (`teams.class_id`).
2. **`master_students`**: Induk utama seluruh aktivitas:
   - `sessions.actor_id` (relasi sesi login).
   - `progress.student_id` (rekam jejak submateri).
   - `diagnostic_responses.student_id` & `diagnostic_profiles.student_id` (penalaran Mission 0).
   - `team_members.student_id` (keanggotaan tim laboratorium).
   - `teacher_checks.student_id` (riwayat validasi rangkuman dan LKPD).
   - `quiz_attempts.student_id` (percobaan dan nilai kelulusan kuis).
   - `skill_evidence.student_id` (portofolio kompetensi kurikulum merdeka).
3. **`master_activities`**: Menentukan kode aktivitas yang dihubungkan dengan `progress`, `quiz_items`, `group_lab`, dan `teacher_checks`.
4. **`teams` & `team_members`**: Mengontrol hak penyuntingan laporan praktikum tim di `group_lab` (`lab_result_id = team_id | activity_id`).
5. **`quiz_attempts` & `quiz_responses`**: Mengikat jawaban butir kuis per percobaan siswa dengan umpan balik konsep.

---

## 4. ANALISIS RISIKO MIGRASI & STRATEGI MITIGASI

| No | Kategori Risiko | Potensi Dampak / Masalah | Tingkat Risiko | Strategi Mitigasi Terencana |
|---|---|---|---|---|
| 1 | **API Contract Mismatch** | Klien SPA berhenti berfungsi atau menampilkan layar putih/error jika pembungkus `{ ok: true, data }` atau penamaan properti di dalamnya berubah. | **P0 (Kritis)** | Controller Node.js mereplikasi struktur response GAS 1:1. Menggunakan suite uji otomatis yang membandingkan payload JSON secara langsung. |
| 2 | **Quiz Scramble Desynchronization** | Jika urutan opsi kuis tidak deterministik, maka saat siswa menjawab opsi A, server bisa menilai salah karena posisi opsi di server berbeda dengan di browser. | **P0 (Kritis)** | Menggunakan algoritma Linear Congruential Generator (`stableShuffle_`) dengan string seed identik: `studentId|attemptNumber|quiz_item_id|options`. Larang penggunaan `Math.random()`. |
| 3 | **Pemberian Akses Kuis Tanpa Verifikasi Rangkuman** | Kuis terbuka sebelum buku fisik diperiksa guru, melanggar prinsip pedagogis inquiry learning. | **P0 (Kritis)** | Logika `unitState_` di Node.js wajib mengecek status `teacher_checks` bertipe `summary` dengan status `verified` (atau keberadaan rekaman di `unlock_overrides`). |
| 4 | **Regresi Formula Team Builder** | Pembagian kelompok menjadi tidak seimbang atau salah memilih Scientist Leader / Deputy. | **P1 (Tinggi)** | Formula `LeaderIndex = 0.75 * OverallReasoning + 0.25 * SelfMap` dan algoritma swap 2-Opt dipertahankan persis tanpa modifikasi konstanta bobot. |
| 5 | **Timeout Mission 0 Menghasilkan Error Validasi** | Siswa yang kehabisan waktu 210s/butir gagal submit karena form mengirimkan teks kosong. | **P1 (Tinggi)** | Handler `submitDiagnostic` wajib mendeteksi flag `isTimeout === true` dan menyematkan fallback string `[Waktu habis - belum sempat dijawab]`. |
| 6 | **SQLite Concurrency & Database Locking** | Database melempar error `SQLITE_BUSY` saat 40 siswa submit kuis atau presensi serentak di kelas. | **P1 (Tinggi)** | Mengaktifkan mode **WAL (Write-Ahead Logging)** pada SQLite (`PRAGMA journal_mode = WAL;`) dan menyetel `PRAGMA busy_timeout = 5000;`. |
| 7 | **Backward Compatibility Hash Kredensial Siswa/Guru** | Siswa lama tidak dapat login setelah migrasi ke Node.js jika algoritma hash langsung diubah secara sepihak. | **P1 (Tinggi)** | Mengimplementasikan verifikasi berlapis: verifikasi hash baru (Argon2id/Bcrypt), jika gagal coba verifikasi hash SHA-256 ber-pepper eksisting. Saat login berhasil, lakukan migrasi hash transparan. |
| 8 | **Hilangnya Riwayat Append-Only Pemeriksaan Guru** | Koreksi nilai menimpa data pemeriksaan sebelumnya sehingga tidak ada jejak audit. | **P2 (Sedang)** | Tabel `teacher_checks` wajib mempertahankan sifat *append-only* dengan auto-increment nomor kolom `revision`. |
| 9 | **Tab Penalty & Anti-Cheat False Positives** | Siswa terkena penalti 20% secara tidak adil akibat batas toleransi salah hitung. | **P2 (Sedang)** | Rumus toleransi tetap: $\text{toleransi} = \lfloor \frac{N_{soal}}{2} \rfloor$. Penalti hanya diaktifkan jika `tabSwitchCount > tabTolerance` atau `forcedLocked === true`. |

---

## 5. URUTAN IMPLEMENTASI (PHASED ROADMAP)

Sesuai dengan arahan kerja, implementasi backend mandiri akan dieksekusi secara ketat dalam urutan fase berikut:

### FASE 1: Backend Skeleton & RPC Infrastructure
- **Tujuan**: Membangun fondasi server HTTP Express yang siap menerima protokol JSON RPC Purwaverse.
- **Deliverables**:
  - Inisialisasi struktur folder:
    ```
    server/
    ├── src/
    │   ├── config/          # Konfigurasi & env loader
    │   ├── controllers/     # Dispatcher & response formatter
    │   ├── database/        # Schema DDL, driver SQLite, DAO
    │   ├── middleware/      # Auth, rate-limiter, error-handler
    │   ├── routes/          # Express route POST /api/purwa
    │   ├── services/        # Business logic layer
    │   └── server.js        # Entry point aplikasi Express
    ├── tests/               # Automated integration tests
    ├── package.json         # Dependencies: express, better-sqlite3, cors, helmet, dotenv, argon2
    └── .env.example         # Template konfigurasi environment
    ```
  - Endpoint tunggal `POST /api/purwa` yang merespons format standar `{ ok: true, data: { status: "online" } }`.

### FASE 2: Database Layer & Repository Migration
- **Tujuan**: Menggantikan Google Sheets dengan database relasional SQLite berbasis *prepared statements*.
- **Deliverables**:
  - `server/src/database/schema.sql`: DDL 14 tabel relasional dengan indeks optimal.
  - `server/src/database/db.js`: Inisialisasi koneksi SQLite dengan konfigurasi WAL mode dan foreign keys.
  - `server/src/database/repository.js`: Implementasi fungsi DAO (`rows_`, `append_`, `upsert_`, `findOne_`, `findAll_`, `deleteWhere_`, `audit_`).
  - `server/src/database/seed.js`: Skrip seeder pengisian master rombel (8A–8E), roster 207 siswa, dan aktivitas kurikulum.

### FASE 3: Security & Authentication Services
- **Tujuan**: Membangun mekanisme login siswa, login guru, dan manajemen sesi yang aman di VPS.
- **Deliverables**:
  - `server/src/services/securityService.js`:
    - Login siswa berbasis NISN/absen/PIN dengan verifikasi hash ganda (backward compatibility).
    - Login guru berbasis kata sandi kuat.
    - Sesi berbasis token UUID dengan masa aktif 8 jam di tabel SQLite `sessions`.
    - Perekaman presensi otomatis di tabel `attendance`.
  - `server/src/middleware/authMiddleware.js`: Middleware proteksi endpoint `requireSession` (validasi token dan role).
  - Rate limiting anti brute-force pada level memori/middleware.

### FASE 4: Core Services Migration
- **Tujuan**: Memindahkan logika Mission 0, Team Builder, dan Leaderboard dari `Services.gs`.
- **Deliverables**:
  - `server/src/services/coreService.js`:
    - `diagnosticItems`: Sampling deterministik 5–9 butir diagnostik 5 domain dengan timer 210s/butir.
    - `submitDiagnostic`: Penyimpanan jawaban, sisa waktu, dan penanganan timeout.
    - `scoreDiagnostic` & `buildProfile_`: Penskoran guru 0–4, perhitungan skor domain, overall reasoning, leader index, dan status kesiapan riset.
    - `generateTeams_`: Algoritma Snake Draft heterogen dan optimasi ketimpangan kelompok (2-Opt Balance).
    - `publicLeaderboardData_`: Kalkulasi ranking publik, perolehan lencana (*badges*), dan indeks integritas kelas.

### FASE 5: Learning Services & Gate State Machine
- **Tujuan**: Memindahkan kurikulum 21 submateri dan alur gerbang belajar dari `LearningServices.gs`.
- **Deliverables**:
  - `server/src/services/learningService.js`:
    - `unitState_`: Finite state machine (`reading` $\rightarrow$ `pending_review` $\rightarrow$ `quiz_ready` $\rightarrow$ `practice_ready` $\rightarrow$ `completed`).
    - `submitSummaryForReview` & `saveTeacherChecks`: Antrean pemeriksaan rangkuman buku fisik siswa oleh guru.
    - `practiceWorkspace` & `saveTeamPracticeReport`: Pengisian draft dan submit laporan LKPD praktikum tim oleh Scientist Leader / Deputy dengan dirty-checking.
    - `saveGroupLab`: Penilaian praktikum kelompok oleh guru dan sinkronisasi portofolio keterampilan di `skill_evidence`.
    - `semesterCard`: Verifikasi kelayakan kartu capaian semester (syarat 21 unit tuntas).

### FASE 6: Quiz Engine & Anti-Cheat Integrity
- **Tujuan**: Memindahkan mesin kuis interaktif dengan jaminan kerahasiaan kunci jawaban.
- **Deliverables**:
  - `startQuiz`: Dynamic sampling deterministik (5–8 butir LOTS/MOTS/HOTS) dan pengacakan urutan opsi jawaban deterministik via Linear Congruential Generator.
  - `submitQuiz`: Pencocokan jawaban server-side, skor kelulusan KKM 70, speed bonus, penalti pindah tab (20%), dan umpan balik spesifik konsep.
  - Kunci jawaban (`answer_json`) dipastikan **tidak pernah** terekspos ke klien.

### FASE TESTING & VALIDASI KOMPARATIF
- **Tujuan**: Memastikan hasil eksekusi backend Node.js identik dengan hasil eksekusi Google Apps Script.
- **Deliverables**:
  - `server/tests/integration.test.js`:
    - Test Suite 1: Login siswa valid & invalid (verifikasi throttling & presensi).
    - Test Suite 2: Login guru & otorisasi akses kelas.
    - Test Suite 3: Bootstrap metadata publik & glosarium.
    - Test Suite 4: Alur kuis (uji determinisme opsi, sampling LOTS/MOTS/HOTS, scoring KKM 70, dan review umpan balik).
    - Test Suite 5: Alur Mission 0 & Snake Draft Team Builder (pembagian 8 tim seimbang).
    - Test Suite 6: State machine jalur belajar (uji penguncian submateri sebelum rangkuman diverifikasi guru).

---

## STATUS SAAT INI & LANGKAH SELANJUTNYA

- [x] **Audit Sistem & Inventarisasi Aset Selesai**.
- [x] **Dokumen Handover Utama [`PURWAVERSE_MIGRATION_HANDOVER.md`](PURWAVERSE_MIGRATION_HANDOVER.md) Terbit**.
- [x] **Dokumen Status Migrasi [`PURWAVERSE_VPS_MIGRATION_STATUS.md`](PURWAVERSE_VPS_MIGRATION_STATUS.md) Dibuat**.
- [x] **Implementasi Phase 1 s.d. Phase 5 Selesai & Tervalidasi**.


# MANIFEST PENUTUPAN FASE 1 (LMS PHASE 1 CLOSURE MANIFEST)

**Dokumen**: `docs/reports/LMS_PHASE_1_CLOSURE_MANIFEST.md`
**Tanggal Evaluasi**: 24 September 2026 (WIB)
**Status Baseline**: `PHASE_1_LOCAL_BASELINE_VERIFIED`
**Status Staging**: `STAGING_PREPARATION_NOT_YET_EXECUTABLE`
**Tujuan**: Membekukan baseline LMS Fix Fase 1 yang telah lulus audit controller, menginventarisasi seluruh artefak runtime, pengujian, dan bukti secara konsisten, serta menetapkan batas aman sebelum rilis staging VPS.

---

## 1. Ruang Lingkup Fase 1 (Phase 1 Scope)

Fase 1 mencakup penyelesaian defisit arsitektur, penyelarasan kontrak API, dan penjaminan mutu alur pembelajaran LMS pada lingkungan lokal terisolasi:

1. **Penyelarasan Kontrak API (API Contract Alignment)**:
   - Login Siswa: Mendukung format legacy (`classId` + `rollNo`) dan format kanonikal (`student_id`), PIN 4-digit terenkripsi Argon2id.
   - Login Guru: Mendukung `username` + `password` (default `guru`) berbasis env var hash Argon2id (menghilangkan password hardcoded runtime).
   - Verifikasi Sesi (`verifySession`): Memvalidasi integritas sesi siswa dan guru.
   - Endpoint Health: Mendukung probe `GET /healthz` dan `GET /api/healthz` (di samping kompatibilitas `GET /`).
2. **Pengendalian Wewenang LKPD Tim (Controlled Fallback)**:
   - Akses edit default mutlak pada Ketua Kelompok (*Scientist Leader*).
   - Wakil Ketua (*Deputy Scientist*) berstatus *view-only* sebelum ada pengesahan guru. Tombol draft dan submit terbukti dinonaktifkan (*disabled*).
   - Anggota biasa (*Data Analyst*, *Lab Operator*, dll.) berstatus *view-only* permanen.
   - Pengesahan oleh guru (`authorizeControlledFallback`) secara ketat memverifikasi bahwa siswa sasaran memiliki peran resmi `Deputy Scientist Leader` atau `Deputy Scientist`, serta memvalidasi `activityId` resmi bertipe praktik yang cocok dengan unitnya.
   - Pencabutan oleh guru (`revokeControlledFallback`) mengembalikan wewenang ke Leader dan menolak pencabutan terhadap anggota biasa.
3. **Gerbang Progres Belajar (Learning Gates & Lock State Machine)**:
   - Unit 1 membaca materi $\rightarrow$ checkbox konfirmasi buku catatan fisik $\rightarrow$ verifikasi guru di Teacher Command Center $\rightarrow$ Quiz Chamber terbuka.
   - Kuis deterministik dengan opsi acak (*deterministic shuffle*).
   - Skenario ganda KKM: Nilai kuis di bawah KKM (< 70) menahan Unit 2 tetap terkunci; perolehan nilai lulus (≥ 70) membuka Unit 2.
4. **Kanonisitas 6 Bab & Audit Semantik 21 Unit**:
   - Menyelaraskan urutan 6 bab resmi guru (Bab 1 Sel s.d. Bab 6 Getaran) dan mempertahankan 16 instrumen praktikum tim.
   - Menyelaraskan judul submateri Bab 2 dengan runtime source (`U01 Tubuh sebagai Sistem` s.d. `U06 Hubungan Antarsistem`).
5. **Kesiapan Staging Terisolasi**:
   - Skrip seeder resmi `scripts/seed-staging-synthetic.js` yang mematuhi `schema.sql` 100% dan dilengkapi safety guard anti-pencemaran data.
   - Kontrak konfigurasi `ALLOWED_ORIGIN` non-wildcard dan `TRUST_PROXY` aktif pada lingkungan staging.

---

## 2. Inventarisasi File Runtime (Runtime Files)

File-file berikut merupakan kode sumber runtime yang telah diuji dan siap diikutsertakan dalam baseline (`INCLUDE_RUNTIME`):

| File Path | Komponen | Peran & Modifikasi Fase 1 |
|---|---|---|
| `public/index.html` | Frontend View | Form pengesahan & pencabutan fallback guru, selektor aktivitas eksplisit, UI filter kelas guru. |
| `public/js/course.js` | Frontend Logic | Penguncian tombol LKPD deputy, banner fallback, konfirmasi buku fisik, navigasi gerbang kuis & unit. |
| `public/js/dashboard.js` | Frontend Dashboard | Teacher Command Center: verifikasi buku catatan, otorisasi/revokasi fallback dinamis per kelas. |
| `public/js/ui-components.js` | Frontend Utility | Pelacak status error toast dan API error event listener (`assertNoToastError`). |
| `package.json` | Root Project Meta | Menghubungkan script proxy `test` (`npm test`) langsung ke test runner backend. |
| `server/package.json` | Backend Meta | Konfigurasi dependency dan test runner serial (`node --test --test-concurrency=1`). |
| `server/src/server.js` | Backend Entry | Express server, `app.set('trust proxy')`, CORS non-wildcard via `ALLOWED_ORIGIN`, endpoint `/healthz`. |
| `server/src/config/index.js` | Backend Config | Pembacaan konfigurasi environment terpusat (termasuk `ALLOWED_ORIGIN`, `BASE_URL`, `TRUST_PROXY`). |
| `server/src/controllers/purwaController.js` | RPC Controller | Dispatcher aksi RPC: penanganan login, verifySession, authorize/revoke controlled fallback, overview guru. |
| `server/src/services/learningService.js` | Domain Logic | State machine unit, validasi semantik LKPD (`validatePracticeActivity_`), proteksi peran deputy, rekonsiliasi nilai tim. |
| `server/src/services/securityService.js` | Security Domain | Autentikasi Argon2id, eliminasi password fallback hardcoded, proteksi brute-force per sesi. |
| `server/src/database/db.js` | Database Driver | Driver SQLite (`better-sqlite3`), aktivasi WAL mode, foreign keys ON, busy timeout 5000ms. |
| `server/src/database/schema.sql` | Schema DDL | 23 tabel operasional dan 11 tabel Content Engineering Purwaverse. |
| `server/src/database/repository.js` | Data Access | Abstraksi repository: `findOne_`, `findAll_`, `upsert_`, `append_`, `deleteWhere_`, audit logger. |
| `server/src/database/seed.js` | Seeder | Seeding idempotent kelas, aktivitas, diagnostik, kurikulum, dan master siswa. |
| `.env.example` | Root Env Template | Template variabel lingkungan ter-audit dengan penandaan active/compatibility/test/future. |
| `server/.env.example` | Server Env Template | Template variabel lingkungan aman untuk paket backend server. |

---

## 3. Inventarisasi File Pengujian & Tooling (Test Files)

File-file pengujian otomatis yang wajib dipelihara sebagai penjaga regresi (`INCLUDE_TEST`):

| File Path | Jenis Pengujian | Cakupan Pengujian |
|---|---|---|
| `server/tests/auth.test.js` | Unit & Integration | Autentikasi siswa & guru, auto-upgrade Argon2id, brute-force lockout, session expiration. |
| `server/tests/contractAndFallback.test.js` | Integration & Contract | Kontrak login, verifySession, izin edit leader/deputy/member, 7 pengujian negatif Test 10, pencabutan Test 11. |
| `server/tests/coreService.test.js` | Service Unit | Diagnostik M0, profil diagnostik, snake draft tim, leaderboard & badges. |
| `server/tests/learningService.test.js` | Service Unit | State machine unlock unit, verifikasi rangkuman, kuis KKM, sinkronisasi nilai kelompok, teacher overrides. |
| `server/tests/server.test.js` | Server & Router | RPC routing, health endpoints (`/`, `/healthz`, `/api/healthz`), kontrak `TRUST_PROXY` & `ALLOWED_ORIGIN`. |
| `server/tests/stagingConfig.test.js` | Staging Policy Test | 6 pengujian otomatis: validasi TRUST_PROXY=1 (hop count numerik 1), CORS allowlist non-wildcard di staging, penolakan origin asing, dan SESSION_TTL_HOURS. |
| `server/tests/seedStaging.test.js` | Database Seeder Test | 4 pengujian otomatis untuk `seed-staging-synthetic.js`: safety guard, schema compliance, idempotensi. |
| `scripts/seed-staging-synthetic.js` | Staging Seeder Tool | Script resmi seeding staging akun sintetis murni dengan transaksi atomik dan safety guards. |
| `scripts/verify-tracked-loaders.js` | Isolation Check | Uji integritas foreign keys & struktur kurikulum mandiri pada database terisolasi (`0 FK violations`). |
| `scripts/verify-e2e-flow.js` | API E2E Flow | Uji sekuensial 11 langkah API RPC: auth, notebook sign-off, quiz scoring 63/100, fallback flow. |
| `scripts/run-browser-interactive.js` | Browser CDP E2E | Uji interaktif 10 langkah Chrome Headless CDP: DOM assertions, dual KKM scenarios, LKPD locking. |

---

## 4. Inventarisasi Bukti Pengujian (Evidence Artifacts)

Total artefak visual di direktori `docs/reports/screenshots/` berjumlah **14 file**:

### A. 12 Screenshot Baru (Hasil Pengujian Segar 23 September 2026 - `INCLUDE_EVIDENCE`):
1. `1_browser_student_login.png`: Siswa Leader (`SYN-LEAD`) berhasil masuk ke dashboard siswa.
2. `2_browser_unit1_material.png`: Pembaca materi Unit 1 "Sel sebagai Unit Kehidupan".
3. `3_browser_notebook_reported.png`: Checkbox konfirmasi buku catatan fisik dilaporkan (status: Menunggu Verifikasi Guru).
4. `4_browser_teacher_verified.png`: Guru memverifikasi catatan siswa di Teacher Command Center.
5. `5a_browser_quiz_below_kkm_locked.png`: Skenario Kuis A: Nilai 0 (< KKM 70) $\rightarrow$ Unit 2 tetap terkunci.
6. `5b_browser_quiz_passed_unlocked.png`: Skenario Kuis B: Nilai 100 (≥ KKM 70) $\rightarrow$ Unit 2 berhasil terbuka.
7. `6a_browser_deputy_buttons_disabled.png`: Deputy membuka LKPD sebelum otorisasi guru; tombol Simpan Draft & Submit terbukti `disabled=true`.
8. `6b_browser_leader_lkpd_draft.png`: Leader mengisi 10 butir form praktikum dan menyimpan draft nyata.
9. `7_browser_teacher_fallback_authorized.png`: Guru mengesahkan Controlled Fallback untuk deputy resmi dengan activityId eksplisit.
10. `8_browser_deputy_lkpd_submitted.png`: Deputy dengan banner "FALLBACK DIAKTIFKAN" berhasil mengirimkan laporan tim.
11. `9_browser_reload_persistence.png`: Verifikasi persistensi status `submitted` pasca reload keras halaman.
12. `10_browser_teacher_fallback_revoked.png`: Guru mencabut Controlled Fallback; wewenang edit kembali ke Leader.

### B. 2 Screenshot Lama (Iterasi Usang - `EXCLUDE_GENERATED`):
1. `5_browser_quiz_chamber_passed.png`: Screenshot kuis tunggal sebelum pemisahan skenario ganda KKM (digantikan oleh `5a` dan `5b`).
2. `6_browser_leader_lkpd_draft.png`: Screenshot draft awal sebelum penambahan pengujian tombol deputy disabled (digantikan oleh `6a` dan `6b`).

---

## 5. Ringkasan Bukti Eksekusi Pengujian Aktual (Actual Execution Evidence)

Hasil eksekusi aktual seluruh suite pengetesan pada 24 September 2026:

```text
================================================================================
1. BACKEND REGRESSION SUITE (npm test)
--------------------------------------------------------------------------------
ℹ tests 66 | suites 0 | pass 66 | fail 0 | cancelled 0 | skipped 0 | todo 0
ℹ duration_ms: ~4700ms
Cakupan: Security (6), Content Eng (2), API Contract & Fallback (12), Core (5),
         Database (8), Learning Service (7), Seed Staging (4), Server & Health (7),
         Staging Config & Policy (6).

2. STAGING SYNTHETIC SEEDER TEST (node --test tests/seedStaging.test.js)
--------------------------------------------------------------------------------
✔ 1. Safety Guard menolak path basis data produksi / tanpa label staging
✔ 2. Eksekusi seeder pada DB staging sementara menghasilkan data bersih sesuai schema.sql
✔ 3. Seeder staging terbukti idempotent saat dieksekusi berulang kali
✔ 4. Safety Guard menolak eksekusi jika database target telah berisi siswa non-sintetis
ℹ tests 4 | pass 4 | fail 0

3. TRACKED SOURCE LOADERS ISOLATION TEST (node scripts/verify-tracked-loaders.js)
--------------------------------------------------------------------------------
PRAGMA foreign_key_check: CLEAN (0 violations).
PRAGMA integrity_check: ok.
master_classes: 5 kelas | master_students: 208 siswa | master_activities: 62 | quiz_items: 210.
Status: 100% CLEAN (Database uji otomatis dibersihkan).

4. ISOLATED API E2E FLOW TEST (node scripts/verify-e2e-flow.js)
--------------------------------------------------------------------------------
Status: ALL 11 ISOLATED E2E & CONTROLLED FALLBACK TESTS PASSED 100%
Port Uji: 3199 (Otomatis ditutup) | Database Uji: test_isolated_e2e.db (Otomatis dihapus).
Skor Kuis: 63/100 membuktikan kalkulasi penilaian submission backend.

5. REAL INTERACTIVE BROWSER E2E TEST (node scripts/run-browser-interactive.js)
--------------------------------------------------------------------------------
Status: ALL 10 INTERACTIVE BROWSER E2E TESTS PASSED WITH 100% STRICT ASSERTIONS
Skenario KKM: Skor 0 menahan Unit 2 terkunci, skor 100 membuka Unit 2.
Database Uji: test_browser_e2e.db (Otomatis dihapus) | Chrome Headless & Server: Ditutup bersih.
================================================================================
```

---

## 6. Known Limitations (Batasan yang Diketahui)

1. **Akun Guru Tunggal pada Dev/Staging Awal**: Konfigurasi kredensial guru saat ini diarahkan ke satu instruktur utama (`TEACHER_USERNAME=guru`). Multi-guru per kelas didukung di tabel data tetapi belum diaktifkan antarmuka pemilihan multi-guru.
2. **Akun Sintetis pada Staging**: Staging VPS direncanakan secara ketat menggunakan akun sintetis (`SYN-*`). Database lokal sekolah `purwaverse.db` (berisi data riil siswa) dilarang disalin ke staging.
3. **Penyimpanan Berkas Laporan**: Laporan LKPD tim disimpan sebagai dokumen terstruktur JSON pada tabel `group_lab` SQLite. Unggah berkas gambar/PDF belum diaktifkan pada Fase 1.
4. **Workbook Importer Belum Dijalankan**: 8 file workbook Excel (`docs/*.xlsx`) sengaja dikecualikan sesuai batasan controller dan akan diproses pada fase Content Engineering terpisah.

---

## 7. Klasifikasi Aset Khusus (Special Asset Classification)

| File Path | Status Git | Klasifikasi | Catatan & Alasan Penahanan |
|---|---|---|---|
| `public/assets/gear_small_copper.jpg` | Modified | `REVIEW_REQUIRED` | Aset visual lencana UI. Ditahan dari commit Fase 1 karena riwayat sumber/lisensi belum terdokumentasi formal. |
| `public/assets/gear_small_copper-cutout.png` | Untracked | `REVIEW_REQUIRED` | Aset grafis transparan turunan. Ditahan dari commit Fase 1 menunggu audit lisensi aset. |

---

## 8. Ringkasan Audit Keamanan & Rahasia (Secret Audit Summary)

- **Kata Sandi Runtime**: Tidak ada password guru default yang tertanam di runtime source. Runtime murni bergantung pada environment variable `TEACHER_PASSWORD_HASH` atau `TEACHER_DEV_PASSWORD`.
- **Kata Sandi Fixture Uji**: Nilai `'PasswordGuru10Char!'` hanya ada di dalam file test runner.
- **Sesi Pengguna**: Token sesi saat ini dibuat melalui `uid_()`. Hash token disimpan pada tabel SQLite `sessions`. `JWT_SECRET` belum digunakan runtime dan disiapkan untuk kemungkinan mekanisme token bertanda tangan di masa depan.
- **Data Siswa Sensitif**: Tangkapan layar dan data uji hanya menampilkan akun sintetis (`SYN-LEAD`, `SYN-DEP`, `SYN-MEM`, `SYN-TEAM-8A-01`). Tidak ada NISN atau PIN siswa asli yang terekspos.
- **Proteksi Akses Staging**: Akses staging ditetapkan sebagai **MANDATORI (REQUIRED)** menggunakan HTTP Basic Auth untuk mencegah kebocoran akun uji PIN `1234`.
- **Path Mesin Lokal**: Tidak ada hardcoded path `C:\` atau `D:\` di dalam file runtime.

---

## 9. Status Git & Rekomendasi Pengelompokan Commit (Commit Grouping)

### Status Git Aktif (Diklarifikasi Terhadap Local Tracking Reference)
- **Branch**: `main`
- **Status Referensi**: Dibandingkan terhadap local tracking ref `refs/remotes/origin/main`.
  *(Catatan: Sinkronisasi remote server secara live tidak dilakukan dalam audit lokal ini untuk mematuhi larangan koneksi jaringan eksternal).*
- **Modified (15 file)**:
  `package.json`, `.gitignore`, `public/index.html`, `public/js/course.js`, `public/js/dashboard.js`, `public/js/ui-components.js`, `server/.env.example`, `server/package.json`, `server/src/config/index.js`, `server/src/server.js`, `server/src/controllers/purwaController.js`, `server/src/services/learningService.js`, `server/src/services/securityService.js`, `server/tests/server.test.js`, `server/tests/contractAndFallback.test.js`.
- **Untracked (Clean Additions)**:
  `.env.example`, `scripts/seed-staging-synthetic.js`, `server/tests/seedStaging.test.js`, `server/tests/stagingConfig.test.js`, `scripts/run-browser-interactive.js`, `scripts/verify-e2e-flow.js`, `scripts/verify-tracked-loaders.js`, `docs/deployment/VPS_STAGING_RUNBOOK.md`, `docs/testing/VPS_STAGING_UAT.md`, `docs/reports/LMS_FIX_PHASE_1_COMPLETION.md`, `docs/reports/LMS_PHASE_1_CLOSURE_MANIFEST.md`, `docs/reports/VPS_STAGING_READINESS_AUDIT.md`, `docs/reports/screenshots/` (12 fresh + 2 old).
- **Ditahan dari Commit**:
  `public/assets/gear_small_copper.jpg`, `public/assets/gear_small_copper-cutout.png`.

### Rekomendasi 4 Commit Terpisah (Atomic & Reviewable)
1. **Commit 1: Keamanan, Konfigurasi & Autentikasi** (`fix(security)`) — **Daftar File (10 File)**:
   - `server/src/services/securityService.js`
   - `server/src/config/index.js`
   - `server/src/server.js`
   - `server/tests/auth.test.js`
   - `server/tests/server.test.js`
   - `server/tests/stagingConfig.test.js`
   - `.env.example`
   - `server/.env.example`
   - `package.json` (Root npm test delegation)
   - `.gitignore` (Allowlist 3 laporan audit resmi)
2. **Commit 2: Controlled Fallback & Validasi Aktivitas LKPD** (`feat(lms)`):
   - `server/src/services/learningService.js`
   - `server/src/controllers/purwaController.js`
   - `public/index.html`
   - `public/js/course.js`
   - `public/js/dashboard.js`
   - `public/js/ui-components.js`
   - `server/tests/contractAndFallback.test.js`
   - `server/tests/coreService.test.js`
   - `server/tests/learningService.test.js`
   - `server/package.json`
3. **Commit 3: Tooling Staging, Pengujian Otomatis & Bukti Verifikasi** (`test(e2e)`):
   - `scripts/seed-staging-synthetic.js`
   - `server/tests/seedStaging.test.js`
   - `scripts/verify-tracked-loaders.js`
   - `scripts/verify-e2e-flow.js`
   - `scripts/run-browser-interactive.js`
   - 12 fresh screenshots eksplisit:
     * `docs/reports/screenshots/1_browser_student_login.png`
     * `docs/reports/screenshots/2_browser_unit1_material.png`
     * `docs/reports/screenshots/3_browser_notebook_reported.png`
     * `docs/reports/screenshots/4_browser_teacher_verified.png`
     * `docs/reports/screenshots/5a_browser_quiz_below_kkm_locked.png`
     * `docs/reports/screenshots/5b_browser_quiz_passed_unlocked.png`
     * `docs/reports/screenshots/6a_browser_deputy_buttons_disabled.png`
     * `docs/reports/screenshots/6b_browser_leader_lkpd_draft.png`
     * `docs/reports/screenshots/7_browser_teacher_fallback_authorized.png`
     * `docs/reports/screenshots/8_browser_deputy_lkpd_submitted.png`
     * `docs/reports/screenshots/9_browser_reload_persistence.png`
     * `docs/reports/screenshots/10_browser_teacher_fallback_revoked.png`
     *(Dikecualikan dari add: `5_browser_quiz_chamber_passed.png` dan `6_browser_leader_lkpd_draft.png` tetap uncommitted/arsip).*
4. **Commit 4: Dokumentasi Audit & Panduan Staging** (`docs(reports)`):
   - `docs/reports/LMS_FIX_PHASE_1_COMPLETION.md`
   - `docs/reports/LMS_PHASE_1_CLOSURE_MANIFEST.md`
   - `docs/reports/VPS_STAGING_READINESS_AUDIT.md`
   - `docs/deployment/VPS_STAGING_RUNBOOK.md`
   - `docs/testing/VPS_STAGING_UAT.md`

### Prosedur Git Tagging Pasca-Commit (Post-Commit Baseline Tagging)
Sesuai audit controller, git tag tidak boleh dibuat sebelum commit karena tag hanya menunjuk commit objek, bukan uncommitted working tree.
Urutan yang benar:
1. Controller meninjau dan menyetujui exact diff.
2. Eksekusi 4 paket commit terpisah secara atomik.
3. Pastikan working tree dalam keadaan bersih (`git status` clean).
4. Jalankan ulang seluruh suite pengujian otomatis (`npm test`) dari titik commit tersebut.
5. Buat annotated tag resmi pada commit penutupan Fase 1:
   ```bash
   git tag -a lms-phase1-baseline-pre-staging -m "Purwaverse LMS Phase 1 verified baseline before VPS staging"
   ```

---
*Manifest dibuat secara objektif berdasarkan verifikasi fisik aktual tanpa klaim palsu.*

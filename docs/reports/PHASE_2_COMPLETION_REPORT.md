# PHASE 2 COMPLETION REPORT: DATABASE LAYER & REPOSITORY MIGRATION
**Purwaverse IPA VIII VPS Migration Project**
*Tanggal Eksekusi: 18 September 2026*

---

## 1. TABEL DIBUAT DALAM SQLITE

Seluruh 23 tabel relasional telah berhasil diimplementasikan di dalam [`server/src/database/schema.sql`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/server/src/database/schema.sql) dan diverifikasi aktif pada engine SQLite:

1. **`master_classes`**: Rombel kelas resmi (`8A` - `8E`).
2. **`master_students`**: Roster 208 siswa lengkap dengan NISN, NIS, nama, gender, nomor absen, dan hash PIN.
3. **`master_activities`**: Master materi, kuis, lab, riset, dan tantangan.
4. **`diagnostic_items`**: Bank 25 butir soal penalaran sains resmi Mission 0 beserta rubrik analitis skor 0–4.
5. **`self_map_items`**: 6 Butir instrumen pemetaan disposisi/minat sains siswa.
6. **`sessions`**: Token sesi login siswa & guru dengan masa aktif 8 jam.
7. **`progress`**: Rekam jejak ketuntasan dan status aktivitas siswa.
8. **`diagnostic_responses`**: Jawaban Mission 0 siswa dan riwayat penilaian guru.
9. **`diagnostic_profiles`**: Agregasi 5 domain, overall reasoning, leader index, dan status kesiapan riset ($R1$–$R4$).
10. **`teams`**: Header kelompok sains per kelas beserta skor keseimbangan (*balance score*).
11. **`team_members`**: Keanggotaan kelompok, jabatan (*Scientist Leader, Deputy, Lab Operator, Data Recorder, Evidence Checker, Communicator*), dan status lock/override.
12. **`group_lab`**: Laporan praktikum kelompok LKPD 11 bagian, status revisi, dan penilaian guru.
13. **`student_activity_state`**: Cache status gerbang belajar siswa per submateri.
14. **`teacher_checks`**: Riwayat validasi rangkuman buku fisik dan LKPD guru bersifat *append-only* dengan auto-increment nomor `revision`.
15. **`quiz_items`**: Bank soal kuis per submateri dengan kunci jawaban aman di server (`answer_json`).
16. **`quiz_attempts`**: Percobaan kuis siswa, skor akhir, dan status kelulusan KKM 70.
17. **`quiz_responses`**: Log pilihan jawaban siswa per butir soal per percobaan kuis.
18. **`skill_evidence`**: Rekam portofolio capaian keterampilan inkuiri Kurikulum Merdeka.
19. **`unlock_overrides`**: Rekam pengecualian/dispensasi pembukaan materi oleh guru dengan alasan supervisi.
20. **`attendance`**: Presensi harian otomatis siswa saat login di hari KBM.
21. **`settings`**: Pengaturan non-rahasia dan sinyal kebingungan siswa (`confusion|studentId|unitId`).
22. **`audit_log`**: Jejak forensik peristiwa mutasi penting sistem.
23. **`pin_issuance`**: Rekam PIN privat siswa untuk keperluan cetak kartu fisik akun (terisolasi di database lokal, tidak di-commit ke repositori git).

---

## 2. MAPPING GAS SHEET → SQLITE

| Google Sheet Name | SQLite Table Name | Primary Key | Foreign Keys & Relasi Utama | Indeks Tambahan |
|---|---|---|---|---|
| `MASTER_CLASSES` | `master_classes` | `class_id` | - | - |
| `MASTER_STUDENTS` | `master_students` | `student_id` | `class_id` $\rightarrow$ `master_classes` | `idx_students_class_roll`, `idx_students_nisn` |
| `MASTER_ACTIVITIES` | `master_activities` | `activity_id` | - | `idx_activities_unit`, `idx_activities_chapter` |
| `DIAGNOSTIC_ITEMS` | `diagnostic_items` | `item_id` | - | `idx_diag_items_domain` |
| `SELF_MAP_ITEMS` | `self_map_items` | `item_id` | - | - |
| `SESSIONS` | `sessions` | `session_id` | - | `idx_sessions_actor`, `idx_sessions_expires` |
| `PROGRESS` | `progress` | `progress_id` | `student_id` $\rightarrow$ `master_students`<br>`activity_id` $\rightarrow$ `master_activities` | `idx_progress_student`, `idx_progress_activity` |
| `DIAGNOSTIC_RESPONSES` | `diagnostic_responses` | `response_id` | `student_id` $\rightarrow$ `master_students`<br>`item_id` $\rightarrow$ `diagnostic_items` | `idx_diag_resp_student` |
| `DIAGNOSTIC_PROFILES` | `diagnostic_profiles` | `profile_id` | `student_id` $\rightarrow$ `master_students` | - |
| `TEAMS` | `teams` | `team_id` | `class_id` $\rightarrow$ `master_classes` | `idx_teams_class_version` |
| `TEAM_MEMBERS` | `team_members` | `membership_id` | `team_id` $\rightarrow$ `teams`<br>`student_id` $\rightarrow$ `master_students` | `idx_team_members_team`, `idx_team_members_student` |
| `GROUP_LAB` | `group_lab` | `lab_result_id` | `class_id` $\rightarrow$ `master_classes`<br>`activity_id` $\rightarrow$ `master_activities`<br>`team_id` $\rightarrow$ `teams` | `idx_group_lab_team`, `idx_group_lab_class_act` |
| `STUDENT_ACTIVITY_STATE` | `student_activity_state` | `state_id` | `student_id` $\rightarrow$ `master_students`<br>`activity_id` $\rightarrow$ `master_activities` | `idx_student_act_state_std` |
| `TEACHER_CHECKS` | `teacher_checks` | `check_id` | `student_id` $\rightarrow$ `master_students`<br>`activity_id` $\rightarrow$ `master_activities` | `idx_teacher_checks_student` |
| `QUIZ_ITEMS` | `quiz_items` | `quiz_item_id` | `activity_id` $\rightarrow$ `master_activities` | `idx_quiz_items_act` |
| `QUIZ_ATTEMPTS` | `quiz_attempts` | `attempt_id` | `student_id` $\rightarrow$ `master_students`<br>`activity_id` $\rightarrow$ `master_activities` | `idx_quiz_attempts_std` |
| `QUIZ_RESPONSES` | `quiz_responses` | `response_id` | `attempt_id` $\rightarrow$ `quiz_attempts`<br>`quiz_item_id` $\rightarrow$ `quiz_items` | `idx_quiz_resp_attempt` |
| `SKILL_EVIDENCE` | `skill_evidence` | `evidence_id` | `student_id` $\rightarrow$ `master_students`<br>`activity_id` $\rightarrow$ `master_activities` | `idx_skill_evidence_std` |
| `UNLOCK_OVERRIDES` | `unlock_overrides` | `override_id` | `student_id` $\rightarrow$ `master_students`<br>`activity_id` $\rightarrow$ `master_activities` | `idx_unlock_std_act` |
| `ATTENDANCE` | `attendance` | `attendance_id` | `student_id` $\rightarrow$ `master_students`<br>`class_id` $\rightarrow$ `master_classes` | `idx_attendance_class_date` |
| `SETTINGS` | `settings` | `key` | - | - |
| `AUDIT_LOG` | `audit_log` | `event_id` | - | `idx_audit_actor`, `idx_audit_created` |
| `PIN_ISSUANCE` | `pin_issuance` | `student_id` | `student_id` $\rightarrow$ `master_students`<br>`class_id` $\rightarrow$ `master_classes` | - |

---

## 3. FILE BERUBAH & FILE BARU

| File | Status | Peran & Deskripsi Perubahan |
|---|---|---|
| [`server/src/database/schema.sql`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/server/src/database/schema.sql) | **Baru** | Definisi DDL 23 tabel relasional SQLite beserta indeks pencarian dan foreign key constraints. |
| [`server/src/database/db.js`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/server/src/database/db.js) | **Diperbarui** | Penambahan fungsi auto-create schema (`initSchema`) dan transaction helper (`runTransaction`). |
| [`server/src/database/repository.js`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/server/src/database/repository.js) | **Baru** | Implementasi 1:1 fungsi DAO Spreadsheet (`rows_`, `append_`, `upsert_`, `findOne_`, `findAll_`, `deleteWhere_`, `audit_`, `hash_`, `isoNow_`, `uid_`) menjadi SQL *prepared statements*. |
| [`server/src/data/rosterData.js`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/server/src/data/rosterData.js) | **Baru** | Loader data roster 208 siswa resmi dari `gas/RosterData.gs` untuk menjamin konsistensi byte. |
| [`server/src/data/diagnosticData.js`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/server/src/data/diagnosticData.js) | **Baru** | Loader 25 butir soal Mission 0 dan 6 butir self-map dari `gas/DiagnosticData.gs`. |
| [`server/src/database/seed.js`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/server/src/database/seed.js) | **Baru** | Seeder otomatis CLI untuk kelas, aktivitas kurikulum, bank diagnostik, dan mekanisme impor 208 siswa tanpa memaparkan PIN plaintext. |
| [`server/tests/database.test.js`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/server/tests/database.test.js) | **Baru** | Test suite otomatis yang menguji 8 skenario database layer. |
| [`server/package.json`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/server/package.json) | **Diperbarui** | Penambahan skrip `"db:seed": "node src/database/seed.js"`. |
| [`package.json`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/package.json) | **Diperbarui** | Penambahan skrip helper root `"server:seed": "npm --prefix server run db:seed"`. |

---

## 4. HASIL TESTING & VERIFIKASI

Pengujian otomatis dijalankan melalui perintah:
```bash
npm run server:test
```

### Hasil Eksekusi Uji Otomatis (15 Tes, 100% LULUS):
```
> purwaverse-server@1.0.0 test
> node --test tests/**/*.test.js

▶ Database Layer & Repository Migration Test Suite
  ✔ 1. Schema berhasil dibuat dan seluruh tabel inti terdefinisi (1.6ms)
  ✔ 2. Insert & Query Master Classes (1.3ms)
  ✔ 3. Insert student & Query Student (findOne_ & findAll_) (2.1ms)
  ✔ 4. Upsert Progress (Insert baru lalu Update status/skor) (4.5ms)
  ✔ 5. Audit Log (Perekaman jejak forensik audit) (1.7ms)
  ✔ 6. Foreign Key Constraint Enforced (2.3ms)
  ✔ 7. DeleteWhere Operation (1.3ms)
  ✔ 8. Full Seeding Test (Roster 208 Siswa & 25 Soal Diagnostik) (218.0ms)
✔ Database Layer & Repository Migration Test Suite (341.2ms)
▶ Backend Skeleton & RPC Router Test Suite
  ✔ 1. GET / harus mengembalikan status online (36.7ms)
  ✔ 2. POST /api/purwa dengan action bootstrap harus mengembalikan ok: true (38.5ms)
  ✔ 3. POST /api/purwa dengan action belum dimigrasikan harus mengembalikan ok: false (17.4ms)
  ✔ 4. POST /api/purwa tanpa action harus mengembalikan error validasi (14.2ms)
  ✔ 5. Database SQLite connection & pragmas terverifikasi (28.6ms)
✔ Backend Skeleton & RPC Router Test Suite (139.3ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ duration_ms 597.5ms
```

### Hasil Verifikasi Seeding Database Utama (`purwaverse.db`):
```
🌱 [SEED] Memulai seeding database Purwaverse...
  ✔ Master classes seeded: 5 kelas (8A-8E)
  ✔ Core activities seeded: 7 aktivitas
  ✔ Diagnostic bank seeded: 25 soal, 6 self-map
  ✔ Master students imported: 208 siswa
✅ [SEED] Seeding database selesai!
```
Verifikasi record count:
- **Classes**: 5
- **Activities**: 7
- **Diagnostics**: 25
- **Students**: 208
- **PINs Terbit**: 208

---

## 5. RISIKO BERIKUTNYA & REKOMENDASI PHASE 3

1. **Autentikasi & Verifikasi PIN Siswa (Phase 3)**:
   - *Risiko*: Siswa eksisting yang memiliki hash PIN lama (format SHA-256 ber-pepper atau unpeppred) harus tetap bisa masuk tanpa reset PIN massal.
   - *Rekomendasi*: Implementasikan verifikasi berjenjang di `securityService.js`:
     1. Coba verifikasi dengan hash baru (Argon2id/Bcrypt).
     2. Jika tidak cocok, coba verifikasi dengan hash SHA-256 ber-pepper: `hash_(pepper + '|' + pin)`.
     3. Jika masih tidak cocok, coba verifikasi dengan hash unpeppred legacy: `hash_(pin)`.
     4. Jika verifikasi legacy cocok, lakukan *transparent upgrade* (re-hash PIN siswa menjadi format baru di `master_students`).
2. **Kredensial Guru**:
   - *Risiko*: Akun guru perlu dikonfigurasi melalui variabel lingkungan (`TEACHER_USERNAME`, `TEACHER_PASSWORD_HASH`, `TEACHER_PASSWORD_SALT`) tanpa menyimpan password mentah.
   - *Rekomendasi*: Sediakan skrip CLI administrasi untuk inisialisasi / reset kata sandi guru (`node src/scripts/adminAuth.js`).
3. **Penyimpanan Sesi & Throttling**:
   - *Risiko*: Brute-force serangan login PIN/password.
   - *Rekomendasi*: Terapkan middleware `express-rate-limit` khusus pada endpoint login serta gunakan tabel SQLite `sessions` dengan query prepared statement berindeks `idx_sessions_actor` dan `idx_sessions_expires` untuk pencarian token kilat (< 1ms).

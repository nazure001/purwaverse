# 🗄️ Skema Database Purwaverse
**Spesifikasi Relasional SQLite Modern (VPS) & Pemetaan Legacy Google Sheets**

Seluruh data transaksi dan konten Purwaverse menggunakan standar ISO-8601 untuk timestamp, foreign key integrity (`PRAGMA foreign_keys = ON`), dan mode penulisan konkurensi tinggi (`PRAGMA journal_mode = WAL`).

---

## 1. Skema Modern SQLite (VPS Mandiri)

Database produksi SQLite terdiri atas **34 tabel relasional** yang terbagi dalam dua domain utama:

### Domain A: 23 Tabel Inti KBM & Operasional Sekolah
| Tabel SQLite | Primary Key | Fungsi Utama |
|---|---|---|
| `master_classes` | `class_id` | Rombel kelas (fleksibel hingga rombel K, e.g. 8A s.d. 8K) |
| `master_students` | `student_id` | Roster resmi, NIS, NISN, nomor absen, Argon2id PIN hash |
| `master_activities` | `activity_id` | Katalog aktivitas KBM, tipe (`learn`, `quiz`, `lab`), bobot skor |
| `diagnostic_items` | `item_id` | 25 Butir soal diagnostik resmi Mission 0 & rubrik 0-4 |
| `self_map_items` | `item_id` | Butir angket Peta Diri Sains (disposisi & minat) |
| `sessions` | `session_id` | Token sesi siswa/guru (8 jam kedaluwarsa) |
| `progress` | `progress_id` | Status & skor per siswa-aktivitas (`student_id\|activity_id`) |
| `diagnostic_responses`| `response_id` | Jawaban diagnostik siswa & penilaian manual guru |
| `diagnostic_profiles` | `profile_id` | Agregasi 5 domain nalar, leader index, research readiness |
| `teams` | `team_id` | Header tim laboratorium per kelas (Snake Draft + 2-Opt) |
| `team_members` | `membership_id` | Anggota tim, peran (Leader, Deputy, Operator, Checker) |
| `group_lab` | `lab_result_id` | Laporan LKPD tim terisi, status verifikasi guru, skor kelompok |
| `student_activity_state`| `state_id` | Cache status gerbang belajar siswa (`locked`, `reading`, dll.) |
| `teacher_checks` | `check_id` | Log append-only pemeriksaan guru (resume buku, LKPD, remedial) |
| `quiz_items` | `quiz_item_id` | Bank butir kuis per submateri (terproteksi di server) |
| `quiz_attempts` | `attempt_id` | Percobaan kuis siswa, skor capaian, status lulus KKM 70 |
| `quiz_responses` | `response_id` | Log jawaban per butir kuis per percobaan |
| `skill_evidence` | `evidence_id` | Bukti keterampilan inkuiri Kurikulum Merdeka siswa |
| `unlock_overrides` | `override_id` | Pengecualian pembukaan materi oleh guru dengan alasan |
| `attendance` | `attendance_id` | Presensi otomatis harian siswa saat login (`student_id\|YYYY-MM-DD`) |
| `settings` | `key` | Konfigurasi non-rahasia dan sinyal kebingungan siswa |
| `audit_log` | `event_id` | Jejak forensik aksi penting pengguna tanpa menyimpan PIN |
| `pin_issuance` | `student_id` | Data PIN awal privat untuk pencetakan kartu fisik siswa |

---

### Domain B: 11 Tabel Content Engineering & Kurikulum Terstruktur
Mendukung hierarki: **Course ➔ Unit ➔ Lesson ➔ Concept ➔ Activity ➔ Evidence ➔ Assessment**:

| Tabel SQLite | Primary Key | Relasi & Fungsi |
|---|---|---|
| `courses` | `course_id` | Master kurikulum: IPA VII, VIII, IX, OSN, Riset (`grade_level`, `type`) |
| `learning_units` | `unit_id` | Bab KBM (`course_id`, `chapter_id`, `sequence_order`) |
| `concepts` | `concept_id` | Taksonomi konsep sains spiral (`domain`, `fase: D`) |
| `lessons` | `lesson_id` | Submateri terstruktur (`unit_id`, `learning_objective`, `content_markdown`, `assets_json`, `tables_json`) |
| `lesson_concepts` | `(lesson_id, concept_id)` | Relasi M:N Lesson ↔ Concept |
| `learning_activities` | `activity_id` | Aktivitas belajar mandiri & inkuiri (`lesson_id`, `evidence_type`) |
| `activity_concepts` | `(activity_id, concept_id)`| Relasi M:N Concept ↔ Activity |
| `activity_evidence_rules`| `rule_id` | Standar bukti fisik nyata (Relasi Activity ↔ Evidence) |
| `rubrics` | `rubric_id` | Kriteria penilaian kualitatif bertingkat skor 0 - 4 |
| `assessments` | `assessment_id` | Kuis formatif, rubrik resume, praktikum lab (`rubric_id`) |
| `assessment_concepts` | `(assessment_id, concept_id)`| Relasi M:N Concept ↔ Assessment |

---

## 2. Pemetaan Kompatibilitas Legacy Google Sheets

Bagi lingkungan Google Apps Script, skema di atas dipetakan ke dalam sheet dengan nama UPPERCASE. Detail normalisasi roster:

`student_id | nis | nisn | name | gender | class_id | roll_no | pin_hash | active | source_row | updated_at`

* `student_id` tidak bergantung pada nama atau NIS. Import produksi mengutamakan NISN untuk menghasilkan ID internal stabil.
* Pemeriksaan guru disimpan secara append-only dengan nomor revisi agar perubahan nilai tidak menimpa riwayat asli.
* Sinyal pemahaman memakai kunci `confusion|student_id|unit_id` pada `settings` dan tidak memengaruhi nilai atau kunci progres.

# 🏗️ PURWAVERSE CONTENT ARCHITECTURE SPECIFICATION
**Arsitektur Rekayasa Konten Pembelajaran Terstruktur & Pemetaan Konsep Sains**

**Status:** Ready for Content Ingestion (Phase 2 Preparation)  
**Database Engine:** SQLite WAL Mode (Compatible with Node.js VPS Deployment)  
**Filosofi Rujukan:** [`docs/PRODUCT_VISION.md`](../PRODUCT_VISION.md)  
**Standar Naskah:** [`docs/architecture/CONTENT_STANDARD.md`](CONTENT_STANDARD.md)

---

## 1. Latar Belakang & Prinsip Arsitektur

Purwaverse adalah Learning Management System (LMS) KBM sekolah yang berorientasi pada bukti pembelajaran nyata di dunia fisik (*evidence-based learning*). Sistem ini **bukanlah sebuah chatbot AI, bukan AI tutor, dan tidak berorientasi pada scrolling aplikasi**.

Untuk memungkinkan penerimaan konten kurikulum yang kaya dari basis pengetahuan (*knowledge base*) secara sistematis, arsitektur data dirancang dengan struktur hierarki 7 tingkat yang tegas dan berkesinambungan:

```
Course
  └── Learning Unit (Bab / Modul)
        └── Lesson (Submateri)
              ├── Concept (Node Konsep Sains Spiral)
              ├── Learning Activity (Aktivitas Penyelidikan Mandiri / Kelompok)
              │     └── Evidence (Bukti Fisik / Data Lab Asli)
              └── Assessment (Quiz Chamber KKM 70 & Rubrik Kinerja Guru)
                    └── Rubric (Kriteria Evaluasi Kualitatif 0 - 4)
```

---

## 2. Struktur Hierarki 7 Tingkat (Seven-Tier Hierarchy)

### Tier 1: Course (`courses`)
Menaungi seluruh program kurikulum sekolah maupun peminatan:
* `course_id`: Identifikasi unik (misal: `CUR-IPA-VIII-KBM`, `CUR-IPA-VII-KBM`, `CUR-IPA-IX-KBM`, `CUR-OSN-IPA`).
* `grade_level`: Tingkatan jenjang (7, 8, 9).
* `curriculum_type`: Jenis kurikulum (`school_private`, `competition`, `research_track`, `public_knowledge`).

### Tier 2: Learning Unit (`learning_units`)
Mewakili satu bab atau tema besar pembelajaran dalam kurikulum:
* `unit_id`: Kode unit stabil (misal: `CH08-01-U01`).
* `course_id`: Foreign key ke tabel `courses`.
* `chapter_id`: Kode bab (misal: `CH08-01`).
* `sequence_order`: Urutan bab dalam kalender akademik.

### Tier 3: Lesson (`lessons`)
Submateri pembelajaran terstruktur yang memuat bahan ajar lengkap:
* `lesson_id`: ID unik pelajaran (misal: `LSN-080101-01`).
* `learning_objective`: Capaian / tujuan pembelajaran konkret berakar pada Kurikulum Merdeka.
* `content_markdown`: Uraian materi 6 bagian (Tujuan, Uraian, Contoh Nyata, Koreksi Miskonsepsi, Rangkuman Kunci, Panduan Catatan Buku).
* `assets_json`: Referensi stable `asset_id`, role, placement, caption override, dan status required; file fisik diselesaikan melalui manifest aset bersama, bukan disalin per lesson.
* `tables_json`: Tabel data perbandingan atau parameter ilmiah terstruktur.

### Tier 4: Concept (`concepts`)
Node konsep sains lintas disiplin yang menghubungkan kurikulum secara spiral dari Kelas 7, 8, hingga 9:
* `concept_id`: ID konsep stabil (misal: `CON-BIO-CELL-THEORY`, `CON-PHYS-ENERGY-TRANSFORM`).
* `domain`: Domain sains (`biology`, `physics`, `chemistry`, `earth_space`, `methodology`).
* `fase`: Fase kurikulum (default `D` untuk SMP).

### Tier 5: Learning Activity (`learning_activities`)
Aktivitas fisik nyata yang wajib dilakukan siswa di kelas, lab, atau rumah:
* `activity_id`: ID aktivitas (misal: `ACT-080101-NOTE`, `ACT-080101-LAB`).
* `activity_type`: Tipe aktivitas (`reading_summary`, `lab_experiment`, `observation`, `group_discussion`).
* `instructions`: Panduan tugas nyata siswa.
* `evidence_type`: Jenis bukti yang harus diserahkan (`physical_notebook`, `lab_data_table`, `photo_artifact`).
* `requires_teacher_check`: Menandakan apakah aktivitas memerlukan verifikasi manual guru (default: 1).

### Tier 6: Evidence & Evidence Rules (`activity_evidence_rules` & `skill_evidence`)
Standar bukti fisik autentik yang membuktikan siswa telah melakukan penyelidikan nyata:
* `rule_id`: Standar aturan bukti fisik.
* `evidence_name`: Nama wujud fisik (misal: *"Buku Catatan Fisik Tertanda Guru"*).
* `verification_method`: Metode pemeriksaan guru (`teacher_physical_inspection`, `teacher_photo_review`).

### Tier 7: Assessment & Rubrics (`assessments` & `rubrics`)
Instrumen konfirmasi penguasaan konsep dan evaluasi keterampilan:
* `assessment_id`: ID asesmen (misal: `ASM-080101-QZ`, `ASM-080101-LAB`).
* `assessment_type`: `formative_quiz` (Quiz Chamber), `physical_notebook` (Pemeriksaan Buku), `performance_lab` (LKPD).
* `passing_score`: Nilai batas tuntas KKM (standar 70.0).
* `is_deterministic`: 1 untuk kuis kunci deterministik, 0 untuk penilaian berbasis rubrik guru.
* `rubric_id`: Relasi ke tabel `rubrics` untuk penilaian kualitatif skor 0–4.

---

## 3. Matriks Kesiapan Relasi Antar-Entitas

Arsitektur database relasional telah memfasilitasi relasi multi-dimensi melalui tabel relasi berikut:

| Relasi | Tabel Implementasi | Aksi Relasional | Dampak Pedagogis |
|---|---|---|---|
| **Lesson ↔ Concept** | `lesson_concepts` | M : N (Many-to-Many) | Memetakan submateri ke beberapa konsep sains spiral sekaligus. |
| **Concept ↔ Activity** | `activity_concepts` | M : N (Many-to-Many) | Menghubungkan aktivitas fisik siswa dengan pendalaman konsep tertentu. |
| **Concept ↔ Assessment** | `assessment_concepts` | M : N (Many-to-Many) | Memastikan setiap butir soal atau tugas menguji konsep yang tepat. |
| **Activity ↔ Evidence** | `activity_evidence_rules` | 1 : N (One-to-Many) | Menetapkan syarat fisik bukti sebelum aktivitas dinyatakan tuntas. |
| **Assessment ↔ Rubric** | `assessments.rubric_id` ➔ `rubrics` | N : 1 (Many-to-One) | Memberikan panduan rubrik skor 0–4 bagi guru dalam menilai kinerja. |

---

## 4. Keamanan Migrasi Database (Migration-Safe Guarantees)

Penambahan skema ini dirancang dengan prinsip ketat **Zero Regression**:

1. **Sifat Aditif Murni**: Tabel 24 s.d. 34 ditambahkan menggunakan klausa `CREATE TABLE IF NOT EXISTS`.
2. **Tidak Mengubah Tabel Existing**: Sebanyak 23 tabel KBM yang sedang berjalan (`master_students`, `master_classes`, `master_activities`, `progress`, `quiz_attempts`, `teams`, `teacher_checks`, dll.) tidak dimodifikasi atau dipangkas.
3. **Kompatibilitas Penuh VPS**: File database SQLite berjalan dengan mode `WAL` (*Write-Ahead Logging*) dan `foreign_keys = ON`, mendukung pembacaan paralel berkecepatan tinggi tanpa *table lock*.
4. **Validasi Automated Test**: Seluruh 39 test suite backend Node.js terkonfirmasi lulus 100%.

---

## 5. Hubungan dengan Format Impor Konten

Format pertukaran data dari basis pengetahuan (*knowledge base*) telah distandarisasi dalam:
* **Template JSON:** [`docs/templates/content_import_template.json`](../templates/content_import_template.json)
* **Petunjuk Impor:** [`docs/templates/CONTENT_IMPORT_GUIDE.md`](../templates/CONTENT_IMPORT_GUIDE.md)

Template ini memungkinkan tim pengembang kurikulum atau pengajar untuk menyusun naskah submateri secara modular dan mengimpornya langsung ke dalam tabel-tabel di atas tanpa perlu melakukan coding backend ulang.

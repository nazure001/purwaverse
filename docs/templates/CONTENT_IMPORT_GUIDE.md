# 📥 PANDUAN STRUKTUR & IMPOR KONTEN PEMBELAJARAN
**Purwaverse Content Engineering Standard: Connecting Knowledge Base to Classroom Reality**

Dokumen ini menjelaskan struktur data, format JSON, dan spesifikasi teknis untuk mengimpor materi kurikulum dari basis pengetahuan (*knowledge base*) ke dalam database Purwaverse tanpa merusak arsitektur yang sudah berjalan.

---

## 1. Hierarki Data Pembelajaran (Learning Hierarchy)

Struktur konten Purwaverse mengadopsi rantai relasi 7 tingkat yang menempatkan bukti pembelajaran nyata di pusat evaluasi:

```
                            [ COURSE ]
                    (Jalur Kurikulum / Jenjang)
                                │
                                ▼
                       [ LEARNING UNIT ]
                      (Bab / Modul Utama)
                                │
                                ▼
                            [ LESSON ]
                 (Submateri / Topik Pembelajaran)
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
     [ CONCEPT ]                             [ LEARNING ACTIVITY ]
(Node Konsep Sains Spiral)                  (Aktivitas Belajar Mandiri/Tim)
          │                                           │
          ├─────────────────────┐                     ▼
          ▼                     ▼                [ EVIDENCE ]
   [ ASSESSMENT ]        [ ASSESSMENT ]      (Bukti Nyata / Catatan Fisik)
(Quiz Chamber KKM 70)   (Rubrik Kinerja Lab)          │
          │                     │                     ▼
          └──────────┬──────────┘             [ VALIDASI GURU ]
                     ▼                      (Pemeriksaan Tatap Muka)
                 [ RUBRIC ]
         (Kriteria Skor 0 - 4)
```

---

## 2. Pemetaan Relasi Kunci (Key Relationships)

Arsitektur database relasional Purwaverse telah menyediakan tabel penghubung (*junction tables*) untuk mendukung relasi berikut:

| Relasi | Tabel Penghubung | Fungsi Pedagogis |
|---|---|---|
| **Lesson ↔ Concept** | `lesson_concepts` | Memetakan submateri ke node konsep sains (seperti *Teori Sel*, *Transformasi Energi*, *Sistem Peredaran*). |
| **Concept ↔ Activity** | `activity_concepts` | Menghubungkan aktivitas fisik siswa dengan penguatan konsep spesifik. |
| **Concept ↔ Assessment** | `assessment_concepts` | Memastikan butir kuis atau lembar evaluasi benar-benar mengukur konsep yang ditargetkan (bukan hafalan kata). |
| **Activity ↔ Evidence** | `activity_evidence_rules` | Menentukan jenis bukti autentik yang harus diserahkan siswa (misal: *buku catatan fisik*, *tabel data lab asli*). |
| **Assessment ↔ Rubric** | `assessments.rubric_id` ➔ `rubrics` | Mengaitkan evaluasi kinerja kualitatif dengan kriteria rubrik bertingkat skor 0–4 untuk guru. |

---

## 3. Spesifikasi Format JSON Impor Konten

Setiap unit materi yang diimpor dari knowledge base mengikuti format file [`content_import_template.json`](content_import_template.json) dengan spesifikasi field:

```json
{
  "course_id": "CUR-IPA-VIII-KBM",
  "unit_id": "CH08-01-U01",
  "lesson_id": "LSN-080101-01",
  "lesson_title": "String: Judul Submateri Lengkap",
  "sequence_order": 1,
  "learning_objective": "String: Capaian / Tujuan Pembelajaran Berbasis Kompetensi",
  "concept_ids": ["CON-01", "CON-02"],
  "content": "String (Markdown): Teks materi mendalam 6 bagian",
  "assets": [
    {
      "asset_id": "AST-01",
      "type": "svg_diagram | image_jpg | schema_png",
      "caption": "Keterangan gambar atau diagram beranotasi",
      "url_or_path": "assets/diagrams/contoh.svg",
      "alt_text": "Deskripsi aksesibilitas visual"
    }
  ],
  "tables": [
    {
      "table_id": "TBL-01",
      "title": "Judul Tabel Data Ilmiah",
      "headers": ["Kolom 1", "Kolom 2", "Kolom 3"],
      "rows": [
        ["Data A1", "Data A2", "Data A3"]
      ]
    }
  ],
  "activities": [
    {
      "activity_id": "ACT-01",
      "type": "reading_summary | lab_experiment | observation | group_discussion",
      "title": "Judul Aktivitas Belajar",
      "instructions": "Petunjuk kerja konkret untuk siswa di kelas / lab / buku catatan",
      "evidence_type": "physical_notebook | lab_data_table | photo_artifact | peer_report",
      "requires_teacher_check": true,
      "evidence_rule": {
        "rule_id": "EVR-01",
        "evidence_name": "Nama Bukti Pembelajaran",
        "format_description": "Kriteria fisik yang harus diperiksa guru",
        "verification_method": "teacher_physical_inspection | teacher_photo_review"
      }
    }
  ],
  "assessments": [
    {
      "assessment_id": "ASM-QZ-01",
      "type": "formative_quiz",
      "title": "Quiz Chamber: Uji Penguasaan Konsep",
      "passing_score": 70.0,
      "max_score": 100.0,
      "is_deterministic": true,
      "quiz_items": [
        {
          "quiz_item_id": "QZ-01",
          "question_type": "single_choice",
          "prompt": "Soal stimulus berbasis fenomena/data...",
          "options": [
            { "id": "A", "text": "Opsi A" },
            { "id": "B", "text": "Opsi B" },
            { "id": "C", "text": "Opsi C" },
            { "id": "D", "text": "Opsi D" }
          ],
          "correct_answer": "B",
          "explanation": "Pembahasan konsep ilmiah kunci...",
          "score_weight": 1.0
        }
      ]
    },
    {
      "assessment_id": "ASM-LAB-01",
      "type": "performance_lab | physical_notebook",
      "title": "Asesmen Kinerja Praktikum / Resume",
      "passing_score": 75.0,
      "max_score": 100.0,
      "is_deterministic": false,
      "rubric": {
        "rubric_id": "RUB-01",
        "title": "Rubrik Keterampilan Saintifik",
        "criteria": {
          "level_4": "Kriteria Skor 4 (Sangat Baik / Mahir)",
          "level_3": "Kriteria Skor 3 (Baik / Cakap)",
          "level_2": "Kriteria Skor 2 (Cukup / Berkembang)",
          "level_1": "Kriteria Skor 1 (Perlu Bimbingan / Awal)"
        },
        "instructions_for_teacher": "Panduan penilaian khusus bagi guru saat memeriksa fisik"
      }
    }
  ]
}
```

---

## 4. Standar 6 Bagian Wajib dalam Uraian Materi (`content`)

Sesuai standar pedagogis Purwaverse ([docs/architecture/CONTENT_STANDARD.md](../architecture/CONTENT_STANDARD.md)), setiap naskah submateri (`content`) wajib memuat minimal 6 komponen:

1. **Tujuan & Konteks Pembelajaran**: Menghubungkan topik sains dengan fenomena keseharian siswa.
2. **Uraian Materi Mendalam**: Landasan teori ilmiah yang akurat merujuk pada literatur BSE Kemendikbudristek 2021.
3. **Contoh Kontekstual Dunia Nyata**: Aplikasi nyata dalam kehidupan, ekosistem lokal, atau teknologi modern.
4. **Koreksi Miskonsepsi Sains**: Mengidentifikasi kesalahan pemahaman yang umum terjadi pada siswa dan meluruskannya dengan bukti ilmiah.
5. **Rangkuman Inti & Istilah Kunci**: Ringkasan padat dan definisi terminologi ilmiah resmi.
6. **Panduan Catatan Buku Tulis Fisik**: Instruksi terarah mengenai apa yang harus digambar atau dirangkum siswa di buku tulis fisik mereka sebelum meminta verifikasi guru.

---

## 5. Menjaga Integritas Pedagogis Sistem

Saat menyiapkan dan mengimpor konten, pastikan prinsip-prinsip berikut tetap ditegakkan:

* **Guru Tetap Validator Utama (Human-in-the-Loop)**: Kuis digital tidak boleh meluluskan siswa ke bab berikutnya jika buku catatan fisik atau data praktikum tim belum diverifikasi oleh guru.
* **Nilai Digital Bukan Satu-satunya Tolok Ukur**: Keberhasilan belajar dinilai dari kombinasi pemahaman konsep (kuis KKM 70), keaktifan kolaborasi tim (LKPD), dan kebiasaan literasi fisik (resume buku).
* **Nir-Chatbot & Nir-AI Tutor**: Dilarang menyisipkan prompt atau alur AI otomatis yang menjawabkan soal atau merangkumkan teks untuk siswa. Biarkan siswa membaca dan berpikir secara mandiri.

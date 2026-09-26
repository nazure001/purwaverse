# PURWAVERSE LMS — DATA & CONTENT MIGRATION READINESS

**Dokumen:** `docs/production/DATA_MIGRATION_READINESS.md`  
**Fase:** Content & Data Readiness (Fase 3)  
**Status Evaluasi:** `SEGREGATED & READY FOR APPROVAL`  
**Prinsip Utama:** Pemisahan mutlak Data Sistem Statis (*System Data*) dari Data Operasional Hidup (*Operational Data*).  

---

## 1. Pemetaan & Pemisahan Domain Data (Data Domain Segregation)

Untuk mencegah kontaminasi data pengujian ke lingkungan operasional sekolah, seluruh entitas data Purwaverse LMS diklasifikasikan secara ketat ke dalam dua kategori independen:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA CLASSIFICATION MATRIX                      │
├───────────────────────────────────┬────────────────────────────────────┤
│ SYSTEM DATA (Data Sistem Statis)  │ OPERATIONAL DATA (Data Hidup KBM)  │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Master Classes (8A - 8E)        │ • Master Students (207 Siswa Riil) │
│ • Chapter & Learning Units (21)   │ • Kredensial Guru & Siswa Riil     │
│ • Bank Soal Diagnostik M0 (25)    │ • Roster Penempatan Kelas          │
│ • Bank Butir Kuis HOTS (LOTS/MOTS)│ • Catatan Respon Diagnostik Siswa  │
│ • Katalog 16 LKPD Praktikum Lab   │ • Progres Belajar 21 Submateri     │
│ • Rubrik Penilaian Analitis       │ • Data Pembagian Tim (Snake Draft) │
│                                   │ • Nilai Kuis & Lembar Resume Siswa │
│                                   │ • Nilai Praktikum Kelompok LKPD    │
│                                   │ • Jejak Forensik Audit (Audit Logs)│
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Kesiapan Data Sistem (System Data Readiness)

Data sistem bersifat **idempotent**, **non-transaksional**, dan **tidak berubah selama semester berjalan**. Seluruh data sistem telah diverifikasi 100% siap untuk dimasukkan ke database produksi:

### 2.1 Master Classes (Rombel Resmi)
* **Sumber Kebenaran:** `server/src/database/seed.js`
* **Entitas:** 5 Rombel IPA Kelas 8 (`8A`, `8B`, `8C`, `8D`, `8E`) dengan tahun ajaran `2026/2027`.
* **Kesiapan:** Siap dieksekusi saat inisialisasi skema awal.

### 2.2 Silabus & Submateri Kurikulum (21 Submateri)
* **Sumber Kebenaran:** `server/src/data/learningData.js`
* **Entitas:** 21 Unit Pembelajaran mandiri yang terbagi dalam topik pencernaan, nutrisi, organ pencernaan, uji zat makanan, gangguan sistem pencernaan, dan gaya hidup sehat.
* **Kesiapan:** Telah lulus uji verifikasi visual browser dan print stylesheet A4.

### 2.3 Bank Soal Diagnostik (Mission 0)
* **Sumber Kebenaran:** `server/src/data/diagnosticData.js`
* **Entitas:** 25 butir penalaran sains yang memetakan 5 domain kompetensi:
  1. *Observe & Infer*
  2. *Evidence & Experiment*
  3. *Model & Concept*
  4. *Systems & Causality*
  5. *Technology & Design*
* **Kesiapan:** Tersedia lengkap beserta rubrik penilaian analitis skor 0–4 dan angket minat `SELF_MAP`.

### 2.4 Katalog Instrumen Praktikum (LKPD Lab)
* **Sumber Kebenaran:** `server/src/data/practiceData.js`
* **Entitas:** 16 instrumen praktikum tim sains beserta matriks peran kelompok (*Leader*, *Deputy*, *Member*) dan SOP keselamatan laboratorium.
* **Kesiapan:** Terintegrasi penuh dengan sistem *Controlled Fallback* otorisasi guru.

---

## 3. Kesiapan Data Operasional (Operational Data Readiness)

Data operasional berhubungan langsung dengan identitas siswa dan guru serta rekam jejak KBM di sekolah.

### 3.1 Status Roster Siswa Riil (207 Siswa Resmi)
* **Status Saat Ini:** `BELUM BOLEH DIIMPORT`
* **Dasar Hukum & Aturan Keselamatan:** Menghindari manipulasi data riil sebelum lingkungan produksi benar-benar stabil dan berizin.
* **Format Kredensial:** Seluruh 207 siswa memiliki NIS, NISN unik, dan PIN 4-digit awal yang akan di-hash menggunakan Argon2id + *pepper* produksi saat proses import resmi.
* **Kondisi Pengujian Staging:** Selama UAT dan staging closure, sistem HANYA menggunakan 3 akun sintetis terisolasi (`SYN001`, `SYN002`, `SYN003`) via `scripts/seed-staging-synthetic.js`.

### 3.2 Pembersihan Akun Sintetis Menjelang Produksi
Sebelum data riil dimasukkan, database produksi harus dipastikan steril:
* Menjalankan kueri pembersihan akun sintetis:
  ```sql
  DELETE FROM master_students WHERE student_id LIKE 'SYN%';
  DELETE FROM student_responses WHERE student_id LIKE 'SYN%';
  DELETE FROM diagnostic_profiles WHERE student_id LIKE 'SYN%';
  DELETE FROM student_progress WHERE student_id LIKE 'SYN%';
  DELETE FROM active_sessions WHERE student_id LIKE 'SYN%';
  ```

---

## 4. Rencana Kerja Alur Eksekusi Migrasi Data Produksi (Data Migration Workflow)

```text
[LANGKAH 1] Inisialisasi Database Produksi Baru (schema.sql)
     │
     ▼
[LANGKAH 2] Import System Data (Kelas, 21 Unit, 25 Soal M0, 16 LKPD)
     │
     ▼
[LANGKAH 3] Verifikasi Integritas Data Sistem (0 FK Violations)
     │
     ▼
[LANGKAH 4] ──► [ GATE APPROVAL PEMILIK ] (Verifikasi Roster Riil)
     │
     ▼ (Setelah Disetujui)
[LANGKAH 5] Import Roster 207 Siswa & Kredensial Guru Resmi
     │
     ▼
[LANGKAH 6] Pembuatan Snapshot Baseline Produksi (/var/backups/purwaverse/)
```

---

## 5. Kesimpulan Kesiapan Data

Pemisahan arsitektural antara Data Sistem dan Data Operasional telah tuntas. Sistem tidak mengandung data sintetis pada konfigurasi produksi dan siap menyerap data siswa resmi begitu izin tertulis (*written approval*) diterbitkan.

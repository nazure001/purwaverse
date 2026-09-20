# 📚 Purwaverse Documentation Hub
**Pusat Dokumentasi Resmi & Spesifikasi Teknis Purwaverse IPA VIII**

Selamat datang di direktori dokumentasi Purwaverse. Seluruh dokumen teknis, panduan operasional, spesifikasi arsitektur, dan laporan riwayat proyek telah dikelompokkan secara terstruktur agar mudah diakses sesuai kebutuhan peran Anda.

---

## 🧭 Peta Struktur Dokumentasi

```
docs/
├── README.md                            # Dokumen Hub & Katalog Indeks (Halaman ini)
│
├── architecture/                        # Spesifikasi Arsitektur, Skema, & Kurikulum
│   ├── FUTURE_ARCHITECTURE.md           # Blueprint masa depan (Multi-Curriculum, RBAC, Concept Map)
│   ├── SCHEMA.md                        # Struktur skema database SQLite modern & relasi tabel
│   └── CONTENT_STANDARD.md              # Standar penulisan materi IPA, taksonomi, & LKPD
│
├── deployment/                          # Panduan Rilis VPS & Handover Migrasi
│   ├── PANDUAN_MIGRASI_VPS.md           # Panduan instalasi VPS (Ubuntu, Nginx, PM2, SSL, WAL)
│   ├── PURWAVERSE_MIGRATION_HANDOVER.md # Spesifikasi teknis serah terima arsitektur komprehensif
│   └── PURWAVERSE_VPS_MIGRATION_STATUS.md # Checklist kesiapan & pelacakan status migrasi VPS
│
├── operations/                          # Panduan Praktis & Prosedur Operasional
│   ├── WIKI_OPERASIONAL.md              # SOP guru, alur KBM harian, validasi resume, & lab tim
│   └── INTEGRATION_CHECKLIST.md         # Checklist verifikasi integrasi sistem & anti-regresi
│
├── reports/                             # Riwayat Milestone & Laporan Perkembangan Proyek
│   ├── PHASE_1_COMPLETION_REPORT.md     # Phase 1: Backend Scaffolding & Database SQLite
│   ├── PHASE_2_COMPLETION_REPORT.md     # Phase 2: Modern Frontend & RPC Protocol
│   ├── PHASE_3_COMPLETION_REPORT.md     # Phase 3: Production Hardening & Rate Limiting
│   ├── PHASE_4_COMPLETION_REPORT.md     # Phase 4: Industrial UI Polish & Visual QA
│   └── PHASE_5_COMPLETION_REPORT.md     # Phase 5: Clean Git Separation & Dual Architecture
│
└── [Buku BSE & Referensi Kurikulum]/   # Sumber Literatur Resmi Pemerintah
    ├── Kelas 7/                         # Buku teks IPA Kurikulum Merdeka / K13 Kelas 7 (PDF)
    ├── Kelas 8/                         # Buku teks IPA Kurikulum Merdeka / K13 Kelas 8 (PDF)
    └── Kelas 9/                         # Buku teks IPA Kurikulum Merdeka / K13 Kelas 9 (PDF)
```

---

## 📂 Katalog Dokumen Berdasarkan Kategori

### 1. 🏛️ Arsitektur & Standar Kurikulum (`docs/architecture/`)
* **[FUTURE_ARCHITECTURE.md](architecture/FUTURE_ARCHITECTURE.md)**  
  Pedoman arsitektur masa depan untuk ekspansi spektrum lengkap **Fase D SMP (Kelas 7, 8, dan 9)**, diferensiasi 4 User Type (`STUDENT`, `PUBLIC_USER`, `TEACHER`, `ADMIN`), multi-track kurikulum (KBM Sekolah, OSN, Riset, PurwaWiki), transisi ke *Spiral Concept Mapping*, serta checklist anti-pattern database.
* **[SCHEMA.md](architecture/SCHEMA.md)**  
  Struktur relasional tabel database modern SQLite (`master_students`, `master_activities`, `user_progress`, `quiz_attempts`, `sessions`, `teacher_validations`, `science_teams`), indeks performa, dan relasi integritas data.
* **[CONTENT_STANDARD.md](architecture/CONTENT_STANDARD.md)**  
  Pedoman penyusunan konten materi IPA VIII berstandar saintifik: struktur uraian materi, klarifikasi miskonsepsi, rubrik resume buku fisik, dan protokol LKPD tim lab.

### 2. 🚀 Deployment & Migrasi (`docs/deployment/`)
* **[PANDUAN_MIGRASI_VPS.md](deployment/PANDUAN_MIGRASI_VPS.md)**  
  Langkah demi langkah teknis menyiapkan server Ubuntu VPS mandiri: konfigurasi Node.js LTS, systemd/PM2, reverse proxy Nginx, optimasi SQLite WAL mode, SSL Let's Encrypt, firewall UFW, dan rotasi backup harian.
* **[PURWAVERSE_MIGRATION_HANDOVER.md](deployment/PURWAVERSE_MIGRATION_HANDOVER.md)**  
  Dokumen acuan utama (*single source of truth*) yang mendeskripsikan secara tuntas seluruh arsitektur sistem, algoritma pembentukan tim (Snake Draft + 2-Opt), mekanisme keamanan sesi, kontrak API RPC, dan business invariants.
* **[PURWAVERSE_VPS_MIGRATION_STATUS.md](deployment/PURWAVERSE_VPS_MIGRATION_STATUS.md)**  
  Pelacak status kesiapan migrasi, metrik verifikasi fungsional, inventaris file sistem, dan matriks pemenuhan checklist produksi.

### 3. ⚙️ Operasional & SOP (`docs/operations/`)
* **[WIKI_OPERASIONAL.md](operations/WIKI_OPERASIONAL.md)**  
  Buku panduan lengkap untuk guru IPA dan operator kelas: alur pelaksanaan KBM, panduan pemeriksaan buku rangkuman, penilaian diagnostik kualitatif Mission 0, pembentukan tim laboratorium, evaluasi LKPD kelompok, dan prosedur penanganan kendala kelas.
* **[INTEGRATION_CHECKLIST.md](operations/INTEGRATION_CHECKLIST.md)**  
  Checklist pra-rilis dan audit anti-regresi untuk memverifikasi fungsionalitas login, pembatasan hak akses guru, determinisme kuis, pencatatan progres, dan konsistensi lintas modul.

### 4. 📋 Laporan Tahapan Milestone (`docs/reports/`)
* **[PHASE_1_COMPLETION_REPORT.md](reports/PHASE_1_COMPLETION_REPORT.md)**: Scaffolding backend Node.js, pemodelan SQLite, migrasi data siswa, dan automated test harness.
* **[PHASE_2_COMPLETION_REPORT.md](reports/PHASE_2_COMPLETION_REPORT.md)**: Integrasi antarmuka modern Vanilla CSS/JS, layer RPC API, dan dual-session compatibility.
* **[PHASE_3_COMPLETION_REPORT.md](reports/PHASE_3_COMPLETION_REPORT.md)**: Hardening keamanan (Argon2id, helmet security headers, rate limiting, anti-tamper).
* **[PHASE_4_COMPLETION_REPORT.md](reports/PHASE_4_COMPLETION_REPORT.md)**: Penyempurnaan estetika industrial blueprint, perbaikan kontras visual, dan validasi fungsional menyeluruh.
* **[PHASE_5_COMPLETION_REPORT.md](reports/PHASE_5_COMPLETION_REPORT.md)**: Pemisahan bersih stack modern VPS dengan legacy Google Apps Script (GAS) dan panduan instalasi independen.

---

## 🎯 Panduan Memilih Dokumen Sesuai Peran Anda

| Peran Anda | Dokumen Rekomendasi Utama | Fokus Utama |
|---|---|---|
| **Guru IPA / Pengajar** | [`operations/WIKI_OPERASIONAL.md`](operations/WIKI_OPERASIONAL.md)<br>[`architecture/CONTENT_STANDARD.md`](architecture/CONTENT_STANDARD.md) | Panduan mengajar, validasi resume buku fisik siswa, rubrik LKPD, pemantauan miskonsepsi. |
| **DevOps / Sysadmin** | [`deployment/PANDUAN_MIGRASI_VPS.md`](deployment/PANDUAN_MIGRASI_VPS.md)<br>[`deployment/PURWAVERSE_VPS_MIGRATION_STATUS.md`](deployment/PURWAVERSE_VPS_MIGRATION_STATUS.md) | Setup VPS Ubuntu, PM2 runtime, konfigurasi Nginx reverse proxy, SSL, SQLite backup. |
| **Software Engineer** | [`architecture/FUTURE_ARCHITECTURE.md`](architecture/FUTURE_ARCHITECTURE.md)<br>[`deployment/PURWAVERSE_MIGRATION_HANDOVER.md`](deployment/PURWAVERSE_MIGRATION_HANDOVER.md)<br>[`architecture/SCHEMA.md`](architecture/SCHEMA.md) | Memahami arsitektur internal, protokol RPC, algoritma pembentukan tim, dan relasi database. |
| **Penyusun Soal & Konten** | [`architecture/CONTENT_STANDARD.md`](architecture/CONTENT_STANDARD.md)<br>[`architecture/FUTURE_ARCHITECTURE.md`](architecture/FUTURE_ARCHITECTURE.md) | Standar naskah materi, format stimulasi kuis HOTS, integrasi konsep interdisipliner. |

---
*Kembali ke [README Utama Repositori](../README.md)*

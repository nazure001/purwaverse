# PURWAVERSE FUTURE ARCHITECTURE SPECIFICATION
## Pre-Deployment Blueprint & Extensibility Guide
**Version:** 1.0.0 (Pre-Deployment Phase 1 Review)  
**Status:** Architectural Blueprint & Extension Strategy  
**Focus:** Non-breaking modular foundation for future multi-curriculum & public access.

---

## 1. Posisi & Karakter Purwaverse: LMS Core Engine

Purwaverse didesain secara fundamental sebagai **Immersive Learning Management System (LMS)** untuk kegiatan belajar mengajar (KBM) sains berbasis bukti (*evidence-based scientific learning*), **BUKAN sebuah AI Chatbot atau platform generatif**.

```
                           ┌─────────────────────────────────────────┐
                           │      PURWAVERSE LMS CORE ENGINE         │
                           └────────────────────┬────────────────────┘
                                                │
         ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
         ▼                  ▼                   ▼                   ▼                  ▼
   [ Materi & Teori ]  [ Progres KBM ]  [ Lembar Resume ]   [ Quiz Chamber ]    [ LKPD Tim Lab ]
   Observasi Ilmiah    21 Unit Mandiri  Validasi Guru       HOTS & Anti-Cheat   Kolaborasi Nyata
```

### Prinsip Inti:
1. **Edukasi Mengarahkan Teknologi (80% Edukasi, 20% Industrial Atmosphere)**: Desain visual industrial blueprint berfungsi sebagai wadah inspiratif dan penguat fokus belajar, bukan gimik game.
2. **Human-in-the-Loop (Peran Guru Sentral)**: Kelulusan unit, pengesahan tim, dan evaluasi eksperimen tetap berada di tangan instruktur/guru, bukan digantikan oleh AI otomatis.
3. **Stabilitas KBM Prioritas Tertinggi**: Segala bentuk penambahan di masa depan tidak boleh mendestabilisasi operasional KBM kelas harian.

---

## 2. User Access Layer (RBAC Extensibility)

Saat ini, sistem berjalan untuk lingkungan tertutup sekolah (`STUDENT` dan `TEACHER`). Untuk mendukung keterbukaan di masa depan tanpa mengubah arsitektur keamanan yang ada, dirancang 4 lapisan hak akses:

```
               ┌────────────────────────────────────────────────────────┐
               │                  USER ACCESS HIERARCHY                 │
               └───────────────────────────┬────────────────────────────┘
                                           │
         ┌───────────────────┬─────────────┴─────────────┬───────────────────┐
         ▼                   ▼                           ▼                   ▼
   [ STUDENT ]        [ PUBLIC_USER ]               [ TEACHER ]          [ ADMIN ]
   - Roster Kelas     - Registrasi Bebas            - Verifikasi KBM    - System Config
   - Jalur KBM IPA    - Akses PurwaWiki             - Bimbingan Siswa   - Backup & Seed
   - Progres Terikat  - Modul Terbuka Publik        - Command Center    - Manajemen Akses
```

### Spesifikasi Tipe Pengguna:
1. **`STUDENT` (Siswa KBM Sekolah)**
   * Berasal dari roster kelas resmi (`master_students`).
   * Terikat pada `class_id` (8A s.d. 8E) dan nomor absen.
   * Mengikuti alur berjenjang: *Baca → Rangkum Buku → Kuis → Praktik Tim*.
   * Membawa riwayat progres hasil migrasi Google Apps Script.
2. **`PUBLIC_USER` (Pengguna Publik / Mandiri)**
   * Registrasi mandiri via email/username.
   * **Tidak memiliki akses ke KBM private sekolah**, data roster, nilai kelas, atau LKPD tim internal.
   * Memiliki akses ke modul pengetahuan terbuka (*PurwaWiki*) dan tryout publik.
3. **`TEACHER` (Guru / Instruktur Laboratorium)**
   * Mengelola kelas KBM yang ditugaskan (`TEACHER_CLASSES`).
   * Mengakses *Teacher Command Center*, memvalidasi resume buku, menilai LKPD tim, dan memantau intervensi miskonsepsi.
4. **`ADMIN` (Administrator Sistem & Sekolah)**
   * Mengelola konfigurasi server, backup database, migrasi data, dan manajemen kurikulum.

---

## 3. Curriculum Layer (Multi-Track Architecture)

Sistem saat ini melayani kurikulum tunggal: **IPA VIII KBM (Semester 1 & 2)**.  
Ke depan, engine Purwaverse akan mampu menaungi beberapa *track* secara berdampingan dalam satu database tanpa percampuran logika penilaian:

```
                                    ┌──────────────────────┐
                                    │   CURRICULUM LAYER   │
                                    └──────────┬───────────┘
                                               │
         ┌─────────────────────┬───────────────┴───────────────┬─────────────────────┐
         ▼                     ▼                               ▼                     ▼
   [ KBM SEKOLAH ]       [ OLIMPIADE ]                 [ RESEARCH ACADEMY ]    [ PURWAWIKI ]
   IPA VIII Terpadu      OSN / Sains Prestasi          KTI / OPSI / KIR        Knowledge Base
   type: school_private  type: competition             type: research_track    type: public_knowledge
```

### Konsep Skema Data Kurikulum Masa Depan:
```sql
-- TABEL PERSIAPAN MASA DEPAN (Belum perlu dibuat sekarang)
CREATE TABLE IF NOT EXISTS curricula (
    curriculum_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,           -- 'school_private', 'competition', 'research_track', 'public_knowledge'
    description TEXT,
    access_level TEXT DEFAULT 'enrolled', -- 'public', 'enrolled', 'invitation_only'
    icon_asset TEXT,
    active INTEGER DEFAULT 1
);
```

### Strategi Partisi Progres:
Aktivitas pembelajaran pada tabel `master_activities` dapat diperluas dengan menambahkan kolom nullable:
```sql
ALTER TABLE master_activities ADD COLUMN curriculum_id TEXT DEFAULT 'CUR-IPA-VIII-KBM';
```
Dengan demikian:
* Siswa KBM hanya melihat aktivitas `CUR-IPA-VIII-KBM`.
* Peringkat (*leaderboard*) dan rapor progres tidak akan tercampur antar-kurikulum.

---

## 4. Struktur Materi: Dari Hierarki Bab ke Concept Mapping

### Kondisi Saat Ini (Hierarki Bab KBM):
`Semester → Bab (Chapter) → Unit Pembelajaran → Aktivitas (Learn / Quiz / Lab)`

### Desain Masa Depan (Lesson → Concept Mapping):
Kurikulum Merdeka dan asesmen sains modern menuntut pemahaman lintas disiplin. Satu topik tidak boleh terisolasi hanya dalam satu bab kaku.

```
       [ Lesson: Fotosintesis ]
                  │
        ┌─────────┼─────────┬─────────┐
        ▼         ▼         ▼         ▼
     [ Sel ] [Kloroplas] [ Energi ] [Reaksi Kimia]
   (Bio Sel)  (Organel)  (Fisika)    (Kimia Zat)
```

### Jembatan Skema Konsep Masa Depan:
Tanpa membongkar tabel `master_activities`, relasi konsep dapat dibangun menggunakan tabel relasi many-to-many:
```sql
-- TABEL PERSIAPAN MASA DEPAN (Belum perlu dibuat sekarang)
CREATE TABLE IF NOT EXISTS concepts (
    concept_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,          -- e.g., 'biology', 'physics', 'chemistry'
    description TEXT
);

CREATE TABLE IF NOT EXISTS activity_concepts (
    activity_id TEXT NOT NULL REFERENCES master_activities(activity_id),
    concept_id TEXT NOT NULL REFERENCES concepts(concept_id),
    weight REAL DEFAULT 1.0,
    PRIMARY KEY (activity_id, concept_id)
);
```
**Keuntungan**:
* Analitik guru masa depan dapat mendeteksi: *"Siswa lemah di konsep Transformasi Energi, baik di Bab 1 (Sel) maupun Bab 5 (Pesawat Sederhana)"*.
* Tidak mengganggu alur pembacaan bab IPA VIII yang sedang berjalan saat ini.

---

## 5. PurwaWiki Preparation (Knowledge Base vs Course LMS)

PurwaWiki dirancang sebagai repositori ensiklopedia sains terbuka, berbeda fungsinya dengan Course LMS.

| Pembeda | Course LMS (Purwaverse KBM) | PurwaWiki (Public Knowledge) |
|---|---|---|
| **Karakter** | Jalur belajar terstruktur & berurutan | Ensiklopedia bebas dijelajahi (*hyperlinked*) |
| **Akses** | Memerlukan login kelas & otorisasi | Publik / Terbuka tanpa hambatan |
| **Asesmen** | Kuis KKM 70, Resume Buku, LKPD Kelompok | Tanpa ujian formal (fokus pengayaan/literasi) |
| **Penyimpanan** | Transaksional SQLite (Stateful) | Dokumen Artikel Markdown/HTML (Read-Mostly) |

### Skema Persiapan PurwaWiki (Masa Depan):
```sql
CREATE TABLE IF NOT EXISTS wiki_articles (
    article_id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    content_markdown TEXT NOT NULL,
    primary_concept_id TEXT,
    reading_time_minutes INTEGER DEFAULT 3,
    status TEXT DEFAULT 'published',
    published_at TEXT DEFAULT (datetime('now'))
);
```

---

## 6. Daftar Anti-Pattern & Field yang Jangan Dikunci (Critical Checklist)

Untuk memastikan kode saat ini ramah pengembangan masa depan (*future-proof*), hindari praktik berikut:

1. **JANGAN mengunci kolom `class_id` sebagai NOT NULL di tabel global.**
   * *Alasan*: User umum, peneliti, dan administrator tidak memiliki kelas.
   * *Status di Schema*: Tabel `sessions` sudah tepat (`class_id TEXT NULL`). Pertahankan ini.
2. **JANGAN mengurai (parse) ID dengan pemotongan karakter kaku (e.g. `id.slice(0, 7)`).**
   * *Alasan*: Asumsi bahwa semua kode unit selalu `CH08-xx-Uxx` akan pecah ketika ada kurikulum baru seperti `OSN-01-U01` atau `KTI-BIO-01`.
   * *Status*: Gunakan field `chapter_id` atau relasi eksplisit, bukan manipulasi string ID.
3. **JANGAN membatasi tipe aktivitas secara mutlak di SQL CHECK Constraint.**
   * *Alasan*: Jika tabel `master_activities` diberi `CHECK(type IN ('learn', 'quiz', 'lab'))`, maka penambahan tipe `wiki_ref`, `case_study`, atau `simulation` di masa depan akan memerlukan migrasi tabel destruktif.
4. **JANGAN menggabungkan leaderboard publik dengan leaderboard KBM.**
   * *Alasan*: Siswa KBM sekolah membutuhkan evaluasi berbasis kelas internal (8A-8E). User publik tidak boleh menggeser posisi akademik siswa sekolah.
5. **JANGAN memasukkan logika AI ke dalam critical path evaluasi kuis.**
   * *Alasan*: Penilaian kuis KBM IPA VIII harus deterministik, terverifikasi kunci jawabannya, dan bebas halusinasi LLM. AI hanya boleh digunakan sebagai asisten guru atau pemberi umpan balik formatif opsional di Phase 2.

---

## 7. Matriks Analisis Risiko Ekstensi Masa Depan

| Skenario Ekstensi | Potensi Risiko | Tingkat Risiko | Strategi Mitigasi Terencana |
|---|---|---|---|
| **Multi-Curriculum** | Database membengkak; data siswa KBM tercampur dengan peserta non-sekolah. | **Sedang** | Terapkan partisi `curriculum_id` pada query dan repository layer. Filter default selalu `CUR-IPA-VIII-KBM`. |
| **PurwaWiki Terbuka** | Beban baca database tinggi akibat artikel diakses publik luas; cache lambat. | **Rendah** | Sajikan artikel PurwaWiki via Static Site Generation / Edge Cache (Nginx/Vercel), bukan query SQLite berulang. |
| **Public Registration** | Spam pendaftaran; bot scraping; percobaan pembobolan PIN siswa KBM. | **Tinggi** | Pisahkan endpoint pendaftaran publik dari endpoint login siswa. Tambahkan Cloudflare Turnstile / Captcha & rate limiting ketat. |
| **Learning Analytics & AI** | Latensi request meningkat tajam jika AI dipanggil sinkron; biaya token melonjak. | **Sedang** | Jalankan pemrosesan analitik secara asinkron (*background job*). Guru melihat insight dari cache hasil agregasi. |

---

## 8. Urutan Prioritas Implementasi

```
[ P0: Deployment VPS Stabil ]
  ├── Nginx, PM2, SQLite WAL, SSL Let's Encrypt, Security Headers
  │
  └── [ P1: Konten IPA VIII KBM ]
        ├── Masukkan teks materi lengkap Bab 1 - 6
        ├── Perkaya butir soal Kuis Chamber (HOTS & Stimulus)
        │
        └── [ P2: Finalisasi Migrasi GAS & Backup ]
              ├── Backup master Google Sheets
              ├── Uji integritas data roster 207 siswa
              │
              └── [ P3: Future Extension Layer ]
                    ├── PurwaWiki Engine
                    ├── Multi-track Olimpiade & Research
                    └── AI Teacher Co-Pilot (Phase 2)
```

> **Kesimpulan Mandat**: Seluruh fondasi arsitektur di atas telah selaras. Tidak ada kode berjalan yang diubah atau dirusak pada tahapan ini. Stabilitas KBM Phase 1 tetap terjaga 100%.

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
4. **Filosofi Belajar Nyata**: Gawai (HP) adalah alat bantu penunjang, bukan pusat belajar. Aktivitas fisik di buku catatan dan penyelidikan laboratorium tetap menjadi inti kompetensi. Selengkapnya tertuang pada **[`docs/PRODUCT_VISION.md`](../PRODUCT_VISION.md)**.

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

## 3. Curriculum Layer (Multi-Track & Multi-Grade Architecture)

Sistem saat ini aktif melayani satu jenjang: **IPA VIII KBM (Semester 1 & 2)** sebagai MVP produksi.  
Ke depan, engine Purwaverse disiapkan untuk menaungi seluruh spektrum **Fase D SMP Terpadu (Kelas 7, 8, dan 9)** serta multi-track peminatan sains berdampingan dalam satu database tanpa percampuran logika penilaian:

```
                                    ┌──────────────────────┐
                                    │   CURRICULUM LAYER   │
                                    └──────────┬───────────┘
                                               │
          ┌────────────────────────────────────┴───┬──────────────────────┬──────────────────────┐
          ▼                                        ▼                      ▼                      ▼
    [ KBM SEKOLAH ]                          [ OLIMPIADE ]          [ RESEARCH ACADEMY ]   [ PURWAWIKI ]
    Fase D SMP Terpadu                       OSN / Sains Prestasi   KTI / OPSI / KIR       Knowledge Base
    type: school_private                     type: competition      type: research_track   type: public_knowledge
          │
    ┌─────┴──────────────────┬──────────────────────┐
    ▼                        ▼                      ▼
  [ KELAS 7 ]              [ KELAS 8 ]            [ KELAS 9 ]
  Fondasi & Observasi      Inti & Eksplorasi      Sintesis & Lanjutan
  `CUR-IPA-VII-KBM`        `CUR-IPA-VIII-KBM`     `CUR-IPA-IX-KBM`
  (BSE Kls 7: 18 PDF)      (BSE Kls 8: 14 PDF)    (BSE Kls 9: 10 PDF)
```

### Matriks Rencana Jenjang Fase D SMP (Kelas 7, 8, 9):

| Jenjang | Kurikulum ID | Karakteristik & Fokus Pembelajaran | Sumber Literatur Repo | Status |
|---|---|---|---|---|
| **Kelas 7**<br>*(Fase D Awal)* | `CUR-IPA-VII-KBM` | **Fondasi Sains & Observasi Nyata:**<br>• Hakikat sains, keselamatan kerja, & pengukuran alat lab fisik.<br>• Zat dan perubahannya (wujud, suhu, kalor, pemuaian).<br>• Gerak lurus & gaya dasar.<br>• Klasifikasi makhluk hidup & mikroskop dasar.<br>• Ekologi, interaksi makhluk hidup, & keanekaragaman hayati.<br>• Bumi dan tata surya. | [`docs/Kelas 7/`](../Kelas%207/)<br>*(18 Buku BSE K13/KTSP)* | *Future Ready (Skema Siap)* |
| **Kelas 8**<br>*(Fase D Menengah)* | `CUR-IPA-VIII-KBM` | **Inti Penyelidikan & Mekanika Tubuh/Benda (MVP):**<br>• Pengenalan sel & mikroskop lanjutan.<br>• Struktur & fungsi tubuh (pencernaan, sirkulasi, pernapasan, ekskresi).<br>• Usaha, energi, & pesawat sederhana.<br>• Getaran, gelombang, & cahaya (optik).<br>• Unsur, senyawa, campuran, & zat aditif/adiktif.<br>• Struktur bumi, lempeng tektonik, & kebencanaan. | [`docs/Kelas 8/`](../Kelas%208/)<br>*(14 Buku BSE K13/KTSP)* | **Aktif Berjalan (Production MVP)** |
| **Kelas 9**<br>*(Fase D Akhir)* | `CUR-IPA-IX-KBM` | **Sintesis Abstrak & Transisi Fase E (SMA):**<br>• Sistem reproduksi manusia & perkembangbiakan makhluk hidup.<br>• Pewarisan sifat (genetika Mendel, DNA, & bioteknologi dasar).<br>• Listrik statis & dinamis (arus, tegangan, hambatan, daya).<br>• Kemagnetan & induksi elektromagnetik.<br>• Bioteknologi pangan konvensional & modern.<br>• Partikel penyusun materi (atom, ion, molekul) & tanah bagi kehidupan. | [`docs/Kelas 9/`](../Kelas%209/)<br>*(10 Buku BSE K13/KTSP)* | *Future Ready (Skema Siap)* |

### Konsep Skema Data Kurikulum Multi-Grade:
```sql
-- TABEL PERSIAPAN MASA DEPAN (Belum perlu dibuat sekarang)
CREATE TABLE IF NOT EXISTS curricula (
    curriculum_id TEXT PRIMARY KEY,       -- e.g. 'CUR-IPA-VII-KBM', 'CUR-IPA-VIII-KBM', 'CUR-IPA-IX-KBM'
    name TEXT NOT NULL,                  -- e.g. 'IPA Terpadu Kelas 7 (Fase D)'
    grade_level INTEGER NOT NULL,        -- 7, 8, atau 9
    type TEXT NOT NULL,                  -- 'school_private', 'competition', 'research_track', 'public_knowledge'
    description TEXT,
    access_level TEXT DEFAULT 'enrolled',-- 'public', 'enrolled', 'invitation_only'
    icon_asset TEXT,
    active INTEGER DEFAULT 1
);
```

### Konvensi Penamaan ID Modul per Jenjang:
Untuk mencegah benturan data, format ID bab dirancang berstandar:
* **Kelas 7:** Bab `CH07-01` s.d. `CH07-06`, Unit `CH07-01-U01`, dsb.
* **Kelas 8:** Bab `CH08-01` s.d. `CH08-06`, Unit `CH08-01-U01`, dsb. *(Format aktif MVP saat ini tetap dipertahankan utuh)*.
* **Kelas 9:** Bab `CH09-01` s.d. `CH09-06`, Unit `CH09-01-U01`, dsb.

### Strategi Partisi Progres & Roster:
1. **Isolasi Rombel Fleksibel (Cohorts hingga Rombel K):**
   * Di lingkungan sekolah nyata, rombel kelas tidak dibatasi hanya A–E, melainkan dapat mencapai rombel **K** (misal `7A` s.d. `7K`, `8A` s.d. `8K`, `9A` s.d. `9K`).
   * Skema database `master_classes.class_id` bertipe `TEXT PRIMARY KEY` tanpa pembatasan regex alfabetis, sehingga mampu menampung rombel dinamis secara native.
   * Siswa KBM terikat pada rombelnya masing-masing secara independen.
2. **Multi-Class Teaching Authorization:**
   * Guru IPA yang mengajar beberapa jenjang dan banyak rombel diberikan akses via konfigurasi `TEACHER_CLASSES` (misal: `TEACHER_CLASSES=8A,8B,8C,8D,8E,8F,8G,8H,8I,8J,8K`) atau array dinamis tanpa merusak isolasi data antar-tingkatan.
3. **Pemisahan Leaderboard:**
   * Papan peringkat KBM difilter per `grade_level` dan dapat difilter per rombel kelas. Nilai kuis siswa kelas 7 tidak akan dibandingkan atau menggeser posisi siswa kelas 8 atau 9.

---

## 4. Struktur Materi: Dari Hierarki Bab ke Spiral Concept Mapping

### Kondisi Saat Ini (Hierarki Bab KBM Kelas 8):
`Semester → Bab (Chapter) → Unit Pembelajaran → Aktivitas (Learn / Quiz / Lab)`

### Desain Masa Depan: Kurikulum Spiral Fase D (Kelas 7 ➔ 8 ➔ 9)
Sesuai prinsip Kurikulum Merdeka, sains diajarkan secara **spiral**: konsep yang sama diperkenalkan secara konkret di Kelas 7, diperdalam mekanismenya di Kelas 8, dan disintesis secara abstrak di Kelas 9.

```
                    SPIRAL CONCEPT CONTINUITY (FASE D)
                   ═══════════════════════════════════

   [ TEMA ]               [ KELAS 7 ]            [ KELAS 8 ]              [ KELAS 9 ]
  ───────────────────────────────────────────────────────────────────────────────────────
   Biologi          →  Klasifikasi Makhluk   →  Struktur & Fungsi    →  Pewarisan Sifat &
                       & Sel Mikroskopik        Organ Tubuh Manusia     Genetika / Reproduksi
                                
   Fisika           →  Gerak Lurus, Gaya,    →  Usaha, Energi, &     →  Listrik Statis/Dinamis
                       Suhu, & Kalor            Gelombang/Optik         & Kemagnetan

   Kimia            →  Wujud Zat, Unsur,     →  Zat Aditif/Adiktif   →  Partikel Materi
                       Senyawa, Campuran        & Larutan Nutrisi       (Atom, Ion, Molekul)

   Bumi & Antariksa →  Tata Surya & Posisi   →  Litosfer, Gempa, &   →  Struktur Tanah &
                       Bumi di Semesta          Gunung Berapi           Kelestarian Hayati
```

### Contoh Keterhubungan Node Konsep Lintas Jenjang:
Sebuah node konsep, misalnya **"Transformasi Energi"**, dapat terhubung ke berbagai unit di ketiga jenjang:
* **Kelas 7:** Kalor & Pemuaian (Fisika Zat).
* **Kelas 8:** Fotosintesis Tumbuhan & Respirasi Seluler (Biologi Tubuh), serta Usaha & Pesawat Sederhana (Mekanika).
* **Kelas 9:** Energi Listrik, Daya, & Pemanfaatan Energi Ramah Lingkungan (Elektro & Teknologi).

```
                            [ Concept: Transformasi Energi ]
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
    [ Kelas 7: Kalor ]          [ Kelas 8: Fotosintesis ]      [ Kelas 9: Listrik & Daya ]
     (CH07-02-U03)                 (CH08-01-U03)                  (CH09-03-U02)
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
   * *Alasan*: Siswa KBM sekolah membutuhkan evaluasi berbasis kelas internal. User publik tidak boleh menggeser posisi akademik siswa sekolah.
5. **JANGAN memasukkan logika AI ke dalam critical path evaluasi kuis.**
   * *Alasan*: Penilaian kuis KBM IPA VIII harus deterministik, terverifikasi kunci jawabannya, dan bebas halusinasi LLM. AI hanya boleh digunakan sebagai asisten guru atau pemberi umpan balik formatif opsional di Phase 2.
6. **JANGAN mengasumsikan rombel kelas dibatasi secara kaku hanya A s.d. E.**
   * *Alasan*: Di sekolah pengguna dan sekolah menengah negeri/swasta besar, rombel satu angkatan jamak mencapai rombel **K** (misal `7A` s.d. `7K`, `8A` s.d. `8K`, `9A` s.d. `9K`). Seluruh query, filter antarmuka, dan konfigurasi guru wajib memperlakukan `class_id` sebagai string dinamis, bukan regex atau enum kaku `[A-E]`.

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

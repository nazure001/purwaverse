# PURWAVERSE FUTURE ARCHITECTURE SPECIFICATION
## Multi-Grade, Multi-Track & Reusable Visual Blueprint
**Version:** 1.1.0 (Staging-Blocked Architecture Update)

**Status:** `STAGING_BLOCKED` — menunggu DNS/TLS publik dan UAT browser melalui domain resmi

**Focus:** Fondasi non-breaking untuk IPA Fase D, penilaian V2, PurwaWiki, OSN, Research Academy, dan aset visual reusable.

> **Batas implementasi:** dokumen ini adalah kontrak arah pengembangan. Selama baseline belum memperoleh `STAGING_PASS`, tidak boleh ada perubahan runtime, schema, data nilai, atau import konten berdasarkan blueprint ini.

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
   * Terikat pada enrollment tahun ajaran aktif, jenjang, `class_id` dinamis (dapat mencakup rombel A s.d. K atau lebih), dan nomor absen.
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

Sistem saat ini baru memiliki baseline **IPA VIII KBM (Semester 1 & 2)** yang sudah lulus pengujian lokal dan internal VPS, tetapi **belum production** karena domain staging publik dan TLS belum terverifikasi.

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
| **Kelas 8**<br>*(Fase D Menengah)* | `CUR-IPA-VIII-KBM` | **Inti Penyelidikan & Mekanika Tubuh/Benda (MVP):**<br>• Pengenalan sel & mikroskop lanjutan.<br>• Struktur & fungsi tubuh (pencernaan, sirkulasi, pernapasan, ekskresi).<br>• Usaha, energi, & pesawat sederhana.<br>• Getaran, gelombang, & cahaya (optik).<br>• Unsur, senyawa, campuran, & zat aditif/adiktif.<br>• Struktur bumi, lempeng tektonik, & kebencanaan. | [`docs/Kelas 8/`](../Kelas%208/)<br>*(14 Buku BSE K13/KTSP)* | **Baseline staging internal; publik masih blocked** |
| **Kelas 9**<br>*(Fase D Akhir)* | `CUR-IPA-IX-KBM` | **Sintesis Abstrak & Transisi Fase E (SMA):**<br>• Sistem reproduksi manusia & perkembangbiakan makhluk hidup.<br>• Pewarisan sifat (genetika Mendel, DNA, & bioteknologi dasar).<br>• Listrik statis & dinamis (arus, tegangan, hambatan, daya).<br>• Kemagnetan & induksi elektromagnetik.<br>• Bioteknologi pangan konvensional & modern.<br>• Partikel penyusun materi (atom, ion, molekul) & tanah bagi kehidupan. | [`docs/Kelas 9/`](../Kelas%209/)<br>*(10 Buku BSE K13/KTSP)* | *Future Ready (Skema Siap)* |

### Status Skema Multi-Grade

Tabel `courses`, `learning_units`, `lessons`, `concepts`, dan tabel relasi Content Engineering sudah tersedia sebagai fondasi. Keberadaan tabel belum berarti alur multi-grade sudah operasional. Runtime masih memerlukan enrollment bertahun ajaran dan seluruh query progres/nilai/tim harus menjadi course-aware sebelum kelas 7 atau 9 dapat diaktifkan.

Course ID yang dibakukan:

```text
CUR-IPA-VII-KBM
CUR-IPA-VIII-KBM
CUR-IPA-IX-KBM
CUR-OSN-IPA
CUR-RESEARCH-IPA
CUR-PURWAWIKI
```

Satu `student_id` dipertahankan lintas tahun. Perubahan kelas, nomor absen, jenjang, dan course direkam sebagai enrollment baru; histori sebelumnya tidak ditimpa. Konteks course/enrollment harus diturunkan dari sesi terverifikasi, bukan dari parameter bebas klien.

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

### Jembatan Konsep yang Sudah Tersedia

Schema saat ini sudah menyediakan `concepts`, `lesson_concepts`, `activity_concepts`, dan `assessment_concepts`. Fondasi many-to-many tersebut dipertahankan tanpa membongkar 23 tabel operasional KBM. Aktivasi lintas jenjang tetap menunggu rekonsiliasi workbook, import terkontrol, dan UAT course-aware.
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

PurwaWiki menggunakan concept ID dan pustaka aset yang sama dengan course lain, tetapi disajikan sebagai konten read-only/cache-heavy. Artikel publik tidak memiliki akses ke roster, sesi siswa, nilai, tim, atau leaderboard KBM. Tautan "Pelajari lebih lanjut" dari materi wajib tidak memengaruhi progres atau membuka unit berikutnya.

---

## 6. Kontrak Praktikum dan Penilaian V2

`SCIENCE_OVERALL_V2` memisahkan bukti individual dan tim:

| Komponen | Bobot | Otoritas |
|---|---:|---|
| Quick Quiz web individual | 10% | skor otomatis, nilai terbaik per kuis wajib |
| Kuis nyata individual | 40% | guru, append-only, nilai terbaik tervalidasi per asesmen wajib |
| Praktikum tim | 40% | guru berdasarkan proses, data, analisis, keselamatan, dan laporan |
| Kontribusi individual | 10% | guru berdasarkan bukti kontribusi anggota |

Nilai akhir tetap `BELUM_LENGKAP` selama komponen wajib belum tersedia; ketidakhadiran menggunakan status susulan/dispensasi, bukan langsung nol. Tim dapat dibentuk lebih awal, tetapi Leader/Deputy harus memenuhi kelayakan. Praktikum dibuka oleh guru dan tidak menunggu semua anggota memiliki progres materi yang sama. Progres kognitif individual tetap wajib diselesaikan dan tidak dapat digantikan nilai tim.

---

## 7. Reusable Science Illustration System

### 7.1 Prinsip dan Identitas

Setiap submateri wajib memiliki minimal satu visual inti. Visual tambahan digunakan jika konsep memerlukan proses, konteks, susunan eksperimen, perbandingan, grafik, atau sketsa observasi. Satu halaman wajib dibatasi sekitar 3–4 visual utama; visual tambahan dialihkan ke PurwaWiki/pengayaan.

Diagram ilmiah berlabel mengutamakan SVG terkontrol. Ilustrasi kontekstual dapat memakai WebP berwarna, sedangkan sketsa LKPD memakai SVG/PNG monokrom ramah cetak. Teks ilmiah tidak dibakar ke raster generatif; label ditambahkan melalui SVG/HTML agar dapat diaudit. Gambar generatif bukan sumber fakta dan tidak boleh menyalin ilustrasi buku komersial.

Stable ID:

```text
AST-{DOMAIN}-{CONCEPT}-{TYPE}-{NN}
```

Tipe yang diizinkan:

```text
STRUCTURE PROCESS CONTEXT EXPERIMENT OBSERVATION GRAPH COMPARISON SAFETY SKETCH
```

### 7.2 Registry, Referensi, dan Penyimpanan

`asset_map_final.xlsx` menjadi sumber metadata, kemudian diekspor ke manifest aplikasi. Field minimal mencakup identitas konsep, tipe, tujuan, `must_show`, `must_not_show`, relasi ilmiah, audiens, varian file, alt text, caption, sumber, lisensi, reviewer, versi, checksum, dan `review_status`.

Lifecycle:

```text
DRAFT -> SCIENTIFIC_REVIEW -> APPROVED -> PUBLISHED
                         \-> REVISION_REQUIRED
PUBLISHED -> DEPRECATED
```

Hanya aset `APPROVED`/`PUBLISHED` yang boleh masuk paket production. Lesson menyimpan referensi, bukan salinan:

```json
[
  {
    "asset_id": "AST-BIO-CELL-STRUCTURE-01",
    "role": "core_diagram",
    "placement": "after_section_2",
    "caption_override": null,
    "required": true
  }
]
```

Role resmi: `hero`, `core_diagram`, `process`, `context`, `experiment_setup`, `observation_reference`, `comparison`, dan `print_support`.

File statis disimpan sekali di `public/assets/science/{domain}/{concept}/`, bukan sebagai Base64/blob SQLite. Varian standar:

```text
{asset_id}.svg
{asset_id}-display.webp
{asset_id}-thumb.webp
{asset_id}-print.png
```

UI memakai dimensi eksplisit, lazy loading, thumbnail pada daftar, varian display saat materi dibuka, dan fallback informatif jika aset hilang. Nginx melayani aset berversi/checksum dengan cache immutable. SVG wajib disanitasi sebelum publikasi.

### 7.3 Standar Prompt dan Review

Prompt visual disusun dari spesifikasi konsep dengan field wajib:

```text
ASSET ID
TARGET COURSE/AUDIENCE
LEARNING OBJECTIVE
PRIMARY CONCEPT
SCIENTIFIC SOURCE BASIS
ILLUSTRATION TYPE
MUST SHOW
SCIENTIFIC RELATIONSHIPS
SCALE/ORIENTATION
MUST NOT SHOW
COMMON MISCONCEPTIONS TO AVOID
VISUAL STYLE
COLOR AND CONTRAST
BACKGROUND
COMPOSITION
LABEL PLAN
ACCESSIBILITY
OUTPUT VARIANTS
PRINT REQUIREMENTS
REVIEW CHECKLIST
```

Prompt harus melarang watermark, logo, teks acak, anatomi/struktur fiktif, arah proses terbalik, dan klaim skala/warna yang tidak benar. Setiap aset diperiksa terhadap tujuan belajar, minimal satu literatur resmi/tepercaya, miskonsepsi, hak pakai/provenance, keterbacaan HP/proyektor/cetak, alt text, dan persetujuan guru.

Build/import harus gagal jika referensi aset tidak ada, aset wajib belum approved, alt text/sumber/lisensi kosong, checksum salah, SVG tidak aman, atau file melewati batas ukuran yang ditetapkan pipeline.

---

## 8. Daftar Anti-Pattern & Field yang Jangan Dikunci (Critical Checklist)

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
5. **JANGAN memasukkan logika AI ke dalam critical path pembelajaran atau penilaian.**
   * *Alasan*: Penilaian KBM harus deterministik atau divalidasi guru. AI tidak menggantikan membaca, mencatat, praktik, review ilmiah, atau keputusan guru.
6. **JANGAN mengasumsikan rombel kelas dibatasi secara kaku hanya A s.d. E.**
   * *Alasan*: Di sekolah pengguna dan sekolah menengah negeri/swasta besar, rombel satu angkatan jamak mencapai rombel **K** (misal `7A` s.d. `7K`, `8A` s.d. `8K`, `9A` s.d. `9K`). Seluruh query, filter antarmuka, dan konfigurasi guru wajib memperlakukan `class_id` sebagai string dinamis, bukan regex atau enum kaku `[A-E]`.

---

7. **JANGAN menggandakan file aset untuk setiap course atau menu.**
   * *Alasan*: duplikasi memperbesar penyimpanan, memperlambat cache, dan menimbulkan versi visual yang tidak konsisten. Semua consumer wajib memakai stable asset ID.

---

## 9. Matriks Analisis Risiko Ekstensi Masa Depan

| Skenario Ekstensi | Potensi Risiko | Tingkat Risiko | Strategi Mitigasi Terencana |
|---|---|---|---|
| **Multi-Curriculum** | Database membengkak; data siswa KBM tercampur dengan peserta non-sekolah. | **Sedang** | Terapkan partisi `curriculum_id` pada query dan repository layer. Filter default selalu `CUR-IPA-VIII-KBM`. |
| **Enrollment lintas tahun** | Riwayat siswa tertimpa ketika naik kelas. | **Tinggi** | Pertahankan `student_id`; enrollment baru bersifat historis dan query selalu memakai enrollment aktif terverifikasi. |
| **PurwaWiki Terbuka** | Beban baca database tinggi akibat artikel diakses publik luas; cache lambat. | **Rendah** | Sajikan artikel PurwaWiki via Static Site Generation / Edge Cache (Nginx/Vercel), bukan query SQLite berulang. |
| **Pustaka visual bersama** | Aset salah konsep dipakai ulang luas atau cache menahan versi lama. | **Sedang** | Wajibkan scientific review, stable ID, version/checksum, manifest tervalidasi, dan cache immutable per versi. |
| **Public Registration** | Spam pendaftaran; bot scraping; percobaan pembobolan PIN siswa KBM. | **Tinggi** | Pisahkan endpoint pendaftaran publik dari endpoint login siswa. Tambahkan Cloudflare Turnstile / Captcha & rate limiting ketat. |
| **Konten generatif** | Diagram tampak meyakinkan tetapi salah secara ilmiah atau melanggar hak cipta. | **Tinggi** | Generator hanya alat produksi; literatur dan review guru adalah otoritas. Jangan salin halaman buku atau publikasi aset yang belum approved. |

---

## 10. Urutan Prioritas Implementasi dan Gate

| Fase | Implementasi | Gate keluar |
|---|---|---|
| **0. Tutup baseline staging** | DNS, TLS, browser publik, mobile, print, finalisasi laporan dan data sintetis. | `STAGING_PASS`, tanpa P0/P1. |
| **1. Dokumentasi** | Sinkronkan blueprint multi-grade, V2, multi-track, dan visual system. | Review dokumen; tanpa perubahan runtime. |
| **2. V2 praktikum & nilai** | Tim provisional, eligibility Leader/Deputy, pembukaan praktik oleh guru, kuis nyata append-only, kontribusi, formula 10/40/40/10. | Pilot satu kelas/satu praktikum lulus UAT. |
| **3. Asset foundation** | Finalisasi asset map, registry/manifest, resolver, varian, lazy loading, cache, fallback, alt text, sanitasi SVG, 3–5 aset pilot. | Satu aset reused di KBM, preview wiki, LKPD, dan print; review ilmiah lulus. |
| **4. IPA VIII lengkap** | Rekonsiliasi delapan workbook, audit 21 unit, lengkapi materi dan visual berdasarkan CP/ATP guru. | Semua unit wajib memiliki aset approved dan integrasi lulus. |
| **5. Fondasi multi-grade** | Enrollment lintas tahun, course aktif, filter guru, query progres/nilai/tim course-aware, migrasi histori kelas 8. | Tidak ada kebocoran antarjenjang/rombel/tahun. |
| **6. Pilot kelas 7** | ATP disetujui guru; satu bab lengkap dengan materi, visual, aktivitas, asesmen, dan praktik. | Alur siswa/guru kelas 7 dan isolasi kelas 8 lulus. |
| **7. Pilot kelas 9** | Proses yang sama setelah pilot kelas 7 stabil. | Alur kelas 9 dan isolasi lintas jenjang lulus. |
| **8. PurwaWiki** | Artikel read-only berbasis concept ID dan reusable asset; static generation/cache. | Akses publik tidak dapat menjangkau data privat dan tidak memengaruhi progres. |
| **9. OSN & Research Academy** | Course opsional, bank soal bertingkat, proposal/evidence/rubrik/laporan penelitian. | Enrollment dan nilai terpisah dari KBM. |

### Kontrak Antarmuka Masa Depan

- Session menyediakan `activeEnrollment`, `courseId`, `gradeLevel`, `classId`, dan `schoolYear`.
- API progres, tim, dan nilai menurunkan course/enrollment dari session terverifikasi.
- Dashboard guru memfilter tahun ajaran, jenjang, rombel, semester, dan bab.
- API nilai mengembalikan komponen, bobot, kelengkapan, kekurangan, serta nilai akhir hanya jika seluruh komponen wajib lengkap.
- Content loader menyelesaikan `asset_id` melalui manifest; PurwaWiki hanya membaca konten/aset publik.

> **Kesimpulan Mandat**: satu engine melayani seluruh jalur, tetapi identitas, enrollment, progres, nilai, dan akses tetap terisolasi. Tahap runtime berikutnya hanya boleh dimulai setelah gate fase sebelumnya terbukti lulus.

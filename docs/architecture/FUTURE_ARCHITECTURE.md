# PURWAVERSE FUTURE ARCHITECTURE SPECIFICATION
## Multi-Grade, Multi-Track & Reusable Visual Blueprint
**Version:** 1.2.0 (Staging-Passed Architecture Update)

**Status:** `STAGING_PASSED` — Evaluasi penutupan staging resmi lulus; siap menuju persiapan rilis produksi.

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

### Standar Kelengkapan Akademik Materi

Materi IPA VIII yang tersedia pada baseline staging adalah konten operasional awal, bukan paket akademik final. Penyempurnaan materi dilakukan berdasarkan urutan bab dan ATP guru, sedangkan cakupan konsep divalidasi terhadap CP. Buku BSE resmi, buku teks tepercaya, dan literatur ilmiah digunakan untuk memperkaya definisi, mekanisme, contoh, data, perhitungan, miskonsepsi, serta konteks; urutan buku tidak menggantikan urutan guru.

Setiap bab wajib memiliki:

1. capaian dan tujuan belajar;
2. pertanyaan pemantik dan fenomena kontekstual;
3. peta konsep awal;
4. istilah kunci dan pengetahuan prasyarat;
5. daftar submateri serta keterampilan yang akan dilatih;
6. gambaran praktik atau penyelidikan yang relevan;
7. rangkuman bab, peta konsep final, latihan, refleksi, dan hubungan antarsubmateri.

Setiap submateri wajib memuat, sesuai karakter konsepnya:

- pengertian dan batas konsep;
- ciri, komponen, fungsi, proses, atau mekanisme;
- hubungan sebab-akibat dan keterkaitan dengan konsep lain;
- contoh kontekstual serta contoh yang bukan termasuk konsep tersebut;
- miskonsepsi umum beserta koreksinya;
- rumus, arti variabel, satuan, konversi, dan contoh hitungan bertahap jika relevan;
- data, tabel, grafik, atau interpretasi bukti jika relevan;
- visual inti yang benar secara ilmiah;
- pertanyaan cek pemahaman dan panduan rangkuman di buku fisik;
- praktik/LKPD hanya jika pengamatan atau pengukuran memberi manfaat nyata;
- pengayaan opsional dan sumber literatur.

Konten tidak boleh dinyatakan lengkap hanya karena memiliki definisi singkat, satu ilustrasi, dan kuis. Publikasi unit memerlukan matriks keterlacakan `CP -> ATP guru -> concept_id -> lesson -> activity/evidence -> assessment -> asset_id` serta review akademik guru.

### Peta Konsep Bab sebagai Aset Terstruktur

Peta konsep pada buku paket digunakan untuk mengekstrak konsep dan relasi pengetahuan, bukan untuk disalin sebagai gambar. Logo, tata letak, tipografi, dan elemen visual penerbit tidak boleh direproduksi. Hasil ekstraksi wajib diperiksa kembali terhadap CP, ATP guru, istilah ilmiah, dan sumber lain sebelum didesain ulang secara orisinal dengan tema Purwaverse.

Setiap bab memiliki minimal satu peta konsep pembuka. Jika diperlukan, bab juga memiliki peta konsep penutup yang menampilkan hubungan yang sudah dipelajari. Peta konsep disimpan sebagai node dan edge terstruktur, lalu dirender menjadi SVG responsif agar dapat:

- digunakan ulang pada KBM, PurwaWiki, OSN, LKPD, ringkasan, dan cetak;
- dikoreksi tanpa membuat ulang gambar raster;
- dibaca pada HP, proyektor, dan kertas A4;
- memiliki urutan baca, alt text, dan bentuk daftar sebagai fallback aksesibilitas;
- dihubungkan dengan stable `concept_id` dan `asset_id`.

Relasi antarnode harus memakai frasa bermakna seperti `terdiri atas`, `dipengaruhi oleh`, `menyebabkan`, `berfungsi untuk`, `diukur dengan`, atau `contohnya`; garis tanpa makna relasi tidak cukup. Peta konsep tidak boleh menambahkan hubungan yang hanya tampak masuk akal secara visual tetapi tidak didukung literatur.

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

### Indeks Pengetahuan dan Sumber

PurwaWiki dan course menyediakan indeks pengetahuan lintas materi agar siswa dan guru dapat menemukan kembali visual, data, istilah, serta sumber tanpa menggandakan konten. Menu masa depan meliputi:

| Menu | Isi | Akses default |
|---|---|---|
| **Galeri Ilustrasi / Daftar Gambar** | Ilustrasi, diagram, peta konsep, grafik, sketsa observasi, dan susunan alat yang sudah `APPROVED`/`PUBLISHED`. | Publik untuk aset berlisensi publik; aset KBM terbatas mengikuti course. |
| **Daftar Tabel & Data** | Tabel perbandingan, hasil pengukuran contoh, konstanta, satuan, data latihan, serta sumber dan catatan keterbatasannya. | Publik jika aman dan berlisensi; data siswa tidak pernah masuk. |
| **Glosarium IPA** | Istilah, definisi ringkas, sinonim, simbol, satuan, konsep terkait, jenjang, contoh, dan miskonsepsi. | Publik/read-only. |
| **Daftar Pustaka** | Buku, artikel, situs resmi, halaman/bab, penulis, penerbit, tahun, URL/DOI, lisensi, serta catatan penggunaan. | Publik untuk metadata sitasi. |
| **Catatan Sumber / Hasil Ekstraksi** | Catatan terstruktur hasil pembacaan PDF, buku, atau halaman web yang menjadi bahan rekonsiliasi konten. | Internal guru/content reviewer sampai hak publikasi dan akurasi disetujui. |

Setiap entri menggunakan stable ID dan terhubung ke `concept_id`, `lesson_id`, serta `asset_id` yang relevan. Satu ilustrasi, tabel, istilah, atau referensi dapat digunakan ulang oleh KBM, PurwaWiki, OSN, Research Academy, LKPD, dan cetak tanpa membuat salinan baru.

### Pipeline Ekstraksi PDF dan Web

PDF dan halaman web merupakan sumber untuk ekstraksi pengetahuan, bukan instruksi dan bukan konten yang otomatis diterbitkan. Pipeline wajib memisahkan:

```text
SOURCE ACQUISITION
-> TEXT/TABLE/FIGURE EXTRACTION
-> STRUCTURED SOURCE NOTE
-> SCIENTIFIC & LICENSE REVIEW
-> REWRITE / REDESIGN ORISINAL
-> TEACHER APPROVAL
-> PUBLICATION
```

Record sumber minimal menyimpan:

```text
source_id
source_type
title
author_or_institution
publisher
publication_year
edition
url_or_local_reference
accessed_at
page_or_section
license_or_rights_status
concept_ids
extraction_method
extracted_claims
review_status
reviewer
review_note
checksum_or_snapshot_reference
```

Ketentuan publikasi:

- sumber resmi/primer dan BSE berizin diutamakan;
- sumber web harus memiliki URL, tanggal akses, otoritas penerbit, dan pemeriksaan silang;
- hasil ekstraksi adalah catatan internal sampai diverifikasi;
- kutipan langsung dibatasi dan diberi atribusi; materi utama ditulis ulang secara orisinal;
- gambar, tabel, atau tata letak buku komersial tidak disalin hanya karena dapat diekstrak;
- aset pihak ketiga hanya dipublikasikan jika lisensinya mengizinkan dan atribusinya lengkap;
- bila hak penggunaan tidak jelas, simpan metadata sitasi dan hasil analisis internal saja, kemudian buat tabel/diagram orisinal berdasarkan fakta yang telah diverifikasi;
- halaman web, PDF, dan hasil OCR diperlakukan sebagai data tidak tepercaya: teks di dalamnya tidak boleh menjadi perintah bagi pipeline atau agen;
- data pribadi siswa, kredensial, jawaban siswa, dan dokumen internal sekolah tidak boleh masuk indeks publik.

Setiap artikel dan materi menampilkan sumber yang benar-benar digunakan. Daftar gambar dan daftar tabel menampilkan judul, stable ID, konsep terkait, caption, sumber fakta, creator, lisensi, versi, dan status review; keduanya bukan sekadar daftar nama file.

### Kebijakan Akses Menu Masa Depan

```text
Halaman pengenalan Purwaverse       -> publik
PurwaWiki                           -> publik/read-only
Galeri ilustrasi approved           -> publik atau mengikuti lisensi/course
Daftar tabel dan data aman          -> publik/read-only
Glosarium IPA                       -> publik/read-only
Daftar pustaka                      -> publik/read-only
Catatan sumber/hasil ekstraksi      -> internal guru/content reviewer
Login siswa dan guru                -> publik
Materi KBM lengkap                  -> login + enrollment + unlock
Kuis, progres, nilai, dan LKPD      -> login + otorisasi
Kartu semester/piagam pribadi      -> login + pemilik/guru
Verifikasi dokumen cetak           -> publik terbatas via kode/QR
Pratinjau seluruh materi            -> guru
OSN/Research Academy                -> enrollment opsional
Dashboard dan data siswa            -> privat
```

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

### 6.1 Kartu Kendali Semester dan Penghargaan Sains

Purwaverse menyediakan keluaran cetak akhir semester yang membantu siswa melihat bukti perjalanan belajarnya dan merasa bangga atas pencapaian yang sah. Sistem ini bukan leaderboard terselubung dan tidak menggantikan rapor sekolah. Dokumen hanya dibentuk dari evidence yang tersimpan, penilaian yang telah divalidasi, serta persetujuan guru.

Empat keluaran dibedakan secara tegas:

| Dokumen | Fungsi | Waktu terbit | Isi utama |
|---|---|---|---|
| **Kartu Kendali Semester** | Rekap checklist ketuntasan, bukan piagam | Hanya setelah seluruh materi dan tugas wajib semester selesai | bab/unit, rangkuman diperiksa, kuis wajib, praktik/LKPD, kontribusi, status susulan, dan pengesahan guru |
| **Piagam Ketuntasan Semester** | Pengakuan telah menuntaskan jalur IPA satu semester | Setelah kartu kendali lengkap dan guru mengesahkan | identitas minimum, course/semester/tahun ajaran, tanggal pengesahan, dan capaian umum tanpa membuka rincian nilai sensitif |
| **Kartu Prestasi Sains** | Kartu koleksi kecil untuk achievement tertentu | Setelah kriteria achievement terpenuhi dan tervalidasi | nama achievement, level, bukti ringkas, tanggal, ikon/visual khas, kode dokumen, dan tanda validasi |
| **Portofolio Achievement** | Riwayat digital seluruh achievement siswa | Berjalan lintas semester, tetapi tetap privat | achievement aktif, sumber evidence, course, versi kriteria, dan status valid/revoked |

Contoh achievement yang bermakna dan tidak hanya mengejar nilai tertinggi:

- **Peneliti Teliti** — data pengamatan lengkap, konsisten, dan dapat ditelusuri;
- **Praktisi Aman** — disiplin keselamatan dan penggunaan alat;
- **Analis Bukti** — mampu menghubungkan data, analisis, dan kesimpulan;
- **Kolaborator Andal** — kontribusi tim konsisten berdasarkan validasi guru;
- **Komunikator Sains** — presentasi/laporan jelas dan memakai istilah yang tepat;
- **Perbaikan Gigih** — menunjukkan kemajuan nyata setelah remedial atau revisi;
- **Penjelajah Mandiri** — menyelesaikan pengayaan opsional berkualitas tanpa menjadikannya syarat KBM;
- **Science Leader** — menjalankan tanggung jawab Leader/Deputy secara sah, bukan hanya karena skor diagnostik tinggi.

Kriteria achievement harus transparan, berbasis evidence, tidak berubah diam-diam, dan menyimpan `criteria_version`. Achievement tidak boleh diberikan hanya karena membuka halaman, lama waktu online, jumlah klik, atau aktivitas semu. Penghargaan tim dan individual dibedakan; prestasi tim tidak otomatis mengklaim kontribusi individual tanpa bukti.

Status dokumen:

```text
DRAFT -> ELIGIBLE -> TEACHER_APPROVED -> ISSUED -> REVOKED/SUPERSEDED
```

Ketentuan penerbitan dan privasi:

- siswa hanya dapat melihat/mencetak dokumennya sendiri; guru hanya untuk enrollment yang diotorisasi;
- kartu kendali semester tidak tersedia sebelum seluruh kewajiban wajib selesai atau guru menetapkan dispensasi yang tercatat;
- nilai akhir berstatus `BELUM_LENGKAP` tidak boleh menghasilkan piagam ketuntasan;
- setiap dokumen memakai stable `document_id`, nomor versi, waktu terbit, checksum, dan kode/QR verifikasi;
- QR membuka halaman verifikasi minimal: keaslian, jenis dokumen, inisial/nama sesuai kebijakan sekolah, course, semester, tahun ajaran, tanggal terbit, serta status valid; tidak membuka nilai rinci, roster, PIN, atau data tim;
- koreksi tidak menimpa dokumen lama: versi lama menjadi `SUPERSEDED`; dokumen keliru dapat `REVOKED` dengan alasan dan audit trail;
- cetak menyediakan format A4 untuk kartu kendali/piagam dan format kartu hemat kertas untuk prestige card, keduanya terbaca dalam grayscale;
- template tidak memakai tanda tangan hasil salinan gambar tanpa kebijakan sekolah; pengesahan digital dan ruang tanda tangan manual dibedakan;
- desain penghargaan menguatkan mastery, ketelitian, keselamatan, kolaborasi, perbaikan, dan rasa ingin tahu—bukan kompetisi sosial yang mempermalukan siswa lambat;
- publikasi achievement ke galeri kelas atau profil publik harus opt-in dan memerlukan persetujuan sesuai kebijakan sekolah.

Data minimal yang perlu dirancang pada fase implementasi mencakup `achievement_definitions`, `achievement_evidence`, `student_achievements`, dan `issued_documents`. Nama tabel ini masih kontrak konseptual, bukan instruksi membuat migrasi sebelum desain V2, retensi data, otorisasi, dan kebutuhan audit disetujui.

---

## 7. Reusable Science Illustration System

### 7.1 Prinsip dan Identitas

Setiap submateri wajib memiliki minimal satu visual inti. Visual tambahan digunakan jika konsep memerlukan proses, konteks, susunan eksperimen, perbandingan, grafik, atau sketsa observasi. Satu halaman wajib dibatasi sekitar 3–4 visual utama; visual tambahan dialihkan ke PurwaWiki/pengayaan.

Diagram ilmiah berlabel mengutamakan SVG terkontrol. Ilustrasi kontekstual dapat memakai WebP berwarna, sedangkan sketsa LKPD memakai SVG/PNG monokrom ramah cetak. Teks ilmiah tidak dibakar ke raster generatif; label ditambahkan melalui SVG/HTML agar dapat diaudit. Gambar generatif bukan sumber fakta dan tidak boleh menyalin ilustrasi buku komersial.

Visual harus relevan terhadap tujuan belajar dan setia pada konsep/teori. "Realistis" tidak selalu berarti foto: diagram model lebih tepat ketika struktur, arah proses, gaya, skala, atau hubungan besaran perlu dijelaskan. Visual ditolak jika hanya dekoratif, mengandung struktur fiktif, menempatkan besaran pada posisi yang salah, tidak membedakan model dari kenyataan, atau berpotensi menanamkan miskonsepsi.

Sebagai contoh, diagram getaran tidak cukup menampilkan bandul dan label bebas. Diagram wajib membedakan titik keseimbangan, posisi ekstrem, simpangan, amplitudo, arah gerak, dan urutan satu siklus. Periode dan frekuensi dijelaskan sebagai besaran waktu/jumlah getaran, bukan ditempel seolah bagian fisik bandul. Jika relevan, diagram dipasangkan dengan grafik simpangan terhadap waktu serta contoh perhitungan yang memakai simbol dan satuan konsisten.

Stable ID:

```text
AST-{DOMAIN}-{CONCEPT}-{TYPE}-{NN}
```

Tipe yang diizinkan:

```text
STRUCTURE PROCESS CONTEXT EXPERIMENT OBSERVATION GRAPH COMPARISON CONCEPT_MAP SAFETY SKETCH
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

Tambahan role untuk peta konsep: `chapter_concept_map`. Aset ini menggunakan stable asset ID bertipe `CONCEPT_MAP`, tetapi sumber kebenarannya tetap node/edge terstruktur, bukan raster hasil tangkapan halaman buku.

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

Review ilmiah dilakukan per jenis visual:

- anatomi: struktur, proporsi edukatif, hubungan dan arah aliran;
- fisika: titik acuan, sumbu, arah, gaya, besaran, satuan, dan kondisi batas;
- kimia: pemisahan level makroskopis, model partikel, dan simbolik;
- bumi-antariksa: penampang, arah gerak, waktu geologis, serta catatan skala;
- eksperimen: alat/bahan realistis, posisi aman, variabel, dan keterbatasan pengamatan;
- peta konsep: kelengkapan node, kebenaran relasi, hirarki, keterbacaan, dan konsistensi istilah.

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
| **Piagam dan kartu prestasi** | Dokumen dipalsukan, achievement diberikan tanpa bukti, data nilai bocor melalui QR, atau penghargaan berubah menjadi tekanan/ranking sosial. | **Tinggi** | Stable document ID, teacher approval, evidence linkage, criteria version, checksum, verifikasi publik minimal, audit trail/revocation, akses privat, dan larangan auto-award berbasis klik/waktu online. |

---

## 10. Urutan Prioritas Implementasi dan Gate

| Fase | Implementasi | Gate keluar |
|---|---|---|
| **0. Tutup baseline staging** | DNS, TLS, browser publik, mobile, print, finalisasi laporan dan data sintetis. | `STAGING_PASS`, tanpa P0/P1. |
| **1. Dokumentasi** | Sinkronkan blueprint multi-grade, V2, multi-track, dan visual system. | Review dokumen; tanpa perubahan runtime. |
| **2. V2 praktikum & nilai** | Tim provisional, eligibility Leader/Deputy, pembukaan praktik oleh guru, kuis nyata append-only, kontribusi, formula 10/40/40/10. | Pilot satu kelas/satu praktikum lulus UAT. |
| **2B. Kartu semester & achievement** | Definisi kriteria, evidence linkage, persetujuan guru, kartu kendali akhir semester, piagam, prestige card, versi/revocation, QR verifikasi minimal, dan template print. | Data sintetis membuktikan dokumen tidak terbit prematur, tidak bocor nilai/PII, hanya pemilik/guru yang dapat mencetak, QR memvalidasi status, serta A4/kartu lulus print UAT. |
| **3. Asset foundation** | Finalisasi asset map, registry/manifest, resolver, varian, lazy loading, cache, fallback, alt text, sanitasi SVG, 3–5 aset pilot. | Satu aset reused di KBM, preview wiki, LKPD, dan print; review ilmiah lulus. |
| **4. IPA VIII lengkap** | Rekonsiliasi delapan workbook; susun matriks CP/ATP-konsep; audit 21 unit; lengkapi definisi, mekanisme, konteks, miskonsepsi, data/grafik, perhitungan, praktik, asesmen, peta konsep bab, dan visual ilmiah. Buku paket menjadi sumber ekstraksi pengetahuan, bukan aset salinan. | Setiap bab memiliki peta konsep orisinal tervalidasi; setiap submateri memenuhi checklist akademik dan mempunyai visual inti approved; keterlacakan CP sampai assessment/asset lengkap; integrasi dan review guru lulus. |
| **5. Fondasi multi-grade** | Enrollment lintas tahun, course aktif, filter guru, query progres/nilai/tim course-aware, migrasi histori kelas 8. | Tidak ada kebocoran antarjenjang/rombel/tahun. |
| **6. Pilot kelas 7** | ATP disetujui guru; satu bab lengkap dengan materi, visual, aktivitas, asesmen, dan praktik. | Alur siswa/guru kelas 7 dan isolasi kelas 8 lulus. |
| **7. Pilot kelas 9** | Proses yang sama setelah pilot kelas 7 stabil. | Alur kelas 9 dan isolasi lintas jenjang lulus. |
| **8. PurwaWiki & indeks pengetahuan** | Artikel read-only berbasis concept ID; galeri ilustrasi; daftar tabel/data; glosarium; daftar pustaka; serta pipeline catatan sumber hasil ekstraksi PDF/web dengan review ilmiah, lisensi, dan akses terpisah. Sajikan konten publik melalui static generation/cache. | Akses publik tidak dapat menjangkau catatan ekstraksi internal atau data privat; semua entri publik memiliki stable ID, sumber, lisensi/hak penggunaan, status review, dan tidak memengaruhi progres KBM. |
| **9. OSN & Research Academy** | Course opsional, bank soal bertingkat, proposal/evidence/rubrik/laporan penelitian. | Enrollment dan nilai terpisah dari KBM. |

### Kontrak Antarmuka Masa Depan

- Session menyediakan `activeEnrollment`, `courseId`, `gradeLevel`, `classId`, dan `schoolYear`.
- API progres, tim, dan nilai menurunkan course/enrollment dari session terverifikasi.
- Dashboard guru memfilter tahun ajaran, jenjang, rombel, semester, dan bab.
- API nilai mengembalikan komponen, bobot, kelengkapan, kekurangan, serta nilai akhir hanya jika seluruh komponen wajib lengkap.
- API dokumen semester menurunkan identitas dan enrollment dari session, memeriksa kelengkapan serta persetujuan guru, dan tidak menerima `student_id` bebas sebagai dasar otorisasi.
- Endpoint verifikasi QR bersifat read-only dan hanya mengembalikan metadata minimum serta status keaslian; endpoint ini tidak pernah mengembalikan nilai rinci, roster, evidence privat, atau kredensial.
- Content loader menyelesaikan `asset_id` melalui manifest; PurwaWiki hanya membaca konten/aset publik.
- Menu galeri, tabel, glosarium, dan pustaka membaca indeks publik tervalidasi; catatan sumber/hasil ekstraksi memakai endpoint dan role internal yang terpisah.

> **Kesimpulan Mandat**: satu engine melayani seluruh jalur, tetapi identitas, enrollment, progres, nilai, dan akses tetap terisolasi. Tahap runtime berikutnya hanya boleh dimulai setelah gate fase sebelumnya terbukti lulus.

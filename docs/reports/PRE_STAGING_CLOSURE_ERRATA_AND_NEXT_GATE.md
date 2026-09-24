# LAPORAN PENUTUPAN PRE-STAGING, ERRATA AUDIT, DAN GERBANG PENYELESAIAN PURWAVERSE LMS

- **File**: `docs/reports/PRE_STAGING_CLOSURE_ERRATA_AND_NEXT_GATE.md`
- **Tanggal Evaluasi**: 25 September 2026
- **Status Operasional Gerbang**: `STAGING_BLOCKED` (Terkendala dependensi eksternal DNS publik dan TLS)
- **Mode Eksekusi**: AUDIT + CLOSURE PREPARATION ONLY (Zero Mutation pada runtime, basis data, schema, dependency, dan konfigurasi deployment)

---

## 1. Observed Repository State (Kondisi Faktual Repositori)

Berdasarkan pemeriksaan langsung terhadap repositori dan lingkungan eksekusi:

```text
STATUS AKTUAL REPOSITORI:
- Repository Path       : D:\repo\purwaverse-ipa-viii-mvp-private
- Active Branch         : main
- Local Commit HEAD     : 795c398 ("docs(staging): record public deployment and UAT result")
- Remote Tracking State : origin/main berada pada commit cac3f1b (Lokal ahead 1 commit)
- Unpushed Commit       : 795c398 (Disimpan lokal, belum didorong ke remote)
- Baseline Annotated Tags:
  * lms-phase1-staging-candidate-1  -> dereferensi ke cac3f1b (Target deployment staging VPS)
  * lms-phase1-baseline-pre-staging -> dereferensi ke 15b010e (Baseline pre-staging)
- Working Tree State    : TERDAPAT PERUBAHAN BELUM DI-COMMIT (Dirty)
  Tiga dokumen arsitektur dalam status 'modified':
  1. docs/architecture/CONTENT_ARCHITECTURE.md
  2. docs/architecture/CONTENT_STANDARD.md
  3. docs/architecture/FUTURE_ARCHITECTURE.md
- Test Suite Lokal      : 66/66 test PASS (node --test server/tests/**/*.test.js)
- Isolated E2E Flow     : 11/11 skenario PASS (scripts/verify-e2e-flow.js)
  * Dieksekusi pada isolated temporary SQLite database (file sementara yang dibersihkan pasca-uji).
- Tracked Source Loader : Lulus penuh memuat:
  * 208 siswa unik (roster resmi dari gas/RosterData.gs)
  * 25 butir soal diagnostik (Mission 0)
  * 6 butir angket self-map
  * 21 unit pembelajaran (IPA VIII Semester 1 & 2)
  * 210 butir soal kuis (Quiz Bank terintegrasi)
- Runtime Gear Asset    : public/assets/gear_small_copper.png (35,597 bytes, transparent PNG)
  * Catatan: gear_small_copper-cutout.png adalah file edit lokal yang diabaikan Git (.gitignore).
  * gear_small_copper.jpg adalah aset lama yang tidak lagi aktif di runtime.
```

---

## 2. Matriks Bukti Verifikasi (Verified / Not Verified / Blocked)

| Area Evaluasi | Status | Bukti Faktual | Batas & Ruang Lingkup Verifikasi |
|---|:---:|---|---|
| **Test Suite Backend** | `VERIFIED` | `npm test` menghasilkan **66 test PASS** (0 fail). | Menjalankan seluruh pengujian unit, auth, schema, dan RPC di Node.js. |
| **Isolated E2E Flow** | `VERIFIED` | `scripts/verify-e2e-flow.js` menghasilkan **11/11 skenario PASS**. | Dijalankan pada isolated temporary SQLite database (`server/tests/test_isolated_e2e.db`) yang dibuat saat runtime tes dan dihapus bersih otomatis setelah pengujian selesai. |
| **Tracked Source Loader** | `VERIFIED` | Modul `learningData.js`, `diagnosticData.js`, dan `rosterData.js` memuat data lengkap tanpa error. | Memverifikasi parsing dan kelengkapan 208 siswa, 25 diagnostik, 21 unit, 210 kuis dari tracked source `gas/*.gs`. |
| **Deployment VPS Internal** | `VERIFIED` | Nginx & PM2 `purwaverse-staging` running, health check `200 OK` (berdasarkan laporan deployment sebelumnya, tidak diverifikasi ulang via SSH dalam tugas ini). | Teruji via loopback lokal internal server VPS `157.10.160.16` port 3000. |
| **Isolasi Database Staging** | `VERIFIED` | `purwaverse_staging.db` terisolasi dengan data sintetis (`SYN-LEAD`, `SYN-DEP`, `SYN-MEM`). | Integritas SQLite `ok`, 0 pelanggaran Foreign Key, 0 data siswa sekolah asli. |
| **Kontrak RPC Klien** | `VERIFIED` | Transaksi melalui `POST /api/purwa` menerima `{ action, payload }`. | Penanganan error bisnis dan otentikasi mengembalikan HTTP 200 `{ ok: false, error }` sesuai konvensi klien. |
| **Controlled Fallback** | `VERIFIED` | Otorisasi dicatat append-only di `unlock_overrides` & `audit_log`. | Menggunakan marker `[CONTROLLED_FALLBACK:<teamId>]`, diverifikasi server-side tanpa tabel fallback khusus. |
| **Mobile Viewport Emulation** | `VERIFIED` | Emulasi Chrome CDP pada resolusi `360x800`, `390x844`, `412x915` (0 horizontal overflow). | Emulasi viewport engine Blink pada PC desktop, **bukan pengujian smartphone fisik**. |
| **Pengujian Smartphone Fisik** | `NOT_TESTED` | Belum pernah dijalankan pada browser native perangkat smartphone Android/iOS fisik nyata. | Memerlukan domain staging publik yang aktif dan perangkat fisik. |
| **Uji Cetak Lembar Kerja (A4)** | `NOT_TESTED` | Belum pernah dievaluasi print preview; stylesheet `@media print` belum didefinisikan. | Belum diuji perenderan cetak fisik lembar kerja pada kertas A4. |
| **DNS Publik Staging** | `BLOCKED` | Query DNS ke `staging.izzi.my.id` menghasilkan `NXDOMAIN` pada resolver publik (Google/Cloudflare). | Authoritative nameserver domain belum mendelegasikan A record ke IP VPS. |
| **Sertifikat TLS / HTTPS** | `BLOCKED` | Certbot dry-run gagal karena domain belum terarah ke IP server `157.10.160.16`. | Bergantung pada penyelesaian delegasi DNS publik. |
| **UAT Browser Publik Eksternal**| `BLOCKED` | Akses internet publik tanpa manipulasi file `hosts` belum dapat menjangkau server. | Terhalang oleh ketiadaan entri DNS publik resmi. |
| **Production Environment** | `NOT_TESTED` | Belum pernah diinisialisasi di VPS (database roster resmi belum dimuat). | Dilarang dideploy sebelum gerbang staging memperoleh status `STAGING_PASS`. |

---

## 3. Errata Terhadap Laporan Agen Sebelumnya

Untuk menjaga integritas dan ketepatan teknis, berikut adalah daftar koreksi formal terhadap kekeliruan atau ketidaktepatan klaim pada laporan audit sebelumnya:

1. **Rute Endpoint RPC Aktual:**
   - *Klaim lama:* Endpoint RPC adalah `POST /api/rpc`.
   - *Koreksi faktual:* Endpoint tunggal aktual di Express adalah **`POST /api/purwa`** (didefinisikan di `server/src/routes/purwaRoutes.js` dan ditangani oleh `handlePurwaRpc` di `server/src/controllers/purwaController.js`).
2. **Kredensial dan Format Login Siswa:**
   - *Klaim lama:* Siswa masuk hanya dengan `class_id + student_id` tanpa password/PIN.
   - *Koreksi faktual:* Autentikasi siswa wajib menyertakan PIN: **`classId + rollNo + PIN`**. Penggunaan format `student_id` hanya untuk backward compatibility dan tetap memvalidasi PIN terhadap `pin_hash`.
3. **Penyimpanan Sesi Siswa dan Guru:**
   - *Klaim lama:* Sesi disimpan pada tabel terpisah `student_sessions` dan `teacher_sessions`.
   - *Koreksi faktual:* Sesi disimpan terpusat dalam **satu tabel: `sessions`** (`session_id`, `actor_type`, `actor_id`, `class_id`, `expires_at`).
4. **Klaim Tabel Fiktif yang Tidak Ada di Basis Data:**
   - *Klaim lama:* Menyebutkan tabel operasional seperti `chapters`, `activities`, `quiz_questions`, `quiz_options`, `quiz_answers`, `student_grades`, `team_fallback_permissions`, `lab_groups`, `lab_submissions`, `lab_evaluations`, `student_sessions`, `teacher_sessions`, `auth_rate_limits`, dan `audit_logs`.
   - *Koreksi faktual:* Seluruh 14 tabel tersebut **tidak ada**. Nama 23 tabel operasional yang benar-benar ada di `server/src/database/schema.sql` adalah:
     `master_classes`, `master_students`, `master_activities`, `diagnostic_items`, `self_map_items`, `sessions`, `progress`, `diagnostic_responses`, `diagnostic_profiles`, `teams`, `team_members`, `group_lab`, `student_activity_state`, `teacher_checks`, `quiz_items`, `quiz_attempts`, `quiz_responses`, `skill_evidence`, `unlock_overrides`, `attendance`, `settings`, `audit_log`, `pin_issuance`.
5. **Mekanisme Otorisasi Controlled Fallback:**
   - *Klaim lama:* Menggunakan tabel khusus `team_fallback_permissions` dengan status `approved` dan kolom masa berlaku `expires_at`.
   - *Koreksi faktual:* Fallback disimpan secara append-only di tabel **`unlock_overrides`** menggunakan marker alasan `[CONTROLLED_FALLBACK:<teamId>]` dan pencabutan `[CONTROLLED_FALLBACK_REVOKED:<teamId>]`, serta dicatat dalam **`audit_log`**.
6. **Dereferensi Tag Git Baseline:**
   - *Klaim lama:* Menyebut kedua tag merujuk pada commit yang sama (`cac3f1b`).
   - *Koreksi faktual:* Tag `lms-phase1-staging-candidate-1` merujuk ke **`cac3f1b`**, sedangkan tag `lms-phase1-baseline-pre-staging` merujuk ke **`15b010e`**.
7. **Kuantitas Bukti Pengujian:**
   - *Klaim lama:* Mengutip "24 unit test" dan "run-browser-e2e.js dengan 12 test".
   - *Koreksi faktual:* Test suite terverifikasi adalah `npm test` dengan **66 test PASS** (berjalan melalui `server/tests/auth.test.js`, `server/tests/contractAndFallback.test.js`, dsb.), dan skrip E2E adalah `scripts/verify-e2e-flow.js` dengan **11/11 test PASS**.
8. **Status Evaluasi Media Cetak (Print):**
   - *Klaim lama:* Menyimpulkan elemen navigasi pasti ikut tercetak pada kertas.
   - *Koreksi faktual:* Status aktual adalah **`NOT_TESTED`** karena print preview belum pernah dievaluasi secara visual.
9. **Klasifikasi Kendala DNS Staging:**
   - *Klaim lama:* Diklasifikasikan sebagai P0 System Failure / Outage.
   - *Koreksi faktual:* Diklasifikasikan secara tepat sebagai **`P2 / EXTERNAL BLOCKER`**, karena sistem internal staging sehat, dan kendala berada pada delegasi DNS eksternal di luar server.

---

## 4. Transitional Tracked Data Source (Ketergantungan Transisional GAS)

Meskipun server backend telah bermigrasi sepenuhnya ke Node.js/Express dan SQLite, repositori **belum sepenuhnya bebas dari kode Google Apps Script**:

```text
ARSITEKTUR SUMBER DATA TRANSISIONAL:
[ gas/*.gs ] (Tracked Source Files)
     │
     ├── gas/RosterData.gs      ──────▶ Dibaca via regex oleh server/src/data/rosterData.js
     ├── gas/DiagnosticData.gs  ──────▶ Dieksekusi via vm.runInContext oleh server/src/data/diagnosticData.js
     ├── gas/PracticeData.gs    ──────▶ Dieksekusi via vm.runInContext oleh server/src/data/learningData.js
     └── gas/LearningData.gs    ──────▶ Dieksekusi via vm.runInContext oleh server/src/data/learningData.js
                                                    │
                                                    ▼
                                      [ SQLite: purwaverse.db ]
```

### Karakteristik & Implikasi:
1. **Transitional Tracked Data Source:** File `gas/*.gs` berfungsi sebagai sumber data master terversi (*tracked source of truth*) yang diimpor ke SQLite saat proses seeding atau runtime initialization.
2. **Ketergantungan Modul VM:** `diagnosticData.js` dan `learningData.js` menggunakan modul bawaan Node.js `vm` (`vm.runInContext`) untuk mengisolasi dan mengekstrak objek `OFFICIAL_DIAGNOSTIC_`, `LEARNING_PATH_`, dan `QUIZ_BANK_`.
3. **Status Arsitektur:** Kondisi ini **bukan "GAS fully removed"**, melainkan **tahap transisi yang stabil dan terlacak**. Migrasi pemisahan penuh ke file JSON/SQL murni ditunda ke fase pembersihan pasca-staging agar tidak menimbulkan regresi data pada baseline.

---

## 5. Klasifikasi Jalur Legacy Vercel (Architecture Drift)

Di dalam repositori root, ditemukan dua file yang merupakan sisa jalur deployment serverless lama:
- `api/purwa.js` (Vercel Serverless Function)
- `vercel.json` (Konfigurasi routing Vercel)

### Temuan Faktual:
- `api/purwa.js` bertindak sebagai proxy serverless yang mem-forward request `POST /api/purwa` langsung ke URL eksekusi Google Apps Script:
  `https://script.google.com/macros/s/AKfycbwMUnknbtXDo7M_HQGL2VfMQlHFZfT-AnMpbQGKEEwKbKXIKHYgVMK0hB4B-LV9gyH_TQ/exec`.
- Di lingkungan VPS staging saat ini, rute `POST /api/purwa` ditangani langsung oleh engine Express dan SQLite lokal, bukan diteruskan ke GAS.

### Klasifikasi & Keputusan:
- **Status:** **`ARCHITECTURE DRIFT / DEPRECATION CANDIDATE`**.
- **Tindakan Fase Ini:** **Dilarang dihapus atau diubah pada fase pre-staging ini** untuk mencegah dampak tak terduga jika ada pipeline deployment pratinjau yang masih merujuk ke Vercel. Penghapusan resmi akan dijadwalkan pada fase pembersihan pasca-`STAGING_PASS`.

---

## 6. Titik Keputusan Kontrak Kredensial Siswa (Mismatch PIN 4 vs 6 Digit)

Ditemukan ketidaksinkronan spesifikasi pada antarmuka pengguna (*UX / Credential Contract Mismatch*):

1. **Kondisi Sumber & Dataset Saat Ini:**
   - Generator PIN siswa, dataset warisan GAS, kartu fisik yang beredar, seeder sintetis, dan test suite (`server/tests/auth.test.js`, `server/tests/contractAndFallback.test.js`) saat ini **menggunakan PIN 4 digit numerik**.
2. **Perilaku Backend Node.js:**
   - Backend memverifikasi string PIN terhadap `pin_hash` (Argon2id multi-tier), namun **belum memberlakukan validasi ketat panjang tepat 4 digit** (string PIN input diverifikasi apa adanya terhadap hash yang tersimpan).
3. **Antarmuka Pengguna (`public/index.html` baris 92 & 94):**
   - Label formulir tertulis: `<label class="auth-label">PIN AKSES (6 DIGIT)</label>`.
   - Input field memuat: `<input type="password" placeholder="••••••" maxlength="8">`.

### Rekomendasi Keputusan untuk Guru/Pengelola:
- **Isu:** Siswa yang membaca antarmuka berpotensi bingung mengira PIN wajib 6 digit, padahal dataset dan kartu fisik yang diterbitkan adalah 4 digit.
- **Klasifikasi:** `P2 UX / Credential-Contract Mismatch`.
- **Keputusan yang Dibutuhkan:** Guru/Sekolah perlu memutuskan apakah standar PIN siswa akan dibakukan menjadi:
  - **Opsi A (4 Digit):** Menyelaraskan label antarmuka menjadi `PIN AKSES (4 DIGIT)` dan placeholder `••••` (risiko terendah, 100% konsisten dengan kartu fisik dan basis data yang ada).
  - **Opsi B (6 Digit):** Menyesuaikan generator PIN, memigrasikan hash PIN siswa, dan mencetak ulang kartu fisik menjadi 6 digit (memerlukan migrasi data).
- **Aturan Fase Ini:** **Tidak ada perubahan kode antarmuka atau data yang dilakukan saat ini.** Keputusan menunggu arahan resmi controller/guru.

---

## 7. Analisis Keamanan dan Tata Kelola Data PIN Fisik (`pin_issuance`)

### Analisis Kondisi Skema Saat Ini:
- Tabel `master_students` menyimpan kredensial secara aman menggunakan `pin_hash` (Argon2id).
- Tabel `pin_issuance` saat ini didefinisikan sebagai:
  ```sql
  CREATE TABLE IF NOT EXISTS pin_issuance (
      student_id TEXT PRIMARY KEY REFERENCES master_students(student_id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES master_classes(class_id) ON DELETE RESTRICT,
      roll_no INTEGER NOT NULL,
      pin TEXT NOT NULL,
      issued_at TEXT DEFAULT (datetime('now')),
      rotated_at TEXT
  );
  ```
  Kolom `pin` bertipe **`TEXT NOT NULL`**. Nilai ini **tidak dapat langsung di-null-kan** tanpa melakukan perubahan schema (migration).

### Proposal Tata Kelola PIN (Security, Export, Retention, and Rotation):
1. **Utilitas Cetak Kartu Masa Depan (Proposed, Not Implemented):**
   - Utilitas pencetakan kartu fisik kredensial (*future restricted credential-card utility*) saat ini **belum diimplementasikan** (tidak ada file `scripts/print-cards.js`).
   - Jika nanti dibangun, utilitas ini wajib dijalankan secara lokal/terbatas oleh administrator sekolah dengan hak akses terisolasi.
2. **Proposal Penanganan Plaintext PIN Pasca-Distribusi Kartu:**
   Karena kolom `pin` bertipe `TEXT NOT NULL`, dipilih opsi masa depan berikut (tanpa diimplementasikan pada fase ini):
   - *Opsi 1 (Hapus Record):* Menghapus baris pada `pin_issuance` setelah seluruh kartu fisik dibagikan kepada siswa (tabel hanya bersifat *transient* selama masa pencetakan).
   - *Opsi 2 (Enkripsi Aplikasi):* Menyimpan nilai PIN yang terenkripsi simetris dengan kunci master sekolah.
   - *Opsi 3 (Schema Migration):* Mengubah kolom menjadi `pin TEXT NULL` melalui migration terkontrol agar dapat di-null-kan pasca-cetak.
   *(Pilihan opsi tidak dieksekusi pada fase ini untuk menjaga kestabilan skema).*
3. **Mekanisme Reset PIN Siswa (Proposed — Not Implemented):**
   - Prosedur reset PIN mandiri oleh guru saat siswa kehilangan kartu saat ini **belum diimplementasikan** sebagai action runtime (bukan fitur aktif di controller/dashboard).
   - Konsep masa depan: aksi reset akan menghasilkan PIN acak baru, mencatat hash baru ke `master_students`, memperbarui `pin_issuance.rotated_at`, dan hanya menampilkan PIN baru satu kali kepada guru (*one-time view*).

---

## 8. Proposal Keputusan Penyimpanan Workbook Content Engineering (`*.xlsx`)

Terdapat 18 file spreadsheet analisis kurikulum (`*.xlsx`) serta dokumen kerja di folder `docs/` yang saat ini berstatus diabaikan Git (`.gitignore` baris 45: `*.xlsx`):
- `docs/curriculum_mapping.xlsx`, `docs/learning_activity_map.xlsx`, `docs/master_concept_map.xlsx`, `docs/assessment_map.xlsx`, `docs/misconception_map.xlsx`, `docs/prerequisite_graph.xlsx`, `docs/question_bank.xlsx`, dll.

### Evaluasi Opsi Penyimpanan Workbook:

```text
+-------------------+-----------------------------------------+-----------------------------------------+
| Opsi Penyimpanan  | Kelebihan                               | Risiko / Kelemahan                      |
+-------------------+-----------------------------------------+-----------------------------------------+
| 1. Local Prep     | Bebas konflik git binary, ukuran repo   | Tidak ter-backup di remote, rentan      |
|    Layer Saja     | tetap ramping (~ringan).                | hilang jika workstation lokal rusak.    |
+-------------------+-----------------------------------------+-----------------------------------------+
| 2. External Doc   | Akses kolaboratif guru via cloud        | Bergantung pada layanan pihak ketiga,   |
|    Storage        | (Google Drive / Nextcloud terenkripsi). | tautan eksternal bisa putus/drift.      |
+-------------------+-----------------------------------------+-----------------------------------------+
| 3. Canonical      | Format teks ramah audit Git diff,       | Memerlukan skrip pipeline ekspor/impor  |
|    Sanitized CSV  | integritas terjamin via SHA-256         | otomatis dari XLSX ke CSV/JSON.         |
|    + Manifest     | checksum manifest terversi di Git.      |                                         |
+-------------------+-----------------------------------------+-----------------------------------------+
```

### Rekomendasi Terpilih (Kombinasi Opsi 2 dan 3):
- File biner master `.xlsx` disimpan pada **Penyimpanan Dokumen Eksternal Sekolah** dengan hak akses terbatas.
- Untuk repositori Git, dibuatkan sub-folder `docs/curriculum/canonical/` yang memuat **ekspor CSV/JSON bersih (sanitized)** yang dilacak Git, disertai file `CHECKSUM_MANIFEST.sha256` untuk memvalidasi keselarasan antara spreadsheet acuan dan data repositori.
- Aturan `.gitignore` tidak diubah pada fase ini.

---

## 9. Rekonsiliasi Roster Siswa (207 vs 208 Siswa) Tanpa Data Pribadi

### Fakta Hasil Pemeriksaan Data:
- Dokumen lama menyebutkan: *"Roster resmi 207 siswa kelas 8A - 8E"*.
- Eksekusi `OFFICIAL_ROSTER_` dari `server/src/data/rosterData.js` (sumber `gas/RosterData.gs`) menghasilkan tepat **208 siswa unik**.

### Rincian Distribusi Jumlah Siswa per Kelas:
- **Kelas 8A**: 40 siswa
- **Kelas 8B**: 42 siswa
- **Kelas 8C**: 43 siswa
- **Kelas 8D**: 42 siswa
- **Kelas 8E**: 41 siswa
- **Total Akumulasi**: $40 + 42 + 43 + 42 + 41 = \mathbf{208}$ siswa.

### Analisis Integritas ID:
- Jumlah ID Siswa Unik: **208 ID**.
- Jumlah ID Duplikat: **0 (Nol / Tidak ada duplikasi ID)**.
- Setiap ID siswa memiliki format seragam dan konsisten (`8A-01` s.d. `8E-41`).

### Rekomendasi Koreksi:
Angka "207" pada seluruh dokumen masa lalu merupakan kesalahan estimasi manual (*documentation typo*). Seluruh dokumentasi resmi berikutnya wajib dikoreksi secara konsisten menjadi **208 siswa resmi**.

---

## 10. Daftar Fitur V2 yang Belum Diimplementasikan

> **PERINGATAN ARSITEKTUR:** Dokumen `docs/architecture/FUTURE_ARCHITECTURE.md` adalah spesifikasi blueprint masa depan. **Seluruh komponen berikut berstatus `PLANNED — NOT YET IMPLEMENTED`** dan belum tersedia di runtime aktif:

1. **Formula Penilaian Komposit `SCIENCE_OVERALL_V2`:**
   - Pembagian bobot 10% kuis web, 40% sumatif nyata kelas, 40% praktikum tim, dan 10% kontribusi individu belum aktif. Runtime saat ini masih menggunakan kalkulasi nilai tunggal MVP.
2. **Asesmen Kuis Nyata Tatap Muka (40%):**
   - Belum ada modul input nilai ujian fisik tatap muka oleh guru di antarmuka.
3. **Asesmen Kontribusi Individual Anggota (10%):**
   - Penilaian kinerja personal dalam tim belum dihubungkan ke kalkulasi nilai akhir.
4. **Manajemen Tim Provisional & Syarat Kepemimpinan:**
   - Pembentukan tim bersyarat indeks kepemimpinan belum diterapkan di antarmuka guru.
5. **Runtime Pembukaan Praktikum V1 vs V2:**
   - **Kondisi Runtime Saat Ini (V1):** Praktikum lab masih menggunakan syarat kelulusan seluruh anggota tim (*all-members-cleared*) untuk membuka pengerjaan LKPD.
   - **Rencana V2:** Praktikum dibuka mandiri oleh jadwal guru tanpa memblokir siswa lambat. *Aturan V1 dipertahankan sampai STAGING_PASS tercapai.*
6. **Multi-Grade Engine Terpadu (Fase D SMP Kelas 7, 8, 9):**
   - Tabel `courses` dan `lessons` sudah ada di skema DDL, namun runtime saat ini secara faktual **hanya memuat konten/ID IPA VIII dan masih berbasis kelas tunggal (`class-based`)**.
   - Session, progres aktivitas siswa, nilai, dan tim laboratorium **belum course-aware**.
7. **Enrollment Lintas Tahun & Course-Aware Session:**
   - Sesi pengguna saat ini baru mengidentifikasi `class_id`, belum memiliki parameter `course_id` atau tahun ajaran dinamis.
8. **Reusable Science Illustration Registry:**
   - Resolver penamaan aset `AST-{DOMAIN}-{CONCEPT}-{TYPE}-{NN}` belum dihubungkan ke antarmuka modul belajar.
9. **PurwaWiki, OSN Hub, dan Research Academy:**
   - Seluruh modul pengayaan dan kompetisi berada pada level dokumen rencana, belum memiliki antarmuka publik.

---

## 11. Kriteria Kelulusan Gerbang Staging (Exact Exit Criteria)

Untuk dapat mengubah status dari **`STAGING_BLOCKED`** menjadi **`STAGING_PASS`**, sistem harus memenuhi 4 kriteria kelulusan mutlak (*hard exit criteria*):

```text
GERBANG KELULUSAN STAGING (EXIT CRITERIA):
[ ] Kriteria 1: DNS Publik Terdelegasi
    Resolusi domain publik (via 'dig' / 'nslookup' ke Google 8.8.8.8 & Cloudflare 1.1.1.1):
    'staging.izzi.my.id' mengembalikan A record tunggal yang valid: 157.10.160.16.

[ ] Kriteria 2: Sertifikat TLS / HTTPS Terbit Resmi
    Eksekusi Certbot sukses pada Nginx VPS tanpa error:
    Sertifikat Let's Encrypt aktif untuk 'staging.izzi.my.id', rating SSL valid,
    dan redirect HTTP -> HTTPS berfungsi otomatis.

[ ] Kriteria 3: UAT Browser Publik Tanpa Rekayasa Klien
    Pengujian 24 skenario fungsional berhasil dijalankan melalui browser publik internet
    langsung ke URL 'https://staging.izzi.my.id':
    - Tanpa manipulasi file '/etc/hosts' di komputer klien.
    - Tanpa menggunakan bypass IP langsung.
    - Basic Auth 'guru_staging' melindungi staging dengan sempurna.

[ ] Kriteria 4: Verifikasi Tampilan Cetak & Gawai Fisik
    - Evaluasi Print Preview browser pada halaman LKPD (target lembar kerja ramah cetak A4).
    - Uji coba akses dan interaksi pada minimal 1 perangkat smartphone Android/iOS fisik nyata.
```

---

## 12. Urutan Kerja Setelah Gerbang `STAGING_PASS` Tercapai

Setelah keempat kriteria di atas terpenuhi dan ditandatangani oleh controller sebagai `STAGING_PASS`, berikut adalah urutan kerja rekayasa perangkat lunak yang aman dan terstruktur:

1. **Fase Penutupan Staging (Closure & Tagging):**
   - Melakukan commit dokumentasi final staging.
   - Menerbitkan release tag Git resmi: `lms-phase1-staging-verified`.
   - Mendorong (*push*) commit dan tag ke remote `origin/main`.
2. **Fase Pembersihan Repositori & Architecture Drift:**
   - Mengambil keputusan final mengenai jalur legacy Vercel (`api/purwa.js` & `vercel.json`).
   - Menyepakati standarisasi label UI PIN (4 digit vs 6 digit).
   - Memasang middleware `express-rate-limit` terkonfigurasi untuk memproteksi endpoint RPC (menggantikan in-memory Map saat ini).
3. **Fase Percabangan Fitur V2 (Feature Branching):**
   - Membuat branch terpisah: `feature/science-overall-v2`.
   - Mengubah logika pembukaan praktikum dari *all-members-cleared* menjadi *teacher-scheduled*.
   - Mengimplementasikan formula bobot penilaian komposit `SCIENCE_OVERALL_V2` (10-40-40-10) lengkap dengan unit test pendukung.
4. **Fase Standardisasi Pustaka Aset & Pelengkapan Konten:**
   - Membangun katalog ilustrasi ilmiah SVG terverifikasi (bebas miskonsepsi).
   - Melengkapi seluruh unit materi Bab 1 s.d. Bab 6 IPA Kelas 8.
5. **Fase Persiapan Produksi (Production Launch Readiness):**
   - Menyiapkan basis data produksi dengan roster resmi 208 siswa.
   - Mengamankan/menghapus record plaintext PIN pada tabel `pin_issuance` pasca-pencetakan kartu fisik.
   - Menghubungkan domain utama produksi dan menjalankan KBM berdaulat di VPS.

---

## 13. Status Pelestarian Dokumen (Document Preservation Status)

- **Status Pelacakan Git:** File laporan ini (`docs/reports/PRE_STAGING_CLOSURE_ERRATA_AND_NEXT_GATE.md`) saat ini **berstatus diabaikan oleh Git (`ignored/untracked`)** karena aturan baris 64 pada file `.gitignore`:
  ```gitignore
  docs/reports/*.md
  ```
- **Kondisi Eksistensi:** File laporan ini saat ini **hanya tersedia secara lokal di disk workstation**, dan belum menjadi bagian dari riwayat commit Git remote.
- **Rekomendasi Tindak Lanjut untuk Controller:**
  - Opsi A: Menambahkan pengecualian spesifik pada `.gitignore` (misal: `!docs/reports/PRE_STAGING_CLOSURE_ERRATA_AND_NEXT_GATE.md`) pada saat gerbang penutupan staging di-commit.
  - Opsi B: Menggabungkan ringkasan isi dokumen ini ke dalam dokumen laporan tracked yang sudah ada (`docs/reports/VPS_STAGING_DEPLOYMENT_AND_UAT_RESULT.md`).
- **Aturan Pekerjaan Ini:** Sesuai instruksi controller, **file `.gitignore` tidak diubah** dalam pekerjaan saat ini.

***

**Laporan ini telah direvisi dan diselesaikan dalam status AUDIT ONLY tanpa ada mutasi pada sistem.**
*Menunggu review dan instruksi controller/guru sebelum tindakan selanjutnya dieksekusi.*

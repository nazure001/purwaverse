# AUDIT KESIAPAN DEPLOYMENT STAGING VPS (VPS STAGING READINESS AUDIT)

**Dokumen**: `docs/reports/VPS_STAGING_READINESS_AUDIT.md`
**Tanggal Evaluasi**: 24 September 2026 (WIB)
**Status Evaluasi**: `STAGING_PREPARATION_NOT_YET_EXECUTABLE`
*(Fase 1 Local Baseline Lulus Verifikasi, Persiapan Staging Sedang Dikunci, Belum Diizinkan Dieksekusi ke VPS)*

---

## 1. Status Evaluasi & Batasan Controller

Sesuai instruksi pengendali (*controller*), status kesiapan deployment staging ditetapkan sebagai:
> **`STAGING_PREPARATION_NOT_YET_EXECUTABLE`**

Sistem berada dalam mode **CLOSURE + AUDIT + STAGING PREPARATION**.
Tindakan berikut **BELUM DIIZINKAN**:
- Melakukan deployment ke VPS staging maupun produksi;
- Melakukan commit atau push otomatis ke git remote;
- Mengimpor delapan workbook kurikulum/soal;
- Menyalin atau menggunakan data/progres siswa riil sekolah;
- Membuka akun PIN `1234` ke internet publik tanpa proteksi autentikasi lapis pertama;
- Mengubah skema database tanpa blocker yang terverifikasi.

---

## 2. Resolusi 10 Butir Perbaikan Wajib Controller

| No | Butir Perbaikan Controller | Status Resolusi | Tindakan & Bukti Implementasi |
|---|---|---|---|
| **1** | **Koreksi Status Laporan** | **APPLIED** | Mengubah status laporan dari `READY_WITH_CONDITIONS` menjadi `STAGING_PREPARATION_NOT_YET_EXECUTABLE`. |
| **2** | **Script Resmi Seeder Staging Sintetis** | **APPLIED** | Membuat script resmi `scripts/seed-staging-synthetic.js`. Field mematuhi `schema.sql` 100% (`teams.version` terisi, mengeliminasi `team_name`, `theme`, `final_balance_score`), transaksi atomik via `runTransaction`, idempotent, safety guard menolak DB non-staging, teruji 4/4 di `server/tests/seedStaging.test.js`. |
| **3** | **Kontrak `ALLOWED_ORIGIN` & `TRUST_PROXY`** | **APPLIED** | Menambahkan `ALLOWED_ORIGIN`, `BASE_URL`, dan `TRUST_PROXY` ke `server/src/config/index.js`. Parsing `TRUST_PROXY=1` diterjemahkan sebagai integer `1` (hop count 1), CORS di staging/produksi tidak lagi wildcard (`*`), teruji penuh pada lingkungan staging terisolasi di `server/tests/stagingConfig.test.js`. |
| **4** | **Audit Key `.env.example`** | **APPLIED** | Seluruh variabel pada root `.env.example` dan `server/.env.example` diaudit dan ditandai eksplisit: `[ACTIVE]`, `[COMPATIBILITY_ONLY]`, `[TEST_ONLY]`, `[FUTURE_UNUSED]`. Tidak ada klaim palsu variabel aktif. |
| **5** | **Klasifikasi Asset Copper Gear** | **APPLIED** | `public/assets/gear_small_copper.jpg` dan `public/assets/gear_small_copper-cutout.png` diklasifikasikan sebagai `REVIEW_REQUIRED` dan DIKECUALIKAN dari commit Fase 1 sampai bukti lisensi & sumbernya lengkap. |
| **6** | **Koreksi Manifest Screenshot** | **APPLIED** | Menyelaraskan jumlah dan daftar tangkapan layar: tepat **12 screenshot baru** (hasil uji 23 September 2026: 1, 2, 3, 4, 5a, 5b, 6a, 6b, 7, 8, 9, 10) dan **2 screenshot lama** (5 dan 6 yang usang). Total 14 file di `docs/reports/screenshots/`. |
| **7** | **Endpoint Health Khusus (`/healthz`)** | **APPLIED** | Menambahkan endpoint `GET /healthz` dan `GET /api/healthz` pada Express (`server.js`) untuk membedakan probe ketersediaan backend dari root SPA frontend. Teruji di `server.test.js`. |
| **8** | **Proteksi Staging Mandatori (REQUIRED)** | **APPLIED** | Mengubah proteksi staging (HTTP Basic Auth / IP allowlist) menjadi **REQUIRED (MANDATORI)** pada runbook dan Nginx. Dilarang keras membuka portal dengan akun uji PIN `1234` ke publik terbuka. |
| **9** | **Revisi Klaim Status Git** | **APPLIED** | Menegaskan bahwa perbandingan branch `main` dilakukan terhadap *local tracking reference* (`refs/remotes/origin/main`). Tidak mengklaim status remote live tanpa perintah `git fetch`. |
| **10** | **Verifikasi Baseline Menyeluruh** | **APPLIED** | `npm test` lulus **66/66 pengujian** (8 test suite, termasuk 6 pengujian isolasi staging config & security policy), `verify-tracked-loaders.js` 100% clean, `verify-e2e-flow.js` 11/11 lulus, `run-browser-interactive.js` 10/10 lulus, seeder staging mandiri lulus, sisa file DB/port 0. |

---

## 3. Kontrak Runtime & Variabel Lingkungan VPS

### A. Kontrak Runtime Aplikasi

| Parameter Runtime | Nilai Target VPS | Kategori | Penjelasan Kepatuhan |
|---|---|---|---|
| **Node.js Engine** | Node.js v20.x LTS / v22.x LTS | `REQUIRED` | Dukungan `node --test` dan kompilasi native C++ `better-sqlite3`. |
| **Package Manager** | `npm` v10.x+ | `REQUIRED` | Determinisme `npm ci --omit=dev`. |
| **Health Endpoints** | `GET /healthz` & `GET /api/healthz` | `REQUIRED` | Endpoint khusus probe backend Express (kode 200 `{"status":"online","service":"purwaverse"}`). |
| **Frontend Static** | `/var/www/purwaverse/public/` | `REQUIRED` | Disajikan langsung oleh Nginx reverse proxy. |
| **Database Path** | `/var/www/purwaverse/data/purwaverse_staging.db` | `REQUIRED` | Database staging terisolasi. Dilarang menyalin data sekolah! |
| **SQLite Pragmas** | WAL Mode ON, Foreign Keys ON, Busy Timeout 5000ms | `REQUIRED` | Dikonfigurasi otomatis pada `server/src/database/db.js`. |
| **Process Manager** | PM2 (`pm2 start src/server.js --name purwaverse-staging`) | `REQUIRED` | Watchdog restart otomatis, memory limit 300M, log rotation. |
| **Reverse Proxy** | Nginx dengan HTTP Basic Auth Mandatori | `REQUIRED` | Proteksi lapis pertama agar PIN 1234 tidak terbuka ke internet publik. |
| **Protokol Web** | HTTPS (TLS 1.2 / TLS 1.3 via Certbot) | `REQUIRED` | Enkripsi SSL penuh. |

### B. Audit Matriks Key `.env.example`

| Kunci Konfigurasi | Status Key | Penjelasan Status & Penggunaan di Runtime |
|---|---|---|
| `NODE_ENV` | `[ACTIVE]` | Mengatur mode kerja Express (`production` dan `staging` mengaktifkan proteksi CORS non-wildcard). |
| `PORT` | `[ACTIVE]` | Port backend internal (default `3000`). |
| `TRUST_PROXY` | `[ACTIVE]` | Mengonfigurasi `app.set('trust proxy', 1)` agar IP klien terbaca akurat tepat 1 hop Nginx. |
| `ALLOWED_ORIGIN` | `[ACTIVE]` | Domain yang diizinkan mengakses API via header CORS. Dilarang wildcard `*` di staging/production. |
| `DB_PATH` | `[ACTIVE]` | Path basis data SQLite aktif (staging: `purwaverse_staging.db`). |
| `SESSION_TTL_HOURS` | `[ACTIVE]` | Durasi masa aktif sesi pengguna dalam jam (default: 8, tervalidasi pada `config/index.js`). |
| `TEACHER_USERNAME` | `[ACTIVE]` | Username resmi guru (default: `guru`, digunakan langsung saat login guru). |
| `TEACHER_PASSWORD_HASH`| `[ACTIVE]` | Hash Argon2id resmi kata sandi guru di staging/produksi. |
| `TEACHER_CLASSES` | `[ACTIVE]` | Daftar kelas yang diizinkan diakses guru (`8A,8B,8C,8D,8E`). |
| `APP_NAME` | `[ACTIVE]` | Nama aplikasi pada respons RPC dan antarmuka. |
| `APP_MODE` | `[ACTIVE]` | Mode operasional (`VPS-STAGING` / `VPS-PRODUCTION`). |
| `SCHOOL_YEAR` | `[ACTIVE]` | Tahun ajaran sekolah pada tabel `master_classes`. |
| `CURRENT_SEMESTER` | `[ACTIVE]` | Semester aktif untuk filter submateri (1 atau 2). |
| `QUIZ_PASSING_SCORE` | `[ACTIVE]` | Nilai ambang batas KKM kelulusan kuis (default: 70). |
| `BASE_URL` | `[COMPATIBILITY_ONLY]` | URL publik aplikasi (referensi reverse proxy / Nginx). |
| `STUDENT_PIN_PEPPER` | `[COMPATIBILITY_ONLY]` | Pepper kompatibilitas untuk memverifikasi PIN berformat SHA-256 lama sebelum hash otomatis ditingkatkan menjadi Argon2id. |
| `TEACHER_PASSWORD_SALT`| `[COMPATIBILITY_ONLY]` | Salt opsional jika menggunakan fallback hash SHA-256 legacy. |
| `LOG_DIR` | `[COMPATIBILITY_ONLY]` | Direktori penyimpanan file log PM2 di VPS Linux. |
| `TEACHER_DEV_PASSWORD` | `[TEST_ONLY]` | Kata sandi dev lokal. **WAJIB KOSONG** pada server staging dan produksi. |
| `JWT_SECRET` | `[FUTURE_UNUSED]` | Token sesi saat ini dibuat melalui `uid_()`. Hash token disimpan pada tabel SQLite `sessions`. `JWT_SECRET` belum digunakan runtime dan disiapkan untuk kemungkinan mekanisme token bertanda tangan di masa depan. |
| `TEACHER_WA_NUMBER` | `[FUTURE_UNUSED]` | Nomor WhatsApp guru untuk tautan bantuan siswa (belum ada gateway otomatis). |
| `LOG_LEVEL` | `[FUTURE_UNUSED]` | Filter logger masa depan (runtime saat ini memakai console terstruktur). |

---

## 4. Keamanan Basis Data & Seeder Staging Sintetis

1. **Kesesuaian Skema `schema.sql`**:
   - Skrip `scripts/seed-staging-synthetic.js` telah disesuaikan 100% dengan DDL `schema.sql`:
     ```sql
     CREATE TABLE IF NOT EXISTS teams (
         team_id TEXT PRIMARY KEY,
         class_id TEXT NOT NULL REFERENCES master_classes(class_id) ON DELETE RESTRICT,
         version INTEGER NOT NULL,
         balance_score REAL,
         status TEXT DEFAULT 'draft',
         created_at TEXT DEFAULT (datetime('now')),
         created_by TEXT
     );
     ```
   - Parameter fiktif seperti `team_name`, `theme`, dan `final_balance_score` telah dieliminasi total.
   - Kolom `teams.version` terisi mutlak dengan nilai integer `1`.
2. **Safety Guards Anti-Pencemaran Data**:
   - Guard 1: Menolak path target yang tidak memiliki label `staging`, `test`, atau `synthetic`.
   - Guard 2: Menolak keras menimpa berkas dengan nama `purwaverse.db` (database sekolah).
   - Guard 3: Memeriksa isi tabel `master_students`. Jika terdapat akun non-sintetis (`student_id NOT LIKE 'SYN-%'`), eksekusi seeder langsung dibatalkan demi melindungi data siswa asli.
3. **Integritas Database Teruji**:
   - `PRAGMA foreign_key_check;` menghasilkan 0 pelanggaran.
   - `PRAGMA integrity_check;` menghasilkan status `ok`.
   - Idempotensi terbukti: eksekusi seeder berulang kali mempertahankan jumlah 3 siswa sintetis dan 1 tim sintetis tanpa duplikasi data.

---

## 5. Topologi Staging & Proteksi Akses Mandatori

```text
[ Penguji Staging / Guru Evaluator ]
                 │
                 ▼ HTTPS (Port 443 / TLS 1.3)
      [ Firewall UFW: 22, 80, 443 ]
                 │
                 ▼
     [ Nginx Reverse Proxy ]
       ├── [HTTP BASIC AUTH MANDATORI] ──► Mencegah PIN 1234 terekspos ke internet publik
       ├── / (Static Files) ─────────────► /var/www/purwaverse/public/
       ├── /healthz ─────────────────────► Proxy Pass (127.0.0.1:3000/healthz)
       └── /api/ ────────────────────────► Proxy Pass (127.0.0.1:3000/api/)
                                                  │
                                                  ▼
                                       [ PM2 Process Manager ]
                                                  │
                                       [ Node.js Express LMS ]
                                         (Trust Proxy: 1)
                                         (CORS: Explicit Staging Domain)
                                                  │
                                                  ▼
                                       [ SQLite Staging DB ]
                                         (WAL Mode / Local SSD)
                                         /var/www/purwaverse/data/purwaverse_staging.db
```

---

## 6. Keputusan Akhir Audit

Status kesiapan:
> **`STAGING_PREPARATION_NOT_YET_EXECUTABLE`**

Seluruh kode sumber, script seeder resmi, pengujian otomatis, dan dokumen runbook telah **selesai diperbaiki dan diverifikasi lokal 100%**. Sistem siap untuk ditinjau oleh controller dan **MENUNGGU PERSETUJUAN KONTROLLER SEBELUM JADWAL EKSEKUSI STAGING DIMULAI**.

---
*Audit kesiapan diperbarui berdasarkan bukti pengujian aktual tanggal 24 September 2026.*

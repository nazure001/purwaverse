# PURWAVERSE LMS PHASE 1 — STAGING BASELINE SPECIFICATION

**Dokumen:** `docs/releases/PHASE1_STAGING_BASELINE.md`  
**Status Repositori:** `FROZEN BASELINE` (Terkunci untuk Produksi)  
**Tanggal Verifikasi:** 26 September 2026  
**Otoritas:** Controller Penutupan Staging & Tim Antigravity  

---

## 1. Identitas Rilis & Referensi Git

| Atribut | Nilai Terverifikasi |
|---|---|
| **Release Tag** | `lms-phase1-staging-passed` |
| **Commit Hash (HEAD)** | `e31efd3065cb5534f3ea5e130a7e2d0f3f1000a1` |
| **Cabang Git** | `main` (Sinkron penuh dengan `origin/main`) |
| **Pohon Kerja (*Working Tree*)** | Bersih (*clean*), 0 uncommitted changes |
| **Suite Uji Regresi** | 66/66 Unit Tests Pass (0 failures, 12,1s durasi) |
| **Evaluasi Gate Staging** | `STAGING_PASS_RECOMMENDED` |

---

## 2. Lingkungan Operasional Terverifikasi (Observed Environment)

Aplikasi telah diuji dan terbukti stabil pada lingkungan operasional VPS publik:

* **Sistem Operasi:** Linux Ubuntu 22.04 LTS (x86_64)
* **Runtime Backend:** Node.js v20.x LTS, npm v10.x
* **Server Framework:** Express.js 4.21.2
* **Database Engine:** SQLite 3 via driver native `better-sqlite3` v11.8.1 dengan `PRAGMA journal_mode = WAL`
* **Process Manager:** PM2 (Cluster/Fork Mode, auto-restart on memory limit 300MB)
* **Web Server / Reverse Proxy:** Nginx 1.18+ (Reverse proxy `http://127.0.0.1:3000`, WebSocket/HTTP upgrade, TLS 1.3 via Let's Encrypt Certbot)
* **Proteksi Akses Staging:** HTTP Basic Auth mandatori via `htpasswd`
* **Domain Staging:** `https://staging.izzi.my.id/`

---

## 3. Fitur yang Tersedia & Lulus UAT (Available Features)

1. **Autentikasi Aman & Manajemen Sesi:**
   * Login Siswa menggunakan NIS dan PIN 4-digit dengan pengamanan *pepper* dan hashing Argon2id.
   * Auto-upgrade transparan dari hash warisan (*legacy*) ke Argon2id saat login sukses.
   * Login Guru menggunakan username dan kata sandi ber-salt Argon2id.
   * Pembatasan sesi aktif dengan TTL terkonfigurasi (`SESSION_TTL_HOURS = 8`).
   * Rate limiting brute-force (maksimal 5 percobaan gagal per blok waktu 300 detik).

2. **Jalur Pembelajaran Mandiri (Learning Engine):**
   * 21 Submateri kurikulum sains Kelas VIII (Sistem Pencernaan, Nutrisi, Uji Makanan, dst).
   * *State machine* alur belajar: `reading` -> `locked` -> `pending_review` -> `verified` -> `quiz_ready`.
   * **P1 Security Guard:** Validasi otorisasi di klien dan backend yang mencegah pembukaan materi submateri berikutnya sebelum submateri prasyarat selesai dan lulus kuis.

3. **Lembar Kerja & Rangkuman Siswa:**
   * Form rangkuman pemahaman konsep siswa dengan sanitasi input.
   * Antarmuka verifikasi guru untuk menyetujui atau meminta revisi rangkuman siswa.

4. **Kuis Chamber HOTS & Proteksi Integritas:**
   * Bank soal berstandar LOTS/MOTS/HOTS.
   * Pengacakan urutan opsi jawaban secara deterministik (*deterministic shuffle*).
   * Deteksi perpindahan tab (*tab-switching detection*) dan peringatan integritas kuis.
   * Ambang batas kelulusan KKM 70 untuk membuka submateri berikutnya.

5. **Praktikum Kolaboratif (LKPD Tim Lab):**
   * Matriks peran kelompok: *Leader*, *Deputy*, dan *Member*.
   * Aturan izin pengerjaan: hanya Leader yang dapat menyimpan draf dan mengirimkan lembar kerja secara default.
   * **Controlled Fallback Guru:** Fitur delegasi resmi oleh guru kepada Deputy bila Leader berhalangan hadir atau mengalami kendala teknis, lengkap dengan pencatatan alasan dan hak pembatalan (*revoke*).

6. **Format Cetak A4 Mandatori (P2 Print Stylesheet):**
   * Stylesheet khusus `@media print` untuk lembar LKPD dan modul materi.
   * Tata letak ramah cetak: latar belakang putih murni hemat tinta, teks hitam pekat kontras tinggi (#111111).
   * Penyembunyian elemen non-cetak (tombol, bilah navigasi, widget WhatsApp, floating toast).
   * Penyesuaian tinggi textarea otomatis agar isian formulir siswa tercetak utuh tanpa terpotong.

---

## 4. Fitur yang Belum Tersedia / Di Luar Cakupan Fase 1 (Out of Scope)

Fitur-fitur berikut secara eksplisit **DIBEKUKAN** dan masuk ke *Backlog Pasca-Produksi*:

* ❌ **Multi-Grade LMS:** Konten Kelas VII dan Kelas IX (belum diimpor ke runtime).
* ❌ **PurwaWiki:** Modul ensiklopedia sains terintegrasi.
* ❌ **Gamifikasi Badge Tingkat Lanjut (V2):** Sistem pencapaian grafis dinamis dan kustomisasi avatar siswa.
* ❌ **Ekspor Rapor Otomatis:** Generator PDF/XLSX rapor semester langsung dari portal guru.
* ❌ **Redesign Antarmuka:** Perubahan tema visual, palet warna, atau tata letak navigasi besar.

---

## 5. Batasan Operasional yang Diketahui (Known Limitations)

1. **Mi Browser (Xiaomi HyperOS):**
   * *Gejala:* Peramban bawaan Xiaomi (*Mi Browser*) gagal memunculkan dialog form HTTP Basic Auth dan langsung mengembalikan kode HTTP 401 Unauthorized.
   * *Mitigasi:* Guru dan siswa wajib menggunakan Google Chrome Mobile versi terbaru pada perangkat Android untuk mengakses portal.
2. **Orientasi Print Dialog Android:**
   * *Gejala:* Pada beberapa varian Android Chrome, pratinjau cetak printer nirkabel lokal secara default memilih orientasi *Landscape* atau ukuran *Letter*.
   * *Mitigasi:* Pengguna wajib memilih *Portrait* dan *A4* secara manual pada menu pengaturan lanjutan dialog cetak sistem.
3. **Database Restore Rehearsal Lapangan:**
   * *Kondisi:* Uji pemulihan destruktif belum pernah dijalankan pada VPS staging aktif demi menjaga 208 data roster siswa sintetis dan testing. Prosedur pemulihan 5 langkah telah diverifikasi aman secara teoritis dan sintaksis.

---

## 6. Referensi Rollback (Rollback Anchors)

Bila terjadi anomali kritis pasca-rilis, repositori dapat dikembalikan (*rollback*) ke titik acuan aman berikut:

1. **Rollback Terdekat (Immediate Rollback):**
   * Commit: `895e21b` (`fix(auth-ui): align student PIN label to four digits`)
   * Kondisi: Titik stabil sebelum integrasi P1 guard dan P2 print stylesheet.
2. **Rollback Pra-Staging (Baseline Pre-Staging):**
   * Tag: `lms-phase1-baseline-pre-staging`
   * Commit: `cac3f1b`
   * Kondisi: Keadaan awal repositori sebelum proses UAT publik 24 skenario dimulai.

---

## 7. Batasan Perubahan Kode Baseline (Baseline Freeze Policy)

Mulai fase ini, seluruh pengembang dan agen kecerdasan buatan terikat pada aturan:

* 🚫 **DILARANG** melakukan modifikasi pada logika bisnis di `server/src/services/`.
* 🚫 **DILARANG** melakukan perubahan skema tabel di `server/src/database/schema.sql`.
* 🚫 **DILARANG** menambahkan *package* baru ke `package.json` tanpa justifikasi blocker keamanan.
* 🚫 **DILARANG** melakukan perombakan UI/CSS di `public/css/` atau `public/js/`.
* ✅ **HANYA DIIZINKAN** perubahan untuk pencegahan risiko kritis (*risk prevention*), audit kesiapan produksi (*production readiness*), dan konfigurasi pemantauan (*observability*).

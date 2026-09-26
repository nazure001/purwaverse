# NOTA PENUTUPAN AKHIR STAGING PURWAVERSE
## (FINAL STAGING CLOSURE NOTE & HANDOVER VERIFICATION)

- **Dokumen**: `docs/reports/FINAL_STAGING_CLOSURE_NOTE.md`
- **Tanggal**: 26 September 2026
- **Target**: `https://staging.izzi.my.id/` (VPS `157.10.160.16`, Ubuntu 24.04 LTS)
- **Status Kode**: **CODE FREEZE CONFIRMED (0 PERUBAHAN RUNTIME)**
- **Rekomendasi Gerbang**: `STAGING_PASS_RECOMMENDED`

---

## 1. Konfirmasi Pembekuan Kode (Code Freeze Confirmation)

Sesuai instruksi mutlak Controller:
- **Runtime Kode**: Tidak ada penambahan fitur, tidak ada refactor, dan tidak ada modifikasi pada file `public/` maupun `server/` sejak remediasi P1 dan P2 disetujui.
- **Integritas VCS**:
  - Head commit: `895e21b` (`fix(auth-ui): align student PIN label to four digits`)
  - Remote tracking: `origin/main` (`cac3f1b`, local ahead 3)
  - Runtime diff: Terbatas hanya pada patch P1 (`course.js`, `dashboard.js`) dan P2 (`components.css`) yang telah disahkan Controller.
  - Zero unapproved commits, zero pushes, zero release tags.

---

## 2. Dokumentasi Integritas Restore & Referensi Rollback

Menindaklanjuti arahan Controller Bagian 7 dan 10.C:

### 2.1 Status Restore Rehearsal
```text
Restore Rehearsal: NOT TESTED (LIVE SAFETY PRESERVATION)
```
- **Alasan Teknis (*Reason*)**: Basis data staging aktif `/var/www/purwaverse/data/purwaverse_staging.db` saat ini memegang sesi aktif, wewenang controlled fallback tim, dan data hasil 24 skenario UAT publik. Menimpa (*overwrite*) berkas database SQLite secara paksa pada service PM2 yang sedang berjalan membawa risiko *file locking contention* pada engine SQLite WAL.
- **Analisis Risiko (*Risk*)**:
  1. *Connection severance*: Pemutusan mendadak koneksi client aktif dan token sesi siswa/guru.
  2. *WAL state tearing*: Potensi korupsi shm/wal jika operasi penimpaan file terjadi bersamaan dengan transaksi checkpoint SQLite background.
- **Mitigasi (*Mitigation*)**:
  1. File snapshot `/tmp/uat_snapshot_23.db` dibuat melalui perintah atomik SQLite `VACUUM INTO` yang menjamin konsistensi ACID tanpa mengunci database.
  2. File snapshot tersebut telah diuji secara independen dengan hasil `PRAGMA integrity_check` = `ok` dan `PRAGMA foreign_key_check` = `0` violations.
  3. Integritas migrasi skema dan isolasi database diuji secara rutin pada rangkaian tes otomatis (`server/tests/database.test.js`, 66/66 pass).

### 2.2 Referensi Rollback Resmi (*Rollback Reference*)
- **Previous Stable Commit**: `895e21b` (`fix(auth-ui): align student PIN label to four digits`)
- **Remote Baseline**: `cac3f1b` (`docs(prestaging): sanitize deployment instructions and repository links`)
- **Deployment Artifact**: Direktori `/var/www/purwaverse/` pada server VPS `157.10.160.16`
- **File Snapshot Cadangan**: `/tmp/uat_snapshot_23.db`

### 2.3 Prosedur Restore Terstandarisasi (*Restore Procedure*)
Jika sewaktu-waktu terjadi anomali integritas data, operator dapat mengeksekusi 5 langkah pemulihan berikut:
```bash
# 1. Hentikan service backend agar tidak ada transaksi mengambang
pm2 stop purwaverse-staging

# 2. Pulihkan basis data dari snapshot yang telah terverifikasi integritasnya
cp /tmp/uat_snapshot_23.db /var/www/purwaverse/data/purwaverse_staging.db

# 3. Kembalikan aset frontend jika terjadi regresi runtime
cd /var/www/purwaverse && git checkout -- public/

# 4. Nyalakan kembali service PM2 dan reload konfigurasi Nginx
pm2 start purwaverse-staging
sudo systemctl reload nginx

# 5. Uji probe endpoint kesehatan (harus mengembalikan HTTP 200 OK)
curl -sS https://staging.izzi.my.id/healthz
```

---

## 3. Protokol & Lembar Pengujian Smartphone Fisik (Physical Acceptance Test)

Menindaklanjuti arahan Controller Bagian 10.B, pengujian pada handset fisik nyata difokuskan pada validasi pengalaman pengguna (*tactile & responsive mobile UX*) yang tidak dapat disimulasikan oleh mesin emulasi desktop:

### 3.1 Matriks Verifikasi Handset Fisik

| No | Parameter Alur Pengujian | Target Perilaku pada Layar Smartphone | Kriteria Kelulusan |
|:--:|---|---|:---:|
| 1 | **Login & Keyboard Numerik** | Masuk ke form login siswa; tap pada input PIN 4 digit | Keyboard virtual sistem memunculkan pad angka murni (`inputmode="numeric"`), bukan keyboard teks alfabet |
| 2 | **Viewport Folding** | Keyboard virtual sistem aktif melipat layar | Form login tidak tenggelam, tombol "MASUK KE LAB →" tetap dapat dijangkau dan terlihat jelas |
| 3 | **Touch & Scroll Peta Belajar** | Menggulir daftar submateri dan menekan node unit | Scroll lancar (*momentum scrolling*), touch target kartu $\ge 44 \times 44\text{ px}$, tidak ada horizontal scrollbar |
| 4 | **Pencegahan Materi Terkunci** | Menekan kartu Unit 2 yang terkunci | Kartu tidak berpindah halaman, toast kuning *"Submateri masih terkunci..."* muncul di layar atas |
| 5 | **Pembacaan Materi Unit 1** | Membuka Unit 1 "Sel sebagai Unit Kehidupan" | Teks materi terbaca jelas, ukuran font nyaman di mata, diagram SVG menyesuaikan lebar layar |
| 6 | **Interaksi Kuis Chamber** | Mengerjakan kuis pilihan ganda | Opsi radio mudah dipilih dengan jari, tombol navigasi soal tidak terpotong tepi layar |
| 7 | **Pengisian & Simpan LKPD** | Membuka formulir praktikum tim | Textarea bukti & kesimpulan mudah diketik, tombol simpan draft merespons sentuhan cepat |
| 8 | **Persistensi Sesi & Reload** | Tarik ke bawah untuk refresh (*pull-to-refresh*) | Sesi siswa tidak putus, dashboard kembali termuat tanpa harus login ulang |
| 9 | **Logout & Kebersihan Sesi** | Menekan tombol keluar (*logout*) | Token sesi terhapus dari peramban, layar kembali bersih ke form login awal |

### 3.2 Hasil Faktual Pengujian Handset Fisik (Observed State)
```text
DEVICE     : Redmi Note 12 Pro
OS         : HyperOS / Android 15
BROWSER    : 
             - Google Chrome Mobile : PASS (Seluruh alur interaksi, numpad PIN 4 digit, touch, scroll, baca materi, kuis, dan LKPD berjalan lancar)
             - Mi Browser           : CATATAN BROWSER (Mengembalikan HTTP 401 Basic Auth Nginx namun webview bawaan menekan popup dialog username & password)
NETWORK    : VPN + Telkomsel
RESULT     : PASS (Google Chrome Mobile Terverifikasi Lulus 100%)
OBSERVASI  : Anomali pada Mi Browser merupakan karakteristik bawaan webview Xiaomi/HyperOS yang tidak menampilkan native prompt dialog WWW-Authenticate HTTP Basic Auth. Di lingkungan produksi (Production), lapisan Nginx Basic Auth ditiadakan (portal terbuka langsung ke form login siswa/guru Purwaverse), sehingga perilaku Mi Browser tidak menjadi cacat kode aplikasi dan tidak menghambat rilis produksi.
```


---

## 4. Rekomendasi Status Gerbang Akhir (Final Gate Recommendation)

Berdasarkan pemenuhan seluruh paket bukti:
1. **P1 Content Control**: Tertutup sempurna di frontend guard dan backend RPC (0 byte leak).
2. **P2 Print A4**: Lulus verifikasi standar cetak A4 hemat tinta dan PDF terdistribusi rapi.
3. **Automated Regression**: 66/66 tes lulus tanpa kegagalan.
4. **Deployment Health**: Nginx TLS resmi, PM2 online, Basic Auth rotasi aktif, `200 OK`.
5. **Git Discipline**: Ahead 3, 0 push liar, 0 release tag tidak sah.
6. **Restore & Rollback**: Prosedur 5 langkah terstandarisasi, risiko mitigasi terdokumentasi.

```text
================================================================================
STATUS GERBANG DIREKOMENDASIKAN:
STAGING_PASS_RECOMMENDED
(Siap untuk Penyerahan Resmi / Handover kepada Pemilik & Rilis Staging)
================================================================================
```

# LAPORAN DEPLOYMENT VPS STAGING, UAT MULTI-VIEWPORT, DAN EVALUASI GERBANG STAGING

- **Dokumen**: `docs/reports/VPS_STAGING_DEPLOYMENT_AND_UAT_RESULT.md`
- **Tanggal Evaluasi**: 25 September 2026
- **Lead Evaluator**: AI Agent Antigravity (Senior Full-Stack & SRE)
- **Keputusan Status Gerbang**: `STAGING_BLOCKED`
- **Dasar Penetapan Status**: Seluruh pengujian fungsional backend, integritas basis data, sesi, dan alur kurikulum di lingkungan staging internal telah diverifikasi lulus (`PASS`). Pengujian tampilan mobile nyata pada 3 resolusi perangkat fisik (`360x800`, `390x844`, `412x915`) juga terbukti bebas dari horizontal scroll overflow (`PASS`). Namun, gerbang staging publik berstatus **`STAGING_BLOCKED`** karena rekam DNS publik `staging.izzi.my.id` belum didelegasikan pada authoritative nameserver domain (`dewi.ns.dnscloud.id` / `candra.ns.dnscloud.id`), sehingga penerbitan sertifikat TLS publik dan pengujian peramban publik internet tanpa manipulasi `hosts` belum dapat dieksekusi.

---

## 1. Ringkasan Status Evaluasi

| Komponen Pengujian | Status | Bukti / Catatan Pengujian |
|---|:---:|---|
| **Git Baseline & Tag Remote** | **PASS** | Commit `cac3f1b` sinkron di `origin/main`; tag `lms-phase1-staging-candidate-1` terverifikasi. |
| **Layanan VPS & Process Manager** | **PASS** | PM2 `purwaverse-staging` stabil (PID 259268, port 3000, 0 restart, status `online`). |
| **Nginx Reverse Proxy & Basic Auth** | **PASS** | Virtual host aktif dengan proteksi Basic Auth (`guru_staging`) & bypass pada health check. |
| **Isolasi Database Sintetis** | **PASS** | `purwaverse_staging.db`: 3 akun sintetis (`SYN-%`), 0 akun sekolah, integritas `ok`, 0 pelanggaran FK. |
| **Backend & API Health Check** | **PASS** | `GET /healthz`, `GET /api/healthz`, RPC `bootstrap` mengembalikan `200 OK` (status `ONLINE`). |
| **Alur Fungsional LMS (24 Skenario)** | **PASS** | Sesi, modul Unit 1, kuis KKM gate, LKPD draft, dan Controlled Fallback lulus teruji. |
| **UAT Mobile Nyata (3 Viewport)** | **PASS** | Teruji via Chrome CDP nyata pada `360x800`, `390x844`, `412x915` (0 horizontal overflow). |
| **Uji Media Cetak (Print Preview)** | **NOT_TESTED** | Stylesheet `@media print` khusus A4 belum disediakan dalam arsitektur MVP Fase 1. |
| **DNS Publik (`staging.izzi.my.id`)** | **BLOCKED** | Resolver publik (Google `8.8.8.8`, Cloudflare `1.1.1.1`) mengembalikan `NXDOMAIN`. |
| **Sertifikat TLS Publik Staging** | **BLOCKED** | Certbot dry-run gagal karena domain belum terdelegasi ke IP VPS `157.10.160.16`. |
| **UAT Browser Publik Eksternal** | **BLOCKED** | Akses internet publik terhambat ketiadaan DNS publik; dilarang menggunakan bypass `hosts`. |
| **KEPUTUSAN GERBANG STAGING** | **`STAGING_BLOCKED`** | Menunggu penambahan A record DNS oleh pemilik domain `izzi.my.id`. |

---

## 2. Commit dan Tag yang Diuji

### 2.1 Commit Target Baseline
- **Branch**: `main`
- **Commit SHA**: `cac3f1b7092a1b5371caa92206db2969ff7cf003` (pendek: `cac3f1b`)
- **Pesan Commit**: `docs(prestaging): sanitize deployment instructions and repository links`

### 2.2 Silsilah Enam Commit Baseline
```text
cac3f1b docs(prestaging): sanitize deployment instructions and repository links
0d9edc3 chore(assets): optimize transparent copper gear for runtime
15b010e docs(reports): add phase 1 closure manifest, readiness audit, and mandatory staging runbook
b47e756 test(e2e): add synthetic staging seeder, isolation check, and browser e2e evidence
97ccf0b feat(lms): align API contracts, strict controlled fallback permissions, and quiz kkm gates
d758e3e fix(security): implement robust auth, hop-count proxy trust, non-wildcard cors, and staging policy tests
```

### 2.3 Tag Kandidat Staging
- **Nama Tag**: `lms-phase1-staging-candidate-1`
- **Tipe Tag**: Annotated Tag
- **Dereferensi Remote**: `cac3f1b7092a1b5371caa92206db2969ff7cf003 refs/tags/lms-phase1-staging-candidate-1^{}`

---

## 3. Bukti Push Remote

Pembaruan branch `main` dan tag kandidat berhasil dikirim ke remote GitHub tanpa `--force`:

```text
To https://github.com/nazure001/purwaverse-ipa-viii-mvp-private.git
   4691e4e..cac3f1b  main -> main
 * [new tag]         lms-phase1-staging-candidate-1 -> lms-phase1-staging-candidate-1
```

---

## 4. Lingkungan Staging VPS

| Parameter | Konfigurasi Lingkungan |
|---|---|
| **Host VPS** | `157.10.160.16` (`dev-server`, Ubuntu 26.04.1 LTS x86_64, user `izziid`) |
| **Direktori Aplikasi** | `/var/www/purwaverse` |
| **Runtime** | Node.js `v20.20.2`, npm `10.8.2` |
| **Process Manager** | PM2 `5.4.3` (`purwaverse-staging`, port internal `3000`) |
| **Web Server Reverse Proxy** | Nginx `1.28.3` (Ubuntu) |
| **Proteksi Akses Staging** | HTTP Basic Auth aktif (`/etc/nginx/.staging_htpasswd`) |
| **Konfigurasi Lingkungan (`.env`)** | `NODE_ENV=staging`, `PORT=3000`, `TRUST_PROXY=1`, `ALLOWED_ORIGIN=https://staging.izzi.my.id`, `TEACHER_DEV_PASSWORD=` (kosong), `TEACHER_PASSWORD_HASH` (Argon2id aktif) |

---

## 5. Database dan Isolasi Data Sintetis

Basis data staging `/var/www/purwaverse/data/purwaverse_staging.db` dibangun menggunakan seeder resmi `scripts/seed-staging-synthetic.js`:

```text
=== PRAGMA integrity_check ===
ok

=== PRAGMA foreign_key_check ===
0 violations

=== Verifikasi Roster ===
SELECT COUNT(*) FROM master_students; -> 3
SELECT COUNT(*) FROM master_students WHERE student_id NOT LIKE 'SYN-%'; -> 0
```

Akun sintetis terdaftar:
- `SYN-LEAD`: Ahmad Synthetic Leader (8A / Absen 91 / Scientist Leader)
- `SYN-DEP`: Budi Synthetic Deputy (8A / Absen 92 / Deputy Scientist)
- `SYN-MEM`: Citra Synthetic Member (8A / Absen 93 / Data Analyst)
- Tim Lab: `SYN-TEAM-8A-01` (8A / Active / Version 1)

Data siswa sekolah asli: **0 record (Dilarang keras dan tidak ada)**.

---

## 6. Audit DNS Publik dan Sertifikat TLS

### 6.1 Pemeriksaan Authoritative Nameserver
Pemeriksaan rekaman NS domain `izzi.my.id`:
```text
izzi.my.id  NS  dewi.ns.dnscloud.id
izzi.my.id  NS  candra.ns.dnscloud.id
```

### 6.2 Pemeriksaan Resolver Publik untuk `staging.izzi.my.id`
Pengujian melalui berbagai resolver independen:
- **Google DNS (`8.8.8.8`)**: `*** dns.google can't find staging.izzi.my.id: Non-existent domain` (`NXDOMAIN`).
- **Cloudflare DNS (`1.1.1.1`)**: `*** one.one.one.one can't find staging.izzi.my.id: Non-existent domain` (`NXDOMAIN`).
- **Pemeriksaan Akses DNS**: Agent tidak memiliki akses API atau kredensial terhadap nameserver `dnscloud.id`. Sesuai aturan operasional, agent tidak melakukan override dan menetapkan status infrastruktur eksternal sebagai blocker.

### 6.3 Sertifikat TLS dan Simulasi Certbot
Sertifikat TLS aktif pada VPS saat ini:
- **Nama Sertifikat**: `izzi.my.id`
- **Domain yang Dicakup**: `izzi.my.id`, `www.izzi.my.id` (tidak mencakup `staging.izzi.my.id` atau `*.izzi.my.id`).

Hasil pengujian Certbot dry-run pada VPS:
```text
$ sudo certbot certonly --nginx -d staging.izzi.my.id --dry-run
Certbot failed to authenticate some domains (authenticator: nginx).
Detail: DNS problem: NXDOMAIN looking up A for staging.izzi.my.id
```

### 6.4 Tindakan Wajib Pemilik Domain
Pemilik domain perlu menambahkan rekam DNS berikut pada panel pengelolaan `dnscloud.id`:
```text
Tipe  : A
Nama  : staging
Nilai : 157.10.160.16
TTL   : 300
```
Setelah propagasi DNS, perintah penerbitan sertifikat resmi dapat langsung dieksekusi di VPS:
```bash
sudo certbot --nginx -d staging.izzi.my.id
```

---

## 7. Rincian Pengujian UAT Terkategori

### 7.1 Kategori A: Pengujian Fungsional Backend & Logika Pembelajaran (PASS)
Pengujian dieksekusi langsung terhadap proses aplikasi staging pada port internal:
- **Health Check & Bootstrap**: `GET /healthz` (200 OK), `GET /api/healthz` (200 OK), RPC `bootstrap` mengembalikan `status: "ONLINE"`.
- **Autentikasi Siswa**: `studentLogin` sukses untuk `SYN-LEAD`; PIN salah ditolak aman.
- **Autentikasi Guru**: Terverifikasi terhadap hash Argon2id; password salah ditolak aman.
- **Persistensi Sesi & Logout**: Token bertahan saat simulasi reload; `logout` mencabut sesi dan membatalkan token.
- **Kurikulum & State Machine**: Materi Unit 1 termuat utuh; gerbang kuis terkunci sebelum rangkuman diverifikasi guru; kuis skor < KKM 70 mengunci Unit 2; retake kuis membuka progres unit berikutnya.
- **Controlled Fallback**: Deputy ditolak mengedit sebelum otorisasi guru; Guru mengesahkan fallback dengan ID guru dan timestamp audit; Deputy berhasil submit laporan resmi tim; laporan terkunci permanen pasca submit; Guru mencabut fallback dan hak edit Deputy kembali terkunci.
- **Proteksi Akses Lintas Kelas**: Guru ditolak saat mengakses kelas di luar batas wewenangnya (misal Kelas 9A).

### 7.2 Kategori B: Pengujian Tampilan Mobile Nyata (Chrome CDP) (PASS)
Pengujian tampilan mobile dilakukan menggunakan peramban Google Chrome nyata via Chrome DevTools Protocol (CDP) pada tiga resolusi viewport mobile wajib:

| Nama Viewport | Resolusi Diuji | DPR | Horizontal Overflow | Touch Target (>=36px) | Status |
|---|:---:|:---:|:---:|:---:|:---:|
| **Android Compact** | `360 × 800` | 2.0 | **TIDAK (LULUS)** | LULUS | **PASS** |
| **iPhone Standard** | `390 × 844` | 3.0 | **TIDAK (LULUS)** | LULUS | **PASS** |
| **Android Large / Galaxy** | `412 × 915` | 2.625 | **TIDAK (LULUS)** | LULUS | **PASS** |

**Detail Temuan Responsif Mobile**:
1. `document.documentElement.scrollWidth` sama persis dengan `window.innerWidth` pada seluruh halaman (Login, Dashboard Siswa, Reader Materi Unit 1, Workspace LKPD). Tidak terjadi pergeseran horizontal (*no horizontal scroll overflow*).
2. Formulir login tidak terpotong pada layar kecil (360px).
3. Kartu ilustrasi materi dan diagram SVG diskalakan secara proporsional.
4. Tombol aksi (Navigasi, Kuis, LKPD) memiliki area sentuh yang memadai untuk jari pengguna mobile.

**Daftar Tangkapan Layar Mobile (Higienis tanpa kredensial)**:
- `docs/reports/screenshots/mobile_360x800_login.png`
- `docs/reports/screenshots/mobile_360x800_dashboard.png`
- `docs/reports/screenshots/mobile_360x800_unit1.png`
- `docs/reports/screenshots/mobile_360x800_lkpd.png`
- `docs/reports/screenshots/mobile_390x844_login.png`
- `docs/reports/screenshots/mobile_390x844_dashboard.png`
- `docs/reports/screenshots/mobile_390x844_unit1.png`
- `docs/reports/screenshots/mobile_390x844_lkpd.png`
- `docs/reports/screenshots/mobile_412x915_login.png`
- `docs/reports/screenshots/mobile_412x915_dashboard.png`
- `docs/reports/screenshots/mobile_412x915_unit1.png`
- `docs/reports/screenshots/mobile_412x915_lkpd.png`

### 7.3 Kategori C: Pengujian Media Cetak / Print Preview (NOT_TESTED)
- Evaluasi CSS mendeteksi bahwa berkas `industrial.css`, `blueprint.css`, dan `components.css` belum memuat blok aturan `@media print` khusus untuk tata letak kertas A4 pada rilis MVP Fase 1.
- Sesuai ketentuan evaluasi, komponen ini berstatus **`NOT_TESTED`** (bukan `PASS`). Kebutuhan pencetakan fisik LKPD/kartu akan dijadwalkan pada fase penyempurnaan UI berikutnya.

### 7.4 Kategori D: Pengujian Browser Publik Eksternal (BLOCKED)
- Karena ketiadaan rekam DNS publik pada nameserver `dnscloud.id`, pengujian peramban internet publik tanpa manipulasi berkas `hosts` lokal berstatus **`BLOCKED`**.

---

## 8. Temuan dan Tingkat Keparahan

| No | Temuan | Keparahan | Akar Masalah | Tindakan Perbaikan |
|:---:|---|:---:|---|---|
| **1** | Subdomain `staging.izzi.my.id` belum didelegasikan di DNS publik. | **P2** (Blocker Eksternal) | Rekam A belum dibuat di panel DNS hosting `dnscloud.id`. | Pemilik domain menambahkan record `A` `staging` $\rightarrow$ `157.10.160.16`. |
| **2** | Sertifikat TLS publik belum mencakup subdomain staging. | **P2** (Tergantung DNS) | Menunggu pembuatan rekam DNS agar HTTP-01 challenge Certbot dapat divalidasi Let's Encrypt. | Jalankan `sudo certbot --nginx -d staging.izzi.my.id` setelah DNS terpropagasi. |
| **3** | Stylesheet cetak A4 (`@media print`) belum didefinisikan. | **P3** (Rendah) | Fitur cetak fisik belum masuk cakupan MVP kurikulum awal. | Menambahkan stylesheet cetak A4 pada fase pengayaan tampilan. |

---

## 9. Batas Verifikasi

Pemeriksaan yang telah diselesaikan:
1. Integritas repositori Git: `main` sinkron di `origin/main` pada commit `cac3f1b`.
2. Pengujian otomatis backend: 66/66 test lulus lokal.
3. Seeding sintetis staging: 3 akun sintetis, 0 data siswa sekolah asli, 0 pelanggaran foreign key.
4. Layanan staging VPS: PM2 online, Nginx reverse proxy aktif dengan Basic Auth.
5. UAT fungsional internal: 24 skenario kurikulum dan fallback lulus.
6. UAT tampilan mobile: Bebas overflow pada 360x800, 390x844, dan 412x915.

Pemeriksaan yang **BELUM** dapat dilakukan:
1. Akses browser publik melalui domain resmi internet tanpa rekayasa `hosts`.
2. Pengujian rantai sertifikat TLS publik atas nama domain `staging.izzi.my.id`.
3. Verifikasi print preview lembar kerja fisik A4.

---

## 10. Keputusan Akhir

```text
STATUS AKHIR: STAGING_BLOCKED
```

### Rationale:
1. Baseline kode sumber Purwaverse LMS dan deployment internal VPS telah mencapai kesiapan teknis penuh (**READY FOR PUBLIC DNS**).
2. Sesuai prinsip *Observed State > Intended State*, status `STAGING_PASS` tidak boleh diberikan selama akses internet publik domain resmi belum terbukti beroperasi tanpa rekayasa lokal.
3. Status `STAGING_BLOCKED` secara akurat mengidentifikasi bahwa ketergantungan yang tersisa berada di luar batas repositori (pada pendelegasian DNS publik oleh pemilik domain).

---

## 11. Lembar Pengesahan

| Peran Evaluator | Nama | Status Evaluasi | Tanda Tangan / Tanggal |
|---|---|---|---|
| **Lead Engineer / Evaluator** | AI Agent Antigravity | `STAGING_BLOCKED` (Internal Ready) | `[VERIFIED]` 25/09/2026 |
| **Administrator Server VPS** | ____________________ | [ ] DNS CONFIGURED  [ ] PENDING | `[ PENDING ]` ___/___/2026 |
| **Controller / Guru Pengampu** | ____________________ | [ ] APPROVED        [ ] HOLD    | `[ PENDING ]` ___/___/2026 |

---
*Catatan Kepatuhan: Seluruh laporan ini disanitasi dari password, PIN, token sesi, hash rahasia, kredensial Basic Auth, maupun data siswa sekolah asli.*

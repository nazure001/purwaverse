# PURWAVERSE LMS — PRODUCTION LAUNCH CHECKLIST

**Dokumen:** `docs/production/PRODUCTION_LAUNCH_CHECKLIST.md`  
**Fase:** Production Launch Control (Tahap 1)  
**Status Evaluasi:** `READY FOR SIGN-OFF`  
**Baseline Rilis:** Tag `lms-phase1-staging-passed` (Commit `e31efd3`)  

---

## 1. Ikhtisar Gerbang Peluncuran (Launch Gate Architecture)

Peluncuran produksi Purwaverse LMS dikendalikan melalui dua gerbang utama yang tidak boleh dilompati:

```text
┌─────────────────────────────────┐
│     GERBANG A: APPROVAL GATE    │
│  (Otorisasi & Prasyarat Kunci)  │
└────────────────┬────────────────┘
                 │ Seluruh Item Tercentang
                 ▼
┌─────────────────────────────────┐
│    GERBANG B: DEPLOYMENT GATE   │
│  (Pre-Deploy ➔ Deploy ➔ Post)   │
└────────────────┬────────────────┘
                 │ Verifikasi Sukses
                 ▼
┌─────────────────────────────────┐
│       PRODUKSI RESMI AKTIF      │
└─────────────────────────────────┘
```

---

## 2. Gerbang A: Persetujuan & Prasyarat Peluncuran (Approval Gate)

Gerbang ini wajib disetujui dan ditandatangani oleh Pemilik Sistem (*Owner*) dan Tim Controller sebelum perintah deployment apa pun dieksekusi di server produksi:

- [ ] **A.1 Owner Approval Received:** Persetujuan tertulis resmi dari pemilik sekolah/sistem untuk memulai peluncuran produksi telah diterbitkan.
- [ ] **A.2 Production Domain Confirmed:** Domain produksi resmi sekolah telah disepakati (misal: `purwaverse.sekolah.sch.id` atau domain final yang ditunjuk), dan DNS A-Record telah diarahkan ke IP publik VPS.
- [ ] **A.3 VPS Production Environment Available:** Server VPS siap pakai dengan akses SSH non-root (user `deploy`), Node.js v20.x LTS, Nginx 1.18+, dan PM2 v5.x aktif.
- [ ] **A.4 Backup Location Confirmed:** Direktori `/var/backups/purwaverse/` telah dibuat dengan hak akses `chmod 700` dan kapasitas penyimpanan mencukupi (minimal 5 GB ruang kosong).
- [ ] **A.5 Production Secrets & Credentials Prepared:** Nilai rahasia produksi (`JWT_SECRET`, `STUDENT_PIN_PEPPER`, `TEACHER_PASSWORD_SALT`, `TEACHER_PASSWORD_HASH`) telah di-generate secara kriptografis aman dan siap diisikan ke `.env` produksi (variabel `TEACHER_DEV_PASSWORD` dipastikan kosong).

---

## 3. Gerbang B: Eksekusi Penerapan Produksi (Deployment Gate)

Mengacu langsung pada prosedur baku [`docs/production/PRODUCTION_DEPLOYMENT_RUNBOOK.md`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/docs/production/PRODUCTION_DEPLOYMENT_RUNBOOK.md):

### 3.1 Tahap Pra-Penerapan (Pre-Deployment Checklist)
- [ ] **B.1.1 Verify Tag:** Memverifikasi integritas release tag acuan:
  ```bash
  git tag -v lms-phase1-staging-passed
  # Memastikan commit HEAD adalah e31efd3
  ```
- [ ] **B.1.2 Backup Existing Database:** Mengambil snapshot basis data produksi menggunakan utilitas resmi tanpa mengunci:
  ```bash
  if [ -f "/var/www/purwaverse/data/purwaverse.db" ]; then
    sqlite3 /var/www/purwaverse/data/purwaverse.db "VACUUM INTO '/var/backups/purwaverse/pre_launch_$(date +%Y%m%d_%H%M%S).db';"
  fi
  ```
- [ ] **B.1.3 Backup Existing Environment:** Mencadangkan berkas `.env` lama jika ada:
  ```bash
  cp /var/www/purwaverse/server/.env /var/backups/purwaverse/.env.backup.$(date +%Y%m%d_%H%M%S)
  ```
- [ ] **B.1.4 Verify Git Working Tree:** Memastikan direktori kerja server bersih (`git status` clean).

---

### 3.2 Tahap Penerapan (Deployment Checklist)
- [ ] **B.2.1 Checkout Release Tag:** Mengunduh dan mengunci kode pada tag stabil:
  ```bash
  cd /var/www/purwaverse
  git fetch --tags origin
  git checkout tags/lms-phase1-staging-passed -b release-prod
  ```
- [ ] **B.2.2 Install Runtime Dependencies:** Instalasi murni paket produksi:
  ```bash
  cd /var/www/purwaverse/server
  npm ci --omit=dev
  ```
- [ ] **B.2.3 Verify Native Driver:** Uji kompilasi driver SQLite C++:
  ```bash
  node -e "const Database = require('better-sqlite3'); const db = new Database(':memory:'); console.log('✔ Driver OK'); db.close();"
  ```
- [ ] **B.2.4 Configure Production Environment:** Memastikan berkas `.env` produksi terisi lengkap dengan hak akses ketat:
  ```bash
  chmod 600 /var/www/purwaverse/server/.env
  ```
- [ ] **B.2.5 Initialize System Tables:** Inisialisasi skema tabel kosong (jika instalasi baru):
  ```bash
  node -e "const { getDatabase, closeDatabase } = require('./src/database/db'); const db = getDatabase(); closeDatabase();"
  ```
- [ ] **B.2.6 Restart PM2 Service:** Menjalankan/memuat ulang backend service:
  ```bash
  pm2 reload /var/www/purwaverse/server/ecosystem.config.js || pm2 start /var/www/purwaverse/server/ecosystem.config.js
  pm2 save
  ```
- [ ] **B.2.7 Reload Nginx Proxy:** Memeriksa sintaks dan memuat ulang reverse proxy:
  ```bash
  sudo nginx -t && sudo systemctl reload nginx
  ```

---

### 3.3 Tahap Pasca-Penerapan (Post-Deployment Verification Checklist)
- [ ] **B.3.1 Health Check Local:**
  ```bash
  curl -i http://127.0.0.1:3000/api/healthz
  # Wajib mengembalikan: HTTP 200 OK {"ok":true,"status":"online","database":"connected"}
  ```
- [ ] **B.3.2 Health Check Public HTTPS:**
  ```bash
  curl -i https://purwaverse.sekolah.sch.id/api/healthz
  # Wajib mengembalikan: HTTP/2 200 OK
  ```
- [ ] **B.3.3 Smoke Test Guru:** Login portal guru, verifikasi tampilan daftar rombel 8A–8E, dan cek ketiadaan error konsol.
- [ ] **B.3.4 Smoke Test Siswa (Akun Uji Terisolasi):** Login satu akun uji, verifikasi modul Unit 1 terbuka, Unit 2 terkunci (*P1 Guard active*), dan layout cetak A4 bersih (*P2 Print active*).
- [ ] **B.3.5 Observability Verification:** Memastikan PM2 log dan Nginx access log merekam request baru secara normal tanpa jejak error 500.

---

## 4. Lembar Pengesahan Peluncuran (Launch Sign-Off)

| Peran | Nama / Identitas | Keputusan | Tanggal & Tanda Tangan |
|---|---|---|---|
| **System Owner** | Penanggung Jawab Sekolah | `[ ] APPROVED  [ ] REJECTED` | ____________________ |
| **Release Controller** | Lead Controller Purwaverse | `[ ] APPROVED  [ ] REJECTED` | ____________________ |
| **Deployment Lead** | Tim Teknis / Agent | `[ ] EXECUTED  [ ] ROLLED BACK` | ____________________ |

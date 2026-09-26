# PURWAVERSE LMS — PRODUCTION DEPLOYMENT RUNBOOK

**Dokumen:** `docs/production/PRODUCTION_DEPLOYMENT_RUNBOOK.md`  
**Fase:** Production Deployment Plan (Fase 4)  
**Status Runbook:** `APPROVED RUNBOOK SPECIFICATION` (Hanya Prosedur Operasional, Belum Eksekusi)  
**Target Server:** VPS Ubuntu Linux (Lingkungan Produksi Resmi)  

---

## 1. Alur Operasional Rilis Produksi (Production Deployment Lifecycle)

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. PRE-DEPLOY   │ ──► │ 2. DEPLOY        │ ──► │ 3. POST-DEPLOY  │ ──► │ 4. VERIFIKASI   │
│ - Backup DB     │     │ - Git Fetch Tag  │     │ - Healthcheck   │     │ - UAT Smoke     │
│ - Snapshot File │     │ - NPM Install    │     │ - PM2 Status    │     │ - Sesi Guru     │
│ - Verify Tag    │     │ - PM2 Reload     │     │ - Error Monitoring│   │ - Release Sign  │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └─────────────────┘
         ▲                                                                        │
         │                        [ JIKA TERJADI KEGAGALAN ]                     │
         └────────────────────────────────────────────────────────────────────────┘
                                      5. ROLLBACK RUNBOOK
```

---

## 2. Tahap 1: Persiapan Sebelum Rilis (Pre-Deployment Phase)

Sebelum menyentuh layanan aktif di server produksi, lakukan langkah pengamanan mutlak berikut:

### 2.1 Verifikasi Tag Rilis Resmi
Pastikan kode yang akan dideploy berasal dari release tag resmi yang telah lulus staging:
```bash
# Di mesin lokal pengembang / deployment controller:
git tag -v lms-phase1-staging-passed
git status
# Pastikan working tree bersih dan commit HEAD adalah e31efd3
```

### 2.2 Pengambilan Safe Snapshot Basis Data & Konfigurasi
Jalankan di server VPS via SSH:
```bash
# 1. Pastikan folder backup tersedia dan terkunci
mkdir -p /var/backups/purwaverse
chmod 700 /var/backups/purwaverse

# 2. Ambil snapshot SQLite aman menggunakan VACUUM INTO
if [ -f "/var/www/purwaverse/data/purwaverse.db" ]; then
  sqlite3 /var/www/purwaverse/data/purwaverse.db \
    "VACUUM INTO '/var/backups/purwaverse/pre_deploy_prod_$(date +%Y%m%d_%H%M%S).db';"
  echo "✔ Database safe snapshot tersimpan di /var/backups/purwaverse/"
fi

# 3. Cadangkan berkas konfigurasi .env aktif
if [ -f "/var/www/purwaverse/server/.env" ]; then
  cp /var/www/purwaverse/server/.env /var/backups/purwaverse/.env.backup.$(date +%Y%m%d_%H%M%S)
  echo "✔ .env backup tersimpan."
fi
```

---

## 3. Tahap 2: Eksekusi Penerapan Rilis (Deployment Execution Phase)

### 3.1 Unduh Kode Sumber Berdasarkan Release Tag
```bash
cd /var/www/purwaverse

# 1. Fetch seluruh tag terbaru dari origin
git fetch --tags origin

# 2. Checkout secara spesifik ke release tag yang disetujui
git checkout tags/lms-phase1-staging-passed -b release-prod-$(date +%Y%m%d)

# 3. Pastikan kepemilikan direktori tetap pada user deploy
chown -R deploy:deploy /var/www/purwaverse
```

### 3.2 Instalasi Dependensi Bersih (Production Dependencies Only)
```bash
cd /var/www/purwaverse/server

# Instalasi murni dependensi runtime tanpa devDependencies
npm ci --omit=dev

# Verifikasi integritas driver native SQLite
node -e "const Database = require('better-sqlite3'); const db = new Database(':memory:'); console.log('✔ Driver better-sqlite3 OK'); db.close();"
```

### 3.3 Verifikasi Variabel Lingkungan Produksi
Pastikan berkas `/var/www/purwaverse/server/.env` memuat konfigurasi produksi:
```text
NODE_ENV=production
PORT=3000
DB_PATH=/var/www/purwaverse/data/purwaverse.db
ALLOWED_ORIGIN=https://purwaverse.sekolah.sch.id
TRUST_PROXY=1
SESSION_TTL_HOURS=8
TEACHER_USERNAME=guru
TEACHER_PASSWORD_HASH=<hash argon2id resmi guru>
TEACHER_DEV_PASSWORD=
STUDENT_PIN_PEPPER=<32-char hex random>
TEACHER_PASSWORD_SALT=<32-char hex random>
JWT_SECRET=<32-char hex random>
```

### 3.4 Reload Layanan Node.js Tanpa Downtime via PM2
```bash
# Reload proses dengan zero-downtime (atau restart terkontrol)
pm2 reload purwaverse-prod || pm2 start /var/www/purwaverse/server/ecosystem.config.js

# Verifikasi status proses
pm2 status purwaverse-prod
pm2 save
```

---

## 4. Tahap 3: Verifikasi Pasca-Rilis (Post-Deployment Verification Phase)

Segera setelah PM2 aktif, jalankan verifikasi kesehatan sistem:

### 4.1 Uji Endpoint Kesehatan (Health Check)
```bash
curl -i http://127.0.0.1:3000/api/healthz
# Respons wajib: HTTP/1.1 200 OK, {"ok":true,"status":"online","database":"connected"}

curl -i https://purwaverse.sekolah.sch.id/api/healthz
# Respons wajib: HTTP/2 200 OK
```

### 4.2 Uji Fungsional Asap (Smoke Test KBM)
1. **Akses Beranda:** Buka `https://purwaverse.sekolah.sch.id/` di Google Chrome (Desktop & Mobile). Pastikan UI blueprint termuat utuh tanpa error konsol.
2. **Login Siswa Uji:** Lakukan login satu akun uji. Pastikan modul Unit 1 terbuka dan Unit 2 terkunci (*P1 guard active*).
3. **Login Guru:** Masuk ke portal guru. Pastikan rekap presensi dan daftar rombel 8A–8E muncul.
4. **Pratinjau Cetak:** Tekan Ctrl+P pada modul pembelajaran; pastikan tampilan beralih ke layout A4 hemat tinta putih bersih (*P2 print active*).

---

## 5. Tahap 4: Prosedur Pemulihan Balik Darurat (Rollback Runbook)

### 5.1 Kondisi Pemicu Rollback (Rollback Triggers)
Rollback wajib dieksekusi secara instan bila ditemukan salah satu dari kondisi berikut dalam 30 menit pasca-deploy:
* Node.js terus-menerus *crash* atau *restart loop* pada PM2.
* Terjadi *fatal database error* atau kegagalan koneksi SQLite.
* Endpoint `/api/purwa` mengembalikan error 500 secara berulang pada alur login.
* Terjadi kebocoran hak akses atau kegagalan pembukaan materi.

### 5.2 Langkah-Langkah Rollback Cepat
```bash
# 1. Hentikan aplikasi
pm2 stop purwaverse-prod

# 2. Kembalikan kode aplikasi ke tag/commit stabil sebelumnya
cd /var/www/purwaverse
git checkout lms-phase1-baseline-pre-staging

# 3. Pulihkan basis data dari snapshot pra-deploy
cp /var/backups/purwaverse/pre_deploy_prod_TARGET.db /var/www/purwaverse/data/purwaverse.db
chmod 640 /var/www/purwaverse/data/purwaverse.db

# 4. Pulihkan berkas konfigurasi .env jika sempat diubah
cp /var/backups/purwaverse/.env.backup.TARGET /var/www/purwaverse/server/.env

# 5. Jalankan ulang dependensi
cd /var/www/purwaverse/server
npm ci --omit=dev

# 6. Nyalakan kembali proses PM2
pm2 start purwaverse-prod
pm2 status

# 7. Uji ulang endpoint kesehatan
curl -i https://purwaverse.sekolah.sch.id/api/healthz
```

---

## 6. Penandatanganan Rilis (Release Sign-Off)

Setelah verifikasi pasca-deploy berhasil tanpa catatan anomali, Controller dan Penanggung Jawab Teknis menyatakan rilis produksi **STABIL & AKTIF**.

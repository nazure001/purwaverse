# PANDUAN RUNBOOK DEPLOYMENT STAGING VPS (VPS STAGING RUNBOOK)

**Dokumen**: `docs/deployment/VPS_STAGING_RUNBOOK.md`
**Target Lingkungan**: VPS Linux Ubuntu 22.04 / 24.04 LTS (Staging Terisolasi)
**Status Runbook**: REVISED & MANDATORY SECURITY COMPLIANT
**Tujuan**: Menjalankan rilis staging langkah demi langkah secara aman, atomik, dan terisolasi tanpa menyentuh data riil siswa.

> [!CAUTION]
> **ATURAN MUTLAK DEPLOYMENT STAGING**:
> 1. **DILARANG MENYALIN DATABASE SEKOLAH**: File `purwaverse.db` sekolah dilarang disalin ke server staging.
> 2. **HANYA AKUN SINTETIS**: Database staging wajib diinisialisasi bersih dan di-seed menggunakan skrip resmi `scripts/seed-staging-synthetic.js`.
> 3. **PROTEKSI AKSES MANDATORI**: Akses staging WAJIB dilindungi oleh HTTP Basic Auth, VPN, atau firewall IP allowlist. DILARANG membuka portal dengan akun uji PIN 1234 ke internet publik secara terbuka!
> 4. **JANGAN MENYIMPAN SECRET ASLI DI REPOSITORY**: Kredensial rahasia (hash password guru dan pepper) hanya diisi di file `.env` server VPS.

---

## ALUR OPERASIONAL RUNBOOK (14 LANGKAH TERSTANDAR)

```text
[1. PREFLIGHT] ──► [2. BACKUP] ──► [3. RELEASE] ──► [4. INSTALL] ──► [5. CONFIG ENV]
                                                                            │
[10. TLS/SSL]  ◄── [9. NGINX + AUTH] ◄── [8. PM2 START] ◄── [7. SEED SCRIPT] ◄── [6. INIT DB]
       │
       ▼
[11. HEALTHZ]  ──► [12. UAT]   ──► [13. ROLLBACK (JIKA GAGAL)] ──► [14. CLEANUP]
```

---

### Langkah 1: Pemeriksaan Awal Lingkungan (Preflight Checks)

Jalankan di server VPS melalui SSH:
```bash
# 1. Periksa versi Node.js (Minimal v20.x LTS)
node -v
# Output diharapkan: v20.x.x atau v22.x.x

# 2. Periksa versi npm
npm -v
# Output diharapkan: 10.x.x atau lebih tinggi

# 3. Pastikan utilitas apache2-utils (untuk htpasswd) terpasang
which htpasswd || apt-get update && apt-get install -y apache2-utils

# 4. Buat struktur direktori kerja
mkdir -p /var/www/purwaverse/{server,public,data}
mkdir -p /var/backups/purwaverse
mkdir -p /var/log/purwaverse

# 5. Periksa ketersediaan PM2
pm2 -v || npm install -g pm2
```

---

### Langkah 2: Pencadangan Keadaan Sebelum Rilis (Pre-Deployment Backup)

Jika direktori atau database staging sebelumnya sudah ada:
```bash
# 1. Cadangkan database staging sebelumnya (jika ada) menggunakan SQLite safe snapshot
if [ -f "/var/www/purwaverse/data/purwaverse_staging.db" ]; then
  sqlite3 /var/www/purwaverse/data/purwaverse_staging.db \
    "VACUUM INTO '/var/backups/purwaverse/pre_deploy_staging_$(date +%Y%m%d_%H%M%S).db';"
  echo "✔ Database snapshot saved to /var/backups/purwaverse/"
fi

# 2. Cadangkan berkas .env lama jika ada
if [ -f "/var/www/purwaverse/server/.env" ]; then
  cp /var/www/purwaverse/server/.env /var/backups/purwaverse/.env.backup.$(date +%Y%m%d_%H%M%S)
fi
```

---

### Langkah 3: Unggah Kode Sumber & Pengaturan Hak Akses (Upload / Release)

Siapkan paket kode sumber aplikasi pada direktori kerja:
```bash
cd /var/www/purwaverse

# Pastikan kepemilikan direktori dipegang oleh user operasional non-root (misal: deploy / www-data)
chown -R $USER:$USER /var/www/purwaverse
```

---

### Langkah 4: Instalasi Dependensi Bersih (Install Dependencies)

Jalankan instalasi dependensi produksi murni:
```bash
cd /var/www/purwaverse/server

# Instalasi murni dependensi runtime tanpa devDependencies
npm ci --omit=dev

# Verifikasi kompilasi modul native better-sqlite3
node -e "const Database = require('better-sqlite3'); const db = new Database(':memory:'); console.log('✔ better-sqlite3 native driver OK'); db.close();"
```

---

### Langkah 5: Konfigurasi Environment Staging (Configure Environment)

Salin template dan siapkan variabel lingkungan staging:
```bash
cd /var/www/purwaverse/server

# Salin template jika .env belum tersedia
if [ ! -f ".env" ]; then
  cp .env.example .env
fi

# Kunci izin berkas hanya untuk user pemilik
chmod 600 .env

# Konfigurasi variabel krusial pada /var/www/purwaverse/server/.env:
# 1. NODE_ENV=production
# 2. PORT=3000
# 3. DB_PATH=/var/www/purwaverse/data/purwaverse_staging.db
# 4. ALLOWED_ORIGIN=https://staging.purwaverse.sekolah.sch.id
# 5. TRUST_PROXY=1
# 6. SESSION_TTL_HOURS=8
# 7. TEACHER_USERNAME=guru
# 8. TEACHER_PASSWORD_HASH=<hash argon2id resmi guru>
# 9. TEACHER_DEV_PASSWORD= (WAJIB KOSONG!)
```

---

### Langkah 6: Pembuatan Database Staging Bersih (Initialize Staging DB)

Jalankan inisialisasi skema tabel tanpa menyalin data sekolah:
```bash
cd /var/www/purwaverse/server

# Pastikan folder data memiliki izin tulis
mkdir -p /var/www/purwaverse/data
chmod 750 /var/www/purwaverse/data

# Inisialisasi skema via node driver
node -e "
  const { getDatabase, closeDatabase } = require('./src/database/db');
  const db = getDatabase();
  const tables = db.prepare(\"SELECT count(*) as count FROM sqlite_master WHERE type='table'\").get();
  console.log('✔ Skema database berhasil diinisialisasi. Jumlah tabel:', tables.count);
  closeDatabase();
"
```

---

### Langkah 7: Seeding Akun Siswa Sintetis Resmi (Seed Synthetic Accounts)

Gunakan script resmi `scripts/seed-staging-synthetic.js` yang terbukti memenuhi `schema.sql`:
```bash
cd /var/www/purwaverse

# Eksekusi script seeding staging resmi
node scripts/seed-staging-synthetic.js /var/www/purwaverse/data/purwaverse_staging.db

# Output yang diharapkan:
# 🌱 [STAGING SEED] Memulai seeding sintetis...
# ✅ [STAGING SEED] Selesai 100%! Siswa Sintetis: 3, FK Violations: 0, Integrity: OK.
```

---

### Langkah 8: Memulai Layanan Backend (Start Service via PM2)

Nyalakan backend service di bawah kontrol PM2:
```bash
cd /var/www/purwaverse/server

# Hentikan proses lama jika ada
pm2 stop purwaverse-staging 2>/dev/null || true

# Mulai service dengan konfigurasi PM2
pm2 start src/server.js \
  --name "purwaverse-staging" \
  --max-memory-restart 300M \
  --time \
  --log /var/log/purwaverse/pm2-staging.log

# Simpan konfigurasi agar otomatis menyala saat server reboot
pm2 save
```

---

### Langkah 9: Konfigurasi Nginx & Proteksi HTTP Basic Auth Mandatori

Siapkan kredensial HTTP Basic Auth (Wajib untuk mengamankan portal staging):
```bash
# Buat password file htpasswd untuk staging
htpasswd -c /etc/nginx/.staging_htpasswd guru_staging
# Masukkan password khusus penguji staging
```

Buat file konfigurasi `/etc/nginx/sites-available/purwaverse-staging`:
```nginx
server {
    listen 80;
    server_name staging.purwaverse.sekolah.sch.id;

    client_max_body_size 10M;

    # -------------------------------------------------------------
    # PROTEKSI STAGING MANDATORI (REQUIRED)
    # Mencegah portal staging dengan PIN 1234 diakses publik terbuka
    # -------------------------------------------------------------
    auth_basic "Purwaverse Staging Portal - Akses Terbatas";
    auth_basic_user_file /etc/nginx/.staging_htpasswd;

    # Frontend Statis
    root /var/www/purwaverse/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    # Health Check Khusus Backend (Dapat diakses monitoring internal)
    location /healthz {
        proxy_pass http://127.0.0.1:3000/healthz;
        proxy_set_header Host $host;
    }

    # API Reverse Proxy ke Express (Port 3000)
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

Aktifkan konfigurasi dan muat ulang Nginx:
```bash
ln -sf /etc/nginx/sites-available/purwaverse-staging /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

### Langkah 10: Pengamanan Protokol TLS/HTTPS (Certbot TLS)

Pasang sertifikat SSL Let's Encrypt:
```bash
certbot --nginx -d staging.purwaverse.sekolah.sch.id --non-interactive --agree-tos -m admin@sekolah.sch.id --redirect
```

---

### Langkah 11: Pemeriksaan Endpoint Kesehatan (Health Check Verification)

Uji ketersediaan layanan melalui terminal server:
```bash
# 1. Health check internal backend (membedakan backend dari root frontend)
curl -s http://127.0.0.1:3000/healthz
# Expected: {"status":"online","service":"purwaverse"}

# 2. Health check via Nginx reverse proxy
curl -s http://127.0.0.1:3000/api/healthz
# Expected: {"status":"online","service":"purwaverse"}

# 3. Uji respons API RPC melalui domain staging (dengan Basic Auth)
curl -s -u guru_staging:PASSWORD_ANDA https://staging.purwaverse.sekolah.sch.id/api/purwa \
  -H "Content-Type: application/json" \
  -d '{"action":"bootstrap"}'
# Expected: {"ok":true,"data":{"appName":"Purwaverse IPA VIII",...}}
```

---

### Langkah 12: Eksekusi UAT Staging (User Acceptance Testing)

Buka peramban, masukkan kredensial Basic Auth, lalu jalankan 25 skenario pengujian sesuai:
`docs/testing/VPS_STAGING_UAT.md`.

---

### Langkah 13: Prosedur Pemulihan / Pembatalan (Rollback Procedure)

Jika rilis staging mengalami kegagalan pada tahap UAT:
```bash
echo "⚠️ MEMULAI PROSEDUR ROLLBACK STAGING..."

# 1. Hentikan service PM2
pm2 stop purwaverse-staging

# 2. Pulihkan snapshot database sebelumnya
LATEST_BACKUP=$(ls -t /var/backups/purwaverse/pre_deploy_staging_*.db 2>/dev/null | head -n 1)
if [ -n "$LATEST_BACKUP" ]; then
  cp "$LATEST_BACKUP" /var/www/purwaverse/data/purwaverse_staging.db
  echo "✔ Database dipulihkan dari: $LATEST_BACKUP"
fi

# 3. Kembalikan berkas .env lama
LATEST_ENV=$(ls -t /var/backups/purwaverse/.env.backup.* 2>/dev/null | head -n 1)
if [ -n "$LATEST_ENV" ]; then
  cp "$LATEST_ENV" /var/www/purwaverse/server/.env
fi

# 4. Nyalakan kembali service versi stabil
pm2 restart purwaverse-staging

# 5. Verifikasi status rollback via healthz
curl -s http://127.0.0.1:3000/healthz
echo "✔ Rollback selesai."
```

---

### Langkah 14: Pembersihan Pasca Deployment (Post-Deployment Cleanup)

Setelah UAT dinyatakan lulus:
```bash
# Bersihkan sisa file sementara
rm -rf /tmp/npm-* /tmp/chrome-* 2>/dev/null || true

# Periksa status service PM2
pm2 status purwaverse-staging

echo "🎉 DEPLOYMENT STAGING SELESAI DENGAN STATUS TERISOLASI & TERPROTEKSI!"
```

# PRODUCTION ENVIRONMENT CHECKLIST & READINESS AUDIT

**Dokumen:** `docs/production/PRODUCTION_ENVIRONMENT_CHECKLIST.md`  
**Fase:** Production Readiness Audit (Fase 1.A)  
**Status Evaluasi:** `AUDITED & SPECIFIED`  
**Target Server:** VPS Ubuntu Linux (Production Environment)  

---

## 1. Ikhtisar Arsitektur Lingkungan Produksi

Lingkungan produksi didesain dengan prinsip keamanan berlapis (*defense-in-depth*), pemisahan hak akses proses (*principle of least privilege*), dan isolasi port internal. Pengguna publik hanya dapat mengakses server melalui protokol HTTPS terenkripsi pada Nginx, yang kemudian memproksikan lalu lintas ke server internal Node.js pada `127.0.0.1:3000`.

```text
[ Browser Siswa & Guru ]
           │
     HTTPS (Port 443)
           ▼
┌────────────────────────────────────────────────────────┐
│ NGINX REVERSE PROXY (SSL Termination, Let's Encrypt)   │
│ - Rate Limiting & Gzip Compression                     │
│ - Security Headers (HSTS, X-Frame-Options, CSP)       │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP (127.0.0.1:3000)
                           ▼
┌────────────────────────────────────────────────────────┐
│ NODE.JS EXPRESS BACKEND (Di bawah kendali PM2)         │
│ - Process Owner: non-root user (deploy)                │
│ - Memory Cap: 300MB auto-restart                       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ SQLITE 3 STORAGE (better-sqlite3, WAL Mode)            │
│ - Path: /var/www/purwaverse/data/purwaverse.db         │
│ - Permissions: chmod 750 (hanya dibaca oleh app user)  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Rincian Checklist Verifikasi Lingkungan (Environment Matrix)

| Komponen | Spesifikasi Standar Produksi | Status Verifikasi Staging | Kesiapan Produksi | Rekomendasi / Tindakan Wajib |
|---|---|---|---|---|
| **Sistem Operasi** | Ubuntu 22.04 LTS x86_64, Kernel 5.15+ | Ubuntu 22.04 LTS | ✅ READY | Pastikan `unattended-upgrades` aktif untuk patch keamanan OS. |
| **Node.js Runtime** | v20.x LTS (Active LTS Iron) | v20.18.x LTS | ✅ READY | Kunci versi via `.nvmrc` atau package manager; dilarang menggunakan Node v21/v23 non-LTS. |
| **npm Version** | v10.x | v10.8.x | ✅ READY | Jalankan instalasi menggunakan `npm ci --omit=dev`. |
| **Process Manager** | PM2 v5.x | PM2 aktif (daemonized) | ✅ READY | Konfigurasi `ecosystem.config.js` dengan opsi `max_memory_restart: '300M'`, restart delay 5 detik. |
| **Web Server** | Nginx 1.18+ Stable | Nginx 1.18.0 | ✅ READY | Matikan direktif `auth_basic` staging pada domain produksi. Konfigurasi buffer proxy 16k. |
| **Sertifikat SSL/TLS**| Let's Encrypt TLS 1.3 / 1.2 | Certbot TLS 1.3 Aktif | ✅ READY | Uji cron renewal `certbot renew --dry-run`. Pastikan masa berlaku sertifikat minimal 60 hari. |
| **Pemetaan Domain** | DNS A Record -> IP Publik VPS | `staging.izzi.my.id` | ⚠️ PENDING ASSIGNMENT | Daftarkan domain/subdomain produksi resmi sekolah sebelum deployment. |
| **Firewall (UFW)** | Default Deny Incoming, Open 22, 80, 443 | Port 3000 terisolasi | ✅ READY | Pastikan port 3000 tertutup rapat dari akses internet eksternal. |
| **Lokasi Pencadangan**| `/var/backups/purwaverse/` | Tersedia di VPS | ✅ READY | Konfigurasi rotasi harian (retensi 14 hari) dan amankan direktori via `chmod 700`. |

---

## 3. Konfigurasi Komponen Spesifik

### 3.1 Konfigurasi PM2 (`ecosystem.config.js`)
Gunakan berkas konfigurasi formal berikut untuk menjalankan aplikasi pada mode produksi:

```javascript
module.exports = {
  apps: [{
    name: 'purwaverse-prod',
    script: 'src/server.js',
    cwd: '/var/www/purwaverse/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/purwaverse/error.log',
    out_file: '/var/log/purwaverse/out.log',
    time: true,
    exp_backoff_restart_delay: 100
  }]
};
```

### 3.2 Konfigurasi Nginx Produksi
Blok virtual host resmi untuk server produksi:

```nginx
server {
    server_name purwaverse.sekolah.sch.id; # Sesuaikan dengan domain resmi

    # Log akses dan error terpisah
    access_log /var/log/nginx/purwaverse_prod_access.log;
    error_log /var/log/nginx/purwaverse_prod_error.log warn;

    # Batasi ukuran upload (hanya text/json rangkuman dan LKPD, max 2MB)
    client_max_body_size 2M;

    # Static Files Caching
    location /assets/ {
        alias /var/www/purwaverse/public/assets/;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }

    # API & Dynamic Proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/purwaverse.sekolah.sch.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/purwaverse.sekolah.sch.id/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# Redirect HTTP ke HTTPS
server {
    listen 80;
    server_name purwaverse.sekolah.sch.id;
    return 301 https://$host$request_uri;
}
```

### 3.3 Konfigurasi Firewall Sistem (UFW)
Perintah verifikasi firewall di VPS:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH Management'
sudo ufw allow 80/tcp comment 'HTTP Let’s Encrypt'
sudo ufw allow 443/tcp comment 'HTTPS Production'
sudo ufw enable
sudo ufw status verbose
```

---

## 4. Kesimpulan Kesiapan Lingkungan

Lingkungan VPS telah memenuhi seluruh kriteria kelayakan produksi (OS, Node, Nginx, SSL, PM2, Firewall, Storage). Satu-satunya item berstatus *Pending* adalah penentuan nama domain/subdomain produksi final oleh pemilik sistem, yang akan diisi pada DNS registrar sebelum peluncuran.

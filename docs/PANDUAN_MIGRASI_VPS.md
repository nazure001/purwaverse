# Panduan & Cetak Biru Migrasi Backend Purwaverse
## Dari Google Apps Script (GAS) ke VPS Mandiri (Node.js + SQLite/Postgres + Nginx)

Dokumen ini adalah cetak biru teknis komprehensif untuk memigrasikan backend **Purwaverse IPA VIII** dari ketergantungan **Google Apps Script (GAS) + Google Sheets** menuju arsitektur **Server VPS Mandiri** dengan performa tinggi, bebas antrean timeout serentak, dan beroperasi di bawah domain kustom (`purwaverse.izzi.my.id`).

---

## 1. Analisis Akar Masalah: Mengapa GAS Sering Mengalami Timeout?

Dalam pengujian di lapangan dan simulasi pembelajaran di kelas, ditemukan kendala latensi tinggi (4–8 detik) hingga *timeout* (504 / Google Drive interstitial check). Penyebab utamanya adalah batasan arsitektural ekosistem Google:

1. **Model Antrean Serial Eksekusi Google Apps Script:**
   * Google membatasi eksekusi skrip web app per pengguna/sesi. Ketika 20–35 siswa di dalam satu kelas serentak menekan tombol (misal login bersamaan, memulai Mission 0, atau mengumpulkan kuis), Google **mengantrekan** panggilan tersebut satu per satu. Siswa di urutan antrean belakang akan mengalami waktu tunggu 20–40 detik hingga koneksi Vercel/browser terputus (*timeout*).
2. **Google Spreadsheet Bukan Basis Data Transaksional:**
   * Setiap fungsi baca/tulis (`getValues()`, `setValues()`, `appendRow()`) membutuhkan komunikasi HTTP jarak jauh ke Google Drive API yang memakan waktu **400 ms – 1.200 ms per lembar sheet**.
   * Sebaliknya, basis data lokal di VPS (seperti SQLite/PostgreSQL) mengeksekusi *query* dalam **0,5 ms – 2 ms** (500x lebih cepat).
3. **Multi-Hop Jaringan Antarnegara:**
   * *Alur lama:* Perangkat Siswa (Indonesia) $\rightarrow$ Serverless Vercel (US) $\rightarrow$ Google Apps Script (US) $\rightarrow$ Google Drive API.
   * *Alur VPS baru:* Perangkat Siswa (Indonesia) $\rightarrow$ Server VPS IDCloudHost Jakarta (SouthJKT-a) $\rightarrow$ Database Lokal.
   * Total latensi jaringan terpangkas dari **~4.000 ms – 8.000 ms** menjadi hanya **~15 ms – 50 ms**.

---

## 2. Arsitektur Target di Server VPS (`157.10.160.16`)

Server VPS IDCloudHost Jakarta yang sudah disiapkan memiliki profil ideal:
* **OS:** Ubuntu 24.04/26.04 LTS (Kernel Linux modern).
* **Spesifikasi:** 2 vCPU, 2 GB RAM (tersedia 1.4 GB bebas + 4 GB Swap), 30 GB SSD.
* **Perangkat Lunak Terpasang:** Node.js v20 LTS, NPM 10, Nginx 1.28, PM2.

### Diagram Arsitektur Target

```
               [ Perangkat Siswa & Guru di Indonesia ]
                                 │
                     (HTTPS / Port 443 - SSL)
                                 ▼
         [ Nginx Reverse Proxy (Server VPS 157.10.160.16) ]
               │                                   │
     (server_name: izzi.my.id)       (server_name: purwaverse.izzi.my.id)
               │                                   │
               ▼                                   ▼
       [ Web Utama Anda ]              ┌────────────────────────┐
   (WordPress/Company Profile)         │  Node.js API Service   │
                                       │  (PM2: Port 3000)      │
                                       ├────────────────────────┤
                                       │  SQLite Database       │
                                       │  (/var/data/purwa.db)  │
                                       ├────────────────────────┤
                                       │  Static Web Frontend   │
                                       │  (/public/index.html)  │
                                       └────────────────────────┘
```

---

## 3. Pilihan Basis Data & Kerangka Backend

### Mengapa Node.js + SQLite adalah Pilihan Terbaik?

| Kriteria | Node.js + SQLite (`better-sqlite3`) | Node.js + PostgreSQL | PHP + MySQL |
| :--- | :--- | :--- | :--- |
| **Portabilitas Logika** | **100% Langsung Pakai.** Seluruh kode `Services.gs`, `LearningServices.gs`, dan `DiagnosticData.gs` sudah berupa JavaScript murni. | 100% Langsung Pakai. | Rendah (harus rewrite seluruh logika skor/radar ke sintaks PHP). |
| **Beban RAM Server** | Sangat ringan (~40–80 MB RAM). | Sedang (~150–250 MB RAM untuk service Postgres). | Sedang (~100–180 MB RAM untuk PHP-FPM + MySQL). |
| **Kecepatan Baca/Tulis** | $\approx 0,2 - 1$ milidetik (Direct Memory/Disk). | $\approx 2 - 5$ milidetik (TCP Socket). | $\approx 2 - 5$ milidetik. |
| **Kemudahan Backup** | **Sangat Mudah.** Cukup salin 1 file `purwaverse.db`. | Perlu `pg_dump` dan manajemen user DB. | Perlu `mysqldump` & phpMyAdmin. |
| **Kapasitas** | Mampu menangani hingga jutaan baris data & ratusan *concurrent write* per detik (jauh melampaui kebutuhan 1 sekolah). | Skala tak terbatas. | Skala tak terbatas. |

> [!TIP]
> **Rekomendasi:** Gunakan **SQLite via library `better-sqlite3`**. Sangat kokoh, zero-maintenance, bebas konfigurasi user/password database yang rumit, dan dapat di-backup otomatis setiap malam dengan script bash 1 baris.

---

## 4. Pemetaan Komponen (GAS $\rightarrow$ VPS Node.js)

Kontrak API dirancang bersifat **Drop-in Replacement**:
* Endpoint: `POST /api/purwa`
* Request Body: `{ "action": "<nama_aksi>", "payload": { ... } }`
* Response Body: `{ "ok": true, "data": { ... } }` atau `{ "ok": false, "error": "..." }`
Dengan cara ini, **antarmuka frontend ([`public/index.html`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/public/index.html)) tidak perlu dirombak sama sekali**, cukup diarahkan ke origin lokal `/api/purwa`.

### Tabel Konversi Fungsi:

| Komponen di Google Apps Script | Padanan Modern di Node.js / VPS | Keterangan |
| :--- | :--- | :--- |
| `SpreadsheetApp.getActiveSpreadsheet()` | `new Database('purwaverse.db')` | File basis data lokal di `/var/data/purwaverse.db`. |
| `rows_(sheetName)` | `db.prepare('SELECT * FROM ' + table).all()` | Waktu eksekusi turun dari 600 ms ke 0,4 ms. |
| `append_(sheetName, rec)` | `db.prepare('INSERT INTO ... VALUES (...)').run(...)` | Insert transaksi ACID yang instan dan aman. |
| `upsert_(sheetName, key, rec)` | `INSERT INTO ... ON CONFLICT(key) DO UPDATE SET ...` | Fitur native SQLite yang jauh lebih efisien dari GAS. |
| `CacheService.getScriptCache()` | Memory cache (Map / Node-Cache) | Bebas dari batas kuota 100 KB milik Google. |
| `PropertiesService` | Berkas `.env` (misal `JWT_SECRET`, `PORT=3000`) | Standar industri, aman, dan mudah dikonfigurasi. |
| `LockService.getScriptLock()` | SQLite WAL Mode (*Write-Ahead Logging*) | Memungkinkan ribuan pembaca bersamaan tanpa saling mengunci. |

---

## 5. Struktur Berkas Proyek Mandiri di VPS

Di direktori server VPS (misal `/var/www/purwaverse`):

```text
/var/www/purwaverse/
├── package.json               # Dependencies: express, better-sqlite3, cors, dotenv
├── .env                       # Konfigurasi port, secret token, nomor WA guru
├── database/
│   ├── schema.sql             # Struktur DDL tabel (MASTER_STUDENTS, PROGRESS, dll.)
│   └── purwaverse.db          # File database SQLite (ACID compliant)
├── src/
│   ├── config.js              # Salinan Config.gs (DOMAINS, konstanta, passing score)
│   ├── db.js                  # Koneksi SQLite & fungsi pembantu (findAll, upsert, dll.)
│   ├── seed.js                # Pengisi data awal resmi (Roster, 25 Butir Diagnostik, Kuis)
│   ├── services.js            # Salinan logika Services.gs (Mission 0, login, scoring)
│   ├── learningServices.js    # Salinan logika LearningServices.gs (Jalur Belajar, LKPD)
│   └── server.js              # Express app penyedia route /api/purwa & static assets
├── public/                    # Seluruh frontend web (index.html hasil build)
└── scripts/
    └── backup-db.sh           # Otomasi backup harian database ke folder arsip
```

---

## 6. Panduan Konfigurasi Nginx di VPS

Karena server VPS juga akan menjalankan web utama `izzi.my.id`, kita memanfaatkan **Nginx Server Blocks (Virtual Hosts)** terpisah.

### Berkas Konfigurasi: `/etc/nginx/sites-available/purwaverse.izzi.my.id`

```nginx
server {
    listen 80;
    server_name purwaverse.izzi.my.id;

    # Gzip Compression untuk kecepatan loading maksimal
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # Static Assets (Frontend HTML, CSS, SVG)
    location / {
        root /var/www/purwaverse/public;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache browser untuk aset statis (1 hari)
        expires 1d;
        add_header Cache-Control "public, no-transform";
    }

    # API Backend Reverse Proxy ke Node.js (Port 3000)
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout long-poll yang aman
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
```

### Mengaktifkan Virtual Host & Menerbitkan SSL Gratis:
```bash
# 1. Aktifkan konfigurasi virtual host di Nginx
sudo ln -s /etc/nginx/sites-available/purwaverse.izzi.my.id /etc/nginx/sites-enabled/

# 2. Uji sintaks Nginx (sesuai aturan stability-first: wajib uji sebelum reload)
sudo nginx -t

# 3. Reload Nginx jika sintaks sukses
sudo systemctl reload nginx

# 4. Pasang Sertifikat SSL HTTPS otomatis via Certbot
sudo certbot --nginx -d purwaverse.izzi.my.id
```

---

## 7. Opsi Integrasi dengan Web Utama `izzi.my.id`

Ketika web utama `www.izzi.my.id` sudah selesai disiapkan, ada dua cara elegan untuk menghubungkannya:

### Opsi A: Kartu Showcase / Item Display (Rekomendasi Utama)
Di halaman portofolio/beranda web `izzi.my.id`, pasang satu kartu showcase:
* **Judul:** Purwaverse IPA VIII
* **Deskripsi:** Platform Laboratorium & Jalur Belajar IPA Kelas VIII Berbasis Bukti
* **Tombol Aksi:** Mengarah langsung ke `https://purwaverse.izzi.my.id` (membuka di tab baru atau langsung navigasi).
* *Kelebihan:* Pengalaman pengguna siswa tetap fokus, antarmuka layar penuh (*full screen responsive*), dan tidak terpotong oleh header/footer web utama.

### Opsi B: Iframe Embed
Jika ingin siswa tetap berada di dalam bingkai halaman `izzi.my.id`:
```html
<iframe 
  src="https://purwaverse.izzi.my.id" 
  style="width: 100%; height: 90vh; border: none; border-radius: 16px;" 
  allow="fullscreen">
</iframe>
```
*Catatan:* Jika menggunakan opsi iframe, Nginx di `purwaverse.izzi.my.id` cukup diatur header `X-Frame-Options: ALLOW-FROM https://izzi.my.id` agar tidak diblokir oleh browser.

---

## 8. Langkah Eksekusi Praktis (Saat Anda Sudah Siap)

Ketika Anda memutuskan siap mengeksekusi migrasi ini:

1. **Langkah 1 (DNS):** Buat A Record di DNS domain Anda:
   * **Host:** `purwaverse`
   * **Points to:** `157.10.160.16`
2. **Langkah 2 (Scaffolding):** Agen akan membuatkan folder `server/` lengkap dengan skema SQLite dan seluruh fungsi API yang siap dijalankan.
3. **Langkah 3 (Impor Data):** Menjalankan skrip sinkronisasi data dari Google Sheets aktif ke database SQLite.
4. **Langkah 4 (Deploy ke VPS):**
   * Mentransfer folder `server/` dan `public/` ke `/var/www/purwaverse` di VPS via SSH/rsync.
   * Menjalankan service dengan `pm2 start src/server.js --name purwaverse`.
   * Menjalankan Certbot untuk HTTPS.
5. **Langkah 5 (Verifikasi):** Uji coba login siswa dan guru langsung di `https://purwaverse.izzi.my.id`.

---

## 9. Manfaat Akhir yang Didapat

1. **Nol Timeout:** Tidak ada lagi antrean atau error Google Drive / Vercel saat 30+ siswa ujian serentak.
2. **Respon Secepat Kilat:** Halaman dan aksi berganti dalam hitungan milidetik.
3. **Kemandirian Penuh:** Platform sepenuhnya berada di bawah server dan merek domain Anda sendiri (`izzi.my.id`).
4. **Biaya Efisien:** Mengoptimalkan VPS yang sudah Anda sewa tanpa perlu biaya tambahan platform pihak ketiga.

# Purwaverse Science Engine · IPA Kelas VIII SMP
> **A Module by IZZI WORKSHOP**  
> *Platform Pembelajaran IPA Terpadu Kelas VIII SMP Berbasis Bukti, Observasi Ilmiah, dan Kolaborasi Tim Laboratorium.*

---

## 🧭 Ikhtisar Arsitektur Repositori (Dual-Implementation)

Repositori ini mengelola **satu ekosistem Purwaverse** dengan **dua jalur implementasi terpisah** yang dapat dipilih sesuai kebutuhan infrastruktur sekolah:

```
purwaverse-ipa-viii-mvp-private/
├── public/                 # [Modern] Frontend Web Engine (Modular CSS/JS Industrial Blueprint)
├── server/                 # [Modern] Backend Standalone (Node.js Express + SQLite + Argon2id)
├── gas/                    # [Legacy] Google Apps Script (Google Sheets + Clasp)
├── docs/                   # Dokumentasi kurikulum, SOP operasional, wiki, dan schema
├── scripts/                # Utility build & automation (build-web.js, dev-preview.js)
└── package.json            # Root workspace scripts
```

| Aspek | Jalur 1: Modern Standalone (Rekomendasi) | Jalur 2: Legacy Google Apps Script |
|---|---|---|
| **Infrastruktur** | VPS Ubuntu / Docker / Nginx / Serverless | Google Workspace (Gratis, Serverless GAS) |
| **Backend** | Node.js 18+ & Express.js REST/RPC | Google Apps Script (V8 Engine) |
| **Database** | SQLite WAL Mode (ACID, Zero-Config) | Google Sheets (Multi-Tab Spreadsheet) |
| **Autentikasi** | Token Session (8 Jam) + Argon2id Hash | Session State Cookie + SHA-256 Hash |
| **Antarmuka** | Industrial Blueprint CAD Design System | Classic Apps Script HtmlService / Web App |
| **Skalabilitas** | Ratusan siswa bersamaan tanpa batas quota Google | Terikat kuota harian eksekusi Google Apps Script |

---

## 🚀 PANDUAN INSTALASI 1: Modern Engine (VPS / Standalone Server)

Jalur ini digunakan untuk deployment server mandiri (VPS Ubuntu, Debian, atau server lokal) dengan performa tinggi dan latensi rendah.

### Prasyarat Sistem
* **Node.js**: Versi 18.x atau 20.x LTS
* **NPM**: Versi 9.x atau lebih baru
* **Git**

### Langkah Instalasi:

1. **Clone Repositori:**
   ```bash
   git clone https://github.com/nazure001/purwaverse.git
   cd purwaverse
   ```

2. **Pasang Dependensi Backend:**
   ```bash
   npm --prefix server install
   ```

3. **Konfigurasi Environment (`.env`):**
   Salin berkas konfigurasi contoh di direktori `server`:
   ```bash
   cp server/.env.example server/.env
   ```
   Sesuaikan parameter berikut di `server/.env`:
   ```ini
   NODE_ENV=production
   PORT=3000
   DB_PATH=./data/purwaverse.db
   JWT_SECRET=ganti_dengan_random_string_minimal_32_karakter
   STUDENT_PIN_PEPPER=ganti_dengan_uuid_rahasia
   TEACHER_PASSWORD_SALT=ganti_dengan_salt_rahasia
   TEACHER_DEV_PASSWORD=KataSandiGuruAman123!
   ```

4. **Inisialisasi Database SQLite & Data Awal:**
   ```bash
   npm --prefix server run db:seed
   ```
   *Perintah ini akan membuat tabel master, 5 kelas (8A-8E), roster siswa, data diagnostik, dan 21 unit kurikulum IPA VIII.*

5. **Build Aset Web Frontend:**
   ```bash
   npm run build
   ```
   *Menghasilkan bundle web teroptimasi di folder `public/index.html`.*

6. **Menjalankan Server:**
   * **Mode Development / Preview Lokal:**
     ```bash
     npm run preview
     ```
     *Membuka web browser di `http://localhost:5000/` dengan proxy backend di `http://localhost:3000/`.*
   * **Mode Produksi (Systemd / PM2 di VPS):**
     ```bash
     cd server
     npm install -g pm2
     pm2 start src/server.js --name "purwaverse-engine"
     pm2 save
     pm2 startup
     ```

7. **Konfigurasi Nginx Reverse Proxy (Opsional di VPS):**
   ```nginx
   server {
       listen 80;
       server_name lms.sekolah.sch.id;

       # Frontend Web Static
       root /var/www/purwaverse/public;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Backend RPC API
       location /api/ {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Verifikasi Sistem:**
   ```bash
   npm --prefix server test
   # Hasil: 36/36 test suites passing (100% pass)
   ```

---

## 📜 PANDUAN INSTALASI 2: Legacy Google Apps Script (Google Sheets)

Jalur ini digunakan jika sekolah ingin menggunakan infrastruktur Google Workspace sepenuhnya tanpa perlu menyewa VPS.

### Prasyarat
* Akun Google Workspace / Gmail
* Google Clasp CLI: `npm install -g @google/clasp`

### Langkah Instalasi:

1. **Masuk ke Direktori GAS:**
   ```bash
   cd gas
   ```

2. **Login ke Akun Google via Clasp:**
   ```bash
   clasp login
   ```

3. **Hubungkan ke Script Project Google Apps Script:**
   Jika membuat project baru:
   ```bash
   clasp create --title "Purwaverse IPA VIII" --type webapp
   ```
   Atau tautkan project lama dengan memperbarui `.clasp.json`:
   ```json
   {
     "scriptId": "YOUR_APPS_SCRIPT_ID_HERE",
     "rootDir": "./gas"
   }
   ```

4. **Kaitkan Google Spreadsheet Database:**
   * Buat Google Spreadsheet baru.
   * Buka berkas `gas/Config.gs`, masukkan Spreadsheet ID:
     ```javascript
     const SPREADSHEET_ID = "MASUKKAN_SPREADSHEET_ID_DI_SINI";
     ```

5. **Upload Kode ke Google Apps Script:**
   ```bash
   clasp push
   ```

6. **Inisialisasi Sheet Database (Seed):**
   * Buka Apps Script Editor di browser (`clasp open`).
   * Pilih fungsi `seedAll_()` pada toolbar dan jalankan (`Run`).
   * Berikan izin otorisasi akses Spreadsheet saat diminta.

7. **Deploy sebagai Web App:**
   ```bash
   clasp deploy --description "Purwaverse Web App Production"
   ```
   * Atur *Execute as*: **User accessing the web app** (atau Me/Pemilik).
   * Atur *Who has access*: **Anyone within organization** atau **Anyone**.

*Panduan teknis mendalam GAS dapat dibaca di [gas/README.md](gas/README.md).*

---

## 🎯 Prinsip Pedagogis & Alur Pembelajaran (80% Edukasi / 20% Industrial)

Purwaverse dirancang sebagai **Immersive Learning Management System**, bukan game atau antarmuka fantasi fiksi ilmiah.

### 1. Hierarki Pengalaman Belajar Siswa
```
1. Materi yang Sedang Dipelajari (Target CP & Teori Ilmiah)
   └── 2. Rangkuman di Buku Tulis & Validasi Guru
       └── 3. Kuis Penguasaan Mandiri (Quiz Chamber HOTS)
           └── 4. Praktik Tim Laboratorium (Lembar Kerja Praktikum / LKPD)
               └── 5. Capaian & Sertifikasi Pembelajaran
```

### 2. Standar Penamaan Bab Kurikulum IPA VIII
Nama bab resmi kurikulum IPA VIII SMP selalu menjadi **judul utama**, sedangkan nama laboratorium hanya menjadi **identitas tematik sekunder**:
* **Bab 1 · Sel dan Organisasi Kehidupan** (*Micro Structure Laboratory*)
* **Bab 2 · Struktur dan Fungsi Tubuh Makhluk Hidup** (*Biological Engineering Lab*)
* **Bab 3 · Unsur, Senyawa, dan Campuran** (*Applied Science Laboratory*)
* **Bab 4 · Struktur Bumi dan Fenomena Alam** (*Earth System Observation Lab*)
* **Bab 5 · Usaha, Energi, dan Pesawat Sederhana** (*Force & Motion Engineering Lab*)
* **Bab 6 · Getaran, Gelombang, dan Cahaya** (*Energy & Wave Transformation Lab*)

### 3. Fokus Teacher Command Center
Guru tidak hanya melihat angka statistik, tetapi dibekali alat bantu intervensi pedagogis:
* **Student Learning Insight**: Memetakan tingkat pemahaman konseptual per bab materi.
* **Common Difficulties (Miskonsepsi)**: Mendeteksi kekeliruan konsep yang sering dialami siswa.
* **Recommended Intervention**: Panduan tindakan bimbingan konkret (remedial, demonstrasi ulang).
* **Monitoring & Evaluasi**: Verifikasi rangkuman dan persetujuan LKPD tim.

---

## 📂 Dokumentasi Teknis Terkait

Seluruh dokumentasi telah dikategorisasikan di direktori **[`docs/`](docs/README.md)**:

* **[Katalog Lengkap Dokumentasi (Docs Hub)](docs/README.md)**
* **[Filosofi Produk & Nilai Inti Purwaverse](docs/PRODUCT_VISION.md)** *(Wajib dibaca kontributor/developer baru)*
* **Arsitektur & Standar**:
  * [Spesifikasi Arsitektur Future-Ready & Multi-Kurikulum](docs/architecture/FUTURE_ARCHITECTURE.md)
  * [Skema Database Modern SQLite](docs/architecture/SCHEMA.md)
  * [Standar Penulisan Konten IPA & Rubrik](docs/architecture/CONTENT_STANDARD.md)
* **Deployment & Migrasi**:
  * [Panduan Instalasi & Migrasi VPS Mandiri](docs/deployment/PANDUAN_MIGRASI_VPS.md)
  * [Dokumen Spesifikasi Teknis Handover Migrasi](docs/deployment/PURWAVERSE_MIGRATION_HANDOVER.md)
  * [Status & Checklist Kesiapan Migrasi VPS](docs/deployment/PURWAVERSE_VPS_MIGRATION_STATUS.md)
* **Operasional Guru & QA**:
  * [Wiki dan SOP Operasional Guru](docs/operations/WIKI_OPERASIONAL.md)
  * [Checklist Audit Integrasi & Anti-Regresi](docs/operations/INTEGRATION_CHECKLIST.md)
* **Laporan Tahapan Perkembangan**:
  * [Koleksi Laporan Milestone Phase 1 s.d. 5](docs/reports/)
* **Legacy Google Apps Script**:
  * [Dokumentasi Khusus Google Apps Script](gas/README.md)

---

## 🛡️ Keamanan & Integritas Data

* Jangan pernah mempublikasikan berkas `.env`, token rahasia, atau kredensial guru ke repositori publik.
* Hash PIN siswa menggunakan enkripsi standar industri (**Argon2id** pada VPS, multi-tier fallback kompatibel dengan format legacy).
* Hubungi WhatsApp pengembang/instruktur pada tombol terapung untuk bantuan teknis.

---
**Purwaverse Science Engine** — *Same Curiosity · Bigger Possibilities*  
*A Module by IZZI WORKSHOP*

# PURWAVERSE LMS — FINAL PRODUCTION RISK REGISTER

**Dokumen:** `docs/production/FINAL_PRODUCTION_RISK_REGISTER.md`  
**Fase:** Pre-Launch Risk Assessment (Tahap 5)  
**Status Evaluasi:** `AUDITED & MONITORED`  
**Otoritas:** Controller Fase Transisi Produksi & Tim Antigravity  

---

## 1. Ikhtisar Manajemen Risiko Pra-Produksi

Manajemen risiko produksi Purwaverse LMS difokuskan pada perlindungan integritas data siswa, ketersediaan layanan (*high availability*), stabilitas proses server, dan pencegahan insiden operasional di kelas:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        RISK EVALUATION MATRIX                          │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│ LEVEL SEVERITY  │ DEFINISI DAMPAK │ PRIORITAS AKSI   │ PROTOKOL RESPON │
├─────────────────┼─────────────────┼──────────────────┼─────────────────┤
│ TINGGI (HIGH)   │ Korupsi data /  │ Mitigasi Mutlak  │ Rollback / Halt │
│                 │ Layanan terhenti│ Sebelum Rilis    │ Eksekusi        │
├─────────────────┼─────────────────┼──────────────────┼─────────────────┤
│ SEDANG (MEDIUM) │ Gangguan parsial│ Monitoring Ketat │ Alternatif Alur │
│                 │ / Kelambatan UI │ & Batas Waktu    │ / Fallback      │
├─────────────────┼─────────────────┼──────────────────┼─────────────────┤
│ RENDAH (LOW)    │ Ketidaknyamanan │ Backlog Pasca-   │ Penjadwalan     │
│                 │ tampilan minor  │ Produksi         │ Rutin           │
└─────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

---

## 2. Tabel Registrasi Risiko Produksi Final (Risk Register Table)

| No | Risiko Teridentifikasi | Dampak | Strategi Mitigasi Operasional | Status |
|---|---|---|---|---|
| **R-01** | **Data import salah:** Terjadi duplikasi NISN, kesalahan penempatan kelas, atau korupsi nama siswa saat migrasi 207 siswa riil. | **Tinggi** | Eksekusi protokol 6 tahap pada `DATA_IMPORT_EXECUTION_PLAN.md`: wajib lolos validasi skema otomatis, uji coba *dry-run* 100% bersih, dan tanda tangan izin Pemilik sebelum impor. | **Open** *(Menunggu Roster Resmi)* |
| **R-02** | **Domain belum siap / Propagasi DNS lambat:** Domain resmi sekolah belum diarahkan ke IP publik VPS saat jadwal peluncuran. | **Sedang** | Konfirmasi DNS A-Record minimal 24 jam sebelum hari-H; siapkan fallback akses via subdomain alternatif yang telah ber-SSL aktif. | **Open** *(Menunggu Keputusan Owner)* |
| **R-03** | **Lonjakan login bersamaan (*Concurrent Burst*):** 200+ siswa melakukan login secara simultan dalam 60 detik pertama jam pelajaran, memicu antrean request. | **Sedang** | Kinerja native driver `better-sqlite3` sinkron dan transaksi sub-milidetik, didukung buffer reverse proxy Nginx dan rate limiter 5 percobaan/300s. Monitoring ketat via PM2 monit saat jam pertama KBM. | **Watch** *(Dipantau Saat Jam Pertama)* |
| **R-04** | **Database corrupt akibat insiden daya (*Unclean Shutdown*):** Berkas database utama rusak akibat VPS mati mendadak saat transaksi WAL terbuka. | **Tinggi** | SQLite dikonfigurasi dengan mode `PRAGMA synchronous = NORMAL` dan WAL mode. Mitigasi berlapis: pencadangan otomatis per jam via `sqlite3 VACUUM INTO` dan verifikasi integritas harian via `PRAGMA integrity_check`. | **Mitigated** *(Terspesifikasi Baku)* |
| **R-05** | **Kendala Mi Browser pada perangkat Xiaomi:** Peramban bawaan Xiaomi (*Mi Browser*) menolak menampilkan dialog autentikasi atau merender tampilan responsif secara keliru. | **Sedang** | Menghilangkan HTTP Basic Auth pada domain produksi murni (hanya menggunakan login form aplikasi). Mengedukasi guru dan siswa agar mewajibkan Google Chrome Mobile. | **Mitigated** *(Aturan KBM Disahkan)* |
| **R-06** | **Kebocoran kredensial atau rahasia server:** Nilai salt, pepper, atau password terungkap ke publik atau repositori. | **Tinggi** | File `.env` diproteksi `chmod 600`, diabaikan 100% oleh `.gitignore`, dan variabel `TEACHER_DEV_PASSWORD` dikosongkan. Variabel produksi di-generate via entropy acak `openssl rand -hex 32`. | **Mitigated** *(Repo 100% Steril)* |
| **R-07** | **Penyimpangan format cetak A4 pada printer lokal:** Pengaturan cetak printer nirkabel sekolah secara default memilih Letter atau Landscape. | **Rendah** | Stylesheet `@media print` telah mengunci `@page { size: A4 portrait; margin: 15mm; }`. SOP pengawas ujian/guru menginstruksikan pemeriksaan pratinjau sebelum mencetak. | **Mitigated** *(P2 Print Active)* |
| **R-08** | **Bypass materi pembelajaran terkunci (*Content Lock Bypass*):** Siswa mencoba mengakses submateri berikutnya sebelum lulus kuis materi prasyarat. | **Tinggi** | Remediasi P1 telah tuntas dan terverifikasi via uji probe jaringan: validasi otorisasi ganda di frontend (`course.js`, `dashboard.js`) dan backend service layer. | **Mitigated** *(P1 Security Closed)* |

---

## 3. Matriks Eskalasi & Tanggap Darurat (Incident Escalation Protocol)

Jika terjadi insiden operasional selama hari pertama rilis produksi:

```text
Insiden Terdeteksi ──► Dampak KBM < 5 menit?
                           │
       ┌───────────────────┴───────────────────┐
       ▼ [Ya]                                  ▼ [Tidak: Kritis]
Terapkan Mitigasi Sementara             Picu Emergency Rollback Runbook:
(Panduan Guru di Kelas)                 1. pm2 stop purwaverse-prod
                                        2. Restore DB Snapshot Pra-Deploy
                                        3. Checkout Tag Stabil Sebelumnya
                                        4. pm2 start purwaverse-prod
                                        5. Laporan Insiden ke Controller
```

---

## 4. Kesimpulan Kesiapan Risiko

Dari 8 risiko yang terdaftar:
* **4 Risiko Berkategori Tinggi** telah memiliki mitigasi arsitektural baku (*Mitigated* / *Governed*).
* **2 Risiko Operasional** berstatus *Open* karena menunggu keputusan administratif pemilik (Penetapan Domain & Penyerahan Berkas Roster Siswa).
* **1 Risiko Performa** berstatus *Watch* dan akan diawasi langsung melalui telemetri PM2 saat jam pertama KBM berlangsung.
* Sistem dinyatakan **LAYAK UNTUK PELUNCURAN TERKENDALI (*FIT FOR CONTROLLED LAUNCH*)**.

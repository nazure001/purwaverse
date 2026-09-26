# PURWAVERSE LMS — SECURITY READINESS & INTEGRITY REPORT

**Dokumen:** `docs/production/SECURITY_READINESS_REPORT.md`  
**Fase:** Production Readiness Audit (Fase 1.B)  
**Status Evaluasi:** `PASS & HARDENED`  
**Klasifikasi:** Internal Security Audit  

---

## 1. Ikhtisar Postur Keamanan Sistem

Audit keamanan tahap penutupan staging mengevaluasi tiga pilar utama arsitektur aplikasi: **Autentikasi**, **Otorisasi Kontrol Akses**, dan **Manajemen Rahasia Sistem (*Secret Management*)**. Seluruh pengujian kode sumber dan lalu lintas jaringan (*network probe*) menunjukkan bahwa postur keamanan aplikasi siap untuk beban kerja produksi.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        SECURITY AUDIT MATRIX                           │
├─────────────────────────┬───────────────────────┬──────────────────────┤
│ DOMAIN KEAMANAN         │ STATUS AUDIT          │ MITIGASI / HARDENING │
├─────────────────────────┼───────────────────────┼──────────────────────┤
│ 1. Autentikasi          │ ✅ LULUS TANPA CATATAN│ Argon2id + Pepper    │
│ 2. Otorisasi Akses      │ ✅ LULUS (P1 CLOSED)  │ State Machine Guard  │
│ 3. Manajemen Rahasia    │ ✅ 100% STERIL        │ Git Whitelist Strict │
└─────────────────────────┴───────────────────────┴──────────────────────┘
```

---

## 2. Audit Autentikasi (Authentication Review)

### 2.1 Alur Login Siswa (*Student Login Flow*)
* **Mekanisme Kredensial:** Siswa masuk menggunakan kombinasi Rombel/Kelas + Nomor Absen, atau NIS langsung, dan PIN 4-digit.
* **Penanganan PIN (*PIN Handling*):**
  * PIN siswa **TIDAK PERNAH** disimpan dalam bentuk teks polos (*plaintext*).
  * Backend menggunakan algoritma kriptografi modern **Argon2id** (memory cost: 64MB, time cost: 3 iterations, parallelism: 1 thread) yang diperkuat dengan *environment pepper* (`STUDENT_PIN_PEPPER`).
  * Tersedia mekanisme *auto-upgrade* transparan: bila siswa dengan format hash lama (*legacy SHA-256*) berhasil login, sistem secara otomatis meng-hash ulang kredensial menggunakan Argon2id dan memperbarui baris basis data secara atomik.
* **Perlindungan Terhadap Brute-Force:**
  * Diimplementasikan `express-rate-limit` pada endpoint RPC `/api/purwa`.
  * Pembatasan: Maksimal 5 percobaan gagal per IP/klien dalam jendela waktu 300 detik (5 menit). Setelah melampaui batas, sistem menolak request dengan status HTTP 429 Too Many Requests.

### 2.2 Alur Login Guru (*Teacher Login Flow*)
* **Kredensial:** Username (`guru`) dan kata sandi kompleks.
* **Hashing Kata Sandi:** Hashing Argon2id dengan *salt* unik (`TEACHER_PASSWORD_SALT`).
* **Proteksi Lingkungan:** Mode fallback sandi pengembang (`TEACHER_DEV_PASSWORD`) **WAJIB KOSONG** pada lingkungan produksi. Bila variabel ini terisi string, server secara otomatis memblokir startup atau mengeluarkan peringatan audit kritis.

### 2.3 Manajemen Masa Berlaku Sesi (*Session Lifecycle & Expiration*)
* **Format Token:** Token acak berentropi tinggi (32-byte hex crypto-secure random).
* **Masa Berlaku (*TTL*):** Sesi dibatasi maksimal 8 jam (`SESSION_TTL_HOURS = 8`), sesuai durasi jam pembelajaran di sekolah.
* **Validasi Setiap Permintaan:** Middleware `requireSession` di `server/src/middleware/authMiddleware.js` memeriksa keabsahan token, masa kedaluwarsa, dan status keaktifan pengguna pada setiap RPC call yang membutuhkan otorisasi.
* **Alur Keluar (*Logout*):**
  * Pemanggilan aksi `logout` menghapus rekaman sesi dari tabel `active_sessions` di SQLite.
  * Sisi klien membersihkan `sessionToken`, `currentUser`, dan seluruh state pembelajaran dari `localStorage` dan memori `AppState`.

---

## 3. Audit Otorisasi & Kontrol Hak Akses (Authorization Review)

### 3.1 Pemisahan Peran Siswa vs Guru (*Role-Based Access Control*)
Aksi-aksi administratif guru dilindungi secara mutlak di lapisan kontroler backend:
* Aksi `saveTeacherChecks`, `exportClassCards`, `authorizeDeputySubmission`, dan `revokeDeputySubmission` memvalidasi `session.role === 'teacher'`.
* Jika token siswa mencoba memanggil endpoint guru, backend secara tegas mengembalikan respons `{ ok: false, error: 'Unauthorized: Teacher role required' }` dan mencatat insiden ke tabel `audit_logs`.

### 3.2 Otorisasi Materi Pembelajaran (*Locked Content Protection - Remediasi P1*)
* **Kondisi Sebelum Patch:** Siswa dapat memotong (*bypass*) materi yang terkunci dengan mengeksekusi `window.openCourseUnit('CH08-01-U02')` secara langsung di konsol peramban sebelum submateri 1 selesai.
* **Kondisi Setelah Patch (Terverifikasi):**
  * Pengecekan otorisasi ganda diimplementasikan pada `public/js/course.js` dan `public/js/dashboard.js`.
  * Sistem memvalidasi apakah unit yang diakses memiliki `contentUnlocked === true` dan status submateri sebelumnya telah selesai serta kuis telah lulus KKM (skor ≥ 70).
  * Upaya pemanggilan paksa dari konsol peramban secara otomatis dibatalkan dan menampilkan notifikasi peringatan (*toast warning*): *"Submateri masih terkunci. Selesaikan kuis unit sebelumnya untuk membuka materi ini."*

### 3.3 Kontrol Delegasi Praktikum Tim (*Controlled Fallback Authorization*)
* Pengerjaan dan pengiriman Lembar Kerja Peserta Didik (LKPD) tim sains hanya diizinkan untuk siswa dengan peran **Ketua Kelompok (*Leader*)**.
* Anggota biasa (*Member*) dilarang menyimpan draf maupun mengirim jawaban akhir.
* Wakil (*Deputy*) hanya dapat mengambil alih peran bila telah memperoleh izin resmi dari guru melalui aksi `authorizeDeputySubmission` dengan alasan sah (misal: Leader izin/sakit/kendala gawai).
* Guru memiliki wewenang mencabut (*revoke*) izin delegasi kapan pun diperlukan.

---

## 4. Manajemen Rahasia & Pencegahan Kebocoran Data (Secret Management)

Pemeriksaan komprehensif terhadap riwayat repositori Git dan dokumentasi mengonfirmasi ketaatan penuh pada aturan keselamatan lingkungan (*Environment Safety Rules*):

| Kategori Pemeriksaan | Parameter yang Diperiksa | Hasil Audit |
|---|---|---|
| **Pengecualian Berkas Lingkungan** | File `.env`, `.env.production`, `.env.local` | ✅ TERKUNCI DALAM `.gitignore` (Tidak ada berkas `.env` yang pernah ter-commit ke git). |
| **Pemberian Contoh Konfigurasi** | Berkas `.env.example` | ✅ STERIL (Hanya memuat nilai *dummy* dan panduan variabel, tanpa rahasia riil). |
| **Penyimpanan Kredensial Nyata** | Hash kata sandi, *salt*, *pepper*, token sesi | ✅ TIDAK DITEMUKAN di seluruh berkas markdown, source code, ataupun commit history. |
| **Kunci Kriptografi & Sertifikat** | Berkas `*.key`, `*.pem`, `*.crt` | ✅ DILARANG & DIABAIKAN oleh git. |
| **Log & Debug Dump** | Jejak log konsol atau dump basis data | ✅ DIABAIKAN oleh git (tersimpan secara lokal pada `/var/log/purwaverse/` di VPS). |

---

## 5. Rekomendasi Pengerasan Akhir Sebelum Produksi

1. **Penggantian Kunci Sesi Produksi:** Pastikan variabel `JWT_SECRET`, `STUDENT_PIN_PEPPER`, dan `TEACHER_PASSWORD_SALT` di `.env` produksi di-generate menggunakan string acak berpanjang minimal 32 karakter via `openssl rand -hex 32`.
2. **Izin Berkas Ketat:** Setel izin berkas lingkungan produksi dengan perintah:
   ```bash
   chmod 600 /var/www/purwaverse/server/.env
   chmod 750 /var/www/purwaverse/server/data
   ```
3. **Pemberian Nilai Kosong pada Mode Pengembang:** Pastikan baris `TEACHER_DEV_PASSWORD=` pada `.env` server produksi benar-benar dikosongkan.

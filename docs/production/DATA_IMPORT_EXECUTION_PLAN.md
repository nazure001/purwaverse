# PURWAVERSE LMS — DATA IMPORT EXECUTION PLAN

**Dokumen:** `docs/production/DATA_IMPORT_EXECUTION_PLAN.md`  
**Fase:** Data Migration Safety (Tahap 2)  
**Status Rencana:** `GOVERNED & LOCKED` (Menunggu Gerbang Persetujuan Pemilik)  
**Target Data:** Roster 207 Siswa Resmi (Kelas 8A – 8E)  

---

## 1. Prinsip Keselamatan Data Operasional

Data operasional siswa sekolah (identitas, NISN, kredensial PIN, progres belajar, dan nilai) dilindungi dengan prinsip keselamatan tingkat tinggi:

1. **DILARANG MENGIMPOR TANPA PERSETUJUAN:** Berkas CSV siswa tidak boleh diimpor langsung ke database produksi sebelum melalui tahapan validasi, uji coba simulasi (*dry run*), dan persetujuan tertulis (*owner approval*).
2. **ZERO PLAINTEXT CREDENTIALS:** PIN 4-digit siswa wajib langsung di-hash menggunakan **Argon2id** yang diperkuat oleh *production pepper* saat proses impor berlangsung. Berkas mentah yang memuat PIN teks polos harus segera dimusnahkan secara aman setelah verifikasi selesai.
3. **TRANSAKSI ATOMIK UTUH:** Proses impor wajib dieksekusi dalam satu blok transaksi SQL `BEGIN IMMEDIATE TRANSACTION; ... COMMIT;`. Jika terjadi kegagalan pada satu siswa (misal: NISN duplikat atau FK kelas tidak valid), seluruh transaksi otomatis dibatalkan (*100% rollback*).

---

## 2. Alur Eksekusi Impor Data 6 Tahap (The 6-Stage Pipeline)

```text
┌──────────────────────┐
│  1. CSV SISWA MENTAH │ Format: student_id, nis, nisn, name, gender, class_id, roll_no, pin
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  2. DATA VALIDATION  │ Validasi skema, duplikasi NISN, format PIN 4-digit, kelas valid
└──────────┬───────────┘
           │ Lolos 100%
           ▼
┌──────────────────────┐
│   3. DRY RUN TEST    │ Simulasi impor ke basis data memori / sementara
└──────────┬───────────┘
           │ Laporan Anomali Bersih (0 Error)
           ▼
┌──────────────────────┐
│ 4. GATE OF APPROVAL  │ Presentasi ringkasan ke Pemilik Sistem (Tanda Tangan Izin)
└──────────┬───────────┘
           │ Disetujui
           ▼
┌──────────────────────┐
│ 5. PRODUCTION IMPORT │ Eksekusi ke purwaverse.db dalam transaksi atomik + Argon2id
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  6. POST-VERIFY &    │ Hitung baris (207), foreign_key_check, uji sampel login,
│     SECURE BACKUP    │ ambil snapshot baseline produksi
└──────────────────────┘
```

---

## 3. Rincian Teknis Setiap Tahap

### Tahap 1: Spesifikasi Format Berkas CSV Siswa
Berkas CSV resmi wajib mengikuti struktur kolom baku:
```csv
student_id,nis,nisn,name,gender,class_id,roll_no,pin_raw
8A-01,240101,0091234567,Ahmad Fauzi,L,8A,1,1234
8A-02,240102,0091234568,Aisyah Putri,P,8A,2,5678
```

Aturan Format Kolom:
* `student_id`: Format baku `[CLASS_ID]-[ROLL_NO_2DIGIT]` (Primary Key, misal: `8A-01`).
* `nis`: Nomor Induk Siswa internal sekolah (teks/angka).
* `nisn`: Nomor Induk Siswa Nasional 10-digit unik (tidak boleh duplikat di seluruh rombel).
* `name`: Nama lengkap siswa (dibersihkan dari karakter kontrol berbahaya / HTML injection).
* `gender`: `L` (Laki-laki) atau `P` (Perempuan).
* `class_id`: Wajib merujuk pada `master_classes` yang aktif (`8A`, `8B`, `8C`, `8D`, `8E`).
* `roll_no`: Nomor absen siswa (angka bulat 1–45).
* `pin_raw`: PIN awal 4-digit (`^\d{4}$`).

---

### Tahap 2: Validasi Data Otomatis (Validation Phase)
Skrip validator memverifikasi integritas data sebelum menyentuh engine database:
* **Uji Integritas Kunci Unik:** Memastikan tidak ada nilai `student_id` atau `nisn` yang terduplikasi.
* **Uji Integritas Referensial (*Foreign Key*):** Memastikan seluruh `class_id` telah terdaftar pada tabel `master_classes`.
* **Uji Format Kredensial:** Memastikan seluruh `pin_raw` berupa persis 4 karakter digit angka.
* **Uji Rentang Absen:** Memastikan `roll_no` berurutan dan unik dalam satu `class_id`.

---

### Tahap 3: Uji Coba Simulasi (Dry Run Phase)
* Skrip impor dijalankan dengan flag `--dry-run` terhadap basis data sementara di memori (`:memory:`):
  ```bash
  node scripts/import-students-production.js --dry-run /path/to/roster_clean.csv
  ```
* Output yang wajib dihasilkan:
  ```text
  [DRY RUN] Membaca berkas: roster_clean.csv
  [DRY RUN] Total baris terdeteksi: 207 siswa
  [DRY RUN] Distribusi Rombel: 8A (41), 8B (41), 8C (42), 8D (41), 8E (42)
  [DRY RUN] Duplikasi NISN: 0
  [DRY RUN] Validasi Format PIN: 207 lolos (100%)
  [DRY RUN] Foreign Key Check: OK (0 error)
  [DRY RUN] HASIL: KELAYAKAN DATA 100% SIAP IMPOR
  ```

---

### Tahap 4: Gerbang Persetujuan Pemilik (Owner Approval Gate)
Laporan ringkasan hasil *dry run* diserahkan kepada Pemilik Sistem / Kepala Sekolah untuk diverifikasi:
* Memverifikasi total jumlah siswa (misal: persis 207 siswa).
* Memverifikasi tidak ada siswa yang salah kelas atau tertinggal.
* Pemilik menandatangani formulir persetujuan impor data riil.

---

### Tahap 5: Eksekusi Impor Produksi (Production Import Execution)
Setelah izin resmi diperoleh, impor dieksekusi ke basis data utama:
```bash
# 1. Pastikan cadangan pra-impor telah diambil
sqlite3 /var/www/purwaverse/data/purwaverse.db "VACUUM INTO '/var/backups/purwaverse/pre_student_import_$(date +%Y%m%d_%H%M%S).db';"

# 2. Eksekusi skrip impor resmi
node scripts/import-students-production.js --execute /path/to/roster_clean.csv

# Skrip secara internal menjalankan:
# - BEGIN IMMEDIATE TRANSACTION;
# - Hashing setiap PIN dengan argon2.hash(pin + STUDENT_PIN_PEPPER)
# - INSERT INTO master_students (student_id, nis, nisn, name, gender, class_id, roll_no, pin_hash, active) VALUES (...)
# - COMMIT;
```

---

### Tahap 6: Verifikasi Pasca-Impor & Pengamanan Berkas
1. **Verifikasi Jumlah Baris:**
   ```sql
   SELECT class_id, COUNT(*) as total FROM master_students GROUP BY class_id;
   -- Total keseluruhan wajib persis 207 siswa
   ```
2. **Verifikasi Penegakan Integritas:**
   ```sql
   PRAGMA foreign_key_check;
   -- Wajib mengembalikan 0 baris (kosong)
   ```
3. **Uji Sampel Login Satu Siswa:**
   * Masuk menggunakan NIS dan PIN akun siswa uji resmi untuk memastikan proses *hash matching* berhasil.
4. **Pemusnahan Berkas Mentah (Secure Wipe):**
   * Berkas `roster_clean.csv` yang memuat PIN teks polos segera dihapus dari server menggunakan utilitas penghapusan aman (`shred -u` atau `rm -P`).
5. **Snapshot Baseline Bersih:**
   * Ambil snapshot database final yang sudah berisi siswa riil ke `/var/backups/purwaverse/purwaverse_baseline_ready.db`.

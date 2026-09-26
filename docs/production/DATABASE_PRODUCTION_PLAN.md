# PURWAVERSE LMS — DATABASE PRODUCTION MANAGEMENT PLAN

**Dokumen:** `docs/production/DATABASE_PRODUCTION_PLAN.md`  
**Fase:** Database Production Preparation (Fase 2)  
**Status Dokumen:** `PLANNED & APPROVED SPECIFICATION` (Hanya Rencana, Bukan Eksekusi)  
**Tujuan:** Menjamin keutuhan, integritas referensial, keselamatan data riil siswa, dan prosedur pemulihan bencana tanpa improvisasi lapangan.  

---

## 1. Engine Basis Data & Konfigurasi Runtime

Aplikasi Purwaverse LMS mengadopsi basis data relasional mandiri berbasis berkas:

* **Engine:** SQLite 3 (versi 3.40+)
* **Driver Runtime:** `better-sqlite3` v11.8.1 (native C++ binding untuk Node.js dengan latensi sub-milidetik dan transaksi sinkron atomik).
* **Lokasi Berkas Produksi:** `/var/www/purwaverse/data/purwaverse.db`
* **Pragma Operasional Wajib:**
  ```sql
  PRAGMA journal_mode = WAL;         -- Write-Ahead Logging untuk konkurensi tinggi (pembacaan tidak memblokir penulisan)
  PRAGMA synchronous = NORMAL;       -- Keseimbangan optimal antara daya tahan dan performa I/O
  PRAGMA foreign_keys = ON;          -- Penegakan integritas referensial antar tabel relasional
  PRAGMA busy_timeout = 5000;        -- Timeout toleransi penguncian berkas 5.000 ms
  PRAGMA cache_size = -64000;        -- Alokasi cache memori ~64 MB
  ```

---

## 2. Versi Skema Relasional (Schema Version v1.0.0)

Skema basis data produksi didefinisikan secara resmi pada `server/src/database/schema.sql` dan terdiri atas 11 tabel inti terindeks:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PURWAVERSE RELATIONAL SCHEMA                    │
├──────────────────────────┬──────────────────────────┬──────────────────┤
│ KATEGORI TABEL           │ NAMA TABEL               │ FUNGSI UTAMA     │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ Master & Rombel          │ master_classes           │ Rombel 8A - 8E   │
│                          │ master_students          │ Roster Siswa     │
│                          │ master_activities        │ Katalog Aktivitas│
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ Asesmen & Diagnostik     │ diagnostic_items         │ 25 Soal M0       │
│                          │ self_map_items           │ Angket Minat     │
│                          │ student_responses        │ Respon Diagnostik│
│                          │ diagnostic_profiles      │ Profil Radar     │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ Pembelajaran & Kelompok  │ student_progress         │ State 21 Unit    │
│                          │ teams                    │ 8 Tim Per Rombel │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ Sesi & Keamanan          │ active_sessions          │ Token Sesi Aktif │
│                          │ audit_logs               │ Jejak Forensik   │
└──────────────────────────┴──────────────────────────┴──────────────────┘
```

---

## 3. Strategi Migrasi Skema (Migration Strategy)

1. **Jendela Pemeliharaan (*Maintenance Window*):** Migrasi skema hanya boleh dieksekusi di luar jam aktif KBM sekolah (misal: pukul 18.00–21.00 WIB atau akhir pekan).
2. **Prinsip Non-Destruktif (*Non-Breaking Migrations*):**
   * Penambahan kolom baru wajib menyertakan nilai bawaan (`DEFAULT`) atau mengizinkan `NULL`.
   * Dilarang menjalankan perintah `DROP TABLE`, `ALTER TABLE ... DROP COLUMN`, atau modifikasi tipe data kolom tanpa skrip migrasi berjenjang (*blue-green table swap*).
3. **Eksekusi Transaksional:** Setiap perubahan skema dibungkus dalam blok transaksi SQL `BEGIN IMMEDIATE TRANSACTION; ... COMMIT;`. Bila terjadi kegagalan sekecil apa pun, transaksi langsung di-`ROLLBACK` otomatis.

---

## 4. Strategi Pencadangan (Backup Strategy)

SQLite dalam mode WAL membutuhkan pencadangan tanpa mengunci pembaca (*zero-lock online backup*).

### 4.1 Prosedur Pencadangan Mandatori
DILARANG menggunakan perintah Linux biasa (`cp purwaverse.db purwaverse.db.bak`) saat aplikasi sedang berjalan, karena dapat menghasilkan berkas korup akibat transaksi WAL yang belum ter-checkpoint.

Gunakan perintah resmi SQLite Safe Snapshot:
```bash
sqlite3 /var/www/purwaverse/data/purwaverse.db \
  "VACUUM INTO '/var/backups/purwaverse/purwaverse_backup_$(date +%Y%m%d_%H%M%S).db';"
```

### 4.2 Jadwal Otomatis (Cron Schedule di VPS)
Jadwalkan pencadangan otomatis melalui crontab user `deploy`:
```cron
# 1. Pencadangan per jam selama jam sekolah aktif (07:00 - 15:00 WIB, Senin-Jumat)
0 7-15 * * 1-5 sqlite3 /var/www/purwaverse/data/purwaverse.db "VACUUM INTO '/var/backups/purwaverse/hourly_$(date +\%Y\%m\%d_\%H00).db';"

# 2. Pencadangan harian penuh setiap malam pukul 23:00 WIB
0 23 * * * sqlite3 /var/www/purwaverse/data/purwaverse.db "VACUUM INTO '/var/backups/purwaverse/daily_$(date +\%Y\%m\%d).db';"

# 3. Rotasi pembersihan berkas cadangan lebih dari 14 hari
30 23 * * * find /var/backups/purwaverse/ -name "*.db" -mtime +14 -exec rm {} \;
```

---

## 5. Prosedur Pemulihan (Restore Strategy & Rehearsal Runbook)

Jika terjadi insiden darurat atau kerusakan berkas pada basis data utama:

1. **Hentikan Layanan Node.js:**
   ```bash
   pm2 stop purwaverse-prod
   ```
2. **Karantina Berkas yang Rusak:**
   ```bash
   mv /var/www/purwaverse/data/purwaverse.db /var/backups/purwaverse/corrupt_$(date +%Y%m%d_%H%M%S).db.bak
   rm -f /var/www/purwaverse/data/purwaverse.db-wal /var/www/purwaverse/data/purwaverse.db-shm
   ```
3. **Salin Berkas Cadangan Terverifikasi:**
   ```bash
   cp /var/backups/purwaverse/daily_TARGET_RESTORE.db /var/www/purwaverse/data/purwaverse.db
   chmod 640 /var/www/purwaverse/data/purwaverse.db
   ```
4. **Jalankan Verifikasi Integritas:**
   ```bash
   sqlite3 /var/www/purwaverse/data/purwaverse.db "PRAGMA integrity_check;"
   # Output wajib: ok
   sqlite3 /var/www/purwaverse/data/purwaverse.db "PRAGMA foreign_key_check;"
   # Output wajib: (kosong / 0 error)
   ```
5. **Nyalakan Kembali Layanan & Uji Endpoint:**
   ```bash
   pm2 start purwaverse-prod
   curl -I https://purwaverse.sekolah.sch.id/api/healthz
   # Output wajib: HTTP/2 200 OK
   ```

---

## 6. Strategi Rollback (Rollback Plan)

Bila penerapan versi baru aplikasi gagal atau menimbulkan inkonsistensi data pasca-rilis:
1. Kembalikan kode aplikasi ke tag rilis sebelumnya via git checkout.
2. Pulihkan basis data dari *Pre-Deployment Snapshot* yang diambil pada Langkah 2 runbook deployment.
3. Jalankan `npm test` lokal di server untuk memastikan konsistensi driver native SQLite.
4. Restart layanan PM2.

---

## 7. Kebijakan Seeding Data & Perlindungan Roster Siswa Riil

> [!CAUTION]
> **KEBIJAKAN KESELAMATAN DATA SISWA SEKOLAH (STRICT POLICY)**:
> 
> Seluruh master data siswa resmi (207–208 siswa Kelas 8A–8E):
> 
> ```text
> STATUS: BELUM BOLEH DIIMPORT
> ```
> 
> Syarat mutlak sebelum import data siswa riil diperbolehkan:
> 1. Lingkungan VPS produksi telah dinyatakan `PRODUCTION_READY` 100%.
> 2. Domain resmi dan sertifikat SSL produksi telah terpasang aktif.
> 3. Persetujuan eksplisit (*written approval*) telah diberikan oleh pemilik repositori / penanggung jawab sekolah.
> 4. Backup baseline kosong telah tersimpan rapi di `/var/backups/purwaverse/`.

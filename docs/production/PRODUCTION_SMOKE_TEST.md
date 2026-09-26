# PURWAVERSE LMS — PRODUCTION SMOKE TEST PROTOCOL

**Dokumen:** `docs/production/PRODUCTION_SMOKE_TEST.md`  
**Fase:** Post-Deployment Operational Verification (Tahap 3)  
**Tujuan:** Protokol pengujian cepat (< 10 menit) non-destruktif untuk memvalidasi fungsi inti KBM segera setelah deployment produksi selesai.  

---

## 1. Ikhtisar Alur Smoke Test

Uji asap (*smoke test*) produksi mencakup dua skenario pengguna fundamental yang merepresentasikan seluruh siklus kegiatan belajar mengajar:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   SKENARIO 1: ALUR SISWA (STUDENT JOURNEY)             │
│                                                                        │
│   [ Login Siswa ] ──► [ Dashboard KBM ] ──► [ Buka Unit 1 ]           │
│                             │                                          │
│                             ▼                                          │
│                   [ Kerjakan Kuis Unit ] ──► [ Simpan Progres ]        │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                   SKENARIO 2: ALUR GURU (TEACHER JOURNEY)              │
│                                                                        │
│   [ Login Guru ] ──► [ Lihat Rombel 8A-8E ] ──► [ Pantau Progres ]     │
│                             │                                          │
│                             ▼                                          │
│                   [ Verifikasi/Approval LKPD & Resume ]                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Skenario 1: Verifikasi Alur Siswa (Student Verification)

Gunakan 1 akun siswa uji resmi untuk mengeksekusi 5 langkah berikut:

### Langkah 1.1: Login Siswa
* **Aksi:** Buka halaman utama `https://purwaverse.sekolah.sch.id/`. Pilih Rombel, masukkan Nomor Absen dan PIN 4-digit.
* **Kriteria Lolos (PASS):**
  * Respons HTTP 200 pada RPC `loginStudent`.
  * Pesan *toast* sukses menyapa nama siswa.
  * Token sesi tersimpan di `localStorage` dan antarmuka dialihkan ke Dashboard.
  * Tidak ada error visual atau console log berwarna merah.

### Langkah 1.2: Memuat Dashboard KBM
* **Aksi:** Periksa elemen tampilan pada *Learning Map Dashboard*.
* **Kriteria Lolos (PASS):**
  * Kartu identitas menampilkan Nama Siswa, NIS, Rombel, dan Peran Kelompok.
  * Peta 21 Unit Pembelajaran termuat utuh.
  * Unit 1 berstatus aktif (`reading`), sedangkan Unit 2–21 berstatus terkunci (`locked`).

### Langkah 1.3: Membuka Submateri Pembelajaran (Unit 1)
* **Aksi:** Klik tombol *"Mulai Belajar"* pada Unit 1.
* **Kriteria Lolos (PASS):**
  * Modul bacaan Unit 1 (Sistem Pencernaan & Nutrisi) termuat sempurna beserta diagram.
  * Form Lembar Rangkuman Mandiri dapat diisi teks.
  * Tekan tombol pintas cetak (Ctrl+P); pratinjau cetak A4 otomatis beralih ke layout bersih berlatar putih (*P2 Print Stylesheet aktif*).
  * **Verifikasi Kontrol P1:** Coba klik Unit 2; sistem wajib menolak dengan notifikasi *"Submateri masih terkunci."*

### Langkah 1.4: Pengerjaan & Pengiriman Kuis Unit
* **Aksi:** Buka ruang kuis Unit 1 (*Quiz Chamber*), jawab butir pertanyaan kuis, dan klik *"Kirim Jawaban"*.
* **Kriteria Lolos (PASS):**
  * Timer kuis berjalan normal.
  * Pengacakan opsi jawaban berfungsi secara deterministik.
  * Nilai kuis dihitung secara instan; jika nilai ≥ 70 (lulus KKM), status unit berubah menjadi selesai (*completed*).

### Langkah 1.5: Persistensi Progres Belajar (*Progress Save*)
* **Aksi:** Muat ulang peramban (*hard reload* Ctrl+F5).
* **Kriteria Lolos (PASS):**
  * Sesi siswa tetap bertahan tanpa diminta login ulang.
  * Progres Unit 1 yang telah lulus tetap tercatat selesai.
  * Unit 2 kini terbuka otomatis (*unlocked*) untuk dapat dipelajari selanjutnya.

---

## 3. Skenario 2: Verifikasi Alur Guru (Teacher Verification)

Gunakan kredensial guru resmi sekolah untuk mengeksekusi 4 langkah berikut:

### Langkah 2.1: Login Portal Guru
* **Aksi:** Masuk ke menu Guru, masukkan username `guru` dan kata sandi produksi.
* **Kriteria Lolos (PASS):**
  * Respons HTTP 200 pada RPC `loginTeacher`.
  * Dasbor komando guru (*Teacher Command View*) terbuka sempurna.

### Langkah 2.2: Pemeriksaan Rombel & Presensi Siswa
* **Aksi:** Klik tab kelas; pilih rombel 8A, 8B, 8C, 8D, dan 8E secara bergantian.
* **Kriteria Lolos (PASS):**
  * Seluruh rombel memunculkan daftar siswa sesuai master data.
  * Indikator status kehadiran dan aktivitas belajar siswa tampil tanpa keterlambatan data (*data latency* < 500 ms).

### Langkah 2.3: Pemantauan Progres Belajar Kelas
* **Aksi:** Periksa rekap matriks progres 21 submateri untuk kelas aktif.
* **Kriteria Lolos (PASS):**
  * Persentase ketuntasan siswa yang telah menyelesaikan kuis pada Langkah 1.4 terbarui secara akurat.
  * Skor kuis siswa uji tercatat di database dan dapat dilihat pada rincian nilai.

### Langkah 2.4: Approval LKPD & Controlled Fallback Guru
* **Aksi:** Buka modul verifikasi praktikum kelompok sains (LKPD) dan rangkuman siswa.
* **Kriteria Lolos (PASS):**
  * Guru dapat membaca draf jawaban rangkuman dan memberikan status persetujuan (*verified*).
  * Panel kontrol delegasi wakil ketua (*Controlled Fallback*) berfungsi normal: tombol otorisasi dan pencabutan (*revoke*) hak kirim LKPD dapat diklik tanpa galat.

---

## 4. Lembar Hasil Eksekusi Uji Asap (Smoke Test Scorecard)

| ID Uji | Komponen yang Diuji | Status Target | Hasil Uji Lapangan | Catatan Verifikasi |
|---|---|---|---|---|
| **ST-01** | Student Login & PIN Validation | PASS | `[ ] PASS  [ ] FAIL` | |
| **ST-02** | Dashboard & Learning Map Render | PASS | `[ ] PASS  [ ] FAIL` | |
| **ST-03** | Unit 1 Material & P1 Lock Guard | PASS | `[ ] PASS  [ ] FAIL` | |
| **ST-04** | A4 Ink-Saving Print Preview | PASS | `[ ] PASS  [ ] FAIL` | |
| **ST-05** | Quiz Chamber & KKM Scoring | PASS | `[ ] PASS  [ ] FAIL` | |
| **ST-06** | Student Progress Persistence | PASS | `[ ] PASS  [ ] FAIL` | |
| **ST-07** | Teacher Login & Authentication | PASS | `[ ] PASS  [ ] FAIL` | |
| **ST-08** | Teacher Roster & Progress Matrix | PASS | `[ ] PASS  [ ] FAIL` | |
| **ST-09** | Teacher LKPD Approval & Fallback | PASS | `[ ] PASS  [ ] FAIL` | |
| **ST-10** | Zero Critical Console / HTTP Errors | PASS | `[ ] PASS  [ ] FAIL` | |

**Kesimpulan Smoke Test:**  
`[ ] SISTEM PRODUKSI DINYATAKAN SEHAT & SIAP KBM`  
`[ ] SISTEM MENGALAMI ANOMALI — PICU ROLLBACK RUNBOOK`

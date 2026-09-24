# RENCANA UJI PENERIMAAN PENGGUNA STAGING VPS (VPS STAGING UAT PLAN)

**Dokumen**: `docs/testing/VPS_STAGING_UAT.md`
**Lingkungan Sasaran**: Staging VPS (Domain: `https://staging.purwaverse.sekolah.sch.id`)
**Basis Data Uji**: Database Staging Mandiri (`purwaverse_staging.db`)
**Akun Uji Sintetis**:
- Siswa Leader: Ahmad Synthetic Leader (`SYN-LEAD`), Kelas `8A`, No. Absen `91`, PIN `1234`
- Siswa Deputy: Budi Synthetic Deputy (`SYN-DEP`), Kelas `8A`, No. Absen `92`, PIN `1234`
- Siswa Anggota: Citra Synthetic Member (`SYN-MEM`), Kelas `8A`, No. Absen `93`, PIN `1234`
- Tim Sains: `SYN-TEAM-8A-01` (Tim Sintetis Alfa)
- Akun Guru: `guru` (kata sandi terotentikasi via Argon2id hash)

---

## 25 Skenario Pengujian UAT Wajib (Mandatory Acceptance Tests)

| No | Nama Skenario UAT | Langkah Pengujian & Prosedur | Kriteria Keberhasilan (Pass Criteria) | Kategori |
|---|---|---|---|---|
| **1** | **Akses HTTPS Aman** | Buka peramban ke `https://staging.domain/`. Periksa ikon gembok pada address bar peramban. | Sertifikat TLS/SSL valid (Let's Encrypt), tidak ada peringatan sertifikat atau mixed-content warning. | Infrastruktur |
| **2** | **Pemeriksaan Health Endpoint** | Akses `GET https://staging.domain/` langsung via peramban atau cURL. | Mengembalikan JSON status online: `{"status":"online","service":"purwaverse"}` dengan kode HTTP 200. | API / Health |
| **3** | **Login Siswa Sintetis** | Pilih Kelas 8A, No Absen 91 (`SYN-LEAD`), masukkan PIN `1234`. Klik "Masuk Portal Siswa". | Berhasil masuk ke dashboard siswa. DOM menampilkan "Ahmad Synthetic Leader" dan status XP. | Autentikasi |
| **4** | **Login Guru Sintetis** | Klik tab login guru, masukkan username `guru` dan password terenkripsi Argon2id. | Berhasil masuk ke Teacher Command Center. Menampilkan panel navigasi verifikasi kelas 8A. | Autentikasi |
| **5** | **Persistensi Sesi Siswa (Reload)** | Pada halaman dashboard siswa yang sedang login, tekan tombol reload peramban (`Ctrl+R` / `F5`). | Sesi tetap aktif, siswa tidak terlempar ke halaman login, data siswa tetap termuat. | Session |
| **6** | **Logout Menghapus Sesi** | Klik tombol "Keluar / Logout" di navigasi atas. | Token sesi pada `localStorage`/`sessionStorage` dibersihkan, halaman kembali ke form login. | Session |
| **7** | **Pemuatan Materi Unit 1** | Siswa membuka Modul Bab 1 $\rightarrow$ Unit 1 "Sel sebagai Unit Kehidupan". | Seluruh bagian teks materi, istilah kunci, dan kartu ilustrasi sel berhasil termuat tanpa gambar rusak. | Kurikulum |
| **8** | **Konfirmasi Buku Catatan Fisik** | Siswa mencentang checkbox "Saya telah membuat rangkuman di buku catatan fisik" lalu klik Simpan. | Status unit berubah menjadi badge kuning "Menunggu Verifikasi Guru". Gerbang kuis tetap terkunci. | Learning Gate |
| **9** | **Verifikasi Buku Catatan oleh Guru** | Guru membuka Teacher Command Center kelas 8A, temukan nama Ahmad, klik "Verifikasi Catatan". | Status resume berubah menjadi "Terverifikasi / Verified". Tombol Quiz Chamber pada siswa menjadi aktif. | Teacher Action |
| **10** | **Kuis Skenario A (Gagal KKM)** | Siswa membuka kuis Unit 1, memilih jawaban salah pada semua soal, klik Submit Kuis. | Kuis selesai dengan skor 0/100 (< KKM 70). Feedback remedial muncul di layar siswa. | Quiz Engine |
| **11** | **Unit 2 Tetap Terkunci Pasca Kuis Gagal** | Setelah kuis gagal, siswa kembali ke Peta Belajar dan mencoba membuka Unit 2. | Unit 2 terbukti berstatus terkunci (`locked`), dialog peringatan KKM belum tercapai muncul. | State Machine |
| **12** | **Kuis Skenario B (Retake Lulus KKM)** | Siswa mengulang kuis Unit 1, menjawab benar seluruh soal (skor 100/100), klik Submit. | Kuis berhasil meraih nilai 100/100 (≥ KKM 70). Animasi kelulusan unit dan perolehan badge XP aktif. | Quiz Engine |
| **13** | **Unit 2 Berhasil Terbuka** | Siswa membuka kembali Peta Belajar pasca kelulusan kuis Unit 1. | Unit 2 "Sel Hewan dan Sel Tumbuhan" berhasil terbuka (`unlocked`) dan materi dapat dibaca siswa. | State Machine |
| **14** | **Leader Menyimpan Draft LKPD** | Siswa Leader (`SYN-LEAD`) membuka LKPD tim Unit 2, mengisi form data praktikum, klik "Simpan Draft". | Draft tersimpan di database. Label versi tersimpan muncul di layar (`clientVersion`). | Kolaborasi Tim |
| **15** | **Anggota Biasa Berstatus View-Only** | Anggota tim (`SYN-MEM`, *Data Analyst*) login dan membuka LKPD tim. | Form praktikum terkunci read-only, tombol "Simpan Draft" dan "Kirim Laporan" tidak aktif / tersembunyi. | Izin Tim |
| **16** | **Deputy Terkunci Sebelum Otorisasi** | Wakil ketua (`SYN-DEP`, *Deputy Scientist*) login dan membuka LKPD sebelum ada pengesahan guru. | Role terdeteksi wakil, tetapi form tetap terkunci dan tombol submit bertuliskan `disabled=true`. | Controlled Fallback |
| **17** | **Guru Mengaktifkan Controlled Fallback** | Guru membuka Command Center, masukkan Tim `SYN-TEAM-8A-01`, Deputy `SYN-DEP`, Activity `CH08-01-U02-LAB01`, alasan sah. | Otorisasi disetujui. Rekam audit tersimpan dengan ID guru dan timestamp ISO presisi. | Controlled Fallback |
| **18** | **Deputy Mengirimkan Laporan LKPD** | Deputy me-refresh halaman LKPD, melihat banner hijau "FALLBACK DIAKTIFKAN", mengedit dan klik "Kirim Laporan". | Laporan resmi tim berhasil dikirim (`submitted`), nilai dan metadata fallback tercatat di database. | Controlled Fallback |
| **19** | **Persistensi Data LKPD Pasca Reload** | Deputy dan Leader me-reload halaman LKPD setelah submit. | Status tetap `submitted`, form terkunci permanen (*submitted read-only*), data isian tidak hilang. | Persistensi |
| **20** | **Guru Mencabut Wewenang Fallback** | Guru membuka Command Center, memilih tim bersangkutan, dan menekan tombol "Cabut Fallback (Revoke)". | Status fallback berubah menjadi `revoked`. Hak edit deputy dicabut dan wewenang mutlak kembali ke Leader. | Controlled Fallback |
| **21** | **Proteksi Akses Lintas Kelas Guru** | Guru mencoba memverifikasi tim atau siswa dari kelas yang tidak termasuk wewenangnya (misal Kelas 9A). | Permintaan ditolak server dengan pesan error ramah "Akses kelas tidak diizinkan." | Autorisasi |
| **22** | **Ketahanan Restart Service (Data Persistence)** | Administrator merestart service backend (`pm2 restart purwaverse-staging`). Siswa me-refresh halaman. | Seluruh data progres kuis, draft LKPD, dan sesi siswa tetap utuh 100% tanpa korupsi. | Database ACID |
| **23** | **Prosedur Backup & Restore Teruji** | Eksekusi online snapshot `VACUUM INTO` lalu uji integritas via `PRAGMA integrity_check;`. | File cadangan terbukti utuh (*ok*), dapat dibaca tanpa foreign key violation. | Disaster Recovery |
| **24** | **Tampilan Responsif Mobile (HP)** | Buka portal melalui smartphone atau Chrome DevTools Device Mode (iPhone/Android 390px). | Layout tidak meluap (*no horizontal scroll overflow*), menu navigasi dan tombol LKPD mudah disentuh. | Desain UI/UX |
| **25** | **Pencetakan & Sanitasi Error Publik** | Buka menu cetak laporan tim (`Ctrl+P`). Periksa konsol peramban saat terjadi kesalahan input sengaja. | Halaman cetak bersih tanpa elemen navigasi website; pesan error di UI/konsol tidak membocorkan credential/path. | Print & Sanitasi |

---

## Lembar Pengesahan UAT (Sign-off Matrix)

| Peran Evaluator | Nama Penguji | Tanggal Uji | Status Evaluasi | Tanda Tangan |
|---|---|---|---|---|
| **Staff QA / Lead Engineer** | AI Agent Antigravity | 23 September 2026 | LULUS LOKAL (Siap Staging) | `[VERIFIED]` |
| **Controller / Guru Pengampu** | ____________________ | ___ / ___ / 2026 | [ ] PASS  [ ] REVISE | `[ PENDING ]` |
| **Administrator Server VPS** | ____________________ | ___ / ___ / 2026 | [ ] READY [ ] HOLD | `[ PENDING ]` |

---
*Rencana UAT ini dirancang untuk memastikan kesiapan 100% sebelum sistem diakses oleh siswa dan guru sekolah.*

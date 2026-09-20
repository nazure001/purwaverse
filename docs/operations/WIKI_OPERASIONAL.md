# Wiki dan SOP Operasional Purwaverse IPA VIII

## 1. Tujuan sistem

Purwaverse membantu siswa meningkatkan kemampuan sains melalui urutan yang jelas:

1. membaca materi;
2. membuat rangkuman dengan bahasa sendiri di buku;
3. memperoleh pemeriksaan guru;
4. menguji pemahaman lewat Quick Quiz;
5. melakukan praktik atau tantangan yang relevan;
6. menyusun bukti dan kesimpulan dalam laporan tim;
7. melanjutkan ke submateri berikutnya sesuai ketuntasan.

Web bukan pengganti guru, buku tulis, atau pengalaman praktik. Web berfungsi sebagai jalur belajar, pencatat progres, sumber materi, pengelola LKPD, dan alat bantu penilaian.

## 2. Status kesiapan

| Bagian | Status | Keterangan |
|---|---|---|
| Login siswa dan guru | Siap | Sudah diuji pada Web App `/exec` |
| Navigasi sesuai peran dan tombol keluar | Siap | Sudah diuji |
| Materi 21 submateri | Siap | Pemeriksaan integrasi lulus |
| Rangkuman, glosarium, sumber, ilustrasi | Siap | Sudah tampil pada Web App |
| Ringkasan cetak satu halaman | Siap | Sudah diuji cetak |
| Pelaporan rangkuman buku | Siap | Status siswa tampil pada dashboard guru |
| Sinyal pemahaman siswa | Siap | Rekap kelas sudah terbukti tampil |
| Quick Quiz | Siap secara integrasi | Kunci dinilai server-side |
| Mission 0 dan penilaian profil | Siap secara integrasi | Perlu digunakan oleh siswa sebelum tim dibuat |
| Generate Science Team | Siap secara integrasi | Aktif setelah minimal 8 profil lengkap per kelas |
| Draft dan laporan praktik tim | Siap secara source dan simulasi | Verifikasi Web App menunggu tim nyata terbentuk |
| Kartu kontrol semester | Siap secara integrasi | Baru terbit setelah seluruh kewajiban selesai |

Kesimpulan: aplikasi dapat digunakan sekarang untuk sosialisasi, materi, rangkuman, pemeriksaan, dan kuis. Fitur tim akan terbuka secara alami setelah Mission 0 selesai; tidak perlu membuat data siswa palsu.

## 3. Prinsip penggunaan di sekolah

- HP tidak wajib dibawa setiap hari.
- Siswa hanya menggunakan HP di sekolah ketika guru memberi instruksi.
- Materi dapat dibaca di rumah atau ditayangkan guru di kelas.
- Rangkuman ditulis di buku, bukan diketik ke web.
- Guru memeriksa buku fisik sebelum memberi status `verified`.
- LKPD dapat dicetak agar kegiatan berlangsung tanpa HP.
- Leader dapat mengisi laporan di rumah setelah memperoleh data dari tim.
- Wakil dapat melanjutkan laporan bila leader berhalangan.
- Pengayaan bersifat pilihan dan tidak mengunci progres utama.
- Kegagalan trial adalah data; tim diminta memperbaiki rancangan, bukan menyembunyikan kegagalan.

## 4. Sosialisasi sebelum siswa mulai

### 4.1 Persiapan guru

1. Pastikan URL yang dibagikan adalah URL Web App `/exec`, bukan `/dev`.
2. Uji login guru dan satu akun siswa.
3. Siapkan daftar kelas, nomor absen, dan PIN secara privat.
4. Jangan menampilkan sheet `PIN_ISSUANCE` melalui proyektor.
5. Jelaskan bahwa Mission 0 bukan ranking dan tidak menentukan siswa pintar atau tidak.
6. Jelaskan urutan materi, rangkuman, pemeriksaan, kuis, dan praktik.
7. Tunjukkan cara keluar dari akun setelah menggunakan perangkat bersama.

### 4.4 Membuat dan membagikan kartu akun

Gunakan generator `CredentialCards.gs` agar PIN tidak perlu diekspor atau ditempel ke chat:

- Satu halaman A4 memuat 10 kartu (2 kolom x 5 baris).
- QR diperbesar agar lebih mudah dipindai, tetapi tetap hanya berisi alamat Web App `/exec`.

1. Buka **Project Settings → Script Properties**.
2. Tambahkan `PURWAVERSE_EXEC_URL` dengan nilai URL `/exec` lengkap.
3. Jalankan `generateCredentialCards8A()` dari editor Apps Script.
4. Ulangi melalui `generateCredentialCards8B()` sampai `generateCredentialCards8E()`.
5. Buka folder Drive yang tercantum pada hasil/log.
6. Pastikan akses folder **Dibatasi**.
7. Cetak PDF, potong kartu, lalu bagikan satu per siswa.
8. Jangan membagikan folder PDF atau file satu kelas ke grup.

QR pada setiap kartu hanya membuka halaman login. Nama, kelas, nomor absen, dan PIN tetap tercetak sebagai teks pada kartu privat dan tidak dikirim ke layanan QR.

### 4.2 Demonstrasi kelas yang disarankan

Durasi sekitar 15–20 menit:

1. Guru membuka halaman awal melalui proyektor.
2. Tunjukkan login siswa dengan akun demonstrasi yang aman.
3. Buka satu materi dan tunjukkan ilustrasi, glosarium, serta contoh kontekstual.
4. Tunjukkan bahwa rangkuman harus ditulis di buku.
5. Tunjukkan tombol **Saya sudah merangkum di buku**.
6. Jelaskan bahwa tombol itu hanya mengirim permintaan pemeriksaan, bukan memberi nilai otomatis.
7. Tunjukkan ringkasan cetak dan menu Panduan Praktik & LKPD.
8. Tunjukkan cara memilih sinyal “masih bingung”.
9. Akhiri dengan demonstrasi tombol **Keluar**.

### 4.3 Pesan singkat untuk siswa

- Simpan PIN dan jangan membagikannya.
- Kerjakan dengan akun sendiri.
- Baca materi, lalu rangkum di buku dengan bahasa sendiri.
- Tekan tombol laporan hanya setelah rangkuman benar-benar selesai.
- Gunakan sinyal bingung dengan jujur; sinyal tersebut bukan pengurang nilai.
- Jangan mengarang data praktik.
- Leader tidak boleh mengisi laporan tanpa mendengar anggota tim.

## 5. Peran akun

### 5.1 Siswa

Siswa dapat:

- membaca materi yang sudah terbuka;
- melihat ilustrasi dan glosarium;
- mencetak ringkasan;
- melaporkan rangkuman buku;
- mengerjakan Quick Quiz;
- mengirim sinyal pemahaman;
- melihat dan mencetak LKPD yang sudah terbuka;
- melihat laporan tim;
- mencetak kartu kontrol ketika semester selesai.

Siswa biasa tidak dapat mengubah laporan tim.

### 5.2 Scientist Leader

Leader dipilih otomatis dari hasil Mission 0. Tugasnya:

- menjaga misi praktik;
- membagi tugas;
- memastikan data berasal dari kegiatan nyata;
- menyimpan draft;
- meminta persetujuan anggota;
- mengirim laporan tim.

Leader bukan ketua permanen untuk semua kegiatan dan bukan siswa dengan “ranking tertinggi”.

### 5.3 Deputy Scientist Leader

Wakil dipilih otomatis berdasarkan urutan profil diagnostik setelah leader. Wakil dapat:

- menggantikan leader ketika diperlukan;
- memeriksa kelengkapan laporan;
- menyimpan atau mengirim laporan tim;
- melanjutkan pekerjaan dari rumah bila diperlukan.

Sistem melindungi draft dengan versi. Jika leader dan wakil membuka draft lama pada dua perangkat, perangkat kedua harus memuat ulang sebelum menimpa perubahan terbaru.

### 5.4 Guru

Guru dapat:

- melihat dashboard kelas;
- menilai Mission 0;
- membuat Science Team;
- membuka pratinjau seluruh materi tanpa mengubah progres siswa;
- memeriksa rangkuman dan LKPD;
- melihat sinyal pemahaman kelas;
- memberi status perbaikan atau verifikasi praktik;
- memberi nilai/catatan;
- melihat progres laporan tim;
- memberi pembukaan manual dengan alasan yang tercatat.

## 6. Alur siswa per submateri

### Tahap 1 — Materi dan rangkuman

1. Siswa login menggunakan kelas, nomor absen, dan PIN.
2. Buka **Jalur Belajar**.
3. Pilih submateri yang tidak terkunci.
4. Baca tujuan, uraian, ilustrasi, contoh, rangkuman inti, dan istilah penting.
5. Tulis rangkuman di buku sesuai perintah **Catat di buku**.
6. Tekan **Saya sudah merangkum di buku**.
7. Status berubah menjadi menunggu pemeriksaan guru.

Menekan tombol tidak langsung membuka kuis dan tidak memberi nilai.

### Tahap 2 — Pemeriksaan guru

1. Siswa menunjukkan buku kepada guru.
2. Guru memilih aktivitas rangkuman yang sesuai.
3. Guru mencentang siswa.
4. Guru memilih:
   - **Sudah diperiksa/verified** jika memenuhi ketentuan; atau
   - **Perlu perbaikan/needs_revision** jika harus diperbaiki.
5. Guru mengisi nilai/catatan bila diperlukan.
6. Guru menyimpan siswa yang dicentang.

### Tahap 3 — Quick Quiz

1. Kuis aktif setelah rangkuman diverifikasi.
2. Urutan soal dan pilihan dapat berbeda antar siswa.
3. Penilaian memakai ID stabil di server, bukan posisi tampilan.
4. Nilai minimum mengikuti konfigurasi aplikasi.
5. Jika belum tuntas, siswa membaca kembali materi dan mencoba lagi.
6. Percobaan yang lebih rendah tidak menghapus hasil mastery terbaik.

### Tahap 4 — Praktik atau penyelesaian unit

- Jika unit tidak memiliki praktik, unit selesai setelah rangkuman dan kuis tuntas.
- Jika praktik wajib tersedia, LKPD terbuka setelah kuis tuntas dan unit selesai setelah guru memverifikasi praktik.
- Jika praktik bersifat challenge opsional, hasilnya menjadi nilai tambah dan tidak mengunci jalur utama.

## 7. Mission 0 dan pembentukan tim

### 7.1 Tujuan Mission 0

Mission 0 memetakan cara siswa:

- mengamati;
- menjelaskan bukti;
- membuat model;
- memahami sistem;
- menggunakan data atau alat.

Hasilnya digunakan untuk dukungan belajar dan pemilihan leader, bukan ranking kelas.

### 7.2 Proses guru

1. Siswa mengerjakan seluruh butir Mission 0.
2. Guru membuka **Nilai Mission 0**.
3. Guru memberi skor reasoning 0–4 pada setiap jawaban berdasarkan jangkar/rubrik.
4. Profil baru dianggap lengkap jika semua butir wajib sudah dinilai.
5. Setelah minimal 8 profil lengkap, tombol **Generate 8 Science Teams** aktif.
6. Guru menekan tombol satu kali dan memeriksa hasil pembagian.

Jika tombol masih nonaktif, lihat keterangan jumlah profil lengkap pada dashboard. Jangan mengisi skor palsu hanya untuk membuka tombol.

### 7.3 Pembagian tim

Sistem berusaha membuat tim seimbang dan menetapkan:

- Scientist Leader;
- Deputy Scientist Leader;
- Lab Operator;
- Data Recorder;
- Evidence Checker;
- Communicator.

Jumlah peran menyesuaikan ukuran tim. Satu siswa dapat membantu lebih dari satu tugas bila anggota lebih sedikit.

## 8. SOP praktik

### Sebelum praktik

1. Guru memilih praktik yang relevan dengan materi.
2. Buka **Panduan Praktik & LKPD**.
3. Periksa misi, alat, alternatif, keselamatan, waktu, dan kriteria berhasil.
4. Guru menyetujui alat, bahan, lokasi, serta pembagian tugas.
5. Cetak LKPD kosong bila kegiatan dilakukan tanpa HP.
6. Pastikan meja rapi dan makanan/minuman jauh dari area praktik.
7. Periksa risiko benda tajam, pecah, panas, listrik, alergi, tumpahan, dan gerak tubuh.

### Saat praktik

1. Tim membaca misi dan membuat prediksi.
2. Lab Operator menyiapkan alat sesuai arahan.
3. Tim melakukan Trial 1.
4. Data Recorder mencatat hasil apa adanya, termasuk kegagalan.
5. Tim menentukan satu kelemahan penting.
6. Tim memperbaiki satu bagian dan melakukan Trial 2.
7. Evidence Checker memeriksa hubungan data dengan kesimpulan.
8. Communicator menyiapkan penjelasan hasil.

### Setelah praktik

1. Kembalikan alat.
2. Buang bahan sesuai arahan guru.
3. Bersihkan meja dan cuci tangan.
4. Leader atau wakil membuka LKPD tim.
5. Isi alat yang benar-benar digunakan, data, perbaikan, bukti, kesimpulan, batas model, refleksi, dan kontribusi anggota.
6. Simpan draft jika belum disetujui tim.
7. Kirim laporan setelah isinya diperiksa bersama.
8. Guru memeriksa melalui **Progress Tim**.

### Ketidakhadiran anggota

- Anggota yang tidak hadir tetap dapat membantu membaca data atau memeriksa laporan dari rumah.
- Leader dapat mengisi laporan dari rumah.
- Wakil dapat menggantikan leader.
- Kontribusi nyata setiap anggota ditulis pada bagian **Peran Anggota**.
- Guru tetap menentukan penyesuaian yang adil bagi siswa yang tidak mengikuti kegiatan fisik.

## 9. Alat dan bahan

Setiap praktik mempunyai alat utama dan alternatif. Prinsipnya:

- gunakan barang yang tersedia dan aman;
- alat khusus tidak menjadi satu-satunya jalan;
- guru menangani pemotongan atau bagian tajam;
- bahan praktik tidak dicicipi;
- hasil model tidak boleh diklaim sama persis dengan keadaan sebenarnya;
- keterbatasan mikroskop atau alat lain dicatat sebagai keterbatasan data, bukan kegagalan siswa.

Contoh alat sederhana yang digunakan dalam katalog: botol bekas yang disiapkan guru, balon atau plastik lentur, tali, karton, gelas kertas, stopwatch pinjaman, penggaris, bola/kelereng, saringan, kain, dan kartu kasus cetak.

## 10. Laporan praktik tim

### Status laporan

| Status | Arti |
|---|---|
| Belum mulai | Tim belum menyimpan laporan |
| `draft` | Leader/wakil sedang mengerjakan; guru dapat melihat progres |
| `submitted` | Laporan sudah dikirim dan menunggu guru |
| `needs_revision` | Guru meminta perbaikan; leader/wakil dapat mengedit kembali |
| `verified` | Laporan diterima; progres anggota diperbarui |

### Bagian laporan

- Predict
- Tools Used
- Trial 1
- Data
- Improve
- Trial 2
- Evidence
- Conclusion
- Model Limit
- Reflect
- Peran Anggota

Laporan mengutamakan teks dan data. Foto tidak wajib agar koneksi dan perangkat ringan tetap dapat digunakan.

### Penilaian guru

1. Buka **Progress Tim**.
2. Pilih kegiatan praktik.
3. Lihat status dan waktu pembaruan.
4. Buka isi laporan tim.
5. Pilih **Perlu perbaikan** atau **Terverifikasi**.
6. Isi nilai dan catatan.
7. Simpan penilaian.

Verifikasi tim diteruskan kepada anggota aktif tanpa menghapus rangkuman atau hasil kuis individual.

## 11. Sinyal pemahaman

Siswa dapat memilih:

- Konsep;
- Istilah;
- Hitungan;
- Cara praktik;
- Sudah paham.

Guru melihat jumlah sinyal pada unit yang dipilih. Sinyal:

- tidak memberi atau mengurangi nilai;
- tidak membuka materi;
- dapat diganti siswa;
- digunakan untuk menentukan bagian yang perlu dijelaskan ulang.

## 12. Pencetakan

### Ringkasan satu halaman

Berisi tujuan, rangkuman inti, contoh kontekstual, hubungan praktik bila tersedia, dan perintah catatan siswa. Ruang kosong pada halaman adalah normal karena desain menjaga ringkasan tetap satu halaman dan mudah dibaca.

### LKPD kosong

Cetak sebelum praktik agar tim dapat mencatat tanpa HP.

### Laporan terisi

Cetak setelah leader/wakil menyimpan data. Sistem memperbesar area teks saat pencetakan agar isi tidak terpotong.

### Kartu kontrol semester

Hanya dapat dicetak setelah seluruh materi dan tugas wajib pada semester tersebut tersedia dan selesai.

Gunakan ukuran A4 dan periksa pratinjau sebelum mencetak. Hasil harus tetap terbaca dalam grayscale.

## 13. Rutinitas guru

### Sebelum pelajaran

- tentukan submateri;
- buka pratinjau materi;
- gunakan Mode Tayangan bila menjelaskan melalui proyektor;
- siapkan buku, LKPD, alat, dan bahan;
- periksa sinyal pemahaman kelas sebelumnya.

### Saat pelajaran

- jelaskan tujuan;
- arahkan siswa membaca dan merangkum;
- periksa buku secara bertahap;
- gunakan dashboard untuk mencatat hasil pemeriksaan;
- lakukan praktik hanya setelah SOP dan alat siap.

### Setelah pelajaran

- periksa antrean rangkuman;
- lihat hasil kuis;
- lihat draft/submitted pada Progress Tim;
- beri catatan perbaikan;
- pastikan tidak ada perangkat bersama yang masih login.

## 14. Pembukaan manual

Fitur **Buka manual** digunakan hanya untuk penyesuaian yang disetujui guru, misalnya kebutuhan khusus atau pemulihan progres. Guru harus:

1. memilih siswa yang tepat;
2. menuliskan alasan;
3. memastikan aktivitas dan kelas benar;
4. menyimpan pembukaan manual.

Pembukaan manual tercatat pada audit log. Jangan menggunakannya untuk melewati proses seluruh kelas tanpa alasan pembelajaran.

## 15. Masalah umum

### `teacherCredentialConfig_ is not defined`

`Security.gs` belum tersedia sebagai file Script atau isinya belum lengkap. Buat file Script bernama `Security` dan salin isi lengkapnya. Jangan mereset kata sandi jika Script Properties masih ada.

### `Unexpected token '<'`

File `.gs` berisi tag HTML atau ditempel sebagai tipe yang salah. File seperti `LearningData.gs`, `LearningServices.gs`, `PracticeData.gs`, dan `Security.gs` harus dibuat sebagai **Script**, tanpa `<script>` atau pagar Markdown.

### Perubahan terlihat di `/dev` tetapi tidak di `/exec`

Versi deployment belum diperbarui. Buka **Deploy → Manage deployments → Edit → New version → Deploy**, kemudian refresh paksa atau gunakan mode samaran.

### Tombol Generate Science Teams nonaktif

Belum ada minimal delapan profil Mission 0 lengkap pada kelas tersebut. Nilai semua butir wajib untuk minimal delapan siswa.

### Quick Quiz tidak aktif

Rangkuman belum berstatus `verified`. Periksa antrean rangkuman guru.

### LKPD tidak aktif

Quick Quiz belum tuntas atau unit belum dibuka secara sah oleh guru.

### Materi berikutnya terkunci

Periksa rangkuman, kuis, dan praktik wajib unit sebelumnya.

### Draft berubah di perangkat lain

Leader atau wakil telah menyimpan versi lebih baru. Muat ulang LKPD, periksa perubahan, lalu lanjutkan.

### Anggota biasa tidak dapat mengetik laporan

Itu perilaku yang benar. Hanya leader dan wakil yang dapat mengubah satu laporan bersama.

### Ringkasan terlihat memiliki ruang kosong

Itu normal. Ringkasan sengaja dibatasi satu halaman, bukan salinan penuh materi.

## 16. Keamanan dan privasi

- Roster, PIN, nilai, dan profil siswa adalah data privat sekolah.
- Jangan mempublikasikan repository atau Spreadsheet.
- Jangan mengirim PIN melalui grup terbuka.
- Jangan menampilkan `PIN_ISSUANCE` melalui proyektor.
- Siswa harus keluar setelah memakai perangkat bersama.
- Guru tidak boleh membagikan kata sandi akun guru.
- Jangan menyalin nilai PIN mentah ke dokumentasi atau screenshot.
- Gunakan `active=false` untuk siswa tidak aktif; jangan menghapus riwayat.
- Nilai kuis dan status verifikasi hanya ditentukan server/guru.

## 17. Pembaruan dan deployment

Setelah mengubah source:

1. Salin file dengan tipe yang benar ke Apps Script.
2. Jangan mengubah Script Properties kecuali perubahan memang memerlukan konfigurasi.
3. Jalankan `runIntegrationChecks()`.
4. Pastikan log terakhir menunjukkan `hasil=SEMUA PASS`.
5. Deploy sebagai **New version** pada deployment yang sama agar URL `/exec` tetap konsisten.
6. Buka `/exec` dalam mode samaran.
7. Uji login guru dan siswa.
8. Uji alur yang berubah.

Tidak perlu menjalankan seed setiap kali tampilan atau panduan diubah. Seed hanya dijalankan ketika sumber konten sheet memang berubah dan prosedurnya telah disetujui.

### Perpindahan menu dan cache ringan

Jalur Belajar, Panduan Praktik, dan katalog pratinjau guru disimpan sementara selama akun yang sama masih masuk. Saat menu yang sama dibuka kembali, tampilan menggunakan data baca yang sudah tersedia sehingga tidak selalu menunggu Google Sheets. Cache progres siswa otomatis dibatalkan setelah pelaporan rangkuman, penyelesaian kuis, atau penyimpanan laporan praktik. Cache juga dibersihkan ketika pengguna keluar atau berganti akun.

Pembukaan pertama tetap dapat memerlukan waktu karena Apps Script harus membaca data dan kadang mengalami cold start. Indikator memuat ditampilkan sebelum Jalur Belajar selesai dibuka.

## 18. Checklist sebelum digunakan oleh seluruh kelas

- [ ] URL `/exec` terbaru dapat dibuka.
- [ ] Login guru berhasil.
- [ ] Login satu siswa dari setiap kelas berhasil.
- [ ] Tombol Keluar bekerja.
- [ ] Materi dan ilustrasi tampil pada HP serta laptop.
- [ ] Ringkasan A4 tercetak dengan benar.
- [ ] Pelaporan rangkuman muncul di dashboard guru.
- [ ] Quick Quiz dapat dimulai setelah verifikasi.
- [ ] Sinyal pemahaman muncul pada rekap guru.
- [ ] Minimal 8 Mission 0 dinilai sebelum tim dibuat.
- [ ] Leader, wakil, dan anggota biasa diuji setelah tim terbentuk.
- [ ] Draft, submit, revisi, dan verifikasi laporan diuji.
- [ ] LKPD kosong dan laporan terisi diuji cetak.
- [ ] Kartu kontrol yang belum memenuhi syarat tetap terkunci.
- [ ] Guru memiliki salinan privat daftar PIN.

## 19. Batas verifikasi saat ini

Yang sudah terbukti pada Web App aktif:

- login dan navigasi peran;
- tombol keluar;
- materi, rangkuman, glosarium, sumber, dan pengayaan;
- ringkasan satu halaman dan hasil cetak;
- tombol pelaporan rangkuman;
- indikator tahapan;
- sinyal pemahaman siswa dan agregasinya pada dashboard guru.

Yang sudah lolos pemeriksaan sumber/simulasi tetapi menunggu tim nyata:

- generate tim setelah profil cukup;
- pengisian oleh leader/wakil;
- tampilan baca-saja anggota biasa;
- konflik versi draft;
- submit, revisi, dan verifikasi laporan pada Web App;
- cetak laporan tim terisi.

Keterbatasan ini tidak menghalangi sosialisasi atau dimulainya materi. Fitur tim dapat diverifikasi ketika siswa menyelesaikan Mission 0 secara alami.

## 20. Peta dokumentasi teknis

| Dokumen/file | Fungsi |
|---|---|
| `README.md` | Pintu masuk proyek |
| `docs/README.md` | Katalog master dokumentasi |
| `docs/operations/WIKI_OPERASIONAL.md` | Pedoman guru dan penggunaan harian |
| `docs/architecture/CONTENT_STANDARD.md` | Standar isi materi dan praktik |
| `docs/operations/INTEGRATION_CHECKLIST.md` | Pemeriksaan regresi & integrasi |
| `docs/architecture/SCHEMA.md` | Struktur dan kepemilikan data |
| `docs/deployment/PANDUAN_MIGRASI_VPS.md` | Panduan instalasi VPS |
| `gas/README.md` | Instalasi dan deployment Apps Script |
| `gas/LearningData.gs` | Sumber materi dan kuis |
| `gas/PracticeData.gs` | SOP dan katalog praktik |
| `gas/LearningServices.gs` | Progres, kuis, pemeriksaan, dan laporan tim |
| `gas/Security.gs` | Kredensial, PIN, sesi, dan otorisasi kelas |
| `gas/Tests.gs` | Pemeriksaan integrasi |

## 21. Sistem Gamifikasi (Lencana/Achievement)

Web App ini dilengkapi dengan sistem Lencana (Badges) yang dirancang untuk memotivasi siswa layaknya permainan peran (RPG). Seluruh perolehan lencana berjalan secara otomatis di sisi sistem setiap kali siswa masuk atau merekam progres. Fitur pamer lencana berbentuk gambar persegi ("Share Card") juga menggunakan *HTML5 Canvas* murni tanpa membebani server Google.

### Daftar Lengkap Lencana dan Cara Mendapatkannya

#### A. Lencana Diagnostik (Misi 0)
- ?? **Master of Logic**: Menyelesaikan Mission 0 dengan tingkat Readiness "Tinggi".
- ?? **Curious Observer**: Menyelesaikan Mission 0 (diberikan kepada semua siswa).

#### B. Lencana Pembelajaran Tiap Bab
- ?? **Scholar of [Bab]**: Menyelesaikan dan mengirim Rangkuman (Aktivitas Pembelajaran).
- ?? **Lab Researcher [Bab]**: Selesai praktikum (Selesai mengisi LKPD Kelompok / Experiment).

#### C. Lencana Kuis (Ujian Cepat)
Diberikan berdasarkan skor yang diraih saat kuis diselesaikan:
- ?? **Diamond Mind**: Skor Sempurna (100).
- ?? **Gold Mind**: Skor memuaskan (90 - 99).
- ?? **Silver Mind**: Skor cukup baik (80 - 89).
- ?? **Bronze Mind**: Skor (70 - 79).

#### D. Lencana Ketekunan (Jumlah Misi Selesai)
Misi adalah jumlah keseluruhan aktivitas (Pembelajaran, Praktikum, atau Kuis).
- ?? **First Blood**: Menyelesaikan **1** misi pertama.
- ?? **Streak Master**: Menyelesaikan **3** misi.
- ?? **Hyperdrive**: Menyelesaikan **7** misi.
- ?? **Galaxy Explorer**: Menyelesaikan **15** misi.

#### E. Lencana Spesial & Easter Egg
- ?? **Flawless Crown**: Mendapatkan skor sempurna (100) di **3 kuis berbeda**.
- ?? **Night Owl**: Belajar atau merekam misi di waktu dini/malam hari (antara jam 18:00 hingga 04:00).
- ?? **Cybernetic Enhancer (Sanksi / Honeypot)**: Tertangkap basah oleh sistem melakukan pindah tab > 2x selama ujian, atau memberikan jawaban hasil salinan penuh dari bot AI yang tidak di-filter oleh siswa.

#### F. Lencana Legendaris (Tingkat Tersulit)
*Syarat Mutlak: Lencana ini otomatis hangus (tidak akan pernah bisa diraih seumur hidup) jika siswa sudah pernah mendapat lencana Sanksi AI (Cybernetic Enhancer).*
- ?? **Concept Architect**: Mengerjakan minimal 4 kuis, dan **semua** nilainya di atas 90. Konsisten memahami konsep.
- ??? **The Untouchable**: Mendapatkan skor sempurna (100) di **4 kuis berbeda** murni menggunakan tenaga sendiri tanpa bantuan AI/Curang.
- ????? **October Sprinter**: Ambisius. Menyelesaikan **10+ misi** bahkan sebelum bulan November dimulai.
- ?? **The Phoenix**: Sempat terjatuh mendapat skor < 70, namun berhasil bangkit dengan mendapat nilai istimewa >= 90 di kuis yang lain.

#### G. Lencana Meta (Gelar Kolektor)
Otomatis berevolusi seiring dengan banyaknya koleksi lencana milik siswa.
- ?? **Novice Collector**: Mengumpulkan 5 Lencana.
- ?? **Pro Collector**: Mengumpulkan 10 Lencana.
- ?? **Elite Collector**: Mengumpulkan 15 Lencana.
- ?? **Legendary Collector**: Sang Suhu! Mengumpulkan 20 Lencana. *Note: Mencapai posisi Elite/Legendary Collector atau mendapatkan lencana The Untouchable/Phoenix otomatis membuat teks Nama Siswa di dasbor bersinar menyesuaikan warna Lencana Tertinggi mereka.*

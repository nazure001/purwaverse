# Purwaverse IPA Kelas VIII - MVP

MVP Google Apps Script + Google Sheets untuk pembelajaran IPA kelas VIII yang ringan, mobile-first, dan tetap memiliki jalur cetak.

Dokumen ini berfokus pada instalasi teknis. Untuk penggunaan harian, sosialisasi siswa, Mission 0, pembentukan tim, praktik, penilaian, pencetakan, dan pemecahan masalah, baca [`docs/WIKI_OPERASIONAL.md`](../docs/WIKI_OPERASIONAL.md).

## Status sumber data

- Roster resmi 8A-8E sudah dinormalisasi: 40 + 42 + 42 + 42 + 41 = 207 siswa.
- Mission 0 memakai 12 butir resmi: O 1/5, E 8/9/24, M 3/13, S 12/22, dan T 10/21/28.
- Enam pernyataan Peta Diri Sains dan jangkar/rubrik 0-4 berasal dari booklet serta panduan v2.
- `RosterData.gs` mengandung data pribadi siswa. Simpan proyek dan spreadsheet sebagai aset privat sekolah; jangan publikasikan source code atau sheet PIN.

## Menjalankan

1. Buat Google Spreadsheet kosong.
2. Buat proyek Apps Script yang terikat ke spreadsheet tersebut.
3. Salin semua file dalam folder `gas/` ke proyek Apps Script.
4. Jalankan `initializeTeacherAccount()` satu kali dari editor Apps Script. Buka **Log eksekusi**, lalu salin nama pengguna dan kata sandi sementara yang ditampilkan. Ini sekaligus membuat pepper privat sebelum PIN siswa di-hash. Kata sandi tidak ditulis ke source dan fungsi ini tidak menimpa akun yang sudah ada. Jika kata sandi hilang, jalankan `resetTeacherAccountPassword()` dan gunakan kata sandi baru dari Log eksekusi.
5. Jalankan `setupPurwaverse()` sekali dari editor Apps Script pada salinan Spreadsheet.
6. Jalankan `runIntegrationChecks()` dan pastikan seluruh pemeriksaan lulus.
7. Ambil PIN awal dari sheet tersembunyi `PIN_ISSUANCE`, distribusikan secara privat, lalu sembunyikan kembali.
8. Setelah verifikasi salinan selesai, jalankan `migrateStudentPinHashesToPepper()` satu kali pada target yang disetujui.
9. Deploy sebagai versi Web App baru dan uji URL baru sebelum mengganti versi lama.

## Kartu kredensial siswa dengan QR

Tambahkan `CredentialCards.gs` sebagai file **Script**. Generator membaca PIN langsung dari sheet privat dan menghasilkan PDF per kelas di folder Drive privat; QR hanya memuat URL `/exec`, bukan nama atau PIN. Tata letak cetak memuat **10 kartu per halaman A4 (2 kolom x 5 baris)** dengan QR berukuran besar agar mudah dipindai.

1. Buka **Project Settings → Script Properties → Add script property**, lalu simpan:

   - Property: `PURWAVERSE_EXEC_URL`
   - Value: URL lengkap `https://script.google.com/macros/s/DEPLOYMENT_ID/exec`

2. Buat PDF per kelas agar risiko timeout kecil:

   `generateCredentialCards8A()`

   Lanjutkan dengan `generateCredentialCards8B()` sampai `generateCredentialCards8E()`.

3. Buka **Log eksekusi** atau nilai hasil fungsi untuk menemukan folder/file Drive.
4. Pastikan akses folder tetap **Dibatasi**. Jangan membagikan folder; cetak lalu berikan satu kartu kepada siswa yang namanya tercantum.

`generateAllStudentCredentialPdfs()` tersedia untuk membuat semua kelas sekaligus, tetapi fungsi per kelas lebih aman terhadap batas waktu Apps Script. Pembuatan QR menggunakan QuickChart dan hanya mengirim alamat Web App publik ke layanan tersebut.

## Kontrak utama

`UI -> ApiRouter -> Auth/Progress/Diagnostic/Team services -> SheetRepository -> Google Sheets -> dashboard/report`

Data roster tidak dihapus permanen; gunakan `active=false`. Pemeriksaan guru disimpan sebagai revisi append-only. Nilai kuis dihitung server-side dan siswa tidak berhak mengirim nilai sendiri.

Urutan soal dan pilihan jawaban Quick Quiz diacak secara deterministik per siswa/percobaan, sedangkan penilaian tetap memakai ID dan indeks asli di server. Kelulusan terbaik dipertahankan sebagai mastery meskipun percobaan berikutnya lebih rendah. Seed konten menonaktifkan soal aktif yang sudah tidak ada di sumber tanpa menghapus riwayat, dan pemeriksaan integrasi membandingkan isi sheet dengan sumber secara tepat.

## Jalur belajar

`materi -> rangkuman di buku dilaporkan siswa -> diperiksa guru -> quick quiz otomatis -> LKPD/praktik -> verifikasi guru -> submateri berikutnya`

Kecepatan setiap siswa dapat berbeda. Challenge bersifat tambahan. Kartu kontrol hanya tersedia pada akhir semester setelah seluruh materi dan tugas wajib pada semester tersebut tersedia serta selesai.

Siswa menekan **Saya sudah merangkum di buku** setelah catatan selesai. Tombol ini hanya memasukkan siswa ke antrean pemeriksaan dan tidak memberi nilai atau membuka kuis. Guru tetap memeriksa buku fisik lalu memilih `verified` atau `needs_revision` pada dashboard.

Verifikasi praktik tim berstatus `verified` atau `needs_revision` diteruskan menjadi revisi pemeriksaan praktik untuk setiap anggota aktif tim. Rangkuman dan kuis tetap dicatat per siswa, sehingga kecepatan progres individual tetap dapat berbeda.

Menu **Panduan Praktik & LKPD** memuat SOP, pembagian peran, contoh eksperimen berhasil, contoh laporan terisi, serta katalog eksperimen kontekstual. LKPD spesifik unit dapat dilihat dan dicetak semua anggota setelah kuis tuntas. Hanya `Scientist Leader` atau `Deputy Scientist Leader` yang dapat menyimpan draft dan mengirim satu laporan untuk tim; leader dapat mengerjakannya dari rumah dan wakil dipilih otomatis dari urutan profil diagnostik. Foto tidak diwajibkan. Laporan memakai teks dan data agar tetap ringan, dan penilaian guru tidak menimpa isi laporan siswa.

Setiap praktik mempunyai misi, konteks, waktu fleksibel, alat utama, alternatif sederhana, keselamatan, langkah, kolom data, kriteria berhasil, serta hubungan bukti dengan materi. Penyesuaian alat oleh guru diperbolehkan selama tujuan, keselamatan, dan data yang dicari tetap terjaga.

CP/ATP menentukan konsep dan keterampilan yang wajib tampil; buku pemerintah/BSE serta literatur resmi melengkapi kedalaman materi tanpa mengubah urutan bab guru. Seluruh 21 submateri memuat minimal enam bagian uraian, tujuan belajar, contoh kontekstual, koreksi miskonsepsi, rangkuman inti, istilah penting, panduan catatan buku, pengayaan opsional yang tidak memengaruhi progres, serta literatur sampai judul, bab, dan halaman. Standar dan matriks cakupan seluruh bab dicatat dalam `docs/CONTENT_STANDARD.md`. Ilustrasi SVG digambar ulang, diberi label dan keterangan, serta tidak diklaim sebagai salinan gambar buku. Akun guru mempunyai **Pratinjau Materi** untuk membaca semua unit tanpa membuka kunci siswa serta tanpa membuat progres atau percobaan kuis.

Menu utama mengikuti peran yang sedang masuk. Akun guru melihat **Dashboard Guru** dan **Pratinjau Materi**, sedangkan akun siswa melihat **Jalur Belajar** dan **LKPD**.

## Struktur sheet

Lihat `docs/SCHEMA.md`. Header dibuat otomatis oleh `setupPurwaverse()`.

## Verifikasi

`runIntegrationChecks()` memeriksa schema, roster, sumber Mission 0, identitas siswa, bank kuis, kelengkapan isi/ilustrasi materi, cakupan CP seluruh bab, nutrisi Bab 2, katalog praktik, alur laporan tim, jalur materi, serta validitas profil. Karena ada file baru `PracticeData.gs`, pastikan file tersebut dibuat sebagai **Script `.gs`**, bukan HTML. Pemeriksaan source tidak membuktikan login, deployment, browser, perangkat, atau Spreadsheet aktif; semua itu tetap harus diuji pada salinan sebelum produksi.

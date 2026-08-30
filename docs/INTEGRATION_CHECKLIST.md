# Checklist integrasi dan regresi

Setelah setiap fix, periksa rantai yang terdampak:

1. UI publik hanya menampilkan pengantar; jalur pribadi, nilai, dan LKPD terkunci memerlukan login siswa.
2. Login kelas + nomor absen + PIN hanya menemukan siswa aktif pada kelas yang tepat.
3. Session refresh tidak mengubah identitas siswa.
4. Submit aktivitas memakai `student_id + activity_id`, sehingga retry tidak menggandakan progress.
5. Submit Mission 0 menghasilkan response, profil lima domain, leader index, dan research readiness.
6. Team builder membaca profil terbaru, membuat ukuran tim seimbang, satu leader per tim bila kandidat mencukupi, dan menghormati lock/teacher override.
7. Hasil LAB kelompok tampil pada dashboard kelas; status `verified` atau `needs_revision` membuat revisi pemeriksaan praktik untuk setiap anggota aktif, tanpa menimpa rangkuman atau kuis individual.
8. Penggantian judul aktivitas tidak mengubah `activity_id` atau memutus riwayat.
9. Siswa nonaktif tidak dapat membuat data baru, tetapi riwayat lama tetap ada.
10. Dashboard/report hanya membaca data kelas yang diminta setelah otorisasi guru.
11. Jawaban Mission 0 tidak pernah dinilai oleh siswa sendiri; guru memberi level 0-4 dari jangkar resmi.
12. `PIN_ISSUANCE` tetap tersembunyi dan source yang mengandung roster tidak dipublikasikan.
13. Siswa tidak dapat mengirim nilai atau status `verified` melalui API siswa.
14. Quick Quiz hanya terbuka setelah rangkuman berstatus `verified` oleh guru.
15. Kunci kuis tidak pernah dikirim ke browser; soal dan pilihan diacak per siswa/percobaan, penilaian dilakukan di server, dan umpan balik hanya menyebut konsep yang perlu ditinjau.
16. LKPD praktik hanya terbuka setelah kuis mencapai nilai minimum.
17. Materi berikutnya hanya terbuka jika kewajiban unit sebelumnya selesai atau ada override guru tercatat.
18. Bulk pemeriksaan guru hanya memengaruhi siswa aktif pada kelas yang dipilih dan membuat revisi baru.
19. Kartu kontrol memakai `CURRENT_SEMESTER` dan tetap terkunci sampai seluruh bab yang direncanakan serta kewajiban semester tersedia dan selesai.
20. Generate tim berulang mengembalikan draft aktif dan tidak menggandakan tim.
21. Pratinjau materi guru dapat membuka seluruh unit tanpa menulis `PROGRESS`, `TEACHER_CHECKS`, `QUIZ_ATTEMPTS`, atau `QUIZ_RESPONSES`.
22. Setiap unit menampilkan sumber pengembangan dan diagramnya tetap terbaca pada layar kecil serta hasil cetak grayscale.
23. Navigasi mengikuti peran aktif: guru menuju Dashboard/Pratinjau Materi, siswa menuju dashboard/jalur pribadi, dan pengguna publik menuju login.
24. `QUIZ_ITEMS` aktif identik dengan sumber lokal; butir lama boleh tetap tersimpan hanya dengan `active=false`.
25. Percobaan ulang yang gagal tidak menghapus status mastery dari percobaan lulus sebelumnya.
26. Tombol laporan rangkuman hanya membuat status `pending_review` untuk siswa yang sedang login; status tersebut tidak membuka kuis sebelum guru memilih `verified`.
27. Dashboard guru membedakan siswa yang belum melapor, menunggu pemeriksaan, perlu perbaikan, dan terverifikasi.
28. Semua unit yang memiliki `practice_activity_id` mempunyai katalog praktik spesifik: konteks, alat utama, alternatif, keselamatan, metode, data, dan kriteria berhasil.
29. Semua anggota tim dapat membaca/mencetak LKPD, tetapi hanya Scientist Leader atau Deputy Scientist Leader tim aktif yang dapat menyimpan dan mengirim laporan.
30. Penyimpanan draft memakai versi terakhir; dua perangkat tidak boleh saling menimpa tanpa memuat ulang.
31. Status `draft`, `submitted`, `needs_revision`, dan `verified` terlihat pada Progress Tim guru, beserta isi inti laporan tanpa membuka data kelas lain.
32. Penilaian guru menggabungkan metadata penilaian tanpa menghapus `report` yang dibuat siswa.
33. Sinyal “masih bingung” hanya dihitung per unit/kelas, tidak membuka materi, tidak memberi nilai, dan dapat diganti menjadi “sudah paham”.
34. Mode tayangan dan ringkasan cetak tidak menulis progres atau percobaan kuis.

Verifikasi manual wajib sebelum produksi: Android kelas bawah, laptop low-spec, jaringan lambat, print A4/grayscale (LKPD kosong dan terisi), refresh setelah simpan draft/kirim, dua perangkat leader-wakil, anggota biasa mencoba mengedit, salah PIN, kelas salah, duplicate submit, input offline oleh guru, rangkuman perlu perbaikan, retry kuis, override akses, dan kartu semester yang belum memenuhi syarat.

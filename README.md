# Purwaverse IPA VIII

Purwaverse IPA VIII adalah Web App Google Apps Script + Google Sheets untuk pembelajaran IPA kelas VIII yang menggabungkan materi, rangkuman buku tulis, Quick Quiz, praktik tim, LKPD cetak, dan pemeriksaan guru.

## Status penggunaan

**Dapat digunakan untuk sosialisasi dan pembelajaran awal.** Pemeriksaan integrasi sumber dan sheet telah menghasilkan `SEMUA PASS`. Smoke test Web App telah membuktikan login siswa/guru, navigasi peran, materi, glosarium, ringkasan cetak, pelaporan rangkuman, sinyal pemahaman, dan rekap sinyal guru.

Alur praktik tim akan aktif setelah minimal delapan profil Mission 0 pada suatu kelas selesai dinilai dan tim dibuat. Alur leader/wakil sudah lolos pengujian lokal, tetapi verifikasi langsung Web App untuk draft dan pengiriman laporan menunggu tim nyata terbentuk.

## Dokumentasi utama

- [Wiki dan SOP Operasional](docs/WIKI_OPERASIONAL.md)
- [Standar Konten Materi](docs/CONTENT_STANDARD.md)
- [Checklist Integrasi dan Regresi](docs/INTEGRATION_CHECKLIST.md)
- [Schema Google Sheets](docs/SCHEMA.md)
- [Petunjuk Teknis Apps Script](gas/README.md)

## Alur belajar

`materi → rangkuman di buku → pemeriksaan guru → Quick Quiz → praktik/LKPD → verifikasi guru → materi berikutnya`

- Progres setiap siswa dapat berbeda.
- Rangkuman tetap ditulis di buku.
- Kuis dinilai otomatis oleh server.
- Praktik dilaksanakan secara tim dengan alat sederhana.
- Challenge tambahan tidak mengunci jalur utama.
- Kartu kontrol baru tersedia setelah seluruh kewajiban semester selesai.

## Mulai menggunakan

1. Guru melakukan sosialisasi singkat dan membagikan identitas login/PIN secara privat.
2. Siswa login, membaca materi, dan merangkum di buku.
3. Siswa menekan **Saya sudah merangkum di buku**.
4. Guru memeriksa buku dan mencatat nilai/status pada dashboard.
5. Siswa mengerjakan Quick Quiz.
6. Setelah Mission 0 cukup, guru membuat Science Team.
7. Praktik dibuka sesuai progres materi dan laporan diisi leader atau wakil.

Jangan mempublikasikan source, Spreadsheet, PIN, roster, atau URL administrasi guru secara terbuka.

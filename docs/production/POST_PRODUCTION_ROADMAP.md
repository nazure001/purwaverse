# PURWAVERSE LMS — POST-PRODUCTION IMPROVEMENT ROADMAP

**Dokumen:** `docs/production/POST_PRODUCTION_ROADMAP.md`  
**Fase:** Post-Deployment Improvement Roadmap (Fase 6)  
**Status Roadmap:** `FROZEN BACKLOG` (Hanya Dicatat, Dilarang Dikerjakan Sebelum Produksi Stabil)  
**Prinsip Utama:** Perubahan non-fundamental hanya boleh dilakukan setelah deployment produksi dan berdasarkan umpan balik nyata di lapangan (*real classroom feedback*).  

---

## 1. Filosofi & Batasan Pengerjaan Roadmap

Untuk menghindari jebakan *"polishing tanpa batas"* (*endless polishing trap*), seluruh usulan fitur tambahan, perbaikan kosmetik, dan peningkatan alur kerja dialokasikan ke dalam daftar cadangan (*backlog*) terstruktur.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKLOG EXECUTION GATE                          │
├───────────────────┬────────────────────────────────────────────────────┤
│ STATUS FASE INI   │ FROZEN / LOCKED FOR PRODUCTION RELEASE             │
│ SYARAT PENGERJAAN │ Produksi telah aktif minimal 14 hari KBM nyata,    │
│                   │ 0 insiden P0/P1, dan izin tertulis dari Controller.│
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 2. Rincian Kategori Prioritas Roadmap

```text
  ┌──────────────────────────────────────────────────────────────────┐
  │ [P0 CRITICAL]    Masalah Keamanan, Korupsi Data, Kegagalan Login │
  ├──────────────────────────────────────────────────────────────────┤
  │ [P1 IMPORTANT]   Alur Kerja Guru, Aksesibilitas, Responsivitas   │
  ├──────────────────────────────────────────────────────────────────┤
  │ [P2 ENHANCEMENT] Animasi UI, Gamifikasi Lanjut, Dashboard Baru   │
  └──────────────────────────────────────────────────────────────────┘
```

---

### Priority 0 — Kritis & Pencegahan Insiden (Critical)
*Fokus: Stabilitas hidup, integritas nilai, dan proteksi kredensial.*

| ID | Inisiatif / Masalah | Justifikasi & Dampak | Estimasi Kompleksitas |
|---|---|---|---|
| **P0-1** | **Hotfix Keamanan Mendesak:** Patch terhadap CVE yang mungkin ditemukan pada dependensi upstream (Node.js/Express). | Mencegah eksploitasi server atau unauthorized remote execution. | Minimal |
| **P0-2** | **Pencegahan Korupsi Data:** Skrip auto-recovery jika transaksi WAL terputus mendadak akibat *power failure* server. | Melindungi data nilai dan presensi 207 siswa sekolah. | Sedang |
| **P0-3** | **Mitigasi Kegagalan Login Massal:** Optimasi batas connection pool jika 200+ siswa login bersamaan dalam 1 menit. | Menghindari timeout HTTP saat jam pertama KBM serentak. | Sedang |

---

### Priority 1 — Peningkatan Alur Kerja & Pengalaman Guru (Important)
*Fokus: Kemudahan operasional guru di kelas dan kenyamanan siswa saat menggunakan ragam perangkat.*

| ID | Inisiatif / Fitur | Justifikasi & Dampak | Estimasi Kompleksitas |
|---|---|---|---|
| **P1-1** | **Ekspor Rapor & Rekap Nilai Otomatis:** Tombol unduh rekap nilai per rombel ke format Excel (`.xlsx`) langsung dari portal guru. | Menghemat waktu administrasi guru dalam memasukkan nilai ke e-Rapor sekolah. | Sedang |
| **P1-2** | **Penanganan Mi Browser Fallback:** Menyediakan halaman panduan ramah pengguna yang mendeteksi Mi Browser dan menyarankan pembukaan langsung di Chrome Mobile via deep-link intent. | Mengurangi kebingungan siswa pengguna gawai Xiaomi. | Rendah |
| **P1-3** | **Verifikasi Cepat Rangkuman Guru (*Bulk Approval*):** Tombol setujui sekaligus (*approve all*) untuk rangkuman siswa yang telah memenuhi standar penilaian rubrik. | Mempercepat alur verifikasi guru saat menangani 40 siswa per kelas. | Sedang |
| **P1-4** | **Filter & Pencarian Siswa di Portal Guru:** Pencarian instan berdasarkan NIS atau nama pada tabel presensi dan nilai. | Memudahkan pengecekan siswa tertentu di kelas besar. | Rendah |

---

### Priority 2 — Penyempurnaan Kosmetik & Kenyamanan (Enhancement)
*Fokus: Estetika visual, gamifikasi interaktif, dan fitur pelengkap.*

| ID | Inisiatif / Fitur | Justifikasi & Dampak | Estimasi Kompleksitas |
|---|---|---|---|
| **P2-1** | **Gamifikasi Badge V2:** Koleksi lencana digital dinamis berdasarkan kecepatan pengerjaan kuis dan ketelitian praktikum. | Meningkatkan motivasi dan keterlibatan emosional siswa dalam KBM sains. | Besar |
| **P2-2** | **Animasi & Transisi Blueprint Halus:** Efek suara mekanis halus dan transisi roda gigi bergerak saat membuka submateri baru. | Memperkaya estetika *steampunk/industrial blueprint*. | Sedang |
| **P2-3** | **Modul Ensiklopedia PurwaWiki:** Glosarium istilah biologi terintegrasi dengan pencarian konsep instan dari teks bacaan. | Membantu literasi sains mandiri bagi siswa OSN dan pengayaan. | Besar |
| **P2-4** | **Perluasan Multi-Grade (Kelas VII & IX):** Pengimporan silabus dan bank soal untuk jenjang Kelas 7 dan Kelas 9 IPA Fase D. | Skalabilitas platform ke seluruh jenjang SMP. | Sangat Besar |

---

## 3. Tata Kelola Evaluasi Pasca-Produksi

Setiap inisiatif dari tabel di atas hanya dapat diangkat ke tahap implementasi (*development sprint*) melalui prosedur:
1. Pengajuan tiket *Issue Request* dengan melampirkan bukti kendala nyata di kelas.
2. Penilaian dampak risiko (*risk assessment*) oleh Principal Architect / Controller.
3. Alokasi ke cabang rilis terpisah (*feature branch*), wajib lulus `npm test` 100%, dan melalui staging rehearsal sebelum digabung ke `main`.

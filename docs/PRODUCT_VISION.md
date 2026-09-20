# 🧭 PURWAVERSE PRODUCT VISION & CORE PHILOSOPHY
**Evidence-Based Scientific Learning Engine: Connecting Real-World Inquiry with Competency**

> *"Nilai pembeda Purwaverse bukan terletak pada framework, database, atau tampilan antarmukanya. Nilai utamanya berakar kuat pada konsep: **Evidence-based learning system yang menghubungkan aktivitas nyata siswa dengan pencapaian kompetensi**."*

Dokumen ini disusun sebagai panduan filosofis fundamental bagi seluruh software architect, developer, pengajar, dan AI agent yang berkontribusi pada repositori ini. Setiap keputusan desain sistem, arsitektur database, dan penambahan fitur wajib tunduk pada filosofi yang tertulis di sini.

---

## 1. Prinsip Utama (Core Principle)

### 💡 *Technology Supports Learning. Technology Does Not Replace Learning.*

Purwaverse **BUKAN** dibuat sebagai platform adiktif yang dirancang untuk memperlama waktu siswa menatap layar ponsel (*screen-time maximization*). Sebaliknya, Purwaverse adalah Learning Management System (LMS) yang memanfaatkan komputasi modern untuk **memperkuat pembelajaran nyata di kelas dan laboratorium**.

```
                           AKTIVITAS UTAMA SISWA (DUNIA NYATA)
                 ┌────────────────────────────────────────────────────────┐
                 │  1. Memahami konsep sains secara mendalam               │
                 │  2. Menulis rangkuman konsep di buku catatan fisik     │
                 │  3. Melakukan penyelidikan & eksperimen nyata di lab   │
                 │  4. Berdiskusi dan berkolaborasi dalam tim heterogen   │
                 │  5. Menghasilkan karya, data asli uji coba, & laporan  │
                 │  6. Mengalami perkembangan kompetensi & karakter       │
                 └───────────────────────────┬────────────────────────────┘
                                             │
                                     DIPERKUAT OLEH:
                                             │
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │                PERAN PERANGKAT (HP / PC)               │
                 │  • Mengakses instruksi belajar & petunjuk praktikum    │
                 │  • Dokumentasi aktivitas & pengumpulan bukti (evidence)│
                 │  • Sinyal kesulitan privat (*confusion signal*)        │
                 │  • Pemantauan capaian progres & refleksi diri          │
                 │  • Menerima umpan balik (*feedback*) dari guru         │
                 └────────────────────────────────────────────────────────┘
```

**Batasan Perangkat:**  
Gawai (smartphone/laptop) hanya berfungsi sebagai alat bantu pendukung (*support tool*), **bukan sebagai pengganti proses belajar yang sesungguhnya**.

---

## 2. Paradigma Alur Belajar: Menolak Pola Instan

Purwaverse secara tegas membedakan dirinya dari platform kuis instan komersial:

### ❌ Anti-Pattern (Yang Ditolak Purwaverse):
```
Materi Ringkas ──► Scrolling Cepat ──► Tebak Kuis (Trial-Error) ──► Kejar Skor Tinggi
```
*Dampak buruk: Memicu copy-paste, penggunaan AI untuk bypass jawaban, kebiasaan jalan pintas, dan pemahaman konsep yang dangkal.*

###  Alur Saintifik Otentik Purwaverse (Yang Wajib Dijaga):
```
Materi & Teori Mendalam
         │
         ▼
Aktivitas Belajar Mandiri
         │
         ▼
Rangkuman Bermakna di Buku Tulis Fisik
         │
         ▼
Validasi Manual oleh Guru (Human-in-the-Loop)
         │
         ▼
Gerbang Quiz Chamber (KKM 70, HOTS, Deterministik)
         │
         ▼
Penugasan & Praktik Tim Lab Nyata (LKPD Heterogen)
         │
         ▼
Pengumpulan Data Asli & Bukti Eksperimen (Evidence)
         │
         ▼
Pencapaian Kompetensi & Pertumbuhan Karakter
```

---

## 3. Hierarki Nilai & Prioritas Fitur

Saat merancang, mengaudit, atau memigrasikan fitur, gunakan urutan prioritas nilai berikut:

1. **Learning Activity (Aktivitas Belajar Mandiri):** Bahan bacaan sains komprehensif, multi-bagian, dilengkapi konteks nyata dan pelurus miskonsepsi.
2. **LKPD / Lab Assignment (Tugas Praktikum Tim):** Penyelidikan kelompok yang membagi peran spesifik (*Scientist Leader, Lab Operator, Data Recorder, Evidence Checker*) untuk menuntaskan masalah *free-rider*.
3. **Evidence Submission (Pengumpulan Bukti Nyata):** Verifikasi bahwa siswa benar-benar menulis catatan tangan di buku fisik dan mencatat data asli hasil percobaan (bukan rekayasa angka).
4. **Teacher Verification (Validasi Guru):** Antrean pemeriksaan guru untuk memastikan siswa siap sebelum melangkah ke tahap pengujian.
5. **Student Progress Tracking:** Pelacakan ketuntasan unit secara bertahap dan transparan.
6. **Teacher Learning Insight:** Analitik kelas yang memetakan pola miskonsepsi siswa untuk intervensi pedagogis tatap muka langsung.

> **Catatan Kritis:** Kuis (*Quiz Chamber*) adalah instrumen konfirmasi pemahaman yang penting, **tetapi BUKAN satu-satunya indikator keberhasilan belajar**. Nilai kuis tidak boleh mengerdilkan proses pembuatan rangkuman fisik dan praktikum laboratorium.

---

## 4. Peran Sentral Guru (Human-in-the-Loop)

Guru adalah pusat validasi dan arsitek pengalaman belajar di kelas.

* **Sistem Boleh Membantu:** Merangkum progres kelas, mendeteksi sinyal kebingungan (*confusion signals*), mengelompokkan siswa secara komputasional (*Snake Draft + 2-Opt*), dan menyajikan visualisasi miskonsepsi per bab.
* **Sistem TIDAK Boleh:** Mengambil alih hak prerogatif guru dalam menilai pemahaman konsep, menggantikan validasi buku catatan dengan centang otomatis bot, atau memutus interaksi pedagogis guru-siswa.

---

## 5. Batasan & Koridor Pengembangan Masa Depan

Apabila di masa depan Purwaverse dikembangkan untuk mencakup:
* **Multi-Curriculum** (Fase D: Kelas 7, 8, 9; Kelas Rombel A s.d. K; serta jalur Olimpiade & Riset),
* **PurwaWiki** (Ensiklopedia sains terbuka publik),
* **Knowledge / Concept Mapping** (Keterhubungan konsep sains spiral antar-jenjang),
* **Learning Analytics & Machine Learning**,

Maka seluruh penambahan tersebut **wajib bermuara pada satu tolok ukur**:

> *"Apakah fitur ini membantu siswa dan guru belajar lebih baik di dunia nyata, atau justru membuat mereka semakin tergantung pada aplikasi?"*

Jika suatu fitur membuat siswa lebih lama scrolling tanpa menghasilkan catatan, karya, atau keterampilan berpikir nyata, maka fitur tersebut **berlawanan dengan visi Purwaverse dan tidak boleh diimplementasikan**.

---

## 6. Checkpoint Invariant Migrasi VPS

Sebelum merilis (*deploy*) sistem ke server produksi VPS, verifikasi invariant berikut:

- [ ] **Histori Belajar Terjaga:** Migrasi database tidak menghilangkan riwayat belajar siswa.
- [ ] **Progres Legacy GAS Terbawa:** Seluruh progres kelulusan unit dan riwayat kuis dari Google Sheets berhasil dipetakan ke SQLite.
- [ ] **LKPD & Rangkuman Buku Tetap Menjadi Gerbang Utama:** Alur *Summary Review -> Teacher Check -> Quiz Chamber -> Group Lab* tidak boleh dipangkas.
- [ ] **Teacher Command Center Berfungsi Penuh:** Guru memiliki kendali penuh untuk memeriksa antrean, memberi catatan revisi, dan melihat insight kelas.
- [ ] **Kapasitas Rombel Fleksibel:** Arsitektur database dan antarmuka mampu menampung rombel besar dari kelas A hingga K (misal `8A` s.d. `8K`) tanpa batasan kaku.
- [ ] **Nir-Chatbot:** Tidak ada bot/AI tutor yang disisipkan ke dalam jalur belajar KBM yang menggantikan usaha membaca, mencatat, dan bertanya kepada guru.

---
*Dokumen ini merupakan bagian dari standar arsitektur Purwaverse IPA VIII.*  
*Ditetapkan untuk menjaga kelestarian visi pedagogis sistem.*

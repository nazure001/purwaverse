# Schema Google Sheets

Semua ID bersifat stabil. Timestamp disimpan sebagai ISO-8601.

| Sheet | Kunci | Fungsi |
|---|---|---|
| `SETTINGS` | `key` | konfigurasi non-rahasia dan sinyal pemahaman per siswa-unit |
| `MASTER_CLASSES` | `class_id` | kelas 8A-8E |
| `MASTER_STUDENTS` | `student_id` | roster, nomor absen, PIN hash, status aktif |
| `MASTER_ACTIVITIES` | `activity_id` | aktivitas Bab 1 dan Mission 0 |
| `DIAGNOSTIC_ITEMS` | `item_id` | subset Mission 0 dan rubrik 0-4 |
| `SELF_MAP_ITEMS` | `item_id` | disposisi/minat sains |
| `SESSIONS` | `session_id` | sesi siswa/guru dengan kedaluwarsa |
| `PROGRESS` | `progress_id` | status dan skor per siswa-aktivitas |
| `DIAGNOSTIC_RESPONSES` | `response_id` | jawaban dan skor item |
| `DIAGNOSTIC_PROFILES` | `profile_id` | profil lima domain, overall, leader, readiness |
| `TEAMS` | `team_id` | tim tersimpan per kelas |
| `TEAM_MEMBERS` | `membership_id` | anggota, leader, peran, lock, override |
| `PIN_ISSUANCE` | `student_id` | PIN awal privat untuk distribusi; sheet disembunyikan otomatis |
| `GROUP_LAB` | `lab_result_id` | draft, laporan terisi, status, dan penilaian aktivitas tim |
| `STUDENT_ACTIVITY_STATE` | `state_id` | cache status dan penguncian jalur belajar siswa |
| `TEACHER_CHECKS` | `check_id` | riwayat pemeriksaan rangkuman, LKPD, praktik, dan refleksi |
| `QUIZ_ITEMS` | `quiz_item_id` | bank soal tanpa mengekspos kunci ke browser |
| `QUIZ_ATTEMPTS` | `attempt_id` | percobaan, nilai, dan ketuntasan kuis |
| `QUIZ_RESPONSES` | `response_id` | jawaban item per percobaan kuis |
| `SKILL_EVIDENCE` | `evidence_id` | bukti keterampilan siswa dari aktivitas individu/tim |
| `UNLOCK_OVERRIDES` | `override_id` | pengecualian akses yang diberikan guru dengan alasan |
| `AUDIT_LOG` | `event_id` | jejak aksi penting tanpa menyimpan PIN mentah |

Roster dinormalisasi menjadi:

`student_id | nis | nisn | name | gender | class_id | roll_no | pin_hash | active | source_row | updated_at`

`student_id` tidak bergantung pada nama atau NIS. Import produksi harus mengutamakan NISN, lalu menghasilkan ID internal stabil. Satu siswa 8D yang NIS-nya kosong tetap valid selama identitas internal/NISN tersedia.

Sheet lama tidak dihapus atau diganti. Pemeriksaan guru disimpan append-only dengan nomor revisi agar perubahan nilai tidak menimpa riwayat. `PROGRESS` dipertahankan untuk kompatibilitas MVP, sedangkan jalur baru memakai status turunan dari pemeriksaan guru, percobaan kuis, dan bukti praktik.

Tidak ada penambahan sheet untuk laporan tim. `GROUP_LAB.result_json` menyimpan `{report, meta}`; bidang laporan dibatasi oleh server, sedangkan status dan nilai tetap berada pada kolom tersendiri. Sinyal pemahaman memakai kunci `confusion|student_id|unit_id` pada `SETTINGS` dan tidak memengaruhi nilai atau kunci progres.

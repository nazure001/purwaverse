# PURWAVERSE LMS — PRODUCTION READINESS PACKAGE

**Direktori:** `docs/production/`  
**Status Paket:** `PRODUCTION_READINESS_PACKAGE_V1`  
**Baseline Rilis Acuan:** [`lms-phase1-staging-passed`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/docs/releases/PHASE1_STAGING_BASELINE.md)  
**Otoritas:** Controller Fase Transisi Produksi & Tim Antigravity  

---

## 1. Peta Dokumen Kesiapan Produksi (Deliverables Matrix)

Paket kesiapan produksi ini disusun secara komprehensif untuk memastikan seluruh aspek infrastruktur, keamanan, basis data, prosedur rilis, dan pemantauan sistem telah terdefinisi secara terstandar sebelum peluncuran produksi:

| No | Nama Dokumen | Fokus & Isi Pokok | Tautan Berkas |
|---|---|---|---|
| **0** | **Baseline Rilis Staging** | Kunci acuan versi stabil, fitur tersedia, batasan sistem, dan anchor rollback. | [`docs/releases/PHASE1_STAGING_BASELINE.md`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/docs/releases/PHASE1_STAGING_BASELINE.md) |
| **1** | **Checklist Lingkungan VPS** | Audit spesifikasi OS, Node.js, Nginx, PM2, SSL Certbot, Firewall, dan direktori. | [`PRODUCTION_ENVIRONMENT_CHECKLIST.md`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/docs/production/PRODUCTION_ENVIRONMENT_CHECKLIST.md) |
| **2** | **Laporan Kesiapan Keamanan** | Evaluasi autentikasi Argon2id, otorisasi materi (P1), sesi TTL, dan manajemen rahasia. | [`SECURITY_READINESS_REPORT.md`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/docs/production/SECURITY_READINESS_REPORT.md) |
| **3** | **Rencana Basis Data Produksi** | Engine SQLite WAL, 11 tabel skema v1.0.0, jadwal backup aman, dan runbook pemulihan. | [`DATABASE_PRODUCTION_PLAN.md`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/docs/production/DATABASE_PRODUCTION_PLAN.md) |
| **4** | **Kesiapan Migrasi Data** | Pemisahan mutlak Data Sistem (statis) vs Data Operasional (207 siswa riil tertahan). | [`DATA_MIGRATION_READINESS.md`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/docs/production/DATA_MIGRATION_READINESS.md) |
| **5** | **Runbook Penerapan Produksi** | Prosedur bertahap: Pre-deploy, deploy Git tag, post-deploy healthz, dan rollback darurat. | [`PRODUCTION_DEPLOYMENT_RUNBOOK.md`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/docs/production/PRODUCTION_DEPLOYMENT_RUNBOOK.md) |
| **6** | **Rencana Observabilitas** | Pemantauan 3 lapisan: Log aplikasi/keamanan, beban kerja CPU/RAM server, dan integritas DB. | [`OBSERVABILITY_PLAN.md`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/docs/production/OBSERVABILITY_PLAN.md) |
| **7** | **Roadmap Pasca-Produksi** | Pembekuan backlog peningkatan: P0 (Kritis), P1 (Pengalaman Guru/Alur Kerja), P2 (Enhancement). | [`POST_PRODUCTION_ROADMAP.md`](file:///d:/repo/purwaverse-ipa-viii-mvp-private/docs/production/POST_PRODUCTION_ROADMAP.md) |

---

## 2. Prinsip & Batasan Kerja Fase Ini

* **FROZEN CODEBASE:** Tidak ada kode runtime (`server/src/` maupun `public/`) yang dimodifikasi.
* **ZERO DATA CONTAMINATION:** Data riil 207 siswa sekolah tetap berada di luar server hingga izin pemilik diterbitkan.
* **SAFETY FIRST:** Seluruh prosedur mengedepankan kemampuan pemulihan balik (*instant rollback*) dan zero data loss.

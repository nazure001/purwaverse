# PURWAVERSE LMS — OBSERVABILITY & MONITORING ARCHITECTURE PLAN

**Dokumen:** `docs/production/OBSERVABILITY_PLAN.md`  
**Fase:** Observability & Monitoring (Fase 5)  
**Status Evaluasi:** `SPECIFIED & PRODUCTION READY`  
**Tujuan:** Menyediakan visibilitas penuh terhadap kesehatan aplikasi, performa server VPS, dan keutuhan basis data secara berkelanjutan.  

---

## 1. Arsitektur Observabilitas Tiga Pilar (Three-Tier Observability)

Sistem observabilitas Purwaverse LMS dibagi menjadi tiga lapisan terpisah untuk mendeteksi degradasi performa atau insiden keamanan secara dini:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   PURWAVERSE OBSERVABILITY MATRIX                      │
├──────────────────────────┬──────────────────────────┬──────────────────┤
│ TIER OBSERVABILITAS      │ METRIK / INDIKATOR       │ MEKANISME PANTAU │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ 1. Lapisan Aplikasi      │ • HTTP 4xx / 5xx Errors  │ PM2 Logs & JSON  │
│    (Node.js / Express)   │ • Kegagalan Autentikasi  │ Audit Log Table  │
│                          │ • Response Time > 500ms  │ Nginx Access Log │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ 2. Lapisan Server VPS    │ • Penggunaan CPU (>80%)  │ Node Exporter /  │
│    (Ubuntu Linux)        │ • Penggunaan RAM (>85%)  │ PM2 Monit / Top  │
│                          │ • Sisa Ruang Disk (<15%) │ df -h / Crontab  │
│                          │ • Uptime & Load Average  │ Uptime Robot     │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ 3. Lapisan Basis Data    │ • Ukuran File .db / WAL  │ Stat Checker     │
│    (SQLite 3 Engine)     │ • Integritas Harian      │ PRAGMA check     │
│                          │ • Keberhasilan Backup    │ Exit Code Alert  │
└──────────────────────────┴──────────────────────────┴──────────────────┘
```

---

## 2. Pemantauan Lapisan Aplikasi (Application Layer)

### 2.1 Manajemen Log Terstruktur (Structured Logging)
* **Lokasi Berkas Log:**
  * Standar Output: `/var/log/purwaverse/out.log`
  * Standar Error: `/var/log/purwaverse/error.log`
  * Akses HTTP: `/var/log/nginx/purwaverse_prod_access.log`
* **Rotasi Log Sistem (`logrotate`):**
  Konfigurasikan `/etc/logrotate.d/purwaverse`:
  ```text
  /var/log/purwaverse/*.log {
      daily
      missingok
      rotate 14
      compress
      delaycompress
      notifempty
      create 0640 deploy deploy
  }
  ```

### 2.2 Perekaman Insiden Keamanan & Autentikasi
Setiap anomali berikut wajib dicatat ke tabel `audit_logs` di SQLite:
* Kegagalan login siswa berturut-turut (deteksi potensi *brute-force*).
* Percobaan memanggil aksi guru dengan token siswa (*authorization violation*).
* Percobaan manipulasi payload submateri kuis (*cheat attempt*).
* Eksekusi *Controlled Fallback* delegasi praktikum oleh guru.

---

## 3. Pemantauan Lapisan Server VPS (Server Layer)

### 3.1 Pemantauan Beban Kerja via PM2
Gunakan perintah interaktif bawaan PM2 untuk inspeksi performa berkala:
```bash
# Monitor visual real-time CPU & Memori setiap worker
pm2 monit

# Cek riwayat restart dan konsumsi resource
pm2 show purwaverse-prod
```

### 3.2 Skrip Pemantauan Ruang Disk & Peringatan Otomatis
Buat skrip pemantau ringan `/usr/local/bin/check_server_health.sh`:
```bash
#!/bin/bash
THRESHOLD_DISK=85
CURRENT_DISK=$(df / | grep / | awk '{ print $5}' | sed 's/%//g')

if [ "$CURRENT_DISK" -gt "$THRESHOLD_DISK" ]; then
  echo "[WARNING] Disk usage high: ${CURRENT_DISK}% pada $(date)" >> /var/log/purwaverse/server_alerts.log
fi

CURRENT_MEM=$(free | grep Mem | awk '{print int($3/$2 * 100.0)}')
if [ "$CURRENT_MEM" -gt 85 ]; then
  echo "[WARNING] Memory usage high: ${CURRENT_MEM}% pada $(date)" >> /var/log/purwaverse/server_alerts.log
fi
```

### 3.3 Pemantauan Uptime Eksternal (External Heartbeat)
* Daftarkan endpoint `https://purwaverse.sekolah.sch.id/api/healthz` ke layanan pemantau eksternal gratis (misal: *UptimeRobot* atau *BetterStack*) dengan interval pengecekan setiap 5 menit.
* Notifikasi instan via email/WhatsApp pengelola jika server mengalami *down* atau respons waktu > 2.000 ms.

---

## 4. Pemantauan Lapisan Basis Data (Database Layer)

### 4.1 Pemantauan Ukuran Berkas & Jurnal WAL
Ukuran berkas basis data SQLite dan berkas WAL wajib dipantau:
* **Batas Normal Ukuran DB:** 10 MB – 100 MB untuk satu tahun ajaran penuh (207 siswa + aktivitas).
* **Batas Berkas WAL:** Normalnya berkas `purwaverse.db-wal` berada di bawah 10 MB. Bila berkas WAL membengkak > 50 MB, ini mengindikasikan adanya transaksi terbuka panjang (*long-running open transaction*) atau checkpoint terhambat.
* **Perintah Pemulihan Checkpoint Manual:**
  ```bash
  sqlite3 /var/www/purwaverse/data/purwaverse.db "PRAGMA wal_checkpoint(TRUNCATE);"
  ```

### 4.2 Skrip Pemeriksaan Integritas Harian Otomatis
Jalankan verifikasi integritas basis data setiap subuh pukul 04:00 WIB via cron:
```bash
#!/bin/bash
INTEGRITY=$(sqlite3 /var/www/purwaverse/data/purwaverse.db "PRAGMA integrity_check;")
FK_CHECK=$(sqlite3 /var/www/purwaverse/data/purwaverse.db "PRAGMA foreign_key_check;")

if [ "$INTEGRITY" != "ok" ] || [ -n "$FK_CHECK" ]; then
  echo "[CRITICAL] Database integrity issue detected on $(date): $INTEGRITY | FK: $FK_CHECK" >> /var/log/purwaverse/db_critical.log
  # Trigger alert notification
else
  echo "[INFO] Database integrity verified: OK on $(date)" >> /var/log/purwaverse/db_health.log
fi
```

---

## 5. Kesimpulan Kesiapan Observabilitas

Infrastruktur observabilitas yang dirancang bersifat non-intrusif (*zero-overhead* pada CPU server), tidak memerlukan instalasi perangkat lunak berat pihak ketiga, dan sepenuhnya memanfaatkan kapabilitas native Linux, Nginx, PM2, dan SQLite.

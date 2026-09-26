# PURWAVERSE LMS — OBSERVABILITY ACTIVATION CHECKLIST

**Dokumen:** `docs/production/OBSERVABILITY_ACTIVATION_CHECKLIST.md`  
**Fase:** Observability Readiness (Tahap 4)  
**Status Evaluasi:** `READY FOR ACTIVATION`  
**Cakupan:** Tiga Lapisan Pemantauan (Aplikasi, Server, Basis Data)  

---

## 1. Ikhtisar Checklist Aktivasi

Dokumen ini adalah panduan aktivasi cepat (*activation checklist*) untuk memastikan seluruh saluran pemantauan kesehatan sistem aktif sebelum pembelajaran KBM riil dimulai di server produksi:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   OBSERVABILITY ACTIVATION GATES                       │
├─────────────────────────┬──────────────────────────┬───────────────────┤
│ KOMPONEN PEMANTAUAN     │ JALUR VERIFIKASI         │ STATUS AKTIVASI   │
├─────────────────────────┼──────────────────────────┼───────────────────┤
│ 1. PM2 Application Logs │ /var/log/purwaverse/*.log│ [ ] BELUM / [ ] OK│
│ 2. Nginx Web Proxy Logs │ /var/log/nginx/*prod*.log│ [ ] BELUM / [ ] OK│
│ 3. Server Disk & RAM    │ /usr/local/bin/check_... │ [ ] BELUM / [ ] OK│
│ 4. Automated DB Backup  │ /var/backups/purwaverse/ │ [ ] BELUM / [ ] OK│
│ 5. External Uptime Ping │ Endpoint /api/healthz    │ [ ] BELUM / [ ] OK│
└─────────────────────────┴──────────────────────────┴───────────────────┘
```

---

## 2. Checklist Aktivasi Langkah Demi Langkah

### [ ] 1. PM2 Application Logs Enabled
* **Tindakan Aktivasi:**
  Pastikan konfigurasi `ecosystem.config.js` mengarahkan output log ke direktori `/var/log/purwaverse/`:
  ```bash
  mkdir -p /var/log/purwaverse
  chown -R deploy:deploy /var/log/purwaverse
  chmod 750 /var/log/purwaverse
  ```
* **Perintah Uji Verifikasi:**
  ```bash
  pm2 show purwaverse-prod | grep -E "out log path|error log path"
  tail -n 20 /var/log/purwaverse/out.log
  # Pastikan timestamp tercatat aktif pada setiap restart/request
  ```

---

### [ ] 2. Nginx Web Proxy Logs Enabled
* **Tindakan Aktivasi:**
  Pastikan blok server virtual host Nginx produksi mencatat berkas akses dan error terpisah:
  ```nginx
  access_log /var/log/nginx/purwaverse_prod_access.log;
  error_log /var/log/nginx/purwaverse_prod_error.log warn;
  ```
* **Perintah Uji Verifikasi:**
  ```bash
  sudo nginx -t && sudo systemctl reload nginx
  tail -f /var/log/nginx/purwaverse_prod_access.log
  # Lakukan curl https://purwaverse.sekolah.sch.id/api/healthz dan pastikan baris request HTTP/2 200 muncul seketika
  ```

---

### [ ] 3. Disk & Memory Monitoring Enabled
* **Tindakan Aktivasi:**
  Pasang skrip pemantau ambang batas ruang penyimpanan dan memori di `/usr/local/bin/check_server_health.sh`:
  ```bash
  chmod +x /usr/local/bin/check_server_health.sh
  # Tambahkan ke crontab root setiap 15 menit
  (crontab -l 2>/dev/null; echo "*/15 * * * * /usr/local/bin/check_server_health.sh") | crontab -
  ```
* **Perintah Uji Verifikasi:**
  ```bash
  /usr/local/bin/check_server_health.sh
  cat /var/log/purwaverse/server_alerts.log 2>/dev/null || echo "Ruang disk & RAM dalam batas aman (<85%)"
  ```

---

### [ ] 4. Automated Database Backup & Integrity Monitoring Enabled
* **Tindakan Aktivasi:**
  Jadwalkan pencadangan otomatis per jam via crontab user `deploy`:
  ```cron
  # Backup otomatis tiap jam pada jam sekolah aktif (07:00 - 15:00 WIB, Senin-Jumat)
  0 7-15 * * 1-5 sqlite3 /var/www/purwaverse/data/purwaverse.db "VACUUM INTO '/var/backups/purwaverse/hourly_\$(date +\%Y\%m\%d_\%H00).db';"

  # Verifikasi integritas SQLite setiap subuh pukul 04:00 WIB
  0 4 * * * sqlite3 /var/www/purwaverse/data/purwaverse.db "PRAGMA integrity_check;" >> /var/log/purwaverse/db_health.log 2>&1
  ```
* **Perintah Uji Verifikasi:**
  ```bash
  crontab -l | grep VACUUM
  ls -lh /var/backups/purwaverse/
  # Pastikan file snapshot cadangan terbuat dengan ukuran > 0 byte
  ```

---

### [ ] 5. External Uptime Monitoring Enabled
* **Tindakan Aktivasi:**
  Daftarkan URL endpoint kesehatan publik aplikasi ke penyedia layanan monitoring eksternal (misal: *UptimeRobot*, *BetterStack*, atau cron ping server):
  * **Target URL:** `https://purwaverse.sekolah.sch.id/api/healthz`
  * **Metode:** `GET`
  * **Ekspektasi Status:** `HTTP 200 OK`
  * **Ekspektasi Payload JSON:** `"status":"online"`
  * **Interval:** Setiap 5 menit (24/7)
* **Perintah Uji Verifikasi:**
  * Lakukan uji kirim peringatan (*test notification alert*) ke email/WhatsApp penanggung jawab teknis sekolah.

---

## 3. Lembar Verifikasi Aktivasi Observabilitas

| No | Komponen Observabilitas | Penanggung Jawab | Waktu Eksekusi | Status |
|---|---|---|---|---|
| 1 | PM2 Application Logs | Tim Deployment | Hari Rilis, T-30m | `[ ] ACTIVE` |
| 2 | Nginx Web Proxy Logs | Tim Deployment | Hari Rilis, T-20m | `[ ] ACTIVE` |
| 3 | Server Disk & RAM Check | Sysadmin VPS | Hari Rilis, T-15m | `[ ] ACTIVE` |
| 4 | Automated Database Backup | Database Lead | Hari Rilis, T-10m | `[ ] ACTIVE` |
| 5 | External Uptime Heartbeat | Release Controller | Hari Rilis, T-00m | `[ ] ACTIVE` |

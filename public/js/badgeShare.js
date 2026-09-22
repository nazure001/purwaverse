/**
 * Purwaverse IPA VIII - Dynamic WhatsApp Badge Share Generator
 * Menggunakan HTML Canvas 1080x1080 untuk menghasilkan kartu share ringan (150-250 KB JPG)
 * tanpa perlu mendownload atau menyimpan asset berukuran besar di server.
 */

(function (window) {
  'use strict';

  /**
   * Menghasilkan DataURL JPG 1080x1080 untuk share pencapaian badge ke WhatsApp
   * @param {object} badge - { id, name, tier, icon, description }
   * @param {object} student - { name, classId, date }
   * @returns {Promise<string>} Data URL JPEG
   */
  async function generateBadgeShareCard(badge, student) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // 1. Background Blueprint Gelap
    const bgGradient = ctx.createLinearGradient(0, 0, 1080, 1080);
    bgGradient.addColorStop(0, '#071426');
    bgGradient.addColorStop(1, '#020b14');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Grid Garis Blueprint Halus
    ctx.strokeStyle = '#0c2644';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1080; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1080);
      ctx.stroke();
    }
    for (let y = 0; y < 1080; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1080, y);
      ctx.stroke();
    }

    // 3. Border Luar & Sudut Ornamen
    ctx.strokeStyle = '#1e508c';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, 1020, 1020);
    ctx.strokeStyle = '#12345c';
    ctx.lineWidth = 1;
    ctx.strokeRect(45, 45, 990, 990);

    // 4. Header Badge
    ctx.fillStyle = '#10243e';
    ctx.strokeStyle = '#3c8cdc';
    ctx.lineWidth = 2;
    ctx.fillRect(240, 60, 600, 65);
    ctx.strokeRect(240, 60, 600, 65);

    ctx.font = 'bold 26px "Inter", "Roboto", sans-serif';
    ctx.fillStyle = '#64b5f6';
    ctx.textAlign = 'center';
    ctx.fillText('PURWAVERSE IPA VIII • ACHIEVEMENT', 540, 102);

    // 5. Muat dan Gambar Icon Badge (Tengah)
    const badgeIconUrl = badge.icon || `assets/purwaverse/badges/${badge.tier}/${badge.slug || badge.id}.webp`;
    await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Efek Glow Lingkaran di Belakang Badge
        const glowTierColors = {
          bronze: 'rgba(218, 140, 70, 0.25)',
          silver: 'rgba(210, 225, 240, 0.25)',
          gold: 'rgba(255, 215, 0, 0.28)',
          epic: 'rgba(0, 180, 255, 0.3)',
          legendary: 'rgba(180, 70, 255, 0.3)',
          mythic: 'rgba(255, 100, 200, 0.35)'
        };
        const glowColor = glowTierColors[badge.tier] || 'rgba(255, 215, 0, 0.25)';

        ctx.save();
        ctx.beginPath();
        ctx.arc(540, 420, 210, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.fill();
        ctx.restore();

        // Gambar Emblem Badge
        ctx.drawImage(img, 540 - 200, 420 - 200, 400, 400);
        resolve();
      };
      img.onerror = () => {
        // Fallback jika icon belum termuat
        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath();
        ctx.arc(540, 420, 160, 0, Math.PI * 2);
        ctx.fill();
        resolve();
      };
      img.src = badgeIconUrl;
    });

    // 6. Kartu Informasi Siswa & Pencapaian di Bagian Bawah
    const cardY = 670;
    ctx.fillStyle = '#0c1e38';
    ctx.strokeStyle = '#285890';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(100, cardY, 880, 290, 16);
    ctx.fill();
    ctx.stroke();

    // Nama Badge & Tier Pill
    ctx.font = 'bold 36px "Inter", "Roboto", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(badge.name || 'Achievement Unlocked', 540, cardY + 55);

    // Tier Tag
    const tierName = (badge.tier || 'BRONZE').toUpperCase();
    ctx.font = 'bold 18px "Inter", "Roboto", sans-serif';
    ctx.fillStyle = '#e2b024';
    ctx.fillText(`[ ${tierName} TIER ]`, 540, cardY + 90);

    // Garis Pemisah
    ctx.strokeStyle = '#1a3a60';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(180, cardY + 115);
    ctx.lineTo(900, cardY + 115);
    ctx.stroke();

    // Deskripsi Pencapaian
    ctx.font = 'italic 22px "Inter", "Roboto", sans-serif';
    ctx.fillStyle = '#b0c8e0';
    ctx.fillText(`"${badge.description || 'Pencapaian belajar IPA VIII'}"`, 540, cardY + 155);

    // Nama Siswa, Kelas & Tanggal
    ctx.font = 'bold 24px "Inter", "Roboto", sans-serif';
    ctx.fillStyle = '#ffffff';
    const studentName = student.name || 'Siswa Purwaverse';
    const studentClass = student.classId ? `Kelas ${student.classId}` : '';
    ctx.fillText(`${studentName} ${studentClass ? '• ' + studentClass : ''}`, 540, cardY + 215);

    ctx.font = '18px "Inter", "Roboto", sans-serif';
    ctx.fillStyle = '#64b5f6';
    const dateStr = student.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillText(`Diterbitkan pada: ${dateStr}`, 540, cardY + 250);

    // Export JPG Quality 0.80 (Target ukuran: 150-250 KB)
    return canvas.toDataURL('image/jpeg', 0.80);
  }

  /**
   * Membuka WhatsApp Share dengan text dinamis
   * @param {object} badge
   * @param {object} student
   */
  function shareBadgeToWhatsApp(badge, student) {
    const text = `🎉 *Pencapaian Baru di Purwaverse IPA VIII!*\n\n` +
      `Saya *${student.name || 'Siswa'}* (${student.classId || '8A'})\n` +
      `Berhasil membuka lencana: *${badge.name}* [${(badge.tier || 'Bronze').toUpperCase()}]\n\n` +
      `📌 _"${badge.description || ''}"_\n\n` +
      `Kunjungi Purwaverse: https://purwaverse.vercel.app`;

    const encodedText = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encodedText}`;
    window.open(waUrl, '_blank');
  }

  window.BadgeShare = {
    generateBadgeShareCard,
    shareBadgeToWhatsApp
  };

})(window);

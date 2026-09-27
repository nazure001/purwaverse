/**
 * PURWAVERSE SCIENCE ENGINE - UI COMPONENTS
 * A Module by IZZI Workshop
 * Reusable Component Primitives & API Client
 */

(function(window) {
  'use strict';

  // --- 1. SafeStorage Wrapper ---
  const SafeStorage = {
    getItem(key) {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      } catch (e) {}
      try {
        const mem = window.name ? JSON.parse(window.name) : {};
        return mem[key] || null;
      } catch (e) {
        return null;
      }
    },
    setItem(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
      try {
        const mem = window.name ? JSON.parse(window.name) : {};
        mem[key] = value;
        window.name = JSON.stringify(mem);
      } catch (e) {}
    },
    removeItem(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
      try {
        const mem = window.name ? JSON.parse(window.name) : {};
        delete mem[key];
        window.name = JSON.stringify(mem);
      } catch (e) {}
    }
  };

  // --- 2. String Escaping ---
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- 3. Industrial Toast Notification ---
  function toast(message, type) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = 'show ' + (type || 'info');
    window._lastToast = { message, type: type || 'info', timestamp: Date.now() };
    if ((type || 'info') === 'error') {
      window._lastErrorToast = { message, timestamp: Date.now() };
    }
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      el.className = '';
    }, 3800);
  }

  // --- 4. Universal API Client (callApi) ---
  async function callApi(action, payload, retries = 1) {
    const url = '/api/purwa';
    const body = JSON.stringify({ action, payload: payload || {} });

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        });
        if (!res.ok) {
          throw new Error('Server returned HTTP ' + res.status);
        }
        const data = await res.json();
        if (!data.ok) {
          const errMessage = data.error || 'Terjadi kesalahan sistem.';
          window._lastApiError = { action, message: errMessage, timestamp: Date.now() };
          throw new Error(errMessage);
        }
        return data.data;
      } catch (err) {
        if (attempt === retries) {
          window._lastApiError = { action, message: err.message, timestamp: Date.now() };
          console.error('[API Error] ' + action, err);
          throw err;
        }
        await new Promise(r => setTimeout(r, 600));
      }
    }
  }

  // --- 5. UI Component: GearIcon ---
  function renderGearIcon(size = 'medium', extraClass = '') {
    const assetMap = {
      large: 'assets/gear_large_brass.jpg',
      medium: 'assets/gear_medium_brass.jpg',
      small: 'assets/gear_small_copper.png',
      checkmark: 'assets/gear_checkmark.jpg'
    };
    const src = assetMap[size] || assetMap.medium;
    return `<img src="${src}" alt="Gear Icon" class="gear-icon gear-${size} ${extraClass}" />`;
  }

  // --- 6. UI Component: IndustrialCard ---
  function renderIndustrialCard({ title, subtitle, badge, contentHtml, footerHtml, extraClass = '' }) {
    return `
      <div class="industrial-card ${escapeHtml(extraClass)}">
        <div class="industrial-card-header">
          <div>
            ${subtitle ? `<div class="card-subtitle">${escapeHtml(subtitle)}</div>` : ''}
            <h3 class="card-title">${escapeHtml(title)}</h3>
          </div>
          ${badge ? `<span class="card-badge">${escapeHtml(badge)}</span>` : ''}
        </div>
        <div class="industrial-card-body">
          ${contentHtml || ''}
        </div>
        ${footerHtml ? `<div class="industrial-card-footer">${footerHtml}</div>` : ''}
      </div>
    `;
  }

  // --- 7. UI Component: BlueprintPanel ---
  function renderBlueprintPanel({ title, code, contentHtml, extraClass = '' }) {
    return `
      <div class="blueprint-frame ${escapeHtml(extraClass)}">
        <div class="blueprint-header">
          <div class="blueprint-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
            ${escapeHtml(title)}
          </div>
          ${code ? `<span class="blueprint-code">${escapeHtml(code)}</span>` : ''}
        </div>
        <div class="blueprint-body" style="padding: 20px;">
          ${contentHtml || ''}
        </div>
      </div>
    `;
  }

  // --- 8. UI Component: StudentProgressBoard ---
  function renderStudentProgressBoard(student, progressStats) {
    const level = student && student.level ? student.level : 3;
    const rankTitle = student && student.rank_title ? student.rank_title : 'Researcher';
    const xp = (progressStats && progressStats.total_xp) || 350;
    const nextXp = 500;
    const pct = Math.min(100, Math.round((xp / nextXp) * 100));

    return `
      <div class="student-level-card">
        <div class="level-rank-title">LEVEL ${String(level).padStart(2, '0')} · ${escapeHtml(rankTitle)}</div>
        <div class="xp-progress-meta">${xp} / ${nextXp} XP</div>
        <div class="xp-bar-wrap">
          <div class="xp-bar-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }

  // --- 9. UI Component: AchievementBadge ---
  function renderAchievementBadge({ title, description, icon = 'gear_checkmark', unlocked = false }) {
    return `
      <div class="achievement-badge-card ${unlocked ? 'unlocked' : 'locked'}">
        <div class="badge-icon-wrap">
          <img src="assets/${icon}.jpg" alt="${escapeHtml(title)}" class="badge-icon-img" />
        </div>
        <div class="badge-info">
          <div class="badge-title">${escapeHtml(title)}</div>
          <div class="badge-desc">${escapeHtml(description)}</div>
        </div>
      </div>
    `;
  }

  // --- 10. UI Component: LabConsole (Instructor / Team) ---
  function renderLabConsole(data) {
    return `
      <div class="lab-console-card">
        <div class="console-screen-header">
          <span class="status-dot online"></span>
          <span>LABORATORY CONSOLE · IPA VIII</span>
        </div>
        <div class="console-body">
          ${data.content || ''}
        </div>
      </div>
    `;
  }

  // --- 11. OEM & Stock Browser Advisory (Mobile Device Compatibility Guard) ---
  function detectOemBrowser(customUa) {
    const ua = (customUa || (navigator && navigator.userAgent) || '').toLowerCase();
    
    // 1. Xiaomi / Redmi / POCO
    if (ua.includes('miuibrowser') || ua.includes('xiaomi')) {
      return { isOem: true, brand: 'Xiaomi / Redmi / POCO', name: 'Mi Browser' };
    }
    // 2. Vivo / iQOO
    if (ua.includes('vivobrowser')) {
      return { isOem: true, brand: 'Vivo / iQOO', name: 'Vivo Browser' };
    }
    // 3. OPPO / Realme
    if (ua.includes('heytapbrowser') || ua.includes('oppobrowser')) {
      return { isOem: true, brand: 'OPPO / Realme', name: 'HeyTap / Oppo Browser' };
    }
    // 4. Infinix / Tecno / Itel (Transsion)
    if (ua.includes('hibrowser') || ua.includes('phoenix')) {
      return { isOem: true, brand: 'Infinix / Tecno / Itel', name: 'HiBrowser / Phoenix' };
    }
    // 5. Samsung
    if (ua.includes('samsungbrowser')) {
      return { isOem: true, brand: 'Samsung', name: 'Samsung Internet' };
    }
    // 6. Huawei / Honor
    if (ua.includes('huaweibrowser')) {
      return { isOem: true, brand: 'Huawei', name: 'Huawei Browser' };
    }
    // 7. UC Browser
    if (ua.includes('ucbrowser') || ua.includes('ubrowser')) {
      return { isOem: true, brand: 'UCWeb', name: 'UC Browser' };
    }
    // 8. In-App WebViews (Social Media & Messengers)
    if (ua.includes('fb_iab') || ua.includes('fban') || ua.includes('fbav') || ua.includes('instagram') || ua.includes('line/') || ua.includes('bytedance') || ua.includes('musical_ly')) {
      return { isOem: true, brand: 'Aplikasi Media Sosial', name: 'In-App Browser' };
    }
    
    return { isOem: false, brand: '', name: '' };
  }

  function copyLabLink() {
    const url = window.location.href.split('#')[0];
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        toast('Tautan lab berhasil disalin! Buka Google Chrome lalu tempel tautan.', 'success');
      }).catch(() => {
        fallbackCopyText(url);
      });
    } else {
      fallbackCopyText(url);
    }
  }

  function fallbackCopyText(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('Tautan lab berhasil disalin! Buka Google Chrome lalu tempel tautan.', 'success');
    } catch (e) {
      toast('Silakan salin manual tautan: ' + text, 'info');
    }
  }

  function dismissBrowserAdvisor() {
    try {
      sessionStorage.setItem('purwa_oem_dismissed', '1');
    } catch (e) {}
    const banner = document.getElementById('browser-advisor-banner');
    if (banner) banner.style.display = 'none';
  }

  function initBrowserDetection() {
    try {
      if (sessionStorage.getItem('purwa_oem_dismissed') === '1') {
        return;
      }
      const detection = detectOemBrowser();
      if (!detection.isOem) return;

      const banner = document.getElementById('browser-advisor-banner');
      if (!banner) return;

      const host = window.location.host;
      const pathAndQuery = window.location.pathname + window.location.search;
      const chromeIntent = 'intent://' + host + pathAndQuery + '#Intent;scheme=https;package=com.android.chrome;end';

      banner.innerHTML = `
        <div class="browser-advisor-header">
          <span class="browser-advisor-badge">SARAN AKSES LAB</span>
          <h4 class="browser-advisor-title">Terdeteksi: ${escapeHtml(detection.name)}</h4>
        </div>
        <div class="browser-advisor-body">
          Browser bawaan pada perangkat <b>${escapeHtml(detection.brand)}</b> sering membatasi form login atau memutuskan sesi lab. Demi kelancaran belajar, sangat disarankan membuka Purwaverse di <b>Google Chrome</b>.
        </div>
        <div class="browser-advisor-actions">
          <a href="${chromeIntent}" class="browser-advisor-btn-chrome" id="btn-open-chrome">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            Buka di Google Chrome ↗
          </a>
          <button type="button" class="browser-advisor-btn-copy" id="btn-copy-lab-link" onclick="copyLabLink()">
            📋 Salin Tautan
          </button>
          <button type="button" class="browser-advisor-dismiss" onclick="dismissBrowserAdvisor()">
            Lanjutkan di sini ✕
          </button>
        </div>
      `;
      banner.style.display = 'block';
    } catch (err) {
      console.warn('[BrowserAdvisor] Error initiating detection:', err);
    }
  }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrowserDetection);
  } else {
    initBrowserDetection();
  }

  // Export to Global
  window.SafeStorage = SafeStorage;
  window.escapeHtml = escapeHtml;
  window.toast = toast;
  window.callApi = callApi;
  window.renderGearIcon = renderGearIcon;
  window.renderIndustrialCard = renderIndustrialCard;
  window.renderBlueprintPanel = renderBlueprintPanel;
  window.renderStudentProgressBoard = renderStudentProgressBoard;
  window.renderAchievementBadge = renderAchievementBadge;
  window.renderLabConsole = renderLabConsole;
  window.detectOemBrowser = detectOemBrowser;
  window.initBrowserDetection = initBrowserDetection;
  window.copyLabLink = copyLabLink;
  window.dismissBrowserAdvisor = dismissBrowserAdvisor;

})(window);

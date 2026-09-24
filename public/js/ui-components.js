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

})(window);

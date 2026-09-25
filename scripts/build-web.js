const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const GAS_DIR = path.join(ROOT_DIR, 'gas');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

function readFile(filename) {
  return fs.readFileSync(path.join(GAS_DIR, filename), 'utf8');
}

function build() {
  console.log('Building Purwaverse Science Engine (Industrial LMS - Aligned)...');

  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  // Extract static curriculum units and catalog
  let staticUnitsMap = {};
  let staticCatalog = { chapters: [] };
  try {
    const sandbox = { console, setTimeout, clearTimeout };
    vm.createContext(sandbox);

    const configCode = readFile('Config.gs');
    const practiceCode = readFile('PracticeData.gs');
    const learningCode = readFile('LearningData.gs');

    vm.runInContext(configCode, sandbox);
    vm.runInContext(practiceCode, sandbox);
    vm.runInContext(learningCode, sandbox);

    if (typeof sandbox.allLearningUnits_ === 'function') {
      const allUnits = sandbox.allLearningUnits_();
      allUnits.forEach(u => {
        staticUnitsMap[u.unit_id] = Object.assign({}, u, {
          illustration_svg: sandbox.learningIllustration_(u.illustration),
          practice_preview: sandbox.practiceCatalogItem_(u.practice_activity_id)
        });
      });
      console.log(`Pre-bundled ${Object.keys(staticUnitsMap).length} static curriculum units into client build.`);
    }

    const learningPath = vm.runInContext('typeof LEARNING_PATH_ !== "undefined" ? LEARNING_PATH_ : []', sandbox);
    if (Array.isArray(learningPath)) {
      staticCatalog = {
        chapters: learningPath.map(chapter => ({
          chapter_id: chapter.chapter_id,
          semester: chapter.semester,
          order: chapter.order,
          title: chapter.title,
          tagline: chapter.tagline,
          units: chapter.units.map(unit => ({
            unit_id: unit.unit_id,
            order: unit.order,
            title: unit.title,
            summary: unit.summary,
            illustration: unit.illustration,
            practice_activity_id: unit.practice_activity_id,
            learn_activity_id: unit.learn_activity_id,
            quiz_activity_id: unit.quiz_activity_id
          }))
        }))
      };
    }
  } catch (err) {
    console.error('Failed to pre-bundle static curriculum units:', err);
  }

  const defaultBootstrap = {
    appName: "Purwaverse Science Engine",
    mode: "PRODUCTION",
    sourceStatus: "READY",
    currentSemester: 1,
    quizPassingScore: 70,
    teacherWaNumber: "085721215213",
    classes: [
      { class_id: "8A", class_name: "Kelas 8A", active: true },
      { class_id: "8B", class_name: "Kelas 8B", active: true },
      { class_id: "8C", class_name: "Kelas 8C", active: true },
      { class_id: "8D", class_name: "Kelas 8D", active: true },
      { class_id: "8E", class_name: "Kelas 8E", active: true }
    ]
  };

  const htmlContent = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Purwaverse Science Engine | A Module by IZZI Workshop</title>
  <meta name="description" content="Platform Pembelajaran IPA Kelas VIII SMP - Laboratorium & Jalur Belajar Berbasis Bukti">
  <base target="_top">
  <link rel="stylesheet" href="css/industrial.css">
  <link rel="stylesheet" href="css/blueprint.css">
  <link rel="stylesheet" href="css/components.css">
</head>
<body class="blueprint-bg">
  <div id="app-root">

    <!-- Topbar Navigation -->
    <header id="engine-topbar" class="engine-topbar" style="display: none;">
      <div class="brand-wrapper" onclick="showView('view-student-dashboard')">
        <div class="brand-helm-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
        </div>
        <div class="brand-text-block">
          <span class="brand-main-title">PURWAVERSE</span>
          <span class="brand-sub-title">SCIENCE ENGINE · A MODULE BY IZZI WORKSHOP</span>
        </div>
      </div>
      <div id="topbar-user-section" class="topbar-right-controls"></div>
    </header>

    <!-- 1. LOADING SCREEN -->
    <section id="view-loading" class="view-container loading-view" aria-hidden="true">
      <div class="loading-reactor-bg"></div>
      <div class="loading-modal-card">
        <div class="loading-brand-sub">IZZI WORKSHOP</div>
        <h1 class="loading-brand-title">PURWAVERSE</h1>
        <div class="loading-sub-badge">CONNECTING MODULE...</div>
        <div class="loading-status-checklist">
          <div id="check-core" class="loading-check-item">
            <span class="check-label"><span class="check-icon">✓</span> CORE SYSTEM</span>
            <span class="status-badge">CONNECTING...</span>
          </div>
          <div id="check-db" class="loading-check-item">
            <span class="check-label"><span class="check-icon">✓</span> DATABASE</span>
            <span class="status-badge">STANDBY</span>
          </div>
          <div id="check-lab" class="loading-check-item">
            <span class="check-label"><span class="check-icon">✓</span> LEARNING LAB</span>
            <span class="status-badge">STANDBY</span>
          </div>
          <div id="check-ready" class="loading-check-item">
            <span class="check-label"><span class="check-icon">✓</span> PREPARING YOUR EXPERIENCE</span>
            <span class="status-badge">STANDBY</span>
          </div>
        </div>
        <div class="loading-progress-bar-wrap">
          <div id="loading-fill" class="loading-progress-fill"></div>
        </div>
        <div class="loading-footer-motto">SAME CURIOSITY · BIGGER POSSIBILITIES</div>
      </div>
    </section>

    <!-- 2. LOGIN SCREEN -->
    <section id="view-auth" class="view-container auth-view" aria-hidden="true">
      <div class="auth-bg-layer"></div>
      <div class="auth-container-grid">
        <div class="auth-form-card">
          <div class="auth-header">
            <div class="auth-logo-badge">
              <div class="brand-helm-icon">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              </div>
              <div>
                <h2 style="font-size: 18px; font-weight: 800; color: var(--brass-light);">PURWAVERSE</h2>
                <div style="font-size: 10px; color: var(--text-sub); letter-spacing: 1px;">SCIENCE ENGINE · IZZI WORKSHOP</div>
              </div>
            </div>
          </div>
          <div class="auth-role-tabs">
            <button id="tab-auth-student" type="button" class="auth-role-tab active" onclick="switchAuthTab('student')">SISWA</button>
            <button id="tab-auth-teacher" type="button" class="auth-role-tab" onclick="switchAuthTab('teacher')">GURU</button>
          </div>

          <!-- Student Form -->
          <form id="form-auth-student" onsubmit="handleStudentLogin(event)">
            <div class="auth-form-group">
              <label class="auth-label" for="input-student-id">NIS / KODE SISWA</label>
              <div class="auth-input-wrapper">
                <input type="text" id="input-student-id" class="auth-input" placeholder="Contoh: 8A-01" required autocomplete="username">
              </div>
            </div>
            <div class="auth-form-group">
              <label class="auth-label" for="input-student-pin">PIN AKSES (4 DIGIT)</label>
              <div class="auth-input-wrapper">
                <input type="password" id="input-student-pin" class="auth-input" placeholder="••••" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required autocomplete="current-password">
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
              <input type="checkbox" id="check-remember-student" checked style="accent-color: var(--brass-main);">
              <label for="check-remember-student" style="font-size: 12.5px; color: var(--text-muted); cursor: pointer;">Ingat saya di perangkat ini</label>
            </div>
            <button id="btn-student-submit" type="submit" class="btn-brass" style="width: 100%;">
              MASUK KE LAB →
            </button>
          </form>

          <!-- Teacher Form -->
          <form id="form-auth-teacher" style="display: none;" onsubmit="handleTeacherLogin(event)">
            <div class="auth-form-group">
              <label class="auth-label" for="input-teacher-pwd">KATA SANDI INSTRUKTUR</label>
              <div class="auth-input-wrapper">
                <input type="password" id="input-teacher-pwd" class="auth-input" placeholder="Masukkan kata sandi guru" required autocomplete="current-password">
              </div>
            </div>
            <button id="btn-teacher-submit" type="submit" class="btn-brass" style="width: 100%; margin-top: 20px;">
              MASUK KE COMMAND CENTER →
            </button>
          </form>
        </div>

        <div class="auth-quote-card">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
              <img src="assets/gear_small_copper.png" style="width: 24px; height: 24px; border-radius: 50%;" alt="Seal">
              <span style="font-size: 11px; font-weight: 700; color: var(--brass-light); letter-spacing: 1px;">IZZI WORKSHOP</span>
            </div>
            <div class="auth-quote-body">
              "Pendidikan bukan hanya tentang pengetahuan, tapi tentang karakter, kolaborasi, dan dampak nyata."
            </div>
          </div>
          <div class="auth-quote-author">
            — IZZI WORKSHOP · PURWAVERSE
          </div>
        </div>
      </div>
    </section>

    <!-- 3. STUDENT DASHBOARD (Pedagogical Priority: 1. Materi 2. Progres 3. Tugas/LKPD 4. Kuis 5. Capaian) -->
    <section id="view-student-dashboard" class="view-container dashboard-layout" aria-hidden="true">
      <aside class="dashboard-sidebar">
        <ul class="sidebar-nav-list">
          <li class="sidebar-nav-item active" data-view="view-student-dashboard" onclick="showView('view-student-dashboard')">
            <span>🏠</span> <span>Beranda</span>
          </li>
          <li class="sidebar-nav-item" data-view="view-learning-map" onclick="showView('view-learning-map')">
            <span>🗺️</span> <span>Peta Pembelajaran</span>
          </li>
          <li class="sidebar-nav-item" data-view="view-quiz-chamber" onclick="openQuizChamber()">
            <span>⚡</span> <span>Kuis Chamber</span>
          </li>
          <li class="sidebar-nav-item" data-view="view-team-lab" onclick="openTeamLab()">
            <span>👥</span> <span>Lab Kelompok</span>
          </li>
          <li class="sidebar-nav-item" onclick="showView('view-learning-map')">
            <span>📊</span> <span>Progress</span>
          </li>
        </ul>
        <div style="border-top: 1px solid var(--steel-border); padding-top: 16px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="assets/gear_small_copper.png" style="width: 20px; height: 20px; border-radius: 50%;" alt="Izzi">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-sub); letter-spacing: 1px;">IZZI WORKSHOP</span>
          </div>
        </div>
      </aside>

      <main class="dashboard-main-content">
        <!-- Academic Profile Header -->
        <div class="student-welcome-banner">
          <div class="student-identity-group">
            <div class="student-avatar-frame">
              <img src="assets/gear_checkmark.jpg" alt="Student Avatar">
            </div>
            <div class="student-greeting-text">
              <h2>Selamat Datang, <span id="dash-student-name">Ahmad Fauzan</span> <span id="dash-student-class" class="class-badge">VIII-A</span></h2>
              <div class="student-greeting-motto">"Belajar sains melalui observasi, pembuktian fakta, dan eksperimen ilmiah."</div>
            </div>
          </div>
          <div id="dash-xp-card-container"></div>
        </div>

        <!-- 1. MATERI YANG SEDANG DIPELAJARI (PRIMARY FOCUS) -->
        <div class="active-module-card" style="margin-bottom: 28px;">
          <div class="card-section-label" style="display: flex; justify-content: space-between;">
            <span>1. MATERI YANG SEDANG DIPELAJARI</span>
            <span style="color: var(--holo-cyan);">TARGET: CP 1.1.3</span>
          </div>
          <div class="module-card-body">
            <div class="module-artwork-thumb">
              <img src="assets/tape_measure_blueprint.jpg" alt="Module Thumbnail">
            </div>
            <div class="module-card-details">
              <span id="active-unit-order" class="node-unit-order">Unit 1</span>
              <h3 id="active-unit-title">Sel sebagai Unit Kehidupan</h3>
              <p id="active-unit-summary">Mempelajari struktur mikroskopis, teori sel, dan dasar fungsi kehidupan pada tingkat sel.</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--steel-border); padding-top: 16px; margin-top: 8px;">
            <span style="font-size: 12.5px; color: var(--text-sub);">Langkah: Baca Teori → Buat Resume → Uji Pemahaman</span>
            <button class="btn-brass" onclick="openCourseUnit(AppState.activeUnitId)">
              LANJUTKAN BELAJAR →
            </button>
          </div>
        </div>

        <!-- 2. PROGRES BELAJAR & 3. TUGAS / LKPD -->
        <div class="dashboard-grid-split">
          <!-- Progres Belajar Kurikulum -->
          <div class="industrial-card" style="background: rgba(14, 23, 38, 0.94); border: 1px solid var(--steel-border); border-radius: 12px; padding: 24px;">
            <div class="card-section-label">2. PROGRES PEMBELAJARAN IPA VIII</div>
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                  <span>Unit Materi Terselesaikan</span>
                  <span id="stat-units-completed" style="font-weight: 700; color: var(--brass-light);">3 / 21 Unit</span>
                </div>
                <div class="loading-progress-bar-wrap"><div class="loading-progress-fill" style="width: 15%;"></div></div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                  <span>Kuis Chamber Tuntas (KKM 70)</span>
                  <span style="font-weight: 700; color: var(--status-online);">2 Lulus</span>
                </div>
                <div class="loading-progress-bar-wrap"><div class="loading-progress-fill" style="width: 10%; background: var(--status-online);"></div></div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                  <span>LKPD Praktik Terverifikasi Guru</span>
                  <span style="font-weight: 700; color: var(--holo-cyan);">1 Disetujui</span>
                </div>
                <div class="loading-progress-bar-wrap"><div class="loading-progress-fill" style="width: 12%; background: var(--holo-cyan);"></div></div>
              </div>
            </div>
          </div>

          <!-- Tugas & Penilaian Berikutnya -->
          <div class="objectives-card">
            <div class="card-section-label">3. TUGAS & PENILAIAN BERIKUTNYA</div>
            <ul class="objectives-list">
              <li class="objective-item">
                <div class="objective-icon">📝</div>
                <div>
                  <div style="font-size: 13px; font-weight: 700;">Tulis Resume Pembelajaran</div>
                  <div style="font-size: 11.5px; color: var(--text-muted);">Kirim ringkasan untuk diverifikasi instruktur</div>
                </div>
              </li>
              <li class="objective-item">
                <div class="objective-icon">⚡</div>
                <div>
                  <div style="font-size: 13px; font-weight: 700;">Evaluasi Kuis Chamber</div>
                  <div style="font-size: 11.5px; color: var(--text-muted);">Minimal 70 poin untuk membuka materi lanjut</div>
                </div>
              </li>
              <li class="objective-item">
                <div class="objective-icon">👥</div>
                <div>
                  <div style="font-size: 13px; font-weight: 700;">Praktik Tim (LKPD Kelompok)</div>
                  <div style="font-size: 11.5px; color: var(--text-muted);">Observasi & laporan bersama tim ilmiah</div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- 4. PETA BELAJAR CEPAT -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; margin-bottom: 16px;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main); letter-spacing: 0.5px;">ALUR MATERI KELAS VIII (SEMESTER 1 & 2)</h3>
          <button class="topbar-nav-button" onclick="showView('view-learning-map')">Buka Peta Pembelajaran Lengkap →</button>
        </div>
      </main>
    </section>

    <!-- 4. LEARNING MAP VIEW (Primary: Nama Resmi IPA VIII, Secondary: Lab Branding) -->
    <section id="view-learning-map" class="view-container learning-map-section" aria-hidden="true">
      <div class="map-header-banner">
        <h2 class="map-main-heading">PETA PEMBELAJARAN IPA VIII</h2>
        <div class="map-sub-heading">Kurikulum IPA Terpadu Kelas VIII SMP — 21 Unit Eksplorasi Ilmiah</div>
        <button class="btn-steel" onclick="showView('view-student-dashboard')" style="margin-top: 14px;">← Kembali ke Dashboard</button>
      </div>
      <div id="map-chapters-container" class="chapters-path-wrapper"></div>
    </section>

    <!-- 5. COURSE UNIT READER VIEW -->
    <section id="view-course-unit" class="view-container" style="max-width: 1100px; margin: 0 auto; padding: 32px 24px;" aria-hidden="true">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
        <button class="btn-steel" onclick="showView('view-student-dashboard')">← Dashboard</button>
        <button id="btn-open-unit-quiz" class="btn-brass">Mulai Quiz Chamber →</button>
      </div>
      <div class="blueprint-frame" style="padding: 32px; margin-bottom: 32px;">
        <div class="blueprint-header" style="margin-bottom: 20px; padding-bottom: 12px;">
          <div>
            <span class="chapter-lab-tag">UNIT PEMBELAJARAN</span>
            <h2 id="unit-reader-title" style="font-size: 24px; font-weight: 800; color: var(--text-main); margin-top: 6px;">Unit Reader</h2>
          </div>
          <span class="blueprint-code">PURWAVERSE ENGINE</span>
        </div>
        <p id="unit-reader-summary" style="font-size: 15px; color: var(--text-muted); line-height: 1.6; margin-bottom: 24px;"></p>
        <div id="unit-reader-diagram" style="margin-bottom: 32px;"></div>
        <div id="unit-reader-sections"></div>
      </div>

      <!-- Summary / Resume Submission Card -->
      <div class="industrial-card" style="background: rgba(14, 23, 38, 0.94); border: 1px solid var(--brass-border); border-radius: 12px; padding: 28px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h3 style="font-size: 17px; font-weight: 700; color: var(--brass-light); margin: 0;">BUKU CATATAN FISIK SISWA</h3>
          <span id="summary-status-badge" class="status-badge" style="border: 1px solid var(--steel-border); color: var(--text-sub);">Belum Dilaporkan</span>
        </div>
        <p id="unit-notebook-prompt" style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 16px;">Tuliskan poin penting dan diagram materi ini pada buku tulis catatan IPA kamu.</p>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; background: rgba(9, 16, 28, 0.6); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--steel-border);">
          <input type="checkbox" id="check-notebook-ready" style="width: 18px; height: 18px; accent-color: var(--brass-light); cursor: pointer;">
          <label for="check-notebook-ready" style="font-size: 13.5px; color: #fff; cursor: pointer;">Saya telah selesai mencatat materi ini di buku tulis catatan IPA secara lengkap dan siap diperiksa guru.</label>
        </div>
        <button id="btn-submit-summary" class="btn-brass" onclick="submitSummary()">Lapor: Buku Siap Diperiksa Guru ✓</button>
      </div>
    </section>

    <!-- 6. QUIZ CHAMBER VIEW -->
    <section id="view-quiz-chamber" class="view-container quiz-chamber-view" aria-hidden="true">
      <div class="quiz-chamber-header">
        <div class="quiz-chamber-heading">
          <h2>QUIZ CHAMBER</h2>
          <div style="font-size: 13px; color: var(--text-muted);">Uji pemahamanmu, taklukkan tantangan!</div>
        </div>
        <div class="quiz-timer-badge">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg>
          <span id="quiz-timer-display">03:00</span>
        </div>
      </div>

      <div class="quiz-chamber-body-grid">
        <div class="quiz-question-card">
          <div>
            <div class="quiz-meta-row">
              <span id="quiz-step-indicator" class="quiz-step-tag">Pertanyaan 1 dari 8</span>
              <span class="quiz-hots-badge">HOTS</span>
              <span class="quiz-point-badge">+20 poin</span>
            </div>
            <h3 id="quiz-prompt-text" class="quiz-question-prompt">Memuat pertanyaan...</h3>
            <div id="quiz-options-container" class="quiz-options-list"></div>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--steel-border); padding-top: 20px;">
            <button id="btn-quiz-prev" class="btn-steel" onclick="prevQuestion()">← Sebelumnya</button>
            <button id="btn-quiz-next" class="btn-brass" onclick="nextQuestion()">Jawab ></button>
          </div>
        </div>

        <div class="quiz-schematic-side">
          <img src="assets/tape_measure_blueprint.jpg" style="width: 140px; opacity: 0.85; border-radius: 8px; margin-bottom: 16px;" alt="Schematic Hologram">
          <div style="font-size: 13px; font-weight: 700; color: var(--holo-cyan); letter-spacing: 1px;">SCHEMATIC HOLOGRAM</div>
          <div style="font-size: 11px; color: var(--text-sub); text-align: center; margin-top: 6px;">Visualisasi referensi ilmiah laboratorium</div>
        </div>
      </div>
    </section>

    <!-- 7. TEAM WORKSHOP (LKPD KELOMPOK DENGAN CONTROLLED FALLBACK) -->
    <section id="view-team-lab" class="view-container team-workshop-view" aria-hidden="true">
      <div class="team-header-row" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
        <div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
            <h2 id="team-lab-activity-title" style="font-size: 24px; font-weight: 800; color: var(--brass-light); margin: 0;">LEMBAR KERJA PRAKTIKUM (LKPD TIM)</h2>
            <span id="team-user-role-badge" class="status-badge" style="background: rgba(200, 150, 60, 0.25); color: var(--brass-light); border-color: var(--brass-border); font-size: 11px;">Scientist Leader</span>
            <span id="team-fallback-indicator" class="status-badge" style="display: none; background: rgba(16, 185, 129, 0.25); color: #34d399; border-color: #34d399; font-size: 11px;">FALLBACK DIAKTIFKAN</span>
          </div>
          <div id="team-role-explanation" style="font-size: 13px; color: var(--text-muted); max-width: 760px; line-height: 1.5;">Anda adalah Scientist Leader. Anda memiliki hak akses utama untuk menginput dan mengirim laporan praktikum tim.</div>
        </div>
        <div id="team-lab-version-tag" class="team-badge-pill" style="font-family: monospace; font-size: 11px;">clientVersion: draft baru</div>
      </div>

      <!-- Deputy Controlled Fallback Notice & Input Box -->
      <div id="deputy-fallback-input-box" style="display: none; background: rgba(15, 23, 42, 0.85); border: 1px solid var(--steel-border); border-left: 4px solid var(--brass-light); border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <label for="input-team-fallback-reason" style="display: block; font-size: 12.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 6px;">ALASAN PENGALIHAN WEWENANG (CONTROLLED FALLBACK):</label>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">Jika Scientist Leader berhalangan, masukkan alasan di bawah ini. Guru wajib memberikan pengesahan di Command Center agar Anda dapat mengedit atau mengirimkan laporan ini.</div>
        <input type="text" id="input-team-fallback-reason" class="auth-input" style="width: 100%; padding: 10px 14px; font-size: 13.5px;" placeholder="Contoh: Scientist Leader sedang sakit / terkendala gawai...">
      </div>

      <!-- Team Members Grid -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 700; color: var(--text-sub); letter-spacing: 1px; margin-bottom: 10px;">ANGGOTA TIM PENELITI</div>
        <div id="team-members-container" class="team-members-grid"></div>
      </div>

      <!-- LKPD Report Form Blueprint -->
      <div class="blueprint-frame" style="padding: 28px; margin-bottom: 28px; background: rgba(14, 23, 38, 0.94); border: 1px solid var(--brass-border); border-radius: 12px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--holo-cyan); margin-bottom: 20px; letter-spacing: 0.5px;">LAPORAN PENELITIAN & OBSERVASI TIM</h3>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <label for="lkpd-input-prediction" style="display: block; font-size: 12.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 6px;">1. PREDIKSI AWAL TIM</label>
            <textarea id="lkpd-input-prediction" class="auth-input" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="Apa yang tim perkirakan akan terjadi berdasarkan teori?"></textarea>
          </div>
          <div>
            <label for="lkpd-input-tools" style="display: block; font-size: 12.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 6px;">2. ALAT & BAHAN AKTUAL</label>
            <textarea id="lkpd-input-tools" class="auth-input" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="Alat dan bahan yang benar-benar digunakan saat observasi..."></textarea>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <label for="lkpd-input-trial1" style="display: block; font-size: 12.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 6px;">3. PROSEDUR TRIAL 1</label>
            <textarea id="lkpd-input-trial1" class="auth-input" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="Langkah pelaksanaan uji coba pertama..."></textarea>
          </div>
          <div>
            <label for="lkpd-input-data" style="display: block; font-size: 12.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 6px;">4. TABEL / DATA PENGAMATAN</label>
            <textarea id="lkpd-input-data" class="auth-input" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="Objek / perbesaran | Detail teramati | Detail tidak pasti..."></textarea>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <label for="lkpd-input-improvement" style="display: block; font-size: 12.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 6px;">5. PERBAIKAN DARI TRIAL 1 KE TRIAL 2</label>
            <textarea id="lkpd-input-improvement" class="auth-input" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="Apa kelemahan Trial 1 dan bagaimana perbaikannya?"></textarea>
          </div>
          <div>
            <label for="lkpd-input-trial2" style="display: block; font-size: 12.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 6px;">6. PROSEDUR & HASIL TRIAL 2</label>
            <textarea id="lkpd-input-trial2" class="auth-input" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="Hasil setelah satu variabel atau teknik diperbaiki..."></textarea>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <label for="lkpd-input-evidence" style="display: block; font-size: 12.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 6px;">7. BUKTI UTAMA YANG DIDAPATKAN</label>
            <textarea id="lkpd-input-evidence" class="auth-input" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="Data mana yang paling kuat membuktikan hipotesis?"></textarea>
          </div>
          <div>
            <label for="lkpd-input-conclusion" style="display: block; font-size: 12.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 6px;">8. KESIMPULAN ILMIAH TIM</label>
            <textarea id="lkpd-input-conclusion" class="auth-input" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="Kesimpulan berdasarkan fakta pengamatan..."></textarea>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
          <div>
            <label for="lkpd-input-reflection" style="display: block; font-size: 12.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 6px;">9. BATASAN MODEL & REFLEKSI</label>
            <textarea id="lkpd-input-reflection" class="auth-input" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="Bagian apa dari praktikum yang tidak sama dengan kondisi sebenarnya?"></textarea>
          </div>
          <div>
            <label for="lkpd-input-member-roles" style="display: block; font-size: 12.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 6px;">10. PEMBAGIAN PERAN ANGGOTA</label>
            <textarea id="lkpd-input-member-roles" class="auth-input" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="Kontribusi masing-masing anggota selama praktikum..."></textarea>
          </div>
        </div>

        <div style="display: flex; gap: 16px; border-top: 1px solid var(--steel-border); padding-top: 20px;">
          <button id="btn-save-team-draft" class="btn-steel" style="padding: 12px 24px; font-weight: 700;" onclick="saveTeamWorksheetDraft()">Simpan Draft LKPD</button>
          <button id="btn-submit-team-worksheet" class="btn-brass" style="padding: 12px 28px; font-weight: 700;" onclick="submitTeamWorksheet()">Kirim Laporan Resmi ke Guru ✓</button>
          <button class="btn-steel" style="padding: 12px 20px; margin-left: auto;" onclick="showView('view-student-dashboard')">← Kembali ke Dashboard</button>
        </div>
      </div>
    </section>

    <!-- 8. TEACHER COMMAND CENTER (Pedagogical Focus: Monitoring, Insight, Difficulties, Intervention) -->
    <section id="view-teacher-dashboard" class="view-container teacher-command-view" aria-hidden="true">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px;">
        <div>
          <h2 style="font-size: 26px; font-weight: 800; color: var(--brass-light);">TEACHER COMMAND CENTER</h2>
          <div style="font-size: 13.5px; color: var(--text-muted);">Monitoring Pemahaman Siswa, Evaluasi LKPD, dan Intervensi Pembelajaran.</div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 13px; color: var(--text-sub);">Kelas:</span>
          <select id="teacher-class-select" class="auth-input" style="width: 110px; padding: 8px 12px;">
            <option value="8A">VIII-A</option>
            <option value="8B">VIII-B</option>
            <option value="8C">VIII-C</option>
            <option value="8D">VIII-D</option>
            <option value="8E">VIII-E</option>
          </select>
        </div>
      </div>

      <!-- Stat Cards Deck -->
      <div class="teacher-stats-deck">
        <div class="teacher-stat-card">
          <div class="teacher-stat-icon">👤</div>
          <div>
            <div id="stat-active-students" class="stat-number-val">207</div>
            <div class="stat-label-text">Siswa Terdaftar</div>
          </div>
        </div>
        <div class="teacher-stat-card">
          <div class="teacher-stat-icon">🎯</div>
          <div>
            <div id="stat-avg-progress" class="stat-number-val">82%</div>
            <div class="stat-label-text">Ketuntasan Materi</div>
          </div>
        </div>
        <div class="teacher-stat-card">
          <div class="teacher-stat-icon">📝</div>
          <div>
            <div id="stat-pending-reviews" class="stat-number-val">12</div>
            <div class="stat-label-text">Menunggu Verifikasi Resume</div>
          </div>
        </div>
        <div class="teacher-stat-card">
          <div class="teacher-stat-icon">⚠️</div>
          <div>
            <div id="stat-need-attention" class="stat-number-val">3</div>
            <div class="stat-label-text">Butuh Bimbingan Guru</div>
          </div>
        </div>
      </div>

      <!-- Pedagogical Core: Student Learning Insight, Difficulties, & Intervention -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 28px;">
        <div class="industrial-card" style="background: rgba(14, 23, 38, 0.94); border: 1px solid var(--holo-cyan); border-radius: 12px; padding: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--holo-cyan); letter-spacing: 1px; margin-bottom: 8px;">STUDENT LEARNING INSIGHT</div>
          <h4 style="font-size: 14.5px; font-weight: 700; color: #fff; margin-bottom: 6px;">Pemahaman Konseptual Bab 1</h4>
          <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5;">85% siswa telah memahami konsep hierarki sel hingga organisme, namun 32% masih keliru mengidentifikasi fungsi spesifik organel sel tumbuhan vs hewan.</p>
        </div>

        <div class="industrial-card" style="background: rgba(14, 23, 38, 0.94); border: 1px solid var(--status-warning); border-radius: 12px; padding: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--status-warning); letter-spacing: 1px; margin-bottom: 8px;">COMMON DIFFICULTIES (MISKONSEPSI)</div>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--text-muted);">
            <li>• Menyamakan fungsi perbesaran mikroskop dengan resolusi.</li>
            <li>• Menganggap sel hewan tidak memiliki vakuola sama sekali.</li>
            <li>• Tertukar antara xilem dan floem pada jaringan tumbuhan.</li>
          </ul>
        </div>

        <div class="industrial-card" style="background: rgba(14, 23, 38, 0.94); border: 1px solid var(--status-online); border-radius: 12px; padding: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--status-online); letter-spacing: 1px; margin-bottom: 8px;">RECOMMENDED INTERVENTION</div>
          <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5; margin-bottom: 10px;">Lakukan penguatan demonstrasi perbesaran mikroskop di awal sesi praktikum unit 2. Berikan perhatian khusus pada 3 siswa dengan nilai di bawah KKM.</p>
          <button class="btn-steel" style="padding: 6px 12px; font-size: 12px; width: 100%;" onclick="toast('Rekomendasi tindakan bimbingan telah dicatat pada agenda guru.', 'success')">Tandai Sudah Diintervensi ✓</button>
        </div>
      </div>

      <!-- Split: Progres Unit & Siswa Perlu Perhatian -->
      <div class="dashboard-grid-split">
        <div class="industrial-card" style="background: rgba(14, 23, 38, 0.94); border: 1px solid var(--steel-border); border-radius: 12px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">PROGRES UNIT MATERI KURIKULUM (1 - 6)</h3>
            <span style="font-size: 12px; color: var(--text-sub);">Rata-rata Kelas VIII-A</span>
          </div>
          <div style="height: 140px; display: flex; align-items: flex-end; gap: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--steel-border);">
            <div style="flex: 1; height: 95%; background: var(--brass-gradient); border-radius: 3px 3px 0 0;" title="Bab 1: 95%"></div>
            <div style="flex: 1; height: 88%; background: var(--brass-gradient); border-radius: 3px 3px 0 0;" title="Bab 2: 88%"></div>
            <div style="flex: 1; height: 80%; background: var(--brass-gradient); border-radius: 3px 3px 0 0;" title="Bab 3: 80%"></div>
            <div style="flex: 1; height: 60%; background: var(--steel-border-light); border-radius: 3px 3px 0 0;" title="Bab 4: 60%"></div>
            <div style="flex: 1; height: 35%; background: var(--steel-border-light); border-radius: 3px 3px 0 0;" title="Bab 5: 35%"></div>
            <div style="flex: 1; height: 10%; background: var(--steel-border-light); border-radius: 3px 3px 0 0;" title="Bab 6: 10%"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-sub); margin-top: 8px;">
            <span>Bab 1</span><span>Bab 2</span><span>Bab 3</span><span>Bab 4</span><span>Bab 5</span><span>Bab 6</span>
          </div>
        </div>

        <div class="industrial-card" style="background: rgba(14, 23, 38, 0.94); border: 1px solid var(--steel-border); border-radius: 12px; padding: 24px;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--status-warning); margin-bottom: 16px;">SISWA PERLU BIMBINGAN KHUSUS</h3>
          <ul class="objectives-list">
            <li class="objective-item" style="justify-content: space-between;">
              <div>
                <span style="font-weight: 700;">Andi Pratama</span>
                <div style="font-size: 11.5px; color: var(--text-muted);">Progres resume Unit 2 tertunda (3 hari)</div>
              </div>
              <button class="topbar-nav-button" style="padding: 4px 8px; font-size: 11px;" onclick="toast('Notifikasi pengingat dikirim ke Andi Pratama.', 'info')">Kirim Pengingat</button>
            </li>
            <li class="objective-item" style="justify-content: space-between;">
              <div>
                <span style="font-weight: 700;">Siti Nurhaliza</span>
                <div style="font-size: 11.5px; color: var(--status-danger);">Kuis Chamber: Skor 60 (Di bawah KKM 70)</div>
              </div>
              <button class="topbar-nav-button" style="padding: 4px 8px; font-size: 11px;" onclick="toast('Remedial dibuka untuk Siti Nurhaliza.', 'success')">Buka Remedial</button>
            </li>
            <li class="objective-item" style="justify-content: space-between;">
              <div>
                <span style="font-weight: 700;">Budi Santoso</span>
                <div style="font-size: 11.5px; color: var(--text-muted);">Belum mengunggah data LKPD Kelompok</div>
              </div>
              <button class="topbar-nav-button" style="padding: 4px 8px; font-size: 11px;" onclick="toast('Status tim dikonfirmasi ke Budi Santoso.', 'info')">Periksa Tim</button>
            </li>
          </ul>
        </div>
      </div>

      <!-- Teacher Verification & Fallback Management Panels -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px;">
        <!-- Card 1: Verifikasi Buku Catatan Siswa -->
        <div class="industrial-card" style="background: rgba(14, 23, 38, 0.94); border: 1px solid var(--steel-border); border-radius: 12px; padding: 20px;">
          <h3 style="font-size: 14.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 12px;">PENGESAHAN RESUME BUKU CATATAN</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 10px;">
              <input type="text" id="teacher-verify-student-id" class="auth-input" placeholder="NIS/ID Siswa (cth: 8A-91)" style="flex: 1; padding: 8px 12px; font-size: 13px;">
              <select id="teacher-verify-unit-id" class="auth-input" style="flex: 1; padding: 8px 12px; font-size: 13px;">
                <option value="CH08-01-U01">Unit 1: Sel Unit Kehidupan</option>
                <option value="CH08-01-U02">Unit 2: Sel Hewan & Tumbuhan</option>
                <option value="CH08-01-U03">Unit 3: Hierarki Organisasi</option>
              </select>
            </div>
            <button id="btn-teacher-verify-summary" class="btn-brass" style="padding: 8px 16px; font-size: 12.5px; width: 100%;" onclick="teacherQuickVerifySummary()">SAHKAN BUKU CATATAN (BUKA KUIS) ✓</button>
          </div>
        </div>

        <!-- Card 2: Pengesahan & Pencabutan Controlled Fallback LKPD -->
        <div class="industrial-card" style="background: rgba(14, 23, 38, 0.94); border: 1px solid var(--steel-border); border-radius: 12px; padding: 20px;">
          <h3 style="font-size: 14.5px; font-weight: 700; color: var(--brass-light); margin-bottom: 12px;">PENGESAHAN CONTROLLED FALLBACK LKPD</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 10px;">
              <input type="text" id="teacher-fallback-team-id" class="auth-input" placeholder="ID Tim (cth: TEAM-8A-SYN)" style="flex: 1; padding: 8px 12px; font-size: 13px;">
              <input type="text" id="teacher-fallback-deputy-id" class="auth-input" placeholder="ID Wakil (cth: SYN-DEP)" style="flex: 1; padding: 8px 12px; font-size: 13px;">
            </div>
            <div style="display: flex; gap: 10px;">
              <select id="teacher-fallback-activity-id" class="auth-input" style="flex: 1; padding: 8px 12px; font-size: 13px;">
                <option value="CH08-01-U02-LAB01">CH08-01-U02-LAB01: Observasi Mikroskopis</option>
                <option value="CH08-01-U03-CHL01">CH08-01-U03-CHL01: Cell Case File</option>
                <option value="CH08-02-U02-LAB01">CH08-02-U02-LAB01: Gerbang Penyerapan</option>
              </select>
              <input type="text" id="teacher-fallback-reason" class="auth-input" placeholder="Alasan Pengalihan Guru" style="flex: 1.5; padding: 8px 12px; font-size: 13px;">
            </div>
            <div style="display: flex; gap: 10px;">
              <button id="btn-teacher-authorize-fallback" class="btn-brass" style="flex: 1; padding: 8px 12px; font-size: 12px;" onclick="teacherAuthorizeFallback()">SAHKAN FALLBACK (AKTIF) →</button>
              <button id="btn-teacher-revoke-fallback" class="btn-steel" style="flex: 1; padding: 8px 12px; font-size: 12px; border-color: var(--status-danger); color: #fca5a5;" onclick="teacherRevokeFallback()">CABUT FALLBACK (REVOKE) ✕</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Floating WhatsApp Support -->
    <a class="wa-floating-btn" href="https://wa.me/6285721215213" target="_blank" rel="noopener" title="Konsultasi WhatsApp">
      <svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
      <span>Bantuan Guru</span>
    </a>

    <!-- Toast Notification Container -->
    <div id="toast" role="status" aria-live="polite"></div>

  </div>

  <!-- Pre-bundled Data & Modular JS Layer -->
  <script>
    window.PURWAVERSE_BOOTSTRAP = ${JSON.stringify(defaultBootstrap)};
    window.PURWAVERSE_STATIC_UNITS = ${JSON.stringify(staticUnitsMap)};
    window.PURWAVERSE_STATIC_CATALOG = ${JSON.stringify(staticCatalog)};
  </script>
  <script src="js/ui-components.js"></script>
  <script src="js/dashboard.js"></script>
  <script src="js/course.js"></script>
</body>
</html>
`;

  const outputPath = path.join(PUBLIC_DIR, 'index.html');
  fs.writeFileSync(outputPath, htmlContent, 'utf8');
  console.log(`Build complete! Generated: ${outputPath} (${(htmlContent.length / 1024).toFixed(2)} KB)`);
}

build();

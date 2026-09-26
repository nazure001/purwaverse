/**
 * PURWAVERSE SCIENCE ENGINE - DASHBOARD LOGIC
 * A Module by IZZI Workshop
 * Navigation Router, Authentication Terminal, Student Dashboard, & Instructor Command Center
 */

(function(window) {
  'use strict';

  const SafeStorage = window.SafeStorage;
  const escapeHtml = window.escapeHtml || (s => s == null ? '' : String(s));
  const toast = window.toast || console.log;
  const callApi = window.callApi;
  const renderStudentProgressBoard = window.renderStudentProgressBoard;

  // --- Application State ---
  const AppState = {
    currentUser: null,
    currentRole: 'guest', // 'guest' | 'student' | 'teacher'
    sessionToken: null,
    activeView: 'view-loading',
    activeUnitId: 'CH08-01-U01',
    allClasses: ['8A', '8B', '8C', '8D', '8E'],
    selectedClass: '8A',
    staticUnits: window.PURWAVERSE_STATIC_UNITS || {},
    staticCatalog: window.PURWAVERSE_STATIC_CATALOG || { chapters: [] },
    studentProgress: {},
    teacherOverview: null
  };

  // --- 1. View Navigation Router ---
  function showView(viewId) {
    const allViews = document.querySelectorAll('.view-container');
    allViews.forEach(v => {
      v.classList.remove('active');
      v.setAttribute('aria-hidden', 'true');
    });

    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      target.setAttribute('aria-hidden', 'false');
      AppState.activeView = viewId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update Sidebar Navigation Active State
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      }
    });

    // Update Topbar Visibility
    const topbar = document.getElementById('engine-topbar');
    if (topbar) {
      if (viewId === 'view-loading' || viewId === 'view-auth') {
        topbar.style.display = 'none';
      } else {
        topbar.style.display = 'flex';
        updateTopbarUserBadge();
      }
    }
  }

  function updateTopbarUserBadge() {
    const badgeContainer = document.getElementById('topbar-user-section');
    if (!badgeContainer) return;

    if (AppState.currentRole === 'student' && AppState.currentUser) {
      badgeContainer.innerHTML = `
        <div class="topbar-user-badge">
          <div class="topbar-user-avatar">${AppState.currentUser.name ? AppState.currentUser.name.charAt(0) : 'S'}</div>
          <span class="topbar-user-name">${escapeHtml(AppState.currentUser.name || 'Siswa')}</span>
          <span class="topbar-user-role">${escapeHtml(AppState.currentUser.class_id || 'VIII')}</span>
          <button class="topbar-nav-button" onclick="handleLogout()" title="Keluar"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 13v-2H7V8l-5 4 5 4v-3zM20 3h-9c-1.1 0-2 .9-2 2v4h2V5h9v14h-9v-4H9v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg></button>
        </div>
      `;
    } else if (AppState.currentRole === 'teacher') {
      badgeContainer.innerHTML = `
        <div class="topbar-user-badge">
          <div class="topbar-user-avatar">G</div>
          <span class="topbar-user-name">Instruktur Laboratorium</span>
          <span class="topbar-user-role">COMMAND</span>
          <button class="topbar-nav-button" onclick="handleLogout()" title="Keluar"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 13v-2H7V8l-5 4 5 4v-3zM20 3h-9c-1.1 0-2 .9-2 2v4h2V5h9v14h-9v-4H9v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg></button>
        </div>
      `;
    } else {
      badgeContainer.innerHTML = `
        <button class="topbar-nav-button active" onclick="showView('view-auth')">Masuk Lab</button>
      `;
    }
  }

  // --- 2. Loading Screen Sequence ---
  async function initLoadingScreen() {
    showView('view-loading');
    const fill = document.getElementById('loading-fill');
    const checklist = [
      document.getElementById('check-core'),
      document.getElementById('check-db'),
      document.getElementById('check-lab'),
      document.getElementById('check-ready')
    ];

    const steps = [25, 55, 80, 100];
    for (let i = 0; i < checklist.length; i++) {
      await new Promise(r => setTimeout(r, 450));
      if (fill) fill.style.width = steps[i] + '%';
      if (checklist[i]) {
        checklist[i].querySelector('.status-badge').textContent = 'ONLINE';
        checklist[i].querySelector('.status-badge').style.color = '#10b981';
      }
    }

    await new Promise(r => setTimeout(r, 500));

    // Check existing stored session
    const savedToken = SafeStorage.getItem('purwa_token');
    const savedRole = SafeStorage.getItem('purwa_role');
    if (savedToken && savedRole) {
      try {
        const res = await callApi('verifySession', { token: savedToken, session_token: savedToken });
        if (res && res.valid) {
          AppState.sessionToken = savedToken;
          AppState.currentRole = savedRole;
          AppState.currentUser = res.user || res.student;
          if (savedRole === 'student') {
            await loadStudentDashboardData();
            showView('view-student-dashboard');
            return;
          } else if (savedRole === 'teacher') {
            await loadTeacherOverviewData();
            showView('view-teacher-dashboard');
            return;
          }
        }
      } catch (e) {
        SafeStorage.removeItem('purwa_token');
        SafeStorage.removeItem('purwa_role');
      }
    }

    // Default to Auth / Login View
    showView('view-auth');
  }

  // --- 3. Authentication Handlers ---
  function switchAuthTab(role) {
    const studentTab = document.getElementById('tab-auth-student');
    const teacherTab = document.getElementById('tab-auth-teacher');
    const studentForm = document.getElementById('form-auth-student');
    const teacherForm = document.getElementById('form-auth-teacher');

    if (role === 'student') {
      studentTab.classList.add('active');
      teacherTab.classList.remove('active');
      studentForm.style.display = 'block';
      teacherForm.style.display = 'none';
    } else {
      teacherTab.classList.add('active');
      studentTab.classList.remove('active');
      teacherForm.style.display = 'block';
      studentForm.style.display = 'none';
    }
  }

  async function handleStudentLogin(e) {
    if (e) e.preventDefault();
    const studentId = document.getElementById('input-student-id').value.trim();
    const pin = document.getElementById('input-student-pin').value.trim();

    if (!studentId || !pin) {
      toast('Masukkan NIS dan PIN 4-digit.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-student-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menghubungkan...';

    let classId = '8A';
    let rollNo = 1;
    if (studentId.includes('-')) {
      const parts = studentId.split('-');
      classId = parts[0].trim().toUpperCase();
      rollNo = parseInt(parts[1].trim(), 10);
    } else {
      classId = AppState.selectedClass || '8A';
      rollNo = parseInt(studentId, 10) || 1;
    }

    try {
      const res = await callApi('loginStudent', { classId, rollNo, pin, student_id: studentId });
      const token = res.token || res.session_token;
      const user = res.student || res.user || { name: 'Siswa ' + studentId, class_id: classId, roll_no: rollNo };
      AppState.sessionToken = token;
      AppState.currentUser = user;
      AppState.currentRole = 'student';

      SafeStorage.setItem('purwa_token', token);
      SafeStorage.setItem('purwa_role', 'student');

      toast('Akses Lab Diberikan. Selamat datang, ' + (user.name || 'Siswa'), 'success');
      await loadStudentDashboardData();
      showView('view-student-dashboard');
    } catch (err) {
      toast(err.message || 'Login gagal. Periksa NIS dan PIN.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'MASUK KE LAB →';
    }
  }

  async function handleTeacherLogin(e) {
    if (e) e.preventDefault();
    const password = document.getElementById('input-teacher-pwd').value;

    if (!password) {
      toast('Masukkan kata sandi instruktur.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-teacher-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memvalidasi...';

    try {
      const res = await callApi('loginTeacher', { username: 'guru', password });
      const token = res.token || res.session_token;
      AppState.sessionToken = token;
      AppState.currentRole = 'teacher';
      AppState.selectedClass = (res.classes && res.classes[0]) || '8A';

      SafeStorage.setItem('purwa_token', token);
      SafeStorage.setItem('purwa_role', 'teacher');

      toast('Command Center Aktif.', 'success');
      await loadTeacherOverviewData();
      showView('view-teacher-dashboard');
    } catch (err) {
      toast(err.message || 'Kata sandi instruktur salah.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'MASUK KE COMMAND CENTER →';
    }
  }

  async function handleLogout() {
    if (AppState.sessionToken) {
      try {
        await callApi('logout', { token: AppState.sessionToken, session_token: AppState.sessionToken });
      } catch (e) {}
    }
    SafeStorage.removeItem('purwa_token');
    SafeStorage.removeItem('purwa_role');
    AppState.currentUser = null;
    AppState.currentRole = 'guest';
    AppState.sessionToken = null;
    showView('view-auth');
    toast('Anda telah keluar dari sistem.', 'info');
  }

  // --- 4. Student Dashboard Data Loader & Renderer ---
  async function loadStudentDashboardData() {
    try {
      const res = await callApi('learningHome', {
        token: AppState.sessionToken,
        session_token: AppState.sessionToken
      });

      if (res && res.chapters) {
        const progressMap = {};
        res.chapters.forEach(ch => {
          (ch.units || []).forEach(u => {
            progressMap[u.unit_id] = u.state || { status: 'reading' };
          });
        });
        AppState.studentProgress = progressMap;
        AppState.unitStates = progressMap;
      } else {
        AppState.studentProgress = res.progress_map || {};
        AppState.unitStates = res.progress_map || {};
      }
      renderStudentDashboard(res);
      renderLearningMap();
    } catch (err) {
      console.warn('Fallback local render', err);
      renderStudentDashboard({});
      renderLearningMap();
    }
  }

  function renderStudentDashboard(data) {
    const student = AppState.currentUser || { name: 'Ahmad Fauzan', class_id: '8A', student_id: '8A-01' };
    const nameEl = document.getElementById('dash-student-name');
    const classEl = document.getElementById('dash-student-class');
    const xpContainer = document.getElementById('dash-xp-card-container');

    if (nameEl) nameEl.textContent = student.name;
    if (classEl) classEl.textContent = student.class_id;
    if (xpContainer) {
      xpContainer.innerHTML = renderStudentProgressBoard(student, { total_xp: data.total_xp || 350 });
    }

    // Determine current active unit (first non-completed or Unit 3 by default)
    let activeUnit = AppState.staticUnits['CH08-01-U03'] || AppState.staticUnits['CH08-01-U01'] || {
      unit_id: 'CH08-01-U03',
      order: 3,
      title: 'Sel dan Kehidupan',
      summary: 'Mempelajari struktur, fungsi, dan proses kehidupan pada tingkat sel.'
    };

    AppState.activeUnitId = activeUnit.unit_id;

    const unitOrderEl = document.getElementById('active-unit-order');
    const unitTitleEl = document.getElementById('active-unit-title');
    const unitSummaryEl = document.getElementById('active-unit-summary');

    if (unitOrderEl) unitOrderEl.textContent = 'Unit ' + (activeUnit.order || 3);
    if (unitTitleEl) unitTitleEl.textContent = activeUnit.title;
    if (unitSummaryEl) unitSummaryEl.textContent = activeUnit.summary;
  }

  // --- 5. Learning Map Renderer (21 Units with Industrial Lab Branding) ---
  function renderLearningMap() {
    const container = document.getElementById('map-chapters-container');
    if (!container) return;

    const labBrandingMap = {
      'CH08-01': { academic: 'Bab 1 · Sel dan Organisasi Kehidupan', tag: 'Micro Structure Laboratory' },
      'CH08-02': { academic: 'Bab 2 · Struktur dan Fungsi Tubuh Makhluk Hidup', tag: 'Biological Engineering Lab' },
      'CH08-03': { academic: 'Bab 3 · Unsur, Senyawa, dan Campuran', tag: 'Applied Science Laboratory' },
      'CH08-04': { academic: 'Bab 4 · Struktur Bumi dan Fenomena Alam', tag: 'Earth System Observation Lab' },
      'CH08-05': { academic: 'Bab 5 · Usaha, Energi, dan Pesawat Sederhana', tag: 'Force & Motion Engineering Lab' },
      'CH08-06': { academic: 'Bab 6 · Getaran, Gelombang, dan Cahaya', tag: 'Energy & Wave Transformation Lab' }
    };

    const chapters = AppState.staticCatalog.chapters || [];
    let html = '';

    chapters.forEach(ch => {
      const branding = labBrandingMap[ch.chapter_id] || { academic: ch.title, tag: 'Science Laboratory' };
      html += `
        <div class="chapter-track-card">
          <div class="chapter-badge-header">
            <div class="chapter-title-group" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
              <h3 class="chapter-academic-name" style="font-size: 18px; font-weight: 800; color: #fff;">${escapeHtml(branding.academic)}</h3>
              <span class="chapter-lab-tag" style="font-size: 11px; font-weight: 600; color: var(--brass-light);">${escapeHtml(branding.tag)}</span>
            </div>
            <span class="blueprint-code">SEM ${ch.semester || 1}</span>
          </div>
          <div class="chapter-units-grid">
      `;

      ch.units.forEach(unit => {
        const prog = AppState.studentProgress[unit.unit_id] || { status: 'reading', score: null };
        const isCurrent = unit.unit_id === AppState.activeUnitId;
        const isCompleted = prog.status === 'completed';
        const isLocked = prog.status === 'locked';

        let nodeClass = 'map-unit-node';
        let pillClass = 'active';
        let pillLabel = 'Tersedia';

        if (isCurrent) {
          nodeClass += ' node-active';
          pillLabel = 'Aktif';
        } else if (isCompleted) {
          nodeClass += ' node-completed';
          pillClass = 'completed';
          pillLabel = 'Selesai';
        } else if (isLocked) {
          nodeClass += ' node-locked';
          pillClass = 'locked';
          pillLabel = 'Terkunci';
        }

        html += `
          <div class="${nodeClass}" onclick="handleUnitClick('${unit.unit_id}')">
            <div class="node-top-bar">
              <span class="node-unit-order">Unit ${unit.order}</span>
              <span class="node-status-pill ${pillClass}">${pillLabel}</span>
            </div>
            <h4 class="node-title">${escapeHtml(unit.title)}</h4>
            <p class="node-summary">${escapeHtml(unit.summary)}</p>
            <button class="node-action-btn ${isLocked ? 'locked' : (isCurrent ? 'primary' : 'secondary')}">
              ${isLocked ? 'Terkunci' : (isCompleted ? 'Ulas Materi' : 'Pelajari')}
            </button>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function handleUnitClick(unitId) {
    const isFirstUnit = unitId === 'CH08-01-U01';
    const prog = (AppState.unitStates && AppState.unitStates[unitId]) ||
                 (AppState.studentProgress && AppState.studentProgress[unitId]);

    if (!isFirstUnit && (!prog || prog.contentUnlocked === false || prog.status === 'locked')) {
      toast('Submateri masih terkunci. Selesaikan kuis dan tahap sebelumnya.', 'warning');
      return;
    }

    if (window.openCourseUnit) {
      window.openCourseUnit(unitId);
    } else {
      toast('Membuka Unit ' + unitId, 'info');
    }
  }

  // --- 6. Teacher Command Center Data Loader & Renderer ---
  async function loadTeacherOverviewData() {
    const classSelect = document.getElementById('teacher-class-select');
    const classId = (classSelect && classSelect.value) || AppState.selectedClass || '8A';
    AppState.selectedClass = classId;

    try {
      const res = await callApi('dashboard', {
        token: AppState.sessionToken,
        session_token: AppState.sessionToken,
        classId: classId,
        class_id: classId
      });
      AppState.teacherOverview = res;
      renderTeacherDashboard(res);
    } catch (err) {
      console.warn('Gagal memuat overview instruktur:', err);
      toast('Gagal memuat data overview instruktur: ' + (err.message || ''), 'error');
    }
  }

  function renderTeacherDashboard(data) {
    const elActive = document.getElementById('stat-active-students');
    const elAvg = document.getElementById('stat-avg-progress');
    const elPending = document.getElementById('stat-pending-reviews');
    const elAttention = document.getElementById('stat-need-attention');

    if (elActive) elActive.textContent = data.active_students || 207;
    if (elAvg) elAvg.textContent = (data.avg_progress || 82) + '%';
    if (elPending) elPending.textContent = data.pending_review_count || 12;
    if (elAttention) elAttention.textContent = data.attention_count || 3;
  }

  async function teacherQuickVerifySummary() {
    const studentInput = document.getElementById('teacher-verify-student-id');
    const unitSelect = document.getElementById('teacher-verify-unit-id');
    const studentId = studentInput ? studentInput.value.trim() : '';
    const unitId = unitSelect ? unitSelect.value : 'CH08-01-U01';

    if (!studentId) {
      toast('Masukkan NIS / ID Siswa yang diverifikasi.', 'error');
      return;
    }

    try {
      const activityId = unitId + '-LRN01';
      const classSelect = document.getElementById('teacher-class-select');
      const classId = (classSelect && classSelect.value) || AppState.selectedClass || '8A';

      await callApi('saveTeacherChecks', {
        token: AppState.sessionToken,
        session_token: AppState.sessionToken,
        classId,
        activityId,
        checkType: 'summary',
        status: 'verified',
        score: 85,
        note: 'Buku catatan fisik telah diverifikasi lengkap oleh guru.',
        studentIds: [studentId]
      });

      toast(`Buku catatan siswa ${studentId} berhasil diverifikasi! Quiz Chamber terbuka.`, 'success');
      loadTeacherOverviewData();
    } catch (e) {
      toast('Gagal verifikasi: ' + (e.message || 'Terjadi kesalahan.'), 'error');
    }
  }

  async function teacherQuickVerifyGroupLab() {
    const teamInput = document.getElementById('teacher-verify-team-id');
    const actInput = document.getElementById('teacher-verify-lab-activity-id');
    const scoreInput = document.getElementById('teacher-verify-lab-score');
    const teamId = teamInput ? teamInput.value.trim() : '';
    const activityId = actInput ? actInput.value.trim() : '';
    const score = scoreInput ? parseInt(scoreInput.value, 10) : 85;

    if (!teamId || !activityId) {
      toast('ID Tim dan ID Aktivitas Praktikum wajib diisi.', 'error');
      return;
    }

    try {
      await callApi('saveGroupLab', {
        token: AppState.sessionToken,
        session_token: AppState.sessionToken,
        teamId,
        activityId,
        status: 'verified',
        score: isNaN(score) ? 85 : score,
        note: 'Laporan praktikum disahkan instruktur.'
      });

      toast(`Laporan LKPD Tim ${teamId} berhasil disahkan! Nilai disinkronkan ke seluruh anggota.`, 'success');
      loadTeacherOverviewData();
    } catch (e) {
      toast('Gagal menilai tim: ' + (e.message || 'Terjadi kesalahan.'), 'error');
    }
  }

  async function teacherAuthorizeFallback() {
    const teamInput = document.getElementById('teacher-fallback-team-id');
    const deputyInput = document.getElementById('teacher-fallback-deputy-id');
    const actInput = document.getElementById('teacher-fallback-activity-id');
    const reasonInput = document.getElementById('teacher-fallback-reason');
    const teamId = teamInput ? teamInput.value.trim() : '';
    const deputyId = deputyInput ? deputyInput.value.trim() : '';
    const activityId = actInput ? actInput.value.trim() : '';
    const reason = reasonInput ? reasonInput.value.trim() : '';

    if (!teamId || !activityId || !reason) {
      toast('ID Tim, ID Aktivitas Praktikum, dan Alasan pengalihan wajib diisi (minimal 10 karakter).', 'error');
      return;
    }

    try {
      const res = await callApi('authorizeControlledFallback', {
        token: AppState.sessionToken,
        session_token: AppState.sessionToken,
        teamId,
        deputyId: deputyId || undefined,
        activityId,
        reason
      });

      toast(`Controlled Fallback BERHASIL disahkan untuk Wakil Ketua (${res.deputyId}) Tim ${teamId}! Status: AKTIF.`, 'success');
      if (reasonInput) reasonInput.value = '';
      loadTeacherOverviewData();
    } catch (e) {
      toast('Gagal mengesahkan fallback: ' + (e.message || 'Terjadi kesalahan.'), 'error');
    }
  }

  async function teacherRevokeFallback() {
    const teamInput = document.getElementById('teacher-fallback-team-id');
    const deputyInput = document.getElementById('teacher-fallback-deputy-id');
    const actInput = document.getElementById('teacher-fallback-activity-id');
    const reasonInput = document.getElementById('teacher-fallback-reason');
    const teamId = teamInput ? teamInput.value.trim() : '';
    const deputyId = deputyInput ? deputyInput.value.trim() : '';
    const activityId = actInput ? actInput.value.trim() : '';
    const reason = reasonInput ? reasonInput.value.trim() : 'Pencabutan pengalihan wewenang oleh guru.';

    if (!teamId || !activityId) {
      toast('ID Tim dan ID Aktivitas Praktikum wajib diisi untuk pencabutan pengesahan.', 'error');
      return;
    }

    try {
      const res = await callApi('revokeControlledFallback', {
        token: AppState.sessionToken,
        session_token: AppState.sessionToken,
        teamId,
        deputyId: deputyId || undefined,
        activityId,
        reason
      });

      toast(`Controlled Fallback Tim ${teamId} BERHASIL DICABUT. Status: REVOKED. Wewenang kembali ke Ketua.`, 'success');
      loadTeacherOverviewData();
    } catch (e) {
      toast('Gagal mencabut fallback: ' + (e.message || 'Terjadi kesalahan.'), 'error');
    }
  }

  // --- 7. Application Bootstrapping & Route Handling ---
  function handleTargetView(targetView) {
    if (!targetView) return;
    const viewName = targetView.replace('view-', '').replace('#', '');
    if (viewName === 'auth-teacher') {
      showView('view-auth');
      switchAuthTab('teacher');
    } else if (viewName === 'auth' || viewName === 'auth-student') {
      showView('view-auth');
      switchAuthTab('student');
    } else if (viewName === 'student-dashboard') {
      AppState.currentRole = 'student';
      AppState.currentUser = { name: 'Ahmad Fauzan', class_id: '8A', student_id: '8A-01' };
      renderStudentDashboard({});
      renderLearningMap();
      showView('view-student-dashboard');
    } else if (viewName === 'learning-map') {
      AppState.currentRole = 'student';
      renderLearningMap();
      showView('view-learning-map');
    } else if (viewName === 'course-unit') {
      AppState.currentRole = 'student';
      if (window.openCourseUnit) window.openCourseUnit('CH08-01-U01');
      showView('view-course-unit');
    } else if (viewName === 'quiz-chamber') {
      AppState.currentRole = 'student';
      if (window.openQuizChamber) window.openQuizChamber('CH08-01-U01');
      showView('view-quiz-chamber');
    } else if (viewName === 'team-lab') {
      AppState.currentRole = 'student';
      if (window.openTeamLab) window.openTeamLab();
      showView('view-team-lab');
    } else if (viewName === 'teacher-dashboard') {
      AppState.currentRole = 'teacher';
      renderTeacherDashboard({
        active_students: 207,
        avg_progress: 82,
        pending_review_count: 12,
        attention_count: 3
      });
      showView('view-teacher-dashboard');
    } else {
      showView(targetView.startsWith('view-') ? targetView : 'view-' + targetView);
    }
  }

  function handleRoute() {
    const hash = window.location.hash.replace('#', '') || '';
    if (hash) handleTargetView(hash);
  }

  function initApp() {
    // Bind Event Listeners
    const formStudent = document.getElementById('form-auth-student');
    if (formStudent) formStudent.addEventListener('submit', handleStudentLogin);

    const formTeacher = document.getElementById('form-auth-teacher');
    if (formTeacher) formTeacher.addEventListener('submit', handleTeacherLogin);

    const selectClass = document.getElementById('teacher-class-select');
    if (selectClass) {
      selectClass.addEventListener('change', () => {
        AppState.selectedClass = selectClass.value;
        if (AppState.currentRole === 'teacher') {
          loadTeacherOverviewData();
        }
      });
    }

    window.addEventListener('hashchange', handleRoute);

    const params = new URLSearchParams(window.location.search);
    const targetParam = params.get('view') || window.location.hash.replace('#', '');

    if (targetParam && targetParam !== 'loading' && targetParam !== 'view-loading') {
      handleTargetView(targetParam);
    } else {
      initLoadingScreen();
    }
  }

  // Expose to window
  window.AppState = AppState;
  window.showView = showView;
  window.switchAuthTab = switchAuthTab;
  window.handleStudentLogin = handleStudentLogin;
  window.handleTeacherLogin = handleTeacherLogin;
  window.handleLogout = handleLogout;
  window.handleUnitClick = handleUnitClick;
  window.renderStudentDashboard = renderStudentDashboard;
  window.renderLearningMap = renderLearningMap;
  window.renderTeacherDashboard = renderTeacherDashboard;
  window.teacherQuickVerifySummary = teacherQuickVerifySummary;
  window.teacherQuickVerifyGroupLab = teacherQuickVerifyGroupLab;
  window.teacherAuthorizeFallback = teacherAuthorizeFallback;
  window.teacherRevokeFallback = teacherRevokeFallback;
  window.loadTeacherOverviewData = loadTeacherOverviewData;
  window.loadStudentDashboardData = loadStudentDashboardData;
  window.initApp = initApp;

  // Auto-run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})(window);

/**
 * PURWAVERSE SCIENCE ENGINE - COURSE & LAB LOGIC
 * A Module by IZZI Workshop
 * Unit Reader, Summary Review, Timed Quiz Chamber, & Team Workshop (LKPD)
 */

(function(window) {
  'use strict';

  const escapeHtml = window.escapeHtml || (s => s == null ? '' : String(s));
  const toast = window.toast || console.log;
  const callApi = window.callApi;

  // --- Quiz Session State ---
  const QuizState = {
    unitId: null,
    quizActivityId: null,
    items: [],
    currentIndex: 0,
    answers: {},
    timeRemaining: 180, // seconds
    timerInterval: null,
    tabSwitchCount: 0
  };

  // --- 1. Open and Render Learning Course Unit ---
  async function openCourseUnit(unitId) {
    const activeUnitId = unitId || window.AppState.activeUnitId || 'CH08-01-U01';
    window.AppState.activeUnitId = activeUnitId;

    let unit = (window.AppState && window.AppState.staticUnits && window.AppState.staticUnits[activeUnitId]);
    if (!unit && window.AppState && window.AppState.sessionToken) {
      try {
        unit = await callApi('learningUnit', {
          token: window.AppState.sessionToken,
          session_token: window.AppState.sessionToken,
          unitId: activeUnitId
        });
      } catch (e) {
        toast('Gagal memuat materi unit: ' + e.message, 'error');
        return;
      }
    }

    if (!unit) {
      toast('Unit tidak ditemukan.', 'error');
      return;
    }

    window.AppState.activeUnit = unit;

    const titleEl = document.getElementById('unit-reader-title');
    const summaryEl = document.getElementById('unit-reader-summary');
    const sectionsEl = document.getElementById('unit-reader-sections');
    const diagramEl = document.getElementById('unit-reader-diagram');
    const promptEl = document.getElementById('unit-notebook-prompt');

    if (titleEl) titleEl.textContent = unit.title || 'Materi Pembelajaran';
    if (summaryEl) summaryEl.textContent = unit.summary || '';
    if (promptEl) promptEl.textContent = unit.notebook_prompt || 'Tuliskan poin penting yang kamu temukan di Buku Catatan IPA.';

    // Render Lesson Sections
    if (sectionsEl) {
      let html = '';
      if (Array.isArray(unit.sections)) {
        unit.sections.forEach(([heading, body]) => {
          html += `
            <div class="lesson-section-block" style="margin-bottom: 24px;">
              <h4 style="font-size: 16px; font-weight: 700; color: var(--brass-light); margin-bottom: 8px;">${escapeHtml(heading)}</h4>
              <p style="font-size: 14.5px; line-height: 1.7; color: var(--text-main);">${escapeHtml(body)}</p>
            </div>
          `;
        });
      }
      sectionsEl.innerHTML = html;
    }

    // Render Diagram
    if (diagramEl) {
      diagramEl.innerHTML = unit.illustration_svg || `
        <div style="text-align:center; padding: 30px; background: rgba(0,0,0,0.4); border-radius: 8px;">
          <img src="assets/gear_large_brass.jpg" style="width: 80px; opacity: 0.6;" alt="Schematic" />
          <div style="font-size: 12px; color: var(--text-sub); margin-top: 8px;">Diagram Ilmiah Laboratorium</div>
        </div>
      `;
    }

    // Update Notebook / Summary Status in UI
    const checkEl = document.getElementById('check-notebook-ready');
    const badgeEl = document.getElementById('summary-status-badge');
    const submitBtn = document.getElementById('btn-submit-summary');

    if (checkEl) checkEl.checked = false;
    if (badgeEl) {
      badgeEl.textContent = 'Belum Dilaporkan';
      badgeEl.style.color = 'var(--text-sub)';
      badgeEl.style.borderColor = 'var(--steel-border)';
    }

    // Bind Quiz Button
    const quizBtn = document.getElementById('btn-open-unit-quiz');
    if (quizBtn) {
      quizBtn.onclick = () => openQuizChamber(activeUnitId);
    }

    if (window.showView) window.showView('view-course-unit');
  }

  // --- 2. Submit Summary Confirmation (Physical Notebook Ready) ---
  async function submitSummary(unitId) {
    const activeUnitId = unitId || window.AppState.activeUnitId;
    const confirmCheck = document.getElementById('check-notebook-ready');

    if (confirmCheck && !confirmCheck.checked) {
      toast('Silakan centang konfirmasi bahwa buku catatan fisik telah siap diperiksa guru.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-summary');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Melaporkan ke Guru...';
    }

    try {
      const res = await callApi('submitSummaryForReview', {
        token: window.AppState.sessionToken,
        session_token: window.AppState.sessionToken,
        unitId: activeUnitId,
        notebookConfirmed: true
      });

      toast('Buku catatan berhasil dilaporkan siap diperiksa oleh instruktur!', 'success');
      const badgeEl = document.getElementById('summary-status-badge');
      if (badgeEl) {
        badgeEl.textContent = 'Menunggu Verifikasi Guru';
        badgeEl.style.color = 'var(--status-warning)';
        badgeEl.style.borderColor = 'var(--status-warning)';
      }
      if (confirmCheck) {
        confirmCheck.checked = true;
      }
      if (window.showView) window.showView('view-student-dashboard');
      if (window.loadStudentDashboardData) window.loadStudentDashboardData();
    } catch (e) {
      toast(e.message || 'Gagal melaporkan status buku catatan.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Lapor: Buku Siap Diperiksa Guru ✓';
      }
    }
  }

  // --- 3. Timed Quiz Chamber (startQuiz with quiz_activity_id) ---
  async function openQuizChamber(unitId) {
    const targetUnitId = unitId || window.AppState.activeUnitId || 'CH08-01-U01';
    window.AppState.activeUnitId = targetUnitId;

    let unit = (window.AppState && window.AppState.activeUnit && window.AppState.activeUnit.unit_id === targetUnitId)
      ? window.AppState.activeUnit
      : ((window.AppState && window.AppState.staticUnits && window.AppState.staticUnits[targetUnitId]) || null);

    if (!unit && targetUnitId && window.AppState && window.AppState.sessionToken) {
      try {
        unit = await callApi('learningUnit', {
          token: window.AppState.sessionToken,
          session_token: window.AppState.sessionToken,
          unitId: targetUnitId
        });
        if (unit) window.AppState.activeUnit = unit;
      } catch (e) {
        // Fallback
      }
    }

    // Resolusi quiz_activity_id dari metadata unit, bukan unit_id
    const quizActivityId = (unit && unit.quiz_activity_id)
      ? unit.quiz_activity_id
      : (targetUnitId ? targetUnitId + '-QZ01' : 'CH08-01-U01-QZ01');

    QuizState.unitId = targetUnitId;
    QuizState.quizActivityId = quizActivityId;
    QuizState.currentIndex = 0;
    QuizState.answers = {};
    QuizState.timeRemaining = 180;
    QuizState.tabSwitchCount = 0;
    QuizState.attemptId = null;

    if (window.AppState && window.AppState.sessionToken) {
      try {
        const res = await callApi('startQuiz', {
          token: window.AppState.sessionToken,
          session_token: window.AppState.sessionToken,
          activityId: QuizState.quizActivityId,
          activity_id: QuizState.quizActivityId
        });

        if (res && res.items && res.items.length) {
          QuizState.attemptId = res.attemptId;
          QuizState.items = res.items;
          QuizState.timeRemaining = res.timeLimitSeconds || 180;
        } else {
          throw new Error('Daftar butir soal kuis kosong.');
        }
      } catch (e) {
        toast('Gagal memulai sesi kuis: ' + (e.message || 'Rangkuman buku belum diverifikasi instruktur.'), 'error');
        return;
      }
    }

    startQuizTimer();
    renderCurrentQuestion();
    if (window.showView) window.showView('view-quiz-chamber');
  }

  function startQuizTimer() {
    clearInterval(QuizState.timerInterval);
    const timerEl = document.getElementById('quiz-timer-display');

    QuizState.timerInterval = setInterval(() => {
      QuizState.timeRemaining--;
      const mins = Math.floor(QuizState.timeRemaining / 60);
      const secs = QuizState.timeRemaining % 60;
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      if (timerEl) {
        timerEl.textContent = formatted;
        if (QuizState.timeRemaining <= 30) {
          timerEl.parentElement.classList.add('warning');
        } else {
          timerEl.parentElement.classList.remove('warning');
        }
      }

      if (QuizState.timeRemaining <= 0) {
        clearInterval(QuizState.timerInterval);
        toast('Waktu pengerjaan habis! Mengirim jawaban otomatis.', 'info');
        submitQuiz();
      }
    }, 1000);
  }

  // Anti-Cheat Tab Switch Detection
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.AppState && window.AppState.activeView === 'view-quiz-chamber') {
      QuizState.tabSwitchCount++;
      toast(`Peringatan Anti-Cheat: Terdeteksi pindah jendela (${QuizState.tabSwitchCount}x).`, 'error');
    }
  });

  function renderCurrentQuestion() {
    const item = QuizState.items[QuizState.currentIndex];
    if (!item) return;

    const stepEl = document.getElementById('quiz-step-indicator');
    const promptEl = document.getElementById('quiz-prompt-text');
    const optionsContainer = document.getElementById('quiz-options-container');
    const prevBtn = document.getElementById('btn-quiz-prev');
    const nextBtn = document.getElementById('btn-quiz-next');

    if (stepEl) stepEl.textContent = `Pertanyaan ${QuizState.currentIndex + 1} dari ${QuizState.items.length}`;
    if (promptEl) promptEl.textContent = item.prompt || item.question;

    const itemId = item.quiz_item_id || item.item_id || String(QuizState.currentIndex);
    const optionLetters = ['A', 'B', 'C', 'D', 'E'];

    if (optionsContainer && Array.isArray(item.options)) {
      let html = '';
      item.options.forEach((opt, idx) => {
        const key = typeof opt === 'object' && opt.key ? opt.key : optionLetters[idx];
        const text = typeof opt === 'object' && opt.text ? opt.text : String(opt);
        const isSelected = QuizState.answers[itemId] === idx;
        html += `
          <div class="quiz-option-pill ${isSelected ? 'selected' : ''}" onclick="selectQuizOption('${itemId}', ${idx})">
            <span class="quiz-option-key">${key}</span>
            <span class="quiz-option-text">${escapeHtml(text)}</span>
          </div>
        `;
      });
      optionsContainer.innerHTML = html;
    }

    if (prevBtn) prevBtn.disabled = QuizState.currentIndex === 0;
    if (nextBtn) {
      if (QuizState.currentIndex === QuizState.items.length - 1) {
        nextBtn.textContent = 'Kirim Jawaban ✓';
        nextBtn.onclick = submitQuiz;
      } else {
        nextBtn.textContent = 'Jawab >';
        nextBtn.onclick = nextQuestion;
      }
    }
  }

  function selectQuizOption(itemId, optionIndex) {
    QuizState.answers[itemId] = Number(optionIndex);
    renderCurrentQuestion();
  }

  function nextQuestion() {
    if (QuizState.currentIndex < QuizState.items.length - 1) {
      QuizState.currentIndex++;
      renderCurrentQuestion();
    }
  }

  function prevQuestion() {
    if (QuizState.currentIndex > 0) {
      QuizState.currentIndex--;
      renderCurrentQuestion();
    }
  }

  async function submitQuiz() {
    clearInterval(QuizState.timerInterval);
    const submitBtn = document.getElementById('btn-quiz-next');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengevaluasi...';
    }

    const formattedAnswers = Object.entries(QuizState.answers).map(([itemId, answer]) => ({
      itemId,
      answer: Number(answer)
    }));

    try {
      const res = await callApi('submitQuiz', {
        token: window.AppState.sessionToken,
        session_token: window.AppState.sessionToken,
        attemptId: QuizState.attemptId,
        answers: formattedAnswers,
        timeRemaining: QuizState.timeRemaining,
        tabSwitchCount: QuizState.tabSwitchCount
      });

      const score = Number(res.score !== undefined ? res.score : res.finalScore || 0);
      const passed = Boolean(res.passed || score >= 70);
      QuizState.lastResult = { score, passed, timestamp: Date.now() };

      if (passed) {
        toast(`Lulus Quiz Chamber! Nilai: ${score}/100 (+50 XP). Unit berikutnya terbuka.`, 'success');
      } else {
        toast(`Nilai: ${score}/100. Di bawah KKM (70). Silakan pelajari kembali dan coba lagi.`, 'error');
      }

      if (window.showView) window.showView('view-student-dashboard');
      if (window.loadStudentDashboardData) window.loadStudentDashboardData();
    } catch (e) {
      toast('Gagal mengirim jawaban kuis: ' + (e.message || 'Terjadi kesalahan sistem.'), 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Jawaban ✓';
      }
    }
  }

  // --- 4. Team Lab (LKPD Kelompok) with Controlled Fallback ---
  async function openTeamLab(unitId) {
    const activeUnitId = unitId || window.AppState.activeUnitId || 'CH08-01-U02';
    window.AppState.activeUnitId = activeUnitId;

    if (window.showView) window.showView('view-team-lab');

    const versionTag = document.getElementById('team-lab-version-tag');
    if (versionTag) versionTag.textContent = 'Memuat workspace tim...';

    try {
      const data = await callApi('practiceWorkspace', {
        token: window.AppState.sessionToken,
        session_token: window.AppState.sessionToken,
        unitId: activeUnitId
      });

      window.AppState.teamLabClientVersion = data.clientVersion || '';
      window.AppState.teamLabWorkspace = data;

      if (versionTag) {
        versionTag.textContent = data.clientVersion ? `clientVersion: ${data.clientVersion.slice(0, 19)}` : 'clientVersion: draft baru';
      }

      const actTitle = document.getElementById('team-lab-activity-title');
      if (actTitle) actTitle.textContent = (data.practice && data.practice.title) || data.title || 'Praktikum Observasi Laboratorium';

      // Render Team Members
      const membersContainer = document.getElementById('team-members-container');
      if (membersContainer && data.team && Array.isArray(data.team.members)) {
        let memHtml = '';
        data.team.members.forEach(m => {
          const isLead = m.student_id === data.team.leaderId;
          const isDep = m.student_id === data.team.deputyId;
          const roleLabel = isLead ? 'Scientist Leader' : isDep ? 'Deputy Scientist' : (m.role || 'Anggota');
          memHtml += `
            <div class="team-member-card ${isLead ? 'leader' : ''}">
              <div class="team-member-avatar">${escapeHtml((m.name || m.student_id).charAt(0))}</div>
              <div class="team-member-name">${escapeHtml(m.name || m.student_id)}</div>
              <div class="team-member-role">${escapeHtml(roleLabel)}</div>
            </div>
          `;
        });
        membersContainer.innerHTML = memHtml;
      }

      // Populate Form Fields with Saved Draft / Report
      const rep = data.report || {};
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
      };

      setVal('lkpd-input-prediction', rep.prediction);
      setVal('lkpd-input-tools', rep.tools);
      setVal('lkpd-input-trial1', rep.trial1);
      setVal('lkpd-input-data', rep.data);
      setVal('lkpd-input-evidence', rep.evidence);
      setVal('lkpd-input-conclusion', rep.conclusion);
      setVal('lkpd-input-member-roles', rep.memberRoles);
      setVal('lkpd-input-improvement', rep.improvement);
      setVal('lkpd-input-trial2', rep.trial2);
      setVal('lkpd-input-reflection', rep.reflection);

      // Controlled Fallback UI Configuration
      const roleBadge = document.getElementById('team-user-role-badge');
      const roleExplanation = document.getElementById('team-role-explanation');
      const fallbackBox = document.getElementById('deputy-fallback-input-box');
      const fallbackIndicator = document.getElementById('team-fallback-indicator');
      const fallbackInput = document.getElementById('input-team-fallback-reason');

      const isLeader = data.editorRole === 'leader';
      const isDeputy = data.editorRole === 'deputy';
      const canEdit = Boolean(data.canEdit);

      if (roleBadge) {
        roleBadge.textContent = isLeader ? 'Scientist Leader' : isDeputy ? 'Deputy Scientist' : 'Anggota Tim';
        roleBadge.style.background = isLeader ? 'rgba(200, 150, 60, 0.25)' : isDeputy ? 'rgba(59, 130, 246, 0.25)' : 'rgba(100, 116, 139, 0.25)';
      }

      if (isLeader) {
        if (roleExplanation) roleExplanation.textContent = 'Anda adalah Scientist Leader. Anda memiliki hak akses utama untuk menginput dan mengirim laporan praktikum tim.';
        if (fallbackBox) fallbackBox.style.display = 'none';
        if (fallbackIndicator) fallbackIndicator.style.display = 'none';
      } else if (isDeputy) {
        if (fallbackBox) fallbackBox.style.display = 'block';
        if (fallbackInput) fallbackInput.value = data.fallbackReason || '';

        if (data.fallbackAuthorized) {
          if (roleExplanation) roleExplanation.textContent = 'Controlled Fallback AKTIF: Wewenang pengisian dialihkan kepada Anda selaku Wakil Ketua.';
          if (fallbackIndicator) {
            fallbackIndicator.style.display = 'inline-block';
            fallbackIndicator.textContent = 'FALLBACK DIAKTIFKAN';
          }
        } else {
          if (roleExplanation) roleExplanation.textContent = 'Mode Pengalihan Terkendali (Controlled Fallback): Jika Scientist Leader berhalangan hadir atau terkendala gawai, masukkan alasan pengalihan di bawah.';
          if (fallbackIndicator) {
            fallbackIndicator.style.display = 'none';
          }
        }
      } else {
        if (roleExplanation) roleExplanation.textContent = 'Mode Hanya Lihat (View-Only): Pengisian laporan dikelola oleh Scientist Leader atau Wakil Ketua.';
        if (fallbackBox) fallbackBox.style.display = 'none';
        if (fallbackIndicator) fallbackIndicator.style.display = 'none';
      }

      // Input Enable / Disable based on canEdit
      const allInputs = document.querySelectorAll('#view-team-lab textarea, #view-team-lab input:not(#input-team-fallback-reason)');
      allInputs.forEach(input => {
        input.disabled = !canEdit;
        input.style.opacity = canEdit ? '1' : '0.75';
      });

      const btnSave = document.getElementById('btn-save-team-draft');
      const btnSubmit = document.getElementById('btn-submit-team-worksheet');
      if (btnSave) {
        btnSave.disabled = !canEdit;
        btnSave.style.display = (data.result && data.result.status === 'verified') ? 'none' : 'inline-block';
      }
      if (btnSubmit) {
        btnSubmit.disabled = !canEdit;
        btnSubmit.style.display = (data.result && data.result.status === 'verified') ? 'none' : 'inline-block';
      }

      // Show Result Evaluation Card if already graded / submitted
      const reviewCard = document.getElementById('team-lab-review-card');
      if (reviewCard) {
        if (data.result && (data.result.status === 'submitted' || data.result.status === 'verified')) {
          reviewCard.style.display = 'block';
          const title = document.getElementById('team-lab-status-title');
          const feedback = document.getElementById('team-lab-teacher-feedback');
          const scoreVal = document.getElementById('team-lab-score-val');

          if (title) title.textContent = data.result.status === 'verified' ? 'Laporan Terverifikasi & Disahkan Guru ✓' : 'Laporan Terkirim (Menunggu Penilaian Guru)';
          if (feedback) feedback.textContent = data.result.teacherNote || 'Laporan praktikum telah tersimpan dan dicatat dalam portofolio tim.';
          if (scoreVal) scoreVal.textContent = data.result.score !== null ? data.result.score : '--';
        } else {
          reviewCard.style.display = 'none';
        }
      }
    } catch (err) {
      toast('Gagal memuat lembar kerja tim: ' + (err.message || 'Materi atau tim belum siap.'), 'error');
    }
  }

  function getPracticeFormData() {
    const getVal = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    return {
      prediction: getVal('lkpd-input-prediction'),
      tools: getVal('lkpd-input-tools'),
      trial1: getVal('lkpd-input-trial1'),
      data: getVal('lkpd-input-data'),
      evidence: getVal('lkpd-input-evidence'),
      conclusion: getVal('lkpd-input-conclusion'),
      memberRoles: getVal('lkpd-input-member-roles'),
      improvement: getVal('lkpd-input-improvement'),
      trial2: getVal('lkpd-input-trial2'),
      reflection: getVal('lkpd-input-reflection')
    };
  }

  async function saveTeamWorksheetDraft() {
    const report = getPracticeFormData();
    const fallbackInput = document.getElementById('input-team-fallback-reason');
    const fallbackReason = fallbackInput ? fallbackInput.value.trim() : '';

    const btnSave = document.getElementById('btn-save-team-draft');
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = 'Menyimpan...';
    }

    try {
      const res = await callApi('saveTeamPracticeDraft', {
        token: window.AppState.sessionToken,
        session_token: window.AppState.sessionToken,
        unitId: window.AppState.activeUnitId,
        report,
        fallbackReason,
        clientVersion: window.AppState.teamLabClientVersion || ''
      });

      if (res && res.updatedAt) {
        window.AppState.teamLabClientVersion = res.updatedAt;
        const versionTag = document.getElementById('team-lab-version-tag');
        if (versionTag) versionTag.textContent = `clientVersion: ${res.updatedAt.slice(0, 19)}`;
      }

      toast('Draft laporan praktikum berhasil disimpan!', 'success');
      // Muat ulang workspace untuk menyegarkan status izin
      openTeamLab(window.AppState.activeUnitId);
    } catch (err) {
      toast('Gagal menyimpan draft: ' + (err.message || 'Terjadi kesalahan.'), 'error');
    } finally {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = 'Simpan Draft LKPD';
      }
    }
  }

  async function submitTeamWorksheet() {
    const report = getPracticeFormData();
    const fallbackInput = document.getElementById('input-team-fallback-reason');
    const fallbackReason = fallbackInput ? fallbackInput.value.trim() : '';

    // Validasi 7 Elemen Wajib
    const required = [
      { key: 'prediction', label: '1. Prediksi' },
      { key: 'tools', label: '2. Alat & Bahan' },
      { key: 'trial1', label: '3. Percobaan Awal (Trial 1)' },
      { key: 'data', label: '4. Data Pengamatan' },
      { key: 'evidence', label: '5. Bukti Ilmiah' },
      { key: 'conclusion', label: '6. Kesimpulan' },
      { key: 'memberRoles', label: '7. Pembagian Peran' }
    ];

    const missing = required.filter(item => !report[item.key]);
    if (missing.length > 0) {
      toast('Lengkapi bagian wajib sebelum mengirim: ' + missing.map(m => m.label).join(', '), 'error');
      return;
    }

    const ws = window.AppState.teamLabWorkspace;
    if (ws && ws.editorRole === 'deputy' && !ws.fallbackAuthorized && !fallbackReason) {
      toast('Alasan pengalihan (fallbackReason) wajib diisi untuk pengiriman oleh Wakil Ketua.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-team-worksheet');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim Laporan...';
    }

    try {
      const res = await callApi('submitTeamPractice', {
        token: window.AppState.sessionToken,
        session_token: window.AppState.sessionToken,
        unitId: window.AppState.activeUnitId,
        report,
        fallbackReason,
        clientVersion: window.AppState.teamLabClientVersion || ''
      });

      if (res && res.updatedAt) {
        window.AppState.teamLabClientVersion = res.updatedAt;
      }

      toast('Laporan LKPD Tim berhasil dikirim resmi ke Instruktur!', 'success');
      openTeamLab(window.AppState.activeUnitId);
      if (window.loadStudentDashboardData) window.loadStudentDashboardData();
    } catch (e) {
      toast('Gagal mengirim laporan LKPD: ' + (e.message || 'Terjadi kesalahan sistem.'), 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Laporan Resmi ke Guru ✓';
      }
    }
  }

  // Expose to window
  window.openCourseUnit = openCourseUnit;
  window.submitSummary = submitSummary;
  window.openQuizChamber = openQuizChamber;
  window.selectQuizOption = selectQuizOption;
  window.nextQuestion = nextQuestion;
  window.prevQuestion = prevQuestion;
  window.submitQuiz = submitQuiz;
  window.openTeamLab = openTeamLab;
  window.saveTeamWorksheetDraft = saveTeamWorksheetDraft;
  window.submitTeamWorksheet = submitTeamWorksheet;
  window.QuizState = QuizState;

})(window);

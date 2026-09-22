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
    items: [],
    currentIndex: 0,
    answers: {},
    timeRemaining: 180, // seconds
    timerInterval: null,
    tabSwitchCount: 0
  };

  // --- 1. Open and Render Learning Course Unit ---
  async function openCourseUnit(unitId) {
    let unit = (window.AppState && window.AppState.staticUnits[unitId]);
    if (!unit && window.AppState && window.AppState.sessionToken) {
      try {
        unit = await callApi('learningUnit', {
          token: window.AppState.sessionToken,
          session_token: window.AppState.sessionToken,
          unitId: unitId
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

    const titleEl = document.getElementById('unit-reader-title');
    const summaryEl = document.getElementById('unit-reader-summary');
    const sectionsEl = document.getElementById('unit-reader-sections');
    const diagramEl = document.getElementById('unit-reader-diagram');
    const promptEl = document.getElementById('unit-notebook-prompt');

    if (titleEl) titleEl.textContent = unit.title || 'Materi Pembelajaran';
    if (summaryEl) summaryEl.textContent = unit.summary || '';
    if (promptEl) promptEl.textContent = unit.notebook_prompt || 'Tuliskan poin penting yang kamu temukan.';

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

    // Bind Action Button
    const quizBtn = document.getElementById('btn-open-unit-quiz');
    if (quizBtn) {
      quizBtn.onclick = () => openQuizChamber(unitId);
    }

    if (window.showView) window.showView('view-course-unit');
  }

  // --- 2. Submit Summary (Reading -> Pending Review) ---
  async function submitSummary(unitId) {
    const textarea = document.getElementById('textarea-summary');
    const text = textarea ? textarea.value.trim() : '';

    if (text.length < 30) {
      toast('Rangkuman minimal 30 karakter agar dapat dinilai instruktur.', 'error');
      return;
    }

    try {
      await callApi('submitSummaryForReview', {
        token: window.AppState.sessionToken,
        session_token: window.AppState.sessionToken,
        unitId: unitId || window.AppState.activeUnitId
      });
      toast('Rangkuman berhasil dilaporkan untuk verifikasi instruktur!', 'success');
      if (window.showView) window.showView('view-student-dashboard');
      if (window.loadStudentDashboardData) window.loadStudentDashboardData();
    } catch (e) {
      toast(e.message || 'Gagal melaporkan rangkuman.', 'error');
    }
  }

  // --- 3. Timed Quiz Chamber ---
  async function openQuizChamber(unitId) {
    QuizState.unitId = unitId || window.AppState.activeUnitId;
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
          activityId: QuizState.unitId
        });
        if (res && res.items && res.items.length) {
          QuizState.attemptId = res.attemptId;
          QuizState.items = res.items;
          QuizState.timeRemaining = res.timeLimitSeconds || 180;
        }
      } catch (e) {
        toast('Gagal memulai sesi kuis: ' + (e.message || 'Materi/rangkuman belum tuntas.'), 'error');
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

  // --- 4. Team Lab (LKPD Kelompok) ---
  function openTeamLab() {
    if (window.showView) window.showView('view-team-lab');
  }

  async function submitTeamWorksheet() {
    const notesEl = document.getElementById('team-worksheet-notes');
    const text = notesEl ? notesEl.value.trim() : '';

    if (text.length < 20) {
      toast('Isi laporan data hasil observasi tim terlebih dahulu (minimal 20 karakter).', 'error');
      return;
    }

    const fallbackInput = document.getElementById('input-team-fallback-reason');
    const fallbackReason = fallbackInput ? fallbackInput.value.trim() : '';

    const submitBtn = document.getElementById('btn-submit-team-worksheet');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim...';
    }

    try {
      await callApi('submitTeamPractice', {
        token: window.AppState.sessionToken,
        session_token: window.AppState.sessionToken,
        unitId: window.AppState.activeUnitId,
        report: {
          prediction: 'Prediksi tim',
          tools: 'Peralatan praktikum',
          trial1: 'Percobaan 1',
          data: text,
          evidence: text,
          conclusion: text,
          memberRoles: 'Scientist Leader dan Tim'
        },
        fallbackReason,
        clientVersion: window.AppState.teamLabClientVersion || ''
      });
      toast('Laporan LKPD Tim berhasil dikirim ke Instruktur!', 'success');
      if (window.showView) window.showView('view-student-dashboard');
      if (window.loadStudentDashboardData) window.loadStudentDashboardData();
    } catch (e) {
      toast('Gagal mengirim laporan LKPD: ' + (e.message || 'Terjadi kesalahan.'), 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Laporan Tim';
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
  window.submitTeamWorksheet = submitTeamWorksheet;

})(window);

const CONFIG = require('../config');
const {
  rows_,
  append_,
  update_,
  upsert_,
  findOne_,
  findAll_,
  deleteWhere_,
  audit_,
  hash_,
  isoNow_,
  uid_
} = require('../database/repository');
const { ensureTeacherClassAccess } = require('../middleware/authMiddleware');
const {
  LEARNING_PATH_,
  SEMESTER_OUTLINE_,
  allLearningUnits_,
  allQuizItems_,
  PRACTICE_GUIDE_,
  PRACTICE_CATALOG_,
  practiceCatalogItem_,
  practiceGuideData_,
  learningIllustration_
} = require('../data/learningData');
const { stableShuffle_, validProfilesForStudents_ } = require('./purwaService');

/**
 * =========================================================================
 * HELPER PENILAIAN & CHECK TERAKHIR GURU
 * =========================================================================
 */

/**
 * Mengambil rekam pemeriksaan guru terbaru berdasarkan revisi & timestamp
 * @param {string} studentId
 * @param {string} activityId
 * @param {string} checkType
 */
function latestTeacherCheck_(studentId, activityId, checkType) {
  const rows = findAll_('teacher_checks', r =>
    r.student_id === studentId && r.activity_id === activityId && r.check_type === checkType
  );
  return rows.sort((a, b) =>
    Number(b.revision || 0) - Number(a.revision || 0) ||
    String(b.checked_at).localeCompare(String(a.checked_at))
  )[0] || null;
}

/**
 * Mengambil percobaan kuis dengan skor/kelulusan tertinggi
 * @param {string} studentId
 * @param {string} activityId
 */
function latestQuizAttempt_(studentId, activityId) {
  return findAll_('quiz_attempts', r =>
    r.student_id === studentId && r.activity_id === activityId && r.submitted_at
  ).sort(compareMasteryAttempts_)[0] || null;
}

/**
 * Komparator urutan percobaan kuis: lulus diutamakan, lalu skor tertinggi, lalu attempt terbaru
 */
function compareMasteryAttempts_(a, b) {
  const passedA = String(a.passed).toLowerCase() === 'true' || a.passed === 1 ? 1 : 0;
  const passedB = String(b.passed).toLowerCase() === 'true' || b.passed === 1 ? 1 : 0;
  return (
    passedB - passedA ||
    Number(b.score || 0) - Number(a.score || 0) ||
    Number(b.attempt_number || 0) - Number(a.attempt_number || 0)
  );
}

/**
 * Mengumpulkan konteks pembelajaran individual siswa
 * @param {string} studentId
 */
function studentLearningContext_(studentId) {
  const checks = findAll_('teacher_checks', r => r.student_id === studentId);
  const attempts = findAll_('quiz_attempts', r => r.student_id === studentId && r.submitted_at);
  const overrides = findAll_('unlock_overrides', r => r.student_id === studentId);

  const latestChecks = {};
  checks.forEach(x => {
    const k = `${x.activity_id}|${x.check_type}`;
    const p = latestChecks[k];
    if (
      !p ||
      Number(x.revision || 0) > Number(p.revision || 0) ||
      (Number(x.revision || 0) === Number(p.revision || 0) && String(x.checked_at) > String(p.checked_at))
    ) {
      latestChecks[k] = x;
    }
  });

  const latestAttempts = {};
  attempts.forEach(x => {
    const p = latestAttempts[x.activity_id];
    if (!p || compareMasteryAttempts_(x, p) < 0) {
      latestAttempts[x.activity_id] = x;
    }
  });

  const latestOverrides = {};
  overrides.forEach(x => {
    if (String(x.reason || '').startsWith('[CONTROLLED_FALLBACK')) return;
    const p = latestOverrides[x.activity_id];
    if (!p || String(x.created_at) > String(p.created_at)) {
      latestOverrides[x.activity_id] = x;
    }
  });

  return { checks: latestChecks, attempts: latestAttempts, overrides: latestOverrides };
}

function contextCheck_(context, activityId, type) {
  return context ? context.checks[`${activityId}|${type}`] || null : null;
}

function contextAttempt_(context, activityId) {
  return context ? context.attempts[activityId] || null : null;
}

function contextOverride_(context, activityId) {
  if (!context) return null;
  const x = context.overrides[activityId];
  return x ? String(x.allowed).toLowerCase() === 'true' || x.allowed === 1 : null;
}

function verifiedCheck_(studentId, activityId, type) {
  const x = latestTeacherCheck_(studentId, activityId, type);
  return !!x && x.status === 'verified';
}

function unlockOverride_(studentId, activityId) {
  const x = findAll_('unlock_overrides', r =>
    r.student_id === studentId &&
    r.activity_id === activityId &&
    !String(r.reason || '').startsWith('[CONTROLLED_FALLBACK')
  ).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
  return x ? String(x.allowed).toLowerCase() === 'true' || x.allowed === 1 : null;
}

/**
 * Mengumpulkan konteks kelompok belajar tim siswa
 * @param {string} studentId
 */
function teamLearningContext_(studentId) {
  const memberships = findAll_('team_members', m => m.student_id === studentId);
  const teamIds = new Set(memberships.map(m => m.team_id));
  const team = findAll_('teams', t => teamIds.has(t.team_id)).sort((a, b) => Number(b.version) - Number(a.version))[0];
  if (!team) return null;

  const members = findAll_('team_members', m => m.team_id === team.team_id);
  const studentIds = members.map(m => m.student_id);
  const checks = findAll_('teacher_checks', r => studentIds.includes(r.student_id));
  const attempts = findAll_('quiz_attempts', r => studentIds.includes(r.student_id) && r.submitted_at);

  const teamContext = {};
  studentIds.forEach(id => {
    teamContext[id] = { checks: {}, attempts: {} };
  });

  checks.forEach(x => {
    if (!teamContext[x.student_id]) return;
    const k = `${x.activity_id}|${x.check_type}`;
    const p = teamContext[x.student_id].checks[k];
    if (
      !p ||
      Number(x.revision || 0) > Number(p.revision || 0) ||
      (Number(x.revision || 0) === Number(p.revision || 0) && String(x.checked_at) > String(p.checked_at))
    ) {
      teamContext[x.student_id].checks[k] = x;
    }
  });

  attempts.forEach(x => {
    if (!teamContext[x.student_id]) return;
    const p = teamContext[x.student_id].attempts[x.activity_id];
    if (!p || compareMasteryAttempts_(x, p) < 0) {
      teamContext[x.student_id].attempts[x.activity_id] = x;
    }
  });

  const students = Object.fromEntries(findAll_('master_students', s => studentIds.includes(s.student_id)).map(s => [s.student_id, s]));
  return {
    teamId: team.team_id,
    members: studentIds.map(id => ({
      studentId: id,
      name: students[id] ? students[id].name : id,
      checks: teamContext[id].checks,
      attempts: teamContext[id].attempts
    }))
  };
}

/**
 * =========================================================================
 * LEARNING GATE STATE MACHINE
 * =========================================================================
 */

/**
 * Menghitung state mesin gerbang belajar untuk satu unit submateri
 * State: reading -> pending_review -> verified -> quiz_ready -> practice_ready -> completed
 */
function unitState_(studentId, unit, index, units, context, teamContext) {
  const previous = index > 0 ? unitStateCore_(studentId, units[index - 1], context) : null;
  const override = context
    ? contextOverride_(context, unit.learn_activity_id)
    : unlockOverride_(studentId, unit.learn_activity_id);

  const contentUnlocked = override === true || index === 0 || (previous && previous.materiSelesai);
  const summary = context
    ? contextCheck_(context, unit.learn_activity_id, 'summary')
    : latestTeacherCheck_(studentId, unit.learn_activity_id, 'summary');
  const summaryVerified = !!summary && summary.status === 'verified';

  const quiz = context
    ? contextAttempt_(context, unit.quiz_activity_id)
    : latestQuizAttempt_(studentId, unit.quiz_activity_id);
  const quizPassed = !!quiz && (String(quiz.passed).toLowerCase() === 'true' || quiz.passed === 1 || Number(quiz.score) >= (CONFIG.QUIZ_PASSING_SCORE || 70));
  const materiSelesai = summaryVerified && quizPassed;

  const practice = unit.practice_activity_id
    ? (context
        ? contextCheck_(context, unit.practice_activity_id, 'practice')
        : latestTeacherCheck_(studentId, unit.practice_activity_id, 'practice'))
    : null;
  const practiceVerified = !unit.practice_activity_id || !unit.practice_required || (!!practice && practice.status === 'verified');

  let practiceUnlocked = false;
  const laggingMembers = [];

  if (unit.practice_activity_id) {
    if (teamContext) {
      let allCleared = true;
      teamContext.members.forEach(m => {
        const mSummary = m.checks[`${unit.learn_activity_id}|summary`];
        const mQuiz = m.attempts[unit.quiz_activity_id];
        const mSumVer = !!mSummary && mSummary.status === 'verified';
        const mQuizPass = !!mQuiz && (String(mQuiz.passed).toLowerCase() === 'true' || mQuiz.passed === 1 || Number(mQuiz.score) >= (CONFIG.QUIZ_PASSING_SCORE || 70));
        if (!(mSumVer && mQuizPass)) {
          allCleared = false;
          if (m.studentId !== studentId) laggingMembers.push(m.name);
        }
      });
      practiceUnlocked = allCleared && materiSelesai;
    }
  }

  const complete = contentUnlocked && summaryVerified && quizPassed && practiceVerified;
  const learningStatus = complete
    ? 'completed'
    : practice && practice.status === 'needs_revision'
      ? 'needs_revision'
      : practiceUnlocked && unit.practice_activity_id
        ? 'practice_ready'
        : summaryVerified
          ? 'quiz_ready'
          : summary && summary.status === 'pending_review'
            ? 'pending_review'
            : contentUnlocked
              ? 'reading'
              : 'locked';

  return {
    contentUnlocked,
    summary: summary || null,
    summaryVerified,
    quiz: quiz || null,
    quizPassed,
    materiSelesai,
    practice: practice || null,
    practiceVerified,
    practiceUnlocked,
    laggingMembers,
    complete,
    learningStatus
  };
}

function unitStateCore_(studentId, unit, context) {
  const summary = context
    ? contextCheck_(context, unit.learn_activity_id, 'summary')
    : latestTeacherCheck_(studentId, unit.learn_activity_id, 'summary');
  const summaryVerified = !!summary && summary.status === 'verified';

  const quiz = context
    ? contextAttempt_(context, unit.quiz_activity_id)
    : latestQuizAttempt_(studentId, unit.quiz_activity_id);
  const quizPassed = !!quiz && (String(quiz.passed).toLowerCase() === 'true' || quiz.passed === 1 || Number(quiz.score) >= (CONFIG.QUIZ_PASSING_SCORE || 70));

  const practice = context && unit.practice_activity_id
    ? contextCheck_(context, unit.practice_activity_id, 'practice')
    : unit.practice_activity_id
      ? latestTeacherCheck_(studentId, unit.practice_activity_id, 'practice')
      : null;
  const practiceVerified = !unit.practice_activity_id || !unit.practice_required || (!!practice && practice.status === 'verified');

  return {
    materiSelesai: summaryVerified && quizPassed,
    complete: summaryVerified && quizPassed && practiceVerified
  };
}

/**
 * =========================================================================
 * LEARNING CATALOG & SUBMATERI SISWA
 * =========================================================================
 */

/**
 * Mengambil ringkasan beranda belajar siswa: alur materi bab, status per unit, dan progres tim
 * @param {object} session
 */
function learningHome(session) {
  const studentId = session.actor_id;
  const units = allLearningUnits_();
  const context = studentLearningContext_(studentId);
  const teamContext = teamLearningContext_(studentId);

  const chapters = LEARNING_PATH_.map(chapter => ({
    ...chapter,
    units: chapter.units.map(unit => {
      const globalIndex = units.findIndex(x => x.unit_id === unit.unit_id);
      const state = unitState_(studentId, unit, globalIndex, units, context, teamContext);
      return { ...unit, state };
    })
  }));

  return {
    chapters,
    outline: SEMESTER_OUTLINE_,
    semesterCard: semesterCardData_(studentId, CONFIG.CURRENT_SEMESTER, context),
    teamProgress: studentTeamProgress_(studentId)
  };
}

/**
 * Mengambil satu unit submateri lengkap beserta ilustrasi SVG & status gerbangnya
 * @param {object} session
 * @param {string} unitId
 */
function learningUnitForStudent(session, unitId) {
  const units = allLearningUnits_();
  const index = units.findIndex(x => x.unit_id === unitId);
  if (index < 0) throw new Error('Submateri tidak ditemukan.');

  const unit = units[index];
  const state = unitState_(
    session.actor_id,
    unit,
    index,
    units,
    studentLearningContext_(session.actor_id),
    teamLearningContext_(session.actor_id)
  );

  if (!state.contentUnlocked) {
    throw new Error('Submateri masih terkunci. Selesaikan tahap sebelumnya.');
  }

  return {
    ...unit,
    illustration_svg: learningIllustration_(unit.illustration),
    practice_preview: practiceCatalogItem_(unit.practice_activity_id),
    confusion_signal: studentConfusionSignal_(session.actor_id, unit.unit_id),
    state
  };
}

function studentConfusionSignal_(studentId, unitId) {
  const row = findOne_('settings', { key: `confusion|${studentId}|${unitId}` });
  if (!row) return null;
  try {
    return JSON.parse(String(row.value || '{}'));
  } catch (e) {
    return null;
  }
}

function saveConfusionSignal(session, unitId, category) {
  const allowed = new Set(['concept', 'term', 'calculation', 'practice', 'clear']);
  const unit = allLearningUnits_().find(item => item.unit_id === unitId);
  if (!unit) throw new Error('Submateri tidak ditemukan.');
  if (!allowed.has(category)) throw new Error('Pilihan kesulitan tidak valid.');

  const value = { category, updatedAt: isoNow_() };
  const key = `confusion|${session.actor_id}|${unitId}`;
  upsert_('settings', 'key', { key, value: JSON.stringify(value), updated_at: value.updatedAt });
  audit_({ type: 'student', id: session.actor_id }, 'SAVE_CONFUSION_SIGNAL', 'student_unit', `${session.actor_id}|${unitId}`, { category });
  return value;
}

/**
 * =========================================================================
 * SUMMARY REVIEW (PELAPORAN RANGKUMAN BUKU SISWA & VALIDASI GURU)
 * =========================================================================
 */

/**
 * Siswa melaporkan bahwa rangkuman materi di buku tulisnya siap diperiksa guru
 * @param {object} session
 * @param {string} unitId
 */
function submitSummaryForReview(session, unitId) {
  const units = allLearningUnits_();
  const index = units.findIndex(unit => unit.unit_id === unitId);
  if (index < 0) throw new Error('Submateri tidak ditemukan.');

  const unit = units[index];
  const state = unitState_(session.actor_id, unit, index, units, studentLearningContext_(session.actor_id));
  if (!state.contentUnlocked) throw new Error('Submateri masih terkunci.');

  const latest = latestTeacherCheck_(session.actor_id, unit.learn_activity_id, 'summary');
  if (latest && latest.status === 'verified') {
    return { status: 'verified', alreadySubmitted: true, submittedAt: latest.checked_at };
  }
  if (latest && latest.status === 'pending_review') {
    return { status: 'pending_review', alreadySubmitted: true, submittedAt: latest.checked_at };
  }

  const revision = Number(latest ? latest.revision : 0) + 1;
  const submittedAt = isoNow_();
  const checkId = uid_('CHK');

  append_('teacher_checks', {
    check_id: checkId,
    student_id: session.actor_id,
    activity_id: unit.learn_activity_id,
    check_type: 'summary',
    status: 'pending_review',
    score: null,
    note: 'Siswa melaporkan rangkuman di buku siap diperiksa.',
    checked_by: '',
    checked_at: submittedAt,
    revision
  });

  audit_({ type: 'student', id: session.actor_id }, 'SUBMIT_SUMMARY_REVIEW', 'student_activity', `${session.actor_id}|${unit.learn_activity_id}`, { unit_id: unit.unit_id, revision });
  return { status: 'pending_review', alreadySubmitted: false, submittedAt };
}

/**
 * Guru menyimpan pemeriksaan status rangkuman/praktik (Append-Only dengan tracking revisi)
 * @param {object} session
 * @param {object} payload - { classId, activityId, checkType, status, score, note, studentIds }
 */
function saveTeacherChecks(session, payload) {
  ensureTeacherClassAccess(session, payload.classId);
  const allowedStatus = new Set(['verified', 'needs_revision', 'not_checked']);
  const allowedType = new Set(['summary', 'practice', 'worksheet', 'reflection']);
  if (!allowedStatus.has(payload.status) || !allowedType.has(payload.checkType)) {
    throw new Error('Status pemeriksaan tidak valid.');
  }

  const activeStudents = findAll_('master_students', r =>
    r.class_id === payload.classId && (r.active === 1 || String(r.active).toLowerCase() === 'true')
  );
  const ids = new Set(activeStudents.map(r => r.student_id));
  const studentMap = new Map();
  activeStudents.forEach(s => {
    studentMap.set(s.student_id, s.student_id);
    if (s.nis) studentMap.set(String(s.nis), s.student_id);
    studentMap.set(String(s.roll_no), s.student_id);
    studentMap.set(`${s.class_id}-${s.roll_no}`, s.student_id);
    studentMap.set(`${s.class_id}-${String(s.roll_no).padStart(2, '0')}`, s.student_id);
  });

  const score = payload.score === '' || payload.score === undefined || payload.score === null ? null : Number(payload.score);
  if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
    throw new Error('Nilai harus 0-100.');
  }

  const saved = [];
  (payload.studentIds || []).forEach(rawId => {
    const studentId = studentMap.get(String(rawId).trim()) || (ids.has(rawId) ? rawId : null);
    if (!studentId) {
      throw new Error('Siswa di luar kelas tidak dapat diperiksa.');
    }
    const latest = latestTeacherCheck_(studentId, payload.activityId, payload.checkType);
    const revision = Number(latest ? latest.revision : 0) + 1;
    const checkId = uid_('CHK');
    const checkedAt = isoNow_();

    const row = {
      check_id: checkId,
      student_id: studentId,
      activity_id: payload.activityId,
      check_type: payload.checkType,
      status: payload.status,
      score,
      note: String(payload.note || ''),
      checked_by: session.actor_id,
      checked_at: checkedAt,
      revision
    };

    append_('teacher_checks', row);
    saved.push(row);

    if (payload.checkType === 'practice') {
      syncPracticeSkills_(studentId, payload.activityId, payload.status, '', checkId, session.actor_id, checkedAt);
    }

    audit_({ type: 'teacher', id: session.actor_id }, 'TEACHER_CHECK', 'student_activity', `${studentId}|${payload.activityId}`, {
      check_type: payload.checkType,
      status: payload.status,
      score,
      revision
    });
  });

  return { saved: saved.length, savedCount: saved.length };
}

/**
 * =========================================================================
 * QUIZ ENGINE (DETERMINISTIC SAMPLING, SECURE OPTIONS & SCORING)
 * =========================================================================
 */

/**
 * Pengacakan opsi jawaban butir kuis secara deterministik per attempt
 * @param {object} item
 * @param {string} studentId
 * @param {number} attemptNumber
 */
function quizOptionsForAttempt_(item, studentId, attemptNumber) {
  const options = JSON.parse(item.options_json || '[]').map((text, originalIndex) => ({ text, originalIndex }));
  return stableShuffle_(options, `${studentId}|${attemptNumber}|${item.quiz_item_id}|options`);
}

/**
 * Pemilihan subset butir soal kuis (5 s.d. 8 butir) terdistribusi level LOTS, MOTS, HOTS
 */
function sampledQuizItemsForAttempt_(allItems, studentId, attemptNumber) {
  if (!allItems || allItems.length <= 5) return allItems || [];
  const seed = `${studentId}|${attemptNumber}|${allItems[0].activity_id}`;
  let hashVal = 0;
  for (let i = 0; i < seed.length; i++) hashVal = ((hashVal * 31) + seed.charCodeAt(i)) >>> 0;
  const minCount = Math.min(5, allItems.length);
  const maxCount = Math.min(8, allItems.length);
  const targetCount = minCount + (hashVal % (maxCount - minCount + 1));

  const lots = [], mots = [], hots = [], rest = [];
  allItems.forEach((item, idx) => {
    let lvl = item.level;
    if (!lvl) {
      try {
        const fb = JSON.parse(item.feedback_json || '{}');
        if (fb.level) lvl = fb.level;
      } catch (e) {}
    }
    if (!lvl) {
      lvl = (idx === 0 || idx === 1 || idx === 6 || idx === 7) ? 'LOTS' : (idx === 2 || idx === 4 || idx === 8) ? 'MOTS' : 'HOTS';
    }
    item.level = lvl;
    if (lvl === 'LOTS') lots.push(item);
    else if (lvl === 'MOTS') mots.push(item);
    else if (lvl === 'HOTS') hots.push(item);
    else rest.push(item);
  });

  const sLots = stableShuffle_(lots, `${seed}|lots`);
  const sMots = stableShuffle_(mots, `${seed}|mots`);
  const sHots = stableShuffle_(hots, `${seed}|hots`);
  const selected = [];

  function pick(pool) {
    if (pool.length > 0 && selected.length < targetCount) {
      selected.push(pool.shift());
    }
  }

  if (targetCount >= 7) {
    pick(sLots); pick(sLots); pick(sMots); pick(sMots); pick(sHots); pick(sHots);
  } else if (targetCount >= 5) {
    pick(sLots); pick(sLots); pick(sMots); pick(sMots); pick(sHots);
  } else if (targetCount === 4) {
    pick(sLots); pick(sMots); pick(sMots); pick(sHots);
  } else {
    pick(sLots); pick(sMots); pick(sHots);
  }

  const remainder = sLots.concat(sMots).concat(sHots).concat(rest);
  while (selected.length < targetCount && remainder.length > 0) {
    selected.push(remainder.shift());
  }

  return stableShuffle_(selected, `${seed}|order`);
}

/**
 * Siswa memulai sesi kuis submateri
 * KUNCI JAWABAN TIDAK DIKIRIM KE KLIEN!
 * @param {object} session
 * @param {string} activityId
 */
function startQuiz(session, activityId) {
  const units = allLearningUnits_();
  let targetActivityId = activityId;
  let index = units.findIndex(x => x.quiz_activity_id === targetActivityId);
  if (index < 0) {
    index = units.findIndex(x => x.unit_id === targetActivityId);
    if (index >= 0) {
      targetActivityId = units[index].quiz_activity_id;
    }
  }
  if (index < 0) throw new Error('Kuis tidak ditemukan.');

  const unit = units[index];
  const state = unitState_(session.actor_id, unit, index, units, studentLearningContext_(session.actor_id));
  if (!state.contentUnlocked) {
    throw new Error('Kuis belum dapat dibuka karena submateri sebelumnya belum selesai.');
  }
  if (!verifiedCheck_(session.actor_id, unit.learn_activity_id, 'summary') && unlockOverride_(session.actor_id, targetActivityId) !== true) {
    throw new Error('Kuis terbuka setelah rangkuman diperiksa guru.');
  }

  const previous = findAll_('quiz_attempts', r => r.student_id === session.actor_id && r.activity_id === targetActivityId);
  const unfinished = previous.filter(x => !x.submitted_at).sort((a, b) => Number(b.attempt_number) - Number(a.attempt_number))[0];
  const attemptNumber = unfinished ? Number(unfinished.attempt_number) : previous.length + 1;
  const attemptId = unfinished ? unfinished.attempt_id : uid_('QAT');

  if (!unfinished) {
    append_('quiz_attempts', {
      attempt_id: attemptId,
      student_id: session.actor_id,
      activity_id: targetActivityId,
      attempt_number: attemptNumber,
      score: null,
      passed: 0,
      started_at: isoNow_(),
      submitted_at: null
    });
  }

  let allItems = findAll_('quiz_items', r => r.activity_id === targetActivityId && (r.active === 1 || String(r.active).toLowerCase() === 'true'));
  if (!allItems.length) {
    // Muat dari catalog jika tabel belum terisi
    const catalogItems = allQuizItems_().filter(r => r.activity_id === targetActivityId && (r.active === true || r.active === 1));
    allItems = catalogItems.map(item => ({
      quiz_item_id: item.quiz_item_id,
      activity_id: item.activity_id,
      question_type: item.question_type,
      prompt: item.prompt,
      options_json: JSON.stringify(item.options),
      answer_json: JSON.stringify(item.answer),
      feedback_json: JSON.stringify({ default: item.feedback }),
      max_score: item.max_score,
      active: 1,
      level: item.level
    }));
  }

  if (!allItems.length) throw new Error('Bank soal belum tersedia.');

  const sampled = sampledQuizItemsForAttempt_(allItems, session.actor_id, attemptNumber);

  // SANITASI KETAT: answer_json & feedback_json DIBUANG sebelum dikirim ke browser!
  const items = sampled.map(item => {
    const { answer_json, feedback_json, options_json, ...safe } = item;
    return {
      ...safe,
      level: item.level || 'MOTS',
      options: quizOptionsForAttempt_(item, session.actor_id, attemptNumber).map(opt => opt.text)
    };
  });

  const timeLimitSeconds = items.length * 90;
  const tabTolerance = Math.floor(items.length / 2);

  return { attemptId, attemptNumber, items, timeLimitSeconds, tabTolerance };
}

/**
 * Siswa mengumpulkan jawaban kuis untuk dinilai secara otomatis di server
 * @param {object} session
 * @param {object} payload - { attemptId, answers: Array<{ itemId, answer }>, timeRemaining, tabSwitchCount, forcedLocked }
 */
function submitQuiz(session, payload) {
  const attempt = findOne_('quiz_attempts', { attempt_id: payload.attemptId, student_id: session.actor_id });
  if (!attempt) throw new Error('Percobaan kuis tidak ditemukan.');
  if (attempt.submitted_at) {
    return {
      score: Number(attempt.score),
      passed: String(attempt.passed).toLowerCase() === 'true' || attempt.passed === 1,
      alreadySubmitted: true
    };
  }

  let allItems = findAll_('quiz_items', r => r.activity_id === attempt.activity_id && (r.active === 1 || String(r.active).toLowerCase() === 'true'));
  if (!allItems.length) {
    const catalogItems = allQuizItems_().filter(r => r.activity_id === attempt.activity_id && (r.active === true || r.active === 1));
    allItems = catalogItems.map(item => ({
      quiz_item_id: item.quiz_item_id,
      activity_id: item.activity_id,
      question_type: item.question_type,
      prompt: item.prompt,
      options_json: JSON.stringify(item.options),
      answer_json: JSON.stringify(item.answer),
      feedback_json: JSON.stringify({ default: item.feedback }),
      max_score: item.max_score,
      active: 1,
      level: item.level
    }));
  }

  const items = sampledQuizItemsForAttempt_(allItems, session.actor_id, attempt.attempt_number);
  const answers = Object.fromEntries((payload.answers || []).map(x => [x.itemId, x.answer]));
  if (items.some(x => answers[x.quiz_item_id] === undefined)) {
    throw new Error('Semua soal kuis perlu dijawab.');
  }

  let earned = 0;
  let total = 0;
  const reviewItems = [];

  items.forEach(item => {
    const expected = Number(JSON.parse(item.answer_json));
    const actual = Number(answers[item.quiz_item_id]);
    const shuffled = quizOptionsForAttempt_(item, session.actor_id, attempt.attempt_number);

    if (!Number.isInteger(actual) || actual < 0 || actual >= shuffled.length) {
      throw new Error('Pilihan jawaban tidak valid.');
    }

    const originalIndex = shuffled[actual].originalIndex;
    const point = originalIndex === expected ? Number(item.max_score || 1) : 0;
    total += Number(item.max_score || 1);
    earned += point;

    upsert_('quiz_responses', 'response_id', {
      response_id: `${attempt.attempt_id}|${item.quiz_item_id}`,
      attempt_id: attempt.attempt_id,
      quiz_item_id: item.quiz_item_id,
      answer_json: JSON.stringify(originalIndex),
      score: point,
      feedback_code: point ? 'correct' : 'review'
    });

    if (!point) {
      let feedback = {};
      try {
        feedback = JSON.parse(item.feedback_json || '{}');
      } catch (e) {}
      reviewItems.push({
        itemId: item.quiz_item_id,
        prompt: item.prompt,
        feedback: feedback.default || 'Pelajari kembali konsep yang terkait dengan soal ini.'
      });
    }
  });

  const rawScore = Math.round((earned / Math.max(1, total)) * 100);
  const passed = rawScore >= (CONFIG.QUIZ_PASSING_SCORE || 70);

  // Bonus kecepatan jika lulus KKM
  const timeRemaining = Math.max(0, Number(payload.timeRemaining || 0));
  const totalTime = items.length * 90;
  let speedBonus = 0;
  if (passed && rawScore >= (CONFIG.QUIZ_PASSING_SCORE || 70) && timeRemaining > 0 && totalTime > 0) {
    speedBonus = Math.round((timeRemaining / totalTime) * 10 * (rawScore / 100));
    speedBonus = Math.max(0, Math.min(10, speedBonus));
  }

  // Penalti tab switch 20%
  const tabTolerance = Math.floor(items.length / 2);
  const tabSwitchCount = Number(payload.tabSwitchCount || 0);
  const isPenalized = payload.forcedLocked || tabSwitchCount > tabTolerance;
  let penalty = 0;
  if (isPenalized) {
    penalty = Math.round(rawScore * 0.20);
  }

  const finalScore = Math.max(0, Math.min(100, rawScore + speedBonus - penalty));
  const finalPassed = finalScore >= (CONFIG.QUIZ_PASSING_SCORE || 70);

  upsert_('quiz_attempts', 'attempt_id', {
    attempt_id: attempt.attempt_id,
    score: finalScore,
    passed: finalPassed ? 1 : 0,
    submitted_at: isoNow_()
  });

  audit_({ type: 'student', id: session.actor_id }, 'SUBMIT_QUIZ', 'quiz_attempt', attempt.attempt_id, {
    activity_id: attempt.activity_id,
    score: finalScore,
    rawScore,
    speedBonus,
    penalty,
    passed: finalPassed,
    itemCount: items.length
  });

  return {
    score: finalScore,
    rawScore,
    speedBonus,
    penalty,
    passed: finalPassed,
    passingScore: CONFIG.QUIZ_PASSING_SCORE || 70,
    reviewItems
  };
}

/**
 * =========================================================================
 * PRACTICE & GROUP LAB (LKPD TIM, PERIZINAN LEADER, & SINKRONISASI SKOR)
 * =========================================================================
 */

function practiceSkills_(activityId) {
  const core = ['observe', 'predict', 'record_data', 'analyze', 'conclude'];
  return activityId.includes('CHL')
    ? core.concat(['ask', 'plan', 'improve', 'communicate'])
    : core.concat(['measure', 'safety', 'collaborate']);
}

function syncPracticeSkills_(studentId, activityId, status, teamId, sourceId, teacherId, checkedAt) {
  practiceSkills_(activityId).forEach(skill => {
    upsert_('skill_evidence', 'evidence_id', {
      evidence_id: `${studentId}|${activityId}|${skill}`,
      student_id: studentId,
      activity_id: activityId,
      team_id: teamId || '',
      skill_code: skill,
      source_type: teamId ? 'group_lab' : 'teacher_check',
      source_id: sourceId,
      status,
      verified_by: teacherId,
      verified_at: checkedAt
    });
  });
}

function practiceTeamForStudent_(studentId) {
  const memberships = findAll_('team_members', m => m.student_id === studentId);
  const teamIds = new Set(memberships.map(m => m.team_id));
  const team = findAll_('teams', t => teamIds.has(t.team_id)).sort((a, b) => Number(b.version) - Number(a.version))[0];
  if (!team) return null;

  const members = findAll_('team_members', m => m.team_id === team.team_id);
  const studentIds = members.map(m => m.student_id);
  const profiles = validProfilesForStudents_(studentIds);
  const students = Object.fromEntries(findAll_('master_students', s => studentIds.includes(s.student_id)).map(s => [s.student_id, s]));

  const leader = members.find(m => String(m.is_leader).toLowerCase() === 'true' || m.is_leader === 1) ||
                 members.find(m => m.role === 'Scientist Leader') || members[0];
  const storedDeputy = members.find(m => m.role === 'Deputy Scientist Leader');
  const deputy = storedDeputy || members
    .filter(m => !leader || m.student_id !== leader.student_id)
    .sort((a, b) =>
      Number(profiles[b.student_id]?.leader_index || 0) - Number(profiles[a.student_id]?.leader_index || 0) ||
      String(a.student_id).localeCompare(String(b.student_id))
    )[0] || null;

  return {
    team,
    leaderId: leader ? leader.student_id : '',
    deputyId: deputy ? deputy.student_id : '',
    members: members.map(m => ({
      studentId: m.student_id,
      name: students[m.student_id] ? students[m.student_id].name : m.student_id,
      role: m.student_id === (leader && leader.student_id)
        ? 'Scientist Leader'
        : m.student_id === (deputy && deputy.student_id)
          ? 'Deputy Scientist Leader'
          : m.role
    }))
  };
}

function studentTeamWithProgress_(studentId) {
  const teamInfo = practiceTeamForStudent_(studentId);
  if (!teamInfo) return null;
  const memberIds = teamInfo.members.map(m => m.studentId);
  if (!memberIds.length) return null;

  const checks = findAll_('teacher_checks', r =>
    memberIds.includes(r.student_id) && r.check_type === 'summary' && r.status === 'verified'
  );
  const quizzes = findAll_('quiz_attempts', r =>
    memberIds.includes(r.student_id) && r.submitted_at && (String(r.passed).toLowerCase() === 'true' || r.passed === 1 || Number(r.score) >= (CONFIG.QUIZ_PASSING_SCORE || 70))
  );

  const memberProgress = {};
  memberIds.forEach(id => {
    memberProgress[id] = { summaryUnits: new Set(), quizUnits: new Set() };
  });

  checks.forEach(c => {
    if (memberProgress[c.student_id]) memberProgress[c.student_id].summaryUnits.add(c.activity_id);
  });
  quizzes.forEach(q => {
    if (memberProgress[q.student_id]) memberProgress[q.student_id].quizUnits.add(q.activity_id);
  });

  let maxSummary = 0, maxQuiz = 0;
  memberIds.forEach(id => {
    const sCount = memberProgress[id].summaryUnits.size;
    const qCount = memberProgress[id].quizUnits.size;
    if (sCount > maxSummary) maxSummary = sCount;
    if (qCount > maxQuiz) maxQuiz = qCount;
  });

  const members = teamInfo.members.map(m => {
    const sCount = memberProgress[m.studentId].summaryUnits.size;
    const qCount = memberProgress[m.studentId].quizUnits.size;
    const missingSummaries = Math.max(0, maxSummary - sCount);
    const missingQuizzes = Math.max(0, maxQuiz - qCount);
    const isAligned = missingSummaries === 0 && missingQuizzes === 0;
    let gapMessage = '';
    if (isAligned) {
      gapMessage = 'Progres setara dengan tim · Siap praktikum bersama!';
    } else {
      const parts = [];
      if (missingSummaries > 0) parts.push(`${missingSummaries} materi rangkuman`);
      if (missingQuizzes > 0) parts.push(`${missingQuizzes} kuis`);
      gapMessage = 'Kurang ' + parts.join(' & ') + ' lagi agar setara dengan tim';
    }
    return {
      studentId: m.studentId,
      name: m.name,
      role: m.role,
      summaryCount: sCount,
      quizCount: qCount,
      missingSummaries,
      missingQuizzes,
      isAligned,
      gapMessage
    };
  });

  return {
    teamId: teamInfo.team.team_id,
    version: teamInfo.team.version,
    leaderId: teamInfo.leaderId,
    deputyId: teamInfo.deputyId,
    maxSummary,
    maxQuiz,
    members
  };
}

function practiceReportFromRow_(row) {
  if (!row) return { report: {}, meta: {} };
  try {
    const value = JSON.parse(String(row.result_json || '{}'));
    return { report: value.report || {}, meta: value.meta || {} };
  } catch (e) {
    return { report: {}, meta: {} };
  }
}

function cleanPracticeReport_(report) {
  const fields = ['prediction', 'tools', 'trial1', 'data', 'improvement', 'trial2', 'evidence', 'conclusion', 'modelLimit', 'reflection', 'memberRoles'];
  const clean = {};
  report = report || {};
  fields.forEach(field => {
    clean[field] = String(report[field] || '').trim().slice(0, 5000);
  });
  return clean;
}

function practiceWorkspace_(session, unitId) {
  const units = allLearningUnits_();
  const index = units.findIndex(x => x.unit_id === unitId);
  if (index < 0) throw new Error('Submateri tidak ditemukan.');

  const context = studentLearningContext_(session.actor_id);
  const teamContext = teamLearningContext_(session.actor_id);
  const unit = units[index];
  const state = unitState_(session.actor_id, unit, index, units, context, teamContext);

  if (!unit.practice_activity_id) throw new Error('Submateri ini tidak memiliki LKPD praktik.');
  if (!state.practiceUnlocked && unlockOverride_(session.actor_id, unit.practice_activity_id) !== true) {
    if (state.laggingMembers && state.laggingMembers.length > 0) {
      throw new Error('LKPD terkunci karena rekan tim Anda belum tuntas materi/kuis bab ini: ' + state.laggingMembers.join(', '));
    } else {
      throw new Error('LKPD terbuka setelah kamu menuntaskan materi & kuis, DAN kamu telah tergabung dalam tim.');
    }
  }

  const teamInfo = practiceTeamForStudent_(session.actor_id);
  const result = teamInfo ? findOne_('group_lab', { team_id: teamInfo.team.team_id, activity_id: unit.practice_activity_id }) : null;
  const stored = practiceReportFromRow_(result);
  const editorRole = teamInfo
    ? (session.actor_id === teamInfo.leaderId ? 'leader' : session.actor_id === teamInfo.deputyId ? 'deputy' : 'member')
    : 'none';

  // Controlled Fallback: Alasan deputy bukan otorisasi.
  // Akses edit wakil HANYA diberikan setelah pengesahan guru tercatat di database.
  // Metadata fallback lama yang dibuat sendiri tidak boleh menjadi dasar izin.
  const teacherAuth = teamInfo ? getTeacherFallbackAuthorization_(teamInfo.deputyId, teamInfo.team.team_id, unit.practice_activity_id) : null;
  const fallbackAuthorized = Boolean(teacherAuth && teacherAuth.authorized);

  let canEdit = false;
  if (teamInfo && (!result || ['draft', 'needs_revision'].includes(result.status))) {
    if (editorRole === 'leader') {
      canEdit = true;
    } else if (editorRole === 'deputy') {
      canEdit = fallbackAuthorized;
    }
  }

  return {
    unitId,
    title: unit.title,
    chapterTitle: unit.chapter_title,
    practiceActivityId: unit.practice_activity_id,
    practice: practiceCatalogItem_(unit.practice_activity_id),
    guide: PRACTICE_GUIDE_,
    team: teamInfo ? { teamId: teamInfo.team.team_id, classId: teamInfo.team.class_id, members: teamInfo.members, leaderId: teamInfo.leaderId, deputyId: teamInfo.deputyId } : null,
    result: result ? { status: result.status, score: result.score, teacherNote: result.teacher_note, updatedAt: result.updated_at, updatedBy: result.updated_by } : null,
    report: stored.report,
    reportMeta: stored.meta,
    editorRole,
    canEdit,
    fallbackAuthorized,
    fallbackReason: teacherAuth ? teacherAuth.reason : (stored.meta && stored.meta.fallbackReason) || '',
    fallbackMeta: teacherAuth || null,
    clientVersion: result ? result.updated_at : ''
  };
}

/**
 * Mencari catatan pengesahan Controlled Fallback resmi oleh guru di basis data
 * @param {string} deputyId
 * @param {string} teamId
 * @param {string} activityId
 */
function getTeacherFallbackAuthorization_(deputyId, teamId, activityId) {
  if (!deputyId || !activityId) return null;
  const prefix = `[CONTROLLED_FALLBACK:${teamId}]`;
  const revokePrefix = `[CONTROLLED_FALLBACK_REVOKED:${teamId}]`;

  const overrides = findAll_('unlock_overrides', r =>
    r.student_id === deputyId &&
    r.activity_id === activityId &&
    (String(r.reason || '').startsWith(prefix) || String(r.reason || '').startsWith(revokePrefix))
  ).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  if (!overrides.length) return null;
  const latest = overrides[0];

  const isRevoked = String(latest.reason || '').startsWith(revokePrefix) || Number(latest.allowed) === 0;
  if (isRevoked) {
    const cleanReason = String(latest.reason || '').replace(revokePrefix, '').trim();
    return {
      authorized: false,
      status: 'revoked',
      teacherId: latest.created_by,
      deputyId: latest.student_id,
      teamId: teamId,
      activityId: activityId,
      reason: cleanReason,
      revokedAt: latest.created_at,
      authorizedAt: null
    };
  }

  const cleanReason = latest.reason.slice(prefix.length).trim();
  return {
    authorized: true,
    status: 'active',
    teacherId: latest.created_by,
    deputyId: latest.student_id,
    teamId: teamId,
    activityId: activityId,
    reason: cleanReason,
    authorizedAt: latest.created_at,
    revokedAt: null
  };
}

/**
 * Memvalidasi apakah activityId terdaftar, bertipe praktik/LKPD/challenge, dan cocok dengan unit
 */
function validatePracticeActivity_(activityId, unitId) {
  if (!activityId) {
    throw new Error('ID aktivitas praktikum (activityId) wajib disertakan.');
  }

  const units = allLearningUnits_();
  const masterAct = findOne_('master_activities', { activity_id: activityId });
  const practiceCatalog = practiceCatalogItem_(activityId);

  if (!masterAct && !practiceCatalog) {
    throw new Error(`Aktivitas ${activityId} tidak terdaftar pada sumber aktivitas kurikulum.`);
  }

  const validTypes = ['lab', 'challenge', 'practice'];
  if (masterAct && !validTypes.includes(masterAct.type)) {
    throw new Error(`Aktivitas ${activityId} bertipe "${masterAct.type}", bukan aktivitas praktik/LKPD/challenge.`);
  }

  const unitForAct = units.find(u => u.practice_activity_id === activityId);
  if (!unitForAct) {
    throw new Error(`Aktivitas ${activityId} bukan merupakan aktivitas lembar kerja praktik (LKPD) unit manapun.`);
  }

  if (unitId && unitId !== unitForAct.unit_id) {
    throw new Error(`Aktivitas ${activityId} adalah milik unit ${unitForAct.unit_id}, tidak cocok dengan unit ${unitId}.`);
  }

  return { activityId, unitId: unitForAct.unit_id, unit: unitForAct, masterAct };
}

/**
 * Guru mengesahkan pengalihan wewenang LKPD ke Wakil Ketua (Controlled Fallback)
 * Menyimpan identitas guru, deputy, tim/aktivitas, alasan, dan waktu.
 * @param {object} session - Sesi guru
 * @param {object} payload - { teamId, activityId, unitId, reason, deputyId }
 */
function authorizeControlledFallback(session, payload) {
  if (session.actor_type !== 'teacher') {
    throw new Error('Hanya instruktur / guru yang berwenang mengesahkan pengalihan wewenang LKPD.');
  }
  const teamId = payload.teamId || payload.team_id;
  let activityId = payload.activityId || payload.activity_id;
  const reason = String(payload.reason || '').trim();

  if (!teamId) {
    throw new Error('ID Tim wajib disertakan.');
  }
  if (!reason || reason.length < 10) {
    throw new Error('Alasan pengesahan pengalihan oleh guru wajib diisi (minimal 10 karakter).');
  }

  const team = findOne_('teams', { team_id: teamId });
  if (!team) throw new Error('Tim sains tidak ditemukan.');
  ensureTeacherClassAccess(session, team.class_id);

  if (!activityId && payload.unitId) {
    const units = allLearningUnits_();
    const u = units.find(x => x.unit_id === payload.unitId);
    if (u && u.practice_activity_id) activityId = u.practice_activity_id;
  }
  const validAct = validatePracticeActivity_(activityId, payload.unitId || payload.unit_id);
  activityId = validAct.activityId;

  const members = findAll_('team_members', r => r.team_id === teamId);
  if (!members.length) throw new Error('Anggota tim sains tidak ditemukan.');

  let deputy = null;
  if (payload.deputyId) {
    deputy = members.find(m => m.student_id === payload.deputyId);
    if (!deputy) {
      throw new Error(`Siswa ${payload.deputyId} bukan merupakan anggota tim ${teamId}.`);
    }
    if (Number(deputy.is_leader) === 1 || deputy.role === 'Scientist Leader') {
      throw new Error('Ketua kelompok tidak dapat didaftarkan sebagai wakil penerima fallback.');
    }
    if (deputy.role !== 'Deputy Scientist Leader' && deputy.role !== 'Deputy Scientist') {
      throw new Error(`Siswa ${payload.deputyId} memiliki peran "${deputy.role}", bukan wakil ketua resmi (Deputy). Otorisasi fallback ditolak.`);
    }
  } else {
    deputy = members.find(m => m.role === 'Deputy Scientist Leader' || m.role === 'Deputy Scientist');
    if (!deputy) {
      throw new Error('Wakil ketua (Deputy) tidak ditemukan di dalam tim ini. Tentukan deputyId secara spesifik.');
    }
  }

  const now = isoNow_();
  const overrideId = uid_('FBK');
  const fallbackReasonText = `[CONTROLLED_FALLBACK:${teamId}] ${reason}`;

  append_('unlock_overrides', {
    override_id: overrideId,
    student_id: deputy.student_id,
    activity_id: activityId,
    allowed: 1,
    reason: fallbackReasonText,
    created_by: session.actor_id,
    created_at: now
  });

  audit_({ type: 'teacher', id: session.actor_id }, 'AUTHORIZE_CONTROLLED_FALLBACK', 'team_activity', `${teamId}|${activityId}`, {
    teacher_id: session.actor_id,
    deputy_id: deputy.student_id,
    team_id: teamId,
    activity_id: activityId,
    reason: reason,
    authorized_at: now
  });

  return {
    authorized: true,
    status: 'active',
    overrideId,
    teacherId: session.actor_id,
    deputyId: deputy.student_id,
    teamId,
    activityId,
    reason,
    authorizedAt: now
  };
}

/**
 * Guru mencabut pengesahan Controlled Fallback (wewenang kembali ke Ketua Tim)
 * @param {object} session - Sesi guru
 * @param {object} payload - { teamId, activityId, unitId, deputyId, reason }
 */
function revokeControlledFallback(session, payload = {}) {
  if (session.actor_type !== 'teacher') {
    throw new Error('Hanya instruktur / guru yang berwenang mencabut pengesahan fallback.');
  }
  const teamId = payload.teamId || payload.team_id;
  let activityId = payload.activityId || payload.activity_id;
  const reason = String(payload.reason || 'Pencabutan pengalihan wewenang oleh guru.').trim();

  if (!teamId) {
    throw new Error('ID Tim wajib disertakan.');
  }
  const team = findOne_('teams', { team_id: teamId });
  if (!team) throw new Error('Tim sains tidak ditemukan.');
  ensureTeacherClassAccess(session, team.class_id);

  if (!activityId && payload.unitId) {
    const units = allLearningUnits_();
    const u = units.find(x => x.unit_id === payload.unitId);
    if (u && u.practice_activity_id) activityId = u.practice_activity_id;
  }
  const validAct = validatePracticeActivity_(activityId, payload.unitId || payload.unit_id);
  activityId = validAct.activityId;

  const members = findAll_('team_members', r => r.team_id === teamId);
  if (!members.length) throw new Error('Anggota tim sains tidak ditemukan.');

  let deputy = null;
  if (payload.deputyId) {
    deputy = members.find(m => m.student_id === payload.deputyId);
    if (!deputy) {
      throw new Error(`Siswa ${payload.deputyId} bukan merupakan anggota tim ${teamId}.`);
    }
    if (deputy.role !== 'Deputy Scientist Leader' && deputy.role !== 'Deputy Scientist') {
      throw new Error(`Siswa ${payload.deputyId} memiliki peran "${deputy.role}", bukan wakil ketua resmi (Deputy). Pencabutan fallback ditolak.`);
    }
  } else {
    deputy = members.find(m => m.role === 'Deputy Scientist Leader' || m.role === 'Deputy Scientist');
  }
  if (!deputy) throw new Error('Wakil ketua tim tidak ditemukan.');

  const now = isoNow_();
  const overrideId = uid_('FBR');
  const revokeReasonText = `[CONTROLLED_FALLBACK_REVOKED:${teamId}] ${reason}`;

  append_('unlock_overrides', {
    override_id: overrideId,
    student_id: deputy.student_id,
    activity_id: activityId,
    allowed: 0,
    reason: revokeReasonText,
    created_by: session.actor_id,
    created_at: now
  });

  audit_({ type: 'teacher', id: session.actor_id }, 'REVOKE_CONTROLLED_FALLBACK', 'team_activity', `${teamId}|${activityId}`, {
    teacher_id: session.actor_id,
    deputy_id: deputy.student_id,
    team_id: teamId,
    activity_id: activityId,
    reason,
    revoked_at: now
  });

  return {
    authorized: false,
    status: 'revoked',
    overrideId,
    teacherId: session.actor_id,
    deputyId: deputy.student_id,
    teamId,
    activityId,
    reason,
    revokedAt: now
  };
}

/**
 * Menyimpan draft atau mengirim laporan praktikum tim LKPD (Hanya Scientist Leader atau Deputy dengan Controlled Fallback)
 * @param {object} session
 * @param {object} payload - { unitId, report, clientVersion, fallbackReason }
 * @param {boolean} submit - true jika kirim resmi untuk dinilai
 */
function saveTeamPracticeReport(session, payload, submit) {
  const workspace = practiceWorkspace_(session, payload.unitId);
  if (!workspace.team) throw new Error('Tim sains belum tersedia.');

  const isFallback = workspace.editorRole === 'deputy';
  const providedReason = String(payload.fallbackReason || '').trim();

  // Controlled Fallback Guard: Deputy tidak otomatis bebas edit.
  // Alasan deputy BUKAN otorisasi; akses edit baru diberikan setelah pengesahan guru tercatat.
  if (isFallback) {
    if (!workspace.fallbackAuthorized) {
      throw new Error('Pengalihan wewenang ke wakil ketua belum disahkan oleh guru. Akses edit ditolak.');
    }
    if (submit && !providedReason) {
      throw new Error('Alasan pengalihan (fallbackReason) wajib diisi jika laporan dikelola oleh wakil ketua.');
    }
  } else if (!workspace.canEdit) {
    throw new Error('Hanya Scientist Leader atau wakil dengan pengesahan guru yang dapat mengubah laporan tim.');
  }

  const id = `${workspace.team.teamId}|${workspace.practiceActivityId}`;
  const current = findOne_('group_lab', { lab_result_id: id });
  if (current && current.status === 'verified') throw new Error('Laporan sudah diverifikasi guru.');
  if (current && current.status === 'submitted') throw new Error('Laporan sudah dikirim. Tunggu pemeriksaan guru.');
  if (current && (!payload.clientVersion || String(current.updated_at) !== String(payload.clientVersion))) {
    throw new Error('Draft berubah di perangkat lain. Muat ulang sebelum menyimpan.');
  }

  const effectiveReason = providedReason || workspace.fallbackReason;
  if (isFallback && !effectiveReason) {
    throw new Error('Alasan pengalihan (fallbackReason) wajib diisi jika laporan dikelola oleh wakil ketua.');
  }

  const report = cleanPracticeReport_(payload.report);
  const required = ['prediction', 'tools', 'trial1', 'data', 'evidence', 'conclusion', 'memberRoles'];
  if (submit) {
    const missing = required.filter(field => !report[field]);
    if (missing.length) throw new Error('Lengkapi bagian wajib sebelum mengirim: ' + missing.join(', '));
  }

  const now = isoNow_();
  const status = submit ? 'submitted' : 'draft';
  const currentStored = practiceReportFromRow_(current);
  const currentMeta = currentStored.meta || {};

  const meta = {
    submittedBy: submit ? session.actor_id : (currentMeta.submittedBy || ''),
    submittedRole: submit ? workspace.editorRole : (currentMeta.submittedRole || ''),
    isFallback: isFallback || Boolean(currentMeta.isFallback),
    fallbackDeputyId: isFallback ? session.actor_id : (currentMeta.fallbackDeputyId || ''),
    fallbackTeacherId: workspace.fallbackMeta ? workspace.fallbackMeta.teacherId : (currentMeta.fallbackTeacherId || ''),
    fallbackAuthorizedAt: workspace.fallbackMeta ? workspace.fallbackMeta.authorizedAt : (currentMeta.fallbackAuthorizedAt || ''),
    fallbackReason: effectiveReason || (currentMeta.fallbackReason || ''),
    transferredBy: isFallback ? session.actor_id : (currentMeta.transferredBy || ''),
    transferredAt: isFallback ? now : (currentMeta.transferredAt || ''),
    submittedAt: submit ? now : (currentMeta.submittedAt || ''),
    lastEditor: session.actor_id,
    editorRole: workspace.editorRole
  };

  const row = {
    lab_result_id: id,
    class_id: workspace.team.classId,
    activity_id: workspace.practiceActivityId,
    team_id: workspace.team.teamId,
    status,
    score: current ? current.score : null,
    result_json: JSON.stringify({ report, meta }),
    teacher_note: current ? current.teacher_note : '',
    updated_at: now,
    updated_by: session.actor_id
  };

  upsert_('group_lab', 'lab_result_id', row);
  audit_({ type: 'student', id: session.actor_id }, submit ? 'SUBMIT_TEAM_PRACTICE' : 'SAVE_TEAM_PRACTICE_DRAFT', 'group_lab', id, {
    unit_id: payload.unitId,
    editor_role: workspace.editorRole,
    is_fallback: isFallback,
    fallback_reason: effectiveReason
  });

  return {
    status,
    updatedAt: now,
    submitted: submit,
    isFallback,
    editorRole: workspace.editorRole,
    meta
  };
}

/**
 * Guru menilai laporan praktikum tim dan mensinkronisasikan nilai ke seluruh anggota tim
 * @param {object} session
 * @param {object} payload - { teamId, activityId, status, score, note, result }
 */
function saveGroupLab(session, payload) {
  const team = findOne_('teams', { team_id: payload.teamId });
  if (!team) throw new Error('Tim tidak ditemukan.');
  ensureTeacherClassAccess(session, team.class_id);

  const unit = allLearningUnits_().find(u => u.practice_activity_id === payload.activityId);
  if (!unit) throw new Error('Aktivitas praktik tidak ditemukan.');

  const status = payload.status || 'submitted';
  if (!new Set(['submitted', 'verified', 'needs_revision']).has(status)) {
    throw new Error('Status praktik tim tidak valid.');
  }

  const score = payload.score === '' || payload.score === undefined || payload.score === null ? null : Number(payload.score);
  if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
    throw new Error('Nilai tim harus 0-100.');
  }

  const activeStudents = new Set(
    findAll_('master_students', r => r.class_id === team.class_id && (r.active === 1 || String(r.active).toLowerCase() === 'true'))
      .map(r => r.student_id)
  );
  const members = findAll_('team_members', r => r.team_id === team.team_id && activeStudents.has(r.student_id));
  if (!members.length) throw new Error('Tim belum memiliki anggota aktif.');

  const id = `${payload.teamId}|${payload.activityId}`;
  const checkedAt = isoNow_();
  const existing = findOne_('group_lab', { lab_result_id: id });

  if (
    existing &&
    existing.status === status &&
    String(existing.score) === String(score) &&
    String(existing.teacher_note || '') === String(payload.note || '')
  ) {
    return { ...existing, membersUpdated: 0, unchanged: true };
  }

  let previousResult = {};
  try {
    previousResult = existing ? JSON.parse(String(existing.result_json || '{}')) : {};
  } catch (e) {}

  const row = {
    lab_result_id: id,
    class_id: team.class_id,
    activity_id: payload.activityId,
    team_id: payload.teamId,
    status,
    score,
    result_json: JSON.stringify({ ...previousResult, ...(payload.result || {}) }),
    teacher_note: String(payload.note || ''),
    updated_at: checkedAt,
    updated_by: session.actor_id
  };

  upsert_('group_lab', 'lab_result_id', row);
  let membersUpdated = 0;

  if (status === 'verified' || status === 'needs_revision') {
    members.forEach(member => {
      const latest = latestTeacherCheck_(member.student_id, payload.activityId, 'practice');
      const revision = Number(latest ? latest.revision : 0) + 1;
      const checkId = uid_('CHK');

      append_('teacher_checks', {
        check_id: checkId,
        student_id: member.student_id,
        activity_id: payload.activityId,
        check_type: 'practice',
        status,
        score,
        note: `Tim ${team.team_id}${payload.note ? ': ' + String(payload.note) : ''}`,
        checked_by: session.actor_id,
        checked_at: checkedAt,
        revision
      });

      syncPracticeSkills_(member.student_id, payload.activityId, status, team.team_id, checkId, session.actor_id, checkedAt);
      membersUpdated++;
    });
  }

  audit_({ type: 'teacher', id: session.actor_id }, 'UPSERT_GROUP_LAB', 'group_lab', id, {
    status: row.status,
    score,
    members_updated: membersUpdated
  });

  return { ...row, membersUpdated };
}

/**
 * Dashboard pemantauan LKPD kelompok untuk guru
 * @param {object} session
 * @param {string} classId
 * @param {string} activityId
 */
function groupLabDashboard(session, classId, activityId) {
  ensureTeacherClassAccess(session, classId);
  const versions = findAll_('teams', r => r.class_id === classId).sort((a, b) => Number(b.version) - Number(a.version));
  const version = versions[0] ? versions[0].version : null;
  const teams = versions.filter(r => String(r.version) === String(version));
  const students = Object.fromEntries(findAll_('master_students', r => r.class_id === classId).map(s => [s.student_id, s]));

  return {
    classId,
    activityId,
    activities: allLearningUnits_().filter(u => u.practice_activity_id).map(u => ({ activityId: u.practice_activity_id, title: u.title })),
    teams: teams.map(t => {
      const res = findOne_('group_lab', { team_id: t.team_id, activity_id: activityId });
      const stored = practiceReportFromRow_(res);
      return {
        teamId: t.team_id,
        result: res,
        report: stored.report,
        meta: stored.meta,
        members: findAll_('team_members', m => m.team_id === t.team_id).map(m => ({
          ...m,
          name: students[m.student_id] ? students[m.student_id].name : m.student_id
        }))
      };
    })
  };
}

function studentTeamProgress_(studentId) {
  const memberships = findAll_('team_members', m => m.student_id === studentId);
  const teamIds = new Set(memberships.map(m => m.team_id));
  const teams = findAll_('teams', t => teamIds.has(t.team_id)).sort((a, b) => Number(b.version) - Number(a.version));
  if (!teams.length) return null;
  const team = teams[0];
  return {
    teamId: team.team_id,
    status: team.status,
    results: findAll_('group_lab', r => r.team_id === team.team_id).map(r => ({
      activityId: r.activity_id,
      status: r.status,
      score: r.score,
      teacherNote: r.teacher_note
    }))
  };
}

/**
 * =========================================================================
 * TEACHER LEARNING DASHBOARD & UNLOCK OVERRIDES
 * =========================================================================
 */

/**
 * Dashboard pembelajaran guru: matriks kelulusan rangkuman, nilai kuis, dan sinyal kesulitan siswa
 * @param {object} session
 * @param {string} classId
 * @param {string} activityId
 * @param {string} checkType
 */
function teacherLearningDashboard(session, classId, activityId, checkType) {
  ensureTeacherClassAccess(session, classId);

  const activities = allLearningUnits_().flatMap(u =>
    [{ activityId: u.learn_activity_id, title: `${u.title} - Rangkuman`, checkType: 'summary' }]
      .concat(u.practice_activity_id ? [{ activityId: u.practice_activity_id, title: `${u.title} - Praktik/LKPD`, checkType: 'practice' }] : [])
  );

  const selectedActivity = activities.find(x => x.activityId === activityId && x.checkType === checkType) || activities[0];
  const activeActivityId = selectedActivity ? selectedActivity.activityId : '';
  const activeCheckType = selectedActivity ? selectedActivity.checkType : 'summary';

  const students = findAll_('master_students', r =>
    r.class_id === classId && (r.active === 1 || String(r.active).toLowerCase() === 'true')
  ).sort((a, b) => Number(a.roll_no) - Number(b.roll_no));

  const studentIds = new Set(students.map(s => s.student_id));
  const latestChecks = {};
  const latestAttempts = {};
  const unit = allLearningUnits_().find(u => u.learn_activity_id === activeActivityId || u.practice_activity_id === activeActivityId);
  const quizActivityId = unit ? unit.quiz_activity_id : '';

  findAll_('teacher_checks', r =>
    studentIds.has(r.student_id) && r.activity_id === activeActivityId && r.check_type === activeCheckType
  ).forEach(x => {
    const p = latestChecks[x.student_id];
    if (
      !p ||
      Number(x.revision || 0) > Number(p.revision || 0) ||
      (Number(x.revision || 0) === Number(p.revision || 0) && String(x.checked_at) > String(p.checked_at))
    ) {
      latestChecks[x.student_id] = x;
    }
  });

  findAll_('quiz_attempts', r =>
    studentIds.has(r.student_id) && r.activity_id === quizActivityId && r.submitted_at
  ).forEach(x => {
    const p = latestAttempts[x.student_id];
    if (!p || compareMasteryAttempts_(x, p) < 0) {
      latestAttempts[x.student_id] = x;
    }
  });

  const confusionRows = unit
    ? findAll_('settings', row =>
        String(row.key).startsWith('confusion|') &&
        String(row.key).endsWith(`|${unit.unit_id}`) &&
        studentIds.has(String(row.key).split('|')[1])
      )
    : [];

  const confusionSummary = { concept: 0, term: 0, calculation: 0, practice: 0, clear: 0 };
  confusionRows.forEach(row => {
    try {
      const category = JSON.parse(String(row.value || '{}')).category;
      if (confusionSummary[category] !== undefined) confusionSummary[category]++;
    } catch (e) {}
  });

  return {
    classId,
    activityId: activeActivityId,
    checkType: activeCheckType,
    activities,
    selectedActivity,
    confusionSummary,
    students: students.map(s => ({
      studentId: s.student_id,
      name: s.name,
      rollNo: s.roll_no,
      check: latestChecks[s.student_id] || null,
      quiz: latestAttempts[s.student_id] || null
    }))
  };
}

/**
 * Guru memberikan izin pembukaan gerbang belajar manual kepada siswa
 * @param {object} session
 * @param {object} payload - { classId, activityId, studentIds, allowed, reason }
 */
function saveUnlockOverrides(session, payload) {
  ensureTeacherClassAccess(session, payload.classId);
  const activeStudents = findAll_('master_students', r =>
    r.class_id === payload.classId && (r.active === 1 || String(r.active).toLowerCase() === 'true')
  );
  const ids = new Set(activeStudents.map(r => r.student_id));

  const unit = allLearningUnits_().find(u =>
    u.learn_activity_id === payload.activityId ||
    u.quiz_activity_id === payload.activityId ||
    u.practice_activity_id === payload.activityId
  );
  if (!unit) throw new Error('Aktivitas belajar tidak ditemukan.');

  const targets = [unit.learn_activity_id, unit.quiz_activity_id].concat(
    unit.practice_activity_id ? [unit.practice_activity_id] : []
  );

  (payload.studentIds || []).forEach(studentId => {
    if (!ids.has(studentId)) {
      throw new Error('Siswa di luar kelas tidak dapat diberi pengecualian.');
    }
    targets.forEach(activityId => {
      append_('unlock_overrides', {
        override_id: uid_('OVR'),
        student_id: studentId,
        activity_id: activityId,
        allowed: payload.allowed !== false ? 1 : 0,
        reason: String(payload.reason || 'Penyesuaian guru'),
        created_by: session.actor_id,
        created_at: isoNow_()
      });
    });

    audit_({ type: 'teacher', id: session.actor_id }, 'UNLOCK_OVERRIDE', 'student_activity', `${studentId}|${unit.unit_id}`, {
      allowed: payload.allowed !== false,
      reason: String(payload.reason || '')
    });
  });

  return { saved: (payload.studentIds || []).length };
}

/**
 * =========================================================================
 * SEMESTER CARD (KARTU PENGUASAAN SEMESTER)
 * =========================================================================
 */

function semesterCardData_(studentId, semester, context) {
  context = context || studentLearningContext_(studentId);
  const units = allLearningUnits_().filter(u => Number(u.semester) === Number(semester));
  const outline = SEMESTER_OUTLINE_.find(x => Number(x.semester) === Number(semester));
  const chapterCount = new Set(units.map(x => x.chapter_id)).size;
  const curriculumComplete = !!outline && chapterCount >= outline.chapters.length;

  const details = units.map(u => {
    const summary = contextCheck_(context, u.learn_activity_id, 'summary');
    const quiz = contextAttempt_(context, u.quiz_activity_id);
    const practice = u.practice_activity_id ? contextCheck_(context, u.practice_activity_id, 'practice') : null;

    const summaryVerified = !!summary && summary.status === 'verified';
    const quizPassed = !!quiz && (String(quiz.passed).toLowerCase() === 'true' || quiz.passed === 1 || Number(quiz.score) >= (CONFIG.QUIZ_PASSING_SCORE || 70));
    const practiceVerified = !u.practice_activity_id || !u.practice_required || (!!practice && practice.status === 'verified');

    return {
      unitId: u.unit_id,
      title: u.title,
      summaryStatus: summary ? summary.status : 'not_checked',
      summaryScore: summary ? summary.score : '',
      quizScore: quiz ? quiz.score : '',
      quizPassed,
      practiceStatus: u.practice_activity_id
        ? (practice ? practice.status : u.practice_required ? 'not_checked' : 'optional')
        : 'not_required',
      practiceScore: practice ? practice.score : '',
      complete: summaryVerified && quizPassed && practiceVerified
    };
  });

  const skills = [...new Set(
    findAll_('skill_evidence', r => r.student_id === studentId && r.status === 'verified').map(r => r.skill_code)
  )];

  return {
    semester,
    eligible: curriculumComplete && details.length > 0 && details.every(x => x.complete),
    curriculumComplete,
    remainingChapters: outline ? outline.chapters.slice(chapterCount) : [],
    skills,
    details
  };
}

function semesterCard(session, semester) {
  const student = findOne_('master_students', { student_id: session.actor_id });
  const card = semesterCardData_(session.actor_id, semester);
  return {
    student: {
      name: student ? student.name : '',
      classId: student ? student.class_id : '',
      rollNo: student ? student.roll_no : ''
    },
    schoolYear: CONFIG.SCHOOL_YEAR,
    generatedAt: isoNow_(),
    eligible: card.eligible,
    ...card
  };
}

module.exports = {
  // Learning Gate & State Machine
  unitState_,
  unitStateCore_,
  studentLearningContext_,
  latestTeacherCheck_,
  latestQuizAttempt_,

  // Learning Catalog
  learningHome,
  learningUnitForStudent,
  saveConfusionSignal,

  // Summary Review
  submitSummaryForReview,
  saveTeacherChecks,

  // Quiz Engine
  startQuiz,
  submitQuiz,
  sampledQuizItemsForAttempt_,
  quizOptionsForAttempt_,

  // Practice & Group Lab
  saveTeamPracticeReport,
  saveGroupLab,
  groupLabDashboard,
  studentTeamWithProgress_,
  practiceWorkspace_,
  authorizeControlledFallback,
  revokeControlledFallback,
  getTeacherFallbackAuthorization_,

  // Teacher Dashboard & Overrides
  teacherLearningDashboard,
  saveUnlockOverrides,

  // Semester Card
  semesterCard,
  semesterCardData_
};

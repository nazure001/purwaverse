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

/**
 * Membulatkan angka ke 2 tempat desimal (sesuai round2_ GAS)
 * @param {number} n
 * @returns {number}
 */
function round2_(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

/**
 * Deterministic Linear Congruential Generator Shuffle (sesuai stableShuffle_ GAS)
 * Mengacak array secara deterministik berdasarkan seed string
 * @param {Array} items
 * @param {string} seed
 * @returns {Array}
 */
function stableShuffle_(items, seed) {
  const out = items.slice();
  let n = 0;
  const seedStr = String(seed || '');
  for (let i = 0; i < seedStr.length; i++) {
    n = (n * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  for (let i = out.length - 1; i > 0; i--) {
    n = (1664525 * n + 1013904223) >>> 0;
    const j = n % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deteksi kata kunci pemicu kecurangan atau AI (honeypot check)
 * @param {string} text
 * @returns {boolean}
 */
function hasHoneypotTrigger_(text) {
  const t = String(text || '').toLowerCase();
  const keys = [
    'kekuatan bulan', 'chatgpt', 'gemini', 'claude', 'dola', 'openai',
    'model:', 'seblak', 'boba', 'terlalu mengantuk', 'robot pintar', 'buku paket'
  ];
  return keys.some(k => t.includes(k));
}

/**
 * Menentukan peran default anggota tim berdasarkan urutan
 * @param {number} i
 * @returns {string}
 */
function defaultRole_(i) {
  const roles = ['Lab Operator', 'Data Recorder', 'Evidence Checker', 'Communicator'];
  return roles[(i - 1) % 4];
}

/**
 * =========================================================================
 * MISSION 0 & DIAGNOSTIC ENGINE
 * =========================================================================
 */

/**
 * Mengambil daftar butir soal Mission 0 untuk siswa tertentu
 * Menggunakan deterministic sampling (5 s.d. 9 butir) mewakili 5 domain
 * @param {string} studentId
 * @returns {{ items: Array<object>, durationSeconds: number, totalCount: number }}
 */
function getDiagnosticItems(studentId) {
  const allItems = findAll_('diagnostic_items', r => String(r.active).toLowerCase() === 'true' || r.active === 1);
  if (!allItems.length) {
    throw new Error('Bank butir diagnostik belum dimuat dari sumber resmi.');
  }
  const itemMap = Object.fromEntries(allItems.map(i => [i.item_id, i]));

  const existingResponses = findAll_('diagnostic_responses', { student_id: studentId });
  let selectedIds = [];

  if (existingResponses.length > 0) {
    selectedIds = existingResponses.map(r => r.item_id);
  } else {
    const sessionKey = 'diag_session|' + studentId;
    const sessionSetting = findOne_('settings', { key: sessionKey });
    if (sessionSetting && sessionSetting.value) {
      try {
        selectedIds = JSON.parse(sessionSetting.value);
      } catch (e) {
        selectedIds = [];
      }
    }

    if (!selectedIds || selectedIds.length < 5) {
      selectedIds = [];
      const usedIds = new Set();

      // Hitung target jumlah butir (5 s.d. 9 butir) secara deterministik per siswa
      let seedVal = 0;
      const seedStr = studentId + '|diag_count|v4';
      for (let i = 0; i < seedStr.length; i++) {
        seedVal = (seedVal * 31 + seedStr.charCodeAt(i)) >>> 0;
      }
      const targetCount = 5 + (seedVal % 5); // 5, 6, 7, 8, atau 9 butir

      // 1 butir per domain secara acak terdistribusi stabil (5 domain utama wajib)
      CONFIG.DOMAINS.forEach((domain) => {
        const domainItems = allItems.filter(i => i.domain === domain);
        if (domainItems.length > 0) {
          const shuffled = stableShuffle_(domainItems, `${studentId}|${domain}|v4`);
          selectedIds.push(shuffled[0].item_id);
          usedIds.add(shuffled[0].item_id);
        }
      });

      // Jika targetCount > 5, ambil butir ekstra dari sisa bank butir
      if (targetCount > selectedIds.length) {
        const remaining = allItems.filter(i => !usedIds.has(i.item_id));
        if (remaining.length > 0) {
          const extraNeeded = targetCount - selectedIds.length;
          const shuffledRemaining = stableShuffle_(remaining, `${studentId}|EXTRA|v4`);
          shuffledRemaining.slice(0, extraNeeded).forEach(item => {
            selectedIds.push(item.item_id);
            usedIds.add(item.item_id);
          });
        }
      }

      // Acak urutan tampil soal
      selectedIds = stableShuffle_(selectedIds, `${studentId}|DISPLAY_ORDER|v4`);

      upsert_('settings', 'key', {
        key: sessionKey,
        value: JSON.stringify(selectedIds),
        updated_at: isoNow_()
      });
    }
  }

  // Saring field aman tanpa membocorkan rubric_json ke klien
  const items = selectedIds
    .map(id => itemMap[id])
    .filter(Boolean)
    .map(({ rubric_json, ...safe }) => safe);

  const durationSeconds = items.length * (CONFIG.DIAGNOSTIC_SECONDS_PER_ITEM || 210);
  return { items, durationSeconds, totalCount: items.length };
}

/**
 * Menyimpan respon jawaban Mission 0 yang disubmit oleh siswa
 * @param {object} session - Session siswa
 * @param {object} payload - { responses: Array<{ itemId, answer }>, isTimeout, remainingSeconds, selfMapScore }
 * @returns {{ submitted: boolean, scored: boolean, speedBonusSeconds: number }}
 */
function submitDiagnostic(session, payload = {}) {
  const allItems = findAll_('diagnostic_items', r => String(r.active).toLowerCase() === 'true' || r.active === 1);
  if (!allItems.length) {
    throw new Error('Butir diagnostik produksi belum dimuat dari sumber resmi.');
  }
  const byId = Object.fromEntries(allItems.map(x => [x.item_id, x]));

  const responses = payload.responses || [];
  const unique = new Set(responses.map(x => x.itemId));
  if (responses.length < 5 || unique.size !== responses.length) {
    throw new Error('Semua butir tantangan Mission 0 harus dikerjakan lengkap.');
  }

  const isTimeout = payload.isTimeout === true;

  responses.forEach(response => {
    if (!byId[response.itemId]) {
      throw new Error('Butir diagnostik tidak dikenal: ' + response.itemId);
    }
    const ansText = String(response.answer || '').trim();
    if (!ansText && !isTimeout) {
      throw new Error('Jawaban diagnostik tidak boleh kosong.');
    }
    const finalAnswer = ansText || (isTimeout ? '[Waktu habis - belum sempat dijawab]' : '');
    const responseId = `${session.actor_id}|${response.itemId}`;
    const existing = findOne_('diagnostic_responses', { response_id: responseId });

    if (existing && existing.score !== '' && existing.score !== null && String(existing.answer) !== finalAnswer) {
      throw new Error('Jawaban yang sudah dinilai tidak dapat diubah. Hubungi guru bila perlu koreksi.');
    }

    upsert_('diagnostic_responses', 'response_id', {
      response_id: responseId,
      student_id: session.actor_id,
      item_id: response.itemId,
      answer: finalAnswer,
      score: existing ? existing.score : null,
      scored_by: existing ? existing.scored_by : null,
      submitted_at: isoNow_()
    });
  });

  const speedSeconds = Math.max(0, Number(payload.remainingSeconds || 0));
  upsert_('settings', 'key', {
    key: 'diag_speed|' + session.actor_id,
    value: String(speedSeconds),
    updated_at: isoNow_()
  });

  upsert_('settings', 'key', {
    key: 'self_map|' + session.actor_id,
    value: String(payload.selfMapScore || ''),
    updated_at: isoNow_()
  });

  saveProgress(session, {
    activityId: 'M0-QUICK',
    status: 'submitted',
    score: null
  });

  return { submitted: true, scored: false, speedBonusSeconds: speedSeconds };
}

/**
 * Menghitung profil diagnostik 5 domain, overall reasoning, leader index, & research readiness
 * Rumus asli 100% dipertahankan dari Services.gs
 * @param {string} studentId
 * @param {number|string} selfMapScore
 * @param {number} speedSeconds
 * @returns {object} Record profil tersimpan
 */
function calculateDiagnosticProfile(studentId, selfMapScore = 0, speedSeconds = 0) {
  const responses = findAll_('diagnostic_responses', r =>
    r.student_id === studentId && r.score !== '' && r.score !== null && r.score !== undefined
  );
  const items = Object.fromEntries(rows_('diagnostic_items').map(x => [x.item_id, x]));
  const scores = {};
  const scoredDomains = [];

  CONFIG.DOMAINS.forEach(d => {
    const vals = responses
      .filter(r => items[r.item_id] && items[r.item_id].domain === d)
      .map(r => Number(r.score));

    if (vals.length) {
      scores[d] = vals.reduce((a, b) => a + b, 0) / vals.length;
      scoredDomains.push(scores[d]);
    } else {
      scores[d] = 0;
    }
  });

  const domainAvg = scoredDomains.length
    ? (scoredDomains.reduce((a, b) => a + b, 0) / scoredDomains.length)
    : 0;

  CONFIG.DOMAINS.forEach(d => {
    if (!scores[d]) scores[d] = domainAvg;
  });

  const baseOverall = CONFIG.DOMAINS.reduce((n, d) => n + scores[d], 0) / CONFIG.DOMAINS.length;

  // Speed Bonus: sisa waktu menambah poin efisiensi hingga +0.25 (skala 0-4)
  const speedBonus = speedSeconds > 0 ? Math.min(0.25, round2_(speedSeconds / 1200 * 0.25)) : 0;
  const overall = Math.min(4, round2_(baseOverall + speedBonus));

  const normalizedSelfMap = Math.max(0, Math.min(4, Number(selfMapScore) - 1));
  const leader = 0.75 * overall + 0.25 * normalizedSelfMap;
  const research = (scores.evidence_experiment + scores.systems_causality + scores.technology_design) / 3;
  const readiness = research >= 3.25 ? 'R4' : research >= 2.5 ? 'R3' : research >= 1.5 ? 'R2' : 'R1';

  const profileRecord = {
    profile_id: studentId,
    student_id: studentId,
    observe_infer: round2_(scores.observe_infer),
    evidence_experiment: round2_(scores.evidence_experiment),
    model_concept: round2_(scores.model_concept),
    systems_causality: round2_(scores.systems_causality),
    technology_design: round2_(scores.technology_design),
    overall_reasoning: round2_(overall),
    self_map_score: round2_(normalizedSelfMap),
    leader_index: round2_(leader),
    research_readiness: readiness,
    updated_at: isoNow_()
  };

  return upsert_('diagnostic_profiles', 'profile_id', profileRecord);
}

/**
 * Guru memberikan nilai 0-4 pada satu respon jawaban diagnostik siswa
 * @param {object} session - Session guru
 * @param {object} payload - { studentId, itemId, score }
 */
function scoreDiagnosticResponse(session, payload) {
  const student = findOne_('master_students', { student_id: payload.studentId });
  if (!student) throw new Error('Siswa tidak ditemukan.');
  ensureTeacherClassAccess(session, student.class_id);

  const responseId = `${payload.studentId}|${payload.itemId}`;
  const response = findOne_('diagnostic_responses', { response_id: responseId });
  if (!response) throw new Error('Jawaban diagnostik tidak ditemukan.');

  const score = Number(payload.score);
  if (!Number.isInteger(score) || score < 0 || score > 4) {
    throw new Error('Skor harus bilangan bulat 0-4.');
  }

  upsert_('diagnostic_responses', 'response_id', {
    ...response,
    score,
    scored_by: session.actor_id
  });

  const studentResponses = findAll_('diagnostic_responses', { student_id: payload.studentId });
  const expected = studentResponses.length;
  const scored = studentResponses.filter(r => r.score !== '' && r.score !== null && r.score !== undefined).length;

  let profile = null;
  if (scored >= expected && expected >= 5) {
    const selfMap = findOne_('settings', { key: 'self_map|' + payload.studentId });
    const speedSetting = findOne_('settings', { key: 'diag_speed|' + payload.studentId });
    const speedSeconds = Number(speedSetting ? speedSetting.value : 0);
    profile = calculateDiagnosticProfile(payload.studentId, Number(selfMap ? selfMap.value : 0), speedSeconds);

    upsert_('progress', 'progress_id', {
      progress_id: payload.studentId + '|M0-QUICK',
      student_id: payload.studentId,
      activity_id: 'M0-QUICK',
      status: 'completed',
      score: profile.overall_reasoning,
      evidence_json: JSON.stringify({ scored_items: scored, speed_bonus_seconds: speedSeconds }),
      updated_at: isoNow_(),
      updated_by: session.actor_id
    });
  }

  audit_({ type: 'teacher', id: session.actor_id }, 'SCORE_DIAGNOSTIC', 'response', responseId, { score });
  return { profile, scored, expected, complete: scored >= expected && expected >= 5 };
}

/**
 * Guru mereset hasil pengerjaan diagnostik siswa
 * @param {object} session
 * @param {object} payload - { classId, studentId }
 */
function resetStudentDiagnostic(session, payload) {
  ensureTeacherClassAccess(session, payload.classId);
  const student = findOne_('master_students', { student_id: payload.studentId });
  if (!student) throw new Error('Siswa tidak ditemukan.');

  deleteWhere_('diagnostic_responses', { student_id: payload.studentId });
  deleteWhere_('diagnostic_profiles', { student_id: payload.studentId });
  deleteWhere_('progress', { student_id: payload.studentId, activity_id: 'M0-QUICK' });
  deleteWhere_('settings', r =>
    r.key === 'diag_session|' + payload.studentId ||
    r.key === 'diag_speed|' + payload.studentId ||
    r.key === 'self_map|' + payload.studentId
  );

  audit_({ type: 'teacher', id: session.actor_id }, 'RESET_DIAGNOSTIC', 'student', payload.studentId, { classId: payload.classId });
  return { reset: true, studentId: payload.studentId };
}

/**
 * Review butir diagnostik siswa oleh guru untuk satu kelas
 * @param {object} session
 * @param {string} classId
 */
function diagnosticReview(session, classId) {
  ensureTeacherClassAccess(session, classId);
  const students = findAll_('master_students', r =>
    r.class_id === classId && (r.active === 1 || String(r.active).toLowerCase() === 'true')
  );
  const ids = new Set(students.map(s => s.student_id));
  const items = Object.fromEntries(rows_('diagnostic_items').map(i => [i.item_id, i]));
  const responsesByStudent = {};

  findAll_('diagnostic_responses', r => ids.has(r.student_id)).forEach(r => {
    if (!responsesByStudent[r.student_id]) responsesByStudent[r.student_id] = [];
    responsesByStudent[r.student_id].push({
      ...r,
      prompt: items[r.item_id]?.prompt || '',
      rubric_json: items[r.item_id]?.rubric_json || '{}'
    });
  });

  return students.map(s => ({
    studentId: s.student_id,
    name: s.name,
    rollNo: s.roll_no,
    responses: responsesByStudent[s.student_id] || []
  }));
}

/**
 * =========================================================================
 * TEAM BUILDER (SNAKE DRAFT & BALANCE OPTIMIZATION)
 * =========================================================================
 */

/**
 * Memvalidasi profil lengkap untuk kumpulan siswa
 * @param {Array<string>} studentIds
 * @returns {Record<string, object>}
 */
function validProfilesForStudents_(studentIds) {
  const ids = new Set((studentIds || []).map(String));
  if (!ids.size) return {};

  const profiles = findAll_('diagnostic_profiles', r => ids.has(String(r.student_id)));
  if (!profiles.length) return {};
  const profileMap = Object.fromEntries(profiles.map(p => [p.student_id, p]));
  const candidateIds = new Set(Object.keys(profileMap));
  const responsesByStudent = {};

  findAll_('diagnostic_responses', r => candidateIds.has(String(r.student_id)))
    .forEach(r => {
      if (!responsesByStudent[r.student_id]) responsesByStudent[r.student_id] = [];
      responsesByStudent[r.student_id].push(r);
    });

  const result = {};
  candidateIds.forEach(studentId => {
    const responses = responsesByStudent[studentId] || [];
    if (responses.length < 5) return;
    const legacy = responses.every(r => String(r.answer).trim().toLowerCase() === 'jawaban integrasi');
    const scored = responses.filter(r => r.score !== '' && r.score !== null && r.score !== undefined).length;
    if (!legacy && scored >= responses.length && profileMap[studentId]) {
      result[studentId] = profileMap[studentId];
    }
  });

  return result;
}

/**
 * Fungsi objektif untuk optimasi keseimbangan tim
 * @param {Array<object>} teams
 * @param {Record<string, object>} profiles
 * @returns {number}
 */
function teamObjective_(teams, profiles) {
  const spreads = [['overall_reasoning']].concat(CONFIG.DOMAINS.map(d => [d])).map(([field]) => {
    const means = teams.map(t =>
      t.members.reduce((n, s) => n + Number(profiles[s.student_id]?.[field] || 0), 0) / t.members.length
    );
    return Math.max(...means) - Math.min(...means);
  });
  return spreads[0] * 2 + spreads.slice(1).reduce((a, b) => a + b, 0) / CONFIG.DOMAINS.length;
}

/**
 * Optimasi keseimbangan tim melalui 3-pass pairwise swapping
 * @param {Array<object>} teams
 * @param {Record<string, object>} profiles
 */
function improveTeamBalance_(teams, profiles) {
  let best = teamObjective_(teams, profiles);
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let a = 0; a < teams.length; a++) {
      for (let b = a + 1; b < teams.length; b++) {
        for (let i = 1; i < teams[a].members.length; i++) {
          for (let j = 1; j < teams[b].members.length; j++) {
            const left = teams[a].members[i];
            const right = teams[b].members[j];
            teams[a].members[i] = right;
            teams[b].members[j] = left;
            const candidate = teamObjective_(teams, profiles);
            if (candidate + 0.0001 < best) {
              best = candidate;
              changed = true;
            } else {
              teams[a].members[i] = left;
              teams[b].members[j] = right;
            }
          }
        }
      }
    }
    if (!changed) break;
  }
}

/**
 * Menghasilkan tim laboratorium seimbang dengan algoritma Snake Draft & Leader Selection
 * @param {object} teacherSession
 * @param {string} classId
 * @param {object} options - { teamCount }
 */
function generateTeams(teacherSession, classId, options = {}) {
  ensureTeacherClassAccess(teacherSession, classId);

  // Jika sudah ada draft aktif, gunakan kembali
  const existingDrafts = findAll_('teams', r => r.class_id === classId && r.status === 'draft')
    .sort((a, b) => Number(b.version) - Number(a.version));

  if (existingDrafts.length) {
    const version = existingDrafts[0].version;
    const drafts = existingDrafts.filter(r => String(r.version) === String(version));
    const studentMap = Object.fromEntries(rows_('master_students').map(s => [s.student_id, s]));
    return {
      classId,
      balanceScore: Number(drafts[0].balance_score || 0),
      reusedDraft: true,
      teams: drafts.map((t, i) => ({
        number: i + 1,
        teamId: t.team_id,
        members: findAll_('team_members', m => m.team_id === t.team_id)
          .map(m => studentMap[m.student_id])
          .filter(Boolean)
      }))
    };
  }

  const students = findAll_('master_students', r =>
    r.class_id === classId && (r.active === 1 || String(r.active).toLowerCase() === 'true')
  );
  if (!students.length) {
    throw new Error('Tidak ada siswa aktif pada kelas ini.');
  }

  const profiles = validProfilesForStudents_(students.map(s => s.student_id));
  const diagnosed = students.filter(s => profiles[s.student_id]);
  const count = Math.min(Number(options && options.teamCount || CONFIG.TEAM_COUNT), students.length);

  if (diagnosed.length < count) {
    throw new Error(`Team Builder membutuhkan minimal ${count} profil lengkap sebagai calon Science Leader. Saat ini baru ${diagnosed.length}.`);
  }

  // 1. Pilih Leader berdasarkan Leader Index tertinggi
  const ranked = diagnosed.slice().sort((a, b) =>
    Number(profiles[b.student_id]?.leader_index || 0) - Number(profiles[a.student_id]?.leader_index || 0)
  );
  const leaders = ranked.slice(0, count);
  const leaderIds = new Set(leaders.map(s => s.student_id));

  // 2. Sisa siswa diurutkan berdasarkan overall_reasoning untuk Snake Draft
  const rest = students
    .filter(s => !leaderIds.has(s.student_id))
    .sort((a, b) => Number(profiles[b.student_id]?.overall_reasoning || 0) - Number(profiles[a.student_id]?.overall_reasoning || 0));

  const teams = Array.from({ length: count }, (_, i) => ({ number: i + 1, members: [leaders[i]] }));
  rest.forEach((s, i) => {
    const round = Math.floor(i / count);
    const pos = i % count;
    const index = round % 2 === 0 ? pos : count - 1 - pos;
    teams[index].members.push(s);
  });

  // 3. Optimasi Keseimbangan Tim (Balance Improvement)
  improveTeamBalance_(teams, profiles);

  // 4. Hitung Skor Keseimbangan (0 - 100)
  const means = teams.map(t =>
    t.members.reduce((n, s) => n + Number(profiles[s.student_id]?.overall_reasoning || 0), 0) / t.members.length
  );
  const spread = Math.max(...means) - Math.min(...means);
  const balance = round2_(Math.max(0, 100 - (spread / 4 * 100)));
  const version = Date.now();

  // 5. Simpan ke database
  teams.forEach(t => {
    const teamId = `${classId}-T${String(t.number).padStart(2, '0')}-V${version}`;
    const deputy = t.members.slice(1).sort((a, b) =>
      Number(profiles[b.student_id]?.leader_index || 0) - Number(profiles[a.student_id]?.leader_index || 0) ||
      String(a.student_id).localeCompare(String(b.student_id))
    )[0] || null;

    append_('teams', {
      team_id: teamId,
      class_id: classId,
      version,
      balance_score: balance,
      status: 'draft',
      created_at: isoNow_(),
      created_by: teacherSession.actor_id
    });

    t.members.forEach((s, i) => {
      const isLeader = (i === 0);
      const isDeputy = deputy && s.student_id === deputy.student_id;
      const role = isLeader
        ? 'Scientist Leader'
        : isDeputy
          ? 'Deputy Scientist Leader'
          : defaultRole_(i);

      append_('team_members', {
        membership_id: `${teamId}|${s.student_id}`,
        team_id: teamId,
        student_id: s.student_id,
        role,
        is_leader: isLeader ? 1 : 0,
        locked: 0,
        override_note: ''
      });
    });

    t.teamId = teamId;
  });

  audit_({ type: 'teacher', id: teacherSession.actor_id }, 'GENERATE_TEAMS', 'class', classId, { balance_score: balance });
  return { classId, balanceScore: balance, teams };
}

/**
 * Guru melakukan penyesuaian peran atau mengunci anggota tim
 * @param {object} session
 * @param {object} payload - { membershipId, role, locked, note }
 */
function overrideTeamMember(session, payload) {
  const membership = findOne_('team_members', { membership_id: payload.membershipId });
  if (!membership) throw new Error('Keanggotaan tidak ditemukan.');
  const team = findOne_('teams', { team_id: membership.team_id });
  if (!team) throw new Error('Tim tidak ditemukan.');
  ensureTeacherClassAccess(session, team.class_id);

  const updated = upsert_('team_members', 'membership_id', {
    ...membership,
    role: payload.role || membership.role,
    locked: payload.locked === undefined ? membership.locked : (payload.locked ? 1 : 0),
    override_note: payload.note || membership.override_note
  });

  audit_({ type: 'teacher', id: session.actor_id }, 'OVERRIDE_TEAM_MEMBER', 'membership', payload.membershipId, { note: payload.note || '' });
  return updated;
}

/**
 * =========================================================================
 * PROGRESS & DASHBOARD
 * =========================================================================
 */

/**
 * Menyimpan progress pengerjaan materi/aktivitas siswa
 * @param {object} session
 * @param {object} payload - { activityId, status, score, evidence }
 */
function saveProgress(session, payload) {
  const activity = findOne_('master_activities', r =>
    r.activity_id === payload.activityId && (r.active === 1 || String(r.active).toLowerCase() === 'true')
  );
  if (!activity) throw new Error('Aktivitas tidak ditemukan.');
  if (payload.score !== undefined && payload.score !== '' && payload.score !== null) {
    throw new Error('Nilai hanya dapat diberikan oleh sistem kuis atau guru.');
  }
  const allowedStatus = new Set(['draft', 'submitted', 'completed']);
  if (!allowedStatus.has(payload.status || 'completed')) {
    throw new Error('Status aktivitas tidak valid.');
  }

  const progressId = `${session.actor_id}|${payload.activityId}`;
  const existing = findOne_('progress', { progress_id: progressId });

  const record = upsert_('progress', 'progress_id', {
    progress_id: progressId,
    student_id: session.actor_id,
    activity_id: payload.activityId,
    status: payload.status || 'completed',
    score: existing ? existing.score : null,
    evidence_json: JSON.stringify(payload.evidence || {}),
    updated_at: isoNow_(),
    updated_by: session.actor_id
  });

  audit_({ type: 'student', id: session.actor_id }, 'UPSERT_PROGRESS', 'progress', progressId, { activity_id: payload.activityId });
  return record;
}

/**
 * Mengambil ringkasan data pembelajaran kelas untuk guru
 * @param {object} session
 * @param {string} classId
 */
function getDashboard(session, classId) {
  ensureTeacherClassAccess(session, classId);
  const students = findAll_('master_students', r =>
    r.class_id === classId && (r.active === 1 || String(r.active).toLowerCase() === 'true')
  );
  const ids = new Set(students.map(s => s.student_id));
  const progress = findAll_('progress', r => ids.has(r.student_id));
  const profiles = validProfilesForStudents_(students.map(s => s.student_id));
  const diagnosedCount = Object.keys(profiles).length;

  return {
    classId,
    studentCount: students.length,
    diagnosedCount,
    progressCount: progress.length,
    canGenerateTeams: students.length > 0 && diagnosedCount >= Math.min(CONFIG.TEAM_COUNT, students.length),
    students: students.map(s => ({
      studentId: s.student_id,
      name: s.name,
      rollNo: s.roll_no,
      progress: progress.filter(p => p.student_id === s.student_id),
      profile: profiles[s.student_id] || null
    }))
  };
}

/**
 * =========================================================================
 * LEADERBOARD (PUBLIC AGGREGATION & BADGES)
 * =========================================================================
 */

/**
 * Mengagregasi data leaderboard publik lintas kelas, badges, dan skor integritas
 * @param {boolean} [force=false]
 */
function publicLeaderboardData(force = false) {
  const students = findAll_('master_students', r => r.active === 1 || String(r.active).toLowerCase() === 'true');
  const studentIds = new Set(students.map(s => s.student_id));
  const studentClassMap = Object.fromEntries(students.map(s => [s.student_id, s.class_id]));

  const progressRows = findAll_('progress', r => studentIds.has(r.student_id));
  const quizRows = findAll_('quiz_attempts', r => studentIds.has(r.student_id) && r.submitted_at);
  const diagResponses = findAll_('diagnostic_responses', r => studentIds.has(r.student_id));
  const diagProfiles = Object.fromEntries(
    findAll_('diagnostic_profiles', r => studentIds.has(r.student_id)).map(p => [p.student_id, p])
  );

  const classStats = {
    '8A': { total: 0, flagged: 0, studentCount: 0, completedTasks: 0 },
    '8B': { total: 0, flagged: 0, studentCount: 0, completedTasks: 0 },
    '8C': { total: 0, flagged: 0, studentCount: 0, completedTasks: 0 },
    '8D': { total: 0, flagged: 0, studentCount: 0, completedTasks: 0 },
    '8E': { total: 0, flagged: 0, studentCount: 0, completedTasks: 0 }
  };

  const studentProgressMap = {};
  const studentQuizMap = {};
  const studentFlagsMap = {};

  students.forEach(s => {
    const cId = s.class_id;
    if (cId && classStats[cId]) classStats[cId].studentCount++;
    studentProgressMap[s.student_id] = [];
    studentQuizMap[s.student_id] = [];
    studentFlagsMap[s.student_id] = { aiCount: 0, tabSwitches: 0, hasExtreme: false };
  });

  progressRows.forEach(p => {
    const cId = studentClassMap[p.student_id];
    if (cId && classStats[cId]) {
      classStats[cId].total++;
      if (p.status === 'completed' || p.status === 'verified') classStats[cId].completedTasks++;
    }
    if (studentProgressMap[p.student_id]) studentProgressMap[p.student_id].push(p);

    const evStr = String(p.evidence_json || '');
    if (evStr.includes('[PERINGATAN:') || hasHoneypotTrigger_(evStr)) {
      if (cId && classStats[cId]) classStats[cId].flagged++;
      if (studentFlagsMap[p.student_id]) {
        studentFlagsMap[p.student_id].aiCount++;
        const match = evStr.match(/Pindah Tab (\d+)x/);
        if (match) {
          const count = parseInt(match[1], 10) || 0;
          studentFlagsMap[p.student_id].tabSwitches += count;
          if (count >= 5) studentFlagsMap[p.student_id].hasExtreme = true;
        }
        if (hasHoneypotTrigger_(evStr)) studentFlagsMap[p.student_id].hasExtreme = true;
      }
    }
  });

  diagResponses.forEach(r => {
    const cId = studentClassMap[r.student_id];
    if (cId && classStats[cId]) classStats[cId].total++;
    const ans = String(r.answer || '');
    if (ans.includes('[PERINGATAN:') || hasHoneypotTrigger_(ans)) {
      if (cId && classStats[cId]) classStats[cId].flagged++;
      if (studentFlagsMap[r.student_id]) {
        studentFlagsMap[r.student_id].aiCount++;
        const match = ans.match(/Pindah Tab (\d+)x/);
        if (match) {
          const count = parseInt(match[1], 10) || 0;
          studentFlagsMap[r.student_id].tabSwitches += count;
          if (count >= 5) studentFlagsMap[r.student_id].hasExtreme = true;
        }
        if (hasHoneypotTrigger_(ans)) studentFlagsMap[r.student_id].hasExtreme = true;
      }
    }
  });

  quizRows.forEach(q => {
    const cId = studentClassMap[q.student_id];
    if (cId && classStats[cId]) {
      classStats[cId].completedTasks++;
    }
    if (studentQuizMap[q.student_id]) studentQuizMap[q.student_id].push(q);
  });

  const EXPECTED_TASKS_PER_STUDENT = 12;

  const integrityIndex = Object.keys(classStats).map(cId => {
    const stat = classStats[cId];
    let percent = 100;
    if (stat.total > 0) {
      percent = Math.max(0, Math.round(((stat.total - stat.flagged) / stat.total) * 100));
    }

    let completionPercent = 0;
    if (stat.studentCount > 0) {
      completionPercent = Math.min(100, Math.round((stat.completedTasks / (stat.studentCount * EXPECTED_TASKS_PER_STUDENT)) * 100));
    }

    return {
      classId: cId,
      percent,
      completionPercent,
      totalSubmissions: stat.total,
      flaggedCount: stat.flagged
    };
  });

  const leaderboard = students.map(s => {
    const sId = s.student_id;
    const progs = studentProgressMap[sId] || [];
    const quizzes = studentQuizMap[sId] || [];
    const profile = diagProfiles[sId] || null;
    const flags = studentFlagsMap[sId] || { aiCount: 0, tabSwitches: 0, hasExtreme: false };

    let completedMissions = 0;
    let rawScore = 0;
    const badges = [];

    if (profile) {
      completedMissions++;
      if (String(profile.research_readiness || '').toLowerCase().includes('tinggi') || profile.research_readiness === 'R4' || profile.research_readiness === 'R3') {
        badges.push({ icon: '🧠', name: 'Master of Logic' });
      } else {
        badges.push({ icon: '🔭', name: 'Curious Observer' });
      }
    }

    let perfectQuizzes = 0;
    progs.forEach(p => {
      if (p.activity_id === 'M0-QUICK') return;
      const isCompleted = p.status === 'completed' || p.status === 'verified';
      if (isCompleted) {
        completedMissions++;
        if (p.activity_id.includes('-LRN')) badges.push({ icon: '📚', name: 'Scholar' });
        if (p.activity_id.includes('-LAB')) badges.push({ icon: '🔬', name: 'Lab Researcher' });
      }
    });

    const passedQuizzes = new Set();
    quizzes.forEach(q => {
      const sc = Number(q.score) || 0;
      rawScore += sc;
      if (sc === 100) {
        badges.push({ icon: '💎', name: 'Diamond Mind' });
        perfectQuizzes++;
      } else if (sc >= 90) {
        badges.push({ icon: '🥇', name: 'Gold Mind' });
      } else if (sc >= 80) {
        badges.push({ icon: '🥈', name: 'Silver Mind' });
      }
      const isPassed = String(q.passed).toLowerCase() === 'true' || q.passed === 1 || sc >= (CONFIG.QUIZ_PASSING_SCORE || 70);
      if (isPassed && q.activity_id) {
        passedQuizzes.add(q.activity_id);
      }
    });

    completedMissions += passedQuizzes.size;
    if (passedQuizzes.size >= 1) badges.push({ icon: '🎓', name: 'Quiz Master' });

    if (completedMissions >= 1) badges.push({ icon: '🎯', name: 'First Blood' });
    if (completedMissions >= 3) badges.push({ icon: '🔥', name: 'Streak Master' });
    if (completedMissions >= 7) badges.push({ icon: '🚀', name: 'Hyperdrive' });
    if (perfectQuizzes >= 3) badges.push({ icon: '👑', name: 'Flawless Crown' });

    const uniqueBadges = [];
    const badgeNames = new Set();
    badges.forEach(b => {
      if (!badgeNames.has(b.name)) {
        badgeNames.add(b.name);
        uniqueBadges.push(b);
      }
    });

    let penalty = 0;
    if (flags.hasExtreme) {
      penalty = 150 + (flags.aiCount * 25);
    } else if (flags.aiCount > 0) {
      penalty = (flags.aiCount * 15) + Math.min(60, flags.tabSwitches * 5);
    }

    const netScore = Math.max(0, (completedMissions * 1000) + rawScore - penalty);

    return {
      studentId: sId,
      name: s.name,
      classId: s.class_id,
      rollNo: s.roll_no,
      completedMissions,
      rawScore,
      penalty,
      netScore,
      badges: uniqueBadges,
      isExtreme: flags.hasExtreme
    };
  });

  leaderboard.sort((a, b) => {
    if (b.netScore !== a.netScore) return b.netScore - a.netScore;
    if (a.penalty !== b.penalty) return a.penalty - b.penalty;
    if (b.completedMissions !== a.completedMissions) return b.completedMissions - a.completedMissions;
    return a.name.localeCompare(b.name);
  });

  leaderboard.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const now = new Date();
  const formattedDate = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) + ', ' + now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return {
    updatedAt: formattedDate,
    totalStudents: students.length,
    integrityIndex,
    topTen: leaderboard.slice(0, 10),
    roster: leaderboard
  };
}

module.exports = {
  // Mission 0 & Diagnostic
  getDiagnosticItems,
  submitDiagnostic,
  calculateDiagnosticProfile,
  scoreDiagnosticResponse,
  resetStudentDiagnostic,
  diagnosticReview,

  // Team Builder
  generateTeams,
  overrideTeamMember,
  validProfilesForStudents_,
  teamObjective_,
  improveTeamBalance_,

  // Progress & Dashboard
  saveProgress,
  getDashboard,

  // Leaderboard
  publicLeaderboardData,

  // Helpers
  round2_,
  stableShuffle_,
  hasHoneypotTrigger_,
  defaultRole_
};

/**
 * PURWAVERSE LMS PHASE 1 - ISOLATED E2E VERIFICATION SCRIPT
 *
 * Menjalankan pengujian E2E lengkap dengan:
 * 1. Database SQLite terisolasi sementara (test_isolated_e2e.db).
 * 2. Seeding bersih dari source data tracked (rosterData, diagnosticData, learningData).
 * 3. Akun dan tim sintetis (SYN-LEAD, SYN-DEP, SYN-MEM).
 * 4. Server pengujian HTTP dedicated yang terikat ke database terisolasi yang sama.
 * 5. TANPA MENGUBAH / MENGHAPUS akun maupun progres sekolah di purwaverse.db.
 * 6. Menguji Controlled Fallback lengkap: pengesahan guru wajib, uji negatif deputy & anggota.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Setup environment & isolated database
const TEST_DB_PATH = path.resolve(__dirname, '../server/tests/test_isolated_e2e.db');
if (fs.existsSync(TEST_DB_PATH)) {
  try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
}

process.env.NODE_ENV = 'test';
process.env.PURWAVERSE_DB_PATH = TEST_DB_PATH;
process.env.TEACHER_USERNAME = 'guru';
process.env.TEACHER_DEV_PASSWORD = 'PasswordGuru10Char!';
process.env.TEACHER_CLASSES = '8A,8B,8C,8D,8E';

const CONFIG = require('../server/src/config');
CONFIG.DB_PATH = TEST_DB_PATH;

const { getDatabase, closeDatabase, setDatabasePath } = require('../server/src/database/db');
setDatabasePath(TEST_DB_PATH);
const db = getDatabase();

const {
  append_,
  findOne_,
  findAll_,
  isoNow_
} = require('../server/src/database/repository');
const { seedClasses, seedLearningData, seedDiagnostic } = require('../server/src/database/seed');
const { hashArgon2 } = require('../server/src/services/securityService');

// Seed clean tracked data
console.log('🌱 [ISOLATED SETUP] Seeding master data from tracked source...');
seedClasses();
seedLearningData();
seedDiagnostic();

// Create synthetic accounts & team for testing
const SYNTHETIC_CLASS = '8A';
const SYNTHETIC_TEAM = 'SYN-TEAM-8A-01';

async function seedSyntheticAccounts() {
  const pinHash = await hashArgon2('1234');

  // Leader: roll 91
  append_('master_students', {
    student_id: 'SYN-LEAD',
    nis: 'NIS-SYN-01',
    nisn: '9990000001',
    name: 'Ahmad Synthetic Leader',
    gender: 'L',
    class_id: SYNTHETIC_CLASS,
    roll_no: 91,
    pin_hash: pinHash,
    active: 1
  });

  // Deputy: roll 92
  append_('master_students', {
    student_id: 'SYN-DEP',
    nis: 'NIS-SYN-02',
    nisn: '9990000002',
    name: 'Budi Synthetic Deputy',
    gender: 'L',
    class_id: SYNTHETIC_CLASS,
    roll_no: 92,
    pin_hash: pinHash,
    active: 1
  });

  // Member: roll 93
  append_('master_students', {
    student_id: 'SYN-MEM',
    nis: 'NIS-SYN-03',
    nisn: '9990000003',
    name: 'Citra Synthetic Member',
    gender: 'P',
    class_id: SYNTHETIC_CLASS,
    roll_no: 93,
    pin_hash: pinHash,
    active: 1
  });

  // Synthetic Team
  append_('teams', {
    team_id: SYNTHETIC_TEAM,
    class_id: SYNTHETIC_CLASS,
    version: Date.now(),
    balance_score: 95,
    status: 'draft',
    created_at: isoNow_(),
    created_by: 'TEACHER-SYSTEM'
  });

  append_('team_members', {
    membership_id: `${SYNTHETIC_TEAM}|SYN-LEAD`,
    team_id: SYNTHETIC_TEAM,
    student_id: 'SYN-LEAD',
    role: 'Scientist Leader',
    is_leader: 1,
    locked: 0,
    override_note: ''
  });

  append_('team_members', {
    membership_id: `${SYNTHETIC_TEAM}|SYN-DEP`,
    team_id: SYNTHETIC_TEAM,
    student_id: 'SYN-DEP',
    role: 'Deputy Scientist',
    is_leader: 0,
    locked: 0,
    override_note: ''
  });

  append_('team_members', {
    membership_id: `${SYNTHETIC_TEAM}|SYN-MEM`,
    team_id: SYNTHETIC_TEAM,
    student_id: 'SYN-MEM',
    role: 'Data Analyst',
    is_leader: 0,
    locked: 0,
    override_note: ''
  });

  // Allow LKPD activity for all 3 synthetic team members
  ['SYN-LEAD', 'SYN-DEP', 'SYN-MEM'].forEach(id => {
    append_('unlock_overrides', {
      override_id: `OVR-${id}-LAB`,
      student_id: id,
      activity_id: 'CH08-01-U02-LAB01',
      allowed: 1,
      reason: 'Akses Uji LKPD Sintetis',
      created_by: 'TEACHER-SYSTEM',
      created_at: isoNow_()
    });
  });

  console.log('✔ [ISOLATED SETUP] Synthetic accounts (SYN-LEAD, SYN-DEP, SYN-MEM) & team seeded.');
}

// Start dedicated HTTP server on test port
const app = require('../server/src/server');
const TEST_PORT = 3199;
let serverInstance;

function startTestServer() {
  return new Promise((resolve) => {
    serverInstance = http.createServer(app);
    serverInstance.listen(TEST_PORT, () => {
      console.log(`🚀 [TEST SERVER] Listening on http://127.0.0.1:${TEST_PORT}\n`);
      resolve();
    });
  });
}

const API_BASE = `http://127.0.0.1:${TEST_PORT}/api/purwa`;

async function api(action, payload = {}) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });
  const data = await res.json();
  return { status: res.status, ok: data.ok, data: data.data, error: data.error };
}

async function runIsolatedVerification() {
  console.log('================================================================');
  console.log('PURWAVERSE LMS PHASE 1 - ISOLATED E2E & CONTROLLED FALLBACK TEST');
  console.log(`Database: ${TEST_DB_PATH}`);
  console.log('================================================================\n');

  await seedSyntheticAccounts();
  await startTestServer();

  let tokenLeader = '';
  let tokenDeputy = '';
  let tokenMember = '';
  let tokenTeacher = '';

  try {
    // -------------------------------------------------------------
    // STEP 1: Student Login & Negative Testing
    // -------------------------------------------------------------
    console.log('[STEP 1] Testing Student Authentication & Negative Tests...');
    const badLogin = await api('studentLogin', { classId: '8A', rollNo: 91, pin: '0000' });
    assert.strictEqual(badLogin.ok, false, 'Invalid PIN must fail');
    assert.ok(badLogin.error.includes('tidak sesuai'), 'Error must be polite');
    console.log('  ✓ Negative test: Invalid PIN rejected without false success.');

    const loginLead = await api('studentLogin', { classId: '8A', rollNo: 91, pin: '1234' });
    assert.strictEqual(loginLead.ok, true, 'Leader login must succeed');
    assert.ok(loginLead.data.token, 'Must return session token');
    tokenLeader = loginLead.data.token;
    assert.strictEqual(loginLead.data.actorId, 'SYN-LEAD');
    console.log(`  ✓ Leader Login SUCCESS: ${loginLead.data.student.name} (${loginLead.data.actorId})`);

    const loginDep = await api('studentLogin', { classId: '8A', rollNo: 92, pin: '1234' });
    assert.strictEqual(loginDep.ok, true);
    tokenDeputy = loginDep.data.token;
    console.log(`  ✓ Deputy Login SUCCESS: ${loginDep.data.student.name} (${loginDep.data.actorId})`);

    const loginMem = await api('studentLogin', { classId: '8A', rollNo: 93, pin: '1234' });
    assert.strictEqual(loginMem.ok, true);
    tokenMember = loginMem.data.token;
    console.log(`  ✓ Member Login SUCCESS: ${loginMem.data.student.name} (${loginMem.data.actorId})`);

    // -------------------------------------------------------------
    // STEP 2: Learning Unit & Quiz Pre-Condition Lock
    // -------------------------------------------------------------
    console.log('\n[STEP 2] Verifying Unit 1 & Quiz Pre-Condition Lock...');
    const unitRes = await api('learningUnit', { token: tokenLeader, unitId: 'CH08-01-U01' });
    assert.strictEqual(unitRes.ok, true);
    assert.strictEqual(unitRes.data.quiz_activity_id, 'CH08-01-U01-QZ01');
    console.log(`  ✓ Unit 1 loaded: "${unitRes.data.title}" | quiz_activity_id: ${unitRes.data.quiz_activity_id}`);

    // Try startQuiz before summary is verified -> MUST FAIL
    const earlyQuiz = await api('startQuiz', {
      token: tokenLeader,
      activityId: unitRes.data.quiz_activity_id
    });
    assert.strictEqual(earlyQuiz.ok, false, 'Quiz must be locked before summary verification');
    assert.ok(earlyQuiz.error.includes('rangkuman diperiksa guru'), 'Proper lock error message');
    console.log('  ✓ Negative test: Quiz blocked before teacher summary verification.');

    // -------------------------------------------------------------
    // STEP 3: Physical Notebook Summary Confirmation
    // -------------------------------------------------------------
    console.log('\n[STEP 3] Submitting Physical Notebook Confirmation...');
    // Negative test: Unchecked confirmation must fail
    const badSummary = await api('submitReadingSummary', {
      token: tokenLeader,
      unitId: 'CH08-01-U01',
      confirmChecked: false
    });
    assert.strictEqual(badSummary.ok, false, 'Unchecked confirmation must fail');
    console.log('  ✓ Negative test: Submission without confirmation checkbox rejected.');

    // Valid submission
    const validSummary = await api('submitReadingSummary', {
      token: tokenLeader,
      unitId: 'CH08-01-U01',
      confirmChecked: true
    });
    assert.strictEqual(validSummary.ok, true, 'Valid summary report must succeed');
    assert.strictEqual(validSummary.data.status, 'pending_review');
    console.log('  ✓ Summary reported. State transitioned to: pending_review');

    // -------------------------------------------------------------
    // STEP 4: Teacher Authentication & Verification
    // -------------------------------------------------------------
    console.log('\n[STEP 4] Teacher Login & Physical Notebook Sign-off...');
    const teachLogin = await api('teacherLogin', {
      username: 'guru',
      password: 'PasswordGuru10Char!'
    });
    assert.strictEqual(teachLogin.ok, true, 'Teacher login must succeed');
    tokenTeacher = teachLogin.data.token;
    console.log(`  ✓ Teacher Login SUCCESS (token: ${tokenTeacher.slice(0, 12)}...)`);

    const signoff = await api('verify_summary', {
      token: tokenTeacher,
      studentId: 'SYN-LEAD',
      unitId: 'CH08-01-U01',
      approved: true,
      feedback: 'Catatan rapi dan lengkap di buku tulis IPA.'
    });
    assert.strictEqual(signoff.ok, true, 'Teacher sign-off must succeed');
    assert.strictEqual(signoff.data.verified, true);
    console.log('  ✓ Teacher verified student notebook summary.');

    // -------------------------------------------------------------
    // STEP 5: Quiz Chamber Execution & Scoring
    // -------------------------------------------------------------
    console.log('\n[STEP 5] Quiz Chamber: Start, Option Shuffle, and Submission...');
    const quizStart = await api('startQuiz', {
      token: tokenLeader,
      activityId: 'CH08-01-U01-QZ01'
    });
    assert.strictEqual(quizStart.ok, true, 'Quiz start must succeed after verification');
    assert.ok(quizStart.data.items.length >= 3, 'Must return quiz items');
    assert.strictEqual(quizStart.data.items[0].answer, undefined, 'Answers must be stripped');
    console.log(`  ✓ Quiz Chamber started: ${quizStart.data.items.length} questions loaded with shuffled options.`);

    // Build answers list
    const answers = quizStart.data.items.map(item => ({
      itemId: item.quiz_item_id,
      answer: 0
    }));

    const quizSubmit = await api('submitQuiz', {
      token: tokenLeader,
      attemptId: quizStart.data.attemptId,
      answers
    });
    assert.strictEqual(quizSubmit.ok, true, 'Quiz submission must succeed');
    assert.ok(typeof quizSubmit.data.score === 'number', 'Must return score');
    console.log(`  ✓ Quiz submitted. Score: ${quizSubmit.data.score}/100.`);

    // -------------------------------------------------------------
    // STEP 6: LKPD Workspace - Leader Editing
    // -------------------------------------------------------------
    console.log('\n[STEP 6] LKPD Workspace: Leader Draft Saving...');
    const leadWs = await api('practiceWorksheet', {
      token: tokenLeader,
      unitId: 'CH08-01-U02'
    });
    assert.strictEqual(leadWs.ok, true);
    assert.strictEqual(leadWs.data.canEdit, true, 'Leader MUST have canEdit=true');
    assert.strictEqual(leadWs.data.editorRole, 'leader');
    assert.strictEqual(leadWs.data.fallbackAuthorized, false, 'No fallback needed for leader');
    console.log('  ✓ Leader permissions verified: canEdit=true, editorRole=leader');

    const leadDraft = {
      prediction: 'Sel hewan lebih lentur daripada sel tumbuhan',
      tools: 'Mikroskop, slide kaca, cover glass, tusuk gigi steril, metilen biru',
      trial1: 'Pengamatan epitel pipi perbesaran 100x',
      data: 'Tampak membran tipis dan inti sel membiru',
      improvement: 'Pencahayaan diatur ulang agar kontras meningkat',
      trial2: 'Pengamatan epitel pipi perbesaran 400x',
      evidence: 'Foto preparat sel epitel pipi',
      conclusion: 'Sel hewan tidak memiliki dinding sel sehingga bentuknya tidak kaku',
      modelLimit: 'Metilen biru mewarnai inti sel namun tidak semua organel terlihat',
      reflection: 'Kerja sama pembagian tugas berjalan lancar',
      memberRoles: 'SYN-LEAD menyiapkan mikroskop, SYN-DEP membuat preparat'
    };

    const saveLeadRes = await api('saveTeamPracticeDraft', {
      token: tokenLeader,
      unitId: 'CH08-01-U02',
      report: leadDraft,
      clientVersion: leadWs.data.clientVersion
    });
    assert.strictEqual(saveLeadRes.ok, true, 'Leader draft save must succeed');
    console.log('  ✓ Leader saved LKPD draft with real filled fields.');

    // -------------------------------------------------------------
    // STEP 7: Controlled Fallback - Negative Test: Deputy without Teacher Authorization
    // -------------------------------------------------------------
    console.log('\n[STEP 7] Negative Test: Deputy edit attempt WITHOUT teacher authorization...');
    const depWs = await api('practiceWorksheet', {
      token: tokenDeputy,
      unitId: 'CH08-01-U02'
    });
    assert.strictEqual(depWs.ok, true);
    assert.strictEqual(depWs.data.canEdit, false, 'Deputy MUST have canEdit=false before teacher authorization');
    assert.strictEqual(depWs.data.fallbackAuthorized, false);
    console.log('  ✓ Deputy workspace state verified: canEdit=false, fallbackAuthorized=false');

    const depBlocked = await api('saveTeamPracticeDraft', {
      token: tokenDeputy,
      unitId: 'CH08-01-U02',
      report: { ...leadDraft, prediction: 'Deputy mencoba mengedit tanpa izin' },
      clientVersion: depWs.data.clientVersion,
      fallbackReason: 'Saya wakil ketua ingin menggantikan ketua'
    });
    assert.strictEqual(depBlocked.ok, false, 'Deputy edit without teacher authorization MUST be blocked');
    assert.ok(depBlocked.error.includes('belum disahkan oleh guru'), 'Must state teacher authorization is required');
    console.log('  ✓ Negative test: Deputy with self-made reason REJECTED without teacher authorization.');

    // -------------------------------------------------------------
    // STEP 8: Controlled Fallback - Negative Test: Member is View-Only
    // -------------------------------------------------------------
    console.log('\n[STEP 8] Negative Test: Regular team member is view-only...');
    const memWs = await api('practiceWorksheet', {
      token: tokenMember,
      unitId: 'CH08-01-U02'
    });
    assert.strictEqual(memWs.ok, true);
    assert.strictEqual(memWs.data.canEdit, false, 'Member MUST have canEdit=false');
    assert.strictEqual(memWs.data.editorRole, 'member');

    const memBlocked = await api('saveTeamPracticeDraft', {
      token: tokenMember,
      unitId: 'CH08-01-U02',
      report: { ...leadDraft, prediction: 'Anggota mencoba mengedit' },
      clientVersion: memWs.data.clientVersion
    });
    assert.strictEqual(memBlocked.ok, false, 'Member edit MUST be blocked');
    assert.ok(memBlocked.error.includes('Hanya Scientist Leader atau wakil'), 'Proper member block error');
    console.log('  ✓ Negative test: Regular member blocked from saving draft.');

    // -------------------------------------------------------------
    // STEP 9: Teacher Authorizes Controlled Fallback
    // -------------------------------------------------------------
    console.log('\n[STEP 9] Teacher Authorizes Controlled Fallback for Deputy...');
    const authRes = await api('authorizeControlledFallback', {
      token: tokenTeacher,
      teamId: SYNTHETIC_TEAM,
      deputyId: 'SYN-DEP',
      activityId: 'CH08-01-U02-LAB01',
      reason: 'Scientist Leader demam tinggi dan izin tidak masuk kelas'
    });
    assert.strictEqual(authRes.ok, true, 'Teacher authorization must succeed');
    assert.strictEqual(authRes.data.authorized, true);
    assert.ok(authRes.data.teacherId.startsWith('TEACHER-'));
    assert.strictEqual(authRes.data.deputyId, 'SYN-DEP');
    assert.strictEqual(authRes.data.teamId, SYNTHETIC_TEAM);
    console.log(`  ✓ Controlled Fallback authorized by Teacher (${authRes.data.teacherId}) for Deputy (${authRes.data.deputyId}).`);

    // Verify record in database
    const overrides = findAll_('unlock_overrides', r => r.student_id === 'SYN-DEP' && r.activity_id === 'CH08-01-U02-LAB01');
    const dbAuth = overrides.find(r => r.reason && r.reason.includes(`[CONTROLLED_FALLBACK:${SYNTHETIC_TEAM}]`));
    assert.ok(dbAuth, 'Authorization record must exist in unlock_overrides');
    assert.ok(dbAuth.created_by.startsWith('TEACHER-'), 'Must store teacher identity');
    console.log(`  ✓ Audit & authorization record verified in database: Teacher=${dbAuth.created_by}, CreatedAt=${dbAuth.created_at}.`);

    // -------------------------------------------------------------
    // STEP 10: LKPD Workspace - Deputy Editing (Authorized)
    // -------------------------------------------------------------
    console.log('\n[STEP 10] LKPD Deputy: Editing and Submission with Authorization...');
    const depWsAuth = await api('practiceWorksheet', {
      token: tokenDeputy,
      unitId: 'CH08-01-U02'
    });
    assert.strictEqual(depWsAuth.ok, true);
    assert.strictEqual(depWsAuth.data.canEdit, true, 'Deputy now MUST have canEdit=true');
    assert.strictEqual(depWsAuth.data.fallbackAuthorized, true, 'fallbackAuthorized MUST be true');
    console.log('  ✓ Deputy workspace refreshed: canEdit=true, fallbackAuthorized=true');

    // Negative test: Deputy submit with empty reason rejected
    const depEmptyReason = await api('submitTeamPractice', {
      token: tokenDeputy,
      unitId: 'CH08-01-U02',
      report: leadDraft,
      clientVersion: depWsAuth.data.clientVersion,
      fallbackReason: ''
    });
    assert.strictEqual(depEmptyReason.ok, false, 'Deputy submission with empty reason must fail');
    assert.ok(depEmptyReason.error.includes('fallbackReason'), 'Proper error message for empty reason');
    console.log('  ✓ Negative test: Deputy submission without explicit reason rejected.');

    // Valid Deputy submission
    const deputyReason = 'Ketua tim izin sakit demam; wewenang dialihkan atas persetujuan guru';
    const depSubmitRes = await api('submitTeamPractice', {
      token: tokenDeputy,
      unitId: 'CH08-01-U02',
      report: {
        ...leadDraft,
        conclusion: 'Kesimpulan final diverifikasi oleh wakil ketua tim.'
      },
      clientVersion: depWsAuth.data.clientVersion,
      fallbackReason: deputyReason
    });
    assert.strictEqual(depSubmitRes.ok, true, 'Deputy submission with valid reason must succeed');
    assert.strictEqual(depSubmitRes.data.status, 'submitted');
    console.log('  ✓ Deputy successfully submitted official team practice report.');

    // -------------------------------------------------------------
    // STEP 11: Reload & Persistence Verification
    // -------------------------------------------------------------
    console.log('\n[STEP 11] Verifying Reload & Persistence across Clients...');
    const reloadWs = await api('practiceWorksheet', {
      token: tokenLeader,
      unitId: 'CH08-01-U02'
    });
    assert.strictEqual(reloadWs.ok, true);
    assert.ok(reloadWs.data.result, 'Result object must exist');
    assert.strictEqual(reloadWs.data.result.status, 'submitted');
    assert.strictEqual(reloadWs.data.canEdit, false, 'Submitted report is locked for editing');
    assert.strictEqual(reloadWs.data.reportMeta.isFallback, true);
    assert.strictEqual(reloadWs.data.reportMeta.fallbackDeputyId, 'SYN-DEP');
    assert.strictEqual(reloadWs.data.reportMeta.fallbackReason, deputyReason);
    console.log('  ✓ Reload verified: Status=submitted, fallback metadata fully preserved.');

    console.log('\n================================================================');
    console.log('🎉 ALL 11 ISOLATED E2E & CONTROLLED FALLBACK TESTS PASSED 100%!');
    console.log('================================================================\n');

  } finally {
    if (serverInstance) {
      serverInstance.close();
      console.log('🛑 [TEST SERVER] Closed.');
    }
    closeDatabase();
    setDatabasePath(CONFIG.DB_PATH);
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
      console.log(`🧹 [CLEANUP] Deleted isolated test database: ${TEST_DB_PATH}`);
    }
  }
}

if (require.main === module) {
  runIsolatedVerification().catch(err => {
    console.error('\n❌ E2E VERIFICATION FAILED:', err);
    process.exit(1);
  });
}

module.exports = { runIsolatedVerification };

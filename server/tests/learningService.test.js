const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const request = require('supertest');
const argon2 = require('argon2');
const CONFIG = require('../src/config');
const app = require('../src/server');
const { getDatabase, closeDatabase, setDatabasePath } = require('../src/database/db');
const {
  rows_,
  append_,
  update_,
  upsert_,
  findOne_,
  findAll_,
  isoNow_
} = require('../src/database/repository');
const {
  studentLogin,
  teacherLogin,
  hashArgon2
} = require('../src/services/securityService');
const { seedClasses, seedLearningData } = require('../src/database/seed');

test('Learning Services & Quiz Engine Migration Test Suite (Phase 5)', async (t) => {
  const testDbPath = path.resolve(__dirname, 'test_learning.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  process.env.TEACHER_USERNAME = 'guru';
  process.env.TEACHER_DEV_PASSWORD = 'PasswordGuru10Char!';
  process.env.TEACHER_CLASSES = '8A,8B,8C,8D,8E';

  setDatabasePath(testDbPath);
  const db = getDatabase();

  seedClasses();
  seedLearningData();

  // Siapkan siswa uji untuk kelas 8A
  const pinHash = await hashArgon2('1234');
  append_('master_students', {
    student_id: 'STD-LRN-001',
    nis: 'NIS-LRN-001',
    nisn: '1000000001',
    name: 'Ahmad Siswa 1',
    gender: 'L',
    class_id: '8A',
    roll_no: 1,
    pin_hash: pinHash,
    active: 1
  });

  append_('master_students', {
    student_id: 'STD-LRN-002',
    nis: 'NIS-LRN-002',
    nisn: '1000000002',
    name: 'Budi Siswa 2',
    gender: 'L',
    class_id: '8A',
    roll_no: 2,
    pin_hash: pinHash,
    active: 1
  });

  const studentLoginRes = await studentLogin('8A', 1, '1234');
  const studentToken = studentLoginRes.token;
  const studentId = studentLoginRes.actorId;

  const teacherLoginRes = await teacherLogin('guru', 'PasswordGuru10Char!');
  const teacherToken = teacherLoginRes.token;

  t.after(() => {
    closeDatabase();
    setDatabasePath(CONFIG.DB_PATH);
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (e) {}
    }
  });

  let quizAttemptInfo = null;

  await t.test('1. Learning Unit Unlock State Machine (reading -> locked)', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'learningHome',
        payload: { token: studentToken }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.chapters.length > 0);

    const chapter1 = res.body.data.chapters[0];
    const unit1 = chapter1.units[0]; // CH08-01-U01
    const unit2 = chapter1.units[1]; // CH08-01-U02

    // Unit 1 (index 0) harus terbuka sejak awal
    assert.equal(unit1.state.contentUnlocked, true, 'Unit 1 harus terbuka secara default');
    assert.equal(unit1.state.learningStatus, 'reading');

    // Unit 2 harus terkunci sebelum Unit 1 diselesaikan
    assert.equal(unit2.state.contentUnlocked, false, 'Unit 2 harus terkunci');
    assert.equal(unit2.state.learningStatus, 'locked');

    // Akses detail Unit 1 berhasil
    const resUnit1 = await request(app)
      .post('/api/purwa')
      .send({
        action: 'learningUnit',
        payload: { token: studentToken, unitId: unit1.unit_id }
      })
      .expect(200);

    assert.equal(resUnit1.body.ok, true);
    assert.ok(resUnit1.body.data.title);
    assert.ok(resUnit1.body.data.illustration_svg);

    // Akses detail Unit 2 yang terkunci harus gagal dengan error ramah
    const resUnit2 = await request(app)
      .post('/api/purwa')
      .send({
        action: 'learningUnit',
        payload: { token: studentToken, unitId: unit2.unit_id }
      })
      .expect(200);

    assert.equal(resUnit2.body.ok, false);
    assert.ok(resUnit2.body.error.includes('terkunci'));
  });

  await t.test('2. Summary Submission (reading -> pending_review)', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'submitSummary',
        payload: { token: studentToken, unitId: 'CH08-01-U01' }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.status, 'pending_review');
    assert.equal(res.body.data.alreadySubmitted, false);

    // Verifikasi tercatat di tabel teacher_checks
    const check = findOne_('teacher_checks', {
      student_id: studentId,
      activity_id: 'CH08-01-U01-LRN01',
      check_type: 'summary'
    });
    assert.ok(check);
    assert.equal(check.status, 'pending_review');
    assert.equal(check.revision, 1);
  });

  await t.test('3. Teacher Verification (pending_review -> verified / quiz_ready)', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'teacherChecks',
        payload: {
          token: teacherToken,
          classId: '8A',
          activityId: 'CH08-01-U01-LRN01',
          checkType: 'summary',
          status: 'verified',
          score: 95,
          note: 'Catatan ringkasan lengkap dan rapi.',
          studentIds: [studentId]
        }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.saved, 1);

    // Cek state Unit 1 berubah menjadi quiz_ready
    const resHome = await request(app)
      .post('/api/purwa')
      .send({
        action: 'learningHome',
        payload: { token: studentToken }
      })
      .expect(200);

    const unit1State = resHome.body.data.chapters[0].units[0].state;
    assert.equal(unit1State.summaryVerified, true);
    assert.equal(unit1State.learningStatus, 'quiz_ready');
  });

  await t.test('4. Quiz Deterministic Option Shuffle & Security Verification', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'startQuiz',
        payload: { token: studentToken, activityId: 'CH08-01-U01-QZ01' }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.attemptId);
    assert.equal(res.body.data.attemptNumber, 1);
    assert.ok(Array.isArray(res.body.data.items));
    assert.ok(res.body.data.items.length >= 5);

    quizAttemptInfo = res.body.data;

    // VERIFIKASI KEAMANAN KUNCI JAWABAN:
    quizAttemptInfo.items.forEach(item => {
      assert.equal(item.answer_json, undefined, 'answer_json TIDAK boleh bocor ke klien');
      assert.equal(item.feedback_json, undefined, 'feedback_json TIDAK boleh bocor ke klien');
      assert.ok(Array.isArray(item.options));
      assert.ok(item.options.length >= 2);
    });

    // Panggilan kedua pada attempt yang sama harus menghasilkan urutan opsi yang sama persis
    const res2 = await request(app)
      .post('/api/purwa')
      .send({
        action: 'startQuiz',
        payload: { token: studentToken, activityId: 'CH08-01-U01-QZ01' }
      })
      .expect(200);

    assert.equal(res2.body.data.attemptId, quizAttemptInfo.attemptId);
    assert.deepEqual(
      res2.body.data.items[0].options,
      quizAttemptInfo.items[0].options,
      'Pengacakan opsi harus deterministik per attempt'
    );
  });

  await t.test('5. Quiz Scoring (KKM 70 & Unlocks next Unit)', async () => {
    // Siapkan jawaban yang benar untuk setiap butir
    const dbQuizItems = Object.fromEntries(rows_('quiz_items').map(i => [i.quiz_item_id, i]));
    const answers = quizAttemptInfo.items.map(item => {
      const dbItem = dbQuizItems[item.quiz_item_id];
      const expectedOriginalIndex = Number(JSON.parse(dbItem.answer_json));

      // Temukan index pada options yang ditampilkan siswa
      const { quizOptionsForAttempt_ } = require('../src/services/learningService');
      const shuffledOptions = quizOptionsForAttempt_(dbItem, studentId, quizAttemptInfo.attemptNumber);
      const studentOptionIndex = shuffledOptions.findIndex(o => o.originalIndex === expectedOriginalIndex);

      return {
        itemId: item.quiz_item_id,
        answer: studentOptionIndex
      };
    });

    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'submitQuiz',
        payload: {
          token: studentToken,
          attemptId: quizAttemptInfo.attemptId,
          answers,
          timeRemaining: 150,
          tabSwitchCount: 0
        }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.score >= 70, `Skor kuis harus memenuhi KKM (didapat: ${res.body.data.score})`);
    assert.equal(res.body.data.passed, true);

    // Verifikasi kuis attempt tersimpan
    const attempt = findOne_('quiz_attempts', { attempt_id: quizAttemptInfo.attemptId });
    assert.ok(attempt.submitted_at);
    assert.equal(attempt.passed, 1);

    // KARENA UNIT 1 SUDAH SELESAI (Rangkuman Verified + Kuis Passed), UNIT 2 HARUS OTOMATIS TERBUKA!
    const resHome = await request(app)
      .post('/api/purwa')
      .send({
        action: 'learningHome',
        payload: { token: studentToken }
      })
      .expect(200);

    const unit2State = resHome.body.data.chapters[0].units[1].state;
    assert.equal(unit2State.contentUnlocked, true, 'Unit 2 sekarang harus terbuka!');
  });

  await t.test('6. Group Lab (LKPD Tim) Submission & Score Synchronization', async () => {
    // Bentuk tim laboratorium sederhana
    const teamId = '8A-T01-VTEST';
    append_('teams', {
      team_id: teamId,
      class_id: '8A',
      version: Date.now(),
      balance_score: 95,
      status: 'draft',
      created_at: isoNow_(),
      created_by: 'TEACHER-TEST'
    });

    append_('team_members', {
      membership_id: `${teamId}|${studentId}`,
      team_id: teamId,
      student_id: studentId,
      role: 'Scientist Leader',
      is_leader: 1,
      locked: 0,
      override_note: ''
    });

    // Beri override LKPD Unit 2 agar terbuka untuk pengujian
    append_('unlock_overrides', {
      override_id: 'OVR-TEST-LAB',
      student_id: studentId,
      activity_id: 'CH08-01-U02-LAB01',
      allowed: 1,
      reason: 'Pengujian LKPD',
      created_by: 'TEACHER-TEST',
      created_at: isoNow_()
    });

    // Scientist Leader mengirim draf laporan LKPD
    const mockReport = {
      prediction: 'Model sel buatan menyerupai struktur sel nyata.',
      tools: 'Mikroskop, kaca preparat, sel bawang.',
      trial1: 'Observasi pada perbesaran 100x.',
      data: 'Tampak dinding sel dan inti sel.',
      improvement: 'Mengatur pencahayaan cermin mikroskop.',
      trial2: 'Detail membran dan stomata terlihat lebih jelas.',
      evidence: 'Foto preparat dan catatan pengukuran.',
      conclusion: 'Struktur sel tumbuhan memiliki dinding sel yang kaku.',
      modelLimit: 'Pewarnaan metilen biru dapat mengubah tampilan alami.',
      reflection: 'Kerja tim solid dan pembagian tugas teratur.',
      memberRoles: 'Ahmad sebagai leader dan operator mikroskop.'
    };

    const resSubmit = await request(app)
      .post('/api/purwa')
      .send({
        action: 'submitTeamPractice',
        payload: {
          token: studentToken,
          unitId: 'CH08-01-U02',
          report: mockReport
        }
      })
      .expect(200);

    assert.equal(resSubmit.body.ok, true);
    assert.equal(resSubmit.body.data.status, 'submitted');

    // Guru memeriksa dan menilai laporan tim
    const resGrade = await request(app)
      .post('/api/purwa')
      .send({
        action: 'saveGroupLab',
        payload: {
          token: teacherToken,
          teamId,
          activityId: 'CH08-01-U02-LAB01',
          status: 'verified',
          score: 92,
          note: 'Laporan praktikum sangat komprehensif.'
        }
      })
      .expect(200);

    assert.equal(resGrade.body.ok, true);
    assert.equal(resGrade.body.data.membersUpdated, 1);

    // Verifikasi sinkronisasi ke tabel teacher_checks & skill_evidence
    const studentPracticeCheck = findOne_('teacher_checks', {
      student_id: studentId,
      activity_id: 'CH08-01-U02-LAB01',
      check_type: 'practice'
    });
    assert.ok(studentPracticeCheck);
    assert.equal(studentPracticeCheck.status, 'verified');
    assert.equal(studentPracticeCheck.score, 92);

    const skills = findAll_('skill_evidence', { student_id: studentId, activity_id: 'CH08-01-U02-LAB01' });
    assert.ok(skills.length > 0, 'Skill evidence harus otomatis tersinkronisasi');
  });

  await t.test('7. Teacher Unlock Overrides', async () => {
    // Siswa 2 (Budi) belum menyelesaikan materi sebelumnya
    const resHomeBefore = await request(app)
      .post('/api/purwa')
      .send({
        action: 'learningHome',
        payload: { token: (await studentLogin('8A', 2, '1234')).token }
      })
      .expect(200);

    const budiUnit2Before = resHomeBefore.body.data.chapters[0].units[1];
    assert.equal(budiUnit2Before.state.contentUnlocked, false);

    // Guru memberikan dispensasi unlock ke Unit 2 untuk Siswa 2
    const resOverride = await request(app)
      .post('/api/purwa')
      .send({
        action: 'saveUnlockOverrides',
        payload: {
          token: teacherToken,
          classId: '8A',
          activityId: 'CH08-01-U02-LRN01',
          studentIds: ['STD-LRN-002'],
          allowed: true,
          reason: 'Dispensasi belajar mandiri'
        }
      })
      .expect(200);

    assert.equal(resOverride.body.ok, true);
    assert.equal(resOverride.body.data.saved, 1);

    // Verifikasi Siswa 2 sekarang dapat membuka Unit 2
    const resHomeAfter = await request(app)
      .post('/api/purwa')
      .send({
        action: 'learningHome',
        payload: { token: (await studentLogin('8A', 2, '1234')).token }
      })
      .expect(200);

    const budiUnit2After = resHomeAfter.body.data.chapters[0].units[1];
    assert.equal(budiUnit2After.state.contentUnlocked, true, 'Unit 2 harus terbuka setelah diberi override oleh guru');
  });
});

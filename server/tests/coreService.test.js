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
  logout
} = require('../src/services/securityService');
const {
  getDiagnosticItems,
  submitDiagnostic,
  calculateDiagnosticProfile,
  scoreDiagnosticResponse,
  generateTeams,
  publicLeaderboardData
} = require('../src/services/purwaService');
const { seedClasses, seedCoreActivities, seedDiagnostic } = require('../src/database/seed');

test('Core Services Migration Test Suite (Phase 4)', async (t) => {
  const testDbPath = path.resolve(__dirname, 'test_core.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Konfigurasi environment pengujian
  process.env.TEACHER_USERNAME = 'guru';
  process.env.TEACHER_DEV_PASSWORD = 'PasswordGuru10Char!';
  process.env.TEACHER_CLASSES = '8A,8B,8C,8D,8E';

  setDatabasePath(testDbPath);
  const db = getDatabase();

  // Inisialisasi data master
  seedClasses();
  seedCoreActivities();
  seedDiagnostic();

  // Siapkan 8 siswa uji untuk kelas 8A
  const pinHash = await argon2.hash('1234');
  for (let i = 1; i <= 8; i++) {
    append_('master_students', {
      student_id: `STD-CORE-00${i}`,
      nis: `NIS-00${i}`,
      nisn: `00112233${i}`,
      name: `Siswa Inti ${i}`,
      gender: i % 2 === 0 ? 'P' : 'L',
      class_id: '8A',
      roll_no: i,
      pin_hash: pinHash,
      active: 1
    });
  }

  // Dapatkan token sesi siswa 1 dan sesi guru
  const studentSessionRes = await studentLogin('8A', 1, '1234');
  const studentToken = studentSessionRes.token;
  const studentId = studentSessionRes.actorId;

  const teacherSessionRes = await teacherLogin('guru', 'PasswordGuru10Char!');
  const teacherToken = teacherSessionRes.token;

  t.after(() => {
    closeDatabase();
    setDatabasePath(CONFIG.DB_PATH);
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (e) {}
    }
  });

  let retrievedItems = [];

  await t.test('1. Diagnostic item retrieval (Mission 0)', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'diagnosticItems',
        payload: { token: studentToken }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.ok(res.body.data);
    assert.ok(Array.isArray(res.body.data.items));
    assert.ok(res.body.data.items.length >= 5 && res.body.data.items.length <= 9);
    assert.ok(res.body.data.durationSeconds > 0);

    retrievedItems = res.body.data.items;

    // Pastikan rubric_json TIDAK bocor ke sisi klien
    retrievedItems.forEach(item => {
      assert.equal(item.rubric_json, undefined, 'rubric_json tidak boleh diekspos ke siswa');
      assert.ok(item.item_id);
      assert.ok(item.domain);
      assert.ok(item.prompt);
    });

    // Uji deterministik: pengambilan ulang harus menghasilkan ID yang sama
    const res2 = await request(app)
      .post('/api/purwa')
      .send({
        action: 'diagnosticItems',
        payload: { token: studentToken }
      })
      .expect(200);

    assert.deepEqual(
      res2.body.data.items.map(i => i.item_id),
      retrievedItems.map(i => i.item_id),
      'Pengambilan kedua harus menghasilkan urutan butir yang deterministik'
    );
  });

  await t.test('2. Submit diagnostic responses & progress tracking', async () => {
    const mockResponses = retrievedItems.map(item => ({
      itemId: item.item_id,
      answer: `Analisis ilmiah untuk ${item.item_id}: Berdasarkan hasil observasi data.`
    }));

    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'submitDiagnostic',
        payload: {
          token: studentToken,
          responses: mockResponses,
          remainingSeconds: 600,
          selfMapScore: 4
        }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.submitted, true);
    assert.equal(res.body.data.speedBonusSeconds, 600);

    // Verifikasi tersimpan di tabel diagnostic_responses
    const savedResponses = findAll_('diagnostic_responses', { student_id: studentId });
    assert.equal(savedResponses.length, retrievedItems.length);

    // Verifikasi progress M0-QUICK berstatus submitted
    const progress = findOne_('progress', { progress_id: `${studentId}|M0-QUICK` });
    assert.ok(progress);
    assert.equal(progress.status, 'submitted');
  });

  await t.test('3. Diagnostic Profile calculation & Teacher scoring', async () => {
    // Guru menilai setiap butir jawaban siswa 1
    for (const item of retrievedItems) {
      const resScore = await request(app)
        .post('/api/purwa')
        .send({
          action: 'scoreDiagnostic',
          payload: {
            token: teacherToken,
            studentId: studentId,
            itemId: item.item_id,
            score: 3
          }
        })
        .expect(200);

      assert.equal(resScore.body.ok, true);
    }

    // Verifikasi profil terhitung otomatis setelah seluruh butir dinilai
    const profile = findOne_('diagnostic_profiles', { student_id: studentId });
    assert.ok(profile, 'Profil diagnostik harus sudah dihitung dan disimpan');
    assert.ok(Number(profile.overall_reasoning) > 0);
    assert.ok(Number(profile.leader_index) > 0);
    assert.ok(['R1', 'R2', 'R3', 'R4'].includes(profile.research_readiness));

    // Verifikasi progress M0-QUICK menjadi completed
    const progress = findOne_('progress', { progress_id: `${studentId}|M0-QUICK` });
    assert.equal(progress.status, 'completed');
    assert.equal(progress.score, profile.overall_reasoning);
  });

  await t.test('4. Team Generation via Snake Draft & Balance Optimization', async () => {
    // Siapkan profil lengkap untuk 7 siswa sisanya (STD-CORE-002 s.d. STD-CORE-008)
    for (let i = 2; i <= 8; i++) {
      const sId = `STD-CORE-00${i}`;
      // Simpan respons diagnostik
      for (const item of retrievedItems) {
        upsert_('diagnostic_responses', 'response_id', {
          response_id: `${sId}|${item.item_id}`,
          student_id: sId,
          item_id: item.item_id,
          answer: `Jawaban siswa ${i}`,
          score: (i % 4) + 1,
          scored_by: 'TEACHER-AUTO',
          submitted_at: isoNow_()
        });
      }
      // Hitung profil
      calculateDiagnosticProfile(sId, 3, 300);
    }

    // Jalankan Team Builder melalui RPC action generateTeams
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'generateTeams',
        payload: {
          token: teacherToken,
          classId: '8A',
          options: { teamCount: 4 } // 4 tim dari 8 siswa = 2 siswa per tim
        }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.classId, '8A');
    assert.ok(res.body.data.balanceScore >= 0 && res.body.data.balanceScore <= 100);
    assert.equal(res.body.data.teams.length, 4);

    // Periksa keanggotaan dan peran di database
    const allMembers = findAll_('team_members');
    assert.equal(allMembers.length, 8);

    const leaders = allMembers.filter(m => m.is_leader === 1);
    assert.equal(leaders.length, 4, 'Harus ada 4 Scientist Leader untuk 4 tim');

    const deputies = allMembers.filter(m => m.role === 'Deputy Scientist Leader');
    assert.equal(deputies.length, 4, 'Setiap tim harus memiliki Deputy Scientist Leader');
  });

  await t.test('5. Leaderboard aggregation & Badges', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'leaderboard',
        payload: { force: true }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.updatedAt);
    assert.ok(res.body.data.totalStudents >= 8);
    assert.ok(Array.isArray(res.body.data.integrityIndex));
    assert.ok(Array.isArray(res.body.data.roster));

    // Siswa 1 yang menyelesaikan diagnostik harus berada di roster dengan skor > 0
    const student1Entry = res.body.data.roster.find(r => r.studentId === studentId);
    assert.ok(student1Entry);
    assert.ok(student1Entry.completedMissions >= 1);
    assert.ok(student1Entry.netScore > 0);
    assert.ok(student1Entry.badges.length > 0);

    // Cek badge logika tersemat
    const badgeNames = student1Entry.badges.map(b => b.name);
    assert.ok(badgeNames.includes('Master of Logic') || badgeNames.includes('Curious Observer'));
  });
});

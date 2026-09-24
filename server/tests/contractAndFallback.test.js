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
  append_,
  findOne_,
  findAll_,
  deleteWhere_,
  isoNow_
} = require('../src/database/repository');
const { seedClasses, seedLearningData } = require('../src/database/seed');
const { hashArgon2 } = require('../src/services/securityService');

test('API Contract Alignment & Controlled Fallback Test Suite (Phase 1)', async (t) => {
  const testDbPath = path.resolve(__dirname, 'test_contract_fallback.db');
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

  const pinHash = await hashArgon2('1234');

  // Siapkan 3 siswa uji untuk tim 8A
  append_('master_students', {
    student_id: 'STD-CF-001',
    nis: '001',
    nisn: '1000000001',
    name: 'Ahmad Leader',
    gender: 'L',
    class_id: '8A',
    roll_no: 1,
    pin_hash: pinHash,
    active: 1
  });

  append_('master_students', {
    student_id: 'STD-CF-002',
    nis: '002',
    nisn: '1000000002',
    name: 'Budi Deputy',
    gender: 'L',
    class_id: '8A',
    roll_no: 2,
    pin_hash: pinHash,
    active: 1
  });

  append_('master_students', {
    student_id: 'STD-CF-003',
    nis: '003',
    nisn: '1000000003',
    name: 'Citra Member',
    gender: 'P',
    class_id: '8A',
    roll_no: 3,
    pin_hash: pinHash,
    active: 1
  });

  // Buat tim sains untuk kelas 8A
  const teamId = 'TEAM-8A-T01';
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
    membership_id: `${teamId}|STD-CF-001`,
    team_id: teamId,
    student_id: 'STD-CF-001',
    role: 'Scientist Leader',
    is_leader: 1,
    locked: 0,
    override_note: ''
  });

  append_('team_members', {
    membership_id: `${teamId}|STD-CF-002`,
    team_id: teamId,
    student_id: 'STD-CF-002',
    role: 'Deputy Scientist',
    is_leader: 0,
    locked: 0,
    override_note: ''
  });

  append_('team_members', {
    membership_id: `${teamId}|STD-CF-003`,
    team_id: teamId,
    student_id: 'STD-CF-003',
    role: 'Data Analyst',
    is_leader: 0,
    locked: 0,
    override_note: ''
  });

  // Buka akses LKPD Unit 2 untuk ketiga siswa
  ['STD-CF-001', 'STD-CF-002', 'STD-CF-003'].forEach(id => {
    append_('unlock_overrides', {
      override_id: `OVR-${id}-LAB`,
      student_id: id,
      activity_id: 'CH08-01-U02-LAB01',
      allowed: 1,
      reason: 'Uji Controlled Fallback',
      created_by: 'TEACHER-TEST',
      created_at: isoNow_()
    });
  });

  t.after(() => {
    closeDatabase();
    setDatabasePath(CONFIG.DB_PATH);
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (e) {}
    }
  });

  let leaderToken = '';
  let deputyToken = '';
  let memberToken = '';
  let teacherToken = '';

  await t.test('1. Student Login Contract (classId+rollNo and student_id formats)', async () => {
    // Format standar: classId + rollNo + pin
    const res1 = await request(app)
      .post('/api/purwa')
      .send({
        action: 'loginStudent',
        payload: { classId: '8A', rollNo: 1, pin: '1234' }
      })
      .expect(200);

    assert.equal(res1.body.ok, true);
    assert.ok(res1.body.data.token);
    assert.equal(res1.body.data.token, res1.body.data.session_token);
    assert.equal(res1.body.data.actorId, 'STD-CF-001');
    assert.equal(res1.body.data.student.name, 'Ahmad Leader');
    leaderToken = res1.body.data.token;

    // Format legacy student_id ("8A-02" atau "8A-2")
    const res2 = await request(app)
      .post('/api/purwa')
      .send({
        action: 'loginStudent',
        payload: { student_id: '8A-02', pin: '1234' }
      })
      .expect(200);

    assert.equal(res2.body.ok, true);
    assert.equal(res2.body.data.actorId, 'STD-CF-002');
    deputyToken = res2.body.data.token;

    // Format alias student_login
    const res3 = await request(app)
      .post('/api/purwa')
      .send({
        action: 'student_login',
        payload: { student_id: '8A-03', pin: '1234' }
      })
      .expect(200);

    assert.equal(res3.body.ok, true);
    assert.equal(res3.body.data.actorId, 'STD-CF-003');
    memberToken = res3.body.data.token;
  });

  await t.test('2. Teacher Login Contract (username+password and default username)', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'loginTeacher',
        payload: { password: 'PasswordGuru10Char!' }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.actorType, 'teacher');
    teacherToken = res.body.data.token;
  });

  await t.test('3. verifySession Contract (student, teacher, and invalid token)', async () => {
    // Valid student session
    const resStudent = await request(app)
      .post('/api/purwa')
      .send({
        action: 'verifySession',
        payload: { token: leaderToken }
      })
      .expect(200);

    assert.equal(resStudent.body.ok, true);
    assert.equal(resStudent.body.data.valid, true);
    assert.equal(resStudent.body.data.actorType, 'student');
    assert.equal(resStudent.body.data.actorId, 'STD-CF-001');
    assert.equal(resStudent.body.data.user.name, 'Ahmad Leader');

    // Valid teacher session via validate_session alias
    const resTeacher = await request(app)
      .post('/api/purwa')
      .send({
        action: 'validate_session',
        payload: { session_token: teacherToken }
      })
      .expect(200);

    assert.equal(resTeacher.body.ok, true);
    assert.equal(resTeacher.body.data.valid, true);
    assert.equal(resTeacher.body.data.actorType, 'teacher');

    // Invalid session token
    const resInvalid = await request(app)
      .post('/api/purwa')
      .send({
        action: 'verifySession',
        payload: { token: 'SES-INVALID-99999' }
      })
      .expect(200);

    assert.equal(resInvalid.body.ok, false);
    assert.match(resInvalid.body.error, /Sesi berakhir/);
  });

  await t.test('4. Controlled Fallback: Workspace Permissions (Leader, Deputy, Member)', async () => {
    // Leader workspace
    const resLeader = await request(app)
      .post('/api/purwa')
      .send({
        action: 'practiceWorksheet',
        payload: { token: leaderToken, unitId: 'CH08-01-U02' }
      })
      .expect(200);

    assert.equal(resLeader.body.ok, true);
    assert.equal(resLeader.body.data.editorRole, 'leader');
    assert.equal(resLeader.body.data.canEdit, true);

    // Deputy workspace (sebelum pengesahan guru: canEdit = false, fallbackAuthorized = false)
    const resDeputy = await request(app)
      .post('/api/purwa')
      .send({
        action: 'practiceWorksheet',
        payload: { token: deputyToken, unitId: 'CH08-01-U02' }
      })
      .expect(200);

    assert.equal(resDeputy.body.ok, true);
    assert.equal(resDeputy.body.data.editorRole, 'deputy');
    assert.equal(resDeputy.body.data.canEdit, false);
    assert.equal(resDeputy.body.data.fallbackAuthorized, false);

    // Member workspace (Strictly View-Only)
    const resMember = await request(app)
      .post('/api/purwa')
      .send({
        action: 'practiceWorksheet',
        payload: { token: memberToken, unitId: 'CH08-01-U02' }
      })
      .expect(200);

    assert.equal(resMember.body.ok, true);
    assert.equal(resMember.body.data.editorRole, 'member');
    assert.equal(resMember.body.data.canEdit, false);
  });

  await t.test('5. Controlled Fallback: Member Attempt to Save Draft is Blocked', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'saveTeamPracticeDraft',
        payload: {
          token: memberToken,
          unitId: 'CH08-01-U02',
          report: { prediction: 'Percobaan siswa member' }
        }
      })
      .expect(200);

    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Hanya Scientist Leader atau wakil/);
  });

  await t.test('6. Controlled Fallback: Leader Saves Draft', async () => {
    const ws = await request(app)
      .post('/api/purwa')
      .send({
        action: 'practiceWorksheet',
        payload: { token: leaderToken, unitId: 'CH08-01-U02' }
      })
      .expect(200);

    assert.equal(ws.body.ok, true);
    const clientVersion = ws.body.data.clientVersion;

    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'saveTeamPracticeDraft',
        payload: {
          token: leaderToken,
          unitId: 'CH08-01-U02',
          report: {
            prediction: 'Prediksi ketua tim',
            tools: 'Mikroskop dan slide'
          },
          clientVersion
        }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.updatedAt);
    assert.equal(res.body.data.isFallback, false);
  });

  await t.test('7. Controlled Fallback: Deputy Attempt Without Teacher Authorization is Blocked (Even With Reason)', async () => {
    const ws = await request(app)
      .post('/api/purwa')
      .send({
        action: 'practiceWorksheet',
        payload: { token: deputyToken, unitId: 'CH08-01-U02' }
      })
      .expect(200);

    const clientVersion = ws.body.data.clientVersion;

    // Wakil mengisi alasan pengalihan, tetapi GURU BELUM MENGESAHKAN -> Harus ditolak!
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'saveTeamPracticeDraft',
        payload: {
          token: deputyToken,
          unitId: 'CH08-01-U02',
          report: { prediction: 'Prediksi sepihak oleh wakil' },
          clientVersion,
          fallbackReason: 'Ketua tidak hadir hari ini'
        }
      })
      .expect(200);

    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Pengalihan wewenang ke wakil ketua belum disahkan oleh guru/);
  });

  await t.test('7b. Controlled Fallback: Teacher Authorizes Fallback For Deputy', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'authorizeControlledFallback',
        payload: {
          token: teacherToken,
          teamId,
          activityId: 'CH08-01-U02-LAB01',
          reason: 'Scientist Leader sakit demam dan berhalangan hadir di kelas'
        }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.authorized, true);
    assert.ok(res.body.data.teacherId && res.body.data.teacherId.startsWith('TEACHER-'));
    assert.equal(res.body.data.deputyId, 'STD-CF-002');
  });

  await t.test('8. Controlled Fallback: Deputy Submission With Teacher Authorization & Valid Reason', async () => {
    const ws = await request(app)
      .post('/api/purwa')
      .send({
        action: 'practiceWorksheet',
        payload: { token: deputyToken, unitId: 'CH08-01-U02' }
      })
      .expect(200);

    assert.equal(ws.body.ok, true);
    assert.equal(ws.body.data.canEdit, true);
    assert.equal(ws.body.data.fallbackAuthorized, true);
    const clientVersion = ws.body.data.clientVersion;

    const fullReport = {
      prediction: 'Prediksi terkonfirmasi',
      tools: 'Mikroskop, slide, cover glass',
      trial1: 'Uji coba 100x',
      data: 'Hasil pengamatan sel terlihat jelas',
      improvement: 'Pencahayaan disesuaikan',
      trial2: 'Uji coba 400x',
      evidence: 'Foto preparat',
      conclusion: 'Kesimpulan struktur sel terbukti',
      modelLimit: 'Batas model buatan',
      reflection: 'Refleksi kelompok',
      memberRoles: 'Kerja sama tim'
    };

    // Uji negatif: Submisi dengan fallbackReason kosong harus ditolak
    const resBlocked = await request(app)
      .post('/api/purwa')
      .send({
        action: 'submitTeamPractice',
        payload: {
          token: deputyToken,
          unitId: 'CH08-01-U02',
          report: fullReport,
          clientVersion,
          fallbackReason: ''
        }
      })
      .expect(200);

    assert.equal(resBlocked.body.ok, false);
    assert.match(resBlocked.body.error, /Alasan pengalihan \(fallbackReason\) wajib diisi/);

    // Submisi dengan alasan sah diterima
    const fallbackReasonText = 'Ketua tim berhalangan sakit dan terkendala jaringan di rumah';

    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'submitTeamPractice',
        payload: {
          token: deputyToken,
          unitId: 'CH08-01-U02',
          report: fullReport,
          clientVersion,
          fallbackReason: fallbackReasonText
        }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.status, 'submitted');
    assert.equal(res.body.data.isFallback, true);
    assert.equal(res.body.data.editorRole, 'deputy');
    assert.equal(res.body.data.meta.submittedBy, 'STD-CF-002');
    assert.equal(res.body.data.meta.submittedRole, 'deputy');
    assert.equal(res.body.data.meta.isFallback, true);
    assert.equal(res.body.data.meta.fallbackReason, fallbackReasonText);

    // Verifikasi catatan audit log
    const auditEntries = findAll_('audit_log', r => r.entity_id === `${teamId}|CH08-01-U02-LAB01`);
    const authAudit = auditEntries.find(a => a.action === 'AUTHORIZE_CONTROLLED_FALLBACK');
    assert.ok(authAudit, 'Audit log AUTHORIZE_CONTROLLED_FALLBACK harus tercatat');
    const submitAudit = auditEntries.find(a => a.action === 'SUBMIT_TEAM_PRACTICE');
    assert.ok(submitAudit, 'Audit log SUBMIT_TEAM_PRACTICE harus tercatat');
    const auditMeta = JSON.parse(submitAudit.detail_json || '{}');
    assert.equal(auditMeta.is_fallback, true);
    assert.equal(auditMeta.fallback_reason, fallbackReasonText);

    // Verifikasi groupLabDashboard untuk guru menyertakan metadata fallback
    const resDashboard = await request(app)
      .post('/api/purwa')
      .send({
        action: 'groupLabDashboard',
        payload: {
          token: teacherToken,
          classId: '8A',
          activityId: 'CH08-01-U02-LAB01'
        }
      })
      .expect(200);

    assert.equal(resDashboard.body.ok, true);
    const teamLabEntry = resDashboard.body.data.teams.find(t => t.teamId === teamId);
    assert.ok(teamLabEntry);
    assert.equal(teamLabEntry.meta.isFallback, true);
    assert.equal(teamLabEntry.meta.submittedBy, 'STD-CF-002');
    assert.equal(teamLabEntry.meta.fallbackReason, fallbackReasonText);
  });

  await t.test('9. Controlled Fallback: Deputy Without Prior Authorization Cannot Edit Until Teacher Authorizes', async () => {
    const newTeamId = 'TEAM-8A-T02';
    append_('teams', {
      team_id: newTeamId,
      class_id: '8A',
      version: Date.now() + 100,
      balance_score: 90,
      status: 'draft',
      created_at: isoNow_(),
      created_by: 'TEACHER-TEST'
    });

    append_('team_members', {
      membership_id: `${newTeamId}|STD-CF-001`,
      team_id: newTeamId,
      student_id: 'STD-CF-001',
      role: 'Scientist Leader',
      is_leader: 1,
      locked: 0,
      override_note: ''
    });

    append_('team_members', {
      membership_id: `${newTeamId}|STD-CF-002`,
      team_id: newTeamId,
      student_id: 'STD-CF-002',
      role: 'Deputy Scientist',
      is_leader: 0,
      locked: 0,
      override_note: ''
    });

    // Deputy mencoba menyimpan draft tanpa pengesahan guru -> Ditolak!
    const resBlocked = await request(app)
      .post('/api/purwa')
      .send({
        action: 'saveTeamPracticeDraft',
        payload: {
          token: deputyToken,
          unitId: 'CH08-01-U02',
          report: { prediction: 'Prediksi coba-coba wakil' },
          fallbackReason: 'Alasan deputy sepihak'
        }
      })
      .expect(200);

    assert.equal(resBlocked.body.ok, false);
    assert.match(resBlocked.body.error, /Pengalihan wewenang ke wakil ketua belum disahkan oleh guru/);
  });

  await t.test('10. Controlled Fallback: Strict deputyId validation and explicit activity requirement', async () => {
    // Uji 10a: ID deputy bukan anggota tim harus ditolak
    const resWrongDeputy = await request(app)
      .post('/api/purwa')
      .send({
        action: 'authorizeControlledFallback',
        payload: {
          token: teacherToken,
          teamId,
          activityId: 'CH08-01-U02-LAB01',
          deputyId: 'STD-NON-MEMBER-999',
          reason: 'Guru salah pilih siswa'
        }
      })
      .expect(200);

    assert.equal(resWrongDeputy.body.ok, false);
    assert.match(resWrongDeputy.body.error, /bukan merupakan anggota tim/);

    // Uji 10b: Anggota biasa dalam tim dimasukkan sebagai deputyId -> DITOLAK
    const resRegularMember = await request(app)
      .post('/api/purwa')
      .send({
        action: 'authorizeControlledFallback',
        payload: {
          token: teacherToken,
          teamId,
          activityId: 'CH08-01-U02-LAB01',
          deputyId: 'STD-CF-003', // Data Analyst (anggota biasa)
          reason: 'Mencoba mengesahkan anggota biasa'
        }
      })
      .expect(200);

    assert.equal(resRegularMember.body.ok, false);
    assert.match(resRegularMember.body.error, /bukan wakil ketua resmi/i);

    // Uji 10c: Activity ID tidak dikenal -> DITOLAK
    const resInvalidActivity = await request(app)
      .post('/api/purwa')
      .send({
        action: 'authorizeControlledFallback',
        payload: {
          token: teacherToken,
          teamId,
          activityId: 'CH08-99-INVALID-ACT',
          deputyId: 'STD-CF-002',
          reason: 'Aktivitas fiktif tidak dikenal'
        }
      })
      .expect(200);

    assert.equal(resInvalidActivity.body.ok, false);
    assert.match(resInvalidActivity.body.error, /tidak terdaftar pada sumber aktivitas/i);

    // Uji 10d: Activity ID milik unit lain -> DITOLAK
    const resMismatchedUnitActivity = await request(app)
      .post('/api/purwa')
      .send({
        action: 'authorizeControlledFallback',
        payload: {
          token: teacherToken,
          teamId,
          unitId: 'CH08-01-U02',
          activityId: 'CH08-05-U01-LAB01', // Milik Bab 5 Unit 1
          deputyId: 'STD-CF-002',
          reason: 'Aktivitas dari unit yang keliru'
        }
      })
      .expect(200);

    assert.equal(resMismatchedUnitActivity.body.ok, false);
    assert.match(resMismatchedUnitActivity.body.error, /tidak cocok dengan unit/i);

    // Uji 10e: Deputy resmi + activity ID yang sesuai -> DITERIMA
    const resValidAuth = await request(app)
      .post('/api/purwa')
      .send({
        action: 'authorizeControlledFallback',
        payload: {
          token: teacherToken,
          teamId,
          unitId: 'CH08-01-U02',
          activityId: 'CH08-01-U02-LAB01',
          deputyId: 'STD-CF-002',
          reason: 'Pengesahan sah untuk wakil ketua resmi'
        }
      })
      .expect(200);

    assert.equal(resValidAuth.body.ok, true);
    assert.equal(resValidAuth.body.data.authorized, true);
    assert.equal(resValidAuth.body.data.deputyId, 'STD-CF-002');
    assert.equal(resValidAuth.body.data.activityId, 'CH08-01-U02-LAB01');

    // Uji 10f: Pencabutan terhadap anggota biasa -> DITOLAK
    const resRevokeRegular = await request(app)
      .post('/api/purwa')
      .send({
        action: 'revokeControlledFallback',
        payload: {
          token: teacherToken,
          teamId,
          activityId: 'CH08-01-U02-LAB01',
          deputyId: 'STD-CF-003', // Anggota biasa
          reason: 'Pencabutan salah target'
        }
      })
      .expect(200);

    assert.equal(resRevokeRegular.body.ok, false);
    assert.match(resRevokeRegular.body.error, /bukan wakil ketua resmi/i);

    // Uji 10g: Tanpa activityId dan tanpa unitId harus ditolak
    const resNoActivity = await request(app)
      .post('/api/purwa')
      .send({
        action: 'authorizeControlledFallback',
        payload: {
          token: teacherToken,
          teamId,
          deputyId: 'STD-CF-002',
          reason: 'Pengalihan tanpa aktivitas'
        }
      })
      .expect(200);

    assert.equal(resNoActivity.body.ok, false);
    assert.match(resNoActivity.body.error, /ID aktivitas praktikum.*wajib/);
  });

  await t.test('11. Controlled Fallback: Teacher revokes authorization and blocks deputy', async () => {
    const targetTeamId = 'TEAM-8A-T02';
    // Reset status LKPD tim ke kosong / draft untuk pengujian izin edit
    deleteWhere_('group_lab', r => r.team_id === targetTeamId);

    // 1. Otorisasi ulang deputy
    const resAuth = await request(app)
      .post('/api/purwa')
      .send({
        action: 'authorizeControlledFallback',
        payload: {
          token: teacherToken,
          teamId: targetTeamId,
          activityId: 'CH08-01-U02-LAB01',
          deputyId: 'STD-CF-002',
          reason: 'Ketua tim izin dan berhalangan'
        }
      })
      .expect(200);

    assert.equal(resAuth.body.ok, true);
    assert.equal(resAuth.body.data.authorized, true);
    assert.equal(resAuth.body.data.status, 'active');

    // 2. Cek status workspace deputy aktif
    const resWorkspaceActive = await request(app)
      .post('/api/purwa')
      .send({
        action: 'practiceWorksheet',
        payload: { token: deputyToken, unitId: 'CH08-01-U02' }
      })
      .expect(200);

    assert.equal(resWorkspaceActive.body.ok, true);
    assert.equal(resWorkspaceActive.body.data.canEdit, true);
    assert.equal(resWorkspaceActive.body.data.fallbackAuthorized, true);

    // 3. Guru mencabut otorisasi fallback
    const resRevoke = await request(app)
      .post('/api/purwa')
      .send({
        action: 'revokeControlledFallback',
        payload: {
          token: teacherToken,
          teamId: targetTeamId,
          activityId: 'CH08-01-U02-LAB01',
          deputyId: 'STD-CF-002',
          reason: 'Ketua tim telah hadir kembali di kelas'
        }
      })
      .expect(200);

    assert.equal(resRevoke.body.ok, true);
    assert.equal(resRevoke.body.data.authorized, false);
    assert.equal(resRevoke.body.data.status, 'revoked');

    // 4. Deputy buka workspace lagi -> canEdit false, fallbackAuthorized false
    const resWorkspaceRevoked = await request(app)
      .post('/api/purwa')
      .send({
        action: 'practiceWorksheet',
        payload: { token: deputyToken, unitId: 'CH08-01-U02' }
      })
      .expect(200);

    assert.equal(resWorkspaceRevoked.body.ok, true);
    assert.equal(resWorkspaceRevoked.body.data.canEdit, false);
    assert.equal(resWorkspaceRevoked.body.data.fallbackAuthorized, false);

    // 5. Deputy mencoba simpan draft -> Ditolak!
    const resSaveBlocked = await request(app)
      .post('/api/purwa')
      .send({
        action: 'saveTeamPracticeDraft',
        payload: {
          token: deputyToken,
          unitId: 'CH08-01-U02',
          report: { prediction: 'Mencoba simpan saat dicabut' },
          fallbackReason: 'Saya masih mau ngedit'
        }
      })
      .expect(200);

    assert.equal(resSaveBlocked.body.ok, false);
    assert.match(resSaveBlocked.body.error, /Pengalihan wewenang ke wakil ketua belum disahkan oleh guru/);
  });
});

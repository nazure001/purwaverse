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
  upsert_,
  findOne_,
  append_,
  hash_,
  isoNow_
} = require('../src/database/repository');
const {
  studentLogin,
  teacherLogin,
  validateSession,
  verifyPin,
  logout,
  hashArgon2
} = require('../src/services/securityService');
const { requireSession, requireRole } = require('../src/middleware/authMiddleware');
const { seedClasses } = require('../src/database/seed');

test('Security & Authentication Migration Test Suite', async (t) => {
  const testDbPath = path.resolve(__dirname, 'test_auth.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Set environment password guru untuk testing
  process.env.TEACHER_USERNAME = 'guru';
  process.env.TEACHER_DEV_PASSWORD = 'PasswordGuru10Char!';
  process.env.STUDENT_PIN_PEPPER = 'test-pepper-uuid-1234';

  setDatabasePath(testDbPath);
  const db = getDatabase();
  seedClasses();

  // Siapkan data siswa uji 1: Format Legacy SHA-256
  const legacyPin = '1234';
  const legacyHash = hash_(`test-pepper-uuid-1234|${legacyPin}`);
  append_('master_students', {
    student_id: 'STD-AUTH-001',
    nis: '001',
    nisn: '111111',
    name: 'Siswa Uji Legacy',
    gender: 'L',
    class_id: '8A',
    roll_no: 1,
    pin_hash: legacyHash,
    active: 1
  });

  // Siapkan data siswa uji 2: Format Argon2id
  const argonPin = '5678';
  const modernHash = await hashArgon2(argonPin);
  append_('master_students', {
    student_id: 'STD-AUTH-002',
    nis: '002',
    nisn: '222222',
    name: 'Siswa Uji Argon2',
    gender: 'P',
    class_id: '8A',
    roll_no: 2,
    pin_hash: modernHash,
    active: 1
  });

  t.after(() => {
    closeDatabase();
    setDatabasePath(CONFIG.DB_PATH);
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (e) {}
    }
  });

  await t.test('1. Student login valid (Format Legacy) & Auto-Upgrade ke Argon2id', async () => {
    // Verifikasi hash awal adalah legacy SHA-256
    const before = findOne_('master_students', { student_id: 'STD-AUTH-001' });
    assert.equal(before.pin_hash.startsWith('$argon2'), false);

    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'loginStudent',
        payload: {
          classId: '8A',
          rollNo: 1,
          pin: '1234'
        }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.token.startsWith('SES-'));
    assert.equal(res.body.data.actorType, 'student');
    assert.equal(res.body.data.actorId, 'STD-AUTH-001');
    assert.equal(res.body.data.classId, '8A');

    // Cek presensi tercatat otomatis
    const today = new Date().toISOString().slice(0, 10);
    const attendance = findOne_('attendance', { attendance_id: `STD-AUTH-001|${today}` });
    assert.ok(attendance, 'Presensi hari ini harus tercatat di database');

    // Verifikasi hash di database telah otomatis diupgrade ke Argon2id!
    const after = findOne_('master_students', { student_id: 'STD-AUTH-001' });
    assert.equal(after.pin_hash.startsWith('$argon2'), true, 'Hash harus diupgrade ke Argon2');

    // Verifikasi login berikutnya menggunakan Argon2id tetap sukses
    const res2 = await request(app)
      .post('/api/purwa')
      .send({
        action: 'loginStudent',
        payload: { classId: '8A', rollNo: 1, pin: '1234' }
      })
      .expect(200);
    assert.equal(res2.body.ok, true);
  });

  await t.test('2. Student login invalid PIN menghasilkan error ramah', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'loginStudent',
        payload: {
          classId: '8A',
          rollNo: 2,
          pin: '9999' // PIN salah
        }
      })
      .expect(200);

    assert.equal(res.body.ok, false);
    assert.equal(res.body.error, 'Kelas, nomor absen, atau PIN tidak sesuai.');
  });

  await t.test('3. Teacher login valid & invalid kata sandi', async () => {
    // Test login salah
    const resFail = await request(app)
      .post('/api/purwa')
      .send({
        action: 'loginTeacher',
        payload: {
          username: 'guru',
          password: 'PasswordSalah!'
        }
      })
      .expect(200);

    assert.equal(resFail.body.ok, false);
    assert.equal(resFail.body.error, 'Login guru tidak sesuai.');

    // Test login benar
    const resSuccess = await request(app)
      .post('/api/purwa')
      .send({
        action: 'loginTeacher',
        payload: {
          username: 'guru',
          password: 'PasswordGuru10Char!'
        }
      })
      .expect(200);

    assert.equal(resSuccess.body.ok, true);
    assert.ok(resSuccess.body.data.token.startsWith('SES-'));
    assert.equal(resSuccess.body.data.actorType, 'teacher');
    assert.ok(resSuccess.body.data.actorId.startsWith('TEACHER-'));
  });

  await t.test('4. Session expired validation', async () => {
    // Buat sesi yang sudah kadaluwarsa di masa lalu
    const expiredToken = 'SES-EXPIRED-TEST-TOKEN';
    const sessionId = hash_(expiredToken);
    const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 jam yang lalu

    append_('sessions', {
      session_id: sessionId,
      actor_type: 'student',
      actor_id: 'STD-AUTH-001',
      class_id: '8A',
      expires_at: pastDate
    });

    assert.throws(() => {
      validateSession(expiredToken);
    }, /Sesi berakhir/);

    assert.throws(() => {
      requireSession(expiredToken);
    }, /Sesi berakhir/);
  });

  await t.test('5. Logout menghapus keabsahan sesi', async () => {
    // Buat sesi aktif
    const activeToken = 'SES-ACTIVE-TEST-TOKEN';
    const sessionId = hash_(activeToken);
    const futureDate = new Date(Date.now() + 8 * 3600000).toISOString();

    append_('sessions', {
      session_id: sessionId,
      actor_type: 'student',
      actor_id: 'STD-AUTH-001',
      class_id: '8A',
      expires_at: futureDate
    });

    // Validasi sebelum logout -> harus valid
    const validSession = validateSession(activeToken);
    assert.ok(validSession);

    // Jalankan aksi logout melalui API RPC
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'logout',
        payload: { token: activeToken }
      })
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.loggedOut, true);

    // Validasi sesudah logout -> harus melempar error sesi berakhir
    assert.throws(() => {
      validateSession(activeToken);
    }, /Sesi berakhir/);
  });

  await t.test('6. Role protection & permission check', async () => {
    // Sesi siswa
    const studentSession = {
      session_id: 'sess1',
      actor_type: 'student',
      actor_id: 'STD-01'
    };

    // Siswa mengakses area siswa -> PASS
    assert.equal(requireRole(studentSession, 'student'), true);

    // Siswa mengakses area guru -> THROW
    assert.throws(() => {
      requireRole(studentSession, 'teacher');
    }, /Akses tidak diizinkan untuk peran ini/);

    // Sesi guru mengakses area guru -> PASS
    const teacherSession = {
      session_id: 'sess2',
      actor_type: 'teacher',
      actor_id: 'TEACHER-01'
    };
    assert.equal(requireRole(teacherSession, 'teacher'), true);
  });
});

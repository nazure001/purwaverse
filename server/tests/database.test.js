const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { getDatabase, closeDatabase, runTransaction } = require('../src/database/db');
const {
  rows_,
  append_,
  upsert_,
  findOne_,
  findAll_,
  deleteWhere_,
  audit_,
  isoNow_
} = require('../src/database/repository');
const { seedClasses, seedCoreActivities, seedDiagnostic, seedStudents } = require('../src/database/seed');

test('Database Layer & Repository Migration Test Suite', async (t) => {
  // Gunakan database test terisolasi
  const testDbPath = path.resolve(__dirname, 'test_purwaverse.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Inisialisasi koneksi dengan test DB
  const db = getDatabase(testDbPath);

  t.after(() => {
    closeDatabase();
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (e) {}
    }
  });

  await t.test('1. Schema berhasil dibuat dan seluruh tabel inti terdefinisi', () => {
    const tablesStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tables = tablesStmt.all().map(r => r.name);

    const requiredTables = [
      'master_classes',
      'master_students',
      'master_activities',
      'diagnostic_items',
      'self_map_items',
      'sessions',
      'progress',
      'diagnostic_responses',
      'diagnostic_profiles',
      'teams',
      'team_members',
      'group_lab',
      'student_activity_state',
      'teacher_checks',
      'quiz_items',
      'quiz_attempts',
      'quiz_responses',
      'skill_evidence',
      'unlock_overrides',
      'attendance',
      'settings',
      'audit_log',
      'pin_issuance'
    ];

    for (const tbl of requiredTables) {
      assert.ok(tables.includes(tbl), `Tabel '${tbl}' harus ada di database SQLite`);
    }
  });

  await t.test('2. Insert & Query Master Classes', () => {
    const count = seedClasses();
    assert.equal(count, 5, 'Harus ada 5 kelas (8A - 8E)');

    const classes = rows_('master_classes');
    assert.equal(classes.length, 5);

    const class8A = findOne_('master_classes', { class_id: '8A' });
    assert.ok(class8A);
    assert.equal(class8A.class_name, 'Kelas 8A');
    assert.equal(class8A.active, 1);
  });

  await t.test('3. Insert student & Query Student (findOne_ & findAll_)', () => {
    const studentData = {
      student_id: 'STD-TEST-001',
      nis: '2526.07.999',
      nisn: '0099887766',
      name: 'Budi Santoso',
      gender: 'L',
      class_id: '8A',
      roll_no: 99,
      pin_hash: 'sample_hash_value',
      active: 1,
      source_row: 'TEST',
      updated_at: isoNow_()
    };

    append_('master_students', studentData);

    // Test findOne_ dengan objek kriteria
    const foundByObj = findOne_('master_students', { student_id: 'STD-TEST-001' });
    assert.ok(foundByObj);
    assert.equal(foundByObj.name, 'Budi Santoso');
    assert.equal(foundByObj.class_id, '8A');

    // Test findOne_ dengan predikat fungsi
    const foundByFn = findOne_('master_students', r => r.roll_no === 99);
    assert.ok(foundByFn);
    assert.equal(foundByFn.student_id, 'STD-TEST-001');

    // Test findAll_
    const allIn8A = findAll_('master_students', { class_id: '8A' });
    assert.ok(allIn8A.length >= 1);
  });

  await t.test('4. Upsert Progress (Insert baru lalu Update status/skor)', () => {
    // Seed core activities terlebih dahulu agar foreign key activity_id valid
    seedCoreActivities();

    const progressId = 'STD-TEST-001|CH08-01-U01-LRN01';

    // Insert progress pertama kali (status draft)
    const firstInsert = upsert_('progress', 'progress_id', {
      progress_id: progressId,
      student_id: 'STD-TEST-001',
      activity_id: 'CH08-01-U01-LRN01',
      status: 'draft',
      score: null,
      evidence_json: JSON.stringify({ note: 'Draft pertama' }),
      updated_at: isoNow_(),
      updated_by: 'STD-TEST-001'
    });
    assert.ok(firstInsert);

    const check1 = findOne_('progress', { progress_id: progressId });
    assert.equal(check1.status, 'draft');

    // Upsert kedua kali pada ID yang sama (status completed, score 95)
    upsert_('progress', 'progress_id', {
      progress_id: progressId,
      student_id: 'STD-TEST-001',
      activity_id: 'CH08-01-U01-LRN01',
      status: 'completed',
      score: 95,
      evidence_json: JSON.stringify({ note: 'Sudah selesai diperiksa' }),
      updated_at: isoNow_(),
      updated_by: 'TEACHER-01'
    });

    const check2 = findOne_('progress', { progress_id: progressId });
    assert.equal(check2.status, 'completed');
    assert.equal(check2.score, 95);
    assert.equal(check2.updated_by, 'TEACHER-01');

    // Pastikan tidak menduplikasi baris
    const allMatching = findAll_('progress', { progress_id: progressId });
    assert.equal(allMatching.length, 1, 'Upsert tidak boleh membuat duplikat record');
  });

  await t.test('5. Audit Log (Perekaman jejak forensik audit)', () => {
    audit_(
      { type: 'teacher', id: 'TEACHER-GURU-01' },
      'VERIFY_SUMMARY',
      'student_activity',
      'STD-TEST-001|CH08-01-U01-LRN01',
      { status: 'verified', score: 100 }
    );

    const logs = findAll_('audit_log', { actor_id: 'TEACHER-GURU-01' });
    assert.ok(logs.length >= 1);
    assert.equal(logs[0].action, 'VERIFY_SUMMARY');
    assert.equal(logs[0].entity_type, 'student_activity');

    const detail = JSON.parse(logs[0].detail_json);
    assert.equal(detail.status, 'verified');
    assert.equal(detail.score, 100);
  });

  await t.test('6. Foreign Key Constraint Enforced', () => {
    // Mencoba insert siswa dengan kelas yang tidak terdaftar ('9Z')
    assert.throws(() => {
      append_('master_students', {
        student_id: 'STD-INVALID-CLASS',
        name: 'Siswa Kelas Hantu',
        class_id: '9Z', // Tidak ada di master_classes
        roll_no: 1,
        pin_hash: 'hash'
      });
    }, /FOREIGN KEY constraint failed/i, 'SQLite wajib menolak insert yang melanggar foreign key');
  });

  await t.test('7. DeleteWhere Operation', () => {
    // Insert temporary session
    append_('sessions', {
      session_id: 'SESS-TO-DELETE-1',
      actor_type: 'student',
      actor_id: 'STD-TEST-001',
      class_id: '8A',
      expires_at: isoNow_()
    });

    const foundBefore = findOne_('sessions', { session_id: 'SESS-TO-DELETE-1' });
    assert.ok(foundBefore);

    const deleted = deleteWhere_('sessions', { session_id: 'SESS-TO-DELETE-1' });
    assert.equal(deleted, 1);

    const foundAfter = findOne_('sessions', { session_id: 'SESS-TO-DELETE-1' });
    assert.equal(foundAfter, null);
  });

  await t.test('8. Full Seeding Test (Roster 208 Siswa & 25 Soal Diagnostik)', () => {
    const diag = seedDiagnostic();
    assert.equal(diag.diagnostic, 25, 'Harus ada 25 butir diagnostik resmi Mission 0');
    assert.equal(diag.selfMap, 6, 'Harus ada 6 butir self-map resmi');

    const studentsImported = seedStudents();
    assert.equal(studentsImported, 208, 'Harus ada 208 siswa resmi dari 8A - 8E');

    // Verifikasi distribusi per kelas
    const counts = {
      '8A': findAll_('master_students', { class_id: '8A' }).length,
      '8B': findAll_('master_students', { class_id: '8B' }).length,
      '8C': findAll_('master_students', { class_id: '8C' }).length,
      '8D': findAll_('master_students', { class_id: '8D' }).length,
      '8E': findAll_('master_students', { class_id: '8E' }).length
    };

    // '8A' memiliki 40 siswa asli + 1 siswa uji (STD-TEST-001) = 41
    assert.equal(counts['8A'], 41);
    assert.equal(counts['8B'], 42);
    assert.equal(counts['8C'], 43);
    assert.equal(counts['8D'], 42);
    assert.equal(counts['8E'], 41);

    // Verifikasi penerbitan PIN privat
    const pinCount = rows_('pin_issuance').length;
    assert.ok(pinCount >= 207, 'PIN privat harus diterbitkan untuk semua siswa');
  });
});

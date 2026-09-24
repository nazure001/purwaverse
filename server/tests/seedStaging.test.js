const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const {
  seedStagingSynthetic,
  assertSafeStagingTarget
} = require('../../scripts/seed-staging-synthetic');

const {
  getDatabase,
  closeDatabase,
  setDatabasePath
} = require('../src/database/db');

test('Staging Synthetic Seeder Test Suite', async (t) => {
  const TEMP_DB = path.resolve(__dirname, 'test_staging_synthetic.db');

  function cleanup() {
    closeDatabase();
    if (fs.existsSync(TEMP_DB)) {
      try { fs.unlinkSync(TEMP_DB); } catch (e) {}
    }
  }

  // Cleanup awal jika ada sisa
  cleanup();

  t.after(() => {
    cleanup();
  });

  await t.test('1. Safety Guard menolak path basis data produksi / tanpa label staging', () => {
    assert.throws(
      () => assertSafeStagingTarget('/var/www/purwaverse/data/purwaverse.db'),
      /SAFETY REJECTION/
    );

    assert.throws(
      () => assertSafeStagingTarget('d:/repo/database/production.db'),
      /SAFETY REJECTION/
    );

    // Path yang valid berlabel staging/test/synthetic
    assert.doesNotThrow(() => assertSafeStagingTarget('/var/www/purwaverse/data/purwaverse_staging.db'));
    assert.doesNotThrow(() => assertSafeStagingTarget('server/tests/test_isolated.db'));
    assert.doesNotThrow(() => assertSafeStagingTarget('data/synthetic_seed.db'));
  });

  await t.test('2. Eksekusi seeder pada DB staging sementara menghasilkan data bersih sesuai schema.sql', async () => {
    const summary = await seedStagingSynthetic(TEMP_DB);

    assert.equal(summary.classes, 5);
    assert.equal(summary.students, 3);
    assert.equal(summary.teams, 1);
    assert.equal(summary.teamMembers, 3);

    setDatabasePath(TEMP_DB);
    const db = getDatabase();

    // 1. Verifikasi teams persis dengan schema.sql (version=1, dilarang team_name/theme)
    const team = db.prepare('SELECT * FROM teams WHERE team_id = ?').get('SYN-TEAM-8A-01');
    assert.ok(team, 'Header tim harus ditemukan');
    assert.equal(team.team_id, 'SYN-TEAM-8A-01');
    assert.equal(team.class_id, '8A');
    assert.equal(team.version, 1, 'teams.version wajib terisi');
    assert.equal(team.status, 'active');
    assert.equal(team.team_name, undefined, 'team_name tidak boleh ada pada tabel teams');
    assert.equal(team.theme, undefined, 'theme tidak boleh ada pada tabel teams');

    // 2. Verifikasi team_members (3 anggota: leader, deputy, member)
    const members = db.prepare('SELECT * FROM team_members WHERE team_id = ? ORDER BY student_id ASC').all('SYN-TEAM-8A-01');
    assert.equal(members.length, 3);

    const leader = members.find(m => m.student_id === 'SYN-LEAD');
    assert.ok(leader);
    assert.equal(leader.role, 'Scientist Leader');
    assert.equal(leader.is_leader, 1);

    const deputy = members.find(m => m.student_id === 'SYN-DEP');
    assert.ok(deputy);
    assert.equal(deputy.role, 'Deputy Scientist');
    assert.equal(deputy.is_leader, 0);

    const member = members.find(m => m.student_id === 'SYN-MEM');
    assert.ok(member);
    assert.equal(member.role, 'Data Analyst');
    assert.equal(member.is_leader, 0);

    // 3. Verifikasi hanya 3 siswa sintetis dan 0 siswa sekolah
    const students = db.prepare('SELECT * FROM master_students').all();
    assert.equal(students.length, 3);
    assert.ok(students.every(s => s.student_id.startsWith('SYN-')));

    // 4. PRAGMA foreign_key_check dan integrity_check
    const fkCheck = db.pragma('foreign_key_check');
    assert.equal(fkCheck.length, 0, 'Tidak boleh ada foreign key violation');

    const integrityCheck = db.pragma('integrity_check');
    assert.equal(integrityCheck[0].integrity_check, 'ok');

    closeDatabase();
  });

  await t.test('3. Seeder staging terbukti idempotent saat dieksekusi berulang kali', async () => {
    // Eksekusi kedua kalinya pada file database yang sama
    const summary2 = await seedStagingSynthetic(TEMP_DB);

    assert.equal(summary2.students, 3);
    assert.equal(summary2.teams, 1);

    setDatabasePath(TEMP_DB);
    const db = getDatabase();

    const studentCount = db.prepare('SELECT COUNT(*) as c FROM master_students').get().c;
    assert.equal(studentCount, 3, 'Data siswa tidak boleh berlipat ganda');

    const teamCount = db.prepare('SELECT COUNT(*) as c FROM teams').get().c;
    assert.equal(teamCount, 1, 'Data tim tidak boleh berlipat ganda');

    const memberCount = db.prepare('SELECT COUNT(*) as c FROM team_members').get().c;
    assert.equal(memberCount, 3, 'Data anggota tim tidak boleh berlipat ganda');

    closeDatabase();
  });

  await t.test('4. Safety Guard menolak eksekusi jika database target telah berisi siswa non-sintetis', async () => {
    setDatabasePath(TEMP_DB);
    const db = getDatabase();

    // Sisipkan akun non-sintetis tiruan
    db.prepare(`
      INSERT INTO master_students (student_id, name, class_id, roll_no, pin_hash, active)
      VALUES ('STD-REAL-999', 'Siswa Nyata Sekolah', '8A', 99, 'hash', 1)
    `).run();

    closeDatabase();

    // Seeder harus menolak keras
    await assert.rejects(
      async () => await seedStagingSynthetic(TEMP_DB),
      /SAFETY REJECTION.*akun siswa non-sintetis/
    );
  });

});

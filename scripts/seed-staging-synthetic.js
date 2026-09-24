/**
 * PURWAVERSE LMS - SCRIPT SEEDING STAGING SINTETIS RESMI
 * File: scripts/seed-staging-synthetic.js
 *
 * Standar Keamanan & Integritas:
 * 1. Skema identik 100% dengan server/src/database/schema.sql
 *    - Tabel `teams`: team_id, class_id, version, balance_score, status, created_at, created_by
 *    - `teams.version` WAJIB diisi.
 *    - DILARANG menggunakan team_name, theme, atau final_balance_score (tidak ada di schema.sql).
 * 2. Transaksi atomik via runTransaction().
 * 3. Idempotent: aman dijalankan berulang kali tanpa duplikasi data.
 * 4. Safety Guard: Menolak keras basis data non-staging / basis data sekolah.
 * 5. Menjamin HANYA akun sintetis (SYN-LEAD, SYN-DEP, SYN-MEM) yang dimuat ke staging.
 * 6. foreign_key_check dan integrity_check wajib bersih (0 pelanggaran).
 */

const path = require('path');
const fs = require('fs');
const assert = require('assert');

const {
  getDatabase,
  closeDatabase,
  setDatabasePath,
  runTransaction
} = require('../server/src/database/db');

const {
  upsert_,
  findOne_,
  findAll_,
  deleteWhere_,
  append_,
  isoNow_
} = require('../server/src/database/repository');

const {
  seedClasses,
  seedLearningData,
  seedDiagnostic
} = require('../server/src/database/seed');

const { hashArgon2 } = require('../server/src/services/securityService');

/**
 * Validasi apakah path database aman untuk operasi staging sintetis
 * @param {string} targetDbPath
 */
function assertSafeStagingTarget(targetDbPath) {
  const normalized = String(targetDbPath || '').toLowerCase();

  // Guard 1: Wajib memiliki penanda 'staging', 'test', atau 'synthetic'
  const isStagingLabeled = normalized.includes('staging') || normalized.includes('test') || normalized.includes('synthetic');
  if (!isStagingLabeled) {
    throw new Error(
      `[SAFETY REJECTION] Script seeding sintetis DITOLAK! Path '${targetDbPath}' tidak memiliki label 'staging', 'test', atau 'synthetic'. Operasi dibatalkan demi melindungi database produksi.`
    );
  }

  // Guard 2: Dilarang menyasar nama baku 'purwaverse.db' tanpa embel-embel staging
  const baseName = path.basename(normalized);
  if (baseName === 'purwaverse.db') {
    throw new Error(
      `[SAFETY REJECTION] Script seeding sintetis DITOLAK! File '${baseName}' adalah nama database operasional sekolah. Seeder staging hanya boleh menyasar purwaverse_staging.db atau database uji.`
    );
  }
}

/**
 * Eksekusi seeding staging sintetis secara atomik dan aman
 * @param {string} [customPath] - Path basis data target
 * @returns {Promise<object>} Ringkasan hasil seeding
 */
async function seedStagingSynthetic(customPath) {
  const targetPath = customPath || process.env.DB_PATH || path.resolve(__dirname, '../server/data/purwaverse_staging.db');

  assertSafeStagingTarget(targetPath);

  // Pastikan folder target tersedia
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Set database aktif dan inisialisasi schema
  setDatabasePath(targetPath);
  const db = getDatabase();

  // Guard 3: Periksa apakah database target sudah berisi siswa non-sintetis
  const nonSyntheticCount = db.prepare(
    "SELECT COUNT(*) as count FROM master_students WHERE student_id NOT LIKE 'SYN-%'"
  ).get().count;

  if (nonSyntheticCount > 0) {
    throw new Error(
      `[SAFETY REJECTION] Database target '${targetPath}' telah berisi ${nonSyntheticCount} akun siswa non-sintetis! Seeder staging menolak menimpa atau mencemari database siswa asli.`
    );
  }

  console.log(`🌱 [STAGING SEED] Memulai seeding sintetis pada: ${targetPath}`);

  const pinHash = await hashArgon2('1234');
  let resultSummary = {};

  // Eksekusi atomik dalam satu transaksi transaksi SQLite
  runTransaction(() => {
    // 1. Seed Master Classes (8A - 8E)
    const classCount = seedClasses();

    // 2. Seed Master Activities & Quiz Items (62 aktivitas kurikulum & 210 soal kuis)
    const learningSummary = seedLearningData();

    // 3. Seed Diagnostic Items & Self Map (25 butir soal M0 & 6 angket)
    const diagSummary = seedDiagnostic();

    // 4. Seed Akun Siswa Sintetis Resmi (Idempotent via upsert_)
    const syntheticStudents = [
      {
        student_id: 'SYN-LEAD',
        nis: 'NIS-SYN-01',
        nisn: '9990000001',
        name: 'Ahmad Synthetic Leader',
        gender: 'L',
        class_id: '8A',
        roll_no: 91,
        pin_hash: pinHash,
        active: 1,
        source_row: 'SYN-1',
        updated_at: isoNow_()
      },
      {
        student_id: 'SYN-DEP',
        nis: 'NIS-SYN-02',
        nisn: '9990000002',
        name: 'Budi Synthetic Deputy',
        gender: 'L',
        class_id: '8A',
        roll_no: 92,
        pin_hash: pinHash,
        active: 1,
        source_row: 'SYN-2',
        updated_at: isoNow_()
      },
      {
        student_id: 'SYN-MEM',
        nis: 'NIS-SYN-03',
        nisn: '9990000003',
        name: 'Citra Synthetic Member',
        gender: 'P',
        class_id: '8A',
        roll_no: 93,
        pin_hash: pinHash,
        active: 1,
        source_row: 'SYN-3',
        updated_at: isoNow_()
      }
    ];

    for (const s of syntheticStudents) {
      upsert_('master_students', 'student_id', s);
      upsert_('pin_issuance', 'student_id', {
        student_id: s.student_id,
        class_id: s.class_id,
        roll_no: s.roll_no,
        pin: '1234',
        issued_at: isoNow_(),
        rotated_at: ''
      });
    }

    // 5. Seed Tim Laboratorium Sintetis
    // Sesuai schema.sql: team_id, class_id, version, balance_score, status, created_at, created_by
    const teamId = 'SYN-TEAM-8A-01';
    upsert_('teams', 'team_id', {
      team_id: teamId,
      class_id: '8A',
      version: 1, // WAJIB sesuai schema.sql
      balance_score: 95.0,
      status: 'active',
      created_at: isoNow_(),
      created_by: 'STAGING-SEEDER'
    });

    // 6. Seed Anggota Tim Sintetis
    // Sesuai schema.sql: membership_id, team_id, student_id, role, is_leader, locked, override_note
    const teamMembers = [
      {
        membership_id: `${teamId}|SYN-LEAD`,
        team_id: teamId,
        student_id: 'SYN-LEAD',
        role: 'Scientist Leader',
        is_leader: 1,
        locked: 0,
        override_note: ''
      },
      {
        membership_id: `${teamId}|SYN-DEP`,
        team_id: teamId,
        student_id: 'SYN-DEP',
        role: 'Deputy Scientist',
        is_leader: 0,
        locked: 0,
        override_note: ''
      },
      {
        membership_id: `${teamId}|SYN-MEM`,
        team_id: teamId,
        student_id: 'SYN-MEM',
        role: 'Data Analyst',
        is_leader: 0,
        locked: 0,
        override_note: ''
      }
    ];

    for (const tm of teamMembers) {
      upsert_('team_members', 'membership_id', tm);
    }

    // 7. Dispensasi Buka Praktikum Unit 2 Uji Coba untuk Tim Sintetis
    for (const s of syntheticStudents) {
      upsert_('unlock_overrides', 'override_id', {
        override_id: `OVR-${s.student_id}-LAB`,
        student_id: s.student_id,
        activity_id: 'CH08-01-U02-LAB01',
        allowed: 1,
        reason: 'Akses Uji LKPD Sintetis Staging',
        created_by: 'TEACHER-SYSTEM',
        created_at: isoNow_()
      });
    }

    resultSummary = {
      targetPath,
      classes: classCount,
      activities: learningSummary.units,
      quizItems: learningSummary.quizItems,
      diagnostics: diagSummary.diagnostic,
      selfMaps: diagSummary.selfMap,
      students: syntheticStudents.length,
      teams: 1,
      teamMembers: teamMembers.length
    };
  });

  // 8. Verifikasi Integritas Pasca-Seeding
  const fkCheck = db.pragma('foreign_key_check');
  if (fkCheck.length > 0) {
    throw new Error(`[INTEGRITY FAILURE] foreign_key_check mendeteksi pelanggaran: ${JSON.stringify(fkCheck)}`);
  }

  const integrityCheck = db.pragma('integrity_check');
  if (integrityCheck[0].integrity_check !== 'ok') {
    throw new Error(`[INTEGRITY FAILURE] integrity_check gagal: ${JSON.stringify(integrityCheck)}`);
  }

  // Verifikasi keabsahan data siswa
  const totalStudents = db.prepare("SELECT COUNT(*) as c FROM master_students").get().c;
  const nonSynthetic = db.prepare("SELECT COUNT(*) as c FROM master_students WHERE student_id NOT LIKE 'SYN-%'").get().c;

  assert.equal(nonSynthetic, 0, 'Database staging tercemar oleh akun non-sintetis!');
  assert.equal(totalStudents, 3, 'Jumlah akun sintetis harus tepat 3 siswa!');

  console.log(`✅ [STAGING SEED] Selesai 100%! Siswa Sintetis: ${totalStudents}, FK Violations: 0, Integrity: OK.`);
  return resultSummary;
}

// Handler eksekusi langsung CLI
if (require.main === module) {
  const customPath = process.argv[2] || process.env.DB_PATH;
  seedStagingSynthetic(customPath)
    .then((res) => {
      console.log('\n[RINGKASAN SEEDING STAGING SINTETIS]');
      console.table(res);
      closeDatabase();
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ SEEDING GAGAL:', err.message);
      closeDatabase();
      process.exit(1);
    });
}

module.exports = {
  seedStagingSynthetic,
  assertSafeStagingTarget,
  closeDatabase
};

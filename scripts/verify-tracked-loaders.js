/**
 * PURWAVERSE LMS PHASE 1 - TRACKED LOADERS ISOLATED VERIFICATION
 *
 * Membuktikan bahwa seluruh loader basis data berjalan sempurna dari
 * salinan source code tracked (rosterData.js, diagnosticData.js, learningData.js)
 * pada database uji yang terisolasi tanpa menyentuh purwaverse.db sekolah.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.resolve(__dirname, '../server/tests/test_loader_isolated.db');
if (fs.existsSync(TEST_DB_PATH)) {
  try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
}

process.env.NODE_ENV = 'test';
process.env.PURWAVERSE_DB_PATH = TEST_DB_PATH;

const CONFIG = require('../server/src/config');
CONFIG.DB_PATH = TEST_DB_PATH;

const { getDatabase, closeDatabase, setDatabasePath } = require('../server/src/database/db');
setDatabasePath(TEST_DB_PATH);
const db = getDatabase();

const { findAll_, count_ } = require('../server/src/database/repository');
const {
  seedClasses,
  seedCoreActivities,
  seedLearningData,
  seedDiagnostic,
  seedStudents,
  runFullSeed
} = require('../server/src/database/seed');

async function testTrackedLoaders() {
  console.log('================================================================');
  console.log('PURWAVERSE LMS - TRACKED SOURCE LOADERS ISOLATION TEST');
  console.log(`Database Uji: ${TEST_DB_PATH}`);
  console.log('================================================================\n');

  try {
    // 1. Eksekusi Full Seed dari sumber tracked
    console.log('[STEP 1] Menjalankan runFullSeed() dari berkas data tracked...');
    const result = runFullSeed();

    // 2. Verifikasi Integritas Relasional SQLite
    console.log('\n[STEP 2] Memeriksa Foreign Key & Integrity Check...');
    const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
    assert.strictEqual(fkErrors.length, 0, 'Foreign key check harus bersih tanpa violation');
    console.log('  ✓ PRAGMA foreign_key_check: CLEAN (0 violations).');

    const integrity = db.prepare('PRAGMA integrity_check').all();
    assert.strictEqual(integrity[0].integrity_check, 'ok');
    console.log('  ✓ PRAGMA integrity_check: ok.');

    // 3. Verifikasi Roster Kelas 8A-8E
    console.log('\n[STEP 3] Memeriksa Master Classes & Master Students...');
    const classes = findAll_('master_classes');
    assert.strictEqual(classes.length, 5, 'Harus ada 5 kelas (8A s.d. 8E)');
    const classIds = classes.map(c => c.class_id).sort();
    assert.deepStrictEqual(classIds, ['8A', '8B', '8C', '8D', '8E']);
    console.log(`  ✓ master_classes terverifikasi: ${classIds.join(', ')}`);

    const students = findAll_('master_students');
    assert.ok(students.length >= 200, 'Roster siswa harus memuat >200 siswa');
    console.log(`  ✓ master_students terverifikasi: ${students.length} siswa resmi.`);

    // 4. Verifikasi Diagnostic Bank (Mission 0)
    console.log('\n[STEP 4] Memeriksa Diagnostic & Self-Map Items...');
    const diag = findAll_('diagnostic_items');
    assert.strictEqual(diag.length, 25, 'Bank soal diagnostik harus tepat 25 butir resmi');
    console.log(`  ✓ diagnostic_items terverifikasi: ${diag.length} butir.`);

    const selfMap = findAll_('self_map_items');
    assert.strictEqual(selfMap.length, 6, 'Self-map items harus tepat 6 butir resmi');
    console.log(`  ✓ self_map_items terverifikasi: ${selfMap.length} butir.`);

    // 5. Verifikasi Master Activities & Quiz Items
    console.log('\n[STEP 5] Memeriksa Master Activities & Quiz Bank...');
    const activities = findAll_('master_activities');
    assert.ok(activities.length >= 7, 'Master activities harus terdefinisi');
    console.log(`  ✓ master_activities terverifikasi: ${activities.length} aktivitas.`);

    const quizItems = findAll_('quiz_items');
    assert.ok(quizItems.length >= 8, 'Quiz items harus terdefinisi');
    console.log(`  ✓ quiz_items terverifikasi: ${quizItems.length} butir kuis.`);

    console.log('\n================================================================');
    console.log('🎉 SELURUH TRACKED SOURCE LOADERS TERBUKTI BERJALAN 100% CLEAN!');
    console.log('================================================================\n');

  } finally {
    closeDatabase();
    setDatabasePath(CONFIG.DB_PATH);
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
      console.log(`🧹 [CLEANUP] Database uji terisolasi berhasil dihapus: ${TEST_DB_PATH}`);
    }
  }
}

testTrackedLoaders().catch(err => {
  console.error('\n❌ TRACKED LOADER VERIFICATION FAILED:', err);
  process.exit(1);
});

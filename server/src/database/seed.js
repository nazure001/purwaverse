const CONFIG = require('../config');
const { getDatabase, runTransaction } = require('./db');
const { upsert_, findOne_, findAll_, append_, hash_, isoNow_ } = require('./repository');
const { OFFICIAL_ROSTER_ } = require('../data/rosterData');
const { OFFICIAL_DIAGNOSTIC_, OFFICIAL_SELF_MAP_ } = require('../data/diagnosticData');

function studentPinHash(pin) {
  const pepper = CONFIG.STUDENT_PIN_PEPPER;
  return pepper ? hash_(`${pepper}|${pin}`) : hash_(pin);
}

function uniquePinForClass(classId) {
  const used = new Set(
    findAll_('pin_issuance', r => r.class_id === classId).map(r => String(r.pin))
  );
  for (let i = 0; i < 10000; i++) {
    const pin = String(1000 + Math.floor(Math.random() * 9000));
    if (!used.has(pin)) return pin;
  }
  throw new Error(`[SEED ERROR] Tidak dapat menghasilkan PIN unik untuk kelas ${classId}`);
}

function seedClasses() {
  const classes = ['8A', '8B', '8C', '8D', '8E'];
  let count = 0;
  for (const id of classes) {
    upsert_('master_classes', 'class_id', {
      class_id: id,
      class_name: `Kelas ${id}`,
      school_year: CONFIG.SCHOOL_YEAR,
      active: 1
    });
    count++;
  }
  return count;
}

function seedCoreActivities() {
  const coreActivities = [
    ['M0-QUICK', 'M0', 'M0-U01', 'diagnostic', 'Mission 0 - Quick Diagnostic', 4, 1, 0],
    ['CH08-01-U01-LRN01', 'CH08-01', 'CH08-01-U01', 'learn', 'Sel sebagai Unit Kehidupan', 0, 1, 1],
    ['CH08-01-U01-EXP01', 'CH08-01', 'CH08-01-U01', 'explore', 'Microscope World', 0, 0, 1],
    ['CH08-01-U02-LAB01', 'CH08-01', 'CH08-01-U02', 'lab', 'Observasi Dunia Mikroskopis', 100, 1, 1],
    ['CH08-01-U02-QCK01', 'CH08-01', 'CH08-01-U02', 'quick_check', 'Struktur dan Fungsi Organel', 100, 1, 1],
    ['CH08-01-U03-CHL01', 'CH08-01', 'CH08-01-U03', 'challenge', 'Cell Case File', 100, 1, 1],
    ['CH08-01-U03-RSH01', 'CH08-01', 'CH08-01-U03', 'research', 'Observe + Ask', 4, 0, 1]
  ];

  let count = 0;
  for (const a of coreActivities) {
    upsert_('master_activities', 'activity_id', {
      activity_id: a[0],
      chapter_id: a[1],
      unit_id: a[2],
      type: a[3],
      title: a[4],
      max_score: a[5],
      required: a[6],
      public: a[7],
      active: 1
    });
    count++;
  }

  upsert_('settings', 'key', {
    key: 'source_status',
    value: CONFIG.SOURCE_STATUS,
    updated_at: isoNow_()
  });

  return count;
}

function seedDiagnostic() {
  let diagCount = 0;
  for (const item of OFFICIAL_DIAGNOSTIC_) {
    upsert_('diagnostic_items', 'item_id', {
      item_id: item.item_id,
      source_number: item.source_number,
      domain: item.domain,
      prompt: item.prompt,
      rubric_json: item.rubric_json,
      max_score: item.max_score,
      active: item.active ? 1 : 0,
      source_status: item.source_status
    });
    diagCount++;
  }

  let selfMapCount = 0;
  for (const item of OFFICIAL_SELF_MAP_) {
    upsert_('self_map_items', 'item_id', {
      item_id: item.item_id,
      dimension: item.dimension,
      prompt: item.prompt,
      active: item.active ? 1 : 0,
      source_status: item.source_status
    });
    selfMapCount++;
  }

  return { diagnostic: diagCount, selfMap: selfMapCount };
}

function seedStudents(records) {
  const allowed = new Set(['8A', '8B', '8C', '8D', '8E']);
  const studentList = records || OFFICIAL_ROSTER_;
  let imported = 0;

  for (let i = 0; i < studentList.length; i++) {
    const r = studentList[i];
    if (!allowed.has(r.class_id)) continue;

    const studentId = r.student_id || `STD-${hash_(r.nisn || `${r.class_id}|${r.roll_no}|${r.name}`).slice(0, 16)}`;
    const existing = findOne_('master_students', { student_id: studentId });

    let issuance = findOne_('pin_issuance', { student_id: studentId });
    let pin;
    if (issuance) {
      pin = issuance.pin;
    } else {
      pin = uniquePinForClass(r.class_id);
    }

    const pinHashValue = (existing && existing.pin_hash)
      ? existing.pin_hash
      : studentPinHash(pin);

    upsert_('master_students', 'student_id', {
      student_id: studentId,
      nis: r.nis || '',
      nisn: r.nisn || '',
      name: r.name,
      gender: r.gender || '',
      class_id: r.class_id,
      roll_no: r.roll_no,
      pin_hash: pinHashValue,
      active: r.active !== false ? 1 : 0,
      source_row: String(r.source_row || i + 2),
      updated_at: isoNow_()
    });

    if (!issuance) {
      append_('pin_issuance', {
        student_id: studentId,
        class_id: r.class_id,
        roll_no: r.roll_no,
        pin,
        issued_at: isoNow_(),
        rotated_at: ''
      });
    }

    imported++;
  }

  return imported;
}

function seedLearningData() {
  const { allLearningUnits_, allQuizItems_ } = require('../data/learningData');
  const units = allLearningUnits_();
  const quizItems = allQuizItems_();

  for (const unit of units) {
    upsert_('master_activities', 'activity_id', {
      activity_id: unit.learn_activity_id,
      chapter_id: unit.chapter_id,
      unit_id: unit.unit_id,
      type: 'learn',
      title: unit.title + ' - Rangkuman',
      max_score: 0,
      required: 1,
      public: 1,
      active: 1
    });

    upsert_('master_activities', 'activity_id', {
      activity_id: unit.quiz_activity_id,
      chapter_id: unit.chapter_id,
      unit_id: unit.unit_id,
      type: 'quiz',
      title: unit.title + ' - Kuis Penguasaan',
      max_score: 100,
      required: 1,
      public: 1,
      active: 1
    });

    if (unit.practice_activity_id) {
      upsert_('master_activities', 'activity_id', {
        activity_id: unit.practice_activity_id,
        chapter_id: unit.chapter_id,
        unit_id: unit.unit_id,
        type: unit.practice_activity_id.includes('CHL') ? 'challenge' : 'lab',
        title: unit.title + ' - Praktik/LKPD',
        max_score: 100,
        required: unit.practice_required ? 1 : 0,
        public: 1,
        active: 1
      });
    }
  }

  for (const item of quizItems) {
    upsert_('quiz_items', 'quiz_item_id', {
      quiz_item_id: item.quiz_item_id,
      activity_id: item.activity_id,
      question_type: item.question_type,
      prompt: item.prompt,
      options_json: JSON.stringify(item.options),
      answer_json: JSON.stringify(item.answer),
      feedback_json: JSON.stringify({ default: item.feedback }),
      max_score: item.max_score,
      active: item.active ? 1 : 0
    });
  }

  return { units: units.length, quizItems: quizItems.length };
}

function runFullSeed() {
  getDatabase(); // Pastikan koneksi dan schema aktif
  console.log('🌱 [SEED] Memulai seeding database Purwaverse...');

  let result = {};
  runTransaction(() => {
    const classes = seedClasses();
    console.log(`  ✔ Master classes seeded: ${classes} kelas (8A-8E)`);

    const activities = seedCoreActivities();
    console.log(`  ✔ Core activities seeded: ${activities} aktivitas`);

    const learning = seedLearningData();
    console.log(`  ✔ Learning activities seeded: ${learning.units} unit, ${learning.quizItems} butir kuis`);

    const diag = seedDiagnostic();
    console.log(`  ✔ Diagnostic bank seeded: ${diag.diagnostic} soal, ${diag.selfMap} self-map`);

    const students = seedStudents();
    console.log(`  ✔ Master students imported: ${students} siswa`);

    result = { classes, activities, learning, diagnostic: diag.diagnostic, selfMap: diag.selfMap, students };
  });

  console.log('✅ [SEED] Seeding database selesai!');
  return result;
}

if (require.main === module) {
  runFullSeed();
}

module.exports = {
  seedClasses,
  seedCoreActivities,
  seedLearningData,
  seedDiagnostic,
  seedStudents,
  runFullSeed
};

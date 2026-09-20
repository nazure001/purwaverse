const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { getDatabase, closeDatabase } = require('../src/database/db');
const {
  rows_,
  append_,
  findOne_,
  findAll_,
  deleteWhere_,
  isoNow_
} = require('../src/database/repository');

test('Content Engineering & Curriculum Hierarchy Test Suite', async (t) => {
  const testDbPath = path.resolve(__dirname, 'test_content_eng.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = getDatabase(testDbPath);

  t.after(() => {
    closeDatabase();
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (e) {}
    }
  });

  await t.test('1. Seluruh 11 tabel Content Engineering terdefinisi di SQLite', () => {
    const tablesStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tables = tablesStmt.all().map(r => r.name);

    const expectedNewTables = [
      'courses',
      'learning_units',
      'concepts',
      'lessons',
      'lesson_concepts',
      'rubrics',
      'assessments',
      'assessment_concepts',
      'learning_activities',
      'activity_concepts',
      'activity_evidence_rules'
    ];

    for (const tbl of expectedNewTables) {
      assert.ok(tables.includes(tbl), `Tabel baru '${tbl}' harus terdefinisi di SQLite schema`);
    }
  });

  await t.test('2. Hierarki Lengkap: Course -> Unit -> Lesson -> Concept -> Activity -> Evidence -> Assessment', () => {
    // 1. Course
    append_('courses', {
      course_id: 'CUR-IPA-VIII-KBM',
      code: 'IPA-8-KBM',
      title: 'IPA Terpadu Kelas VIII (Fase D)',
      grade_level: 8,
      curriculum_type: 'school_private',
      description: 'Kurikulum KBM sekolah IPA Kelas 8'
    });

    const course = findOne_('courses', { course_id: 'CUR-IPA-VIII-KBM' });
    assert.ok(course);
    assert.equal(course.grade_level, 8);

    // 2. Learning Unit
    append_('learning_units', {
      unit_id: 'CH08-01-U01',
      course_id: 'CUR-IPA-VIII-KBM',
      chapter_id: 'CH08-01',
      title: 'Pengenalan Sel & Mikroskop',
      sequence_order: 1,
      description: 'Dasar sel hewan dan tumbuhan'
    });

    const unit = findOne_('learning_units', { unit_id: 'CH08-01-U01' });
    assert.ok(unit);
    assert.equal(unit.chapter_id, 'CH08-01');

    // 3. Lesson
    append_('lessons', {
      lesson_id: 'LSN-080101-01',
      unit_id: 'CH08-01-U01',
      title: 'Sel sebagai Unit Struktural Kehidupan',
      sequence_order: 1,
      learning_objective: 'Siswa dapat menjelaskan perbedaan sel hewan dan tumbuhan.',
      content_markdown: '### Teori Sel\nSemua makhluk hidup tersusun atas sel.',
      assets_json: JSON.stringify([{ asset_id: 'AST-01', type: 'svg', caption: 'Sel Tumbuhan' }]),
      tables_json: JSON.stringify([{ table_id: 'TBL-01', title: 'Perbedaan Sel', headers: ['Organel'], rows: [['Dinding Sel']] }]),
      reading_time_minutes: 6
    });

    const lesson = findOne_('lessons', { lesson_id: 'LSN-080101-01' });
    assert.ok(lesson);
    assert.equal(lesson.unit_id, 'CH08-01-U01');

    // 4. Concept
    append_('concepts', {
      concept_id: 'CON-BIO-CELL-THEORY',
      name: 'Teori Sel & Karakteristik Hidup',
      domain: 'biology',
      fase: 'D',
      description: 'Konsep dasar bahwa sel adalah unit fungsional terkecil.'
    });

    const concept = findOne_('concepts', { concept_id: 'CON-BIO-CELL-THEORY' });
    assert.ok(concept);

    // 5. Relasi Lesson <-> Concept
    append_('lesson_concepts', {
      lesson_id: 'LSN-080101-01',
      concept_id: 'CON-BIO-CELL-THEORY',
      weight: 1.0
    });

    const relLC = findOne_('lesson_concepts', { lesson_id: 'LSN-080101-01', concept_id: 'CON-BIO-CELL-THEORY' });
    assert.ok(relLC);

    // 6. Learning Activity
    append_('learning_activities', {
      activity_id: 'ACT-080101-NOTE',
      lesson_id: 'LSN-080101-01',
      activity_type: 'reading_summary',
      title: 'Resume 6 Bagian Buku Catatan Fisik',
      instructions: 'Tuliskan rangkuman materi di buku tulis bertanggal.',
      evidence_type: 'physical_notebook',
      requires_teacher_check: 1
    });

    const act = findOne_('learning_activities', { activity_id: 'ACT-080101-NOTE' });
    assert.ok(act);
    assert.equal(act.evidence_type, 'physical_notebook');

    // 7. Relasi Concept <-> Activity
    append_('activity_concepts', {
      activity_id: 'ACT-080101-NOTE',
      concept_id: 'CON-BIO-CELL-THEORY',
      weight: 1.0
    });

    const relAC = findOne_('activity_concepts', { activity_id: 'ACT-080101-NOTE' });
    assert.ok(relAC);

    // 8. Relasi Activity <-> Evidence Rule
    append_('activity_evidence_rules', {
      rule_id: 'EVR-NOTE-080101',
      activity_id: 'ACT-080101-NOTE',
      evidence_name: 'Buku Catatan Fisik Tertanda Guru',
      format_description: 'Tulisan tangan rapi, minimal 1 halaman, ada tabel perbandingan',
      verification_method: 'teacher_physical_inspection'
    });

    const evRule = findOne_('activity_evidence_rules', { rule_id: 'EVR-NOTE-080101' });
    assert.ok(evRule);
    assert.equal(evRule.verification_method, 'teacher_physical_inspection');

    // 9. Rubric
    append_('rubrics', {
      rubric_id: 'RUB-NOTEBOOK-01',
      title: 'Rubrik Penilaian Resume Buku Fisik',
      criteria_json: JSON.stringify({
        level_4: 'Lengkap 6 bagian, rapi, ada diagram sendiri',
        level_3: 'Lengkap 6 bagian, ada beberapa catatan kurang',
        level_2: 'Hanya 3-4 bagian',
        level_1: 'Tidak lengkap, perlu bimbingan ulang'
      }),
      instructions_for_teacher: 'Periksa paraf dan tanggal di buku catatan siswa'
    });

    const rubric = findOne_('rubrics', { rubric_id: 'RUB-NOTEBOOK-01' });
    assert.ok(rubric);

    // 10. Assessment (Assessment <-> Rubric)
    append_('assessments', {
      assessment_id: 'ASM-080101-NOTE',
      lesson_id: 'LSN-080101-01',
      unit_id: 'CH08-01-U01',
      assessment_type: 'physical_notebook',
      title: 'Validasi Rangkuman Buku Siswa',
      passing_score: 70.0,
      max_score: 100.0,
      is_deterministic: 0,
      rubric_id: 'RUB-NOTEBOOK-01'
    });

    const asm = findOne_('assessments', { assessment_id: 'ASM-080101-NOTE' });
    assert.ok(asm);
    assert.equal(asm.rubric_id, 'RUB-NOTEBOOK-01');

    // 11. Relasi Concept <-> Assessment
    append_('assessment_concepts', {
      assessment_id: 'ASM-080101-NOTE',
      concept_id: 'CON-BIO-CELL-THEORY',
      weight: 1.0
    });

    const relAsmC = findOne_('assessment_concepts', { assessment_id: 'ASM-080101-NOTE' });
    assert.ok(relAsmC);
  });
});

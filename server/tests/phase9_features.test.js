const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/server');
const { createSession } = require('../src/services/securityService');

describe('Phase 9 Post-Production Features Test Suite', () => {
  let teacherSession;
  let studentSession;

  before(() => {
    teacherSession = createSession('teacher', 'TEACHER-TEST-9', '8A,8B,8C,8D,8E');
    studentSession = createSession('student', 'STD-TEST-9', '8A');
  });

  test('1. getCredentialCards: Akses siswa harus ditolak', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'getCredentialCards',
        payload: {
          token: studentSession.token,
          classId: '8A'
        }
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Akses tidak diizinkan|Peran tidak diizinkan|Sesi tidak valid/i);
  });

  test('2. getCredentialCards: Guru dapat mengambil daftar PIN kelas 8A', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'getCredentialCards',
        payload: {
          token: teacherSession.token,
          classId: '8A'
        }
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.classId, '8A');
    assert.ok(res.body.data.students.length > 0);

    const firstStudent = res.body.data.students[0];
    assert.ok(firstStudent.name);
    assert.ok(firstStudent.code);
    assert.ok(firstStudent.pin);
    assert.match(firstStudent.code, /^8A-\d{2}$/);
    assert.match(firstStudent.pin, /^\d{4}$/);
  });

  test('3. getCredentialCards: Guru dapat mengambil daftar seluruh angkatan (all)', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'getCredentialCards',
        payload: {
          token: teacherSession.token,
          classId: 'all'
        }
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.classId, 'all');
    assert.ok(res.body.data.total >= 200);
  });

  test('4. exportGradesExcel: Akses siswa harus ditolak', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'exportGradesExcel',
        payload: {
          token: studentSession.token
        }
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Akses tidak diizinkan|Peran tidak diizinkan|Sesi tidak valid/i);
  });

  test('5. exportGradesExcel: Guru menerima XML Spreadsheet multi-tab 8A-8E', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'exportGradesExcel',
        payload: {
          token: teacherSession.token
        }
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.filename.endsWith('.xls'));
    assert.ok(res.body.data.xml);

    const xml = res.body.data.xml;
    assert.ok(xml.includes('urn:schemas-microsoft-com:office:spreadsheet'));
    assert.ok(xml.includes('ss:Name="Kelas 8A"'));
    assert.ok(xml.includes('ss:Name="Kelas 8B"'));
    assert.ok(xml.includes('ss:Name="Kelas 8C"'));
    assert.ok(xml.includes('ss:Name="Kelas 8D"'));
    assert.ok(xml.includes('ss:Name="Kelas 8E"'));
    assert.ok(xml.includes('REKAPITULASI NILAI IPA'));
  });

  test('6. saveTeacherChecks: Pengesahan massal dengan array studentIds', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'saveTeacherChecks',
        payload: {
          token: teacherSession.token,
          classId: '8A',
          activityId: 'CH08-01-U01-LRN01',
          checkType: 'summary',
          status: 'verified',
          score: 90,
          studentIds: ['8A-1', '8A-2']
        }
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.verified, true);
  });
});

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/server');
const { getDatabase, closeDatabase } = require('../src/database/db');

test('Backend Skeleton & RPC Router Test Suite', async (t) => {

  await t.test('1. GET / harus mengembalikan status online', async () => {
    const res = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(200);

    assert.equal(res.body.status, 'online');
    assert.equal(res.body.service, 'purwaverse');
  });

  await t.test('2. POST /api/purwa dengan action bootstrap harus mengembalikan ok: true', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'bootstrap',
        payload: {}
      })
      .expect('Content-Type', /json/)
      .expect(200);

    assert.equal(res.body.ok, true);
    assert.ok(res.body.data);
    assert.equal(res.body.data.appName, 'Purwaverse IPA VIII');
    assert.equal(res.body.data.mode, 'VPS-MIGRATION');
    assert.equal(res.body.data.status, 'ONLINE');
  });

  await t.test('3. POST /api/purwa dengan action belum dimigrasikan harus mengembalikan ok: false', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({
        action: 'unmigratedActionX',
        payload: { sample: 123 }
      })
      .expect('Content-Type', /json/)
      .expect(200);

    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /belum dimigrasikan/);
  });

  await t.test('4. POST /api/purwa tanpa action harus mengembalikan error validasi', async () => {
    const res = await request(app)
      .post('/api/purwa')
      .send({})
      .expect('Content-Type', /json/)
      .expect(200);

    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Action wajib disertakan/);
  });

  await t.test('5. Database SQLite connection & pragmas terverifikasi', async () => {
    const db = getDatabase(':memory:');
    assert.ok(db, 'Instance database SQLite harus terinisialisasi');

    const journalMode = db.pragma('journal_mode', { simple: true });
    // Pada :memory:, SQLite selalu menetapkan 'memory'
    assert.ok(journalMode, 'Pragma journal_mode harus aktif');

    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    assert.equal(foreignKeys, 1, 'Foreign keys harus bernilai ON (1)');

    const busyTimeout = db.pragma('busy_timeout', { simple: true });
    assert.equal(busyTimeout, 5000, 'Busy timeout harus bernilai 5000ms');

    closeDatabase();
  });

  await t.test('6. Health check endpoints (/healthz & /api/healthz) harus mengembalikan status online', async () => {
    const res1 = await request(app)
      .get('/healthz')
      .expect('Content-Type', /json/)
      .expect(200);

    assert.equal(res1.body.status, 'online');
    assert.equal(res1.body.service, 'purwaverse');

    const res2 = await request(app)
      .get('/api/healthz')
      .expect('Content-Type', /json/)
      .expect(200);

    assert.equal(res2.body.status, 'online');
    assert.equal(res2.body.service, 'purwaverse');
  });

  await t.test('7. Kontrak ALLOWED_ORIGIN dan TRUST_PROXY terkonfigurasi pada Express app', async () => {
    const CONFIG = require('../src/config');
    assert.ok(typeof CONFIG.ALLOWED_ORIGIN === 'string', 'ALLOWED_ORIGIN harus berupa string');
    assert.ok(typeof CONFIG.TRUST_PROXY === 'string', 'TRUST_PROXY harus berupa string');

    // Menguji respons OPTIONS dengan header CORS
    const resCors = await request(app)
      .options('/api/purwa')
      .set('Origin', 'http://localhost:5210')
      .expect(204);

    assert.ok(resCors.headers['access-control-allow-origin']);
  });

});

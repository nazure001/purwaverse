// Set environment staging sebelum module config dan server di-load
process.env.NODE_ENV = 'staging';
process.env.ALLOWED_ORIGIN = 'https://staging.purwaverse.sekolah.sch.id';
process.env.TRUST_PROXY = '1';
process.env.SESSION_TTL_HOURS = '12';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const CONFIG = require('../src/config');
const app = require('../src/server');

test('Staging Environment Configuration & Security Policy Suite', async (t) => {

  await t.test('1. Validasi Environment Staging dan SESSION_TTL_HOURS pada Config', () => {
    assert.equal(CONFIG.NODE_ENV, 'staging', 'NODE_ENV harus staging');
    assert.equal(CONFIG.ALLOWED_ORIGIN, 'https://staging.purwaverse.sekolah.sch.id');
    assert.equal(CONFIG.TRUST_PROXY, '1');
    assert.equal(CONFIG.SESSION_HOURS, 12, 'SESSION_TTL_HOURS 12 harus diterjemahkan menjadi SESSION_HOURS 12');
  });

  await t.test('2. TRUST_PROXY=1 harus menghasilkan trust proxy bernilai angka 1 (bukan boolean true)', () => {
    const trustProxyVal = app.get('trust proxy');
    assert.strictEqual(typeof trustProxyVal, 'number', 'trust proxy harus bertipe number untuk 1 hop Nginx');
    assert.strictEqual(trustProxyVal, 1, 'trust proxy harus bernilai 1');
  });

  await t.test('3. Staging CORS: Origin resmi yang diizinkan harus diterima dan TIDAK menghasilkan wildcard (*)', async () => {
    const res = await request(app)
      .get('/healthz')
      .set('Origin', 'https://staging.purwaverse.sekolah.sch.id')
      .expect(200);

    assert.equal(
      res.headers['access-control-allow-origin'],
      'https://staging.purwaverse.sekolah.sch.id',
      'Origin resmi harus direfleksikan pada header Access-Control-Allow-Origin'
    );
    assert.notEqual(
      res.headers['access-control-allow-origin'],
      '*',
      'CORS staging dilarang menghasilkan wildcard *'
    );
  });

  await t.test('4. Staging CORS: Origin asing / attacker harus ditolak tanpa Access-Control-Allow-Origin', async () => {
    const res = await request(app)
      .get('/healthz')
      .set('Origin', 'https://attacker.evil.com')
      .expect(200);

    assert.strictEqual(
      res.headers['access-control-allow-origin'],
      undefined,
      'Origin asing tidak boleh menerima header Access-Control-Allow-Origin'
    );
    assert.notEqual(
      res.headers['access-control-allow-origin'],
      '*',
      'Origin asing tidak boleh menghasilkan wildcard *'
    );
  });

  await t.test('5. Staging CORS: Preflight OPTIONS untuk origin asing tidak boleh mengizinkan akses', async () => {
    const res = await request(app)
      .options('/api/purwa')
      .set('Origin', 'https://attacker.evil.com');

    assert.strictEqual(
      res.headers['access-control-allow-origin'],
      undefined,
      'Preflight OPTIONS untuk origin asing tidak boleh menerima header allow-origin'
    );
  });

  await t.test('6. Staging CORS: Konfigurasi ALLOWED_ORIGIN kosong harus menolak semua origin lintas domain', async () => {
    const express = require('express');
    const cors = require('cors');

    const testApp = express();
    // Mensimulasikan staging dengan ALLOWED_ORIGIN kosong
    let corsOrigin;
    const allowedOriginConfig = '';
    if (allowedOriginConfig && allowedOriginConfig.trim() !== '') {
      const allowedList = allowedOriginConfig.split(',').map(s => s.trim()).filter(Boolean);
      corsOrigin = (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedList.includes(origin)) return callback(null, true);
        return callback(null, false);
      };
    } else {
      corsOrigin = false;
    }

    testApp.use(cors({ origin: corsOrigin }));
    testApp.get('/test-empty-cors', (req, res) => res.json({ ok: true }));

    const res = await request(testApp)
      .get('/test-empty-cors')
      .set('Origin', 'https://staging.purwaverse.sekolah.sch.id')
      .expect(200);

    assert.strictEqual(
      res.headers['access-control-allow-origin'],
      undefined,
      'ALLOWED_ORIGIN kosong harus menonaktifkan seluruh respons CORS lintas origin'
    );
  });

});

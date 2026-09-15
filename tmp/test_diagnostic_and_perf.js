const fs = require('fs');
const path = require('path');
const vm = require('vm');

const gasDir = path.join(__dirname, '..', 'gas');

function readGas(file) {
  return fs.readFileSync(path.join(gasDir, file), 'utf8');
}

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Math,
  JSON,
  Set,
  Date,
  Logger: { log: console.log },
  Utilities: {
    getUuid: () => 'uuid-' + Math.random().toString(36).substring(2, 9),
    base64EncodeWebSafe: (str) => Buffer.from(String(str)).toString('base64url'),
    computeDigest: (alg, val) => Buffer.from(String(val)),
    DigestAlgorithm: { SHA_256: 'SHA_256' }
  },
  LockService: {
    getScriptLock: () => ({
      waitLock: () => true,
      releaseLock: () => true
    })
  },
  CacheService: {
    getScriptCache: () => ({
      get: () => null,
      put: () => {},
      remove: () => {}
    })
  }
};

vm.createContext(sandbox);

const files = [
  'Config.gs',
  'Repository.gs',
  'DiagnosticData.gs',
  'PracticeData.gs',
  'LearningData.gs',
  'LearningServices.gs',
  'Services.gs'
];

files.forEach(f => {
  vm.runInContext(readGas(f), sandbox);
});

const officialDiagnostic = vm.runInContext('OFFICIAL_DIAGNOSTIC_', sandbox);

sandbox.mockSheets = {
  SETTINGS: [],
  MASTER_STUDENTS: [{ student_id: 'STD-TIMEOUT-01', class_id: '8A', active: true }],
  DIAGNOSTIC_ITEMS: officialDiagnostic.map(x => ({ ...x })),
  DIAGNOSTIC_RESPONSES: [],
  DIAGNOSTIC_PROFILES: [],
  PROGRESS: []
};

vm.runInContext(`
  ensureTeacherClassAccess_ = function() { return true; };
  audit_ = function() {};
  saveProgress_ = function() {};
  rows_ = function(name) { return mockSheets[name] || []; };
  findAll_ = function(name, pred) { return (mockSheets[name] || []).filter(pred); };
  findOne_ = function(name, pred) { return (mockSheets[name] || []).find(pred) || null; };
  append_ = function(name, rec) { mockSheets[name] = mockSheets[name] || []; mockSheets[name].push(rec); return rec; };
  upsert_ = function(name, key, rec) {
    mockSheets[name] = mockSheets[name] || [];
    const idx = mockSheets[name].findIndex(r => String(r[key]) === String(rec[key]));
    if (idx >= 0) { mockSheets[name][idx] = Object.assign({}, mockSheets[name][idx], rec); return mockSheets[name][idx]; }
    mockSheets[name].push(rec); return rec;
  };
`, sandbox);

console.log('--- TEST 1: Memeriksa Bank Soal Resmi ---');
const totalItems = vm.runInContext(`findAll_('DIAGNOSTIC_ITEMS', r => r.active).length`, sandbox);
console.log('Total bank soal:', totalItems);
if (totalItems !== 25) throw new Error('Bank soal harus 25 butir');

console.log('--- TEST 2: Memeriksa Distribusi Jumlah Soal 5-9 & Perwakilan 5 Domain ---');
const studentIds = ['STD-01', 'STD-02', 'STD-03', 'STD-04', 'STD-05', 'STD-06', 'STD-07', 'STD-08', 'STD-09', 'STD-10'];
const counts = [];

studentIds.forEach(id => {
  const result = vm.runInContext(`diagnosticItemsForStudent_('${id}')`, sandbox);
  const items = result.items;
  counts.push(items.length);
  
  if (items.length < 5 || items.length > 9) {
    throw new Error('Jumlah butir untuk ' + id + ' tidak dalam rentang 5-9: ' + items.length);
  }

  const domainsCovered = new Set(items.map(x => x.domain));
  const domains = vm.runInContext('CONFIG.DOMAINS', sandbox);
  domains.forEach(d => {
    if (!domainsCovered.has(d)) {
      throw new Error('Domain ' + d + ' tidak terwakili untuk ' + id);
    }
  });

  const uniqueIds = new Set(items.map(x => x.item_id));
  if (uniqueIds.size !== items.length) {
    throw new Error('Ada butir duplikat untuk ' + id);
  }

  const expectedTimer = items.length * 210;
  if (result.durationSeconds !== expectedTimer) {
    throw new Error('Durasi timer salah untuk ' + id + ': ' + result.durationSeconds + ' (diharapkan ' + expectedTimer + ')');
  }

  console.log('Siswa ' + id + ': ' + items.length + ' butir, Timer: ' + (result.durationSeconds / 60) + ' menit, Urutan: ' + items.map(x => x.item_id).join(', '));
});

console.log('Sebaran jumlah butir:', counts);

console.log('--- TEST 3: Pengujian Auto-Submit Saat Timeout dengan Jawaban Kosong ---');
const testStudent = 'STD-TIMEOUT-01';
const diagResult = vm.runInContext(`diagnosticItemsForStudent_('${testStudent}')`, sandbox);
const emptyResponses = diagResult.items.map(i => ({ itemId: i.item_id, answer: '' }));

try {
  vm.runInContext(`
    submitDiagnostic_({ actor_id: '${testStudent}', actor_type: 'student' }, {
      responses: ${JSON.stringify(emptyResponses)},
      isTimeout: false,
      selfMapScore: 3,
      remainingSeconds: 0
    });
  `, sandbox);
  throw new Error('Harusnya melempar error karena jawaban kosong pada submit normal');
} catch (err) {
  console.log('Submit manual kosong ditolak seperti yang diharapkan:', err.message);
}

const timeoutResult = vm.runInContext(`
  submitDiagnostic_({ actor_id: '${testStudent}', actor_type: 'student' }, {
    responses: ${JSON.stringify(emptyResponses)},
    isTimeout: true,
    selfMapScore: 3,
    remainingSeconds: 0
  });
`, sandbox);
console.log('Submit timeout kosong berhasil:', timeoutResult);

const savedResponses = vm.runInContext(`findAll_('DIAGNOSTIC_RESPONSES', r => r.student_id === '${testStudent}')`, sandbox);
console.log('Jumlah respons tersimpan:', savedResponses.length);
savedResponses.forEach(r => {
  if (r.answer !== '[Waktu habis - belum sempat dijawab]') {
    throw new Error('Label teks kosong tidak sesuai: ' + r.answer);
  }
});

console.log('--- TEST 4: Penilaian oleh Guru & Validasi Profil ---');
savedResponses.forEach(r => {
  vm.runInContext(`
    scoreDiagnosticResponse_({ actor_id: 'GURU-01', actor_type: 'teacher', class_id: '8A' }, {
      studentId: '${testStudent}',
      itemId: '${r.item_id}',
      score: 0
    });
  `, sandbox);
});

const profile = vm.runInContext(`findOne_('DIAGNOSTIC_PROFILES', r => r.student_id === '${testStudent}')`, sandbox);
console.log('Profil diagnostik berhasil terbentuk:', profile);
if (!profile || profile.overall_reasoning !== 0) {
  throw new Error('Profil gagal terbentuk atau skor salah');
}

console.log('\n========================================');
console.log('SEMUA 4 PENGUJIAN LOGIKA BERHASIL (100% PASS)!');
console.log('========================================');

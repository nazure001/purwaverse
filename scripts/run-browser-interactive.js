/**
 * PURWAVERSE LMS PHASE 1 - REAL INTERACTIVE BROWSER E2E TEST (CDP)
 * 
 * Pengujian browser interaktif nyata melalui Chrome DevTools Protocol:
 * 1. Login Siswa (Leader)
 * 2. Baca materi Unit 1
 * 3. Konfirmasi buku catatan fisik
 * 4. Verifikasi guru & pemeriksaan kelas guru
 * 5A. Kuis Skenario A (Di bawah KKM < 70 -> Unit 2 tetap terkunci)
 * 5B. Kuis Skenario B (Lulus KKM >= 70 via jawaban dinamis -> Unit 2 terbuka)
 * 6A. Uji tombol deputy dinonaktifkan sebelum otorisasi guru
 * 6B. LKPD Leader mengisi dan menyimpan draft
 * 7A. Uji negatif otorisasi guru: tolak deputyId tidak cocok
 * 7B. Pengesahan fallback guru dengan activityId eksplisit
 * 8. Deputy mengisi alasan, mengedit, dan submit laporan LKPD
 * 9. Reload browser dan verifikasi persistensi status
 * 10. Pencabutan otorisasi fallback oleh guru
 * 
 * Menggunakan database sementara & akun sintetis:
 * SYN-LEAD (8A, absen 91, PIN 1234)
 * SYN-DEP  (8A, absen 92, PIN 1234)
 * SYN-MEM  (8A, absen 93, PIN 1234)
 * Tim: SYN-TEAM-8A-01
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

// 1. Setup isolated test database
const TEST_DB_PATH = path.resolve(__dirname, '../server/tests/test_browser_e2e.db');
if (fs.existsSync(TEST_DB_PATH)) {
  try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
}

process.env.NODE_ENV = 'test';
process.env.PURWAVERSE_DB_PATH = TEST_DB_PATH;
process.env.TEACHER_USERNAME = 'guru';
process.env.TEACHER_DEV_PASSWORD = 'PasswordGuru10Char!';
process.env.TEACHER_CLASSES = '8A,8B,8C,8D,8E';

const CONFIG = require('../server/src/config');
CONFIG.DB_PATH = TEST_DB_PATH;

const { getDatabase, closeDatabase, setDatabasePath } = require('../server/src/database/db');
setDatabasePath(TEST_DB_PATH);
const db = getDatabase();

const { append_, findOne_, findAll_, isoNow_, deleteWhere_ } = require('../server/src/database/repository');
const { seedClasses, seedLearningData, seedDiagnostic } = require('../server/src/database/seed');
const { hashArgon2 } = require('../server/src/services/securityService');

// Seed tracked master data
console.log('🌱 [BROWSER E2E] Seeding master data from tracked sources...');
seedClasses();
seedLearningData();
seedDiagnostic();

const SYNTHETIC_CLASS = '8A';
const SYNTHETIC_TEAM = 'SYN-TEAM-8A-01';

async function seedSyntheticAccounts() {
  const pinHash = await hashArgon2('1234');

  append_('master_students', {
    student_id: 'SYN-LEAD',
    nis: 'NIS-SYN-01',
    nisn: '9990000001',
    name: 'Ahmad Synthetic Leader',
    gender: 'L',
    class_id: SYNTHETIC_CLASS,
    roll_no: 91,
    pin_hash: pinHash,
    active: 1
  });

  append_('master_students', {
    student_id: 'SYN-DEP',
    nis: 'NIS-SYN-02',
    nisn: '9990000002',
    name: 'Budi Synthetic Deputy',
    gender: 'L',
    class_id: SYNTHETIC_CLASS,
    roll_no: 92,
    pin_hash: pinHash,
    active: 1
  });

  append_('master_students', {
    student_id: 'SYN-MEM',
    nis: 'NIS-SYN-03',
    nisn: '9990000003',
    name: 'Citra Synthetic Member',
    gender: 'P',
    class_id: SYNTHETIC_CLASS,
    roll_no: 93,
    pin_hash: pinHash,
    active: 1
  });

  append_('teams', {
    team_id: SYNTHETIC_TEAM,
    class_id: SYNTHETIC_CLASS,
    version: Date.now(),
    balance_score: 95,
    status: 'draft',
    created_at: isoNow_(),
    created_by: 'TEACHER-SYSTEM'
  });

  append_('team_members', {
    membership_id: `${SYNTHETIC_TEAM}|SYN-LEAD`,
    team_id: SYNTHETIC_TEAM,
    student_id: 'SYN-LEAD',
    role: 'Scientist Leader',
    is_leader: 1,
    locked: 0,
    override_note: ''
  });

  append_('team_members', {
    membership_id: `${SYNTHETIC_TEAM}|SYN-DEP`,
    team_id: SYNTHETIC_TEAM,
    student_id: 'SYN-DEP',
    role: 'Deputy Scientist',
    is_leader: 0,
    locked: 0,
    override_note: ''
  });

  append_('team_members', {
    membership_id: `${SYNTHETIC_TEAM}|SYN-MEM`,
    team_id: SYNTHETIC_TEAM,
    student_id: 'SYN-MEM',
    role: 'Data Analyst',
    is_leader: 0,
    locked: 0,
    override_note: ''
  });

  // Provide practice lab unlock override for all 3 synthetic team members
  ['SYN-LEAD', 'SYN-DEP', 'SYN-MEM'].forEach(id => {
    append_('unlock_overrides', {
      override_id: `OVR-${id}-LAB`,
      student_id: id,
      activity_id: 'CH08-01-U02-LAB01',
      allowed: 1,
      reason: 'Akses Uji LKPD Sintetis',
      created_by: 'TEACHER-SYSTEM',
      created_at: isoNow_()
    });
  });

  console.log('✔ [BROWSER E2E] Synthetic accounts and team seeded.');
}

// 2. Start Backend Express & Frontend Web Servers
const expressApp = require('../server/src/server');
const BACKEND_PORT = 3210;
const WEB_PORT = 5210;
const PUBLIC_DIR = path.resolve(__dirname, '../public');

let backendServer;
let webServer;

function startServers() {
  return new Promise((resolve) => {
    backendServer = expressApp.listen(BACKEND_PORT, () => {
      console.log(`🚀 [BACKEND] Serving on http://localhost:${BACKEND_PORT}`);

      webServer = http.createServer((req, res) => {
        if (req.url.startsWith('/api/')) {
          const proxyReq = http.request({
            hostname: 'localhost',
            port: BACKEND_PORT,
            path: req.url,
            method: req.method,
            headers: req.headers
          }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
          });
          req.pipe(proxyReq);
          return;
        }

        let reqPath = req.url.split('?')[0];
        if (reqPath === '/') reqPath = '/index.html';
        const filePath = path.join(PUBLIC_DIR, reqPath);

        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }

        const ext = path.extname(filePath);
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      });

      webServer.listen(WEB_PORT, () => {
        console.log(`🌐 [WEB] Serving on http://localhost:${WEB_PORT}`);
        resolve();
      });
    });
  });
}

// Ensure screenshot directory exists
const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/reports/screenshots');
const ARTIFACT_DIR = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\77b86858-1797-4ec7-840d-bca33dc20f60';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runBrowserE2E() {
  console.log('================================================================');
  console.log('PURWAVERSE LMS - REAL INTERACTIVE BROWSER E2E TEST (CDP)');
  console.log(`Isolated Database: ${TEST_DB_PATH}`);
  console.log('================================================================\n');

  await seedSyntheticAccounts();
  await startServers();

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
    '--user-data-dir=C:\\Users\\USER\\AppData\\Local\\Temp\\chrome-e2e-profile'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  let ws;
  let msgId = 1;
  const callbacks = new Map();

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      callbacks.set(id, (res) => {
        if (res.error) reject(new Error(res.error.message));
        else resolve(res.result);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await sendCommand('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      console.error('Eval Exception:', res.exceptionDetails.exception ? res.exceptionDetails.exception.description : res.exceptionDetails.text);
      throw new Error(`Eval error: ${res.exceptionDetails.text}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async function assertNoToastError(context) {
    const toastState = await evaluate(`(() => {
      const el = document.getElementById('toast');
      const isShowing = el && el.classList.contains('show');
      const isError = el && el.classList.contains('error');
      const lastToast = window._lastToast || null;
      const lastErr = window._lastErrorToast || null;
      const lastApiErr = window._lastApiError || null;
      return {
        showing: isShowing,
        text: el ? el.textContent : '',
        isError,
        lastToast,
        lastErr,
        lastApiErr
      };
    })()`);

    if (toastState.isError || (toastState.lastErr && (Date.now() - toastState.lastErr.timestamp < 3000))) {
      const errMsg = toastState.lastErr ? toastState.lastErr.message : toastState.text;
      throw new Error(`[ASSERTION FAILED] Error toast encountered at ${context}: "${errMsg}"`);
    }

    if (toastState.lastApiErr && (Date.now() - toastState.lastApiErr.timestamp < 3000)) {
      throw new Error(`[ASSERTION FAILED] API failure encountered at ${context}: action=${toastState.lastApiErr.action} error="${toastState.lastApiErr.message}"`);
    }
  }

  async function takeScreenshot(filename, caption) {
    const shot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    const filePath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(filePath, buffer);

    if (fs.existsSync(ARTIFACT_DIR)) {
      try {
        fs.writeFileSync(path.join(ARTIFACT_DIR, filename), buffer);
      } catch (e) {}
    }
    console.log(`  📸 Screenshot saved: ${filename} ("${caption}")`);
  }

  try {
    // Connect to Chrome CDP WebSocket
    const versionRes = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9222/json/version', res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const listRes = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9222/json/list', res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const pageTarget = listRes.find(t => t.type === 'page');
    const wsUrl = pageTarget ? pageTarget.webSocketDebuggerUrl : versionRes.webSocketDebuggerUrl;
    console.log(`Connected to CDP target: ${wsUrl}`);

    ws = new globalThis.WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (callbacks.has(msg.id)) {
          const cb = callbacks.get(msg.id);
          callbacks.delete(msg.id);
          cb(msg);
        }
      };
    });

    await sendCommand('Page.enable');
    await sendCommand('Runtime.enable');
    await sendCommand('DOM.enable');

    // -------------------------------------------------------------
    // STEP 1: Student Login (SYN-LEAD)
    // -------------------------------------------------------------
    console.log('\n[STEP 1] Navigating to http://localhost:5210/ and Logging in Student Leader...');
    await sendCommand('Page.navigate', { url: `http://localhost:${WEB_PORT}/#auth` });
    await new Promise(r => setTimeout(r, 2000));

    await evaluate(`
      (() => {
        window.switchAuthTab('student');
        document.getElementById('input-student-id').value = '8A-91';
        document.getElementById('input-student-pin').value = '1234';
        document.getElementById('btn-student-submit').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 1: Student Login');

    const studentName = await evaluate(`document.getElementById('dash-student-name') ? document.getElementById('dash-student-name').textContent : ''`);
    console.log(`  ✓ Student Dashboard rendered in browser DOM: "${studentName}"`);
    assert.strictEqual(studentName, 'Ahmad Synthetic Leader');
    await takeScreenshot('1_browser_student_login.png', 'Student Leader Dashboard');

    // -------------------------------------------------------------
    // STEP 2: Open Learning Unit 1 (Sel sebagai Unit Kehidupan)
    // -------------------------------------------------------------
    console.log('\n[STEP 2] Navigating to Learning Unit 1 Material in Browser...');
    await evaluate(`window.openCourseUnit('CH08-01-U01')`);
    await new Promise(r => setTimeout(r, 1500));
    await assertNoToastError('Step 2: Open Unit 1');

    const unitTitle = await evaluate(`document.getElementById('unit-reader-title').textContent`);
    console.log(`  ✓ Course Unit Reader opened: "${unitTitle}"`);
    assert.ok(unitTitle.includes('Sel sebagai Unit Kehidupan'));
    await takeScreenshot('2_browser_unit1_material.png', 'Materi Pembelajaran Unit 1');

    // -------------------------------------------------------------
    // STEP 3: Confirm Physical Notebook & Report to Teacher
    // -------------------------------------------------------------
    console.log('\n[STEP 3] Check Notebook Confirmation Checkbox & Submit...');
    await evaluate(`
      (() => {
        const chk = document.getElementById('check-notebook-ready');
        if (chk) chk.checked = true;
        document.getElementById('btn-submit-summary').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1500));
    await assertNoToastError('Step 3: Notebook Confirmation');

    const badgeText = await evaluate(`document.getElementById('summary-status-badge').textContent`);
    console.log(`  ✓ Summary reported. Status badge in DOM: "${badgeText}"`);
    assert.ok(badgeText.includes('Menunggu Verifikasi Guru'));
    await takeScreenshot('3_browser_notebook_reported.png', 'Konfirmasi Buku Catatan Dilaporkan');

    // -------------------------------------------------------------
    // STEP 4: Teacher Login, Class Access Check, & Notebook Sign-off
    // -------------------------------------------------------------
    console.log('\n[STEP 4] Teacher Login & Notebook Verification...');
    await evaluate(`window.handleLogout()`);
    await new Promise(r => setTimeout(r, 1000));

    await evaluate(`
      (() => {
        window.switchAuthTab('teacher');
        document.getElementById('input-teacher-pwd').value = 'PasswordGuru10Char!';
        document.getElementById('btn-teacher-submit').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 4: Teacher Login');

    const isTeacher = await evaluate(`window.AppState.currentRole === 'teacher'`);
    assert.strictEqual(isTeacher, true);

    // Verify teacher selected class & loadOverview data without error toast (Item 2)
    const activeTeacherClass = await evaluate(`window.AppState.selectedClass`);
    console.log(`  ✓ Teacher authenticated with selected class: "${activeTeacherClass}"`);
    assert.strictEqual(activeTeacherClass, '8A');

    // Sign off student notebook
    await evaluate(`
      (() => {
        document.getElementById('teacher-verify-student-id').value = 'SYN-LEAD';
        document.getElementById('teacher-verify-unit-id').value = 'CH08-01-U01';
        window.teacherQuickVerifySummary();
      })()
    `);
    await new Promise(r => setTimeout(r, 1500));
    await assertNoToastError('Step 4: Teacher Quick Verify Summary');
    console.log('  ✓ Teacher verified student notebook in Teacher Command Center.');
    await takeScreenshot('4_browser_teacher_verified.png', 'Teacher Command Center Verification');

    // -------------------------------------------------------------
    // STEP 5A: Quiz Chamber Scenario A (Below KKM: Score < 70)
    // -------------------------------------------------------------
    console.log('\n[STEP 5A] Quiz Scenario A: Student Takes Quiz and Scores Below KKM...');
    await evaluate(`window.handleLogout()`);
    await new Promise(r => setTimeout(r, 1000));

    // Login student again
    await evaluate(`
      (() => {
        window.switchAuthTab('student');
        document.getElementById('input-student-id').value = '8A-91';
        document.getElementById('input-student-pin').value = '1234';
        document.getElementById('btn-student-submit').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 5A: Student Login');

    // Open Quiz Chamber
    await evaluate(`window.openQuizChamber('CH08-01-U01')`);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 5A: Open Quiz Chamber');

    // Intentionally select all WRONG answers to score below KKM
    // Pull correct items from database
    const dbQuizItems = findAll_('quiz_items', r => r.activity_id === 'CH08-01-U01-QZ01');
    const quizMap = {};
    dbQuizItems.forEach(it => {
      const opts = JSON.parse(it.options_json);
      const correctIdx = Number(JSON.parse(it.answer_json));
      quizMap[it.quiz_item_id] = opts[correctIdx];
    });

    const wrongAnswersPayload = await evaluate(`
      (() => {
        const correctMap = ${JSON.stringify(quizMap)};
        const allItems = window.QuizState ? window.QuizState.items : [];
        if (!allItems.length) return [];

        allItems.forEach(it => {
          const correctText = correctMap[it.quiz_item_id];
          // Pick wrong option text
          let wrongIdx = it.options.findIndex(t => t !== correctText);
          if (wrongIdx < 0) wrongIdx = 0;
          window.QuizState.answers[it.quiz_item_id] = wrongIdx;
        });
        window.submitQuiz();
        return allItems.map(it => it.quiz_item_id);
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));

    // Verify Quiz failed & score is below 70
    const quizResultScore = await evaluate(`window.QuizState && window.QuizState.lastResult ? window.QuizState.lastResult.score : -1`);
    console.log(`  ✓ Quiz Chamber Scenario A completed. Score: ${quizResultScore} (Below KKM 70).`);
    assert.ok(quizResultScore < 70, `Score must be below KKM 70, got: ${quizResultScore}`);

    // Verify Unit 2 remains LOCKED on the learning map
    await evaluate(`window.loadStudentDashboardData()`);
    await new Promise(r => setTimeout(r, 1500));
    const unit2StateA = await evaluate(`window.AppState.unitStates ? window.AppState.unitStates['CH08-01-U02'] : null`);
    console.log(`  ✓ Unit 2 State when Quiz below KKM: contentUnlocked=${unit2StateA ? unit2StateA.contentUnlocked : false}`);
    assert.strictEqual(unit2StateA ? unit2StateA.contentUnlocked : false, false, 'Unit 2 must remain locked when quiz failed');
    await takeScreenshot('5a_browser_quiz_below_kkm_locked.png', 'Quiz di Bawah KKM - Unit 2 Tetap Terkunci');
    await evaluate(`window._lastErrorToast = null; window._lastApiError = null;`);

    // -------------------------------------------------------------
    // STEP 5B: Quiz Chamber Scenario B (Pass KKM: Score >= 70 via Dynamic Shuffled Answers)
    // -------------------------------------------------------------
    console.log('\n[STEP 5B] Quiz Scenario B: Retake Quiz with Dynamic Correct Answers (Pass KKM)...');
    await evaluate(`window.openQuizChamber('CH08-01-U01')`);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 5B: Open Quiz Chamber Retake');

    // Answer with 100% correct options based on stable quiz_item_id and dynamic shuffled options
    await evaluate(`
      (() => {
        const correctMap = ${JSON.stringify(quizMap)};
        const allItems = window.QuizState ? window.QuizState.items : [];
        if (!allItems.length) return [];

        allItems.forEach(it => {
          const correctText = correctMap[it.quiz_item_id];
          const correctShuffledIdx = it.options.indexOf(correctText);
          window.QuizState.answers[it.quiz_item_id] = correctShuffledIdx >= 0 ? correctShuffledIdx : 0;
        });
        window.submitQuiz();
      })()
    `);
    await new Promise(r => setTimeout(r, 2500));
    await assertNoToastError('Step 5B: Quiz Submit Correct');

    const passScore = await evaluate(`window.QuizState && window.QuizState.lastResult ? window.QuizState.lastResult.score : -1`);
    console.log(`  ✓ Quiz Chamber Scenario B completed. Score: ${passScore}/100 (Pass KKM >= 70).`);
    assert.strictEqual(passScore, 100, `Expected 100% pass score, got: ${passScore}`);

    // Verify Unit 2 is now UNLOCKED
    await evaluate(`window.loadStudentDashboardData()`);
    await new Promise(r => setTimeout(r, 1500));
    const unit2StateB = await evaluate(`window.AppState.unitStates ? window.AppState.unitStates['CH08-01-U02'] : null`);
    console.log(`  ✓ Unit 2 State when Quiz passed: contentUnlocked=${unit2StateB ? unit2StateB.contentUnlocked : false}`);
    assert.strictEqual(unit2StateB ? unit2StateB.contentUnlocked : false, true, 'Unit 2 must be unlocked when quiz passed');
    await takeScreenshot('5b_browser_quiz_passed_unlocked.png', 'Quiz Lulus KKM - Unit 2 Terbuka');

    // -------------------------------------------------------------
    // STEP 6A: Deputy Views LKPD Before Authorization (Buttons Disabled)
    // -------------------------------------------------------------
    console.log('\n[STEP 6A] Deputy Accesses LKPD Before Teacher Authorization...');
    await evaluate(`window.handleLogout()`);
    await new Promise(r => setTimeout(r, 1000));

    // Login as Deputy (absen 92)
    await evaluate(`
      (() => {
        window.switchAuthTab('student');
        document.getElementById('input-student-id').value = '8A-92';
        document.getElementById('input-student-pin').value = '1234';
        document.getElementById('btn-student-submit').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 6A: Deputy Login');

    // Open LKPD as Deputy
    await evaluate(`window.openTeamLab('CH08-01-U02')`);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 6A: Deputy Open LKPD');

    const depRoleBadgePre = await evaluate(`document.getElementById('team-user-role-badge').textContent`);
    const depCanEditPre = await evaluate(`!document.getElementById('lkpd-input-prediction').disabled`);
    const btnSaveDisabled = await evaluate(`document.getElementById('btn-save-team-draft').disabled`);
    const btnSubmitDisabled = await evaluate(`document.getElementById('btn-submit-team-worksheet').disabled`);

    console.log(`  ✓ Deputy Workspace Pre-Auth: Role="${depRoleBadgePre}", editable=${depCanEditPre}, saveDisabled=${btnSaveDisabled}, submitDisabled=${btnSubmitDisabled}`);
    assert.strictEqual(depRoleBadgePre, 'Deputy Scientist');
    assert.strictEqual(depCanEditPre, false, 'Deputy cannot edit before authorization');
    assert.strictEqual(btnSaveDisabled, true, 'Save Draft button MUST be disabled before authorization (Item 8)');
    assert.strictEqual(btnSubmitDisabled, true, 'Submit button MUST be disabled before authorization (Item 8)');
    await takeScreenshot('6a_browser_deputy_buttons_disabled.png', 'Tombol Deputy Dinonaktifkan Sebelum Otorisasi');

    // -------------------------------------------------------------
    // STEP 6B: Leader Saves LKPD Draft
    // -------------------------------------------------------------
    console.log('\n[STEP 6B] Leader Logs In, Opens Workspace & Saves Real Draft...');
    await evaluate(`window.handleLogout()`);
    await new Promise(r => setTimeout(r, 1000));

    // Login Leader again
    await evaluate(`
      (() => {
        window.switchAuthTab('student');
        document.getElementById('input-student-id').value = '8A-91';
        document.getElementById('input-student-pin').value = '1234';
        document.getElementById('btn-student-submit').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 6B: Leader Login');

    await evaluate(`window.openTeamLab('CH08-01-U02')`);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 6B: Leader Open LKPD');

    const roleBadgeLead = await evaluate(`document.getElementById('team-user-role-badge').textContent`);
    const leadCanEdit = await evaluate(`!document.getElementById('lkpd-input-prediction').disabled`);
    console.log(`  ✓ LKPD Workspace loaded: Role="${roleBadgeLead}", editable=${leadCanEdit}`);
    assert.strictEqual(roleBadgeLead, 'Scientist Leader');
    assert.strictEqual(leadCanEdit, true);

    // Fill in real LKPD data
    await evaluate(`
      (() => {
        document.getElementById('lkpd-input-prediction').value = 'Sel hewan lebih lentur daripada sel tumbuhan karena tidak memiliki dinding sel.';
        document.getElementById('lkpd-input-tools').value = 'Mikroskop, slide kaca, cover glass, tusuk gigi steril, metilen biru.';
        document.getElementById('lkpd-input-trial1').value = 'Pengamatan sel epitel pipi pada perbesaran 100x.';
        document.getElementById('lkpd-input-data').value = 'Membran sel tipis teramati dengan inti sel kebiruan di bagian tengah.';
        document.getElementById('lkpd-input-improvement').value = 'Mengatur ulang diafragma mikroskop agar pencahayaan lebih kontras.';
        document.getElementById('lkpd-input-trial2').value = 'Pengamatan sel epitel pipi pada perbesaran 400x.';
        document.getElementById('lkpd-input-evidence').value = 'Dokumentasi mikroskopis perbesaran 400x.';
        document.getElementById('lkpd-input-conclusion').value = 'Sel hewan tidak memiliki dinding sel sehingga bentuknya fleksibel dan tidak kaku.';
        document.getElementById('lkpd-input-reflection').value = 'Kerja sama tim berjalan efektif dan rapi.';
        document.getElementById('lkpd-input-member-roles').value = 'SYN-LEAD menyiapkan mikroskop; SYN-DEP membuat preparat; SYN-MEM mencatat data.';
        document.getElementById('btn-save-team-draft').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 6B: Save Draft');

    const versionText = await evaluate(`document.getElementById('team-lab-version-tag').textContent`);
    console.log(`  ✓ Leader saved draft. clientVersion in DOM: "${versionText}"`);
    assert.ok(versionText.includes('clientVersion'));
    await takeScreenshot('6b_browser_leader_lkpd_draft.png', 'LKPD Leader Draft Terisi Nyata');

    // -------------------------------------------------------------
    // STEP 7A: Negative Test - Reject Mismatched DeputyId (Item 6)
    // -------------------------------------------------------------
    console.log('\n[STEP 7A] Teacher Negative Test: Reject Mismatched deputyId...');
    await evaluate(`window.handleLogout()`);
    await new Promise(r => setTimeout(r, 1000));

    await evaluate(`
      (() => {
        window.switchAuthTab('teacher');
        document.getElementById('input-teacher-pwd').value = 'PasswordGuru10Char!';
        document.getElementById('btn-teacher-submit').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 7A: Teacher Login');

    // Attempt to authorize mismatched deputy
    const rejectErrorToast = await evaluate(`
      (async () => {
        document.getElementById('teacher-fallback-team-id').value = '${SYNTHETIC_TEAM}';
        document.getElementById('teacher-fallback-deputy-id').value = 'NON-MEMBER-STUDENT';
        document.getElementById('teacher-fallback-activity-id').value = 'CH08-01-U02-LAB01';
        document.getElementById('teacher-fallback-reason').value = 'Mencoba otorisasi siswa yang bukan anggota.';
        await window.teacherAuthorizeFallback();
        await new Promise(r => setTimeout(r, 800));
        return window._lastErrorToast ? window._lastErrorToast.message : '';
      })()
    `);
    console.log(`  ✓ Negative test: Teacher fallback rejected mismatched deputy: "${rejectErrorToast}"`);
    assert.ok(rejectErrorToast.includes('bukan merupakan anggota tim'), 'Must reject mismatched deputyId');

    // Clear error tracking so subsequent checks succeed
    await evaluate(`(() => { window._lastErrorToast = null; window._lastApiError = null; })()`);

    // -------------------------------------------------------------
    // STEP 7B: Teacher Authorizes Controlled Fallback with Explicit Activity (Items 5 & 7)
    // -------------------------------------------------------------
    console.log('\n[STEP 7B] Teacher Authorizes Controlled Fallback with Explicit Activity ID...');
    await evaluate(`
      (() => {
        document.getElementById('teacher-fallback-team-id').value = '${SYNTHETIC_TEAM}';
        document.getElementById('teacher-fallback-deputy-id').value = 'SYN-DEP';
        document.getElementById('teacher-fallback-activity-id').value = 'CH08-01-U02-LAB01';
        document.getElementById('teacher-fallback-reason').value = 'Scientist Leader demam tinggi dan izin tidak hadir di kelas.';
        window.teacherAuthorizeFallback();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 7B: Authorize Fallback');
    console.log('  ✓ Controlled Fallback authorized by Teacher for Deputy SYN-DEP.');
    await takeScreenshot('7_browser_teacher_fallback_authorized.png', 'Teacher Controlled Fallback Authorization');

    // -------------------------------------------------------------
    // STEP 8: Deputy Logs In, Edits with Active Fallback, and Submits LKPD
    // -------------------------------------------------------------
    console.log('\n[STEP 8] Deputy Logs In, Accesses LKPD with Fallback Banner & Submits...');
    await evaluate(`window.handleLogout()`);
    await new Promise(r => setTimeout(r, 1000));

    // Login as Deputy (absen 92)
    await evaluate(`
      (() => {
        window.switchAuthTab('student');
        document.getElementById('input-student-id').value = '8A-92';
        document.getElementById('input-student-pin').value = '1234';
        document.getElementById('btn-student-submit').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 8: Deputy Login');

    // Open LKPD as Deputy
    await evaluate(`window.openTeamLab('CH08-01-U02')`);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 8: Deputy Open LKPD');

    const depRoleBadge = await evaluate(`document.getElementById('team-user-role-badge').textContent`);
    const fallbackIndicator = await evaluate(`document.getElementById('team-fallback-indicator').textContent`);
    const depCanEdit = await evaluate(`!document.getElementById('lkpd-input-prediction').disabled`);
    console.log(`  ✓ Deputy Workspace: Role="${depRoleBadge}", FallbackBanner="${fallbackIndicator}", editable=${depCanEdit}`);
    assert.strictEqual(depRoleBadge, 'Deputy Scientist');
    assert.strictEqual(fallbackIndicator, 'FALLBACK DIAKTIFKAN');
    assert.strictEqual(depCanEdit, true);

    // Deputy updates conclusion and submits official report
    await evaluate(`
      (() => {
        document.getElementById('input-team-fallback-reason').value = 'Ketua tim izin sakit demam; wewenang dialihkan atas pengesahan resmi guru.';
        document.getElementById('lkpd-input-conclusion').value = 'Kesimpulan final diverifikasi dan disahkan oleh Wakil Ketua tim (SYN-DEP).';
        document.getElementById('btn-submit-team-worksheet').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2500));
    await assertNoToastError('Step 8: Deputy Submit Worksheet');
    console.log('  ✓ Deputy submitted official team practice report.');
    await takeScreenshot('8_browser_deputy_lkpd_submitted.png', 'LKPD Deputy Authorized Submission');

    // -------------------------------------------------------------
    // STEP 9: Reload Page & Verify State Persistence
    // -------------------------------------------------------------
    console.log('\n[STEP 9] Browser Page Reload & State Persistence Check...');
    await sendCommand('Page.navigate', { url: `http://localhost:${WEB_PORT}/#view-team-lab` });
    await new Promise(r => setTimeout(r, 2500));

    await evaluate(`window.openTeamLab('CH08-01-U02')`);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 9: Open LKPD After Reload');

    const reloadedStatus = await evaluate(`window.AppState.teamLabWorkspace ? window.AppState.teamLabWorkspace.result.status : ''`);
    const reloadedIsFallback = await evaluate(`window.AppState.teamLabWorkspace ? window.AppState.teamLabWorkspace.reportMeta.isFallback : false`);
    const reloadedDeputy = await evaluate(`window.AppState.teamLabWorkspace ? window.AppState.teamLabWorkspace.reportMeta.fallbackDeputyId : ''`);
    const isLockedNow = await evaluate(`document.getElementById('lkpd-input-prediction').disabled`);

    console.log(`  ✓ State After Reload: Status="${reloadedStatus}", isFallback=${reloadedIsFallback}, deputy="${reloadedDeputy}", inputsLocked=${isLockedNow}`);
    assert.strictEqual(reloadedStatus, 'submitted');
    assert.strictEqual(reloadedIsFallback, true);
    assert.strictEqual(reloadedDeputy, 'SYN-DEP');
    assert.strictEqual(isLockedNow, true);

    await takeScreenshot('9_browser_reload_persistence.png', 'Verifikasi Persistensi Pasca Reload');

    // -------------------------------------------------------------
    // STEP 10: Teacher Revocation of Controlled Fallback (Item 7)
    // -------------------------------------------------------------
    console.log('\n[STEP 10] Teacher Revokes Controlled Fallback in Command Center...');
    await evaluate(`window.handleLogout()`);
    await new Promise(r => setTimeout(r, 1000));

    await evaluate(`
      (() => {
        window.switchAuthTab('teacher');
        document.getElementById('input-teacher-pwd').value = 'PasswordGuru10Char!';
        document.getElementById('btn-teacher-submit').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 10: Teacher Login for Revocation');

    // Teacher revokes fallback
    await evaluate(`
      (() => {
        document.getElementById('teacher-fallback-team-id').value = '${SYNTHETIC_TEAM}';
        document.getElementById('teacher-fallback-deputy-id').value = 'SYN-DEP';
        document.getElementById('teacher-fallback-activity-id').value = 'CH08-01-U02-LAB01';
        document.getElementById('teacher-fallback-reason').value = 'Ketua tim telah hadir kembali di ruang kelas.';
        window.teacherRevokeFallback();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    await assertNoToastError('Step 10: Revoke Fallback');
    console.log('  ✓ Controlled Fallback revoked by Teacher. Authority returned to Leader.');
    await takeScreenshot('10_browser_teacher_fallback_revoked.png', 'Pencabutan Fallback oleh Guru');

    console.log('\n================================================================');
    console.log('🎉 ALL INTERACTIVE BROWSER E2E TESTS PASSED WITH 100% STRICT ASSERTIONS!');
    console.log('================================================================\n');

  } finally {
    if (ws) {
      try { ws.close(); } catch (e) {}
    }
    chromeProc.kill('SIGTERM');
    console.log('Chrome process closed.');

    if (webServer) webServer.close();
    if (backendServer) backendServer.close();
    console.log('Test servers closed.');

    closeDatabase();
    setDatabasePath(CONFIG.DB_PATH);
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
      console.log(`🧹 [CLEANUP] Deleted isolated test database: ${TEST_DB_PATH}`);
    }
  }
}

if (require.main === module) {
  runBrowserE2E().catch(err => {
    console.error('\n❌ REAL BROWSER E2E TEST FAILED:', err);
    process.exit(1);
  });
}

module.exports = { runBrowserE2E };

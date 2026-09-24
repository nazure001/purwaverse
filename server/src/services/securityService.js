const argon2 = require('argon2');
const crypto = require('crypto');
const CONFIG = require('../config');
const {
  findOne_,
  findAll_,
  append_,
  upsert_,
  deleteWhere_,
  audit_,
  hash_,
  isoNow_,
  uid_
} = require('../database/repository');

const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: process.env.NODE_ENV === 'test' ? 4096 : (process.env.ARGON2_MEMORY_COST ? parseInt(process.env.ARGON2_MEMORY_COST, 10) : 16384),
  timeCost: 2,
  parallelism: 1
};

async function hashArgon2(value) {
  return argon2.hash(String(value), ARGON2_CONFIG);
}

// Cache in-memory untuk throttling / rate limiting login
const loginFailures = new Map();

/**
 * Membersihkan catatan kegagalan login yang sudah kadaluwarsa (> 300s)
 */
function cleanExpiredThrottle() {
  const now = Date.now();
  for (const [key, record] of loginFailures.entries()) {
    if (now - record.firstFailedAt > CONFIG.LOGIN_BLOCK_SECONDS * 1000) {
      loginFailures.delete(key);
    }
  }
}

/**
 * Memeriksa apakah identitas login sedang diblokir karena terlalu banyak percobaan
 */
function assertLoginAllowed(type, identity) {
  cleanExpiredThrottle();
  const key = `${type}|${String(identity).toLowerCase()}`;
  const record = loginFailures.get(key);
  if (record && record.count >= CONFIG.LOGIN_MAX_ATTEMPTS) {
    const elapsedSeconds = Math.floor((Date.now() - record.firstFailedAt) / 1000);
    const remainingSeconds = Math.max(1, CONFIG.LOGIN_BLOCK_SECONDS - elapsedSeconds);
    throw new Error(`Terlalu banyak percobaan masuk. Coba kembali dalam ${remainingSeconds} detik.`);
  }
}

/**
 * Mencatat kegagalan login
 */
function recordLoginFailure(type, identity) {
  const key = `${type}|${String(identity).toLowerCase()}`;
  const now = Date.now();
  const record = loginFailures.get(key);
  if (record) {
    record.count += 1;
    record.lastFailedAt = now;
  } else {
    loginFailures.set(key, { count: 1, firstFailedAt: now, lastFailedAt: now });
  }
}

/**
 * Menghapus catatan kegagalan login setelah berhasil
 */
function clearLoginFailures(type, identity) {
  const key = `${type}|${String(identity).toLowerCase()}`;
  loginFailures.delete(key);
}

/**
 * Memverifikasi PIN siswa dengan dukungan multi-tier backward compatibility:
 * Tier 1: Argon2id (Format modern)
 * Tier 2: SHA-256 + pepper (Format GAS transisi)
 * Tier 3: SHA-256 legacy (Format unpeppred awal)
 * 
 * Jika valid melalui format lama, otomatis meng-upgrade hash siswa menjadi Argon2id!
 * 
 * @param {object} student - Record student dari master_students
 * @param {string} pin - PIN 4 digit input siswa
 * @returns {Promise<boolean>}
 */
async function verifyPin(student, pin) {
  if (!student || !student.pin_hash || !pin) return false;
  const pinStr = String(pin).trim();
  const storedHash = String(student.pin_hash);

  // 1. Cek apakah hash sudah berformat Argon2 ($argon2id$ / $argon2i$)
  if (storedHash.startsWith('$argon2')) {
    try {
      return await argon2.verify(storedHash, pinStr);
    } catch (err) {
      console.error('[SECURITY ERROR] Verifikasi Argon2 gagal:', err);
      return false;
    }
  }

  // 2. Cek format lama: SHA-256 + Pepper
  const pepper = process.env.STUDENT_PIN_PEPPER || CONFIG.STUDENT_PIN_PEPPER;
  const peppredHash = pepper ? hash_(`${pepper}|${pinStr}`) : null;
  const isPeppredMatch = Boolean(peppredHash && storedHash === peppredHash);

  // 3. Cek format lama: SHA-256 Legacy (unpeppred)
  const legacyHash = hash_(pinStr);
  const isLegacyMatch = Boolean(storedHash === legacyHash);

  if (isPeppredMatch || isLegacyMatch) {
    // Upgrade otomatis transparan ke Argon2id tanpa mereset PIN siswa!
    try {
      const modernHash = await hashArgon2(pinStr);

      upsert_('master_students', 'student_id', {
        student_id: student.student_id,
        pin_hash: modernHash,
        updated_at: isoNow_()
      });

      audit_(
        { type: 'system', id: 'pin-migrator' },
        'UPGRADE_PIN_HASH',
        'student',
        student.student_id,
        { previousFormat: isPeppredMatch ? 'SHA256_PEPPER' : 'SHA256_LEGACY', upgradedTo: 'ARGON2ID' }
      );
    } catch (upgradeErr) {
      console.warn('[SECURITY WARNING] Gagal upgrade PIN hash siswa ke Argon2:', upgradeErr);
    }
    return true;
  }

  return false;
}

/**
 * Autentikasi Siswa
 * @param {string} classId - '8A' s.d. '8E'
 * @param {number|string} rollNo - Nomor absen
 * @param {string} pin - 4 digit PIN
 */
async function studentLogin(classId, rollNo, pin) {
  const identity = `${String(classId)}|${String(rollNo)}`;
  assertLoginAllowed('student', identity);

  const student = findOne_('master_students', r =>
    String(r.class_id).toLowerCase() === String(classId).toLowerCase() &&
    Number(r.roll_no) === Number(rollNo) &&
    (r.active === 1 || String(r.active).toLowerCase() === 'true')
  );

  if (!student) {
    recordLoginFailure('student', identity);
    throw new Error('Kelas, nomor absen, atau PIN tidak sesuai.');
  }

  const isValidPin = await verifyPin(student, pin);
  if (!isValidPin) {
    recordLoginFailure('student', identity);
    throw new Error('Kelas, nomor absen, atau PIN tidak sesuai.');
  }

  clearLoginFailures('student', identity);

  // Catat presensi harian otomatis
  const today = new Date().toISOString().slice(0, 10);
  const attendanceId = `${student.student_id}|${today}`;
  upsert_('attendance', 'attendance_id', {
    attendance_id: attendanceId,
    student_id: student.student_id,
    class_id: student.class_id,
    date: today,
    timestamp: isoNow_()
  });

  const session = createSession('student', student.student_id, student.class_id);
  session.student = {
    student_id: student.student_id,
    name: student.name,
    class_id: student.class_id,
    roll_no: student.roll_no
  };
  session.user = session.student;
  return session;
}

/**
 * Autentikasi Guru
 * @param {string} username - Nama pengguna guru
 * @param {string} password - Kata sandi guru
 */
async function teacherLogin(username, password) {
  const identity = String(username || '').toLowerCase();
  assertLoginAllowed('teacher', identity);

  // Kredensial guru diambil dari konfigurasi environment
  const expectedUsername = (CONFIG.TEACHER_USERNAME || process.env.TEACHER_USERNAME || 'guru').toLowerCase();
  const salt = process.env.TEACHER_PASSWORD_SALT || CONFIG.TEACHER_PASSWORD_SALT || '';
  const storedHash = process.env.TEACHER_PASSWORD_HASH || '';
  const devPassword = process.env.TEACHER_DEV_PASSWORD || '';

  if (identity !== expectedUsername) {
    recordLoginFailure('teacher', identity);
    throw new Error('Login guru tidak sesuai.');
  }

  let isValidPassword = false;

  if (storedHash.startsWith('$argon2')) {
    try {
      isValidPassword = await argon2.verify(storedHash, password);
    } catch (e) {
      isValidPassword = false;
    }
  } else if (storedHash && salt) {
    // SHA-256 + Salt format kompatibel dengan Security.gs
    isValidPassword = hash_(`${salt}|${String(password || '')}`) === storedHash;
  } else if (devPassword) {
    isValidPassword = String(password) === devPassword;
  } else {
    throw new Error('Kredensial akun guru belum dikonfigurasi pada environment.');
  }

  if (!isValidPassword) {
    recordLoginFailure('teacher', identity);
    throw new Error('Login guru tidak sesuai.');
  }

  clearLoginFailures('teacher', identity);

  const allowedClasses = process.env.TEACHER_CLASSES || '8A,8B,8C,8D,8E';
  const actorId = `TEACHER-${hash_(identity).slice(0, 12)}`;
  const session = createSession('teacher', actorId, allowedClasses);
  session.user = {
    teacher_id: actorId,
    name: 'Instruktur Laboratorium',
    role: 'teacher',
    allowedClasses
  };
  return session;
}

/**
 * Membuat record sesi baru berdurasi 8 jam
 * @param {'student'|'teacher'|'admin'} type
 * @param {string} id - actor_id (student_id atau teacher_id)
 * @param {string} classId - '8A' atau '8A,8B,...'
 * @returns {{ token: string, session_token: string, actorType: string, actorId: string, classId: string, expiresAt: string }}
 */
function createSession(type, id, classId) {
  const token = uid_('SES');
  const sessionId = hash_(token);
  const expiresAt = new Date(Date.now() + CONFIG.SESSION_HOURS * 3600000).toISOString();

  const sessionRecord = {
    session_id: sessionId,
    actor_type: type,
    actor_id: id,
    class_id: classId || '',
    expires_at: expiresAt,
    created_at: isoNow_()
  };

  append_('sessions', sessionRecord);

  return {
    token,
    session_token: token,
    actorType: type,
    actor_type: type,
    actorId: id,
    actor_id: id,
    classId: classId || '',
    class_id: classId || '',
    expiresAt,
    expires_at: expiresAt
  };
}

/**
 * Memvalidasi sesi berdasarkan token yang dikirimkan klien
 * @param {string} token - Token mentah dari payload klien (SES-...)
 * @param {string} [expectedRole] - 'student', 'teacher', atau 'admin' (opsional)
 * @returns {object} Record sesi jika valid
 */
function validateSession(token, expectedRole) {
  if (!token || typeof token !== 'string') {
    throw new Error('Sesi berakhir. Silakan masuk kembali.');
  }

  const sessionId = hash_(token);
  const session = findOne_('sessions', { session_id: sessionId });

  if (!session) {
    throw new Error('Sesi berakhir. Silakan masuk kembali.');
  }

  const expiresTimestamp = new Date(session.expires_at).getTime();
  if (expiresTimestamp <= Date.now()) {
    throw new Error('Sesi berakhir. Silakan masuk kembali.');
  }

  if (expectedRole && session.actor_type !== expectedRole && session.actor_type !== 'admin') {
    throw new Error('Akses tidak diizinkan.');
  }

  // Jika siswa, pastikan status siswa masih aktif
  if (session.actor_type === 'student') {
    const student = findOne_('master_students', { student_id: session.actor_id });
    if (!student || (student.active !== 1 && String(student.active).toLowerCase() !== 'true')) {
      throw new Error('Akun siswa tidak aktif.');
    }
  }

  return session;
}

/**
 * Logout dan invalidasi token sesi
 * @param {string} token
 */
function logout(token) {
  if (!token) return { loggedOut: true };
  const sessionId = hash_(token);
  const session = findOne_('sessions', { session_id: sessionId });

  if (!session) return { loggedOut: true };

  // Set expires_at ke waktu sekarang untuk menginvalidasi token
  upsert_('sessions', 'session_id', {
    session_id: sessionId,
    expires_at: isoNow_()
  });

  audit_(
    { type: session.actor_type, id: session.actor_id },
    'LOGOUT',
    'session',
    sessionId,
    {}
  );

  return { loggedOut: true };
}

/**
 * Helper administrasi untuk membuat hash kredensial guru baru dengan Argon2id
 * @param {string} username
 * @param {string} password
 */
async function generateTeacherHash(username, password) {
  if (!username || String(password).length < 10) {
    throw new Error('Nama pengguna wajib diisi dan kata sandi minimal 10 karakter.');
  }
  const hash = await argon2.hash(password, ARGON2_CONFIG);
  return { username, hash };
}

module.exports = {
  verifyPin,
  studentLogin,
  teacherLogin,
  createSession,
  validateSession,
  logout,
  generateTeacherHash,
  hashArgon2,
  ARGON2_CONFIG,
  // Helper internal untuk testing
  assertLoginAllowed,
  recordLoginFailure,
  clearLoginFailures
};

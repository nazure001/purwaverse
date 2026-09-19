const { validateSession } = require('../services/securityService');

/**
 * Validasi session untuk dipanggil di controller atau service
 * @param {string} token - Token sesi dari klien (SES-...)
 * @param {string} [expectedRole] - 'student', 'teacher', 'admin'
 * @returns {object} Record sesi yang terverifikasi
 */
function requireSession(token, expectedRole) {
  return validateSession(token, expectedRole);
}

/**
 * Validasi kepemilikan role tertentu
 * @param {object} session - Sesi yang telah tervalidasi
 * @param {Array<string>|string} allowedRoles - 'student', 'teacher', 'admin'
 */
function requireRole(session, allowedRoles) {
  if (!session || !session.actor_type) {
    throw new Error('Sesi tidak valid.');
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(session.actor_type) && session.actor_type !== 'admin') {
    throw new Error('Akses tidak diizinkan untuk peran ini.');
  }

  return true;
}

/**
 * Express Middleware generator untuk endpoint REST konvensional
 * @param {string|Array<string>} [roles]
 */
function authMiddleware(roles) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (req.body && req.body.token) || (req.body && req.body.payload && req.body.payload.token);

      const session = requireSession(token);
      if (roles) {
        requireRole(session, roles);
      }
      req.session = session;
      next();
    } catch (err) {
      return res.status(200).json({
        ok: false,
        error: err.message || 'Sesi berakhir. Silakan masuk kembali.'
      });
    }
  };
}

/**
 * Memastikan guru memiliki hak akses ke kelas yang diminta
 * @param {object} session
 * @param {string} classId
 */
function ensureTeacherClassAccess(session, classId) {
  if (!session || session.actor_type !== 'teacher') {
    throw new Error('Akses guru diperlukan.');
  }
  const allowed = String(session.class_id || '').split(',').map(x => x.trim());
  if (!allowed.includes('*') && !allowed.includes(String(classId))) {
    throw new Error('Guru tidak memiliki akses ke kelas ini.');
  }
  return true;
}

module.exports = {
  requireSession,
  requireRole,
  ensureTeacherClassAccess,
  authMiddleware
};

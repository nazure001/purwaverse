const CONFIG = require('../config');
const {
  studentLogin,
  teacherLogin,
  logout
} = require('../services/securityService');
const { requireSession } = require('../middleware/authMiddleware');
const {
  getDiagnosticItems,
  submitDiagnostic,
  scoreDiagnosticResponse,
  diagnosticReview,
  generateTeams,
  overrideTeamMember,
  publicLeaderboardData,
  saveProgress,
  getDashboard
} = require('../services/purwaService');
const {
  learningHome,
  learningUnitForStudent,
  saveConfusionSignal,
  submitSummaryForReview,
  saveTeacherChecks,
  startQuiz,
  submitQuiz,
  saveTeamPracticeReport,
  saveGroupLab,
  groupLabDashboard,
  teacherLearningDashboard,
  saveUnlockOverrides,
  practiceWorkspace_,
  semesterCard
} = require('../services/learningService');

/**
 * Controller utama untuk RPC JSON endpoint /api/purwa
 * Format Request: { action: string, payload: object }
 * Format Response: { ok: boolean, data?: object, error?: string }
 */
async function handlePurwaRpc(req, res) {
  const { action, payload = {} } = req.body || {};

  if (!action || typeof action !== 'string') {
    return res.status(200).json({
      ok: false,
      error: 'Action wajib disertakan dalam request.'
    });
  }

  try {
    switch (action) {
      case 'bootstrap': {
        return res.status(200).json({
          ok: true,
          data: {
            appName: CONFIG.APP_NAME,
            mode: CONFIG.APP_MODE,
            status: 'ONLINE'
          }
        });
      }

      case 'loginStudent': {
        const { classId, rollNo, pin } = payload;
        if (!classId || rollNo === undefined || !pin) {
          return res.status(200).json({
            ok: false,
            error: 'Kelas, nomor absen, dan PIN wajib diisi.'
          });
        }
        const sessionData = await studentLogin(classId, rollNo, pin);
        return res.status(200).json({
          ok: true,
          data: sessionData
        });
      }

      case 'loginTeacher': {
        const { username, password } = payload;
        if (!username || !password) {
          return res.status(200).json({
            ok: false,
            error: 'Nama pengguna dan kata sandi guru wajib diisi.'
          });
        }
        const sessionData = await teacherLogin(username, password);
        return res.status(200).json({
          ok: true,
          data: sessionData
        });
      }

      case 'logout': {
        const { token } = payload;
        const result = logout(token);
        return res.status(200).json({
          ok: true,
          data: result
        });
      }

      case 'diagnosticItems': {
        const session = requireSession(payload.token, 'student');
        const data = getDiagnosticItems(session.actor_id);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'submitDiagnostic': {
        const session = requireSession(payload.token, 'student');
        const data = submitDiagnostic(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'generateTeams': {
        const session = requireSession(payload.token, 'teacher');
        const data = generateTeams(session, payload.classId, payload.options || {});
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'overrideTeamMember': {
        const session = requireSession(payload.token, 'teacher');
        const data = overrideTeamMember(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'leaderboard':
      case 'publicLeaderboard': {
        const data = publicLeaderboardData(payload.force);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'scoreDiagnostic': {
        const session = requireSession(payload.token, 'teacher');
        const data = scoreDiagnosticResponse(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'diagnosticReview': {
        const session = requireSession(payload.token, 'teacher');
        const data = diagnosticReview(session, payload.classId);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'dashboard': {
        const session = requireSession(payload.token, 'teacher');
        const data = getDashboard(session, payload.classId);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'saveProgress': {
        const session = requireSession(payload.token, 'student');
        const data = saveProgress(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'learningHome': {
        const session = requireSession(payload.token, 'student');
        const data = learningHome(session);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'learningUnit':
      case 'learningUnitForStudent': {
        const session = requireSession(payload.token, 'student');
        const data = learningUnitForStudent(session, payload.unitId);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'submitSummary':
      case 'submitSummaryForReview': {
        const session = requireSession(payload.token, 'student');
        const data = submitSummaryForReview(session, payload.unitId);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'teacherChecks':
      case 'saveTeacherChecks': {
        const session = requireSession(payload.token, 'teacher');
        const data = saveTeacherChecks(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'startQuiz': {
        const session = requireSession(payload.token, 'student');
        const data = startQuiz(session, payload.activityId);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'submitQuiz': {
        const session = requireSession(payload.token, 'student');
        const data = submitQuiz(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'groupLab':
      case 'saveGroupLab': {
        const session = requireSession(payload.token, 'teacher');
        if (payload.teamId && payload.activityId) {
          const data = saveGroupLab(session, payload);
          return res.status(200).json({ ok: true, data });
        } else if (payload.classId) {
          const data = groupLabDashboard(session, payload.classId, payload.activityId);
          return res.status(200).json({ ok: true, data });
        }
        throw new Error('Payload groupLab tidak valid.');
      }

      case 'groupLabDashboard': {
        const session = requireSession(payload.token, 'teacher');
        const data = groupLabDashboard(session, payload.classId, payload.activityId);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'teacherDashboard':
      case 'teacherLearningDashboard': {
        const session = requireSession(payload.token, 'teacher');
        const data = teacherLearningDashboard(session, payload.classId, payload.activityId, payload.checkType);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'saveUnlockOverrides': {
        const session = requireSession(payload.token, 'teacher');
        const data = saveUnlockOverrides(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'saveTeamPracticeDraft': {
        const session = requireSession(payload.token, 'student');
        const data = saveTeamPracticeReport(session, payload, false);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'submitTeamPractice': {
        const session = requireSession(payload.token, 'student');
        const data = saveTeamPracticeReport(session, payload, true);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'practiceWorksheet': {
        const session = requireSession(payload.token, 'student');
        const data = practiceWorkspace_(session, payload.unitId);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'saveConfusionSignal': {
        const session = requireSession(payload.token, 'student');
        const data = saveConfusionSignal(session, payload.unitId, payload.category);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'semesterCard': {
        const session = requireSession(payload.token, 'student');
        const data = semesterCard(session, payload.semester || CONFIG.CURRENT_SEMESTER);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      default: {
        return res.status(200).json({
          ok: false,
          error: `Action '${action}' belum dimigrasikan`
        });
      }
    }
  } catch (err) {
    // Tangani pesan error autentikasi agar ramah pengguna sesuai konvensi GAS
    return res.status(200).json({
      ok: false,
      error: err.message || 'Terjadi kesalahan pada server.'
    });
  }
}

module.exports = {
  handlePurwaRpc
};

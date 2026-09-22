const CONFIG = require('../config');
const {
  studentLogin,
  teacherLogin,
  logout
} = require('../services/securityService');
const { requireSession } = require('../middleware/authMiddleware');
const { findOne_ } = require('../database/repository');
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

  const token = payload.token || payload.session_token;

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

      case 'loginStudent':
      case 'student_login':
      case 'studentLogin': {
        let { classId, rollNo, pin, student_id } = payload;
        if ((!classId || rollNo === undefined) && student_id) {
          const parts = String(student_id).trim().split('-');
          if (parts.length === 2) {
            classId = parts[0].trim().toUpperCase();
            rollNo = parseInt(parts[1].trim(), 10);
          }
        }
        if (!classId || rollNo === undefined || isNaN(Number(rollNo)) || !pin) {
          return res.status(200).json({
            ok: false,
            error: 'Kelas, nomor absen, dan PIN wajib diisi.'
          });
        }
        const sessionData = await studentLogin(classId, Number(rollNo), pin);
        return res.status(200).json({
          ok: true,
          data: sessionData
        });
      }

      case 'loginTeacher':
      case 'teacher_login':
      case 'teacherLogin': {
        const { username = 'guru', password } = payload;
        if (!password) {
          return res.status(200).json({
            ok: false,
            error: 'Kata sandi guru wajib diisi.'
          });
        }
        const sessionData = await teacherLogin(username, password);
        return res.status(200).json({
          ok: true,
          data: sessionData
        });
      }

      case 'verifySession':
      case 'validateSession':
      case 'validate_session': {
        if (!token) {
          return res.status(200).json({
            ok: false,
            error: 'Token sesi wajib disertakan.'
          });
        }
        const session = requireSession(token);
        let user = null;
        if (session.actor_type === 'student') {
          const student = findOne_('master_students', { student_id: session.actor_id });
          if (student) {
            user = {
              student_id: student.student_id,
              name: student.name,
              class_id: student.class_id,
              roll_no: student.roll_no
            };
          }
        } else if (session.actor_type === 'teacher') {
          user = {
            teacher_id: session.actor_id,
            name: 'Instruktur Laboratorium',
            role: 'teacher',
            allowedClasses: session.class_id
          };
        }
        return res.status(200).json({
          ok: true,
          data: {
            valid: true,
            actorType: session.actor_type,
            actorId: session.actor_id,
            classId: session.class_id,
            expiresAt: session.expires_at,
            user,
            student: user
          }
        });
      }

      case 'logout': {
        const result = logout(token);
        return res.status(200).json({
          ok: true,
          data: result
        });
      }

      case 'diagnosticItems':
      case 'getDiagnosticItems': {
        const session = requireSession(token, 'student');
        const data = getDiagnosticItems(session.actor_id);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'submitDiagnostic': {
        const session = requireSession(token, 'student');
        const data = submitDiagnostic(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'generateTeams': {
        const session = requireSession(token, 'teacher');
        const data = generateTeams(session, payload.classId || payload.class_id, payload.options || {});
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'overrideTeamMember': {
        const session = requireSession(token, 'teacher');
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
        const session = requireSession(token, 'teacher');
        const data = scoreDiagnosticResponse(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'diagnosticReview': {
        const session = requireSession(token, 'teacher');
        const data = diagnosticReview(session, payload.classId || payload.class_id);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'dashboard':
      case 'teacher_overview': {
        const session = requireSession(token, 'teacher');
        const data = getDashboard(session, payload.classId || payload.class_id);
        data.active_students = data.studentCount;
        data.avg_progress = data.studentCount ? Math.round((data.progressCount / (data.studentCount * 4)) * 100) : 0;
        data.pending_review_count = 0;
        data.attention_count = 0;
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'saveProgress': {
        const session = requireSession(token, 'student');
        const data = saveProgress(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'learningHome':
      case 'learning_home': {
        const session = requireSession(token, 'student');
        const data = learningHome(session);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'learningUnit':
      case 'learningUnitForStudent':
      case 'learning_unit':
      case 'learning_unit_for_student': {
        const session = requireSession(token, 'student');
        const data = learningUnitForStudent(session, payload.unitId || payload.unit_id);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'submitSummary':
      case 'submitSummaryForReview':
      case 'submit_learning_summary':
      case 'submit_summary': {
        const session = requireSession(token, 'student');
        const data = submitSummaryForReview(session, payload.unitId || payload.unit_id);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'teacherChecks':
      case 'saveTeacherChecks': {
        const session = requireSession(token, 'teacher');
        const data = saveTeacherChecks(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'startQuiz':
      case 'student_quiz_items': {
        const session = requireSession(token, 'student');
        const data = startQuiz(session, payload.activityId || payload.activity_id || payload.unitId || payload.unit_id);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'submitQuiz':
      case 'submit_student_quiz': {
        const session = requireSession(token, 'student');
        const data = submitQuiz(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'groupLab':
      case 'saveGroupLab': {
        const session = requireSession(token, 'teacher');
        if (payload.teamId && payload.activityId) {
          const data = saveGroupLab(session, payload);
          return res.status(200).json({ ok: true, data });
        } else if (payload.classId || payload.class_id) {
          const data = groupLabDashboard(session, payload.classId || payload.class_id, payload.activityId);
          return res.status(200).json({ ok: true, data });
        }
        throw new Error('Payload groupLab tidak valid.');
      }

      case 'groupLabDashboard': {
        const session = requireSession(token, 'teacher');
        const data = groupLabDashboard(session, payload.classId || payload.class_id, payload.activityId);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'teacherDashboard':
      case 'teacherLearningDashboard': {
        const session = requireSession(token, 'teacher');
        const data = teacherLearningDashboard(session, payload.classId || payload.class_id, payload.activityId, payload.checkType);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'saveUnlockOverrides': {
        const session = requireSession(token, 'teacher');
        const data = saveUnlockOverrides(session, payload);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'saveTeamPracticeDraft':
      case 'save_team_practice_draft': {
        const session = requireSession(token, 'student');
        const data = saveTeamPracticeReport(session, {
          ...payload,
          unitId: payload.unitId || payload.unit_id
        }, false);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'submitTeamPractice':
      case 'submit_team_practice':
      case 'submit_group_lab': {
        const session = requireSession(token, 'student');
        const data = saveTeamPracticeReport(session, {
          ...payload,
          unitId: payload.unitId || payload.unit_id
        }, true);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'practiceWorksheet':
      case 'practiceWorkspace':
      case 'practice_worksheet': {
        const session = requireSession(token, 'student');
        const data = practiceWorkspace_(session, payload.unitId || payload.unit_id);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'saveConfusionSignal': {
        const session = requireSession(token, 'student');
        const data = saveConfusionSignal(session, payload.unitId || payload.unit_id, payload.category);
        return res.status(200).json({
          ok: true,
          data
        });
      }

      case 'semesterCard': {
        const session = requireSession(token, 'student');
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

function doGet(e) {
  const forceSchema = e && e.parameter && (e.parameter.ensureSchema === '1' || e.parameter.setup === '1');
  const cache = CacheService.getScriptCache();
  if (forceSchema || !cache.get('SCHEMA_VERIFIED_V1')) {
    try {
      ensureSchema_();
      cache.put('SCHEMA_VERIFIED_V1', '1', 43200); // 12 hours
    } catch(err) {
      console.error('ensureSchema failed:', err);
    }
  }

  const props = PropertiesService.getScriptProperties();
  const vercelUrl = (props && props.getProperty('PURWAVERSE_VERCEL_URL')) || CONFIG.VERCEL_APP_URL || '';

  // Jika noredirect=1 atau gas=1 atau URL Vercel belum ada, sajikan Web App GAS normal
  if ((e && e.parameter && (e.parameter.noredirect === '1' || e.parameter.gas === '1')) || !vercelUrl) {
    const template = HtmlService.createTemplateFromFile('Index');
    template.bootstrap = JSON.stringify(publicBootstrap_());
    return template.evaluate().setTitle(CONFIG.APP_NAME).addMetaTag('viewport','width=device-width, initial-scale=1');
  }

  // Auto-redirect instan ke Vercel agar bebas dari isu Android Drive & multi-akun
  const safeTitle = String(CONFIG.APP_NAME || 'Purwaverse IPA VIII').replace(/[&<>"']/g, '');
  const safeUrl = String(vercelUrl).replace(/"/g, '&quot;');
  const redirectHtml = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Buka ' + safeTitle + '</title>' +
    '<style>' +
    'html,body{height:100%;margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1e293b}' +
    'body{display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;cursor:pointer}' +
    '.card{background:#fff;border:1.5px solid #cbd5e1;border-radius:24px;padding:36px 24px;max-width:440px;width:100%;box-shadow:0 20px 45px rgba(0,0,0,.08);text-align:center;box-sizing:border-box}' +
    '.spinner{width:48px;height:48px;border:4.5px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:spin .75s linear infinite;margin:0 auto 20px}' +
    '@keyframes spin{to{transform:rotate(360deg)}}' +
    'h2{margin:0 0 10px;font-size:1.35rem;color:#0f172a;font-weight:800}' +
    'p{color:#64748b;font-size:1rem;margin:0 0 24px;line-height:1.55}' +
    '.btn-launch{display:block;width:100%;background:#2563eb;color:#fff!important;text-decoration:none!important;font-weight:800;padding:16px 20px;border-radius:16px;font-size:1.1rem;box-sizing:border-box;box-shadow:0 8px 20px rgba(37,99,235,.28);transition:all .15s ease}' +
    '.btn-launch:active,.btn-launch:hover{background:#1d4ed8;transform:scale(.98)}' +
    '</style>' +
    '</head><body onclick="launchApp()">' +
    '<div class="card">' +
    '<div class="spinner"></div>' +
    '<h2>Buka Purwaverse Baru</h2>' +
    '<p>Sentuh tombol di bawah untuk membuka versi baru yang cepat dan bebas kendala Google Drive.</p>' +
    '<a id="btn-target" class="btn-launch" href="' + safeUrl + '" target="_top">🚀 Masuk ke Purwaverse</a>' +
    '</div>' +
    '<script>' +
    'function launchApp(){' +
    '  try { var btn = document.getElementById("btn-target"); if(btn) btn.click(); } catch(e){}' +
    '  try { window.top.location.href = "' + safeUrl + '"; } catch(e){}' +
    '}' +
    'window.addEventListener("DOMContentLoaded", function(){' +
    '  setTimeout(launchApp, 300);' +
    '});' +
    '</script>' +
    '</body></html>';

  return HtmlService.createHtmlOutput(redirectHtml)
    .setTitle(CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent(); }

function publicBootstrap_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('PUBLIC_BOOTSTRAP_V2');
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }

  const glossaries = [];
  if (typeof LEARNING_MATERIALS_ !== 'undefined') {
    Object.values(LEARNING_MATERIALS_).forEach(m => {
      if(m.glossary) glossaries.push(...m.glossary);
    });
  }
  if (typeof LEARNING_STANDARDS_ !== 'undefined') {
    Object.values(LEARNING_STANDARDS_).forEach(s => {
      if(s.glossary) glossaries.push(...s.glossary);
    });
  }
  glossaries.sort((a,b) => a[0].localeCompare(b[0]));
  const result = {
    appName:CONFIG.APP_NAME,
    mode:CONFIG.APP_MODE,
    sourceStatus:CONFIG.SOURCE_STATUS,
    currentSemester:CONFIG.CURRENT_SEMESTER,
    quizPassingScore:CONFIG.QUIZ_PASSING_SCORE,
    classes:rows_('MASTER_CLASSES').filter(r=>String(r.active).toLowerCase()==='true'),
    activities:rows_('MASTER_ACTIVITIES').filter(r=>String(r.public).toLowerCase()==='true'&&String(r.active).toLowerCase()==='true'),
    glossary: glossaries
  };
  try {
    cache.put('PUBLIC_BOOTSTRAP_V2', JSON.stringify(result), 7200); // 2 hours
  } catch(e) {}
  return result;
}

function api(action, payload) {
  payload = payload || {};
  try {
    let data;
    switch(action) {
      case 'bootstrap': data=publicBootstrap_(); break;
      case 'publicLeaderboard': data=publicLeaderboardData_(payload.force); break;
      case 'loginStudent': data=loginStudent_(payload.classId,payload.rollNo,payload.pin); break;
      case 'loginTeacher': data=loginTeacher_(payload.username,payload.password); break;
      case 'logout': data=logout_(payload.token); break;
      case 'studentHome': { const s=requireSession_(payload.token,'student'); const prog=findAll_('PROGRESS',r=>r.student_id===s.actor_id); const quiz=findAll_('QUIZ_ATTEMPTS',r=>r.student_id===s.actor_id&&r.submitted_at).map(q=>({activity_id:q.activity_id,score:q.score,status:'completed'})); data={session:s,student:findOne_('MASTER_STUDENTS',r=>r.student_id===s.actor_id),progress:prog.concat(quiz),profile:validProfileForStudent_(s.actor_id),team:studentTeamWithProgress_(s.actor_id)}; break; }
      case 'refreshStudentTeam': { const s=requireSession_(payload.token,'student'); data={team:studentTeamWithProgress_(s.actor_id)}; break; }
      case 'saveProgress': data=saveProgress_(requireSession_(payload.token,'student'),payload); break;
      case 'diagnosticItems': { const s=requireSession_(payload.token,'student'); const items=findAll_('DIAGNOSTIC_ITEMS',r=>CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.includes(r.item_id)&&String(r.active).toLowerCase()==='true').map(({rubric_json,...safe})=>safe); data=stableShuffle_(items,s.actor_id); break; }
      case 'selfMapItems': requireSession_(payload.token,'student'); data=findAll_('SELF_MAP_ITEMS',r=>String(r.active).toLowerCase()==='true'); break;
      case 'submitDiagnostic': data=submitDiagnostic_(requireSession_(payload.token,'student'),payload); break;
      case 'dashboard': data=dashboard_(requireSession_(payload.token,'teacher'),payload.classId); break;
      case 'diagnosticReview': data=diagnosticReview_(requireSession_(payload.token,'teacher'),payload.classId); break;
      case 'scoreDiagnostic': data=scoreDiagnosticResponse_(requireSession_(payload.token,'teacher'),payload); break;
      case 'generateTeams': data=generateTeams_(requireSession_(payload.token,'teacher'),payload.classId,payload.options||{}); break;
      case 'overrideTeamMember': data=overrideTeamMember_(requireSession_(payload.token,'teacher'),payload); break;
      case 'learningHome': data=learningHome_(requireSession_(payload.token,'student')); break;
      case 'learningUnit': data=learningUnitForStudent_(requireSession_(payload.token,'student'),payload.unitId); break;
      case 'submitSummaryForReview': data=submitSummaryForReview_(requireSession_(payload.token,'student'),payload.unitId); break;
      case 'saveConfusionSignal': data=saveConfusionSignal_(requireSession_(payload.token,'student'),payload.unitId,payload.category); break;
      case 'studentPracticeGuide': data=practiceGuideForStudent_(requireSession_(payload.token,'student')); break;
      case 'teacherLearningCatalog': data=teacherLearningCatalog_(requireSession_(payload.token,'teacher')); break;
      case 'teacherLearningUnit': data=teacherLearningUnit_(requireSession_(payload.token,'teacher'),payload.unitId); break;
      case 'teacherPracticeGuide': data=practiceGuideForTeacher_(requireSession_(payload.token,'teacher')); break;
      case 'startQuiz': data=startQuiz_(requireSession_(payload.token,'student'),payload.activityId); break;
      case 'submitQuiz': data=submitQuiz_(requireSession_(payload.token,'student'),payload); break;
      case 'practiceWorksheet': data=practiceWorksheet_(requireSession_(payload.token,'student'),payload.unitId); break;
      case 'saveTeamPracticeDraft': data=saveTeamPracticeReport_(requireSession_(payload.token,'student'),payload,false); break;
      case 'submitTeamPractice': data=saveTeamPracticeReport_(requireSession_(payload.token,'student'),payload,true); break;
      case 'semesterCard': data=semesterCard_(requireSession_(payload.token,'student'),payload.semester||CONFIG.CURRENT_SEMESTER); break;
      case 'teacherLearningDashboard': data=teacherLearningDashboard_(requireSession_(payload.token,'teacher'),payload.classId,payload.activityId,payload.checkType); break;
      case 'saveTeacherChecks': data=saveTeacherChecks_(requireSession_(payload.token,'teacher'),payload); break;
      case 'saveUnlockOverrides': data=saveUnlockOverrides_(requireSession_(payload.token,'teacher'),payload); break;
      case 'saveGroupLab': data=saveGroupLab_(requireSession_(payload.token,'teacher'),payload); break;
      case 'groupLabDashboard': data=groupLabDashboard_(requireSession_(payload.token,'teacher'),payload.classId,payload.activityId); break;
      default: throw new Error('Aksi API tidak dikenal.');
    }
    return {ok:true,data};
  } catch (error) { return {ok:false,error:String(error.message||error)}; }
}

function doPost(e) {
  let req = {};
  try {
    if (e && e.postData && e.postData.contents) {
      req = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      req = e.parameter;
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Invalid JSON request: ' + err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const action = req.action;
  const payload = req.payload || {};
  const res = api(action, payload);

  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}

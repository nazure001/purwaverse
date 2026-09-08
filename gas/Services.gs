function loginStudent_(classId, rollNo, pin) {
  const identity=String(classId)+'|'+String(rollNo);
  assertLoginAllowed_('student',identity);
  let student = findOne_('MASTER_STUDENTS', r => String(r.class_id) === String(classId) && String(r.roll_no) === String(rollNo) && String(r.active).toLowerCase() === 'true');
  if (!student && typeof OFFICIAL_ROSTER_ !== 'undefined') {
    const fromRoster = OFFICIAL_ROSTER_.find(r => String(r.class_id) === String(classId) && String(r.roll_no) === String(rollNo) && r.active !== false);
    if (fromRoster) {
      importOfficialStudents([fromRoster]);
      student = findOne_('MASTER_STUDENTS', r => String(r.class_id) === String(classId) && String(r.roll_no) === String(rollNo) && String(r.active).toLowerCase() === 'true');
    }
  }
  if (!student || !verifyStudentPin_(student,pin)){recordLoginFailure_('student',identity);throw new Error('Kelas, nomor absen, atau PIN tidak sesuai.');}
  clearLoginFailures_('student',identity);
  const now = new Date();
  const dateStr = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd');
  upsert_('ATTENDANCE', 'attendance_id', {attendance_id: student.student_id + '|' + dateStr, student_id: student.student_id, class_id: student.class_id, date: dateStr, timestamp: isoNow_()});
  return createSession_('student', student.student_id, student.class_id);
}

function loginTeacher_(username, password) {
  const identity=String(username||'').toLowerCase(); assertLoginAllowed_('teacher',identity);
  const cfg=teacherCredentialConfig_();
  if(!cfg.username||!cfg.passwordHash)throw new Error('Akun guru belum dikonfigurasi melalui Script Properties.');
  if(String(username)!==cfg.username||hash_(cfg.salt+'|'+String(password||''))!==cfg.passwordHash){recordLoginFailure_('teacher',identity);throw new Error('Login guru tidak sesuai.');}
  clearLoginFailures_('teacher',identity);
  return createSession_('teacher','TEACHER-'+hash_(cfg.username).slice(0,12),cfg.classes.join(','));
}

function createSession_(type, id, classId) {
  const token = uid_('SES');
  const sessionId = hash_(token);
  const expires = new Date(Date.now() + CONFIG.SESSION_HOURS * 3600000).toISOString();
  const sessionRecord = {session_id:sessionId,actor_type:type,actor_id:id,class_id:classId,expires_at:expires,created_at:isoNow_()};
  append_('SESSIONS', sessionRecord);
  try {
    const ttlSeconds = Math.min(21600, Math.floor(CONFIG.SESSION_HOURS * 3600));
    CacheService.getScriptCache().put('SESS_' + sessionId, JSON.stringify(sessionRecord), ttlSeconds);
    if (type === 'student') {
      CacheService.getScriptCache().put('STD_ACTIVE_' + id, '1', 7200);
    }
  } catch(e) {}
  return {token, actorType:type, actorId:id, classId, expiresAt:expires};
}

function requireSession_(token, type) {
  if (!token) throw new Error('Sesi berakhir. Silakan masuk kembali.');
  const sessionId = hash_(token);
  let session = null;
  const cache = CacheService.getScriptCache();
  try {
    const cached = cache.get('SESS_' + sessionId);
    if (cached) session = JSON.parse(cached);
  } catch(e) {}

  if (!session) {
    session = findOne_('SESSIONS', r => r.session_id === sessionId);
    if (session) {
      const remainingSeconds = Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000);
      if (remainingSeconds > 0) {
        try {
          cache.put('SESS_' + sessionId, JSON.stringify(session), Math.min(21600, remainingSeconds));
        } catch(e) {}
      }
    }
  }

  if (!session || new Date(session.expires_at).getTime() <= Date.now()) throw new Error('Sesi berakhir. Silakan masuk kembali.');
  if (type && session.actor_type !== type) throw new Error('Akses tidak diizinkan.');
  if (session.actor_type === 'student') {
    let studentActive = false;
    try {
      const cachedActive = cache.get('STD_ACTIVE_' + session.actor_id);
      if (cachedActive !== null) studentActive = (cachedActive === '1');
    } catch(e) {}

    if (!studentActive) {
      const active = findOne_('MASTER_STUDENTS', r => r.student_id === session.actor_id && String(r.active).toLowerCase() === 'true');
      if (!active) throw new Error('Akun siswa tidak aktif.');
      studentActive = true;
      try {
        cache.put('STD_ACTIVE_' + session.actor_id, '1', 7200);
      } catch(e) {}
    }
  }
  return session;
}

function logout_(token) {
  if (!token) return {loggedOut:true};
  const sessionId = hash_(token);
  try {
    CacheService.getScriptCache().remove('SESS_' + sessionId);
  } catch(e) {}
  const session = findOne_('SESSIONS', r => r.session_id === sessionId);
  if (!session) return {loggedOut:true};
  upsert_('SESSIONS','session_id',Object.assign({},session,{expires_at:isoNow_()}));
  audit_({type:session.actor_type,id:session.actor_id},'LOGOUT','session',sessionId,{});
  return {loggedOut:true};
}

function saveProgress_(session, payload) {
  const activity = findOne_('MASTER_ACTIVITIES', r => r.activity_id === payload.activityId && String(r.active).toLowerCase() === 'true');
  if (!activity) throw new Error('Aktivitas tidak ditemukan.');
  if(payload.score!==undefined&&payload.score!=='')throw new Error('Nilai hanya dapat diberikan oleh sistem kuis atau guru.');
  const allowedStatus=new Set(['draft','submitted','completed']);
  if(!allowedStatus.has(payload.status||'completed'))throw new Error('Status aktivitas tidak valid.');
  const progressId = session.actor_id + '|' + payload.activityId;
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const existing = findOne_('PROGRESS', r => r.progress_id === progressId);
    const record = upsert_('PROGRESS','progress_id',{progress_id:progressId,student_id:session.actor_id,activity_id:payload.activityId,status:payload.status || 'completed',score:payload.score === undefined ? (existing ? existing.score : '') : payload.score,evidence_json:JSON.stringify(payload.evidence || {}),updated_at:isoNow_(),updated_by:session.actor_id});
    audit_({type:'student',id:session.actor_id},'UPSERT_PROGRESS','progress',progressId,{activity_id:payload.activityId});
    return record;
  } finally { lock.releaseLock(); }
}

function submitDiagnostic_(session, payload) {
  const items = findAll_('DIAGNOSTIC_ITEMS', r => CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.includes(r.item_id) && String(r.active).toLowerCase() === 'true');
  if (!items.length) throw new Error('Butir diagnostik produksi belum dimuat dari sumber resmi.');
  const byId = Object.fromEntries(items.map(x => [x.item_id, x]));
  const responses=payload.responses||[],unique=new Set(responses.map(x=>x.itemId));
  if(responses.length!==CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.length||unique.size!==responses.length||CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.some(id=>!unique.has(id)))throw new Error('Semua butir Mission 0 harus dikirim tepat satu kali.');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    responses.forEach(response => {
      if (!byId[response.itemId]) throw new Error('Butir diagnostik tidak dikenal: ' + response.itemId);
      if(!String(response.answer||'').trim())throw new Error('Jawaban diagnostik tidak boleh kosong.');
      const responseId = session.actor_id + '|' + response.itemId;
      const existing = findOne_('DIAGNOSTIC_RESPONSES', r => r.response_id === responseId);
      if(existing&&existing.score!==''&&existing.score!==null&&String(existing.answer)!==String(response.answer||''))throw new Error('Jawaban yang sudah dinilai tidak dapat diubah. Hubungi guru bila perlu koreksi.');
      upsert_('DIAGNOSTIC_RESPONSES','response_id',{response_id:responseId,student_id:session.actor_id,item_id:response.itemId,answer:String(response.answer || ''),score:existing ? existing.score : '',scored_by:existing ? existing.scored_by : '',submitted_at:isoNow_()});
    });
    upsert_('SETTINGS','key',{key:'self_map|'+session.actor_id,value:String(payload.selfMapScore || ''),updated_at:isoNow_()});
    saveProgress_(session,{activityId:'M0-QUICK',status:'submitted',score:''});
    return {submitted:true, scored:false};
  } finally { lock.releaseLock(); }
}

function buildProfile_(studentId, selfMapScore) {
  const responses = findAll_('DIAGNOSTIC_RESPONSES', r => r.student_id === studentId && CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.includes(r.item_id) && r.score !== '' && r.score !== null);
  const items = Object.fromEntries(rows_('DIAGNOSTIC_ITEMS').map(x => [x.item_id, x]));
  const scores = {};
  CONFIG.DOMAINS.forEach(d => {
    const vals = responses.filter(r => items[r.item_id] && items[r.item_id].domain === d).map(r => Number(r.score));
    scores[d] = vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length : 0;
  });
  const overall = CONFIG.DOMAINS.reduce((n,d)=>n+scores[d],0) / CONFIG.DOMAINS.length;
  const normalizedSelfMap = Math.max(0,Math.min(4,Number(selfMapScore)-1));
  const leader = 0.75 * overall + 0.25 * normalizedSelfMap;
  const research = (scores.evidence_experiment + scores.systems_causality + scores.technology_design) / 3;
  const readiness = research >= 3.25 ? 'R4' : research >= 2.5 ? 'R3' : research >= 1.5 ? 'R2' : 'R1';
  return upsert_('DIAGNOSTIC_PROFILES','profile_id',Object.assign({profile_id:studentId,student_id:studentId,overall_reasoning:round2_(overall),self_map_score:round2_(normalizedSelfMap),leader_index:round2_(leader),research_readiness:readiness,updated_at:isoNow_()},Object.fromEntries(CONFIG.DOMAINS.map(d=>[d,round2_(scores[d])]))));
}

function scoreDiagnosticResponse_(session, payload) {
  const student=findOne_('MASTER_STUDENTS',r=>r.student_id===payload.studentId);
  if(!student)throw new Error('Siswa tidak ditemukan.');
  ensureTeacherClassAccess_(session,student.class_id);
  if(!CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.includes(payload.itemId))throw new Error('Butir di luar Mission 0 tidak dapat dinilai.');
  const responseId = payload.studentId + '|' + payload.itemId;
  const response = findOne_('DIAGNOSTIC_RESPONSES', r => r.response_id === responseId);
  if (!response) throw new Error('Jawaban diagnostik tidak ditemukan.');
  const score = Number(payload.score);
  if (!Number.isInteger(score) || score < 0 || score > 4) throw new Error('Skor harus bilangan 0-4.');
  upsert_('DIAGNOSTIC_RESPONSES','response_id',Object.assign({},response,{score,scored_by:session.actor_id}));
  const expected = CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.length;
  const scored = findAll_('DIAGNOSTIC_RESPONSES',r=>r.student_id===payload.studentId && CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.includes(r.item_id) && r.score !== '' && r.score !== null).length;
  let profile = null;
  if (scored >= expected) {
    const selfMap = findOne_('SETTINGS',r=>r.key==='self_map|'+payload.studentId);
    profile = buildProfile_(payload.studentId,Number(selfMap ? selfMap.value : 0));
    upsert_('PROGRESS','progress_id',{progress_id:payload.studentId+'|M0-QUICK',student_id:payload.studentId,activity_id:'M0-QUICK',status:'completed',score:profile.overall_reasoning,evidence_json:JSON.stringify({scored_items:scored}),updated_at:isoNow_(),updated_by:session.actor_id});
  }
  audit_({type:'teacher',id:session.actor_id},'SCORE_DIAGNOSTIC','response',responseId,{score});
  return {profile,scored,expected,complete:scored>=expected};
}

function diagnosticReview_(session,classId) {
  ensureTeacherClassAccess_(session,classId);
  const students=findAll_('MASTER_STUDENTS',r=>r.class_id===classId&&String(r.active).toLowerCase()==='true');
  const ids=new Set(students.map(s=>s.student_id));
  const items=Object.fromEntries(rows_('DIAGNOSTIC_ITEMS').map(i=>[i.item_id,i]));
  const responsesByStudent={};
  findAll_('DIAGNOSTIC_RESPONSES',r=>ids.has(r.student_id)).forEach(r=>(responsesByStudent[r.student_id]||(responsesByStudent[r.student_id]=[])).push(Object.assign({},r,{prompt:items[r.item_id]?.prompt||'',rubric_json:items[r.item_id]?.rubric_json||'{}'})));
  return students.map(s=>({studentId:s.student_id,name:s.name,rollNo:s.roll_no,responses:responsesByStudent[s.student_id]||[]}));
}

function round2_(n) { return Math.round(n * 100) / 100; }

function isLegacyIntegrationStudent_(studentId) {
  const responses = findAll_('DIAGNOSTIC_RESPONSES',r=>r.student_id===studentId&&CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.includes(r.item_id));
  return responses.length>=CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.length&&responses.every(r=>String(r.answer).trim().toLowerCase()==='jawaban integrasi');
}

function validProfileForStudent_(studentId) {
  const profile = findOne_('DIAGNOSTIC_PROFILES', r => r.student_id === studentId);
  if (!profile) return null;
  const responses = findAll_('DIAGNOSTIC_RESPONSES', r => r.student_id === studentId && CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.includes(r.item_id));
  const legacy = responses.length >= CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.length && responses.every(r => String(r.answer).trim().toLowerCase() === 'jawaban integrasi');
  const scored = responses.filter(r => r.score !== '' && r.score !== null).length;
  if (!legacy && scored >= CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.length) return profile;
  return null;
}

function validProfilesForStudents_(studentIds) {
  const ids = new Set((studentIds || []).map(String));
  if (!ids.size) return {};
  const profiles = findAll_('DIAGNOSTIC_PROFILES', r => ids.has(String(r.student_id)));
  if (!profiles.length) return {};
  const profileMap = Object.fromEntries(profiles.map(p => [p.student_id, p]));
  const candidateIds = new Set(Object.keys(profileMap));
  const responsesByStudent = {};
  findAll_('DIAGNOSTIC_RESPONSES', r => candidateIds.has(String(r.student_id)) && CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.includes(r.item_id))
    .forEach(r => (responsesByStudent[r.student_id] || (responsesByStudent[r.student_id] = [])).push(r));
  const result = {};
  candidateIds.forEach(studentId => {
    const responses = responsesByStudent[studentId] || [];
    const legacy = responses.length >= CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.length && responses.every(r => String(r.answer).trim().toLowerCase() === 'jawaban integrasi');
    const scored = responses.filter(r => r.score !== '' && r.score !== null).length;
    if (!legacy && scored >= CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.length && profileMap[studentId]) {
      result[studentId] = profileMap[studentId];
    }
  });
  return result;
}

function generateTeams_(teacherSession, classId, options) {
  ensureTeacherClassAccess_(teacherSession,classId);
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
  const existingDrafts=findAll_('TEAMS',r=>r.class_id===classId&&r.status==='draft').sort((a,b)=>Number(b.version)-Number(a.version));
  if(existingDrafts.length){
    const version=existingDrafts[0].version,drafts=existingDrafts.filter(r=>String(r.version)===String(version));
    const studentMap=Object.fromEntries(rows_('MASTER_STUDENTS').map(s=>[s.student_id,s]));
    return {classId,balanceScore:Number(drafts[0].balance_score||0),reusedDraft:true,teams:drafts.map((t,i)=>({number:i+1,teamId:t.team_id,members:findAll_('TEAM_MEMBERS',m=>m.team_id===t.team_id).map(m=>studentMap[m.student_id]).filter(Boolean)}))};
  }
  const students = findAll_('MASTER_STUDENTS', r => r.class_id === classId && String(r.active).toLowerCase() === 'true');
  if (!students.length) throw new Error('Tidak ada siswa aktif pada kelas ini.');
  const profiles = validProfilesForStudents_(students.map(s=>s.student_id));
  const diagnosed = students.filter(s => profiles[s.student_id]);
  const count = Math.min(Number(options && options.teamCount || CONFIG.TEAM_COUNT), students.length);
  if (diagnosed.length < count) throw new Error('Team Builder membutuhkan minimal '+count+' profil lengkap sebagai calon Science Leader. Saat ini baru '+diagnosed.length+'.');
  const ranked = diagnosed.slice().sort((a,b)=>Number(profiles[b.student_id]?.leader_index||0)-Number(profiles[a.student_id]?.leader_index||0));
  const leaders = ranked.slice(0,count);
  const leaderIds=new Set(leaders.map(s=>s.student_id));
  const rest = students.filter(s=>!leaderIds.has(s.student_id)).sort((a,b)=>Number(profiles[b.student_id]?.overall_reasoning||0)-Number(profiles[a.student_id]?.overall_reasoning||0));
  const teams = Array.from({length:count},(_,i)=>({number:i+1,members:[leaders[i]]}));
  rest.forEach((s,i)=>{
    const round = Math.floor(i/count), pos = i%count;
    const index = round%2===0 ? pos : count-1-pos;
    teams[index].members.push(s);
  });
  improveTeamBalance_(teams,profiles);
  const means = teams.map(t=>t.members.reduce((n,s)=>n+Number(profiles[s.student_id]?.overall_reasoning||0),0)/t.members.length);
  const spread = Math.max(...means)-Math.min(...means);
  const balance = round2_(Math.max(0,100-(spread/4*100)));
  const version = Date.now();
  teams.forEach(t=>{
    const teamId = classId+'-T'+String(t.number).padStart(2,'0')+'-V'+version;
    const deputy=t.members.slice(1).sort((a,b)=>Number(profiles[b.student_id]?.leader_index||0)-Number(profiles[a.student_id]?.leader_index||0)||String(a.student_id).localeCompare(String(b.student_id)))[0]||null;
    append_('TEAMS',{team_id:teamId,class_id:classId,version,balance_score:balance,status:'draft',created_at:isoNow_(),created_by:teacherSession.actor_id});
    t.members.forEach((s,i)=>append_('TEAM_MEMBERS',{membership_id:teamId+'|'+s.student_id,team_id:teamId,student_id:s.student_id,role:i===0?'Scientist Leader':deputy&&s.student_id===deputy.student_id?'Deputy Scientist Leader':defaultRole_(i),is_leader:i===0,locked:false,override_note:''}));
    t.teamId=teamId;
  });
  audit_({type:'teacher',id:teacherSession.actor_id},'GENERATE_TEAMS','class',classId,{balance_score:balance});
  return {classId,balanceScore:balance,teams};
  } finally { lock.releaseLock(); }
}

function teamObjective_(teams,profiles){
  const spreads=[['overall_reasoning']].concat(CONFIG.DOMAINS.map(d=>[d])).map(([field])=>{
    const means=teams.map(t=>t.members.reduce((n,s)=>n+Number(profiles[s.student_id]?.[field]||0),0)/t.members.length);
    return Math.max.apply(null,means)-Math.min.apply(null,means);
  });
  return spreads[0]*2+spreads.slice(1).reduce((a,b)=>a+b,0)/CONFIG.DOMAINS.length;
}

function improveTeamBalance_(teams,profiles){
  let best=teamObjective_(teams,profiles);
  for(let pass=0;pass<3;pass++){
    let changed=false;
    for(let a=0;a<teams.length;a++)for(let b=a+1;b<teams.length;b++){
      for(let i=1;i<teams[a].members.length;i++)for(let j=1;j<teams[b].members.length;j++){
        const left=teams[a].members[i],right=teams[b].members[j];
        teams[a].members[i]=right;teams[b].members[j]=left;
        const candidate=teamObjective_(teams,profiles);
        if(candidate+0.0001<best){best=candidate;changed=true;}else{teams[a].members[i]=left;teams[b].members[j]=right;}
      }
    }
    if(!changed)break;
  }
}

function defaultRole_(i) { return ['Lab Operator','Data Recorder','Evidence Checker','Communicator'][(i-1)%4]; }

function overrideTeamMember_(session, payload) {
  const membership = findOne_('TEAM_MEMBERS', r => r.membership_id === payload.membershipId);
  if (!membership) throw new Error('Keanggotaan tidak ditemukan.');
  const team=findOne_('TEAMS',r=>r.team_id===membership.team_id);
  if(!team)throw new Error('Tim tidak ditemukan.');
  ensureTeacherClassAccess_(session,team.class_id);
  const updated = upsert_('TEAM_MEMBERS','membership_id',Object.assign({},membership,{role:payload.role || membership.role,locked:payload.locked === undefined ? membership.locked : payload.locked,override_note:payload.note || membership.override_note}));
  audit_({type:'teacher',id:session.actor_id},'OVERRIDE_TEAM_MEMBER','membership',payload.membershipId,{note:payload.note||''});
  return updated;
}

function dashboard_(session, classId) {
  ensureTeacherClassAccess_(session,classId);
  let students = findAll_('MASTER_STUDENTS', r=>r.class_id===classId && String(r.active).toLowerCase()==='true');
  if(typeof OFFICIAL_ROSTER_!=='undefined'){
    const rosterForClass=OFFICIAL_ROSTER_.filter(r=>r.class_id===classId&&r.active!==false);
    if(students.length < rosterForClass.length){
      const existingIds=new Set(students.map(r=>String(r.student_id)));
      const missing=rosterForClass.filter(r=>!existingIds.has(String(r.student_id)));
      if(missing.length>0){
        importOfficialStudents(missing);
        students = findAll_('MASTER_STUDENTS', r=>r.class_id===classId && String(r.active).toLowerCase()==='true');
      }
    }
  }
  const ids = new Set(students.map(s=>s.student_id));
  const progress = findAll_('PROGRESS',r=>ids.has(r.student_id));
  const profiles = validProfilesForStudents_(students.map(s=>s.student_id));
  const diagnosedCount=Object.keys(profiles).length;
  return {classId,studentCount:students.length,diagnosedCount,progressCount:progress.length,canGenerateTeams:students.length>0&&diagnosedCount>=Math.min(CONFIG.TEAM_COUNT,students.length),students:students.map(s=>({studentId:s.student_id,name:s.name,rollNo:s.roll_no,progress:progress.filter(p=>p.student_id===s.student_id),profile:profiles[s.student_id]||null}))};
}

function repairLegacyIntegrationArtifacts(){
  const student=findOne_('MASTER_STUDENTS',r=>r.class_id==='8A'&&Number(r.roll_no)===1);
  if(!student)throw new Error('Siswa 8A nomor 1 tidak ditemukan.');
  if(!isLegacyIntegrationStudent_(student.student_id))return {repaired:false,reason:'Pola jawaban integrasi tidak ditemukan. Data tidak diubah.'};
  const draftTeamIds=new Set(findAll_('TEAMS',r=>r.class_id==='8A'&&r.status==='draft'&&r.created_by==='TEACHER-TEST').map(r=>r.team_id));
  const summary={};
  summary.responses=deleteWhere_('DIAGNOSTIC_RESPONSES',r=>r.student_id===student.student_id&&CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.includes(r.item_id)&&String(r.answer).trim().toLowerCase()==='jawaban integrasi');
  summary.profiles=deleteWhere_('DIAGNOSTIC_PROFILES',r=>r.student_id===student.student_id);
  summary.progress=deleteWhere_('PROGRESS',r=>r.student_id===student.student_id&&['M0-QUICK','CH08-01-U01-LRN01'].includes(r.activity_id));
  summary.selfMap=deleteWhere_('SETTINGS',r=>r.key==='self_map|'+student.student_id);
  summary.teamMembers=deleteWhere_('TEAM_MEMBERS',r=>draftTeamIds.has(r.team_id));
  summary.teams=deleteWhere_('TEAMS',r=>draftTeamIds.has(r.team_id));
  audit_({type:'system',id:'repair-legacy-integration-v2'},'REPAIR_LEGACY_INTEGRATION','student',student.student_id,summary);
  return {repaired:true,student_id:student.student_id,summary};
}

function hasHoneypotTrigger_(text) {
  const t = String(text || '').toLowerCase();
  const keys = ['kekuatan bulan', 'chatgpt', 'gemini', 'claude', 'dola', 'openai', 'model:', 'seblak', 'boba', 'terlalu mengantuk', 'robot pintar', 'buku paket'];
  return keys.some(k => t.includes(k));
}

function publicLeaderboardData_(force) {
  const cache = CacheService.getScriptCache();
  if (!force) {
    const cached = cache.get('PUBLIC_LEADERBOARD_DATA_V2');
    if (cached) {
      try { return JSON.parse(cached); } catch(e) {}
    }
  }

  const students = findAll_('MASTER_STUDENTS', r => String(r.active).toLowerCase() === 'true');
  const studentIds = new Set(students.map(s => s.student_id));
  const studentClassMap = Object.fromEntries(students.map(s => [s.student_id, s.class_id]));

  const progressRows = findAll_('PROGRESS', r => studentIds.has(r.student_id));
  const quizRows = findAll_('QUIZ_ATTEMPTS', r => studentIds.has(r.student_id) && r.submitted_at);
  const diagResponses = findAll_('DIAGNOSTIC_RESPONSES', r => studentIds.has(r.student_id));
  const diagProfiles = Object.fromEntries(findAll_('DIAGNOSTIC_PROFILES', r => studentIds.has(r.student_id)).map(p => [p.student_id, p]));

  const classStats = {
    '8A': { total: 0, flagged: 0, studentCount: 0, completedTasks: 0 },
    '8B': { total: 0, flagged: 0, studentCount: 0, completedTasks: 0 },
    '8C': { total: 0, flagged: 0, studentCount: 0, completedTasks: 0 },
    '8D': { total: 0, flagged: 0, studentCount: 0, completedTasks: 0 },
    '8E': { total: 0, flagged: 0, studentCount: 0, completedTasks: 0 }
  };

  const studentProgressMap = {};
  const studentQuizMap = {};
  const studentFlagsMap = {};

  students.forEach(s => {
    const cId = s.class_id;
    if (cId && classStats[cId]) classStats[cId].studentCount++;
    studentProgressMap[s.student_id] = [];
    studentQuizMap[s.student_id] = [];
    studentFlagsMap[s.student_id] = { aiCount: 0, tabSwitches: 0, hasExtreme: false };
  });

  progressRows.forEach(p => {
    const cId = studentClassMap[p.student_id];
    if (cId && classStats[cId]) {
      classStats[cId].total++;
      if (p.status === 'completed' || p.status === 'verified') classStats[cId].completedTasks++;
    }
    if (studentProgressMap[p.student_id]) studentProgressMap[p.student_id].push(p);

    const evStr = String(p.evidence_json || '');
    if (evStr.includes('[PERINGATAN:') || hasHoneypotTrigger_(evStr)) {
      if (cId && classStats[cId]) classStats[cId].flagged++;
      if (studentFlagsMap[p.student_id]) {
        studentFlagsMap[p.student_id].aiCount++;
        const match = evStr.match(/Pindah Tab (\d+)x/);
        if (match) {
          const count = parseInt(match[1], 10) || 0;
          studentFlagsMap[p.student_id].tabSwitches += count;
          if (count >= 5) studentFlagsMap[p.student_id].hasExtreme = true;
        }
        if (hasHoneypotTrigger_(evStr)) studentFlagsMap[p.student_id].hasExtreme = true;
      }
    }
  });

  diagResponses.forEach(r => {
    const cId = studentClassMap[r.student_id];
    if (cId && classStats[cId]) classStats[cId].total++;
    const ans = String(r.answer || '');
    if (ans.includes('[PERINGATAN:') || hasHoneypotTrigger_(ans)) {
      if (cId && classStats[cId]) classStats[cId].flagged++;
      if (studentFlagsMap[r.student_id]) {
        studentFlagsMap[r.student_id].aiCount++;
        const match = ans.match(/Pindah Tab (\d+)x/);
        if (match) {
          const count = parseInt(match[1], 10) || 0;
          studentFlagsMap[r.student_id].tabSwitches += count;
          if (count >= 5) studentFlagsMap[r.student_id].hasExtreme = true;
        }
        if (hasHoneypotTrigger_(ans)) studentFlagsMap[r.student_id].hasExtreme = true;
      }
    }
  });

  quizRows.forEach(q => {
    const cId = studentClassMap[q.student_id];
    if (cId && classStats[cId]) {
      classStats[cId].completedTasks++; // count quiz submission as a completed task
    }
    if (studentQuizMap[q.student_id]) studentQuizMap[q.student_id].push(q);
  });

  const EXPECTED_TASKS_PER_STUDENT = 12; // Example: 3 cycles (LRN, LAB, CHL) = 9 + quizzes, etc. Let's say 12.

  const integrityIndex = Object.keys(classStats).map(cId => {
    const stat = classStats[cId];
    let percent = 100;
    if (stat.total > 0) {
      percent = Math.max(0, Math.round(((stat.total - stat.flagged) / stat.total) * 100));
    }
    
    let completionPercent = 0;
    if (stat.studentCount > 0) {
      completionPercent = Math.min(100, Math.round((stat.completedTasks / (stat.studentCount * EXPECTED_TASKS_PER_STUDENT)) * 100));
    }

    return {
      classId: cId,
      percent,
      completionPercent,
      totalSubmissions: stat.total,
      flaggedCount: stat.flagged
    };
  });

  const leaderboard = students.map(s => {
    const sId = s.student_id;
    const progs = studentProgressMap[sId] || [];
    const quizzes = studentQuizMap[sId] || [];
    const profile = diagProfiles[sId] || null;
    const flags = studentFlagsMap[sId] || { aiCount: 0, tabSwitches: 0, hasExtreme: false };

    let completedMissions = 0;
    let rawScore = 0;
    const badges = [];

    if (profile) {
      completedMissions++;
      if (String(profile.research_readiness || '').toLowerCase().includes('tinggi')) {
        badges.push({ icon: '🧠', name: 'Master of Logic' });
      } else {
        badges.push({ icon: '🔭', name: 'Curious Observer' });
      }
    }

    let perfectQuizzes = 0;
    progs.forEach(p => {
      if (p.activity_id === 'M0-QUICK') return;
      const isCompleted = p.status === 'completed' || p.status === 'verified';
      if (isCompleted) {
        completedMissions++;
        if (p.activity_id.includes('-LRN')) badges.push({ icon: '📚', name: 'Scholar' });
        if (p.activity_id.includes('-LAB')) badges.push({ icon: '🔬', name: 'Lab Researcher' });
      }
    });

    const passedQuizzes = new Set();
    quizzes.forEach(q => {
      const sc = Number(q.score) || 0;
      rawScore += sc;
      if (sc === 100) { badges.push({ icon: '💎', name: 'Diamond Mind' }); perfectQuizzes++; }
      else if (sc >= 90) badges.push({ icon: '🥇', name: 'Gold Mind' });
      else if (sc >= 80) badges.push({ icon: '🥈', name: 'Silver Mind' });
      const isPassed = String(q.passed).toLowerCase() === 'true' || sc >= (CONFIG.QUIZ_PASSING_SCORE || 70);
      if (isPassed && q.activity_id) {
        passedQuizzes.add(q.activity_id);
      }
    });

    completedMissions += passedQuizzes.size;
    if (passedQuizzes.size >= 1) badges.push({ icon: '🎓', name: 'Quiz Master' });

    if (completedMissions >= 1) badges.push({ icon: '🎯', name: 'First Blood' });
    if (completedMissions >= 3) badges.push({ icon: '🔥', name: 'Streak Master' });
    if (completedMissions >= 7) badges.push({ icon: '🚀', name: 'Hyperdrive' });
    if (perfectQuizzes >= 3) badges.push({ icon: '👑', name: 'Flawless Crown' });

    const uniqueBadges = [];
    const badgeNames = new Set();
    badges.forEach(b => {
      if (!badgeNames.has(b.name)) {
        badgeNames.add(b.name);
        uniqueBadges.push(b);
      }
    });

    let penalty = 0;
    if (flags.hasExtreme) {
      penalty = 150 + (flags.aiCount * 25);
    } else if (flags.aiCount > 0) {
      penalty = (flags.aiCount * 15) + Math.min(60, flags.tabSwitches * 5);
    }

    const netScore = Math.max(0, (completedMissions * 1000) + rawScore - penalty);

    return {
      studentId: sId,
      name: s.name,
      classId: s.class_id,
      rollNo: s.roll_no,
      completedMissions,
      rawScore,
      penalty,
      netScore,
      badges: uniqueBadges,
      isExtreme: flags.hasExtreme
    };
  });

  leaderboard.sort((a, b) => {
    if (b.netScore !== a.netScore) return b.netScore - a.netScore;
    if (a.penalty !== b.penalty) return a.penalty - b.penalty;
    if (b.completedMissions !== a.completedMissions) return b.completedMissions - a.completedMissions;
    return a.name.localeCompare(b.name);
  });

  leaderboard.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const result = {
    updatedAt: Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd MMM yyyy, HH:mm'),
    totalStudents: students.length,
    integrityIndex,
    topTen: leaderboard.slice(0, 10),
    roster: leaderboard
  };

  try {
    cache.put('PUBLIC_LEADERBOARD_DATA_V2', JSON.stringify(result), 90);
  } catch(e) {}

  return result;
}


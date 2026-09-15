function latestTeacherCheck_(studentId,activityId,checkType){
  const rows=findAll_('TEACHER_CHECKS',r=>r.student_id===studentId&&r.activity_id===activityId&&r.check_type===checkType);
  return rows.sort((a,b)=>Number(b.revision||0)-Number(a.revision||0)||String(b.checked_at).localeCompare(String(a.checked_at)))[0]||null;
}

function latestQuizAttempt_(studentId,activityId){
  return findAll_('QUIZ_ATTEMPTS',r=>r.student_id===studentId&&r.activity_id===activityId&&r.submitted_at).sort(compareMasteryAttempts_)[0]||null;
}

function compareMasteryAttempts_(a,b){
  const passedA=String(a.passed).toLowerCase()==='true'?1:0,passedB=String(b.passed).toLowerCase()==='true'?1:0;
  return passedB-passedA||Number(b.score||0)-Number(a.score||0)||Number(b.attempt_number||0)-Number(a.attempt_number||0);
}

function studentLearningContext_(studentId){
  const checks=findAll_('TEACHER_CHECKS',r=>r.student_id===studentId),attempts=findAll_('QUIZ_ATTEMPTS',r=>r.student_id===studentId&&r.submitted_at),overrides=findAll_('UNLOCK_OVERRIDES',r=>r.student_id===studentId);
  const latestChecks={};checks.forEach(x=>{const k=x.activity_id+'|'+x.check_type,p=latestChecks[k];if(!p||Number(x.revision||0)>Number(p.revision||0)||Number(x.revision||0)===Number(p.revision||0)&&String(x.checked_at)>String(p.checked_at))latestChecks[k]=x;});
  const latestAttempts={};attempts.forEach(x=>{const p=latestAttempts[x.activity_id];if(!p||compareMasteryAttempts_(x,p)<0)latestAttempts[x.activity_id]=x;});
  const latestOverrides={};overrides.forEach(x=>{const p=latestOverrides[x.activity_id];if(!p||String(x.created_at)>String(p.created_at))latestOverrides[x.activity_id]=x;});
  return {checks:latestChecks,attempts:latestAttempts,overrides:latestOverrides};
}

function contextCheck_(context,activityId,type){return context?context.checks[activityId+'|'+type]||null:null;}
function contextAttempt_(context,activityId){return context?context.attempts[activityId]||null:null;}
function contextOverride_(context,activityId){if(!context)return null;const x=context.overrides[activityId];return x?String(x.allowed).toLowerCase()==='true':null;}

function verifiedCheck_(studentId,activityId,type){ const x=latestTeacherCheck_(studentId,activityId,type);return !!x&&x.status==='verified'; }
function unlockOverride_(studentId,activityId){ const x=findAll_('UNLOCK_OVERRIDES',r=>r.student_id===studentId&&r.activity_id===activityId).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];return x?String(x.allowed).toLowerCase()==='true':null; }

function teamLearningContext_(studentId) {
  const memberships=findAll_('TEAM_MEMBERS',m=>m.student_id===studentId),teamIds=new Set(memberships.map(m=>m.team_id)),team=findAll_('TEAMS',t=>teamIds.has(t.team_id)).sort((a,b)=>Number(b.version)-Number(a.version))[0];
  if(!team) return null;
  const members=findAll_('TEAM_MEMBERS',m=>m.team_id===team.team_id);
  const studentIds=members.map(m=>m.student_id);
  const checks=findAll_('TEACHER_CHECKS',r=>studentIds.includes(r.student_id));
  const attempts=findAll_('QUIZ_ATTEMPTS',r=>studentIds.includes(r.student_id)&&r.submitted_at);
  const teamContext={};
  studentIds.forEach(id=>{teamContext[id]={checks:{},attempts:{}};});
  checks.forEach(x=>{if(!teamContext[x.student_id])return;const k=x.activity_id+'|'+x.check_type,p=teamContext[x.student_id].checks[k];if(!p||Number(x.revision||0)>Number(p.revision||0)||Number(x.revision||0)===Number(p.revision||0)&&String(x.checked_at)>String(p.checked_at))teamContext[x.student_id].checks[k]=x;});
  attempts.forEach(x=>{if(!teamContext[x.student_id])return;const p=teamContext[x.student_id].attempts[x.activity_id];if(!p||compareMasteryAttempts_(x,p)<0)teamContext[x.student_id].attempts[x.activity_id]=x;});
  const students=Object.fromEntries(findAll_('MASTER_STUDENTS',s=>studentIds.includes(s.student_id)).map(s=>[s.student_id,s]));
  return {teamId:team.team_id,members:studentIds.map(id=>({studentId:id,name:students[id]?students[id].name:id,checks:teamContext[id].checks,attempts:teamContext[id].attempts}))};
}

function unitState_(studentId,unit,index,units,context,teamContext){
  const previous=index>0?unitStateCore_(studentId,units[index-1],context):null;
  const override=context?contextOverride_(context,unit.learn_activity_id):unlockOverride_(studentId,unit.learn_activity_id);
  const contentUnlocked=override===true||index===0||(previous&&previous.materiSelesai);
  const summary=context?contextCheck_(context,unit.learn_activity_id,'summary'):latestTeacherCheck_(studentId,unit.learn_activity_id,'summary');
  const summaryVerified=!!summary&&summary.status==='verified';
  const quiz=context?contextAttempt_(context,unit.quiz_activity_id):latestQuizAttempt_(studentId,unit.quiz_activity_id);
  const quizPassed=!!quiz&&String(quiz.passed).toLowerCase()==='true';
  const materiSelesai=summaryVerified&&quizPassed;
  const practice=unit.practice_activity_id?(context?contextCheck_(context,unit.practice_activity_id,'practice'):latestTeacherCheck_(studentId,unit.practice_activity_id,'practice')):null;
  const practiceVerified=!unit.practice_activity_id||!unit.practice_required||(!!practice&&practice.status==='verified');
  
  let practiceUnlocked=false,laggingMembers=[];
  if(unit.practice_activity_id){
    if(teamContext){
      let allCleared=true;
      teamContext.members.forEach(m=>{
        const mSummary=m.checks[unit.learn_activity_id+'|summary'],mQuiz=m.attempts[unit.quiz_activity_id];
        const mSumVer=!!mSummary&&mSummary.status==='verified',mQuizPass=!!mQuiz&&String(mQuiz.passed).toLowerCase()==='true';
        if(!(mSumVer&&mQuizPass)){allCleared=false;if(m.studentId!==studentId)laggingMembers.push(m.name);}
      });
      practiceUnlocked=allCleared&&materiSelesai;
    }
  }

  const complete=contentUnlocked&&summaryVerified&&quizPassed&&practiceVerified;
  const learningStatus=complete?'completed':practice&&practice.status==='needs_revision'?'needs_revision':practiceUnlocked&&unit.practice_activity_id?'practice_ready':summaryVerified?'quiz_ready':contentUnlocked?'reading':'locked';
  return {contentUnlocked,summary:summary||null,summaryVerified,quiz:quiz||null,quizPassed,materiSelesai,practice:practice||null,practiceVerified,practiceUnlocked,laggingMembers,complete,learningStatus};
}

function unitStateCore_(studentId,unit,context){
  const summary=context?contextCheck_(context,unit.learn_activity_id,'summary'):latestTeacherCheck_(studentId,unit.learn_activity_id,'summary'),summaryVerified=!!summary&&summary.status==='verified';
  const quiz=context?contextAttempt_(context,unit.quiz_activity_id):latestQuizAttempt_(studentId,unit.quiz_activity_id),quizPassed=!!quiz&&String(quiz.passed).toLowerCase()==='true';
  const practice=context&&unit.practice_activity_id?contextCheck_(context,unit.practice_activity_id,'practice'):unit.practice_activity_id?latestTeacherCheck_(studentId,unit.practice_activity_id,'practice'):null,practiceVerified=!unit.practice_activity_id||!unit.practice_required||!!practice&&practice.status==='verified';
  return {materiSelesai:summaryVerified&&quizPassed,complete:summaryVerified&&quizPassed&&practiceVerified};
}

function learningHome_(session){
  const studentId=session.actor_id,units=allLearningUnits_(),context=studentLearningContext_(studentId),teamContext=teamLearningContext_(studentId);
  const chapters=LEARNING_PATH_.map(chapter=>Object.assign({},chapter,{units:chapter.units.map(unit=>{
    const globalIndex=units.findIndex(x=>x.unit_id===unit.unit_id),state=unitState_(studentId,unit,globalIndex,units,context,teamContext);
    return Object.assign({},unit,{state});
  })}));
  return {chapters,outline:SEMESTER_OUTLINE_,semesterCard:semesterCardData_(studentId,CONFIG.CURRENT_SEMESTER,context),teamProgress:studentTeamProgress_(studentId)};
}

function learningUnitForStudent_(session,unitId){
  const units=allLearningUnits_(),index=units.findIndex(x=>x.unit_id===unitId);
  if(index<0)throw new Error('Submateri tidak ditemukan.');
  const unit=units[index],state=unitState_(session.actor_id,unit,index,units,studentLearningContext_(session.actor_id),teamLearningContext_(session.actor_id));
  if(!state.contentUnlocked)throw new Error('Submateri masih terkunci. Selesaikan tahap sebelumnya.');
  return Object.assign({},unit,{illustration_svg:learningIllustration_(unit.illustration),practice_preview:practiceCatalogItem_(unit.practice_activity_id),confusion_signal:studentConfusionSignal_(session.actor_id,unit.unit_id),state});
}

function studentConfusionSignal_(studentId,unitId){
  const row=findOne_('SETTINGS',item=>item.key==='confusion|'+studentId+'|'+unitId);
  if(!row)return null;try{return JSON.parse(String(row.value||'{}'));}catch(e){return null;}
}

function saveConfusionSignal_(session,unitId,category){
  const allowed=new Set(['concept','term','calculation','practice','clear']),unit=allLearningUnits_().find(item=>item.unit_id===unitId);
  if(!unit)throw new Error('Submateri tidak ditemukan.');
  if(!allowed.has(category))throw new Error('Pilihan kesulitan tidak valid.');
  const value={category,updatedAt:isoNow_()},key='confusion|'+session.actor_id+'|'+unitId;
  upsert_('SETTINGS','key',{key,value:JSON.stringify(value),updated_at:value.updatedAt});
  audit_({type:'student',id:session.actor_id},'SAVE_CONFUSION_SIGNAL','student_unit',session.actor_id+'|'+unitId,{category});
  return value;
}

function submitSummaryForReview_(session,unitId){
  const units=allLearningUnits_(),index=units.findIndex(unit=>unit.unit_id===unitId);
  if(index<0)throw new Error('Submateri tidak ditemukan.');
  const unit=units[index],state=unitState_(session.actor_id,unit,index,units,studentLearningContext_(session.actor_id));
  if(!state.contentUnlocked)throw new Error('Submateri masih terkunci.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const latest=latestTeacherCheck_(session.actor_id,unit.learn_activity_id,'summary');
    if(latest&&latest.status==='verified')return {status:'verified',alreadySubmitted:true,submittedAt:latest.checked_at};
    if(latest&&latest.status==='pending_review')return {status:'pending_review',alreadySubmitted:true,submittedAt:latest.checked_at};
    const revision=Number(latest?latest.revision:0)+1,submittedAt=isoNow_(),checkId=uid_('CHK');
    append_('TEACHER_CHECKS',{check_id:checkId,student_id:session.actor_id,activity_id:unit.learn_activity_id,check_type:'summary',status:'pending_review',score:'',note:'Siswa melaporkan rangkuman di buku siap diperiksa.',checked_by:'',checked_at:submittedAt,revision});
    audit_({type:'student',id:session.actor_id},'SUBMIT_SUMMARY_REVIEW','student_activity',session.actor_id+'|'+unit.learn_activity_id,{unit_id:unit.unit_id,revision});
    return {status:'pending_review',alreadySubmitted:false,submittedAt};
  }finally{lock.releaseLock();}
}

function teacherLearningCatalog_(session){
  return {chapters:LEARNING_PATH_.map(chapter=>({chapter_id:chapter.chapter_id,semester:chapter.semester,order:chapter.order,title:chapter.title,tagline:chapter.tagline,units:chapter.units.map(unit=>({unit_id:unit.unit_id,order:unit.order,title:unit.title,summary:unit.summary}))}))};
}

function teacherLearningUnit_(session,unitId){
  const unit=allLearningUnits_().find(x=>x.unit_id===unitId);
  if(!unit)throw new Error('Submateri tidak ditemukan.');
  return Object.assign({},unit,{illustration_svg:learningIllustration_(unit.illustration),practice_preview:practiceCatalogItem_(unit.practice_activity_id),preview:true});
}

function sampledQuizItemsForAttempt_(allItems, studentId, attemptNumber) {
  if (!allItems || allItems.length <= 5) return allItems || [];
  const seed = String(studentId) + '|' + String(attemptNumber) + '|' + String(allItems[0].activity_id);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash * 31) + seed.charCodeAt(i)) >>> 0;
  const minCount = Math.min(5, allItems.length);
  const maxCount = Math.min(8, allItems.length);
  const targetCount = minCount + (hash % (maxCount - minCount + 1));
  const catalog = typeof allQuizItems_ === 'function' ? allQuizItems_() : [];
  const levelMap = {};
  catalog.forEach(ci => { if (ci.quiz_item_id) levelMap[ci.quiz_item_id] = ci.level; });
  const lots = [], mots = [], hots = [], rest = [];
  allItems.forEach((item, idx) => {
    let lvl = item.level || levelMap[item.quiz_item_id];
    if (!lvl) {
      try { const fb = JSON.parse(item.feedback_json || '{}'); if (fb.level) lvl = fb.level; } catch(e) {}
    }
    if (!lvl) {
      lvl = (idx === 0 || idx === 1 || idx === 6 || idx === 7) ? 'LOTS' : (idx === 2 || idx === 4 || idx === 8) ? 'MOTS' : 'HOTS';
    }
    item.level = lvl;
    if (lvl === 'LOTS') lots.push(item);
    else if (lvl === 'MOTS') mots.push(item);
    else if (lvl === 'HOTS') hots.push(item);
    else rest.push(item);
  });
  const sLots = stableShuffle_(lots, seed + '|lots');
  const sMots = stableShuffle_(mots, seed + '|mots');
  const sHots = stableShuffle_(hots, seed + '|hots');
  const selected = [];
  function pick(pool) {
    if (pool.length > 0 && selected.length < targetCount) {
      selected.push(pool.shift());
    }
  }
  if (targetCount >= 7) {
    pick(sLots); pick(sLots); pick(sMots); pick(sMots); pick(sHots); pick(sHots);
  } else if (targetCount >= 5) {
    pick(sLots); pick(sLots); pick(sMots); pick(sMots); pick(sHots);
  } else if (targetCount === 4) {
    pick(sLots); pick(sMots); pick(sMots); pick(sHots);
  } else {
    pick(sLots); pick(sMots); pick(sHots);
  }
  const remainder = sLots.concat(sMots).concat(sHots).concat(rest);
  while (selected.length < targetCount && remainder.length > 0) {
    selected.push(remainder.shift());
  }
  return stableShuffle_(selected, seed + '|order');
}

function startQuiz_(session,activityId){
  const units=allLearningUnits_(),index=units.findIndex(x=>x.quiz_activity_id===activityId);
  if(index<0)throw new Error('Kuis tidak ditemukan.');
  const unit=units[index],state=unitState_(session.actor_id,unit,index,units,studentLearningContext_(session.actor_id));
  if(!state.contentUnlocked)throw new Error('Kuis belum dapat dibuka karena submateri sebelumnya belum selesai.');
  if(!verifiedCheck_(session.actor_id,unit.learn_activity_id,'summary')&&unlockOverride_(session.actor_id,activityId)!==true)throw new Error('Kuis terbuka setelah rangkuman diperiksa guru.');
  let attemptNumber, attemptId;
  const lock=LockService.getScriptLock();
  lock.waitLock(10000);
  try{
    const previous=findAll_('QUIZ_ATTEMPTS',r=>r.student_id===session.actor_id&&r.activity_id===activityId);
    const unfinished=previous.filter(x=>!x.submitted_at).sort((a,b)=>Number(b.attempt_number)-Number(a.attempt_number))[0];
    attemptNumber=unfinished?Number(unfinished.attempt_number):previous.length+1;
    attemptId=unfinished?unfinished.attempt_id:uid_('QAT');
    if(!unfinished)append_('QUIZ_ATTEMPTS',{attempt_id:attemptId,student_id:session.actor_id,activity_id:activityId,attempt_number:attemptNumber,score:'',passed:false,started_at:isoNow_(),submitted_at:''});
  }finally{
    lock.releaseLock();
  }

  let allItems=findAll_('QUIZ_ITEMS',r=>r.activity_id===activityId&&String(r.active).toLowerCase()==='true');
  const catalogItems=allQuizItems_().filter(r=>r.activity_id===activityId&&String(r.active).toLowerCase()==='true');
  if(!allItems.length || allItems.length < catalogItems.length){
    allItems = catalogItems.map(item => ({
      quiz_item_id: item.quiz_item_id,
      activity_id: item.activity_id,
      question_type: item.question_type,
      prompt: item.prompt,
      options_json: JSON.stringify(item.options),
      answer_json: JSON.stringify(item.answer),
      feedback_json: JSON.stringify({ default: item.feedback }),
      max_score: item.max_score,
      active: item.active,
      level: item.level
    }));
  }
  if(!allItems.length)throw new Error('Bank soal belum tersedia.');
  const sampled=sampledQuizItemsForAttempt_(allItems,session.actor_id,attemptNumber);
  const items=sampled.map(item=>{
    const {answer_json,feedback_json,options_json,...safe}=item;
    return Object.assign({},safe,{level:item.level||'MOTS',options:quizOptionsForAttempt_(item,session.actor_id,attemptNumber).map(option=>option.text)});
  });
  const timeLimitSeconds = items.length * 90;
  const tabTolerance = Math.floor(items.length / 2);
  return {attemptId,attemptNumber,items,timeLimitSeconds,tabTolerance};
}

function submitQuiz_(session,payload){
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const attempt=findOne_('QUIZ_ATTEMPTS',r=>r.attempt_id===payload.attemptId&&r.student_id===session.actor_id);
    if(!attempt)throw new Error('Percobaan kuis tidak ditemukan.');
    if(attempt.submitted_at)return {score:Number(attempt.score),passed:String(attempt.passed).toLowerCase()==='true',alreadySubmitted:true};
    let allItems=findAll_('QUIZ_ITEMS',r=>r.activity_id===attempt.activity_id&&String(r.active).toLowerCase()==='true');
    const catalogItems=allQuizItems_().filter(r=>r.activity_id===attempt.activity_id&&String(r.active).toLowerCase()==='true');
    if(!allItems.length || allItems.length < catalogItems.length){
      allItems = catalogItems.map(item => ({
        quiz_item_id: item.quiz_item_id,
        activity_id: item.activity_id,
        question_type: item.question_type,
        prompt: item.prompt,
        options_json: JSON.stringify(item.options),
        answer_json: JSON.stringify(item.answer),
        feedback_json: JSON.stringify({ default: item.feedback }),
        max_score: item.max_score,
        active: item.active,
        level: item.level
      }));
    }
    const items=sampledQuizItemsForAttempt_(allItems,session.actor_id,attempt.attempt_number);
    const answers=Object.fromEntries((payload.answers||[]).map(x=>[x.itemId,x.answer]));
    if(items.some(x=>answers[x.quiz_item_id]===undefined))throw new Error('Semua soal kuis perlu dijawab.');
    let earned=0,total=0,reviewItems=[];
    items.forEach(item=>{
      const expected=Number(JSON.parse(item.answer_json)),actual=Number(answers[item.quiz_item_id]),shuffled=quizOptionsForAttempt_(item,session.actor_id,attempt.attempt_number);
      if(!Number.isInteger(actual)||actual<0||actual>=shuffled.length)throw new Error('Pilihan jawaban tidak valid.');
      const originalIndex=shuffled[actual].originalIndex,point=originalIndex===expected?Number(item.max_score||1):0;
      total+=Number(item.max_score||1);earned+=point;
      append_('QUIZ_RESPONSES',{response_id:attempt.attempt_id+'|'+item.quiz_item_id,attempt_id:attempt.attempt_id,quiz_item_id:item.quiz_item_id,answer_json:JSON.stringify(originalIndex),score:point,feedback_code:point?'correct':'review'});
      if(!point){const feedback=JSON.parse(item.feedback_json||'{}');reviewItems.push({itemId:item.quiz_item_id,prompt:item.prompt,feedback:feedback.default||'Pelajari kembali konsep yang terkait dengan soal ini.'});}
    });
    const rawScore=Math.round(earned/Math.max(1,total)*100);
    const passed=rawScore>=CONFIG.QUIZ_PASSING_SCORE;

    // Speed bonus calculation (accuracy scaled)
    const timeRemaining = Math.max(0, Number(payload.timeRemaining || 0));
    const totalTime = items.length * 90;
    let speedBonus = 0;
    if (passed && rawScore >= CONFIG.QUIZ_PASSING_SCORE && timeRemaining > 0 && totalTime > 0) {
      speedBonus = Math.round((timeRemaining / totalTime) * 10 * (rawScore / 100));
      speedBonus = Math.max(0, Math.min(10, speedBonus));
    }

    // Tab penalty calculation (20% penalty if tolerance exceeded or forced locked)
    const tabTolerance = Math.floor(items.length / 2);
    const tabSwitchCount = Number(payload.tabSwitchCount || 0);
    const isPenalized = payload.forcedLocked || tabSwitchCount > tabTolerance;
    let penalty = 0;
    if (isPenalized) {
      penalty = Math.round(rawScore * 0.20);
    }

    const finalScore = Math.max(0, Math.min(100, rawScore + speedBonus - penalty));
    const finalPassed = finalScore >= CONFIG.QUIZ_PASSING_SCORE;

    upsert_('QUIZ_ATTEMPTS','attempt_id',Object.assign({},attempt,{score:finalScore,passed:finalPassed,submitted_at:isoNow_()}));
    try { CacheService.getScriptCache().remove('PUBLIC_LEADERBOARD_DATA_V2'); } catch(e) {}
    audit_({type:'student',id:session.actor_id},'SUBMIT_QUIZ','quiz_attempt',attempt.attempt_id,{activity_id:attempt.activity_id,score:finalScore,rawScore,speedBonus,penalty,passed:finalPassed,itemCount:items.length});
    return {score:finalScore,rawScore,speedBonus,penalty,passed:finalPassed,passingScore:CONFIG.QUIZ_PASSING_SCORE,reviewItems};
  }finally{lock.releaseLock();}
}

function stableShuffle_(items,seed){
  const out=items.slice();let n=0;for(let i=0;i<seed.length;i++)n=(n*31+seed.charCodeAt(i))>>>0;
  for(let i=out.length-1;i>0;i--){n=(1664525*n+1013904223)>>>0;const j=n%(i+1);[out[i],out[j]]=[out[j],out[i]];}
  return out;
}

function quizOptionsForAttempt_(item,studentId,attemptNumber){
  const options=JSON.parse(item.options_json||'[]').map((text,originalIndex)=>({text,originalIndex}));
  return stableShuffle_(options,String(studentId)+'|'+String(attemptNumber)+'|'+String(item.quiz_item_id)+'|options');
}

function teacherLearningDashboard_(session,classId,activityId,checkType){
  ensureTeacherClassAccess_(session,classId);
  const activities=allLearningUnits_().flatMap(u=>[{activityId:u.learn_activity_id,title:u.title+' - Rangkuman',checkType:'summary'}].concat(u.practice_activity_id?[{activityId:u.practice_activity_id,title:u.title+' - Praktik/LKPD',checkType:'practice'}]:[]));
  const selectedActivity=activities.find(x=>x.activityId===activityId&&x.checkType===checkType)||activities[0];
  activityId=selectedActivity?selectedActivity.activityId:'';checkType=selectedActivity?selectedActivity.checkType:'summary';
  const students=findAll_('MASTER_STUDENTS',r=>r.class_id===classId&&String(r.active).toLowerCase()==='true').sort((a,b)=>Number(a.roll_no)-Number(b.roll_no));
  const studentIds=new Set(students.map(s=>s.student_id)),latestChecks={},latestAttempts={},unit=allLearningUnits_().find(u=>u.learn_activity_id===activityId||u.practice_activity_id===activityId),quizActivityId=unit?unit.quiz_activity_id:'';
  findAll_('TEACHER_CHECKS',r=>studentIds.has(r.student_id)&&r.activity_id===activityId&&r.check_type===checkType).forEach(x=>{const p=latestChecks[x.student_id];if(!p||Number(x.revision||0)>Number(p.revision||0)||Number(x.revision||0)===Number(p.revision||0)&&String(x.checked_at)>String(p.checked_at))latestChecks[x.student_id]=x;});
  findAll_('QUIZ_ATTEMPTS',r=>studentIds.has(r.student_id)&&r.activity_id===quizActivityId&&r.submitted_at).forEach(x=>{const p=latestAttempts[x.student_id];if(!p||compareMasteryAttempts_(x,p)<0)latestAttempts[x.student_id]=x;});
  const confusionRows=unit?findAll_('SETTINGS',row=>String(row.key).startsWith('confusion|')&&String(row.key).endsWith('|'+unit.unit_id)&&studentIds.has(String(row.key).split('|')[1])):[],confusionSummary={concept:0,term:0,calculation:0,practice:0,clear:0};
  confusionRows.forEach(row=>{try{const category=JSON.parse(String(row.value||'{}')).category;if(confusionSummary[category]!==undefined)confusionSummary[category]++;}catch(e){}});
  return {classId,activityId,checkType,activities,selectedActivity,confusionSummary,students:students.map(s=>({studentId:s.student_id,name:s.name,rollNo:s.roll_no,check:latestChecks[s.student_id]||null,quiz:latestAttempts[s.student_id]||null}))};
}

function saveTeacherChecks_(session,payload){
  ensureTeacherClassAccess_(session,payload.classId);
  const allowedStatus=new Set(['verified','needs_revision','not_checked']),allowedType=new Set(['summary','practice','worksheet','reflection']);
  if(!allowedStatus.has(payload.status)||!allowedType.has(payload.checkType))throw new Error('Status pemeriksaan tidak valid.');
  const ids=new Set(findAll_('MASTER_STUDENTS',r=>r.class_id===payload.classId&&String(r.active).toLowerCase()==='true').map(r=>r.student_id));
  const score=payload.score===''||payload.score===undefined?'':Number(payload.score);
  if(score!==''&&(!Number.isFinite(score)||score<0||score>100))throw new Error('Nilai harus 0-100.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const saved=[];
    (payload.studentIds||[]).forEach(studentId=>{
      if(!ids.has(studentId))throw new Error('Siswa di luar kelas tidak dapat diperiksa.');
      const latest=latestTeacherCheck_(studentId,payload.activityId,payload.checkType),revision=Number(latest?latest.revision:0)+1,checkId=uid_('CHK');
      const row={check_id:checkId,student_id:studentId,activity_id:payload.activityId,check_type:payload.checkType,status:payload.status,score,note:String(payload.note||''),checked_by:session.actor_id,checked_at:isoNow_(),revision};
      append_('TEACHER_CHECKS',row);saved.push(row);
      if(payload.checkType==='practice')syncPracticeSkills_(studentId,payload.activityId,payload.status,'',checkId,session.actor_id,row.checked_at);
      audit_({type:'teacher',id:session.actor_id},'TEACHER_CHECK','student_activity',studentId+'|'+payload.activityId,{check_type:payload.checkType,status:payload.status,score,revision});
    });
    return {saved:saved.length};
  }finally{lock.releaseLock();}
}

function saveUnlockOverrides_(session,payload){
  ensureTeacherClassAccess_(session,payload.classId);
  const ids=new Set(findAll_('MASTER_STUDENTS',r=>r.class_id===payload.classId&&String(r.active).toLowerCase()==='true').map(r=>r.student_id));
  const unit=allLearningUnits_().find(u=>u.learn_activity_id===payload.activityId||u.quiz_activity_id===payload.activityId||u.practice_activity_id===payload.activityId);if(!unit)throw new Error('Aktivitas belajar tidak ditemukan.');
  const targets=[unit.learn_activity_id,unit.quiz_activity_id].concat(unit.practice_activity_id?[unit.practice_activity_id]:[]);
  (payload.studentIds||[]).forEach(studentId=>{
    if(!ids.has(studentId))throw new Error('Siswa di luar kelas tidak dapat diberi pengecualian.');
    targets.forEach(activityId=>append_('UNLOCK_OVERRIDES',{override_id:uid_('OVR'),student_id:studentId,activity_id:activityId,allowed:payload.allowed!==false,reason:String(payload.reason||'Penyesuaian guru'),created_by:session.actor_id,created_at:isoNow_()}));
    audit_({type:'teacher',id:session.actor_id},'UNLOCK_OVERRIDE','student_activity',studentId+'|'+unit.unit_id,{allowed:payload.allowed!==false,reason:String(payload.reason||'')});
  });
  return {saved:(payload.studentIds||[]).length};
}

function practiceSkills_(activityId){
  const core=['observe','predict','record_data','analyze','conclude'];
  return activityId.includes('CHL')?core.concat(['ask','plan','improve','communicate']):core.concat(['measure','safety','collaborate']);
}

function syncPracticeSkills_(studentId,activityId,status,teamId,sourceId,teacherId,checkedAt){
  practiceSkills_(activityId).forEach(skill=>upsert_('SKILL_EVIDENCE','evidence_id',{evidence_id:studentId+'|'+activityId+'|'+skill,student_id:studentId,activity_id:activityId,team_id:teamId||'',skill_code:skill,source_type:teamId?'group_lab':'teacher_check',source_id:sourceId,status,verified_by:teacherId,verified_at:checkedAt}));
}

function semesterCardData_(studentId,semester,context){
  context=context||studentLearningContext_(studentId);
  const units=allLearningUnits_().filter(u=>Number(u.semester)===Number(semester));
  const outline=SEMESTER_OUTLINE_.find(x=>Number(x.semester)===Number(semester)),chapterCount=new Set(units.map(x=>x.chapter_id)).size,curriculumComplete=!!outline&&chapterCount>=outline.chapters.length;
  const details=units.map(u=>{const summary=contextCheck_(context,u.learn_activity_id,'summary'),quiz=contextAttempt_(context,u.quiz_activity_id),practice=u.practice_activity_id?contextCheck_(context,u.practice_activity_id,'practice'):null;return {unitId:u.unit_id,title:u.title,summaryStatus:summary?summary.status:'not_checked',summaryScore:summary?summary.score:'',quizScore:quiz?quiz.score:'',quizPassed:!!quiz&&String(quiz.passed).toLowerCase()==='true',practiceStatus:u.practice_activity_id?(practice?practice.status:u.practice_required?'not_checked':'optional'):'not_required',practiceScore:practice?practice.score:'',complete:!!summary&&summary.status==='verified'&&!!quiz&&String(quiz.passed).toLowerCase()==='true'&&(!u.practice_activity_id||!u.practice_required||(!!practice&&practice.status==='verified'))};});
  const skills=[...new Set(findAll_('SKILL_EVIDENCE',r=>r.student_id===studentId&&r.status==='verified').map(r=>r.skill_code))];
  return {semester,eligible:curriculumComplete&&details.length>0&&details.every(x=>x.complete),curriculumComplete,remainingChapters:outline?outline.chapters.slice(chapterCount):[],skills,details};
}

function saveGroupLab_(session,payload){
  const team=findOne_('TEAMS',r=>r.team_id===payload.teamId);if(!team)throw new Error('Tim tidak ditemukan.');
  ensureTeacherClassAccess_(session,team.class_id);
  const unit=allLearningUnits_().find(u=>u.practice_activity_id===payload.activityId);if(!unit)throw new Error('Aktivitas praktik tidak ditemukan.');
  const activity=findOne_('MASTER_ACTIVITIES',r=>r.activity_id===payload.activityId&&String(r.active).toLowerCase()==='true');if(!activity)throw new Error('Aktivitas praktik belum aktif.');
  const status=payload.status||'submitted';if(!new Set(['submitted','verified','needs_revision']).has(status))throw new Error('Status praktik tim tidak valid.');
  const score=payload.score===''||payload.score===undefined?'':Number(payload.score);if(score!==''&&(!Number.isFinite(score)||score<0||score>100))throw new Error('Nilai tim harus 0-100.');
  const activeStudents=new Set(findAll_('MASTER_STUDENTS',r=>r.class_id===team.class_id&&String(r.active).toLowerCase()==='true').map(r=>r.student_id));
  const members=findAll_('TEAM_MEMBERS',r=>r.team_id===team.team_id&&activeStudents.has(r.student_id));if(!members.length)throw new Error('Tim belum memiliki anggota aktif.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const id=payload.teamId+'|'+payload.activityId,checkedAt=isoNow_(),existing=findOne_('GROUP_LAB',r=>r.lab_result_id===id);
    if(existing&&existing.status===status&&String(existing.score)===String(score)&&String(existing.teacher_note||'')===String(payload.note||''))return Object.assign({},existing,{membersUpdated:0,unchanged:true});
    let previousResult={};try{previousResult=existing?JSON.parse(String(existing.result_json||'{}')):{}}catch(e){}
    const row={lab_result_id:id,class_id:team.class_id,activity_id:payload.activityId,team_id:payload.teamId,status,score,result_json:JSON.stringify(Object.assign({},previousResult,payload.result||{})),teacher_note:String(payload.note||''),updated_at:checkedAt,updated_by:session.actor_id};
    upsert_('GROUP_LAB','lab_result_id',row);
    let membersUpdated=0;
    if(status==='verified'||status==='needs_revision')members.forEach(member=>{
      const latest=latestTeacherCheck_(member.student_id,payload.activityId,'practice'),revision=Number(latest?latest.revision:0)+1,checkId=uid_('CHK');
      append_('TEACHER_CHECKS',{check_id:checkId,student_id:member.student_id,activity_id:payload.activityId,check_type:'practice',status,score,note:'Tim '+team.team_id+(payload.note?': '+String(payload.note):''),checked_by:session.actor_id,checked_at:checkedAt,revision});
      syncPracticeSkills_(member.student_id,payload.activityId,status,team.team_id,checkId,session.actor_id,checkedAt);membersUpdated++;
    });
    audit_({type:'teacher',id:session.actor_id},'UPSERT_GROUP_LAB','group_lab',id,{status:row.status,score,members_updated:membersUpdated});
    return Object.assign({},row,{membersUpdated});
  }finally{lock.releaseLock();}
}

function groupLabDashboard_(session,classId,activityId){
  ensureTeacherClassAccess_(session,classId);
  const versions=findAll_('TEAMS',r=>r.class_id===classId).sort((a,b)=>Number(b.version)-Number(a.version)),version=versions[0]?versions[0].version:null,teams=versions.filter(r=>String(r.version)===String(version)),students=Object.fromEntries(findAll_('MASTER_STUDENTS',r=>r.class_id===classId).map(s=>[s.student_id,s]));
  return {classId,activityId,activities:allLearningUnits_().filter(u=>u.practice_activity_id).map(u=>({activityId:u.practice_activity_id,title:u.title})),teams:teams.map(t=>({teamId:t.team_id,result:findOne_('GROUP_LAB',r=>r.team_id===t.team_id&&r.activity_id===activityId),members:findAll_('TEAM_MEMBERS',m=>m.team_id===t.team_id).map(m=>Object.assign({},m,{name:students[m.student_id]?students[m.student_id].name:m.student_id}))}))};
}

function studentTeamProgress_(studentId){
  const memberships=findAll_('TEAM_MEMBERS',m=>m.student_id===studentId),teamIds=new Set(memberships.map(m=>m.team_id)),teams=findAll_('TEAMS',t=>teamIds.has(t.team_id)).sort((a,b)=>Number(b.version)-Number(a.version));
  if(!teams.length)return null;const team=teams[0];return {teamId:team.team_id,status:team.status,results:findAll_('GROUP_LAB',r=>r.team_id===team.team_id).map(r=>({activityId:r.activity_id,status:r.status,score:r.score,teacherNote:r.teacher_note}))};
}

function semesterCard_(session,semester){
  const student=findOne_('MASTER_STUDENTS',r=>r.student_id===session.actor_id),card=semesterCardData_(session.actor_id,semester);
  return Object.assign({student:{name:student.name,classId:student.class_id,rollNo:student.roll_no},schoolYear:CONFIG.SCHOOL_YEAR,generatedAt:isoNow_(),eligible:card.eligible},card);
}

function practiceTeamForStudent_(studentId){
  const memberships=findAll_('TEAM_MEMBERS',m=>m.student_id===studentId),teamIds=new Set(memberships.map(m=>m.team_id)),team=findAll_('TEAMS',t=>teamIds.has(t.team_id)).sort((a,b)=>Number(b.version)-Number(a.version))[0];
  if(!team)return null;
  const members=findAll_('TEAM_MEMBERS',m=>m.team_id===team.team_id),studentIds=members.map(m=>m.student_id),profiles=validProfilesForStudents_(studentIds),students=Object.fromEntries(findAll_('MASTER_STUDENTS',s=>studentIds.includes(s.student_id)).map(s=>[s.student_id,s]));
  const leader=members.find(m=>String(m.is_leader).toLowerCase()==='true')||members.find(m=>m.role==='Scientist Leader')||members[0],storedDeputy=members.find(m=>m.role==='Deputy Scientist Leader');
  const deputy=storedDeputy||members.filter(m=>!leader||m.student_id!==leader.student_id).sort((a,b)=>Number(profiles[b.student_id]?.leader_index||0)-Number(profiles[a.student_id]?.leader_index||0)||String(a.student_id).localeCompare(String(b.student_id)))[0]||null;
  return {team,leaderId:leader?leader.student_id:'',deputyId:deputy?deputy.student_id:'',members:members.map(m=>({studentId:m.student_id,name:students[m.student_id]?students[m.student_id].name:m.student_id,role:m.student_id===(leader&&leader.student_id)?'Scientist Leader':m.student_id===(deputy&&deputy.student_id)?'Deputy Scientist Leader':m.role}))};
}

function studentTeamWithProgress_(studentId){
  const teamInfo=practiceTeamForStudent_(studentId);
  if(!teamInfo)return null;
  const memberIds=teamInfo.members.map(m=>m.studentId);
  if(!memberIds.length)return null;

  const checks=findAll_('TEACHER_CHECKS',r=>memberIds.includes(r.student_id)&&r.check_type==='summary'&&r.status==='verified');
  const quizzes=findAll_('QUIZ_ATTEMPTS',r=>memberIds.includes(r.student_id)&&r.submitted_at&&(String(r.passed).toLowerCase()==='true'||Number(r.score)>=70));

  const memberProgress={};
  memberIds.forEach(id=>{memberProgress[id]={summaryUnits:new Set(),quizUnits:new Set()};});
  checks.forEach(c=>{if(memberProgress[c.student_id])memberProgress[c.student_id].summaryUnits.add(c.activity_id);});
  quizzes.forEach(q=>{if(memberProgress[q.student_id])memberProgress[q.student_id].quizUnits.add(q.activity_id);});

  let maxSummary=0,maxQuiz=0;
  memberIds.forEach(id=>{
    const sCount=memberProgress[id].summaryUnits.size,qCount=memberProgress[id].quizUnits.size;
    if(sCount>maxSummary)maxSummary=sCount;
    if(qCount>maxQuiz)maxQuiz=qCount;
  });

  const members=teamInfo.members.map(m=>{
    const sCount=memberProgress[m.studentId].summaryUnits.size,qCount=memberProgress[m.studentId].quizUnits.size;
    const missingSummaries=Math.max(0,maxSummary-sCount),missingQuizzes=Math.max(0,maxQuiz-qCount);
    const isAligned=missingSummaries===0&&missingQuizzes===0;
    let gapMessage='';
    if(isAligned){
      gapMessage='Progres setara dengan tim · Siap praktikum bersama!';
    } else {
      const parts=[];
      if(missingSummaries>0)parts.push(missingSummaries+' materi rangkuman');
      if(missingQuizzes>0)parts.push(missingQuizzes+' kuis');
      gapMessage='Kurang '+parts.join(' & ')+' lagi agar setara dengan tim';
    }
    return {
      studentId:m.studentId,
      name:m.name,
      role:m.role,
      summaryCount:sCount,
      quizCount:qCount,
      missingSummaries,
      missingQuizzes,
      isAligned,
      gapMessage
    };
  });

  return {
    teamId:teamInfo.team.team_id,
    version:teamInfo.team.version,
    leaderId:teamInfo.leaderId,
    deputyId:teamInfo.deputyId,
    maxSummary,
    maxQuiz,
    members
  };
}

function practiceReportFromRow_(row){
  if(!row)return {report:{},meta:{}};try{const value=JSON.parse(String(row.result_json||'{}'));return {report:value.report||{},meta:value.meta||{}};}catch(e){return {report:{},meta:{}};}
}

function practiceWorkspace_(session,unitId){
  const units=allLearningUnits_(),index=units.findIndex(x=>x.unit_id===unitId);if(index<0)throw new Error('Submateri tidak ditemukan.');
  const context=studentLearningContext_(session.actor_id),teamContext=teamLearningContext_(session.actor_id);
  const unit=units[index],state=unitState_(session.actor_id,unit,index,units,context,teamContext);
  if(!unit.practice_activity_id)throw new Error('Submateri ini tidak memiliki LKPD praktik.');
  if(!state.practiceUnlocked&&unlockOverride_(session.actor_id,unit.practice_activity_id)!==true){
    if(state.laggingMembers&&state.laggingMembers.length>0) throw new Error('LKPD terkunci karena rekan tim Anda belum tuntas materi/kuis bab ini: '+state.laggingMembers.join(', '));
    else throw new Error('LKPD terbuka setelah kamu menuntaskan materi & kuis, DAN kamu telah tergabung dalam tim.');
  }
  const teamInfo=practiceTeamForStudent_(session.actor_id),result=teamInfo?findOne_('GROUP_LAB',r=>r.team_id===teamInfo.team.team_id&&r.activity_id===unit.practice_activity_id):null,stored=practiceReportFromRow_(result),editorRole=teamInfo?(session.actor_id===teamInfo.leaderId?'leader':session.actor_id===teamInfo.deputyId?'deputy':'member'):'none';
  return {unitId,title:unit.title,chapterTitle:unit.chapter_title,practiceActivityId:unit.practice_activity_id,practice:practiceCatalogItem_(unit.practice_activity_id),guide:PRACTICE_GUIDE_,team:teamInfo?{teamId:teamInfo.team.team_id,classId:teamInfo.team.class_id,members:teamInfo.members,leaderId:teamInfo.leaderId,deputyId:teamInfo.deputyId}:null,result:result?{status:result.status,score:result.score,teacherNote:result.teacher_note,updatedAt:result.updated_at,updatedBy:result.updated_by}:null,report:stored.report,reportMeta:stored.meta,editorRole,canEdit:!!teamInfo&&(editorRole==='leader'||editorRole==='deputy')&&(!result||['draft','needs_revision'].includes(result.status)),clientVersion:result?result.updated_at:''};
}

function cleanPracticeReport_(report){
  const fields=['prediction','tools','trial1','data','improvement','trial2','evidence','conclusion','modelLimit','reflection','memberRoles'],clean={};report=report||{};
  fields.forEach(field=>clean[field]=String(report[field]||'').trim().slice(0,5000));return clean;
}

function saveTeamPracticeReport_(session,payload,submit){
  const workspace=practiceWorkspace_(session,payload.unitId);if(!workspace.team)throw new Error('Tim sains belum tersedia.');if(!workspace.canEdit)throw new Error('Hanya Scientist Leader atau wakil yang dapat mengubah laporan tim.');
  const id=workspace.team.teamId+'|'+workspace.practiceActivityId,lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const current=findOne_('GROUP_LAB',r=>r.lab_result_id===id);if(current&&current.status==='verified')throw new Error('Laporan sudah diverifikasi guru.');if(current&&current.status==='submitted')throw new Error('Laporan sudah dikirim. Tunggu pemeriksaan guru.');
    if(current&&(!payload.clientVersion||String(current.updated_at)!==String(payload.clientVersion)))throw new Error('Draft berubah di perangkat lain. Muat ulang sebelum menyimpan.');
    const report=cleanPracticeReport_(payload.report),required=['prediction','tools','trial1','data','evidence','conclusion','memberRoles'];if(submit){const missing=required.filter(field=>!report[field]);if(missing.length)throw new Error('Lengkapi bagian wajib sebelum mengirim: '+missing.join(', '));}
    const now=isoNow_(),status=submit?'submitted':'draft',meta={submittedBy:submit?session.actor_id:'',submittedAt:submit?now:'',lastEditor:session.actor_id,editorRole:workspace.editorRole};
    const row={lab_result_id:id,class_id:workspace.team.classId,activity_id:workspace.practiceActivityId,team_id:workspace.team.teamId,status,score:current?current.score:'',result_json:JSON.stringify({report,meta}),teacher_note:current?current.teacher_note:'',updated_at:now,updated_by:session.actor_id};
    upsert_('GROUP_LAB','lab_result_id',row);audit_({type:'student',id:session.actor_id},submit?'SUBMIT_TEAM_PRACTICE':'SAVE_TEAM_PRACTICE_DRAFT','group_lab',id,{unit_id:payload.unitId,editor_role:workspace.editorRole});
    return {status,updatedAt:now,submitted:submit};
  }finally{lock.releaseLock();}
}

function practiceWorksheet_(session,unitId){return practiceWorkspace_(session,unitId);}

function practiceGuideForStudent_(session){return {guide:practiceGuideData_(),catalog:Object.values(PRACTICE_CATALOG_).map(item=>({activityId:item.activity_id,title:item.title,duration:item.duration,context:item.context})),team:studentTeamWithProgress_(session.actor_id)};}
function practiceGuideForTeacher_(session){return practiceGuideForStudent_(session);}

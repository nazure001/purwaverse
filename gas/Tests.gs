function assert_(condition,message){ if(!condition) throw new Error(message); }

function jsonCellEquals_(cellValue,expectedValue){
  try{return JSON.stringify(JSON.parse(String(cellValue)))===JSON.stringify(expectedValue);}catch(e){return false;}
}

function runIntegrationChecks() {
  ensureSchema_();
  const checks=[];
  function check(name,fn){ try{fn();checks.push({name,status:'PASS'});}catch(e){checks.push({name,status:'FAIL',detail:String(e.message||e)});} }
  check('schema lengkap',()=>Object.keys(SHEETS).forEach(n=>assert_(spreadsheet_().getSheetByName(n),n+' hilang')));
  check('akun guru dikonfigurasi',()=>{assert_(typeof teacherCredentialConfig_==='function','Security.gs belum tersedia sebagai file Script atau isinya belum lengkap');const cfg=teacherCredentialConfig_();assert_(cfg.username&&cfg.passwordHash&&cfg.classes.length,'jalankan initializeTeacherAccount() sebelum deployment');});
  check('roster resmi 8A-8E',()=>{const counts=Object.fromEntries(['8A','8B','8C','8D','8E'].map(c=>[c,findAll_('MASTER_STUDENTS',r=>r.class_id===c&&String(r.active).toLowerCase()==='true').length]));assert_(JSON.stringify(counts)===JSON.stringify({'8A':40,'8B':42,'8C':42,'8D':42,'8E':41}),'jumlah roster berubah: '+JSON.stringify(counts));});
  check('PIN lengkap tanpa membaca nilai PIN',()=>assert_(rows_('PIN_ISSUANCE').length===207,'jumlah penerbitan PIN bukan 207'));
  check('generator kartu kredensial aman',()=>{
    assert_(typeof generateStudentCredentialPdfForClass==='function'&&typeof generateCredentialCards8A==='function'&&typeof configureCredentialCardExecUrl==='function','CredentialCards.gs belum tersedia sebagai file Script atau fungsi kelas belum lengkap');
    assert_(CREDENTIAL_CARD_CONFIG_.cardsPerPage===10&&CREDENTIAL_CARD_CONFIG_.qrPrintSize>=72,'layout kartu harus memuat 10 kartu per A4 dengan QR yang cukup besar');
    const sample='https://script.google.com/macros/s/DEPLOYMENT_TEST/exec',qrUrl=credentialCardQrRequestUrl_(sample);
    assert_(qrUrl.includes(encodeURIComponent(sample))&&qrUrl.startsWith('https://quickchart.io/qr?text='),'QR tidak hanya mengarah ke URL /exec');
    assert_(!qrUrl.toLowerCase().includes('pin')&&!qrUrl.toLowerCase().includes('student'),'QR tidak boleh memuat PIN atau identitas siswa');
  });
  check('Mission 0 resmi lengkap',()=>{const ids=findAll_('DIAGNOSTIC_ITEMS',r=>String(r.active).toLowerCase()==='true').map(r=>r.item_id);assert_(CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.every(id=>ids.includes(id)),'butir Mission 0 kurang');});
  check('Mission 0 sesuai sumber lokal',()=>OFFICIAL_DIAGNOSTIC_.forEach(expected=>{const actual=findOne_('DIAGNOSTIC_ITEMS',r=>r.item_id===expected.item_id);assert_(actual&&actual.prompt===expected.prompt&&actual.rubric_json===expected.rubric_json,'isi diagnostik berbeda: '+expected.item_id);}));
  check('jalur belajar dan kuis identik dengan sumber',()=>{
    const expected=allQuizItems_(),expectedIds=new Set(expected.map(item=>item.quiz_item_id)),actual=findAll_('QUIZ_ITEMS',row=>String(row.active).toLowerCase()==='true'),actualIds=new Set(actual.map(row=>String(row.quiz_item_id)));
    allLearningUnits_().forEach(unit=>assert_(findOne_('MASTER_ACTIVITIES',r=>r.activity_id===unit.learn_activity_id),'materi hilang: '+unit.learn_activity_id));
    assert_(actual.length===expected.length,'jumlah soal aktif '+actual.length+', seharusnya '+expected.length);
    assert_(expectedIds.size===actualIds.size&&[...expectedIds].every(id=>actualIds.has(id)),'ID soal aktif tidak identik dengan sumber');
    expected.forEach(item=>{
      const row=findOne_('QUIZ_ITEMS',r=>String(r.quiz_item_id)===String(item.quiz_item_id));assert_(row,'soal hilang: '+item.quiz_item_id);
      const fields={activity_id:String(row.activity_id)===String(item.activity_id),question_type:String(row.question_type)===String(item.question_type),prompt:String(row.prompt)===String(item.prompt),options_json:jsonCellEquals_(row.options_json,item.options),answer_json:jsonCellEquals_(row.answer_json,item.answer),feedback_json:jsonCellEquals_(row.feedback_json,{default:item.feedback}),max_score:Number(row.max_score)===Number(item.max_score)},different=Object.keys(fields).filter(name=>!fields[name]);
      assert_(!different.length,'isi soal berbeda ('+different.join(', ')+'): '+item.quiz_item_id);
    });
  });
  check('acak pilihan dan mastery kuis konsisten',()=>{
    const source=allQuizItems_()[0],item={quiz_item_id:source.quiz_item_id,options_json:JSON.stringify(source.options)},first=quizOptionsForAttempt_(item,'STUDENT-01',1),again=quizOptionsForAttempt_(item,'STUDENT-01',1),positions=new Set();
    assert_(JSON.stringify(first)===JSON.stringify(again),'urutan pilihan tidak deterministik');
    for(let i=1;i<=20;i++)positions.add(quizOptionsForAttempt_(item,'STUDENT-'+i,1).findIndex(option=>option.originalIndex===source.answer));
    assert_(positions.size>1,'posisi jawaban benar tidak berubah antar siswa');
    const attempts=[{passed:false,score:50,attempt_number:2},{passed:true,score:75,attempt_number:1},{passed:true,score:80,attempt_number:3}].sort(compareMasteryAttempts_);
    assert_(attempts[0].passed===true&&attempts[0].score===80,'mastery terbaik tidak dipertahankan');
  });
  check('navigasi peran dan pratinjau guru lengkap',()=>{
    const scripts=HtmlService.createHtmlOutputFromFile('Scripts').getContent(),index=HtmlService.createHtmlOutputFromFile('Index').getContent(),learningScripts=HtmlService.createHtmlOutputFromFile('LearningScripts').getContent();
    assert_(scripts.includes('ROLE_VIEW_ACCESS')&&scripts.includes("state.teacherToken?'teacher'"),'pengaman rute peran belum lengkap');
    assert_(scripts.includes("primary.textContent='Dashboard Guru'")&&scripts.includes("secondary.textContent='Pratinjau Materi'"),'menu guru belum lengkap');
    assert_(index.includes('role-nav-label')&&index.includes('openTeacherMaterialPreview()'),'indikator atau tombol pratinjau guru belum lengkap');
    assert_(learningScripts.includes('teacherLearningCatalog')&&learningScripts.includes('Pratinjau Semua Materi'),'halaman pratinjau guru belum lengkap');
    assert_(learningScripts.includes('PURWAVERSE_BOOTSTRAP.currentSemester')&&Number(publicBootstrap_().currentSemester)===Number(CONFIG.CURRENT_SEMESTER),'kartu semester masih memakai semester tetap');
    assert_(learningScripts.includes('renderQuizReview(result)')&&learningScripts.includes('reviewItems'),'umpan balik kuis belum ditampilkan');
    assert_(typeof submitSummaryForReview_==='function'&&learningScripts.includes('Saya sudah merangkum di buku')&&learningScripts.includes("callApi('submitSummaryForReview'"),'pelaporan rangkuman siswa belum lengkap');
    assert_(learningScripts.includes("pending_review:'Menunggu pemeriksaan'")&&learningScripts.includes("status==='pending_review'?'pending'"),'antrean pemeriksaan guru belum terlihat');
    ['openPracticeGuide','openMaterialSummary','toggleProjectionMode','saveConfusion','stage-strip','HUBUNGKAN KE PRAKTIK'].forEach(marker=>assert_(learningScripts.includes(marker),'fitur ringan materi belum lengkap: '+marker));
    assert_(learningScripts.includes('if(state.learningHome)')&&learningScripts.includes("cacheKey=teacher?'teacherPracticeGuide':'studentPracticeGuide'")&&learningScripts.includes('teacherMaterialCatalog'),'cache navigasi baca belum lengkap');
    assert_(index.includes('Panduan Praktik & LKPD')&&index.includes('SOP, contoh berhasil, dan contoh laporan'),'akses panduan praktik dari dashboard belum lengkap');
  });
  check('panduan dan katalog praktik spesifik lengkap',()=>{
    const practiceUnits=allLearningUnits_().filter(unit=>unit.practice_activity_id),catalogIds=Object.keys(PRACTICE_CATALOG_);
    assert_(practiceUnits.length===16,'jumlah unit praktik berubah: '+practiceUnits.length);
    assert_(catalogIds.length===practiceUnits.length,'jumlah katalog praktik tidak sama dengan jalur belajar');
    practiceUnits.forEach(unit=>{
      const practice=practiceCatalogItem_(unit.practice_activity_id);assert_(practice,'panduan praktik hilang: '+unit.practice_activity_id);
      ['mission','context','duration','tools','alternatives','safety','method','data_columns','success_criteria','practice_link'].forEach(field=>assert_(practice[field]&&(!Array.isArray(practice[field])||practice[field].length),'bagian '+field+' kurang: '+unit.practice_activity_id));
    });
    catalogIds.forEach(id=>assert_(practiceUnits.some(unit=>unit.practice_activity_id===id),'katalog tidak terpakai: '+id));
    assert_(PRACTICE_GUIDE_.sop.length>=8&&PRACTICE_GUIDE_.teamRoles.length>=6,'SOP atau pembagian peran tim kurang');
    ['mission','prediction','tools','trial1','data','improvement','trial2','evidence','conclusion','modelLimit','reflection'].forEach(field=>assert_(PRACTICE_GUIDE_.successExample[field],'contoh laporan kurang: '+field));
  });
  check('alur laporan praktik tim terintegrasi',()=>{
    const learningScripts=HtmlService.createHtmlOutputFromFile('LearningScripts').getContent();
    assert_(typeof practiceWorkspace_==='function'&&typeof saveTeamPracticeReport_==='function'&&typeof practiceGuideForStudent_==='function'&&typeof practiceGuideForTeacher_==='function','layanan praktik tim belum lengkap');
    ['Simpan Draft','Kirim Laporan Tim','Scientist Leader','Deputy Scientist Leader','clientVersion'].forEach(marker=>assert_(learningScripts.includes(marker),'antarmuka laporan tim kurang: '+marker));
    const cleaned=cleanPracticeReport_({prediction:'  uji  ',ignored:'rahasia'});assert_(cleaned.prediction==='uji'&&cleaned.ignored===undefined&&Object.keys(cleaned).length===11,'pembersihan bidang laporan tidak sesuai kontrak');
  });
  check('isi materi, rangkuman, sumber, dan ilustrasi lengkap',()=>allLearningUnits_().forEach(unit=>{
    assert_(unit.sections&&unit.sections.length>=6,'uraian materi kurang: '+unit.unit_id);
    assert_(unit.example&&unit.misconception&&unit.notebook_prompt,'komponen belajar kurang: '+unit.unit_id);
    assert_(unit.key_points&&unit.key_points.length>=2,'rangkuman inti kurang: '+unit.unit_id);
    assert_(unit.source_title&&/\(20\d{2}\)/.test(unit.source_title)&&unit.source_note&&unit.source_note.includes('hlm.'),'sumber, tahun, atau halaman materi kurang: '+unit.unit_id);
    if(unit.semester===2)assert_(unit.sections.some(section=>section[0].includes('Contoh hitungan')),'contoh hitungan semester 2 kurang: '+unit.unit_id);
    const illustration=learningIllustration_(unit.illustration),meta=LEARNING_ILLUSTRATION_META_[unit.illustration];
    assert_(illustration.includes('<svg')&&illustration.includes('<figcaption>')&&meta&&meta.labels.length>=4,'ilustrasi berlabel kurang: '+unit.unit_id);
  }));
  check('ilustrasi sistem tubuh memuat konsep inti',()=>{
    const required={digestion:['nutrisi','enzim','vili'],circulation:['jantung','kapiler'],respiration:['diafragma','alveolus'],excretion:['nefron','organ lain']};
    Object.keys(required).forEach(key=>{const text=JSON.stringify(LEARNING_ILLUSTRATION_META_[key]).toLowerCase();required[key].forEach(term=>assert_(text.includes(term),'label '+term+' kurang pada ilustrasi '+key));});
  });
  check('umpan balik kuis spesifik materi',()=>allQuizItems_().forEach(item=>assert_(item.feedback&&item.feedback!=='Baca kembali konsep pada materi ini.'&&item.feedback.includes('Tinjau kembali'),'umpan balik generik: '+item.quiz_item_id)));
  check('cakupan CP seluruh bab lengkap',()=>{
    const targets={'CH08-01':'8.1.1.3','CH08-02':'8.1.1.3','CH08-03':'8.1.1.2','CH08-04':'8.1.1.13','CH08-05':'8.1.1.9','CH08-06':'8.1.1.11'};
    allLearningUnits_().forEach(unit=>{
    assert_(unit.cp_target&&unit.cp_target.includes(targets[unit.chapter_id]),'rujukan CP/ATP kurang: '+unit.unit_id);
    assert_(unit.learning_goals&&unit.learning_goals.length>=3,'tujuan belajar kurang: '+unit.unit_id);
    assert_(unit.glossary&&unit.glossary.length>=3,'istilah penting kurang: '+unit.unit_id);
    assert_(unit.enrichment&&unit.enrichment.length>40,'pengayaan opsional kurang: '+unit.unit_id);
    assert_(allQuizItems_().filter(item=>item.activity_id===unit.quiz_activity_id).length>=4,'cakupan kuis kurang: '+unit.quiz_activity_id);
    });
  });
  check('nutrisi Bab 2 sesuai BSE 2021',()=>{
    const nutrition=allLearningUnits_().find(unit=>unit.unit_id==='CH08-02-U02'),text=JSON.stringify(nutrition||{}).toLowerCase();
    ['karbohidrat','protein','lemak','vitamin','mineral','air','serat','label','isi piringku','enzim','gangguan'].forEach(term=>assert_(text.includes(term),'materi nutrisi kurang: '+term));
    const quizText=JSON.stringify(allQuizItems_().filter(item=>item.activity_id==='CH08-02-U02-QZ01')).toLowerCase();
    ['karbohidrat','protein','kkal','pencernaan','penyerapan'].forEach(term=>assert_(quizText.includes(term),'kuis nutrisi kurang: '+term));
  });
  check('konsep wajib setiap bab tercantum',()=>{
    const required={
      'CH08-01':['preparat','organel','spesialisasi','jaringan','sistem organ'],
      'CH08-02':['pencernaan','peredaran','pernapasan','ekskresi','gangguan'],
      'CH08-03':['zat murni','unsur','senyawa','campuran','filtrasi','distilasi'],
      'CH08-04':['gelombang gempa','lempeng','magnitudo','magma','peta kawasan rawan','mitigasi'],
      'CH08-05':['w = f x s','energi kinetik','energi potensial','percobaan','daya','efisiensi'],
      'CH08-06':['getaran','frekuensi','periode','panjang gelombang','pembiasan','bunyi','sonar']
    };
    Object.keys(required).forEach(chapterId=>{
      const text=JSON.stringify(allLearningUnits_().filter(unit=>unit.chapter_id===chapterId)).toLowerCase();
      required[chapterId].forEach(term=>assert_(text.includes(term),'konsep '+term+' kurang pada '+chapterId));
    });
  });
  check('identitas siswa unik',()=>{const rows=rows_('MASTER_STUDENTS').filter(r=>String(r.active).toLowerCase()==='true'),nisn=rows.map(r=>String(r.nisn)).filter(Boolean),ids=rows.map(r=>String(r.student_id));assert_(new Set(nisn).size===nisn.length,'NISN aktif ganda');assert_(new Set(ids).size===ids.length,'student_id ganda');});
  check('profil hanya untuk penilaian lengkap',()=>rows_('DIAGNOSTIC_PROFILES').forEach(p=>{const count=findAll_('DIAGNOSTIC_RESPONSES',r=>r.student_id===p.student_id&&CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.includes(r.item_id)&&r.score!==''&&r.score!==null).length;assert_(count>=CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.length,'profil prematur: '+p.student_id);}));
  const result={ok:checks.every(c=>c.status==='PASS'),mode:CONFIG.APP_MODE,sourceStatus:CONFIG.SOURCE_STATUS,checks};
  checks.forEach(c=>Logger.log('%s | %s%s',c.status,c.name,c.detail?' | '+c.detail:''));
  Logger.log('RINGKASAN | mode=%s | sumber=%s | hasil=%s',result.mode,result.sourceStatus,result.ok?'SEMUA PASS':'ADA YANG GAGAL');
  if(!result.ok){
    const failed=checks.filter(c=>c.status==='FAIL').map(c=>c.name+': '+c.detail).join('; ');
    throw new Error('Pemeriksaan integrasi gagal. '+failed);
  }
  return result;
}

function cleanupLegacySetupTestArtifacts() {
  const student = findOne_('MASTER_STUDENTS',r=>r.class_id==='8A'&&Number(r.roll_no)===1);
  if (!student) throw new Error('Siswa target pembersihan tidak ditemukan.');
  const testResponses = findAll_('DIAGNOSTIC_RESPONSES',r=>r.student_id===student.student_id&&r.answer==='jawaban integrasi'&&r.scored_by==='TEACHER-TEST');
  if (testResponses.length !== CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.length) {
    return {cleaned:false,reason:'Pola data uji lama tidak cocok; tidak ada data yang dihapus.'};
  }
  const draftTeamIds = new Set(findAll_('TEAMS',r=>r.class_id==='8A'&&r.status==='draft'&&r.created_by==='TEACHER-TEST').map(r=>r.team_id));
  const summary = {};
  summary.responses = deleteWhere_('DIAGNOSTIC_RESPONSES',r=>r.student_id===student.student_id&&r.answer==='jawaban integrasi'&&r.scored_by==='TEACHER-TEST');
  summary.profiles = deleteWhere_('DIAGNOSTIC_PROFILES',r=>r.student_id===student.student_id);
  summary.progress = deleteWhere_('PROGRESS',r=>r.student_id===student.student_id&&['M0-QUICK','CH08-01-U01-LRN01'].includes(r.activity_id));
  summary.selfMap = deleteWhere_('SETTINGS',r=>r.key==='self_map|'+student.student_id);
  summary.teamMembers = deleteWhere_('TEAM_MEMBERS',r=>draftTeamIds.has(r.team_id));
  summary.teams = deleteWhere_('TEAMS',r=>draftTeamIds.has(r.team_id));
  audit_({type:'system',id:'cleanup-v1'},'CLEANUP_LEGACY_SETUP_TEST','student',student.student_id,summary);
  return {cleaned:true,student_id:student.student_id,summary};
}

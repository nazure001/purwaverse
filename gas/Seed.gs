function setupPurwaverse() {
  ensureSchema_();
  seedCore_();
  seedOfficialDiagnostic_();
  seedLearningData_();
  seedOfficialRoster_();
  if (CONFIG.APP_MODE === 'TEST' && CONFIG.SOURCE_STATUS !== 'READY') seedDummy_();
  return runIntegrationChecks();
}

function initializeLearningContent() {
  const result=seedLearningData_();
  Logger.log('KONTEN PEMBELAJARAN SIAP | unit=%s | soal sumber=%s | soal aktif di sheet=%s',result.units,result.quizItems,result.activeQuizItems);
  return result;
}

function seedCore_() {
  ['8A','8B','8C','8D','8E'].forEach(id=>upsert_('MASTER_CLASSES','class_id',{class_id:id,class_name:'Kelas '+id,school_year:CONFIG.SCHOOL_YEAR,active:true}));
  [
    ['M0-QUICK','M0','M0-U01','diagnostic','Mission 0 - Quick Diagnostic',4,true,false],
    ['CH08-01-U01-LRN01','CH08-01','CH08-01-U01','learn','Sel sebagai Unit Kehidupan',0,true,true],
    ['CH08-01-U01-EXP01','CH08-01','CH08-01-U01','explore','Microscope World',0,false,true],
    ['CH08-01-U02-LAB01','CH08-01','CH08-01-U02','lab','Observasi Dunia Mikroskopis',100,true,true],
    ['CH08-01-U02-QCK01','CH08-01','CH08-01-U02','quick_check','Struktur dan Fungsi Organel',100,true,true],
    ['CH08-01-U03-CHL01','CH08-01','CH08-01-U03','challenge','Cell Case File',100,true,true],
    ['CH08-01-U03-RSH01','CH08-01','CH08-01-U03','research','Observe + Ask',4,false,true]
  ].forEach(a=>upsert_('MASTER_ACTIVITIES','activity_id',{activity_id:a[0],chapter_id:a[1],unit_id:a[2],type:a[3],title:a[4],max_score:a[5],required:a[6],public:a[7],active:true}));
  upsert_('SETTINGS','key',{key:'source_status',value:CONFIG.SOURCE_STATUS,updated_at:isoNow_()});
}

function seedDummy_() {
  const domains = CONFIG.DOMAINS;
  CONFIG.QUICK_DIAGNOSTIC_ITEM_IDS.forEach((id,i)=>upsert_('DIAGNOSTIC_ITEMS','item_id',{item_id:id,source_number:Number(id.slice(1)),domain:domains[i%domains.length],prompt:'BUTIR UJI DUMMY '+id+' - ganti melalui import sumber resmi.',rubric_json:JSON.stringify({0:'belum menjawab',1:'awal',2:'layak',3:'cakap',4:'mahir'}),max_score:4,active:true,source_status:'DUMMY_NOT_FOR_PRODUCTION'}));
  for (let i=1;i<=10;i++) upsert_('MASTER_STUDENTS','student_id',{student_id:'TST-8A-'+String(i).padStart(2,'0'),nis:'',nisn:'',name:'Siswa Uji '+i,gender:i%2?'L':'P',class_id:'8A',roll_no:i,pin_hash:hash_('1234'),active:true,source_row:'DUMMY',updated_at:isoNow_()});
}

function importOfficialStudents(records) {
  if (!Array.isArray(records)) throw new Error('records harus berupa array hasil ekstraksi file resmi.');
  const allowed = new Set(['8A','8B','8C','8D','8E']);
  const seenNisn = new Set();
  records.forEach((r,i)=>{
    if (!allowed.has(r.class_id)) return;
    if (r.nisn && seenNisn.has(String(r.nisn))) throw new Error('NISN ganda pada import: '+r.nisn);
    if (r.nisn) seenNisn.add(String(r.nisn));
    const existingByNisn=r.nisn?findOne_('MASTER_STUDENTS',x=>String(x.nisn)===String(r.nisn)):null;
    const requestedStudentId = r.student_id || 'STD-'+hash_(r.nisn || (r.class_id+'|'+r.roll_no+'|'+r.name)).slice(0,16);
    const studentId=existingByNisn?existingByNisn.student_id:requestedStudentId;
    const existing=existingByNisn||findOne_('MASTER_STUDENTS',x=>x.student_id===studentId);
    let issuance=findOne_('PIN_ISSUANCE',x=>x.student_id===studentId);
    if(!issuance){const pin=uniquePinForClass_(r.class_id);issuance=append_('PIN_ISSUANCE',{student_id:studentId,class_id:r.class_id,roll_no:r.roll_no,pin,issued_at:isoNow_(),rotated_at:''});}
    upsert_('MASTER_STUDENTS','student_id',{student_id:studentId,nis:r.nis||'',nisn:r.nisn||'',name:r.name,gender:r.gender||'',class_id:r.class_id,roll_no:r.roll_no,pin_hash:existing&&existing.pin_hash?existing.pin_hash:studentPinHash_(issuance.pin),active:r.active!==false,source_row:r.source_row||i+2,updated_at:isoNow_()});
  });
  return {imported:records.filter(r=>allowed.has(r.class_id)).length};
}

function uniquePinForClass_(classId){
  const used=new Set(findAll_('PIN_ISSUANCE',r=>r.class_id===classId).map(r=>String(r.pin)));
  for(let i=0;i<10000;i++){const pin=String(1000+Math.floor(Math.random()*9000));if(!used.has(pin))return pin;}
  throw new Error('Tidak dapat menghasilkan PIN unik untuk '+classId);
}

function importOfficialDiagnostic(items) {
  if (!Array.isArray(items) || items.length < 10) throw new Error('Minimal 10 butir sumber resmi diperlukan.');
  items.forEach(item=>upsert_('DIAGNOSTIC_ITEMS','item_id',Object.assign({},item,{active:true,source_status:'OFFICIAL'})));
  return {imported:items.length};
}

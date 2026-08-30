function securityProperties_(){ return PropertiesService.getScriptProperties(); }

function configureTeacherCredentials(username,password,classIds){
  if(!username||String(password||'').length<10)throw new Error('Nama pengguna wajib diisi dan kata sandi minimal 10 karakter.');
  const props=securityProperties_();
  const salt=Utilities.getUuid();
  props.setProperties({TEACHER_USERNAME:String(username),TEACHER_PASSWORD_SALT:salt,TEACHER_PASSWORD_HASH:hash_(salt+'|'+password),TEACHER_CLASSES:(classIds&&classIds.length?classIds:['8A','8B','8C','8D','8E']).join(','),STUDENT_PIN_PEPPER:props.getProperty('STUDENT_PIN_PEPPER')||Utilities.getUuid()});
  return {configured:true,classes:(classIds&&classIds.length?classIds:['8A','8B','8C','8D','8E'])};
}

function initializeTeacherAccount(){
  const current=teacherCredentialConfig_();
  if(current.username&&current.passwordHash)return {configured:false,reason:'Akun guru sudah dikonfigurasi. Fungsi ini tidak menimpa kredensial lama.'};
  const temporaryPassword=Utilities.getUuid().replace(/-/g,'').slice(0,14);
  configureTeacherCredentials('guru',temporaryPassword,['8A','8B','8C','8D','8E']);
  const result={configured:true,username:'guru',temporaryPassword,warning:'Salin kata sandi ini sekarang dari log eksekusi. Nilainya tidak dapat dibaca kembali dari Script Properties.'};
  Logger.log('AKUN GURU DIBUAT | nama pengguna: %s | kata sandi sementara: %s',result.username,result.temporaryPassword);
  return result;
}

function resetTeacherAccountPassword(){
  const current=teacherCredentialConfig_();
  const username=current.username||'guru',classes=current.classes.length?current.classes:['8A','8B','8C','8D','8E'];
  const temporaryPassword=Utilities.getUuid().replace(/-/g,'').slice(0,14);
  configureTeacherCredentials(username,temporaryPassword,classes);
  const result={reset:true,username,temporaryPassword,classes,warning:'Kata sandi lama sudah tidak berlaku. Salin kata sandi baru sekarang dari log eksekusi.'};
  Logger.log('KATA SANDI GURU DIATUR ULANG | nama pengguna: %s | kata sandi sementara: %s',result.username,result.temporaryPassword);
  return result;
}

function teacherCredentialConfig_(){
  const p=securityProperties_();
  return {username:p.getProperty('TEACHER_USERNAME')||'',salt:p.getProperty('TEACHER_PASSWORD_SALT')||'',passwordHash:p.getProperty('TEACHER_PASSWORD_HASH')||'',classes:(p.getProperty('TEACHER_CLASSES')||'').split(',').map(x=>x.trim()).filter(Boolean)};
}

function studentPinHash_(pin){
  const pepper=securityProperties_().getProperty('STUDENT_PIN_PEPPER');
  return pepper?hash_(pepper+'|'+String(pin)):hash_(pin);
}

function verifyStudentPin_(student,pin){
  const current=studentPinHash_(pin);
  if(student.pin_hash===current)return true;
  return student.pin_hash===hash_(pin); // Kompatibilitas sementara sampai migrasi hash dijalankan manual.
}

function migrateStudentPinHashesToPepper(){
  const props=securityProperties_();
  if(!props.getProperty('STUDENT_PIN_PEPPER'))props.setProperty('STUDENT_PIN_PEPPER',Utilities.getUuid());
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try{
    const issuances=rows_('PIN_ISSUANCE'); let updated=0,missing=0;
    issuances.forEach(issue=>{
      const student=findOne_('MASTER_STUDENTS',s=>s.student_id===issue.student_id);
      if(!student||!issue.pin){missing++;return;}
      upsert_('MASTER_STUDENTS','student_id',Object.assign({},student,{pin_hash:studentPinHash_(issue.pin),updated_at:isoNow_()})); updated++;
    });
    audit_({type:'system',id:'pin-migration'},'MIGRATE_PIN_HASH','students','8A-8E',{updated,missing});
    return {updated,missing};
  }finally{lock.releaseLock();}
}

function loginThrottleKey_(type,identity){ return 'LOGIN|'+type+'|'+hash_(identity).slice(0,24); }
function assertLoginAllowed_(type,identity){
  const cache=CacheService.getScriptCache(),key=loginThrottleKey_(type,identity),count=Number(cache.get(key)||0);
  if(count>=CONFIG.LOGIN_MAX_ATTEMPTS)throw new Error('Terlalu banyak percobaan masuk. Coba kembali beberapa menit lagi.');
}
function recordLoginFailure_(type,identity){
  const cache=CacheService.getScriptCache(),key=loginThrottleKey_(type,identity),count=Number(cache.get(key)||0)+1;
  cache.put(key,String(count),CONFIG.LOGIN_BLOCK_SECONDS);
}
function clearLoginFailures_(type,identity){ CacheService.getScriptCache().remove(loginThrottleKey_(type,identity)); }

function ensureTeacherClassAccess_(session,classId){
  if(!session||session.actor_type!=='teacher')throw new Error('Akses guru diperlukan.');
  const allowed=String(session.class_id||'').split(',').map(x=>x.trim());
  if(!allowed.includes('*')&&!allowed.includes(String(classId)))throw new Error('Guru tidak memiliki akses ke kelas ini.');
  return true;
}

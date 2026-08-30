const CREDENTIAL_CARD_CONFIG_ = Object.freeze({
  execUrlProperty:'PURWAVERSE_EXEC_URL',
  folderIdProperty:'CREDENTIAL_CARD_FOLDER_ID',
  classes:['8A','8B','8C','8D','8E'],
  cardsPerPage:10,
  qrSize:320,
  qrPrintSize:74
});

function validateCredentialExecUrl_(value){
  const url=String(value||'').trim();
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/?#]+\/exec(?:[?#].*)?$/.test(url))throw new Error('URL harus berupa alamat deployment Web App /exec yang lengkap.');
  return url;
}

function configureCredentialCardExecUrl(execUrl){
  const url=validateCredentialExecUrl_(execUrl);
  PropertiesService.getScriptProperties().setProperty(CREDENTIAL_CARD_CONFIG_.execUrlProperty,url);
  return {configured:true,host:'script.google.com',path:'/macros/s/.../exec'};
}

function credentialCardExecUrl_(){
  return validateCredentialExecUrl_(PropertiesService.getScriptProperties().getProperty(CREDENTIAL_CARD_CONFIG_.execUrlProperty));
}

function credentialCardQrRequestUrl_(execUrl){
  return 'https://quickchart.io/qr?text='+encodeURIComponent(validateCredentialExecUrl_(execUrl))+'&size='+CREDENTIAL_CARD_CONFIG_.qrSize+'&margin=2&ecLevel=Q&format=png';
}

function credentialCardQrBlob_(execUrl){
  const response=UrlFetchApp.fetch(credentialCardQrRequestUrl_(execUrl),{muteHttpExceptions:true,followRedirects:true});
  if(response.getResponseCode()!==200)throw new Error('QR tidak dapat dibuat. Kode layanan: '+response.getResponseCode());
  const blob=response.getBlob();
  if(!String(blob.getContentType()||'').startsWith('image/'))throw new Error('Respons layanan QR bukan gambar.');
  return blob.setName('purwaverse-login-qr.png');
}

function credentialCardRows_(classId){
  if(!CREDENTIAL_CARD_CONFIG_.classes.includes(classId))throw new Error('Kelas tidak valid. Gunakan 8A, 8B, 8C, 8D, atau 8E.');
  const students=findAll_('MASTER_STUDENTS',row=>row.class_id===classId&&String(row.active).toLowerCase()==='true').sort((a,b)=>Number(a.roll_no)-Number(b.roll_no));
  let issuances = findAll_('PIN_ISSUANCE',row=>row.class_id===classId);
  const issuedIds = new Set(issuances.map(r=>String(r.student_id)));
  let hasNew = false;
  students.forEach(student => {
    if(!issuedIds.has(String(student.student_id))){
      const pin = uniquePinForClass_(classId);
      append_('PIN_ISSUANCE',{student_id:student.student_id,class_id:classId,roll_no:student.roll_no,pin,issued_at:isoNow_(),rotated_at:''});
      upsert_('MASTER_STUDENTS','student_id',Object.assign({},student,{pin_hash:studentPinHash_(pin),updated_at:isoNow_()}));
      hasNew = true;
    }
  });
  if(hasNew) issuances = findAll_('PIN_ISSUANCE',row=>row.class_id===classId);
  const issuanceByStudent=Object.fromEntries(issuances.map(row=>[String(row.student_id),row]));
  if(!students.length)throw new Error('Tidak ada siswa aktif pada '+classId+'.');
  const cards=students.map(student=>{
    const issuance=issuanceByStudent[String(student.student_id)],pin=issuance?String(issuance.pin||''):'';
    if(!/^\d{4}$/.test(pin))throw new Error('PIN belum lengkap untuk '+classId+' nomor absen '+student.roll_no+'.');
    return {studentId:String(student.student_id),name:String(student.name),classId:String(student.class_id),rollNo:Number(student.roll_no),pin};
  });
  const rollNos = cards.map(c => c.rollNo);
  const duplicateRoll = rollNos.find((r, i) => rollNos.indexOf(r) !== i);
  if (duplicateRoll !== undefined) throw new Error('Nomor absen ganda ditemukan pada ' + classId + ': ' + duplicateRoll);
  const pins = cards.map(c => c.pin);
  const duplicatePin = pins.find((p, i) => pins.indexOf(p) !== i);
  if (duplicatePin !== undefined) throw new Error('PIN ganda ditemukan pada ' + classId + ': ' + duplicatePin);
  return cards;
}

function credentialCardFolder_(){
  const props=PropertiesService.getScriptProperties(),storedId=props.getProperty(CREDENTIAL_CARD_CONFIG_.folderIdProperty);let folder=null;
  if(storedId){try{folder=DriveApp.getFolderById(storedId);folder.getName();}catch(e){folder=null;}}
  if(!folder){
    folder=DriveApp.createFolder('PURWAVERSE - Kartu Kredensial Privat');
    if(folder.getSharingAccess()!==DriveApp.Access.PRIVATE){folder.setTrashed(true);throw new Error('Folder baru tidak berstatus privat. Periksa kebijakan Drive sekolah sebelum melanjutkan.');}
    props.setProperty(CREDENTIAL_CARD_CONFIG_.folderIdProperty,folder.getId());
  }
  if(folder.getSharingAccess()!==DriveApp.Access.PRIVATE)throw new Error('Folder kartu tidak lagi privat. Ubah akses folder menjadi Dibatasi sebelum membuat PDF.');
  return folder;
}

function styleCredentialParagraph_(paragraph,size,bold,color){
  paragraph.setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1);
  const text=paragraph.editAsText();
  if(paragraph.getText())text.setFontFamily('Arial').setFontSize(size).setBold(!!bold).setForegroundColor(color||'#172554');
  return paragraph;
}

function appendCredentialCard_(cell,card,qrBlob){
  cell.clear().setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(8).setPaddingRight(8).setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);
  styleCredentialParagraph_(cell.appendParagraph('PURWAVERSE IPA VIII'),9,true,'#172554');
  styleCredentialParagraph_(cell.appendParagraph(card.name),10,true,'#111827');
  styleCredentialParagraph_(cell.appendParagraph('Kelas '+card.classId+'  |  No. absen '+card.rollNo),9,false,'#334155');
  styleCredentialParagraph_(cell.appendParagraph('PIN  '+card.pin),15,true,'#1d4ed8');
  const imageParagraph=cell.appendParagraph('').setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingBefore(1).setSpacingAfter(1);
  imageParagraph.appendInlineImage(qrBlob.copyBlob()).setWidth(CREDENTIAL_CARD_CONFIG_.qrPrintSize).setHeight(CREDENTIAL_CARD_CONFIG_.qrPrintSize);
  styleCredentialParagraph_(cell.appendParagraph('Scan QR untuk membuka halaman login'),7,false,'#334155').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  styleCredentialParagraph_(cell.appendParagraph('Rahasiakan PIN - tekan Keluar setelah selesai'),7,true,'#b91c1c').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
}

function appendCredentialPage_(body,cards,qrBlob,pageNumber,pageCount){
  const title=body.appendParagraph('KARTU AKUN SISWA - '+cards[0].classId);
  styleCredentialParagraph_(title,10,true,'#172554').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const table=body.appendTable();table.setBorderColor('#94a3b8').setBorderWidth(0.75);
  const columnCount=2,rowsPerPage=Math.ceil(CREDENTIAL_CARD_CONFIG_.cardsPerPage/columnCount);
  for(let rowIndex=0;rowIndex<rowsPerPage;rowIndex++){
    const row=table.appendTableRow();
    for(let columnIndex=0;columnIndex<columnCount;columnIndex++){
      const card=cards[rowIndex*columnCount+columnIndex],cell=row.appendTableCell();cell.setWidth(260);
      if(card)appendCredentialCard_(cell,card,qrBlob);else cell.clear();
    }
  }
  const footer=body.appendParagraph('Halaman '+pageNumber+' dari '+pageCount+' - bagikan satu kartu hanya kepada siswa yang namanya tercantum.');
  styleCredentialParagraph_(footer,7,false,'#64748b').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
}

function generateStudentCredentialPdfForClass(classId){
  classId=String(classId||'').toUpperCase().trim();
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const execUrl=credentialCardExecUrl_(),cards=credentialCardRows_(classId),qrBlob=credentialCardQrBlob_(execUrl),folder=credentialCardFolder_();
    const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Jakarta','yyyyMMdd-HHmmss'),baseName='Kartu_Akun_Purwaverse_'+classId+'_'+stamp;
    const doc=DocumentApp.create(baseName),body=doc.getBody();
    body.setPageWidth(595.28).setPageHeight(841.89).setMarginTop(20).setMarginBottom(20).setMarginLeft(24).setMarginRight(24);
    const pageCount=Math.ceil(cards.length/CREDENTIAL_CARD_CONFIG_.cardsPerPage);
    for(let page=0;page<pageCount;page++){
      if(page>0)body.appendPageBreak();
      appendCredentialPage_(body,cards.slice(page*CREDENTIAL_CARD_CONFIG_.cardsPerPage,(page+1)*CREDENTIAL_CARD_CONFIG_.cardsPerPage),qrBlob,page+1,pageCount);
    }
    doc.saveAndClose();
    const sourceFile=DriveApp.getFileById(doc.getId());sourceFile.moveTo(folder);
    const pdfFile=folder.createFile(sourceFile.getAs(MimeType.PDF).setName(baseName+'.pdf'));
    sourceFile.setTrashed(true);
    if(pdfFile.getSharingAccess()!==DriveApp.Access.PRIVATE){pdfFile.setTrashed(true);throw new Error('PDF tidak berstatus privat dan telah dipindahkan ke sampah. Periksa kebijakan Drive sekolah.');}
    audit_({type:'system',id:'credential-card-generator'},'GENERATE_CREDENTIAL_CARDS','class',classId,{count:cards.length,file_id:pdfFile.getId()});
    Logger.log('KARTU KREDENSIAL SIAP | kelas=%s | siswa=%s | folder=%s',classId,cards.length,folder.getUrl());
    return {classId,count:cards.length,fileName:pdfFile.getName(),fileUrl:pdfFile.getUrl(),folderUrl:folder.getUrl()};
  }finally{lock.releaseLock();}
}

function generateAllStudentCredentialPdfs(){
  return CREDENTIAL_CARD_CONFIG_.classes.map(classId=>generateStudentCredentialPdfForClass(classId));
}

function generateCredentialCards8A(){return generateStudentCredentialPdfForClass('8A');}
function generateCredentialCards8B(){return generateStudentCredentialPdfForClass('8B');}
function generateCredentialCards8C(){return generateStudentCredentialPdfForClass('8C');}
function generateCredentialCards8D(){return generateStudentCredentialPdfForClass('8D');}
function generateCredentialCards8E(){return generateStudentCredentialPdfForClass('8E');}

function runAmnestyForStudent(studentId) {
  const sheet = spreadsheet_().getSheetByName('PROGRESS');
  if (!sheet || sheet.getLastRow() < 2) return;
  const range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
  const values = range.getValues();
  const headers = values[0];
  const evidenceIdx = headers.indexOf('evidence_json');
  const studentIdx = headers.indexOf('student_id');
  
  if (evidenceIdx < 0 || studentIdx < 0) return;
  
  let modifiedCount = 0;
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r.some(v => v !== '')) continue;
    if (String(r[studentIdx]) !== String(studentId)) continue;
    
    let evidenceStr = String(r[evidenceIdx]);
    if (evidenceStr.includes('[PERINGATAN:')) {
      try {
        let evidence = JSON.parse(evidenceStr);
        if (evidence.flag && evidence.flag.includes('[PERINGATAN:')) {
          delete evidence.flag;
        }
        Object.keys(evidence).forEach(k => {
          if (typeof evidence[k] === 'string' && evidence[k].includes('[PERINGATAN:')) {
            evidence[k] = evidence[k].replace(/\[PERINGATAN:[^\]]+\](?:\\n\\n|\n\n)?/g, '');
          }
        });
        
        const cleanedEvidence = JSON.stringify(evidence);
        const finalCleaned = cleanedEvidence.replace(/\[PERINGATAN:[^\]]+\](?:\\n\\n|\n\n)?/g, '');
        
        values[i][evidenceIdx] = finalCleaned;
        modifiedCount++;
      } catch(e) {
        values[i][evidenceIdx] = evidenceStr.replace(/\[PERINGATAN:[^\]]+\](?:\\n\\n|\n\n)?/g, '');
        modifiedCount++;
      }
    }
  }
  
  if (modifiedCount > 0) {
    range.setValues(values);
  }
}

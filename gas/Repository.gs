function spreadsheet_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function ensureSchema_() {
  const ss = spreadsheet_();
  Object.keys(SHEETS).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const headers = SHEETS[name];
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (JSON.stringify(actual) !== JSON.stringify(headers)) throw new Error('Schema mismatch: ' + name);
    sheet.setFrozenRows(1);
    if (name === 'PIN_ISSUANCE' && !sheet.isSheetHidden()) sheet.hideSheet();
  });
}

function rows_(sheetName) {
  const sheet = spreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), SHEETS[sheetName].length).getValues();
  const headers = values.shift();
  return values.filter(r => r.some(v => v !== '')).map(r => headers.reduce((o, h, i) => (o[h] = r[i], o), {}));
}

function append_(sheetName, record) {
  const headers = SHEETS[sheetName];
  const sheet = spreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} belum tersedia. Hubungi administrator.`);
  sheet.appendRow(headers.map(h => record[h] === undefined ? '' : record[h]));
  return record;
}

function upsert_(sheetName, key, record) {
  const sheet = spreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} belum tersedia. Hubungi administrator.`);
  const headers = SHEETS[sheetName];
  const keyCol = headers.indexOf(key);
  if (keyCol < 0) throw new Error('Unknown key ' + key);
  const data = rows_(sheetName);
  const idx = data.findIndex(r => String(r[key]) === String(record[key]));
  const complete = headers.reduce((o, h) => (o[h] = record[h] === undefined ? (idx >= 0 ? data[idx][h] : '') : record[h], o), {});
  if (idx >= 0) sheet.getRange(idx + 2, 1, 1, headers.length).setValues([headers.map(h => complete[h])]);
  else append_(sheetName, complete);
  return complete;
}

function findOne_(sheetName, predicate) { return rows_(sheetName).find(predicate) || null; }
function findAll_(sheetName, predicate) { return rows_(sheetName).filter(predicate); }
function deleteWhere_(sheetName, predicate) {
  const sheet = spreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
  const values = range.getValues();
  const headers = values[0];
  const recordsToKeep = [headers];
  let deleted = 0;
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r.some(v => v !== '')) { recordsToKeep.push(r); continue; }
    const record = headers.reduce((o, h, idx) => (o[h] = r[idx], o), {});
    if (predicate(record)) {
      deleted++;
    } else {
      recordsToKeep.push(r);
    }
  }
  if (deleted > 0) {
    range.clearContent();
    if(recordsToKeep.length > 0) {
      sheet.getRange(1, 1, recordsToKeep.length, headers.length).setValues(recordsToKeep);
    }
  }
  return deleted;
}
function isoNow_() { return new Date().toISOString(); }
function uid_(prefix) { return prefix + '-' + Utilities.getUuid(); }
function hash_(value) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value))); }

function audit_(actor, action, entityType, entityId, detail) {
  append_('AUDIT_LOG', {event_id:uid_('EVT'),actor_type:actor.type,actor_id:actor.id,action,entity_type:entityType,entity_id:entityId,detail_json:JSON.stringify(detail || {}),created_at:isoNow_()});
}

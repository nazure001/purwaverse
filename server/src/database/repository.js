const crypto = require('crypto');
const { getDatabase } = require('./db');

/**
 * Normalisasi nama tabel dari konvensi GAS (UPPERCASE) ke SQLite (lowercase)
 * @param {string} name
 * @returns {string}
 */
function normalizeTableName(name) {
  return String(name || '').toLowerCase().trim();
}

/**
 * Mengembalikan timestamp ISO-8601 saat ini (pengganti isoNow_ GAS)
 */
function isoNow_() {
  return new Date().toISOString();
}

/**
 * Menghasilkan unique identifier dengan prefix (pengganti uid_ GAS)
 * @param {string} prefix
 */
function uid_(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

/**
 * Menghasilkan Base64 WebSafe SHA-256 hash (pengganti hash_ GAS)
 * @param {string|number} value
 */
function hash_(value) {
  return crypto.createHash('sha256')
    .update(String(value))
    .digest('base64url'); // web-safe base64
}

/**
 * Membaca semua baris dari suatu tabel (pengganti rows_ GAS)
 * @param {string} tableName
 * @returns {Array<object>}
 */
function rows_(tableName) {
  const table = normalizeTableName(tableName);
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM ${table}`);
  return stmt.all();
}

/**
 * Menambahkan satu baris baru ke tabel (pengganti append_ GAS)
 * @param {string} tableName
 * @param {object} record
 * @returns {object}
 */
function append_(tableName, record) {
  const table = normalizeTableName(tableName);
  const db = getDatabase();
  const keys = Object.keys(record);

  if (keys.length === 0) {
    throw new Error(`[REPOSITORY ERROR] Tidak dapat append baris kosong ke tabel ${table}`);
  }

  const columns = keys.join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(k => record[k] === undefined ? null : record[k]);

  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
  const stmt = db.prepare(sql);
  stmt.run(...values);

  return record;
}

/**
 * Memperbarui baris berdasarkan kriteria (WHERE)
 * @param {string} tableName
 * @param {object} criteria
 * @param {object} updates
 * @returns {number} Jumlah baris terupdate
 */
function update_(tableName, criteria, updates) {
  const table = normalizeTableName(tableName);
  const db = getDatabase();
  const updateKeys = Object.keys(updates);
  const criteriaKeys = Object.keys(criteria);

  if (updateKeys.length === 0 || criteriaKeys.length === 0) return 0;

  const setClause = updateKeys.map(k => `${k} = ?`).join(', ');
  const whereClause = criteriaKeys.map(k => `${k} = ?`).join(' AND ');
  const values = [
    ...updateKeys.map(k => updates[k] === undefined ? null : updates[k]),
    ...criteriaKeys.map(k => criteria[k])
  ];

  const stmt = db.prepare(`UPDATE ${table} SET ${setClause} WHERE ${whereClause}`);
  const info = stmt.run(...values);
  return info.changes;
}

/**
 * Memperbarui jika ada atau menambah baris jika belum ada berdasarkan primary key (pengganti upsert_ GAS)
 * @param {string} tableName
 * @param {string} keyColumn
 * @param {object} record
 * @returns {object}
 */
function upsert_(tableName, keyColumn, record) {
  const table = normalizeTableName(tableName);
  const keys = Object.keys(record);

  if (!keys.includes(keyColumn)) {
    throw new Error(`[REPOSITORY ERROR] Kolom kunci '${keyColumn}' wajib ada dalam record upsert`);
  }

  const existing = findOne_(table, { [keyColumn]: record[keyColumn] });
  if (existing) {
    const updates = { ...record };
    delete updates[keyColumn];
    if (Object.keys(updates).length > 0) {
      update_(table, { [keyColumn]: record[keyColumn] }, updates);
    }
    return { ...existing, ...record };
  }

  return append_(table, record);
}

/**
 * Mencari satu baris berdasarkan objek kriteria atau fungsi predikat (pengganti findOne_ GAS)
 * @param {string} tableName
 * @param {object|Function} criteriaOrPredicate
 * @returns {object|null}
 */
function findOne_(tableName, criteriaOrPredicate) {
  const table = normalizeTableName(tableName);
  const db = getDatabase();

  if (typeof criteriaOrPredicate === 'function') {
    const all = rows_(table);
    return all.find(criteriaOrPredicate) || null;
  }

  if (typeof criteriaOrPredicate === 'object' && criteriaOrPredicate !== null) {
    const keys = Object.keys(criteriaOrPredicate);
    if (keys.length === 0) return null;

    const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
    const values = keys.map(k => criteriaOrPredicate[k]);

    const stmt = db.prepare(`SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`);
    const row = stmt.get(...values);
    return row || null;
  }

  return null;
}

/**
 * Mencari semua baris yang cocok berdasarkan kriteria atau predikat (pengganti findAll_ GAS)
 * @param {string} tableName
 * @param {object|Function} [criteriaOrPredicate]
 * @returns {Array<object>}
 */
function findAll_(tableName, criteriaOrPredicate) {
  const table = normalizeTableName(tableName);
  const db = getDatabase();

  if (!criteriaOrPredicate) {
    return rows_(table);
  }

  if (typeof criteriaOrPredicate === 'function') {
    const all = rows_(table);
    return all.filter(criteriaOrPredicate);
  }

  if (typeof criteriaOrPredicate === 'object' && criteriaOrPredicate !== null) {
    const keys = Object.keys(criteriaOrPredicate);
    if (keys.length === 0) return rows_(table);

    const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
    const values = keys.map(k => criteriaOrPredicate[k]);

    const stmt = db.prepare(`SELECT * FROM ${table} WHERE ${whereClause}`);
    return stmt.all(...values);
  }

  return [];
}

/**
 * Menghapus baris yang memenuhi kondisi (pengganti deleteWhere_ GAS)
 * @param {string} tableName
 * @param {object|Function} criteriaOrPredicate
 * @returns {number} Jumlah baris terhapus
 */
function deleteWhere_(tableName, criteriaOrPredicate) {
  const table = normalizeTableName(tableName);
  const db = getDatabase();

  if (typeof criteriaOrPredicate === 'object' && criteriaOrPredicate !== null) {
    const keys = Object.keys(criteriaOrPredicate);
    if (keys.length === 0) return 0;

    const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
    const values = keys.map(k => criteriaOrPredicate[k]);

    const stmt = db.prepare(`DELETE FROM ${table} WHERE ${whereClause}`);
    const info = stmt.run(...values);
    return info.changes;
  }

  if (typeof criteriaOrPredicate === 'function') {
    const all = rows_(table);
    const toDelete = all.filter(criteriaOrPredicate);
    if (toDelete.length === 0) return 0;

    // Identifikasi primary key
    let deletedCount = 0;
    const pks = ['progress_id', 'response_id', 'profile_id', 'membership_id', 'team_id', 'lab_result_id', 'check_id', 'attempt_id', 'state_id', 'evidence_id', 'override_id', 'attendance_id', 'event_id', 'student_id', 'item_id', 'activity_id', 'class_id', 'session_id', 'key'];
    
    // Cari pk yang ada di baris pertama
    const pk = pks.find(p => toDelete[0][p] !== undefined);
    if (pk) {
      const deleteStmt = db.prepare(`DELETE FROM ${table} WHERE ${pk} = ?`);
      db.transaction(() => {
        for (const item of toDelete) {
          deleteStmt.run(item[pk]);
          deletedCount++;
        }
      })();
    }
    return deletedCount;
  }

  return 0;
}

/**
 * Mencatat log audit ke tabel audit_log (pengganti audit_ GAS)
 * @param {{ type: string, id: string }} actor
 * @param {string} action
 * @param {string} entityType
 * @param {string} entityId
 * @param {object} detail
 */
function audit_(actor, action, entityType, entityId, detail) {
  return append_('audit_log', {
    event_id: uid_('EVT'),
    actor_type: actor.type || actor.actor_type || 'system',
    actor_id: actor.id || actor.actor_id || 'system',
    action,
    entity_type: entityType,
    entity_id: entityId,
    detail_json: JSON.stringify(detail || {}),
    created_at: isoNow_()
  });
}

module.exports = {
  isoNow_,
  uid_,
  hash_,
  rows_,
  append_,
  update_,
  upsert_,
  findOne_,
  findAll_,
  deleteWhere_,
  audit_
};

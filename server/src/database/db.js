const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const CONFIG = require('../config');

let dbInstance = null;
let activeDbPath = CONFIG.DB_PATH;

/**
 * Mengubah path database aktif (berguna untuk testing)
 * @param {string} newPath
 */
function setDatabasePath(newPath) {
  closeDatabase();
  activeDbPath = newPath;
}

/**
 * Mengembalikan instance koneksi SQLite aktif
 * @param {string} [customPath] - Path kustom untuk testing atau in-memory (:memory:)
 * @returns {Database.Database}
 */
function getDatabase(customPath) {
  if (customPath && customPath !== activeDbPath) {
    setDatabasePath(customPath);
  }

  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = activeDbPath;
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  dbInstance = new Database(dbPath);

  // Aktifkan pragma sesuai aturan wajib
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');

  // Auto create / verify schema
  initSchema(dbInstance);

  return dbInstance;
}

/**
 * Menjalankan DDL schema.sql secara otomatis jika tabel belum ada
 * @param {Database.Database} db
 */
function initSchema(db) {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  } else {
    console.warn('[DB WARNING] schema.sql tidak ditemukan di:', schemaPath);
  }
}

/**
 * Helper untuk menjalankan serangkaian operasi di dalam database transaction
 * @param {Function} callback - Fungsi yang menerima db instance dan dijalankan dalam transaksi
 * @returns {*}
 */
function runTransaction(callback) {
  const db = getDatabase();
  const execute = db.transaction((...args) => callback(db, ...args));
  return execute();
}

/**
 * Menutup koneksi database
 */
function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  getDatabase,
  setDatabasePath,
  initSchema,
  runTransaction,
  closeDatabase
};

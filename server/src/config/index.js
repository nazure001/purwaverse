const path = require('path');
const dotenv = require('dotenv');

// Muat .env jika file ada
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CONFIG = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DB_PATH: process.env.DB_PATH || path.resolve(__dirname, '../database/purwaverse.db'),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-insecure-secret-key-change-in-production',
  STUDENT_PIN_PEPPER: process.env.STUDENT_PIN_PEPPER || '',
  TEACHER_PASSWORD_SALT: process.env.TEACHER_PASSWORD_SALT || '',

  // Domain Config (Sesuai Config.gs)
  APP_NAME: process.env.APP_NAME || 'Purwaverse IPA VIII',
  APP_MODE: process.env.APP_MODE || 'VPS-MIGRATION',
  SOURCE_STATUS: 'READY',
  SCHOOL_YEAR: process.env.SCHOOL_YEAR || '2026/2027',
  CURRENT_SEMESTER: parseInt(process.env.CURRENT_SEMESTER || '1', 10),
  SESSION_HOURS: 8,
  TEAM_COUNT: 8,
  QUIZ_PASSING_SCORE: parseInt(process.env.QUIZ_PASSING_SCORE || '70', 10),
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_BLOCK_SECONDS: 300,
  DIAGNOSTIC_SECONDS_PER_ITEM: 210, // 3.5 menit per butir (210 detik)
  DIAGNOSTIC_BANK_IDS: ['D01','D02','D04','D05','D06','D07','D08','D09','D14','D24','D03','D11','D13','D15','D16','D12','D17','D18','D22','D23','D10','D19','D20','D21','D28'],
  QUICK_DIAGNOSTIC_ITEM_IDS: ['D01','D02','D04','D05','D06','D07','D08','D09','D14','D24','D03','D11','D13','D15','D16','D12','D17','D18','D22','D23','D10','D19','D20','D21','D28'],
  DOMAINS: ['observe_infer', 'evidence_experiment', 'model_concept', 'systems_causality', 'technology_design']
});

module.exports = CONFIG;

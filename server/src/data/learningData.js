const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadLearningData() {
  const practicePath = path.resolve(__dirname, '../../../gas/PracticeData.gs');
  const learningPath = path.resolve(__dirname, '../../../gas/LearningData.gs');

  if (!fs.existsSync(practicePath)) {
    throw new Error(`[DATA ERROR] File tidak ditemukan: ${practicePath}`);
  }
  if (!fs.existsSync(learningPath)) {
    throw new Error(`[DATA ERROR] File tidak ditemukan: ${learningPath}`);
  }

  const practiceCode = fs.readFileSync(practicePath, 'utf8');
  const learningCode = fs.readFileSync(learningPath, 'utf8');

  // Inisialisasi sandbox dengan dependensi hoisting
  const sandbox = {};
  sandbox.sandbox = sandbox;
  sandbox.upsert_ = () => {};
  sandbox.findOne_ = () => null;
  sandbox.findAll_ = () => [];
  sandbox.rows_ = () => [];
  sandbox.isoNow_ = () => new Date().toISOString();

  vm.createContext(sandbox);

  // Jalankan PracticeData terlebih dahulu
  vm.runInContext(practiceCode, sandbox);

  // Jalankan LearningData
  const learningWrapper = learningCode + `
;
sandbox.LEARNING_PATH_ = LEARNING_PATH_;
sandbox.SEMESTER_OUTLINE_ = SEMESTER_OUTLINE_;
sandbox.QUIZ_BANK_ = QUIZ_BANK_;
sandbox.allLearningUnits_ = allLearningUnits_;
sandbox.allQuizItems_ = allQuizItems_;
sandbox.learningIllustration_ = learningIllustration_;
sandbox.learningDiagram_ = learningDiagram_;
sandbox.PRACTICE_GUIDE_ = PRACTICE_GUIDE_;
sandbox.PRACTICE_CATALOG_ = PRACTICE_CATALOG_;
sandbox.practiceCatalogItem_ = practiceCatalogItem_;
sandbox.practiceGuideData_ = practiceGuideData_;
`;

  vm.runInContext(learningWrapper, sandbox);

  return {
    LEARNING_PATH_: sandbox.LEARNING_PATH_ || [],
    SEMESTER_OUTLINE_: sandbox.SEMESTER_OUTLINE_ || [],
    QUIZ_BANK_: sandbox.QUIZ_BANK_ || [],
    allLearningUnits_: sandbox.allLearningUnits_,
    allQuizItems_: sandbox.allQuizItems_,
    learningIllustration_: sandbox.learningIllustration_,
    learningDiagram_: sandbox.learningDiagram_,
    PRACTICE_GUIDE_: sandbox.PRACTICE_GUIDE_,
    PRACTICE_CATALOG_: sandbox.PRACTICE_CATALOG_,
    practiceCatalogItem_: sandbox.practiceCatalogItem_,
    practiceGuideData_: sandbox.practiceGuideData_
  };
}

const loaded = loadLearningData();

module.exports = loaded;

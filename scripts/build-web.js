const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const GAS_DIR = path.join(ROOT_DIR, 'gas');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

function readFile(filename) {
  return fs.readFileSync(path.join(GAS_DIR, filename), 'utf8');
}

function build() {
  console.log('Building standalone Web App for Vercel...');

  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  let indexHtml = readFile('Index.html');
  const styles = readFile('Styles.html');
  const learningStyles = readFile('LearningStyles.html');
  const scripts = readFile('Scripts.html');
  const learningScripts = readFile('LearningScripts.html');

  // Insert title and viewport in head if not already complete
  if (!indexHtml.includes('<title>')) {
    indexHtml = indexHtml.replace('<head>', '<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>Purwaverse IPA VIII</title>\n  <meta name="description" content="Platform Pembelajaran IPA Kelas VIII SMP - Laboratorium & Jalur Belajar Berbasis Bukti">');
  }

  // Replace include tags
  indexHtml = indexHtml.replace(/<\?!=\s*include\(['"]Styles['"]\);?\s*\?>/g, styles);
  indexHtml = indexHtml.replace(/<\?!=\s*include\(['"]LearningStyles['"]\);?\s*\?>/g, learningStyles);
  indexHtml = indexHtml.replace(/<\?!=\s*include\(['"]Scripts['"]\);?\s*\?>/g, scripts);
  indexHtml = indexHtml.replace(/<\?!=\s*include\(['"]LearningScripts['"]\);?\s*\?>/g, learningScripts);

  // Replace bootstrap script placeholder with baseline pre-seeded data
  const defaultBootstrap = {
    appName: "Purwaverse IPA VIII",
    mode: "PRODUCTION",
    sourceStatus: "READY",
    currentSemester: 1,
    quizPassingScore: 70,
    teacherWaNumber: "085721215213",
    classes: [
      { class_id: "8A", class_name: "Kelas 8A", active: true },
      { class_id: "8B", class_name: "Kelas 8B", active: true },
      { class_id: "8C", class_name: "Kelas 8C", active: true },
      { class_id: "8D", class_name: "Kelas 8D", active: true },
      { class_id: "8E", class_name: "Kelas 8E", active: true }
    ],
    activities: [],
    glossary: []
  };
  // Extract static curriculum units and catalog to eliminate GAS roundtrips during lesson viewing
  let staticUnitsMap = {};
  let staticCatalog = { chapters: [] };
  try {
    const vm = require('vm');
    const sandbox = { console, setTimeout, clearTimeout };
    vm.createContext(sandbox);

    const configCode = readFile('Config.gs');
    const practiceCode = readFile('PracticeData.gs');
    const learningCode = readFile('LearningData.gs');

    vm.runInContext(configCode, sandbox);
    vm.runInContext(practiceCode, sandbox);
    vm.runInContext(learningCode, sandbox);

    if (typeof sandbox.allLearningUnits_ === 'function') {
      const allUnits = sandbox.allLearningUnits_();
      allUnits.forEach(u => {
        staticUnitsMap[u.unit_id] = Object.assign({}, u, {
          illustration_svg: sandbox.learningIllustration_(u.illustration),
          practice_preview: sandbox.practiceCatalogItem_(u.practice_activity_id)
        });
      });
      console.log(`Pre-bundled ${Object.keys(staticUnitsMap).length} static curriculum units into client build.`);
    }

    if (Array.isArray(sandbox.LEARNING_PATH_)) {
      staticCatalog = {
        chapters: sandbox.LEARNING_PATH_.map(chapter => ({
          chapter_id: chapter.chapter_id,
          semester: chapter.semester,
          order: chapter.order,
          title: chapter.title,
          tagline: chapter.tagline,
          units: chapter.units.map(unit => ({
            unit_id: unit.unit_id,
            order: unit.order,
            title: unit.title,
            summary: unit.summary,
            illustration: unit.illustration,
            practice_activity_id: unit.practice_activity_id,
            learn_activity_id: unit.learn_activity_id,
            quiz_activity_id: unit.quiz_activity_id
          }))
        }))
      };
    }
  } catch (err) {
    console.error('Failed to pre-bundle static curriculum units:', err);
  }

  const staticScripts = `\n<script>\nwindow.PURWAVERSE_STATIC_UNITS = ${JSON.stringify(staticUnitsMap)};\nwindow.PURWAVERSE_STATIC_CATALOG = ${JSON.stringify(staticCatalog)};\n</script>`;

  indexHtml = indexHtml.replace(/<script>window\.PURWAVERSE_BOOTSTRAP\s*=\s*<\?!=\s*bootstrap\s*\?>;<\/script>/g, '<script>window.PURWAVERSE_BOOTSTRAP = (window.PURWAVERSE_BOOTSTRAP && window.PURWAVERSE_BOOTSTRAP.appName) ? window.PURWAVERSE_BOOTSTRAP : ' + JSON.stringify(defaultBootstrap) + ';</script>' + staticScripts);

  const outputPath = path.join(PUBLIC_DIR, 'index.html');
  fs.writeFileSync(outputPath, indexHtml, 'utf8');

  console.log(`Build complete! Output generated at: ${outputPath} (${(indexHtml.length / 1024).toFixed(2)} KB)`);
}

build();

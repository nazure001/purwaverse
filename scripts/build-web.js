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
  indexHtml = indexHtml.replace(/<script>window\.PURWAVERSE_BOOTSTRAP\s*=\s*<\?!=\s*bootstrap\s*\?>;<\/script>/g, '<script>window.PURWAVERSE_BOOTSTRAP = (window.PURWAVERSE_BOOTSTRAP && window.PURWAVERSE_BOOTSTRAP.appName) ? window.PURWAVERSE_BOOTSTRAP : ' + JSON.stringify(defaultBootstrap) + ';</script>');

  const outputPath = path.join(PUBLIC_DIR, 'index.html');
  fs.writeFileSync(outputPath, indexHtml, 'utf8');

  console.log(`Build complete! Output generated at: ${outputPath} (${(indexHtml.length / 1024).toFixed(2)} KB)`);
}

build();

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\77b86858-1797-4ec7-840d-bca33dc20f60';
const TEMP_USER_DATA_BASE = path.join(process.env.TEMP || 'C:\\temp', 'chrome_shot_profile');

const targets = [
  { name: 'view_1_landing_page.png', query: '?view=loading', width: 1280, height: 800 },
  { name: 'view_2_login_screen.png', query: '?view=auth-student', width: 1280, height: 800 },
  { name: 'view_2b_teacher_login.png', query: '?view=auth-teacher', width: 1280, height: 800 },
  { name: 'view_3_student_dashboard.png', query: '?view=student-dashboard', width: 1280, height: 800 },
  { name: 'view_4_learning_map.png', query: '?view=learning-map', width: 1280, height: 800 },
  { name: 'view_5_course_detail.png', query: '?view=course-unit', width: 1280, height: 800 },
  { name: 'view_6_quiz_chamber.png', query: '?view=quiz-chamber', width: 1280, height: 800 },
  { name: 'view_7_lkpd_workshop.png', query: '?view=team-lab', width: 1280, height: 800 },
  { name: 'view_8_teacher_command_center.png', query: '?view=teacher-dashboard', width: 1280, height: 800 },
  { name: 'view_mobile_student_dashboard.png', query: '?view=student-dashboard', width: 390, height: 844 },
  { name: 'view_tablet_teacher_command.png', query: '?view=teacher-dashboard', width: 768, height: 1024 }
];

console.log('Starting screenshot capture for Purwaverse (via query routing)...');

targets.forEach((t, idx) => {
  const url = `http://localhost:5000/${t.query}`;
  const outPath = path.join(ARTIFACT_DIR, t.name);
  const profileDir = `${TEMP_USER_DATA_BASE}_${idx}`;

  const args = [
    '--headless',
    '--disable-gpu',
    `--user-data-dir=${profileDir}`,
    `--window-size=${t.width},${t.height}`,
    '--hide-scrollbars',
    '--run-all-compositor-stages-before-draw',
    `--screenshot=${outPath}`,
    url
  ];

  try {
    execFileSync(CHROME_PATH, args, { stdio: 'ignore' });
    const exists = fs.existsSync(outPath);
    const size = exists ? fs.statSync(outPath).size : 0;
    console.log(`[${idx + 1}/${targets.length}] ${t.name}: ${exists ? 'OK (' + (size / 1024).toFixed(1) + ' KB)' : 'FAILED'}`);
  } catch (err) {
    console.error(`[${idx + 1}/${targets.length}] ${t.name} ERROR:`, err.message);
  }
});

console.log('Finished capturing all screenshots.');

// Master Data Roster Resmi 207 Siswa Kelas 8A - 8E (SMP Purwaverse)
// Porting dari gas/RosterData.gs

const fs = require('fs');
const path = require('path');

// Baca dari gas/RosterData.gs untuk menjamin 100% konsistensi byte
function loadOfficialRoster() {
  const rosterFilePath = path.resolve(__dirname, '../../../gas/RosterData.gs');
  if (fs.existsSync(rosterFilePath)) {
    const content = fs.readFileSync(rosterFilePath, 'utf8');
    const match = content.match(/const OFFICIAL_ROSTER_ = (\[[\s\S]*?\]);/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (err) {
        console.error('[ROSTER ERROR] Gagal parse JSON roster:', err);
      }
    }
  }
  return [];
}

const OFFICIAL_ROSTER_ = loadOfficialRoster();

module.exports = {
  OFFICIAL_ROSTER_
};

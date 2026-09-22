const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadDiagnosticData() {
  const filePath = path.resolve(__dirname, '../../../gas/DiagnosticData.gs');
  if (!fs.existsSync(filePath)) {
    throw new Error(`[DATA ERROR] File tidak ditemukan: ${filePath}`);
  }

  const rawCode = fs.readFileSync(filePath, 'utf8');
  const wrapperCode = rawCode + '\n;sandbox.OFFICIAL_DIAGNOSTIC_ = OFFICIAL_DIAGNOSTIC_; sandbox.OFFICIAL_SELF_MAP_ = OFFICIAL_SELF_MAP_;';

  const sandbox = {};
  sandbox.sandbox = sandbox;
  sandbox.upsert_ = () => {};
  vm.createContext(sandbox);
  vm.runInContext(wrapperCode, sandbox);

  return {
    OFFICIAL_DIAGNOSTIC_: sandbox.OFFICIAL_DIAGNOSTIC_ || [],
    OFFICIAL_SELF_MAP_: sandbox.OFFICIAL_SELF_MAP_ || []
  };
}

const { OFFICIAL_DIAGNOSTIC_, OFFICIAL_SELF_MAP_ } = loadDiagnosticData();

module.exports = {
  OFFICIAL_DIAGNOSTIC_,
  OFFICIAL_SELF_MAP_
};

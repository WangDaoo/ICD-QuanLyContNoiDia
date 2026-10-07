const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');
test('gate readiness explains server blockers and preserves unknown reasons', () => {
  const filename = path.resolve(__dirname,'../src/features/gate-out/gate-readiness.ts');
  const loaded = new Module(filename,module);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  const explain = loaded.exports.explainGateBlocker;
  assert.equal(explain('NO_YARD_POSITION'),'Container chưa có vị trí trong bãi.');
  assert.equal(explain({code:'INSPECTION_HOLD',message:'Cần kiểm tra seal'}),'Cần kiểm tra seal');
  assert.equal(explain('NEW_SERVER_REASON'),'NEW_SERVER_REASON');
});

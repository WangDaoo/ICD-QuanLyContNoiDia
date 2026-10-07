const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const {test} = require('node:test');
const ts = require('typescript');
function load() {
  const file = path.resolve(__dirname, '../src/services/api/api-connection.ts');
  const loaded = new Module(file, module);
  loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
  return loaded.exports;
}
test('connection probe verifies backend readiness without sending authentication', async () => {
  const {checkApiConnection} = load();
  let request;
  assert.equal(await checkApiConnection('http://localhost/api/', async (url, options) => {request={url,options};return {ok:true};}), true);
  assert.equal(request.url,'http://localhost/api/health/ready');
  assert.equal(request.options.headers,undefined);
  assert.equal(await checkApiConnection('http://localhost/api',async()=>({ok:false})),false);
});
test('unreachable and timed-out backend are reported unavailable, not queued', async () => {
  const {checkApiConnection} = load();
  assert.equal(await checkApiConnection('http://localhost/api',async()=>{throw new Error('offline');}),false);
  assert.equal(await checkApiConnection('http://localhost/api',(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('timeout')))),5),false);
});

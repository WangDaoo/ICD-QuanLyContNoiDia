const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');
test('yard assignment forwards the backend recommendation context and actual slot ID', async () => {
  const calls = [];
  const filename = path.resolve(__dirname,'../src/features/yard/api/yard.api.ts');
  const loaded = new Module(filename,module);
  loaded.require = () => ({apiClient:{get:async () => ({data:[{yardSlotId:'actual-slot'}],recommendationId:'rec',contextToken:'ctx'}),post:async (...args) => {calls.push(args);return {};}}});
  loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  assert.equal(typeof loaded.exports.yardApi?.getRecommendations,'function');
  const recommendation = await loaded.exports.yardApi.getRecommendations('visit');
  await loaded.exports.yardApi.assign('visit',recommendation.data[0].yardSlotId,recommendation);
  assert.deepEqual(calls,[['/containers/visit/yard/assign',{yardSlotId:'actual-slot',source:'RULE',recommendationId:'rec',contextToken:'ctx'}]]);
});

test('inspection list consumes the backend items envelope without crashing the survey screen', async () => {
  const filename = path.resolve(__dirname,'../src/features/yard/api/yard.api.ts');
  const loaded = new Module(filename,module);
  loaded.require = () => ({apiClient:{get:async () => ({items:[{id:'inspection',status:'PENDING'}],meta:{total:1}})}});
  loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  assert.deepEqual(await loaded.exports.yardApi.inspections(), [{id:'inspection',status:'PENDING'}]);
});

test('survey requests use the canonical visit inspection route and preserve report notes', async () => {
  const calls = [];
  const filename = path.resolve(__dirname,'../src/features/yard/api/yard.api.ts');
  const loaded = new Module(filename,module);
  loaded.require = () => ({apiClient:{post:async (...args) => { calls.push(args); return {id:'inspection'}; }}});
  loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  assert.equal(typeof loaded.exports.yardApi.requestInspection, 'function');
  await loaded.exports.yardApi.requestInspection('actual-visit', {inspectionType:'DAMAGE_SURVEY',notes:'Mức độ: Nặng. Vách trái lõm.'});
  assert.deepEqual(calls, [['/containers/actual-visit/inspections', {inspectionType:'DAMAGE_SURVEY',notes:'Mức độ: Nặng. Vách trái lõm.'}]]);
});

test('moving an already placed container creates a movement command instead of initial assignment', async () => {
  const calls = [];
  const filename = path.resolve(__dirname,'../src/features/yard/api/yard.api.ts');
  const loaded = new Module(filename,module);
  loaded.require = () => ({apiClient:{post:async (...args) => { calls.push(args); return {id:'movement'}; }}});
  loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  assert.equal(typeof loaded.exports.yardApi.requestMovement, 'function');
  await loaded.exports.yardApi.requestMovement('placed-visit','actual-slot');
  assert.deepEqual(calls, [['/containers/placed-visit/yard/movements', {toSlotId:'actual-slot'}]]);
});

test('yard catalog loads subsequent pages so known targets beyond slot 100 remain available', async () => {
  const calls = [];
  const filename = path.resolve(__dirname,'../src/features/yard/api/yard.api.ts');
  const loaded = new Module(filename,module);
  loaded.require = () => ({apiClient:{get:async url => {
    calls.push(url);
    return {data:url.includes('page=2') ? [{id:'slot-101'}] : Array.from({length:100},(_,i)=>({id:'slot-'+i})),meta:{total:101}};
  }}});
  loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  const result = await loaded.exports.yardApi.slots();
  assert.equal(result.data.length,101);
  assert.equal(result.data[100].id,'slot-101');
  assert.equal(calls.length,2);
  assert.match(calls[1], /page=2/);
});

function loadYardApi(client) {
  const filename = path.resolve(__dirname,'../src/features/yard/api/yard.api.ts');
  const loaded = new Module(filename,module);
  loaded.require = () => ({apiClient:client});
  loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  return loaded.exports.yardApi;
}

test('inspection history includes records beyond the first page', async () => {
  const api = loadYardApi({get:async url => ({items:url.includes('page=2') ? [{id:'older-active'}] : Array.from({length:100},(_,i)=>({id:'recent-'+i})),meta:{total:101}})});
  assert.equal((await api.inspections()).at(-1).id,'older-active');
});

test('cancel uses canonical inspection and yard routes and keeps the reason', async () => {
  const calls = [];
  const api = loadYardApi({post:async (...args) => calls.push(args)});
  assert.equal(typeof api.cancel,'function');
  for (const type of ['MOVEMENT','INSPECTION','BOOKING']) await api.cancel('order',type,'Nhập nhầm');
  assert.deepEqual(calls,[['/yard/movements/order/cancel',{reason:'Nhập nhầm'}],['/inspections/order/cancel',{reason:'Nhập nhầm'}],['/yard/bookings/order/cancel',{reason:'Nhập nhầm'}]]);
});

test('manual assignment validates a real slot ID then records MANUAL without recommendation attribution', async () => {
  const calls = [];
  const api = loadYardApi({post:async (...args) => {calls.push(args);return {eligible:true};}});
  assert.equal(typeof api.checkSlot,'function');
  assert.equal((await api.checkSlot('visit','slot')).eligible,true);
  await api.assignManual('visit','slot');
  assert.deepEqual(calls,[['/containers/visit/yard/check',{yardSlotId:'slot'}],['/containers/visit/yard/assign',{yardSlotId:'slot',source:'MANUAL'}]]);
});

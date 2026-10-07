import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from './node_modules/jsdom/lib/api.js';
import * as sensor from './interaction-sensor.mjs';

let metrics;
try { metrics = await import('./interaction-metrics.mjs'); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const implementation = () => { assert.ok(metrics, 'interaction metric implementation exists'); return metrics; };

test('nearest-rank p95 keeps the nineteenth sample of twenty, not the mean', () => {
  const { percentile } = implementation();
  assert.equal(percentile([300,...Array.from({length:19},(_,i)=>i+1)],.95),19);
  assert.equal(percentile(Array.from({length:20},(_,i)=>i+1),.5),10);
});
test('empty, nonfinite and negative timing values cannot become valid measurements', () => {
  const { percentile } = implementation();
  for (const samples of [[],[NaN],[Infinity],[-1],[12,undefined]]) assert.throws(()=>percentile(samples,.95));
});
test('untrusted input, hidden document and unrelated event clocks are rejected', () => {
  const { eligibleEvent } = implementation();
  const base={trusted:true,visibility:'visible',eventTime:12,now:15};
  assert.equal(eligibleEvent(base),null);
  assert.equal(eligibleEvent({...base,trusted:false}),'UNTRUSTED_EVENT');
  assert.equal(eligibleEvent({...base,visibility:'hidden'}),'HIDDEN_DOCUMENT');
  assert.equal(eligibleEvent({...base,eventTime:18}),'INVALID_EVENT_CLOCK');
  assert.equal(eligibleEvent({...base,eventTime:NaN}),'INVALID_EVENT_CLOCK');
  assert.equal(eligibleEvent({...base,now:20000}),'INVALID_EVENT_CLOCK');
});
const samples = (group, count=20) => Array.from({length:count},(_,i)=>({id:`${group}-${i}`,group,status:'ACK',elapsedMs:8+i,trusted:true,visibility:'visible',frameVerified:true}));
test('twenty verified samples produce p50/p95 for each measured group', () => {
  const { summarize } = implementation();
  const result=summarize([...samples('dialog'),...samples('filter')],['dialog','filter']);
  assert.equal(result.status,'PASS');
  assert.equal(result.groups.dialog.p95Ms,26);
  assert.equal(result.groups.filter.p50Ms,17);
  assert.equal(result.groups.dialog.total,20);
});
test('nineteen samples cannot close the twenty-sample criterion', () => {
  const { summarize } = implementation();
  const result=summarize(samples('dialog',19),['dialog']);
  assert.equal(result.status,'INCOMPLETE');
  assert.equal(result.groups.dialog.sufficient,false);
});
test('timeouts, untrusted or unpainted acknowledgements remain in the denominator', () => {
  const { summarize } = implementation();
  for (const bad of [{status:'TIMEOUT'},{trusted:false},{visibility:'hidden'},{frameVerified:false}]) {
    const records=samples('dialog'); Object.assign(records[0],bad);
    const result=summarize(records,['dialog']);
    assert.equal(result.status,'INCOMPLETE');
    assert.equal(result.groups.dialog.total,20);
    assert.equal(result.groups.dialog.verified,19);
    assert.equal(result.groups.dialog.rejected,1);
  }
});
test('slow valid feedback is a failure instead of being excluded as an outlier', () => {
  const { summarize } = implementation();
  const records=samples('navigation'); records[18].elapsedMs=120; records[19].elapsedMs=140;
  const result=summarize(records,['navigation']);
  assert.equal(result.status,'FAIL');
  assert.equal(result.groups.navigation.p95Ms,120);
});
test('duplicate IDs and unknown groups cannot silently pad the sample count', () => {
  const { summarize } = implementation();
  const records=samples('dialog'); records[19].id=records[0].id;
  assert.throws(()=>summarize(records,['dialog']));
  assert.throws(()=>summarize(samples('made-up'),['dialog']));
});

for (const [body,expected] of [
  ['<main><div data-view="yard"></div></main>',''],
  ['<main><div data-view="yard"><div role="status">Đang mở màn nghiệp vụ…</div></div></main>','yard:Đang mở màn nghiệp vụ…'],
  ['<main><div data-view="containers" hidden><h2>Old title</h2></div><div data-view="yard"><h2>Bãi</h2></div></main>','yard:Bãi'],
]) test(`navigation feedback rejects blank markup: ${expected||'blank'}`,()=>{
  const dom=new JSDOM(body); dom.window.HTMLElement.prototype.getClientRects=()=>[{width:1,height:1}];
  try { assert.equal(sensor.visibleViewFeedback(dom.window.document),expected); }
  finally { dom.window.close(); }
});

test('frame calibration reports idle cadence without subtracting it from interaction samples', async()=>{
  assert.equal(typeof sensor.measureFrameCadence,'function');
  let now=0;
  const fakeWindow={document:{visibilityState:'visible'},performance:{now:()=>now},
    requestAnimationFrame:callback=>{queueMicrotask(()=>{now+=50;callback(now);});return 1;},
    cancelAnimationFrame:()=>{},setTimeout,clearTimeout};
  const result=await sensor.measureFrameCadence(fakeWindow,20);
  assert.equal(result.intervalsMs.length,20);
  assert.equal(result.p95Ms,50);
  assert.equal(result.scope,'Idle render-frame cadence; diagnostic only, never subtracted');
});

test('diagnostic observers expose support and use event threshold16; unsupported is explicit',()=>{
  assert.equal(typeof sensor.observeDiagnostics,'function');
  const options=[],records=[];let disconnected=0;
  class Observer {static supportedEntryTypes=['event','longtask'];observe(value){options.push(value);}disconnect(){disconnected++;}}
  const cleanup=sensor.observeDiagnostics({defaultView:{PerformanceObserver:Observer}},record=>records.push(record));
  assert.deepEqual(options,[{type:'event',buffered:false,durationThreshold:16},{type:'longtask',buffered:false}]);
  assert.deepEqual(records,[{entryType:'support',event:true,longtask:true}]);
  cleanup();assert.equal(disconnected,2);
  const unknown=[];sensor.observeDiagnostics({defaultView:{}},record=>unknown.push(record));
  assert.deepEqual(unknown,[{entryType:'support',event:false,longtask:false}]);
});

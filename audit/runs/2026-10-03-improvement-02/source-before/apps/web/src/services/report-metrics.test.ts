import assert from 'node:assert/strict';
import { getReportMetrics } from './report-metrics';
const now = new Date('2026-10-01T12:00:00Z').getTime();
const result = getReportMetrics([
  {containerType:'20GP',shippingLine:'A',state:'IN_YARD',gateInAt:'2026-10-01T10:00:00Z'},
  {containerType:'45HC',shippingLine:'A',state:'IN_YARD',gateInAt:'2026-09-27T12:00:00Z'},
  {containerType:'40GP',shippingLine:'B',state:'EXITED',gateInAt:'2026-09-01T12:00:00Z'},
] as any,now);
assert.equal(result.totalTeu,5);
assert.deepEqual(result.lineStats,{A:3,B:2});
assert.deepEqual(result.dwellBuckets.map(b=>b.count),[1,1,0]);
assert.deepEqual(result.dwellBuckets.map(b=>b.percent),[50,50,0]);
assert.deepEqual(getReportMetrics([],now).dwellBuckets.map(b=>b.percent),[0,0,0]);

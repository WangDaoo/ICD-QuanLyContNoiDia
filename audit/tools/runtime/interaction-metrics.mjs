export function percentile(values, fraction) {
  if (!Array.isArray(values) || !values.length || !Number.isFinite(fraction) || fraction <= 0 || fraction > 1 ||
      values.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
    throw new Error('Invalid timing sample.');
  }
  const sorted = [...values].sort((left,right) => left-right);
  return sorted[Math.ceil(sorted.length*fraction)-1];
}

export function eligibleEvent({trusted,visibility,eventTime,now}) {
  if (trusted !== true) return 'UNTRUSTED_EVENT';
  if (visibility !== 'visible') return 'HIDDEN_DOCUMENT';
  if (![eventTime,now].every(value => typeof value === 'number' && Number.isFinite(value)) ||
      eventTime < 0 || eventTime > now || now-eventTime > 10000) return 'INVALID_EVENT_CLOCK';
  return null;
}

export function summarize(records, requiredGroups, minimum=20, thresholdMs=100) {
  const ids = new Set();
  for (const record of records) {
    if (!record || !requiredGroups.includes(record.group) || !record.id || ids.has(record.id)) throw new Error('Invalid or duplicate timing record.');
    ids.add(record.id);
  }
  const groups = {};
  for (const group of requiredGroups) {
    const observations = records.filter(record => record.group === group);
    const verified = observations.filter(record => record.status === 'ACK' && record.trusted === true &&
      record.visibility === 'visible' && record.frameVerified === true &&
      typeof record.elapsedMs === 'number' && Number.isFinite(record.elapsedMs) && record.elapsedMs >= 0);
    const timings = verified.map(record => record.elapsedMs);
    const sufficient = verified.length >= minimum && verified.length === observations.length;
    const p95Ms = timings.length ? percentile(timings,.95) : null;
    groups[group] = {total:observations.length,verified:verified.length,rejected:observations.length-verified.length,
      sufficient,p50Ms:timings.length ? percentile(timings,.5) : null,p95Ms,
      minMs:timings.length ? Math.min(...timings) : null,maxMs:timings.length ? Math.max(...timings) : null,
      status:!sufficient ? 'INCOMPLETE' : p95Ms <= thresholdMs ? 'PASS' : 'FAIL'};
  }
  return {status:Object.values(groups).some(group=>group.status === 'INCOMPLETE') ? 'INCOMPLETE' :
      Object.values(groups).every(group=>group.status === 'PASS') ? 'PASS' : 'FAIL',
    minimumPerGroup:minimum,thresholdMs,percentileMethod:'nearest rank',groups,
    scope:'Trusted local input to observable feedback verified across two render frames; upper-bound proxy, not field INP.'};
}

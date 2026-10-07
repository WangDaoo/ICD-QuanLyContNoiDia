import { eligibleEvent, percentile } from './interaction-metrics.mjs';

const tabNames = ['Tổng quan & Readiness','Tác nghiệp bãi','Dịch vụ & Thanh toán','Phiếu ra cổng','Lệnh giữ Holds','Dòng thời gian'];
const modes = ['navigation','dialog','selection','filter','submit'];
const safeOrigin = 'http://127.0.0.1:5174';
const text = element => element?.textContent?.trim() ?? '';
const visible = element => Boolean(element?.getClientRects().length && element.ownerDocument.defaultView.getComputedStyle(element).visibility !== 'hidden');

export function visibleViewFeedback(document) {
  const view=document.querySelector('main [data-view]:not([hidden])');
  if (!visible(view)) return '';
  const node=[...view.querySelectorAll('h1,h2,[role="status"]')].find(element=>visible(element)&&text(element));
  return node ? `${view.getAttribute('data-view')}:${text(node)}` : '';
}

export function measureFrameCadence(window,count=20) {
  if (!Number.isInteger(count)||count<20) throw new Error('At least20 idle intervals required.');
  return new Promise((resolve,reject)=>{
    let previous,raf;
    const intervalsMs=[];
    const timeout=window.setTimeout(()=>{window.cancelAnimationFrame(raf);reject(new Error('Idle frame calibration timed out.'));},5000);
    const tick=timestamp=>{
      if(window.document.visibilityState!=='visible') {window.clearTimeout(timeout);reject(new Error('Hidden calibration document.'));return;}
      if(previous!==undefined) intervalsMs.push(timestamp-previous);
      previous=timestamp;
      if(intervalsMs.length===count) {
        window.clearTimeout(timeout);
        resolve({scope:'Idle render-frame cadence; diagnostic only, never subtracted',intervalsMs,p50Ms:percentile(intervalsMs,.5),p95Ms:percentile(intervalsMs,.95)});
      } else raf=window.requestAnimationFrame(tick);
    };
    raf=window.requestAnimationFrame(tick);
  });
}

export function observeDiagnostics(document,onDiagnostic) {
  const Observer=document.defaultView.PerformanceObserver;
  const supported=Observer?.supportedEntryTypes ?? [];
  const observers=[];
  onDiagnostic({entryType:'support',event:supported.includes('event'),longtask:supported.includes('longtask')});
  for(const type of ['event','longtask']) {
    if(!supported.includes(type)) continue;
    const observer=new Observer(list=>{
      for(const entry of list.getEntries()) {
        if(type==='event'&&!['click','input','beforeinput','keydown'].includes(entry.name)) continue;
        onDiagnostic({entryType:type,name:entry.name,startTime:entry.startTime,duration:entry.duration,
          ...(type==='event'?{processingStart:entry.processingStart,processingEnd:entry.processingEnd,interactionId:entry.interactionId}: {})});
      }
    });
    observer.observe(type==='event'?{type,buffered:false,durationThreshold:16}:{type,buffered:false});
    observers.push(observer);
  }
  return ()=>observers.forEach(observer=>observer.disconnect());
}

export function instrumentDocument(document, {onRecord,onState}) {
  const window = document.defaultView;
  if (window.location.origin !== safeOrigin) throw new Error('Only the configured audit web origin is allowed.');
  let armed;
  let active;
  let sequence=0;
  const routeKey = () => visibleViewFeedback(document);
  const resultKey = () => {
    const view=document.querySelector('main [data-view="containers"]:not([hidden])');
    return view && visible(view) ? `${view.querySelectorAll('tbody tr').length}:${text(view.querySelector('table tbody'))}` : '';
  };
  const finish = (status,reason,elapsedMs=null) => {
    if (!active) return;
    const record=active;
    active=null;
    window.cancelAnimationFrame(record.raf);
    window.clearTimeout(record.timeout);
    onRecord({id:record.id,group:record.group,status,reason,elapsedMs,
      trusted:record.trusted,visibility:record.visibility,frameVerified:status==='ACK',
      eventType:record.eventType,documentFocused:record.focused,
      startedAt:record.startedAt,routeAtStart:record.route,
      captureDelayMs:record.captureDelay,
      eventTimeMs:record.eventTime,
      viewport:{width:window.innerWidth,height:window.innerHeight,density:window.devicePixelRatio},
      firstFeedbackFrameMs:record.firstFeedbackFrameMs ?? null,
      confirmationFrameGapMs:record.confirmationFrameGapMs ?? null,
      feedback:record.feedback});
    onState(`${record.group}: ${status}${elapsedMs===null ? '' : ` ${elapsedMs.toFixed(2)}ms`}`);
  };
  const capture = event => {
    if (!armed || active) return;
    const target=event.target?.closest?.('button,input');
    if (!target || target.ownerDocument !== document) return;
    const group=armed;
    const dialog=target.closest('dialog[open]');
    const inputName=target.getAttribute('aria-label') || target.id;
    let accepted=false;
    let acknowledged;
    let feedback;
    if (group==='navigation' && event.type==='click' && target.closest('aside, [role="complementary"]')) {
      const before=routeKey();
      accepted=Boolean(before);
      acknowledged=()=>Boolean(routeKey() && routeKey()!==before);
      feedback='different visible view title or explicit route loading state';
    } else if (group==='dialog' && event.type==='click' && !dialog && text(target)==='Chi tiết →') {
      accepted=!document.querySelector('dialog[open]');
      acknowledged=()=>visible(document.querySelector('dialog[open]'));
      feedback='native dialog visible';
    } else if (group==='selection' && event.type==='click' && dialog && tabNames.some(name=>text(target).startsWith(name))) {
      accepted=target.getAttribute('aria-pressed')==='false';
      acknowledged=()=>visible(target) && target.getAttribute('aria-pressed')==='true';
      feedback='selected state on the activated detail control';
    } else if (group==='filter' && event.type==='input' && inputName==='Tìm container') {
      const before=resultKey();
      accepted=Boolean(before);
      acknowledged=()=>Boolean(resultKey() && resultKey()!==before);
      feedback='filtered results changed';
    } else if (group==='submit' && event.type==='click' && dialog && target.type==='submit' && text(target)==='Lưu') {
      const form=target.closest('form');
      accepted=Boolean(form && !form.querySelector(':invalid') && !target.disabled);
      acknowledged=()=>visible(target) && target.disabled && /Đang lưu/.test(text(target)) ||
        !target.isConnected && [...document.querySelectorAll('[role="status"]')].some(node=>visible(node)&&/Đã lưu/.test(text(node)));
      feedback='pending indicator or confirmed success';
    }
    if (!accepted) return;
    armed=null;
    const now=window.performance.now();
    active={id:`${group}-${Date.now()}-${++sequence}`,group,trusted:event.isTrusted,
      visibility:document.visibilityState,focused:document.hasFocus(),eventType:event.type,
      startedAt:new Date().toISOString(),route:window.location.pathname,
      eventTime:event.timeStamp,captureDelay:now-event.timeStamp,feedback,raf:0};
    const rejection=eligibleEvent({trusted:event.isTrusted,visibility:document.visibilityState,eventTime:event.timeStamp,now});
    if (rejection) { finish('REJECTED',rejection); return; }
    let firstConfirmedFrame;
    const tick=()=>{
      if (!active) return;
      if (document.visibilityState !== 'visible') { finish('REJECTED','HIDDEN_DURING_MEASUREMENT'); return; }
      if (acknowledged()) {
        if (firstConfirmedFrame !== undefined) {
          active.confirmationFrameGapMs=window.performance.now()-firstConfirmedFrame;
          finish('ACK','condition persisted across two render frames',window.performance.now()-active.eventTime);
          return;
        }
        firstConfirmedFrame=window.performance.now();
        active.firstFeedbackFrameMs=firstConfirmedFrame-active.eventTime;
      } else firstConfirmedFrame=undefined;
      active.raf=window.requestAnimationFrame(tick);
    };
    active.timeout=window.setTimeout(()=>finish('TIMEOUT','No persistent rendered feedback within1500ms'),1500);
    active.raf=window.requestAnimationFrame(tick);
    onState(`Đang đo ${group}`);
  };
  document.addEventListener('click',capture,true);
  document.addEventListener('input',capture,true);
  return {
    arm(group) {
      if (!modes.includes(group) || active || !document.querySelector('main [data-view]:not([hidden])')) throw new Error('Cannot arm this measurement.');
      armed=group; onState(`Đã sẵn sàng: ${group}`);
    },
    dispose() {
      armed=null; if (active) finish('REJECTED','Document disposed during measurement');
      document.removeEventListener('click',capture,true); document.removeEventListener('input',capture,true);
    },
  };
}

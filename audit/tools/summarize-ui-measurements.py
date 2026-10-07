"""Validate saved browser measurements; never drives or modifies the application."""
import hashlib,json,math
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
RUN=ROOT/'audit/runs/2026-10-03-improvement-02'
def read(p):return json.loads((RUN/p).read_text(encoding='utf-8-sig'))
layouts=[]
for width in [320,375,768,1440]:
    cases=read(f'raw/browser/spacing-responsive-production-after-bounds-{width}-2026-10-04.json')
    assert len(cases)==18 and all(c['width']==width for c in cases)
    layouts.extend(cases)
overlays=read('raw/browser/spacing-overlay-production-after-bounds-2026-10-04.json')
assert len(overlays)==28
layouts+=overlays
exceptions=Counter()
for c in layouts:
    assert c['scrollWidth']<=c['width']+1 and c['bodyScrollWidth']<=c['width']+1
    if 'dialog' in c:assert c['dialog']['scrollWidth']<=c['dialog']['clientWidth']+1
    for n in c['non4']:
        tokens=n['class'].split();prop=n['property']
        if 'sr-only' in tokens and prop.startswith('margin') and n['value']=='-1px':reason='screen-reader-only offscreen geometry'
        elif 'mx-auto' in tokens and prop in ['marginLeft','marginRight']:reason='horizontal automatic centering'
        elif 'my-auto' in tokens and prop in ['marginTop','marginBottom']:reason='vertical automatic centering'
        else:raise AssertionError(('Unclassified spacing exception',c['screen'],n))
        exceptions[reason]+=1
typography=read('raw/browser/typography-letterspacing-final-2026-10-04.json')['cases']
assert len(typography)==72
assert all(c['scrollWidth']<=c['rootWidth']+1 for c in typography)
heading_count=sum(len(c['headings']) for c in typography)
uppercase_count=sum(len(c['uppercase']) for c in typography)
timing=read('raw/browser/interaction-production-after-bounds-complete-2026-10-04.json')
assert timing['status']=='PASS' and len(timing['records'])==100
assert set(timing['groups'])=={'navigation','dialog','selection','filter','submit'}
for group,stats in timing['groups'].items():
    assert (stats['total'],stats['verified'],stats['rejected'])==(20,20,0)
    assert stats['p95Ms']<=100
persisted=[]
for prefix in ['UXT1004A','UXT1004B','UXT1004C','UXT1004D']:
    d=read(f'raw/browser/interaction-persisted-{prefix}-2026-10-04.json')
    assert d['status']=='PASS' and d['count']==20 and len(d['rows'])==20
    assert len({r['id'] for r in d['rows']})==20
    assert d['target']['database']=='icd_ux_audit_20261003_e2e' and d['target']['guardedRuntime']
    persisted.append({'prefix':prefix,'verified_records':20})
loading={}
for batch in [1,2,3]:
    trace=read(f'raw/browser/initial-main-batch{batch}-trace-2026-10-04.json')
    assert not trace['truncated']
    for r in trace['records']:
        view=r.get('view')
        if view and r['statuses'] and any('Đang tải' in s or 'Đang mở' in s for s in r['statuses']):
            loading.setdefault(view,{'first_observed_ms':r['elapsedMs'],'statuses':r['statuses']})
assert len(loading)==18,loading.keys()
progressive=read('raw/browser/initial-master5-trace-complete-2026-10-04.json')
assert not progressive['truncated']
known=next(r for r in progressive['records'] if r['view']=='master-data' and len(r['knownRows'])>=2)
assert 'Đang tải dữ liệu vận hành…' in known['statuses']
complete=next(r for r in progressive['records'] if r['elapsedMs']>known['elapsedMs'] and not r['statuses'])
frames=read('raw/browser/feedback-frames-final-2026-10-04.json')['records']
valid=[r for r in frames if r['baselineComparable'] and r.get('frameTraceComplete') and r.get('sameClass')]
assert len(valid)>=3
smooth=[]
for r in valid:
    values=[float(f['filter'][11:-1]) if f['filter'].startswith('brightness(') else 1.0 for f in r['frames']]
    assert len(values)>=3 and len(set(round(v,5) for v in values))>=3
    assert all(f['transition']=='0.15s' and f['easing']=='ease-out' and 'filter' in f['transitionProperty'] for f in r['frames'])
    assert math.isclose(values[-1],.97,abs_tol=.001)
    smooth.append({'tag':r['pointerdown']['tag'],'name':r['pointerdown']['name'],'width':r['width'],'frames':len(values),'distinct_values':len(set(round(v,5) for v in values)),
                   'native_active_observed':r['pointerdown']['active'],'settled_hover_filter':values[-1]})
contrast=read('raw/browser/placeholder-contrast-final-2026-10-04.json')
assert contrast['counts']['FAIL']==0 and contrast['counts']['UNKNOWN']==0 and contrast['counts']['PASS']>=10
latest=read('raw/final-verification-manifest-feedback-2026-10-04.json')['source_hashes']
timed=read('raw/interaction-production-build-after-bounds-2026-10-04.json')['source_hashes']
changed=[p for p,h in latest.items() if timed.get(p)!=h]
assert changed==['apps/web/src/index.css'],changed
result={'scope':'Measured observations within frozen104-ID rubric; sampled screens/components, not complete accessibility or native acceptance',
        'layout':{'main_cases':72,'overlay_cases':28,'document_overflow_failures':0,'unclassified_spacing':0,'exceptions':dict(exceptions),'all_overlay_variants':'UNKNOWN'},
        'typography':{'cases':72,'headings':heading_count,'uppercase_elements':uppercase_count,'purposeful_roles':'Tight app heading; normal section headings; tracked uppercase captions/navigation; neutral dense table/code roles. No invented normative letter-spacing threshold.'},
        'timing':{'samples':100,'groups':timing['groups'],'source_delta_since_timing':changed,'method':'Trusted input to condition observed across two requestAnimationFrames; local upper-bound proxy, not field INP; no samples dropped'},
        'persisted_synthetic_ui_writes':persisted,
        'initial_loading':{'main_screens':18,'observations':loading,'method':'Visible DOM50ms nominal polling; starts at iframe load, not navigation start; bounded GETcontainers5s fault'},
        'progressive':{'known_rows_ms':known['elapsedMs'],'all_reads_completed_ms':complete['elapsedMs'],'real_rows':known['rowCount'],'known_rows':len(known['knownRows'])},
        'animation':{'transition_ms':150,'easing':'ease-out','passive_frame_samples':smooth,'continuous_loading_spinner':'Purposeful progress indication; not animated page content; reduced-motion rule retained'},
        'placeholder':{'measured':contrast['counts'],'minimum_ratio':min(r['ratio'] for r in contrast['results'] if r['ratio'] is not None),'criterion':'WCAG2.2 1.4.3, normal text4.5:1'},
        'limitations':['320px CSS reflow is not200% browser zoom','No spoken screen-reader or Android latest-source acceptance','Local timing is not field performance','Purposeful animation and observed geometry do not certify all UI states']}
(RUN/'raw/ui-measurements-summary-2026-10-04.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'layouts':100,'initial_screens':18,'headings':heading_count,'uppercase':uppercase_count,'timing_samples':100,'native_transition_samples':len(valid),'placeholder':contrast['counts']}))

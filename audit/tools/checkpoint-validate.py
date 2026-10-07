"""Independent integrity validation of generated report, scoring and evidence."""
import hashlib
import json
import math
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
RUN = ROOT/'audit/runs/2026-10-03-improvement-02'
def read(file):
    return json.loads(file.read_text(encoding='utf-8-sig'))
def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest().upper()
manifest = read(RUN/'checkpoint-manifest.json')
report = ROOT/manifest['report']
markdown = report.read_text(encoding='utf-8')
assert 'Chưa nghiệm thu' in markdown and '606/606' in markdown
assert '\ufffd' not in markdown, 'Invalid Unicode replacement in report'
for file, expected in manifest['historical_hashes_preserved'].items():
    assert digest(ROOT/file) == expected, f'Historical file changed: {file}'

links_checked = 0
for target in re.findall(r'\[[^\]\n]+\]\(([^\n]+?)\)', markdown):
    target = unquote(target.strip('<>'))
    if target.startswith(('http:', 'https:', '#')):
        continue
    match = re.search(r':(\d+)$', target)
    line = int(match[1]) if match else None
    file = Path(target[:match.start()] if match else target)
    assert file.is_absolute() and file.is_file(), f'Broken file link: {target}'
    if line:
        assert 1 <= line <= len(file.read_text(encoding='utf-8-sig').splitlines()), target
    links_checked += 1

findings = read(RUN/'findings.json')['findings']
assert len({f['id'] for f in findings}) == len(findings), 'Duplicate finding IDs'
for finding in findings:
    assert finding['severity'] in ['P0','P1','P2','P3']
    assert finding['category'] and finding['status']
    info = finding['improvement_02']
    assert info['source_evidence'] and info['evidence'], finding['id']
    for anchor in info['source_evidence']:
        source = (ROOT/anchor['file']).read_text(encoding='utf-8-sig').splitlines()
        assert anchor['detail'] in source[anchor['line']-1], (finding['id'],anchor)
    for file in info['evidence'] + info['review_diffs'] + info.get('isolated_review_diffs',[]):
        assert (ROOT/file).is_file(), (finding['id'],file)

baseline = read(RUN/'baseline-scores.json')
scores = read(RUN/'scores.json')
locked = lambda rows: {r['id']:(r['platform'],r['dimension'],r['criterion'],r['weight']) for r in rows}
assert locked(scores['observations']) == locked(baseline['observations'])
assert len(scores['observations']) == 104
for platform in ['web','mobile']:
    ux = scores['platforms'][platform]['ux_gap']
    recomputed = {'min':0.0,'max':0.0}
    for dimension in ux['dimensions']:
        applicable = []
        for criterion in dimension['criteria']:
            obs = [o for o in scores['observations'] if o['id'] in criterion['observation_ids']]
            counts = {status:sum(o['status']==status for o in obs) for status in ['PASS','FAIL','UNKNOWN']}
            assert counts == criterion['counts']
            total = sum(counts.values())
            if total:
                minimum = counts['PASS']/total
                maximum = (counts['PASS']+counts['UNKNOWN'])/total
                assert math.isclose(criterion['min'],minimum) and math.isclose(criterion['max'],maximum)
                applicable.append((criterion['weight'],minimum,maximum))
        denominator = sum(item[0] for item in applicable)
        for key,index in [('min',1),('max',2)]:
            value = 25*sum(item[0]*item[index] for item in applicable)/denominator
            assert math.isclose(dimension[key],value), (platform,dimension['dimension'],key)
            recomputed[key] += value
    for key,value in recomputed.items():
        assert math.isclose(ux[key],value), (platform,key)
    nielsen = scores['platforms'][platform]['nielsen']
    assert len(nielsen['heuristics']) == 10
    observed = 100-2.5*sum(h['verified_max_severity'] for h in nielsen['heuristics'])
    minimum = 100-2.5*sum(h['possible_max_severity'] for h in nielsen['heuristics'])
    assert math.isclose(nielsen['observed'],observed) and math.isclose(nielsen['max'],observed)
    assert math.isclose(nielsen['min'],minimum)

verification = read(ROOT/manifest['technical_manifest'])
for file, expected in verification['source_hashes'].items():
    assert digest(ROOT/file).lower() == expected.lower(), f'Source changed after final tests: {file}'
coverage = read(RUN/'coverage-checkpoint.json')
for case in coverage['cases'][coverage['historical_row_count']:]:
    if case.get('status') == 'PASS':
        assert case.get('meaning') and case.get('evidence'), case
        for file in case['evidence']:
            assert (ROOT/file).is_file(), file
for case in coverage.get('excluded_evidence',[]):
    assert (ROOT/case['file']).is_file(), case

private = RUN/'private'
secrets = []
for file in private.glob('*.env*'):
    for line in file.read_text(encoding='utf-8-sig').splitlines():
        key,_,value = line.partition('=')
        if any(word in key.upper() for word in ['PASSWORD','SECRET','TOKEN']) and value.strip():
            secrets.append(value.strip().strip('"').strip("'"))
secrets.append('AuditUiLocal20261003!Aa1')
raw_checked = 0
for file in (RUN/'raw').rglob('*'):
    if file.is_file() and file.suffix.lower() in ['.json','.txt','.log','.md','.html','.xml']:
        text = file.read_text(encoding='utf-8-sig',errors='replace')
        assert not any(secret and secret in text for secret in secrets), f'Secret found in evidence file: {file.relative_to(ROOT)}'
        assert not re.search(r'eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}',text), f'JWT found: {file.relative_to(ROOT)}'
        raw_checked += 1
result = {'at':datetime.now(ZoneInfo('Asia/Ho_Chi_Minh')).isoformat(),'status':'PASS',
          'report':report.relative_to(ROOT).as_posix(),'report_sha256':digest(report),
          'findings':len(findings),'status_counts':dict(Counter(f['status'] for f in findings)),
          'locked_observations':104,'file_links_checked':links_checked,'raw_files_secret_checked':raw_checked,
          'historical_files_preserved':len(manifest['historical_hashes_preserved']),
          'source_hashes_match_final_checks':len(verification['source_hashes']),
          'review_scope':'Root integrity review, not independent human or spoken screen-reader acceptance.',
          'report_generator_note':'Historical reports preserved; exact source/technical log hashes and independent locked-rubric arithmetic validated.'}
(RUN/'raw/checkpoint-integrity-review-2026-10-04-reaudit01.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=True))

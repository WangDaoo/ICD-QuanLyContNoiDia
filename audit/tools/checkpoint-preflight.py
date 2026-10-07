"""Validate static report anchors and record final checks without running the report."""
import ast
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
RUN = ROOT/'audit/runs/2026-10-03-improvement-02'
spacing = any(flag in sys.argv for flag in ['--spacing','--bounds','--pointer','--pointer-final','--pointer-complete','--contrast','--feedback'])
tag = 'feedback-2026-10-04' if '--feedback' in sys.argv else 'contrast-2026-10-04' if '--contrast' in sys.argv else 'pointer-complete-2026-10-04' if '--pointer-complete' in sys.argv else 'pointer-final-2026-10-04' if '--pointer-final' in sys.argv else 'pointer-2026-10-04' if '--pointer' in sys.argv else 'bounds-2026-10-04' if '--bounds' in sys.argv else 'spacing-2026-10-04' if spacing else '2026-10-04'
tree = ast.parse((ROOT/'audit/tools/checkpoint-improvement.py').read_text(encoding='utf-8'))
anchors = []
for node in tree.body:
    if isinstance(node, ast.Assign):
        names = [target.id for target in node.targets if isinstance(target, ast.Name)]
        if 'spec' in names:
            anchors.extend((fid, row[1], row[2]) for fid, row in ast.literal_eval(node.value).items())
        if 'new_specs' in names:
            anchors.extend((row[0], row[5], row[6]) for row in ast.literal_eval(node.value))
for fid, file, needle in anchors:
    assert (ROOT/file).is_file(), (fid, file)
    assert needle in (ROOT/file).read_text(encoding='utf-8-sig'), (fid, file, needle)

test_results = {}
for file, expected in [(f'web-sdk-source-tests-{tag}.txt',122),
                       (f'web-runtime-fixtures-{tag}.txt',257),
                       (f'web-existing-ui-regressions-{tag}.txt',52 if spacing else 39),
                       ('mobile-tests-2026-10-04.txt',175)]:
    text = (RUN/'raw'/file).read_text(encoding='utf-8-sig')
    total = int(re.search(r'tests (\d+)\s*$', text, re.M)[1])
    passed = int(re.search(r'pass (\d+)\s*$', text, re.M)[1])
    failed = int(re.search(r'fail (\d+)\s*$', text, re.M)[1])
    assert (total, passed, failed) == (expected, expected, 0), (file,total,passed,failed)
    test_results[file] = {'tests':total,'passed':passed,'failed':failed,
                          'log_sha256':hashlib.sha256((RUN/'raw'/file).read_bytes()).hexdigest()}
exits = json.loads((RUN/f'raw/technical-check-exits-{tag}.json').read_text(encoding='utf-8-sig'))
assert all(exits[key] == 0 for key in ['eslintExit','webTypecheckExit','webBuildExit'])
assert not (RUN/f'raw/lint-{tag}.txt').read_text(encoding='utf-8-sig').strip()
source_hashes = {}
for folder in ['apps/web/src','apps/mobile/src','apps/mobile/tests','packages/api-client/src']:
    for file in (ROOT/folder).rglob('*'):
        if file.is_file():
            source_hashes[file.relative_to(ROOT).as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
output = {'at':datetime.now(ZoneInfo('Asia/Ho_Chi_Minh')).isoformat(),
          'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
          'source_hashes':source_hashes,'static_report_anchors_validated':len(anchors),
          'tests':test_results,'exits':exits,
          'mobile_scope':'Source tests/typecheck only. Native latest source not loaded after automatic-review denial.',
          'production_lighthouse':'Separate build hashes and Login-only result; not authenticated route performance or field INP.'}
(RUN/f'raw/final-verification-manifest-{tag}.json').write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'anchor_count':len(anchors),'source_files':len(source_hashes),'tests':sum(x['tests'] for x in test_results.values()),'failed':0}))

"""Quantize explicit layout spacing utilities to four pixels, with adjacent source snapshots."""
from pathlib import Path
import difflib,hashlib,json,math,re
ROOT=Path(__file__).resolve().parents[2]
RUN=ROOT/'audit/runs/2026-10-03-improvement-02'
BATCH=RUN/'fixes/spacing-grid-2026-10-04'
assert not BATCH.exists(),'Existing spacing batch is preserved'
verification=json.loads((RUN/'raw/final-verification-manifest-2026-10-04.json').read_text(encoding='utf-8'))
digest=lambda b:hashlib.sha256(b).hexdigest()
for path,expected in verification['source_hashes'].items():assert digest((ROOT/path).read_bytes())==expected,path
pattern=re.compile(r'(?<![\w.-])(?P<utility>(?:[mp][xytrblse]?|gap(?:-[xy])?|space-[xy])-)(?P<value>[0-9]+\.5)(?![\w.])')
changes=[]
for file in sorted((ROOT/'apps/web/src').rglob('*')):
    if file.suffix not in ('.tsx','.ts') or '.test.' in file.name:continue
    before=file.read_bytes();source=before.decode('utf-8-sig');edits=[]
    def replacement(match):
        value=math.ceil(float(match['value']))
        result=match['utility']+str(value)
        edits.append({'before':match[0],'after':result})
        return result
    updated=pattern.sub(replacement,source)
    if updated==source:continue
    after=(b'\xef\xbb\xbf' if before.startswith(b'\xef\xbb\xbf') else b'')+updated.encode('utf-8')
    relative=file.relative_to(ROOT)
    snapshot=BATCH/'before'/relative;snapshot.parent.mkdir(parents=True,exist_ok=True);snapshot.write_bytes(before)
    patch=BATCH/'diffs'/Path(relative.as_posix()+'.diff');patch.parent.mkdir(parents=True,exist_ok=True)
    patch.write_text(''.join(difflib.unified_diff(source.splitlines(True),updated.splitlines(True),fromfile='before/'+relative.as_posix(),tofile='after/'+relative.as_posix())),encoding='utf-8')
    changes.append({'path':relative.as_posix(),'before':snapshot.relative_to(ROOT).as_posix(),'diff':patch.relative_to(ROOT).as_posix(),'before_sha256':digest(before),'after_sha256':digest(after),'edits':edits})
    file.write_bytes(after)
assert len(changes)==21 and sum(len(r['edits']) for r in changes)==281,'Expected reviewed spacing set changed'
(BATCH/'manifest.json').write_text(json.dumps({'finding':'W-N-027','policy':'Only layout margin/padding/gap/space half-step utilities rounded upwards to4px. Dimensions, icons, positions, typography, business fields and negative optical offsets preserved. Original file bytes/line endings retained.','files':changes},indent=2),encoding='utf-8')
print(json.dumps({'finding':'W-N-027','files':len(changes),'spacing_edits':sum(len(r['edits']) for r in changes)}))

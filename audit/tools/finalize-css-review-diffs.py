"""Save actual adjacent CSS snapshots and declare shared-file overlap explicitly."""
from pathlib import Path
import difflib,hashlib,json
ROOT=Path(__file__).resolve().parents[2]
RUN=ROOT/'audit/runs/2026-10-03-improvement-02'
current=ROOT/'apps/web/src/index.css'
items=[('W-N-029','pointer-hover-2026-10-04',RUN/'fixes/placeholder-contrast-2026-10-04/index-before.css',[]),
       ('W-N-030','placeholder-contrast-2026-10-04',current,['W-N-031']),
       ('W-N-031','feedback-transition-2026-10-04',current,['W-N-030'])]
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for fid,folder,after_source,overlap in items:
    folder=RUN/'fixes'/folder
    before=folder/'index-before.css'
    after=folder/'index-after.css'
    after.write_bytes(after_source.read_bytes())
    (folder/(fid+'.diff')).write_text(''.join(difflib.unified_diff(before.read_text(encoding='utf-8-sig').splitlines(True),after.read_text(encoding='utf-8-sig').splitlines(True),fromfile='before/apps/web/src/index.css',tofile='after/apps/web/src/index.css')),encoding='utf-8')
    (folder/'manifest.json').write_text(json.dumps({'id':fid,'file':'apps/web/src/index.css','before_sha256':digest(before),'after_sha256':digest(after),
       'after_snapshot_source':after_source.relative_to(ROOT).as_posix(),'overlapping_approved_findings':overlap,'scope':'Actual retained snapshots. Shared CSS batches overlap explicitly; not a synthetic reconstruction.'},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'review_diffs':3,'shared_overlap_declared':True}))

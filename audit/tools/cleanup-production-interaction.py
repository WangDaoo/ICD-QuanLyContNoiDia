"""Remove only audit-created production staging files after exactpath/hash verification."""
from pathlib import Path
import hashlib,json,sys
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[2]
RUN=ROOT/'audit/runs/2026-10-03-improvement-02'
tag='' if len(sys.argv)==1 else '-'+sys.argv[1]
assert tag in ('','-after-spacing','-after-bounds','-after-pointer','-after-pointer-final','-after-pointer-complete','-after-contrast','-after-feedback')
manifest=RUN/f'raw/interaction-production-staging{tag}-2026-10-04.json'
data=json.loads(manifest.read_text(encoding='utf-8'))
assert not data.get('cleanup'),'Already cleaned; preserve evidence'
public=(ROOT/'apps/web/public').resolve()
paths=[]
for row in data['created']:
    path=(ROOT/row['path']).resolve()
    assert path.is_relative_to(public) and path.is_file() and not path.is_symlink(),row['path']
    assert hashlib.sha256(path.read_bytes()).hexdigest()==row['sha256'],row['path']
    paths.append(path)
for path in paths:path.unlink()
assets=public/'assets'
assert assets.resolve().is_relative_to(public)
if assets.is_dir() and not any(assets.iterdir()):assets.rmdir()
if public.is_dir() and not any(public.iterdir()):public.rmdir()
data['cleanup']={'at':datetime.now(timezone.utc).isoformat(),'removed':len(paths),'exact_paths_and_hashes_checked':True,'other_files_preserved':True}
manifest.write_text(json.dumps(data,indent=2),encoding='utf-8')
print(json.dumps(data['cleanup']))

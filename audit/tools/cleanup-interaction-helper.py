"""Remove the single audit-owned helper only after absolute path and hash verification."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json
ROOT=Path(__file__).resolve().parents[2]
RUN=ROOT/'audit/runs/2026-10-03-improvement-02'
manifest=RUN/'raw/interaction-helper-current.json'
d=json.loads(manifest.read_text(encoding='utf-8'))
path=Path(d['helper'])
expected=ROOT/'apps/web/__ui-audit-timing-20261004.html'
assert path.is_absolute() and path.resolve()==expected.resolve()
assert path.resolve().parent==(ROOT/'apps/web').resolve()
assert path.is_file() and not path.is_symlink()
assert hashlib.sha256(path.read_bytes()).hexdigest()==d['sha256']
path.unlink()
d['cleanup']={'at':datetime.now(timezone.utc).isoformat(),'exact_path_and_hash_checked':True,'removed_files':1,'other_files_preserved':True}
manifest.write_text(json.dumps(d,indent=2)+'\n',encoding='utf-8')
print(json.dumps(d['cleanup']))

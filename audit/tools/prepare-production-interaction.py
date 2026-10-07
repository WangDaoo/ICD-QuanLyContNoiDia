"""Stage exact production assets on the existing isolated web origin; do not rebuild or rewrite bundles."""
from pathlib import Path
import hashlib,json,shutil,re,sys
ROOT=Path(__file__).resolve().parents[2]
RUN=ROOT/'audit/runs/2026-10-03-improvement-02'
PUBLIC=ROOT/'apps/web/public'
tag='' if len(sys.argv)==1 else '-'+sys.argv[1]
assert tag in ('','-after-spacing','-after-bounds','-after-pointer','-after-pointer-final','-after-pointer-complete','-after-contrast','-after-feedback')
manifest=RUN/f'raw/interaction-production-staging{tag}-2026-10-04.json'
assert not manifest.exists(),'Preserve prior staging manifest'
baseline=json.loads((RUN/f'raw/interaction-production-build{tag}-2026-10-04.json').read_text(encoding='utf-8'))
protected=baseline['build_hashes']
build=ROOT/baseline['out']
assert build.resolve().is_relative_to((RUN/'runtime').resolve())
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
created=[]
assets=build/'assets'
dest=PUBLIC/'assets'
assert not dest.exists(),'Public assets already exist; no files will be overwritten'
entry_html=f'__audit-production-20261004{tag}.html'
assert (PUBLIC/entry_html).resolve().parent==PUBLIC.resolve()
assert not (PUBLIC/entry_html).exists()
for source in sorted(assets.rglob('*')):
    if source.is_file():
        relative=source.relative_to(ROOT).as_posix()
        assert digest(source)==protected[relative],relative
index=build/'index.html'
assert digest(index)==protected[index.relative_to(ROOT).as_posix()]
entry=re.search(r'src="(/assets/[^\"]+\.js)"',index.read_text(encoding='utf-8'))[1]
assert 'http://127.0.0.1:3001/api' in (build/entry.lstrip('/')).read_text(encoding='utf-8'),'Production API target mismatch'
PUBLIC.mkdir(exist_ok=True)
dest.mkdir()
for source in sorted(assets.rglob('*')):
    if source.is_file():
        target=dest/source.relative_to(assets)
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(source,target)
        created.append({'path':target.relative_to(ROOT).as_posix(),'sha256':digest(target)})
target=PUBLIC/entry_html
shutil.copyfile(index,target)
created.append({'path':target.relative_to(ROOT).as_posix(),'sha256':digest(target)})
manifest.write_text(json.dumps({'scope':'Exact isolated production build served as static public assets on5174; compiled source and API3001 unchanged','original_build_reference':f'raw/interaction-production-build{tag}-2026-10-04.json','created':created,'cleanup_policy':'Only exact paths with matching hashes may be removed; public assets directory was absent before run'},indent=2),encoding='utf-8')
print(json.dumps({'staged_files':len(created),'origin':'http://127.0.0.1:5174','production_entry':'/'+entry_html,'api':3001}))

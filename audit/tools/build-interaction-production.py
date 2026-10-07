"""Build an isolated production artifact against API3001; leave the existing dist untouched."""
from pathlib import Path
import hashlib,json,os,re,shutil,subprocess,sys
ROOT=Path(__file__).resolve().parents[2]
RUN=ROOT/'audit/runs/2026-10-03-improvement-02'
tag='' if len(sys.argv)==1 else '-'+sys.argv[1]
assert tag in ('','-after-spacing','-after-bounds','-after-pointer','-after-pointer-final','-after-pointer-complete','-after-contrast','-after-feedback')
OUT=RUN/f'runtime/production-timing-20261004{tag}'
manifest=RUN/f'raw/interaction-production-build{tag}-2026-10-04.json'
assert not (ROOT/'apps/web/public/assets').exists(),'Clean audit staging before production build'
assert not OUT.exists() and not manifest.exists(),'Prior production timing artifact preserved'
assert OUT.resolve().is_relative_to((RUN/'runtime').resolve())
checktag='feedback-2026-10-04' if tag=='-after-feedback' else 'contrast-2026-10-04' if tag=='-after-contrast' else 'pointer-complete-2026-10-04' if tag=='-after-pointer-complete' else 'pointer-final-2026-10-04' if tag=='-after-pointer-final' else 'pointer-2026-10-04' if tag=='-after-pointer' else 'bounds-2026-10-04' if tag=='-after-bounds' else 'spacing-2026-10-04' if tag else '2026-10-04'
verification=json.loads((RUN/f'raw/final-verification-manifest-{checktag}.json').read_text(encoding='utf-8'))
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for path,expected in verification['source_hashes'].items():assert digest(ROOT/path)==expected,path
guard=subprocess.run([shutil.which('node'),'--input-type=module','-e',"import {guardAuditRuntime,closeConnection} from './audit/tools/audit-api-client.mjs'; try{await guardAuditRuntime();}finally{await closeConnection();}"],cwd=ROOT,capture_output=True,text=True)
assert guard.returncode==0,'Exact database/API runtime guard failed'
env=os.environ.copy();env['VITE_API_URL']='http://127.0.0.1:3001/api'
OUT.parent.mkdir(parents=True,exist_ok=True)
with (RUN/f'raw/interaction-production-build{tag}-2026-10-04.txt').open('w',encoding='utf-8') as log:
    result=subprocess.run([shutil.which('node'),str(ROOT/'apps/web/node_modules/vite/bin/vite.js'),'build','--outDir',str(OUT)],cwd=ROOT/'apps/web',env=env,stdout=log,stderr=subprocess.STDOUT)
assert result.returncode==0,'Isolated production build failed'
index=OUT/'index.html'
entry=re.search(r'src="(/assets/[^\"]+\.js)"',index.read_text(encoding='utf-8'))[1]
assert 'http://127.0.0.1:3001/api' in (OUT/entry.lstrip('/')).read_text(encoding='utf-8'),'Compiled API target mismatch'
files={p.relative_to(ROOT).as_posix():digest(p) for p in OUT.rglob('*') if p.is_file()}
manifest.write_text(json.dumps({'scope':'Production artifact compiled with explicit isolated API3001; original apps/web/dist preserved','out':OUT.relative_to(ROOT).as_posix(),'api':3001,'source_hashes':verification['source_hashes'],'build_hashes':files,'exit':result.returncode},indent=2),encoding='utf-8')
print(json.dumps({'build_exit':0,'assets':len(files),'source_unchanged':len(verification['source_hashes']),'api':3001}))

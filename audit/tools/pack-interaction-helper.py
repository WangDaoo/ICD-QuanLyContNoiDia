"""Pack only our own audit modules into the hash-guarded temporary page."""
from pathlib import Path
import hashlib,json,re,sys
ROOT=Path(__file__).resolve().parents[2]
RUN=ROOT/'audit/runs/2026-10-03-improvement-02'
helper=ROOT/'apps/web/__ui-audit-timing-20261004.html'
manifest=RUN/'raw/interaction-helper-current.json'
data=json.loads(manifest.read_text(encoding='utf-8'))
assert helper.resolve().parent==(ROOT/'apps/web').resolve()
assert hashlib.sha256(helper.read_bytes()).hexdigest()==data['sha256'],'Unknown helper contents preserved'
mode=sys.argv[1]
assert mode in ['development','production']
tag='' if len(sys.argv)<3 else '-'+sys.argv[2]
assert tag in ('','-after-spacing','-after-bounds','-after-pointer','-after-pointer-final','-after-pointer-complete','-after-contrast','-after-feedback')
template=(ROOT/'audit/tools/web-interaction-harness.html').read_text(encoding='utf-8')
metrics=(ROOT/'audit/tools/runtime/interaction-metrics.mjs').read_text(encoding='utf-8')
sensor=(ROOT/'audit/tools/runtime/interaction-sensor.mjs').read_text(encoding='utf-8')
sensor=re.sub(r'^import .*?;\s*','',sensor,count=1,flags=re.M)
bundle=re.sub(r'^export ','',metrics+'\n'+sensor,flags=re.M)
template=template.replace('<script type="module">','<script>')
template=re.sub(r'^import .*?;\s*','',template,flags=re.M)
template=template.replace('<script>','<script>\n'+bundle,1)
if mode=='production':
    assert (RUN/f'raw/interaction-production-staging{tag}-2026-10-04.json').is_file()
    template=template.replace('src="/app/containers"',f'src="/__audit-production-20261004{tag}.html"')
helper.write_text(template,encoding='utf-8')
data.update({'sha256':hashlib.sha256(helper.read_bytes()).hexdigest(),'packing':'Audit-owned pure JS inline, source modules retained','mode':mode,'build_tag':tag})
manifest.write_text(json.dumps(data,indent=2),encoding='utf-8')
print(json.dumps({'helper_packed':True,'mode':mode,'application_source_modified':False}))

"""Select a new immutable CSS-verification build; preserve every earlier artifact."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
for name in ['build-interaction-production.py','prepare-production-interaction.py','cleanup-production-interaction.py','pack-interaction-helper.py']:
    path=ROOT/'audit/tools'/name
    text=path.read_text(encoding='utf-8')
    old="'-after-pointer-complete')"
    assert text.count(old)==1,name
    text=text.replace(old,"'-after-pointer-complete','-after-contrast')")
    if name=='build-interaction-production.py':
        text=text.replace("checktag='pointer-complete", "checktag='contrast-2026-10-04' if tag=='-after-contrast' else 'pointer-complete",1)
    path.write_text(text,encoding='utf-8')
p=ROOT/'audit/tools/checkpoint-preflight.py'
s=p.read_text(encoding='utf-8')
s=s.replace("'--pointer-complete']","'--pointer-complete','--contrast']",1)
s=s.replace("tag = 'pointer-complete", "tag = 'contrast-2026-10-04' if '--contrast' in sys.argv else 'pointer-complete",1)
p.write_text(s,encoding='utf-8')

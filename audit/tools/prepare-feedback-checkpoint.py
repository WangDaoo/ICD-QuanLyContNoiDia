"""Extend the guarded production harness for final feedback verification."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
for name in ['build-interaction-production.py','prepare-production-interaction.py','cleanup-production-interaction.py','pack-interaction-helper.py']:
    path=ROOT/'audit/tools'/name
    text=path.read_text(encoding='utf-8')
    old="'-after-contrast')"
    assert text.count(old)==1,name
    text=text.replace(old,"'-after-contrast','-after-feedback')")
    if name=='build-interaction-production.py':
        text=text.replace("checktag='contrast", "checktag='feedback-2026-10-04' if tag=='-after-feedback' else 'contrast",1)
    path.write_text(text,encoding='utf-8')
p=ROOT/'audit/tools/checkpoint-preflight.py'
s=p.read_text(encoding='utf-8')
s=s.replace("'--contrast']","'--contrast','--feedback']",1)
s=s.replace("tag = 'contrast", "tag = 'feedback-2026-10-04' if '--feedback' in sys.argv else 'contrast",1)
p.write_text(s,encoding='utf-8')
p=ROOT/'audit/tools/web-interaction-harness.html'
s=p.read_text(encoding='utf-8')
old='pointerRecords.push(record);outputPointer();setTimeout('
assert s.count(old)==1
s=s.replace(old,'pointerRecords.push(record);tracePointerFrames(target,record);outputPointer();setTimeout(',1)
s=s.replace('transition:s.transitionDuration,easing:','transition:s.transitionDuration,transitionProperty:s.transitionProperty,easing:',1)
p.write_text(s,encoding='utf-8')

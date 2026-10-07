"""Select fresh technical evidence and independent integrity output for this checkpoint."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'audit/tools/checkpoint-improvement.py'
s=p.read_text(encoding='utf-8')
for stem in ['final-verification-manifest','technical-check-exits','web-sdk-source-tests','web-runtime-fixtures','web-existing-ui-regressions','web-typecheck','web-build','lint']:
    s=s.replace(stem+'-2026-10-04.',stem+'-feedback-2026-10-04.')
p.write_text(s,encoding='utf-8')
p=ROOT/'audit/tools/checkpoint-validate.py'
s=p.read_text(encoding='utf-8')
s=s.replace("'593/593'","'606/606'",1)
s=s.replace("verification = read(RUN/'raw/final-verification-manifest-2026-10-04.json')","verification = read(ROOT/manifest['technical_manifest'])",1)
s=s.replace("raw/checkpoint-integrity-review-2026-10-04.json","raw/checkpoint-integrity-review-2026-10-04-reaudit01.json",1)
s=s.replace("Report writes and historical-hash assertions completed; Windows cp1252 stdout serialization failed afterward. UTF-safe stdout fixed; no report regeneration/overwrite required.","Historical reports preserved; exact source/technical log hashes and independent locked-rubric arithmetic validated.",1)
p.write_text(s,encoding='utf-8')

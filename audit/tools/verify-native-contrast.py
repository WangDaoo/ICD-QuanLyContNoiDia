import json
from pathlib import Path
from collections import Counter
from PIL import Image

root = Path.cwd()
measurements = json.loads((root / 'audit/raw/baseline/mobile/contrast-measurements.json').read_text(encoding='utf-8-sig'))

def rgb(text):
    return tuple(int(text[i:i+2], 16) for i in (1, 3, 5))

def luminance(color):
    v = [c / 255 for c in color]
    v = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in v]
    return sum(c * w for c, w in zip(v, (0.2126, 0.7152, 0.0722)))

results = []
for m in measurements:
    im = Image.open(root / m['screenshot']).convert('RGB')
    # Read pixels in the recorded region; do not write or alter any image.
    pixels = Counter(im.crop(tuple(m['rect'])).getdata())
    fg, bg = rgb(m['foreground']), rgb(m['background'])
    lf, lb = luminance(fg), luminance(bg)
    contrast = (max(lf, lb) + 0.05) / (min(lf, lb) + 0.05)
    matched = abs(contrast - m['contrast']) < 0.0001 and pixels[fg] == m['exactForegroundPixels'] and pixels[bg] == m['exactBackgroundPixels']
    results.append({'name': m['name'], 'screenshot': m['screenshot'], 'contrast': contrast, 'foreground_pixels': pixels[fg], 'background_pixels': pixels[bg], 'matches_recorded_measurement': matched})
result = {'status': 'PASS' if all(x['matches_recorded_measurement'] for x in results) else 'FAIL', 'method': 'Independent read-only RGB pixel/count and WCAG luminance calculation from recorded screenshot rectangles', 'results': results}
(root / 'audit/raw/baseline/mobile/contrast-independent-verification.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps({'status': result['status'], 'pairs': len(results), 'matched': sum(x['matches_recorded_measurement'] for x in results)}))
if result['status'] != 'PASS':
    raise SystemExit(1)

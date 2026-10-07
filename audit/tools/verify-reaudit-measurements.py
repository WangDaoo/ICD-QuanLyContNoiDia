import json
import re
from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image

root = Path.cwd()
raw = root / 'audit/raw/re-audit/mobile'
read = lambda name: json.loads((raw / name).read_text(encoding='utf-8-sig'))

def rgb(text):
    return tuple(int(text[i:i + 2], 16) for i in (1, 3, 5))

def luminance(color):
    values = [c / 255 for c in color]
    values = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in values]
    return sum(c * w for c, w in zip(values, (0.2126, 0.7152, 0.0722)))

colors = []
for item in read('contrast-measurements.json')['results']:
    image = Image.open(root / 'audit/screenshots/re-audit/mobile' / (item['capture'] + '.png')).convert('RGB')
    pixels = Counter(image.crop(tuple(item['rect'])).getdata())
    fg, bg = rgb(item['foreground']), rgb(item['background'])
    lf, lb = luminance(fg), luminance(bg)
    contrast = (max(lf, lb) + 0.05) / (min(lf, lb) + 0.05)
    matches = (abs(contrast - item['contrast']) < 0.0001
               and pixels[fg] == item['foreground_pixels'] and pixels[bg] == item['background_pixels'])
    colors.append({'name': item['name'], 'contrast': contrast, 'matches': matches, 'passes_4_5': contrast >= 4.5})

targets = []
for capture in read('hit-area-measurements.json')['results']:
    nodes = list(ET.parse(raw / (capture['capture'] + '.xml')).iter('node'))
    density = capture['density_dpi'] / 160
    for action in capture['actions']:
        bounds = action['bounds']
        matching = [n for n in nodes if [int(v) for v in re.findall(r'\d+', n.get('bounds', ''))] == bounds
                    and n.get('clickable') == 'true']
        width, height = (bounds[2] - bounds[0]) / density, (bounds[3] - bounds[1]) / density
        full = action['status'] != 'PARTIAL_VIEWPORT'
        targets.append({'capture': capture['capture'], 'label': action['label'], 'xml_match': bool(matching),
                        'width_dp': width, 'height_dp': height, 'partial': not full,
                        'passes': (width >= 47.99 and height >= 47.99) if full else None})

result = {'method': 'Independent recorded PNG pixel counts/luminance and original clickable XML bounds divided by recorded density',
          'colors': colors, 'targets': targets,
          'status': 'PASS' if all(c['matches'] and c['passes_4_5'] for c in colors)
          and all(t['xml_match'] and (t['passes'] is not False) for t in targets) else 'FAIL'}
(raw / 'measurements-independent-verification.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps({'status': result['status'], 'pairs': len(colors), 'xml_targets': len(targets),
                  'partial_excluded_from_minimum_passes': sum(t['partial'] for t in targets)}))
if result['status'] != 'PASS':
    raise SystemExit(1)

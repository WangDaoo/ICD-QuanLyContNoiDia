"""Read captured native screenshots and Android hit bounds; never modify the baseline."""
import json
import re
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / 'audit/raw/re-audit/mobile'
SHOTS = ROOT / 'audit/screenshots/re-audit/mobile'

def bounds(node):
    return tuple(map(int, re.findall(r'\d+', node.attrib['bounds'])))

def luminance(color):
    channels = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in channels]
    return sum(a * b for a, b in zip(linear, (.2126, .7152, .0722)))

def rgb(color):
    return tuple(int(color[i:i + 2], 16) for i in (1, 3, 5))

pairs = [
    ('Light session success', '02-gate-in-light', 'ĐÃ ĐĂNG NHẬP', '#047857', '#ECFDF5'),
    ('Dark session success', '03-gate-in-dark', 'ĐÃ ĐĂNG NHẬP', '#34D399', '#063E33'),
    ('Light readiness warning', '11-container-readiness-light', 'CHƯA ĐỦ ĐIỀU KIỆN', '#92400E', '#FFFBEB'),
    ('Dark readiness warning', '12-container-readiness-dark', 'CHƯA ĐỦ ĐIỀU KIỆN', '#FBBF24', '#422F19'),
    ('Dark logout fill', '06-logout-dark', 'Đăng xuất', '#FFFFFF', '#BE123C'),
    ('Light logout fill', '07-logout-light', 'Đăng xuất', '#FFFFFF', '#BE123C'),
    ('Light role danger text', '02-gate-in-light', 'ADMIN', '#B91C1C', '#FEF2F2'),
    ('Dark role danger text', '03-gate-in-dark', 'ADMIN', '#FB7185', '#431D2A'),
    ('Light selected Gate-Out', '27-320-gate-out-light', 'Quét Ra (Gate-Out)', '#FFFFFF', '#047857'),
]
colors = []
for name, capture, label, fg, bg in pairs:
    tree = ET.parse(RAW / f'{capture}.xml')
    matches = [n for n in tree.iter('node') if n.attrib.get('text') == label]
    if not matches:
        raise AssertionError(f'Missing native text: {name}')
    # Prefer the first role label in the header, not the account role in the session card.
    node = matches[0]
    rect = bounds(node)
    image = Image.open(SHOTS / f'{capture}.png').convert('RGB')
    pixels = Counter(image.crop(rect).get_flattened_data())
    a, b = luminance(fg), luminance(bg)
    ratio = (max(a, b) + .05) / (min(a, b) + .05)
    verified = pixels[rgb(fg)] > 0 and pixels[rgb(bg)] > 0
    colors.append({'name': name, 'capture': capture, 'rect': rect, 'foreground': fg, 'background': bg,
                   'foreground_pixels': pixels[rgb(fg)], 'background_pixels': pixels[rgb(bg)],
                   'contrast': round(ratio, 4), 'normal_threshold': 4.5,
                   'status': 'PASS' if verified and ratio >= 4.5 else 'FAIL'})

geometry = []
for file in sorted(RAW.glob('[0-9][0-9]-*.xml')):
    if file.name.startswith(('00-', '01-', '05-current')):
        continue
    tree = ET.parse(file)
    parents = {child: parent for parent in tree.iter() for child in parent}
    rows = []
    actionable = []
    for node in tree.iter('node'):
        attrs = node.attrib
        if attrs.get('package') != 'host.exp.exponent' or attrs.get('clickable') != 'true':
            continue
        x1, y1, x2, y2 = bounds(node)
        # Captures made by this check use Android density420 throughout (2.625px/dp).
        width, height = (x2 - x1) / 2.625, (y2 - y1) / 2.625
        label = attrs.get('content-desc') or attrs.get('text') or attrs.get('class')
        cropped = False
        parent = parents.get(node)
        while parent is not None:
            if parent.attrib.get('class') in ('android.widget.ScrollView', 'android.widget.HorizontalScrollView'):
                px1, py1, px2, py2 = bounds(parent)
                if width < 48 - .2 or height < 48 - .2:
                    cropped |= (x1 == px1 or x2 == px2 or y1 == py1 or y2 == py2)
            parent = parents.get(parent)
        status = 'PARTIAL_VIEWPORT' if cropped else 'PASS' if min(width, height) >= 48 - .2 else 'FAIL'
        rows.append({'label': label, 'bounds': [x1, y1, x2, y2], 'width_dp': round(width, 3), 'height_dp': round(height, 3), 'status': status})
        if status != 'PARTIAL_VIEWPORT':
            actionable.append((label, (x1, y1, x2, y2)))
    overlaps = []
    for i, (first, a) in enumerate(actionable):
        for second, b in actionable[i + 1:]:
            if min(a[2], b[2]) > max(a[0], b[0]) and min(a[3], b[3]) > max(a[1], b[1]):
                overlaps.append([first, second])
    geometry.append({'capture': file.stem, 'density_dpi': 420, 'width_dp': 320 if '320' in file.stem else 1080 / 2.625,
                     'font_scale': 1.5 if '320' in file.stem else 1.0, 'actions': rows, 'overlaps': overlaps,
                     'status': 'PASS' if rows and not overlaps and all(row['status'] != 'FAIL' for row in rows) else 'FAIL'})

(RAW / 'contrast-measurements.json').write_text(json.dumps({'method': 'Exact RGB counts in native text rectangles and WCAG luminance', 'results': colors}, indent=2, ensure_ascii=False), encoding='utf-8')
(RAW / 'hit-area-measurements.json').write_text(json.dumps({'method': 'Android UIAutomator clickable rectangles; density420; partial viewport clips disclosed separately', 'results': geometry}, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps({'contrast': [{'name': row['name'], 'ratio': row['contrast'], 'status': row['status']} for row in colors],
                  'geometry': [{'capture': row['capture'], 'actions': len(row['actions']), 'status': row['status'], 'overlaps': row['overlaps'],
                                'failures': [action for action in row['actions'] if action['status'] == 'FAIL']} for row in geometry]}, ensure_ascii=False))
assert all(row['status'] == 'PASS' for row in colors), 'Native contrast failed'
assert all(row['status'] == 'PASS' for row in geometry), 'Native target check failed'

"""Capture current Android evidence without changing app data or old reports."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
import argparse
import hashlib
import json
import os
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
RUN = ROOT / 'audit/runs/2026-10-11-native-01'
ADB = Path(os.environ['LOCALAPPDATA']) / 'Android/Sdk/platform-tools/adb.exe'
SERIAL = 'emulator-5554'

def adb(*args):
    result = subprocess.run([str(ADB), '-s', SERIAL, *args], capture_output=True,
                            text=True, encoding='utf-8', errors='replace', timeout=30)
    if result.returncode:
        raise RuntimeError(f'ADB operation failed: {args[0]}')
    return result.stdout.strip()

def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def bounds(value):
    import re
    return [int(n) for n in re.findall(r'\d+', value)]

def tree():
    adb('shell', 'uiautomator', 'dump', '/sdcard/icd-native-current.xml')
    local = RUN / 'raw/current.xml'
    local.parent.mkdir(parents=True, exist_ok=True)
    adb('pull', '/sdcard/icd-native-current.xml', str(local))
    return ET.parse(local)

def snapshot():
    mobile = ROOT / 'apps/mobile'
    files = [p for directory in ('src', 'tests') for p in (mobile / directory).rglob('*') if p.is_file()]
    files += [mobile / name for name in ('package.json', 'app.json', 'index.ts', 'App.tsx') if (mobile / name).is_file()]
    hashes = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    version = adb('shell', 'dumpsys', 'package', 'host.exp.exponent')
    data = {
        'at': datetime.now(timezone(timedelta(hours=7))).isoformat(),
        'serial': SERIAL, 'android': adb('shell', 'getprop', 'ro.build.version.release'),
        'sdk': adb('shell', 'getprop', 'ro.build.version.sdk'),
        'size': adb('shell', 'wm', 'size'), 'density': adb('shell', 'wm', 'density'),
        'font_scale': adb('shell', 'settings', 'get', 'system', 'font_scale'),
        'night_mode': adb('shell', 'cmd', 'uimode', 'night'),
        'accessibility_services': adb('shell', 'settings', 'get', 'secure', 'enabled_accessibility_services'),
        'accessibility_enabled': adb('shell', 'settings', 'get', 'secure', 'accessibility_enabled'),
        'rotation_auto': adb('shell', 'settings', 'get', 'system', 'accelerometer_rotation'),
        'rotation_user': adb('shell', 'settings', 'get', 'system', 'user_rotation'),
        'expo_go': [s.strip() for s in version.splitlines() if 'versionName=' in s or 'versionCode=' in s],
        'source_hashes': hashes,
        'api': 'http://127.0.0.1:3001/api via ADB reverse',
        'database': 'icd_ux_audit_20261003_e2e',
        'baseline': 'audit/2026-10-04-reaudit-01-report.md',
        'original_adb_reverse': [],
        'scope': 'Android native; iOS and spoken screen-reader output remain unverified until measured',
    }
    target = RUN / 'manifest.json'
    if target.exists():
        previous = json.loads(target.read_text(encoding='utf-8'))
        if previous['source_hashes'] != hashes:
            raise RuntimeError('Source changed; use a new snapshot/run')
    else:
        write_json(target, data)
    old = json.loads((ROOT / 'audit/runs/2026-10-03-improvement-02/ledger.json').read_text(encoding='utf-8-sig'))
    cases = [f for f in old['findings'] if f.get('id') in
             {f'M-{n:03}' for n in range(4, 15)} | {'M-N-001', 'M-N-002'}]
    assert len(cases) == 13, 'Incomplete baseline finding inventory'
    write_json(RUN / 'acceptance-cases.json', {'source_status_is_not_native_acceptance': True,
               'cases': [{'finding': f['id'], 'title': f['title'], 'baseline_status': f['status'],
                          'acceptance': f.get('acceptance', []), 'native_status': 'PENDING'} for f in cases]})
    print(json.dumps({'snapshot': str(target), 'source_files': len(hashes), 'pending': len(cases)}))

def capture(name):
    if not name.replace('-', '').replace('_', '').isalnum():
        raise RuntimeError('Invalid case name')
    xml_path = RUN / f'raw/{name}.xml'
    png_path = RUN / f'screenshots/{name}.png'
    if xml_path.exists() or png_path.exists():
        raise RuntimeError('Existing evidence preserved; use a new case name')
    adb('shell', 'uiautomator', 'dump', '/sdcard/icd-native-capture.xml')
    xml_path.parent.mkdir(parents=True, exist_ok=True)
    png_path.parent.mkdir(parents=True, exist_ok=True)
    adb('pull', '/sdcard/icd-native-capture.xml', str(xml_path))
    adb('shell', 'screencap', '-p', '/sdcard/icd-native-capture.png')
    adb('pull', '/sdcard/icd-native-capture.png', str(png_path))
    parsed = ET.parse(xml_path)
    for node in parsed.iter('node'):
        if node.get('password') == 'true':
            node.set('text', '[redacted]')
    parsed.write(xml_path, encoding='utf-8', xml_declaration=True)
    rows = []
    for node in parsed.iter('node'):
        a = node.attrib
        if a.get('text') or a.get('content-desc') or a.get('clickable') == 'true':
            rows.append({k: a.get(k, '') for k in ('text', 'content-desc', 'class', 'bounds',
                                                  'clickable', 'enabled', 'selected', 'focused', 'password')})
    write_json(RUN / f'raw/{name}-nodes.json', rows)
    print(json.dumps({'image': str(png_path), 'nodes': rows}, ensure_ascii=False))

def tap(label):
    candidates = [n for n in tree().iter('node')
                  if n.get('content-desc') == label or n.get('text') == label]
    if len(candidates) != 1:
        raise RuntimeError(f'Expected one visible node, found {len(candidates)}')
    b = bounds(candidates[0].get('bounds', ''))
    if len(b) != 4 or b[0] == b[2] or b[1] == b[3]:
        raise RuntimeError('Target has no visible bounds')
    adb('shell', 'input', 'tap', str((b[0]+b[2])//2), str((b[1]+b[3])//2))
    print('Tapped visible target')

def health():
    response = adb('shell', 'curl', '--silent', '--show-error', '--max-time', '5',
                   '--include', 'http://127.0.0.1:3001/api/health')
    status = response.splitlines()[0] if response else 'NO_RESPONSE'
    # This guarded health response has a JSON object body and no header braces.
    payload = response[response.find('{'):] if '{' in response else ''
    try:
        body = json.loads(payload)
    except ValueError:
        body = None
    success = ' 200 ' in status and isinstance(body, dict) and (body.get('data') or body).get('database') == 'up'
    evidence = {'at': datetime.now(timezone(timedelta(hours=7))).isoformat(),
                'serial': SERIAL, 'request': 'GET http://127.0.0.1:3001/api/health from Android shell',
                'method': 'native curl over ADB reverse', 'status': status, 'body': body,
                'passed': success, 'scope': 'Device network only; not proof of app API configuration'}
    write_json(RUN / 'raw/device-api-connectivity-curl.json', evidence)
    print(json.dumps(evidence, ensure_ascii=False))
    if not success:
        raise RuntimeError('Device API connectivity not verified')

parser = argparse.ArgumentParser()
parser.add_argument('action', choices=['snapshot', 'capture', 'tap', 'health'])
parser.add_argument('value', nargs='?')
args = parser.parse_args()
if args.action == 'snapshot':
    snapshot()
elif args.action == 'capture':
    capture(args.value)
elif args.action == 'health':
    health()
else:
    tap(args.value)

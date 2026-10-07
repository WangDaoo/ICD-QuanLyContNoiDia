import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

const implementation = new URL('./contrast-offline.mjs', import.meta.url);
test('offline Color4 contrast tool is present', () => assert.ok(existsSync(implementation), 'Color4 converter is missing'));
if (existsSync(implementation)) {
  const { analyzeMeasurement } = await import(implementation.href);
  const base = { fontSizePx: 16, fontWeight: 400, backgroundLayers: ['white'] };
  test('known black/white WCAG contrast is 21', () => {
    const result = analyzeMeasurement({ ...base, foregroundRaw: '#000' });
    assert.equal(result.status, 'PASS');
    assert.equal(result.ratio, 21);
  });
  test('OKLCH neutral L=.5 parses and has white contrast six', () => {
    const result = analyzeMeasurement({ ...base, foregroundRaw: 'oklch(50% 0 0)' });
    assert.equal(result.status, 'PASS');
    assert.ok(Math.abs(result.ratio - 6) < 0.0001);
  });
  test('half-transparent black is composited over the measured white surface', () => {
    const result = analyzeMeasurement({ ...base, foregroundRaw: 'rgb(0 0 0 / 50%)' });
    assert.equal(result.status, 'FAIL');
    assert.ok(Math.abs(result.ratio - 3.976653024912438) < 0.00001);
  });
  test('nearest transparent surface composites over opaque outer surface', () => {
    const result = analyzeMeasurement({ ...base, foregroundRaw: '#000', backgroundLayers: ['rgb(255 255 255 / .5)', '#000'] });
    assert.ok(Math.abs(result.ratio - 5.280822809644651) < 0.00001);
  });
  test('invalid and unresolved colors never silently become white', () => {
    for (const raw of ['not-a-color', 'currentColor', 'var(--unknown)', 'color-mix(in oklch, white, black)']) {
      const result = analyzeMeasurement({ ...base, foregroundRaw: raw });
      assert.equal(result.status, 'UNKNOWN', raw);
      assert.equal(result.ratio, null, raw);
    }
  });
  test('gradient and image background remains unknown', () => {
    for (const image of ['linear-gradient(white, black)', 'url(photo.png)']) {
      const result = analyzeMeasurement({ ...base, foregroundRaw: 'black', backgroundLayers: [{ colorRaw: 'white', backgroundImage: image }] });
      assert.equal(result.status, 'UNKNOWN');
      assert.equal(result.ratio, null);
    }
  });
  test('missing opaque canvas remains unknown', () => {
    const result = analyzeMeasurement({ ...base, foregroundRaw: 'black', backgroundLayers: ['transparent'] });
    assert.equal(result.status, 'UNKNOWN');
    assert.equal(result.ratio, null);
  });
  test('disabled text is exempt and does not produce a failure', () => {
    const result = analyzeMeasurement({ ...base, foregroundRaw: '#ccc', disabled: true });
    assert.equal(result.status, 'EXEMPT');
  });
  test('large bold text uses the three-to-one contrast threshold', () => {
    const result = analyzeMeasurement({ ...base, foregroundRaw: '#888', fontSizePx: 19, fontWeight: 700 });
    assert.equal(result.requiredRatio, 3);
    assert.equal(result.status, 'PASS');
  });
  test('CSS group opacity is unknown without rendered pixel evidence', () => {
    const result = analyzeMeasurement({ ...base, foregroundRaw: 'black', opacity: .5 });
    assert.equal(result.status, 'UNKNOWN');
  });
}

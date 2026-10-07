#!/usr/bin/env node
/** Offline CSS Color4 contrast calculation. Never reads or drives a browser. */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Color from 'colorjs.io';

const SOURCE = {
  parser: 'colorjs.io 0.7.1',
  colorApi: 'https://colorjs.io/docs/the-color-object.html',
  contrastApi: 'https://colorjs.io/docs/contrast.html',
  criterion: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
};
const GAMUT_EPSILON = 0.00001;
const first = (...values) => values.find(value => value !== undefined && value !== null);
const isTrue = value => value === true || value === 'true';

function parseColor(raw, label) {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error(`${label}: missing measured color`);
  if (/currentcolor|var\(|color-mix\(|gradient\(|url\(/i.test(raw)) {
    throw new Error(`${label}: unresolved or non-solid CSS color: ${raw}`);
  }
  let color;
  try { color = new Color(raw).to('srgb'); }
  catch (error) { throw new Error(`${label}: parser rejected ${raw}: ${error.message}`); }
  if (!Number.isFinite(color.alpha) || color.alpha < 0 || color.alpha > 1) {
    throw new Error(`${label}: unsupported alpha`);
  }
  if (!color.coords.every(Number.isFinite)) throw new Error(`${label}: unresolved channel`);
  if (color.coords.some(value => value < -GAMUT_EPSILON || value > 1 + GAMUT_EPSILON)) {
    throw new Error(`${label}: outside sRGB gamut; display gamut or mapping is unmeasured`);
  }
  return { rgb: color.coords.map(value => Math.min(1, Math.max(0, value))), alpha: color.alpha };
}

function opaqueEffects(value, label) {
  if (value.opacity !== undefined && Number(value.opacity) !== 1) {
    throw new Error(`${label}: CSS group opacity requires rendered compositing evidence`);
  }
  for (const key of ['filter', 'backdropFilter', 'mixBlendMode', 'maskImage']) {
    if (value[key] && !['none', 'normal'].includes(value[key])) {
      throw new Error(`${label}: unsupported ${key}`);
    }
  }
}

function sourceOver(front, back) {
  const alpha = front.alpha + back.alpha * (1 - front.alpha);
  if (alpha === 0) return { rgb: [0, 0, 0], alpha: 0 };
  return {
    rgb: front.rgb.map((value, index) =>
      (value * front.alpha + back.rgb[index] * back.alpha * (1 - front.alpha)) / alpha),
    alpha,
  };
}

function resolveBackground(measurement) {
  if (!Array.isArray(measurement.backgroundLayers) || !measurement.backgroundLayers.length) {
    throw new Error('backgroundLayers: missing measured surface chain');
  }
  const parsed = [];
  let foundOpaque = false;
  for (const [index, layer] of measurement.backgroundLayers.entries()) {
    const value = typeof layer === 'string' ? { colorRaw: layer } : layer;
    if (!value || typeof value !== 'object') throw new Error(`background layer ${index}: invalid object`);
    opaqueEffects(value, `background layer ${index}`);
    const image = first(value.backgroundImage, value.backgroundImageRaw, value.image, 'none');
    if (image !== 'none') throw new Error(`background layer ${index}: gradient/image requires pixel samples`);
    const color = parseColor(first(value.colorRaw, value.raw, value.backgroundColor, value.color, value.bg), `background layer ${index}`);
    parsed.push(color);
    if (color.alpha === 1) { foundOpaque = true; break; }
  }
  if (!foundOpaque && measurement.canvasRaw !== undefined) {
    const canvas = parseColor(measurement.canvasRaw, 'measured canvas');
    parsed.push(canvas);
    foundOpaque = canvas.alpha === 1;
  }
  if (!foundOpaque) throw new Error('background: no measured opaque surface or canvas; no white fallback');
  let background = parsed.pop();
  while (parsed.length) background = sourceOver(parsed.pop(), background);
  return background;
}

function fontThreshold(measurement) {
  const sizeRaw = first(measurement.fontSizePx, measurement.fontSize);
  const size = typeof sizeRaw === 'number' ? sizeRaw :
    typeof sizeRaw === 'string' && /^\d+(\.\d+)?px$/.test(sizeRaw) ? parseFloat(sizeRaw) : null;
  const weightRaw = first(measurement.fontWeight, 400);
  const weight = weightRaw === 'bold' ? 700 : weightRaw === 'normal' ? 400 : Number(weightRaw);
  const large = Number.isFinite(size) && (size >= 24 || (size >= 14 * 96 / 72 && weight >= 700));
  return { requiredRatio: large ? 3 : 4.5, textClass: large ? 'large' : 'normal',
    thresholdAssumption: size === null ? 'font size unavailable; conservative normal-text threshold' : null };
}

export function analyzeMeasurement(measurement) {
  const identity = {
    id: first(measurement?.id, measurement?.selector, null),
    text: first(measurement?.text, null),
    ...fontThreshold(measurement ?? {}),
    ratio: null, ratioRange: null, foregroundSrgb: null, backgroundSrgb: null,
  };
  if (!measurement || typeof measurement !== 'object' || Array.isArray(measurement)) {
    return { ...identity, status: 'UNKNOWN', reason: 'measurement must be an object' };
  }
  if (isTrue(measurement.disabled) || isTrue(measurement.ariaDisabled) || isTrue(measurement.inactive)) {
    return { ...identity, status: 'EXEMPT', reason: 'explicitly inactive UI component; verify disabled state is genuine' };
  }
  try {
    opaqueEffects(measurement, 'foreground element');
    const foreground = parseColor(first(measurement.foregroundRaw, measurement.foregroundraw, measurement.color), 'foreground');
    const background = resolveBackground(measurement);
    const painted = sourceOver(foreground, background);
    const ratio = new Color('srgb', painted.rgb).contrast(new Color('srgb', background.rgb), 'WCAG21');
    if (!Number.isFinite(ratio)) throw new Error('non-finite contrast calculation');
    return { ...identity, status: ratio >= identity.requiredRatio ? 'PASS' : 'FAIL',
      ratio, ratioRange: [ratio, ratio], foregroundSrgb: painted.rgb, backgroundSrgb: background.rgb,
      reason: 'solid measured backgrounds; CSS source-over in encoded sRGB; WCAG21 on composited colors' };
  } catch (error) {
    return { ...identity, status: 'UNKNOWN', reason: error.message };
  }
}

export function analyzeDocument(input) {
  const measurements = Array.isArray(input) ? input : Array.isArray(input?.measurements) ? input.measurements : [input];
  const results = measurements.map(analyzeMeasurement);
  return {
    source: SOURCE,
    method: 'nearest-to-outer background chain; CSS Color4 to sRGB; alpha source-over; WCAG21; no browser access',
    caveats: [
      'Gradients, images, group opacity, blend/filter effects, unresolved colors, and out-of-sRGB colors are UNKNOWN.',
      'Missing background layers never default to white; canvasRaw must be a measured opaque canvas.',
      'ratioRange is a singleton for measured solid colors; UNKNOWN has no numerical range.',
      'This is offline evidence analysis, not a complete WCAG conformity audit.',
    ],
    counts: results.reduce((counts, item) => ({ ...counts, [item.status]: counts[item.status] + 1 }), { PASS: 0, FAIL: 0, UNKNOWN: 0, EXEMPT: 0 }),
    results,
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('node contrast-offline.mjs --input <measurements.json> [--output <contrast.json>]\nInput: array or {measurements:[{foregroundRaw,backgroundLayers,fontSizePx,fontWeight,disabled?}]}. Background layers ordered nearest first; strings or {colorRaw,backgroundImage?,opacity?}. Optional measured canvasRaw. Unsupported data returns UNKNOWN.');
    return;
  }
  const value = flag => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const inputPath = value('--input');
  if (!inputPath) throw new Error('--input is required');
  const output = JSON.stringify(analyzeDocument(JSON.parse(fs.readFileSync(inputPath, 'utf8'))), null, 2) + '\n';
  const outputPath = value('--output');
  if (outputPath) fs.writeFileSync(outputPath, output, 'utf8');
  else process.stdout.write(output);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}

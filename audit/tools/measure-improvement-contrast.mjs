import { createRequire } from 'node:module';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(resolve('audit/tools/runtime/package.json'));
const Color = require('colorjs.io').default;
const dir = resolve('audit/runs/2026-10-03-improvement-02/raw/browser');
const rgb = value => { const color = new Color(value).to('srgb'); return { c: color.coords.map(x => Math.max(0, Math.min(1, x))), a: color.alpha }; };
const over = (top, under) => top.c.map((value, index) => value * top.a + under[index] * (1 - top.a));
const luminance = c => c.map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((n,x,i) => n + x * [.2126,.7152,.0722][i], 0);
const cases = [];
const latest = new Map();
for (const file of readdirSync(dir)) {
  const match = file.match(/^(.+)-admin-(1440|768|375|320)(-r2|-overflow-fixed|-contrast-fixed)?\.json$/);
  if (!match || (match[2] === '1440' && !match[3])) continue; // Initial captures preceded React's route commit.
  const rank = { '-r2': 0, '-overflow-fixed': 1, '-contrast-fixed': 2 }[match[3]] ?? 0;
  const key = match[1] + ':' + match[2];
  if (!latest.has(key) || latest.get(key).rank < rank) latest.set(key, { file, rank });
}
for (const { file } of latest.values()) {
  const data = JSON.parse(readFileSync(resolve(dir, file)));
  const violations = [];
  let checked = 0, minimum = Infinity;
  for (const row of data.rows) {
    let background = [1,1,1];
    for (const entry of [...row.backgrounds].reverse()) background = over(rgb(entry.color), background);
    const foreground = over(rgb(row.color), background);
    const a = luminance(foreground), b = luminance(background);
    const ratio = (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
    const large = parseFloat(row.fontSize) >= 24 || (parseFloat(row.fontSize) >= 18.666 && Number(row.fontWeight) >= 700);
    const threshold = large ? 3 : 4.5;
    minimum = Math.min(minimum, ratio); checked++;
    if (ratio + .001 < threshold) violations.push({ text: row.text, selector: row.tag + '.' + row.className.replace(/\s+/g,'.'), ratio: Number(ratio.toFixed(3)), threshold, fontSize: row.fontSize, color: row.color });
  }
  cases.push({ file, checked, minimum: Number(minimum.toFixed(3)), violations, overflow: data.overflow });
}
writeFileSync(resolve(dir, '../contrast-after.json'), JSON.stringify({ method: 'Latest verified route capture per screen/width. Computed Color4 converted to sRGB; ancestor background alpha composition; WCAG relative luminance. Opacity/filter/image backgrounds require separate pixel verification.', cases }, null, 2));
console.log(JSON.stringify({ cases: cases.length, checked: cases.reduce((n,x)=>n+x.checked,0), failingCases: cases.filter(x=>x.violations.length).length, examples: cases.flatMap(x=>x.violations.map(v=>({file:x.file,...v}))).slice(0,10) },null,2));

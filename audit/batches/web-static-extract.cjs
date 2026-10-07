const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('../../apps/web/node_modules/typescript');
const root = path.resolve(__dirname, '../..');
const sourceRoot = path.join(root, 'apps/web/src');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(tsx?|css)$/.test(file)) files.push(file);
  }
}
walk(sourceRoot);
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const inventory = [];
for (const file of files.sort()) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const entry = { file: relative(file), lines: source.split(/\r?\n/).length, sha256: crypto.createHash('sha256').update(source).digest('hex'), controls: [], clickableNonNative: [], dialogs: [], labels: [], headings: [] };
  const line = node => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const attr = (node, key) => node.attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.getText(sf) === key);
  const value = a => a?.initializer?.getText(sf) ?? (a ? true : null);
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      if (['input', 'select', 'textarea', 'button'].includes(tag)) {
        let cursor = node.parent;
        let nestedLabel = false;
        while (cursor) {
          if (ts.isJsxElement(cursor) && cursor.openingElement.tagName.getText(sf) === 'label') nestedLabel = true;
          cursor = cursor.parent;
        }
        entry.controls.push({ line: line(node), tag, id: value(attr(node, 'id')), ariaLabel: value(attr(node, 'aria-label')), ariaLabelledby: value(attr(node, 'aria-labelledby')), ariaDescribedby: value(attr(node, 'aria-describedby')), ariaInvalid: value(attr(node, 'aria-invalid')), required: value(attr(node, 'required')), ariaRequired: value(attr(node, 'aria-required')), placeholder: value(attr(node, 'placeholder')), nestedLabel, opening: node.getText(sf) });
      }
      if (attr(node, 'onClick') && !['button', 'a', 'input', 'select', 'textarea', 'option'].includes(tag)) entry.clickableNonNative.push({ line: line(node), tag, role: value(attr(node, 'role')), tabIndex: value(attr(node, 'tabIndex')), onKeyDown: value(attr(node, 'onKeyDown')), opening: node.getText(sf) });
      if (tag === 'dialog' || value(attr(node, 'role')) === '"dialog"' || (value(attr(node, 'className')) ?? '').toString().includes('fixed inset-0')) entry.dialogs.push({ line: line(node), tag, role: value(attr(node, 'role')), opening: node.getText(sf) });
      if (tag === 'label') entry.labels.push({ line: line(node), htmlFor: value(attr(node, 'htmlFor')), opening: node.getText(sf) });
      if (/^h[1-6]$/.test(tag)) entry.headings.push({ line: line(node), tag });
    }
    ts.forEachChild(node, visit);
  }
  if (!file.endsWith('.css')) visit(sf);
  inventory.push(entry);
}
const result = { method: 'TypeScript AST extraction; source evidence only; no rendering, app imports, tests, or business writes', generatedAt: new Date().toISOString(), files: inventory };
const output = path.join(root, 'audit/raw/baseline/web/static-source-inventory.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output: relative(output), files: inventory.length, componentFiles: inventory.filter(x => x.file.endsWith('.tsx') && !x.file.includes('.test.')).length, controls: inventory.reduce((n,x)=>n+x.controls.length,0), clickableNonNative: inventory.reduce((n,x)=>n+x.clickableNonNative.length,0) }));

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '../../..');
const wanted = new Set(['containers-create-shipping-line', 'containers-create-consignee', 'containers-create-manifest', 'containers-create-mbl', 'containers-create-hbl', 'gate-pass-receiver-vehicle-plate', 'gate-pass-receiver-name', 'gate-pass-receiver-cccd']);
const inventory = [];
for (const view of ['ContainersView', 'GatePassView']) {
  const file = `apps/web/src/components/${view}.tsx`;
  const tree = ts.createSourceFile(file, readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = [];
  function walk(node) { if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) nodes.push(node); ts.forEachChild(node, walk); }
  walk(tree);
  function opening(node) { return ts.isJsxElement(node) ? node.openingElement : node; }
  function attr(node, name) { return opening(node).attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText() === name)?.initializer; }
  function text(node, name) { const value = attr(node, name); return value && ts.isStringLiteral(value) ? value.text : undefined; }
  for (const control of nodes) {
    const id = text(control, 'id');
    if (!wanted.has(id)) continue;
    const label = nodes.find(node => opening(node).tagName.getText() === 'label' && text(node, 'htmlFor') === id);
    assert.ok(label, `${id}: native label missing`);
    inventory.push({ file, id, visibleLabel: label.children.map(item => item.getText()).join('').trim(), type: opening(control).tagName.getText(), binding: attr(control, 'value')?.getText(), preserved_aria_label: text(control, 'aria-label'), readonly: opening(control).attributes.properties.some(item => ts.isJsxAttribute(item) && item.name.getText() === 'readOnly'), supplement: 'audit/fixes/W-S-002/supplement' });
  }
}
assert.equal(inventory.length, 8);
const inventoryFile = path.join(root, 'audit/fixes/W-S-002/inventory.json');
const existing = JSON.parse(readFileSync(inventoryFile, 'utf8')).filter(item => !wanted.has(item.id));
assert.equal(existing.length, 51);
writeFileSync(inventoryFile, `${JSON.stringify([...existing, ...inventory], null, 2)}\n`);
writeFileSync(path.join(root, 'audit/fixes/W-S-002/supplement/inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Total native label associations: ${existing.length + inventory.length}; supplemental ARIA names preserved: ${inventory.length}`);

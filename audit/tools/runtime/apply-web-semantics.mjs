import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '../../..');
const mode = process.argv[2];
assert.ok(['dialogs', 'labels', 'selectors'].includes(mode), 'Choose a scoped edit mode');
const finding = { dialogs: 'W-S-001', labels: 'W-S-002', selectors: 'W-S-003' }[mode];
const views = ['ManifestsView', 'ContainersView', 'TruckVisitsView', 'BillingView', 'GatePassView', 'HandoversView', 'MasterDataView', 'UsersRolesView', 'PartnerManagementView'];
const closeRoutes = {
  ManifestsView: ['() => setShowCreateModal(false)', '() => setShowMblModal(false)', '() => setShowHblModal(null)'],
  ContainersView: ['() => setActiveModalVisitId(null)', '() => setShowCreateVisit(false)'],
  TruckVisitsView: ['() => setShowCreateModal(false)'],
  BillingView: ['() => setShowTariffModal(false)', '() => setShowRuleModal(null)', '() => setShowCreateSoModal(false)', 'closePaymentModal'],
  GatePassView: ['() => setShowIssueModal(false)'], HandoversView: ['() => setShowCreateModal(false)'],
  MasterDataView: ['() => setShowForm(false)'], UsersRolesView: ['() => setShowUserForm(false)'], PartnerManagementView: ['() => setShowAddModal(false)'],
};
const selectors = { ManifestsView: 'setSelectedManifestId', HandoversView: 'setSelectedHandover', GatePassView: 'setSelectedGatePassId', EDIView: 'setSelectedEdiId', PartnerManagementView: 'setSelectedLog' };
const inventory = [];

function nodes(tree) {
  const result = [];
  function walk(node) { if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) result.push(node); ts.forEachChild(node, walk); }
  walk(tree);
  return result;
}
function opening(node) { return ts.isJsxElement(node) ? node.openingElement : node; }
function tag(node) { return opening(node).tagName.getText(); }
function attr(node, name) { return opening(node).attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText() === name); }
function textAttr(node, name) { const value = attr(node, name)?.initializer; return value && ts.isStringLiteral(value) ? value.text : undefined; }
function kebab(value) { return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase(); }

for (const name of mode === 'selectors' ? Object.keys(selectors) : views) {
  const relative = `apps/web/src/components/${name}.tsx`;
  const file = path.join(root, relative);
  const original = readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const all = nodes(tree);
  const changes = [];
  const prefix = kebab(name.replace(/View$/, ''));
  function replace(start, end, value) { changes.push({ start, end, value }); }
  if (mode === 'dialogs') {
    const overlays = all.filter(node => tag(node) === 'div' && (textAttr(node, 'className') ?? '').includes('fixed inset-0'));
    assert.equal(overlays.length, closeRoutes[name].length, `${name}: expected overlays not found`);
    for (let i = 0; i < overlays.length; i++) {
      const overlay = overlays[i];
      const children = nodes(overlay);
      const existingName = children.find(node => attr(node, 'aria-label') && textAttr(node, 'role') === 'dialog');
      const heading = children.find(node => tag(node) === 'h3');
      assert.ok(heading, `${name}: dialog heading missing`);
      const titleId = `${prefix}-dialog-${i + 1}-title`;
      const accessibleName = existingName ? attr(existingName, 'aria-label').getText() : `aria-labelledby="${titleId}"`;
      const pending = name === 'BillingView' && i === 3 ? ' pending={isPaying}' : '';
      replace(opening(overlay).getStart(), opening(overlay).end, opening(overlay).getText().replace(/^<div/, `<ModalOverlay ${accessibleName} onClose={${closeRoutes[name][i]}}${pending}`));
      replace(overlay.closingElement.getStart(), overlay.closingElement.end, '</ModalOverlay>');
      if (!existingName) {
        assert.equal(attr(heading, 'id'), undefined, `${name}: unexpected existing heading id`);
        replace(opening(heading).tagName.end, opening(heading).tagName.end, ` id="${titleId}"`);
      } else {
        for (const attribute of ['role', 'aria-modal', 'aria-label']) {
          const value = attr(existingName, attribute);
          assert.ok(value);
          replace(value.getFullStart(), value.end, '');
        }
      }
      inventory.push({ file: relative, dialogIndex: i + 1, title: heading.children.map(child => child.getText()).join('').trim(), onClose: closeRoutes[name][i], name: accessibleName, pending: pending || null });
    }
    replace(0, 0, "import { ModalOverlay } from './ModalOverlay';\n");
  } else if (mode === 'labels') {
    const seenControls = new Set();
    for (const node of all) {
      if (!ts.isJsxElement(node)) continue;
      const children = node.children.filter(child => ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxExpression(child));
      for (let i = 0; i < children.length - 1; i++) {
        const label = children[i];
        if (ts.isJsxExpression(label) || tag(label) !== 'label') continue;
        const adjacent = children[i + 1];
        const controls = ts.isJsxExpression(adjacent) ? nodes(adjacent).filter(item => ['input', 'select', 'textarea'].includes(tag(item))) : ['input', 'select', 'textarea'].includes(tag(adjacent)) ? [adjacent] : [];
        if (controls.length !== 1) continue;
        const control = controls[0];
        if (attr(control, 'aria-label') || attr(control, 'aria-labelledby')) continue;
        assert.equal(attr(label, 'htmlFor'), undefined, `${name}: association already present`);
        assert.equal(attr(control, 'id'), undefined, `${name}: control id already present`);
        assert.ok(!seenControls.has(control), `${name}: repeated control`);
        seenControls.add(control);
        const binding = attr(control, 'value')?.initializer?.getText().replace(/^\{|\}$/g, '') ?? `field-${seenControls.size}`;
        const id = `${prefix}-${kebab(binding)}`;
        assert.ok(!inventory.some(item => item.id === id), `${name}: duplicate control id`);
        replace(opening(label).tagName.end, opening(label).tagName.end, ` htmlFor="${id}"`);
        replace(opening(control).tagName.end, opening(control).tagName.end, ` id="${id}"`);
        inventory.push({ file: relative, id, visibleLabel: label.children.map(child => child.getText()).join('').trim(), type: tag(control), binding });
      }
    }
    assert.ok(seenControls.size > 0, `${name}: no unnamed visible fields found`);
  } else {
    const cards = all.filter(node => attr(node, 'onClick')?.initializer?.getText().includes(`${selectors[name]}(`));
    assert.equal(cards.length, 1, `${name}: expected record selector missing`);
    const card = cards[0];
    assert.equal(tag(card), 'div');
    assert.equal(nodes(card).filter(node => tag(node) === 'button').length, 0, `${name}: nested controls`);
    replace(opening(card).tagName.getStart(), opening(card).tagName.end, 'button type="button" aria-pressed={isSelected}');
    replace(card.closingElement.tagName.getStart(), card.closingElement.tagName.end, 'button');
    const className = attr(card, 'className').initializer;
    replace(className.getStart(), className.end, className.getText().replace('p-', 'block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 p-'));
    for (const inner of nodes(card).filter(node => node !== card && tag(node) === 'div')) {
      replace(opening(inner).tagName.getStart(), opening(inner).tagName.end, 'span');
      replace(inner.closingElement.tagName.getStart(), inner.closingElement.tagName.end, 'span');
      const innerClass = attr(inner, 'className')?.initializer;
      if (innerClass && ts.isStringLiteral(innerClass)) replace(innerClass.getStart(), innerClass.end, `"block ${innerClass.text}"`);
      else if (!innerClass) replace(opening(inner).tagName.end, opening(inner).tagName.end, ' className="block"');
      else throw new Error(`${name}: unexpected dynamic card child class`);
    }
    inventory.push({ file: relative, handler: selectors[name], selected: 'aria-pressed={isSelected}', focus: 'focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2' });
  }
  assert.ok(changes.length > 0, `${name}: no edit produced`);
  let updated = original;
  for (const edit of changes.sort((a, b) => b.start - a.start || b.end - a.end)) updated = updated.slice(0, edit.start) + edit.value + updated.slice(edit.end);
  const base = path.join(root, 'audit/fixes', finding);
  const before = path.join(base, 'before', relative);
  const after = path.join(base, 'after', relative);
  assert.ok(!existsSync(before), `${finding}: before snapshot already exists`);
  mkdirSync(path.dirname(before), { recursive: true });
  mkdirSync(path.dirname(after), { recursive: true });
  writeFileSync(before, original);
  writeFileSync(file, updated);
  writeFileSync(after, updated);
  const diff = spawnSync('git', ['diff', '--no-index', '--', before, after], { encoding: 'utf8' });
  assert.ok(diff.status === 1, `${name}: expected changed snapshot diff`);
  writeFileSync(path.join(base, `${name}.diff`), diff.stdout);
  console.log(`${finding}: ${name} ${changes.length} scoped source edits`);
}
writeFileSync(path.join(root, 'audit/fixes', finding, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);

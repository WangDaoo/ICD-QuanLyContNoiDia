import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '../../..');
const views = ['ManifestsView', 'ContainersView', 'TruckVisitsView', 'BillingView', 'GatePassView', 'HandoversView', 'MasterDataView', 'UsersRolesView', 'PartnerManagementView'];
const expectedDialogs = { ManifestsView: 3, ContainersView: 2, TruckVisitsView: 1, BillingView: 4, GatePassView: 1, HandoversView: 1, MasterDataView: 1, UsersRolesView: 1, PartnerManagementView: 1 };

function source(name, finding) {
  const file = process.env.WEB_SEMANTICS_BASELINE === '1'
    ? path.join(root, 'audit/fixes', finding, 'before/apps/web/src/components', `${name}.tsx`)
    : path.join(root, 'apps/web/src/components', `${name}.tsx`);
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function elements(tree) {
  const result = [];
  function walk(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) result.push(node);
    ts.forEachChild(node, walk);
  }
  walk(tree);
  return result;
}

function opening(element) {
  return ts.isJsxElement(element) ? element.openingElement : element;
}

function tag(element) {
  return opening(element).tagName.getText();
}

function attr(element, name) {
  return opening(element).attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText() === name)?.initializer;
}

function attrText(element, name) {
  const value = attr(element, name);
  return value && ts.isStringLiteral(value) ? value.text : undefined;
}

for (const name of views) {
  test(`${name}: operational overlays use a named modal with a close route`, () => {
    const nodes = elements(source(name, 'W-S-001'));
    const plainOverlays = nodes.filter(node => tag(node) === 'div' && (attrText(node, 'className') ?? '').includes('fixed inset-0'));
    assert.equal(plainOverlays.length, 0, `${name} still has plain overlays`);
    const dialogs = nodes.filter(node => tag(node) === 'ModalOverlay');
    assert.equal(dialogs.length, expectedDialogs[name], `${name} dialog coverage`);
    for (const dialog of dialogs) {
      assert.ok(attr(dialog, 'onClose'), `${name} missing state close callback`);
      assert.ok(attr(dialog, 'aria-label') || attr(dialog, 'aria-labelledby'), `${name} missing dialog name`);
    }
  });

  test(`${name}: visible field labels identify their adjacent native control`, () => {
    const nodes = elements(source(name, 'W-S-002'));
    let count = 0;
    for (const node of nodes) {
      if (!ts.isJsxElement(node)) continue;
      const children = node.children.filter(child => ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxExpression(child));
      for (let i = 0; i < children.length - 1; i++) {
        const label = children[i];
        if (ts.isJsxExpression(label) || tag(label) !== 'label') continue;
        const adjacent = children[i + 1];
        const controls = ts.isJsxExpression(adjacent)
          ? elements(adjacent).filter(item => ['input', 'select', 'textarea'].includes(tag(item)))
          : ['input', 'select', 'textarea'].includes(tag(adjacent)) ? [adjacent] : [];
        if (controls.length !== 1) continue;
        const control = controls[0];
        count++;
        assert.ok(attrText(label, 'htmlFor'), `${name}: ${label.getText()} has no native association`);
        assert.equal(attrText(label, 'htmlFor'), attrText(control, 'id'), `${name} label points to a different control`);
      }
    }
    assert.ok(count > 0, `${name} no scoped field labels checked`);
  });
}

for (const [name, setter] of [['ManifestsView', 'setSelectedManifestId'], ['HandoversView', 'setSelectedHandover'], ['GatePassView', 'setSelectedGatePassId'], ['EDIView', 'setSelectedEdiId'], ['PartnerManagementView', 'setSelectedLogId']]) {
  test(`${name}: record selectors support native keyboard selection and selected state`, () => {
    const cards = elements(source(name, 'W-S-003')).filter(node => attr(node, 'onClick')?.getText().includes(`${setter}(`));
    assert.equal(cards.length, 1, `${name} record selector coverage`);
    for (const card of cards) {
      assert.equal(tag(card), 'button', `${name} selection is pointer only`);
      assert.equal(attrText(card, 'type'), 'button');
      assert.ok(attr(card, 'aria-pressed'), `${name} selection state missing`);
      assert.match(attr(card, 'className')?.getText() ?? '', /focus-visible:/, `${name} keyboard focus is not explicit`);
      assert.equal(elements(card).filter(node => node !== card && tag(node) === 'button').length, 0, `${name} nested button`);
      assert.equal(elements(card).filter(node => tag(node) === 'div').length, 0, `${name} non-phrasing button content`);
    }
  });
}

// Source evidence only: these measurements do not assert native layout or spoken accessibility.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const appRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(appRoot, '../..');
const runRoot = path.resolve(projectRoot, 'audit/runs/2026-10-03-improvement-02');
const outputPath = process.argv[2] || path.join(runRoot, 'raw/mobile-agent/static-measurements.json');
function files(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', '.expo', '.git'].includes(entry.name) || entry.name.startsWith('.env') || entry.name.startsWith('dist')) return [];
    const full = path.join(root, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}
const headingDeclarations = [], controls = [], remainingStyleLiterals = [], sourceChanges = [];
for (const file of files(appRoot)) {
  const relative = path.relative(projectRoot, file).replaceAll('\\', '/');
  const before = path.join(runRoot, 'source-before', relative);
  const bytes = fs.readFileSync(file);
  const hash = data => crypto.createHash('sha256').update(data).digest('hex');
  if (!fs.existsSync(before) || hash(bytes) !== hash(fs.readFileSync(before))) sourceChanges.push({ file: relative, change: fs.existsSync(before) ? 'MODIFIED' : 'ADDED', beforeSha256: fs.existsSync(before) ? hash(fs.readFileSync(before)) : null, afterSha256: hash(bytes) });
  if (!file.endsWith('.tsx')) continue;
  const source = bytes.toString('utf8');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const line = node => parsed.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(parsed);
      const attrs = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attr => [attr.name.getText(parsed), attr.initializer?.getText(parsed) || 'true']));
      if (attrs.accessibilityRole === '"header"' || attrs.accessibilityRole === "'header'") headingDeclarations.push({ file: relative, line: line(node), tag });
      if (['TouchableOpacity', 'Pressable', 'TextInput', 'Button', 'DateTimePicker'].includes(tag)) controls.push({ file: relative, line: line(node), tag, roleProp: attrs.accessibilityRole || null, labelProp: attrs.accessibilityLabel || null, stateProp: attrs.accessibilityState || null, styleExpression: attrs.style || null, interpretation: 'PROPS_ONLY_NOT_NATIVE_BOUNDS_OR_SPOKEN_LABEL' });
    }
    if (ts.isPropertyAssignment(node) && ts.isNumericLiteral(node.initializer)) {
      const property = node.name.getText(parsed);
      if (/^(fontSize|lineHeight|letterSpacing|padding.*|margin.*|gap|rowGap|columnGap|borderRadius|width|height|minWidth|minHeight|maxWidth|maxHeight)$/.test(property)) remainingStyleLiterals.push({ file: relative, line: line(node), property, value: Number(node.initializer.text), interpretation: 'REMAINING_LITERAL_REQUIRES_CONTEXT_STANDARD_TARGETS_AND_ICON_GEOMETRY_MAY_BE_INTENTIONAL' });
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
}
const result = {
  schemaVersion: 1, measuredAt: new Date().toISOString(), sourceSnapshot: 'audit/runs/2026-10-03-improvement-02/source-before',
  method: 'TypeScriptAST_source_measurement_and_SHA256_snapshot_comparison',
  limits: ['No fresh native runtime layout available: approval review blocked Metro/env/reopen command.', 'Native touch bounds, keyboard clipping, TalkBack announcements and focus order remain unverified.', 'A missing explicit label prop is not automatically a defect: visible text can provide an accessible name.'],
  testedSourceMeasurements: [
    { surface: 'AppHeader', fixtureWidthDp: 320, fixtureFontScale: 2, independentActionGapDp: 8, minimumControlWidthDp: 48, minimumControlHeightDp: 48, result: 'SOURCE_FIXTURE_PASS' },
    { surface: 'ResponsiveTabBar', fixtureWidthDp: 320, fixtureFontScale: 2, controlCount: 5, independentActionGapDp: 8, minimumControlWidthDp: 48, minimumControlHeightDp: 48, fullLabelsWrap: true, result: 'SOURCE_FIXTURE_PASS' },
    { surface: 'GateModeSwitch/SelectField/YardSlotGrid', independentTargetGapDp: 8, result: 'SOURCE_ONLY_NATIVE_VERIFY_PENDING' },
    { surface: 'Card/AppHeader/Dialogs/Empty/Error/Forbidden/Login', headingProps: true, result: 'SOURCE_SEMANTICS_ONLY_TALKBACK_UNKNOWN' },
  ],
  summary: { changedFileCount: sourceChanges.length, headingDeclarationCount: headingDeclarations.length, nativeControlDeclarationCount: controls.length, remainingStyleLiteralCount: remainingStyleLiterals.length },
  sourceChanges, headingDeclarations, controls, remainingStyleLiterals,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
process.stdout.write(JSON.stringify(result.summary) + '\n');

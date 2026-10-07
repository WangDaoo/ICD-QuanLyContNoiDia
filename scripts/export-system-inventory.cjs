// Read-only source inventory. Never reads .env files or connects to a database.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const relative = (p) => path.relative(root, p).replaceAll('\\', '/');
const cache = new Map();
const source = (p) => {
  if (!cache.has(p))
    cache.set(
      p,
      ts.createSourceFile(
        p,
        fs.readFileSync(p, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        p.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      ),
    );
  return cache.get(p);
};
const line = (node, sf) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
const decorators = (node) => (ts.canHaveDecorators(node) ? ts.getDecorators(node) || [] : []);
const decor = (node, name) =>
  decorators(node)
    .map((d) => d.expression)
    .find((e) => ts.isCallExpression(e) && e.expression.getText() === name);
const text = (node) => (node ? node.getText().replace(/\s+/g, ' ') : '');
function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}
function files(directory, accept) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(directory, entry.name);
    if (entry.isDirectory())
      return ['node_modules', 'dist', 'generated'].includes(entry.name) ? [] : files(p, accept);
    return accept(p) ? [p] : [];
  });
}
function resolveImport(file, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(file), spec);
  return (
    [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find((p) => fs.existsSync(p)) || null
  );
}
function imports(sf) {
  const map = new Map();
  for (const node of sf.statements) {
    if (!ts.isImportDeclaration(node) || !node.importClause) continue;
    const p = resolveImport(sf.fileName, node.moduleSpecifier.text);
    const bindings = node.importClause.namedBindings;
    if (p && bindings && ts.isNamedImports(bindings))
      for (const element of bindings.elements)
        map.set(element.name.text, {
          file: p,
          name: element.propertyName?.text || element.name.text,
        });
  }
  return map;
}
const constants = {};
for (const p of [
  'apps/api/src/common/constants/permission-codes.constants.ts',
  'apps/api/src/modules/partner-handover/external/constants/partner-api.constants.ts',
]) {
  const sf = source(path.join(root, p));
  walk(sf, (node) => {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.initializer))
      constants[node.name.getText()] = node.initializer.text;
  });
}
const resolveValue = (node) => {
  if (!node) return '';
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return constants[node.name.text] || node.getText();
  return node.getText();
};
const controllerRefs = new Map();
const modules = new Map();
function visitModule(file, name) {
  const key = relative(file) + ':' + name;
  if (modules.has(key)) return;
  const sf = source(file);
  const cls = sf.statements.find((n) => ts.isClassDeclaration(n) && n.name?.text === name);
  const d = cls && decor(cls, 'Module');
  if (!d || !ts.isObjectLiteralExpression(d.arguments[0])) return;
  modules.set(key, { name, file: relative(file), line: line(cls, sf) });
  const im = imports(sf);
  for (const prop of d.arguments[0].properties) {
    if (
      !ts.isPropertyAssignment(prop) ||
      !['imports', 'controllers'].includes(prop.name.getText()) ||
      !ts.isArrayLiteralExpression(prop.initializer)
    )
      continue;
    for (const item of prop.initializer.elements) {
      if (!ts.isIdentifier(item) || !im.has(item.text)) continue;
      const ref = im.get(item.text);
      if (prop.name.getText() === 'imports') visitModule(ref.file, ref.name);
      else controllerRefs.set(relative(ref.file) + ':' + ref.name, ref);
    }
  }
}
visitModule(path.join(root, 'apps/api/src/app.module.ts'), 'AppModule');
const endpoints = [];
const controllers = [];
for (const ref of controllerRefs.values()) {
  const sf = source(ref.file);
  const cls = sf.statements.find((n) => ts.isClassDeclaration(n) && n.name?.text === ref.name);
  const cd = cls && decor(cls, 'Controller');
  if (!cd) throw new Error('Registered controller has no decorator: ' + ref.name);
  const prefix = resolveValue(cd.arguments[0]);
  const classPermissions = decor(cls, 'Permissions');
  const importedTypes = imports(sf);
  const guards = text(decor(cls, 'UseGuards'));
  let count = 0;
  for (const member of cls.members) {
    if (!ts.isMethodDeclaration(member)) continue;
    const http = decorators(member)
      .map((d) => d.expression)
      .find(
        (e) =>
          ts.isCallExpression(e) &&
          ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options'].includes(
            e.expression.getText(),
          ),
      );
    if (!http) continue;
    const pd = decor(member, 'Permissions') || classPermissions;
    const sd = decor(member, 'PartnerScopes');
    const external = guards.includes('PartnerApiKeyGuard');
    const isPublic = !!(decor(member, 'Public') || decor(cls, 'Public'));
    const inputs = member.parameters.flatMap((param) => {
      const dd = decorators(param)
        .map((d) => d.expression)
        .find(
          (e) =>
            ts.isCallExpression(e) &&
            ['Body', 'Query', 'Param', 'Headers', 'UploadedFile'].includes(e.expression.getText()),
        );
      const typeName = text(param.type);
      const typeSource = importedTypes.get(typeName);
      return dd
        ? [
            {
              location: dd.expression.getText(),
              key: resolveValue(dd.arguments[0]),
              name: param.name.getText(),
              type: typeName || 'unknown',
              ...(typeSource ? { typeFile: relative(typeSource.file) } : {}),
            },
          ]
        : [];
    });
    const body = member.body ? member.body.getText() : '';
    const serviceCalls = [...body.matchAll(/this\.(\w+)\.(\w+)\(/g)].map((m) => `${m[1]}.${m[2]}`);
    endpoints.push({
      method: http.expression.getText().toUpperCase(),
      path: '/api/' + [prefix, resolveValue(http.arguments[0])].filter(Boolean).join('/'),
      module: relative(ref.file).split('/')[4],
      controller: ref.name,
      handler: member.name.getText(),
      auth: external ? 'PARTNER_API_KEY' : isPublic ? 'PUBLIC' : 'JWT',
      permissions: pd ? [...pd.arguments].map(resolveValue) : [],
      partnerScopes: sd ? [...sd.arguments].map(resolveValue) : [],
      inputs,
      serviceCalls,
      responseType: text(member.type) || 'inferred (see service/mapper)',
      httpCode: text(decor(member, 'HttpCode')),
      file: relative(ref.file),
      line: line(member, sf),
    });
    count++;
  }
  controllers.push({
    name: ref.name,
    file: relative(ref.file),
    line: line(cls, sf),
    prefix,
    endpointCount: count,
  });
}
endpoints.sort(
  (a, b) =>
    a.module.localeCompare(b.module) ||
    a.path.localeCompare(b.path) ||
    a.method.localeCompare(b.method),
);
const schemaPath = 'apps/api/prisma/schema.prisma';
const schema = fs.readFileSync(path.join(root, schemaPath), 'utf8');
const blocks = [...schema.matchAll(/^(model|enum)\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
const models = blocks
  .filter((m) => m[1] === 'model')
  .map((m) => {
    const fields = m[3].split(/\r?\n/).flatMap((raw) => {
      const f = /^\s*(\w+)\s+([\w?\[\]]+)(.*)$/.exec(raw);
      if (!f || raw.trim().startsWith('//')) return [];
      return [
        {
          name: f[1],
          type: f[2],
          attributes: f[3].trim(),
          column: /@map\("([^"]+)"\)/.exec(f[3])?.[1] || f[1],
        },
      ];
    });
    return {
      name: m[2],
      table: /@@map\("([^"]+)"\)/.exec(m[3])?.[1] || m[2],
      fields,
      constraints: m[3]
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.startsWith('@@')),
      file: schemaPath,
      line: schema.slice(0, m.index).split('\n').length,
    };
  });
const names = new Set(models.map((m) => m.name));
for (const model of models)
  for (const field of model.fields) field.relation = names.has(field.type.replace(/[?\[\]]/g, ''));
const enums = blocks
  .filter((m) => m[1] === 'enum')
  .map((m) => ({
    name: m[2],
    values: m[3]
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('//') && !s.startsWith('@@')),
    file: schemaPath,
    line: schema.slice(0, m.index).split('\n').length,
  }));
const dtos = [];
for (const p of files(
  path.join(root, 'apps/api/src'),
  (p) => p.endsWith('.ts') && !p.endsWith('.spec.ts'),
)) {
  const sf = source(p);
  for (const cls of sf.statements) {
    if (!ts.isClassDeclaration(cls) || !cls.name || !cls.name.text.endsWith('Dto')) continue;
    const fields = cls.members.filter(ts.isPropertyDeclaration).map((n) => ({
      name: n.name.getText(),
      type: text(n.type),
      optional: !!n.questionToken,
      initializer: text(n.initializer),
      validators: decorators(n).map((d) => text(d.expression)),
      line: line(n, sf),
    }));
    dtos.push({
      name: cls.name.text,
      usedDirectly: endpoints.some((e) =>
        e.inputs.some((input) => input.type === cls.name.text && input.typeFile === relative(p)),
      ),
      file: relative(p),
      line: line(cls, sf),
      inherits: (cls.heritageClauses || []).map(text),
      fields,
    });
  }
}
const permsSf = source(path.join(root, 'apps/api/prisma/seed/data/permissions.data.ts'));
const permissions = [];
walk(permsSf, (n) => {
  if (!ts.isObjectLiteralExpression(n)) return;
  const entries = Object.fromEntries(
    n.properties
      .filter(ts.isPropertyAssignment)
      .map((p) => [p.name.getText(), resolveValue(p.initializer)]),
  );
  if (entries.code && entries.name) permissions.push(entries);
});
const rolesSf = source(path.join(root, 'apps/api/prisma/seed/data/roles.data.ts'));
const roles = [];
walk(rolesSf, (n) => {
  if (!ts.isObjectLiteralExpression(n)) return;
  const v = Object.fromEntries(
    n.properties
      .filter(ts.isPropertyAssignment)
      .map((p) => [p.name.getText(), resolveValue(p.initializer)]),
  );
  if (v.code && v.name) roles.push({ ...v, code: v.code.replace('ROLE_CODES.', '') });
});
const rpSf = source(path.join(root, 'apps/api/prisma/seed/data/role-permissions.data.ts'));
walk(rpSf, (n) => {
  if (!ts.isPropertyAssignment(n) || !ts.isComputedPropertyName(n.name)) return;
  const role = roles.find((r) => r.code === n.name.expression.getText().replace('ROLE_CODES.', ''));
  if (role)
    role.permissions = ts.isArrayLiteralExpression(n.initializer)
      ? [...n.initializer.elements].map(resolveValue)
      : permissions.map((p) => p.code);
});
function simpleValue(n) {
  if (ts.isAsExpression(n) || ts.isSatisfiesExpression(n)) return simpleValue(n.expression);
  if (ts.isArrayLiteralExpression(n)) return [...n.elements].map(simpleValue);
  if (ts.isObjectLiteralExpression(n))
    return Object.fromEntries(
      n.properties
        .filter(ts.isPropertyAssignment)
        .map((p) => [
          ts.isStringLiteral(p.name) ? p.name.text : p.name.getText(),
          simpleValue(p.initializer),
        ]),
    );
  return resolveValue(n);
}
function variable(file, name) {
  const sf = source(path.join(root, file));
  let found;
  walk(sf, (n) => {
    if (ts.isVariableDeclaration(n) && n.name.getText() === name && n.initializer)
      found = simpleValue(n.initializer);
  });
  return found;
}
const webTabs = variable('apps/web/src/services/permissions.ts', 'TAB_PERMISSIONS');
const webDataRoutes = variable('apps/web/src/context/AppContext.tsx', 'DATA_ROUTES');
const mobileScreenPermissions = variable(
  'apps/mobile/src/features/auth/permissions.ts',
  'SCREEN_PERMISSIONS',
);
const mobileTabPermissions = variable(
  'apps/mobile/src/features/auth/permissions.ts',
  'TAB_PERMISSIONS',
);
const mobileScreens = files(path.join(root, 'apps/mobile/src/features'), (p) =>
  p.endsWith('Screen.tsx'),
).map(relative);
const webViews = files(path.join(root, 'apps/web/src/components'), (p) =>
  p.endsWith('View.tsx'),
).map(relative);
function pathPattern(n) {
  if (!n) return 'UNKNOWN';
  if (ts.isStringLiteralLike(n)) return n.text;
  if (ts.isTemplateExpression(n))
    return (
      n.head.text +
      n.templateSpans
        .map((s) => ':' + s.expression.getText().replace(/\W+/g, '_') + s.literal.text)
        .join('')
    );
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken)
    return pathPattern(n.left) + pathPattern(n.right);
  if (ts.isIdentifier(n)) return ':' + n.text;
  return '[dynamic:' + text(n) + ']';
}
const frontendCalls = [];
for (const platform of ['web', 'mobile']) {
  for (const p of files(
    path.join(root, `apps/${platform}/src`),
    (p) => /\.tsx?$/.test(p) && !/\.(test|spec)\.tsx?$/.test(p),
  )) {
    const sf = source(p);
    walk(sf, (n) => {
      if (
        ts.isCallExpression(n) &&
        ts.isIdentifier(n.expression) &&
        n.expression.text === 'command' &&
        relative(p) === 'apps/web/src/context/AppContext.tsx'
      ) {
        frontendCalls.push({
          platform,
          method: n.arguments[2] ? resolveValue(n.arguments[2]) : 'POST',
          path: pathPattern(n.arguments[0]),
          via: 'command',
          file: relative(p),
          line: line(n, sf),
        });
        return;
      }
      if (
        !ts.isCallExpression(n) ||
        !ts.isPropertyAccessExpression(n.expression) ||
        !['get', 'post', 'patch', 'put', 'delete'].includes(n.expression.name.text)
      )
        return;
      if (!/^(apiClient|client)$/.test(n.expression.expression.getText())) return;
      frontendCalls.push({
        platform,
        method: n.expression.name.text.toUpperCase(),
        path: pathPattern(n.arguments[0]),
        file: relative(p),
        line: line(n, sf),
      });
    });
  }
}
const versions = Object.fromEntries(
  ['web', 'mobile', 'api'].map((app) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, `apps/${app}/package.json`), 'utf8'));
    return [
      app,
      {
        name: pkg.name,
        version: pkg.version,
        dependencies: pkg.dependencies,
        devDependencies: pkg.devDependencies,
      },
    ];
  }),
);
const capturedAt = new Date().toISOString();
const capturedOn = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date(capturedAt));
const output = {
  capturedOn,
  capturedAt,
  basis:
    'Current working-tree source; registration graph from AppModule; no live database read or runtime acceptance implied',
  counts: {
    registeredModules: modules.size,
    controllers: controllers.length,
    endpoints: endpoints.length,
    models: models.length,
    enums: enums.length,
    roles: roles.length,
    permissions: permissions.length,
    webTabs: Object.keys(webTabs).length,
    webViews: webViews.length,
    mobileScreens: mobileScreens.length,
    dtos: dtos.length,
    frontendCallSites: frontendCalls.length,
  },
  modules: [...modules.values()],
  controllers,
  endpoints,
  models,
  enums,
  dtos,
  roles,
  permissions,
  webTabs,
  webDataRoutes,
  mobileScreenPermissions,
  mobileTabPermissions,
  webViews,
  mobileScreens,
  frontendCalls,
  versions,
  sourceHashes: [...cache.keys(), path.join(root, schemaPath)].map((p) => ({
    file: relative(p),
    sha256: crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),
  })),
};
const dest = path.join(root, 'docs/system/system-inventory.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(output.counts, null, 2));
console.log('Written ' + relative(dest));

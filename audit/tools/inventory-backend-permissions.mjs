import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(resolve('audit/tools/runtime/package.json'));
const ts = require('typescript');
const rows = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.controller.ts')) {
      const source = ts.createSourceFile(file, readFileSync(file,'utf8'), ts.ScriptTarget.Latest, true);
      for (const declaration of source.statements.filter(ts.isClassDeclaration)) {
        const decorators = node => (ts.getDecorators(node) || []).map(d=>d.expression).filter(ts.isCallExpression);
        const prefix = decorators(declaration).find(d=>d.expression.getText(source)==='Controller')?.arguments[0]?.text || '';
        for (const method of declaration.members.filter(ts.isMethodDeclaration)) {
          const decs = decorators(method);
          const route = decs.find(d=>['Get','Post','Patch','Put','Delete'].includes(d.expression.getText(source)));
          if (!route) continue;
          const permission = decs.find(d=>d.expression.getText(source)==='Permissions');
          rows.push({ method:route.expression.getText(source).toUpperCase(), route:'/'+[prefix,route.arguments[0]?.text].filter(Boolean).join('/'), permissions:permission?.arguments.map(a=>a.getText(source).replace('PERMISSION_CODES.','')) || [], evidence:file.replace(resolve('.')+'\\','')+':'+(source.getLineAndCharacterOfPosition(route.getStart(source)).line+1) });
        }
      }
    }
  }
}
walk(resolve('apps/api/src'));
writeFileSync(resolve('audit/runs/2026-10-03-improvement-02/raw/backend-permissions.json'),JSON.stringify(rows,null,2));
for (const row of rows.filter(r=>r.method!=='GET' && !r.route.startsWith('/partner'))) console.log(row.method,row.route,row.permissions.join('|'));

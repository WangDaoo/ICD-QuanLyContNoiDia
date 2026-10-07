const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const report = JSON.parse(fs.readFileSync(path.join(__dirname,'web-static-findings.json'),'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(root,'audit/raw/baseline/web/static-source-inventory.json'),'utf8'));
const violations = [];
const excerpts = [];
const ids = new Set();
for (const f of report.findings) {
  if (ids.has(f.id)) violations.push(`Duplicate ${f.id}`);
  ids.add(f.id);
  for (const snippet of [f.fix.snippet, f.fix.additional_snippet].filter(Boolean)) {
    const count = snippet.split('\n').length;
    if (count < 5 || count > 20) violations.push(`${f.id} snippet ${count} lines`);
  }
  for (const e of [...f.evidence,...(f.supplemental_evidence??[])]) {
    const file = path.resolve(root,e.file);
    const lines = fs.readFileSync(file,'utf8').split(/\r?\n/);
    if (!Number.isInteger(e.line) || e.line < 1 || e.line > lines.length) violations.push(`${f.id} invalid line ${e.file}:${e.line}`);
    excerpts.push({id:f.id,...e,excerpt:lines.slice(Math.max(0,e.line-3),e.line+5).map((text,i)=>({line:Math.max(1,e.line-2)+i,text}))});
  }
}
const changedSourceFiles = inventory.files.filter(file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file.file),'utf8')).digest('hex') !== file.sha256).map(file=>file.file);
if (changedSourceFiles.length) violations.push('Source differs from static inventory snapshot');
fs.writeFileSync(path.join(root,'audit/raw/baseline/web/static-verified-evidence.json'),JSON.stringify({generatedAt:new Date().toISOString(),method:'Validated file/line existence and excerpted source around every evidence anchor; compared all source SHA-256 values to static inventory',findings:report.findings.length,snippetRange:'5-20 lines',violations,changedSourceFiles,excerpts},null,2)+'\n');
console.log(JSON.stringify({findings:report.findings.length,evidenceAnchors:excerpts.length,sourceFilesVerified:inventory.files.length,violations,changedSourceFiles}));
if (violations.length) process.exitCode = 1;

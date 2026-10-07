import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const repo=process.cwd(),errors=[];
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const db=read('audit/findings.json'),s=read('audit/scores.json'),c=read('audit/coverage.json');
const ids=new Set(db.findings.map(x=>x.id));
if(ids.size!==db.findings.length)errors.push('Duplicate finding IDs');
for(const f of db.findings){
 if(!['P0','P1','P2','P3'].includes(f.severity))errors.push(`${f.id}: invalid severity`);
 if(!f.category||!f.issue||!f.fix_proposal||!f.verify.length)errors.push(`${f.id}: missing required finding fields`);
 for(const e of f.evidence){
  if(!fs.existsSync(e.file))errors.push(`${f.id}: absent source ${e.file}`);
  else if(!Number.isInteger(e.line)||e.line<1||e.line>fs.readFileSync(e.file,'utf8').split('\n').length)errors.push(`${f.id}: invalid source line ${e.file}:${e.line}`);
 }
 for(const p of f.runtime_artifacts||[])if(!fs.existsSync(p))errors.push(`${f.id}: missing artifact ${p}`);
 const n=f.fix_proposal.split('\n').length;if(n<5||n>20)errors.push(`${f.id}: snippet length ${n}`);
}
for(const row of c.cases)for(const p of row.evidence||[])if(!fs.existsSync(p))errors.push(`Coverage missing ${p}`);
const obs=s.observations,obsIds=new Set(obs.map(x=>x.id));
if(obs.length!==obsIds.size)errors.push('Duplicate observation IDs');
for(const o of obs)for(const e of o.evidence){if(!ids.has(e)&&!c.unknowns.some(x=>x.id===e)&&!fs.existsSync(e))errors.push(`${o.id}: unresolvable ${e}`);}
const calculated={};
for(const platform of ['web','mobile']){
 const dimensions=s.platforms[platform].ux_gap.dimensions;
 let min=0,max=0;
 for(const d of dimensions){let weight=0,lo=0,hi=0;
  for(const cc of d.criteria){const oo=obs.filter(x=>x.platform===platform&&x.dimension===d.dimension&&x.criterion===cc.criterion&&x.status!=='N/A');if(!oo.length)continue;const p=oo.filter(x=>x.status==='PASS').length,u=oo.filter(x=>x.status==='UNKNOWN').length;weight+=cc.weight;lo+=cc.weight*p/oo.length;hi+=cc.weight*(p+u)/oo.length;}
  min+=25*lo/weight;max+=25*hi/weight;
 }
 const nielsen=100-2.5*s.platforms[platform].nielsen.heuristics.reduce((acc,h)=>{const ff=db.findings.filter(f=>f.platform===platform&&f.heuristic_ids.includes(h.id));return acc+(ff.length?Math.max(...ff.map(f=>4-Number(f.severity[1]))):0);},0);
 if(Math.abs(min-s.platforms[platform].ux_gap.min)>1e-9||Math.abs(max-s.platforms[platform].ux_gap.max)>1e-9||nielsen!==s.platforms[platform].nielsen.observed)errors.push(`${platform}: scoring does not recompute`);
 calculated[platform]={min,max,nielsen};
}
const report=fs.readFileSync('audit/2026-10-03-report.md','utf8');
for(const match of report.matchAll(/\]\(<([^>]+)>\)/g)){const target=match[1];if(/^https?:/.test(target))continue;const local=target.replace(/:\d+$/,'');if(!fs.existsSync(local))errors.push(`Report link missing ${target}`);}
for(const match of report.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g))if(!fs.existsSync(match[1]))errors.push(`Image missing ${match[1]}`);
for(let i=0;i<7;i++)if(!report.includes(`## Phase${i}`))errors.push(`Absent Phase${i}`);
const original=read('audit/raw/baseline/source-hashes.json');
const changed=original.filter(x=>!fs.existsSync(x.path)||crypto.createHash('sha256').update(fs.readFileSync(x.path)).digest('hex')!==x.sha256.toLowerCase());
if(changed.length)errors.push(`Source changed: ${changed.map(x=>x.path).join(',')}`);
const result={status:errors.length?'FAIL':'PASS',findings:db.findings.length,source_files:original.length,source_unchanged:original.length-changed.length,coverage_rows:c.cases.length,observations:obs.length,calculated,errors};
fs.writeFileSync('audit/raw/baseline/artifact-verification.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;

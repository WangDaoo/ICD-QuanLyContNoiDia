import fs from 'node:fs';
import path from 'node:path';
import { analyzeMeasurement } from './runtime/contrast-offline.mjs';
const repo = path.resolve(import.meta.dirname, '../..');
const root = path.join(repo, 'audit/raw/baseline/web');
const files = fs.readdirSync(root).filter(name => name.endsWith('-measure.json'));
const output = [];
for (const file of files) {
  const measure = JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
  for (const [i,row] of measure.contrast.entries()) {
    const layers = row.backgroundLayers?.slice().reverse();
    const evidence = {id:`${file}:${i}`,selector:row.selector,text:row.text,foregroundRaw:row.color,
      backgroundLayers:layers,fontSizePx:row.fontSize,fontWeight:row.fontWeight,disabled:row.disabled};
    if (row.unknown==='background-image'&&layers?.length) evidence.backgroundLayers[0]={colorRaw:layers[0],backgroundImage:'unresolved-image'};
    if (row.unknown==='ancestor-opacity') evidence.opacity=0.5;
    if (row.unknown==='filter') evidence.filter='unresolved-filter';
    const result=analyzeMeasurement(evidence);
    output.push({...result,sourceFile:`audit/raw/baseline/web/${file}`,selector:row.selector,viewport:measure.viewport,rawForeground:row.color,rawBackgroundLayers:layers,fontSize:row.fontSize,fontWeight:row.fontWeight});
  }
}
fs.writeFileSync(path.join(root,'contrast-color4-results.json'),JSON.stringify({method:'Read-only rendered DOM colors, offline Color.js 0.7.1 WCAG21; conservative UNKNOWN handling',files:files.length,results:output},null,2));
const groups=new Map();
for(const row of output.filter(x=>x.status==='FAIL')){
 const key=JSON.stringify([row.rawForeground,row.backgroundSrgb,row.requiredRatio]);
 const item=groups.get(key)||{ratio:row.ratio,requiredRatio:row.requiredRatio,color:row.rawForeground,background:row.backgroundSrgb,count:0,samples:[]};item.count++;if(item.samples.length<8)item.samples.push({text:row.text,selector:row.selector,file:row.sourceFile,viewport:row.viewport});groups.set(key,item);
}
fs.writeFileSync(path.join(root,'contrast-failing-pairs.json'),JSON.stringify([...groups.values()].sort((a,b)=>a.ratio-b.ratio),null,2));
console.log(JSON.stringify({files:files.length,samples:output.length,statusCounts:output.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),failingColorPairs:groups.size,worst:[...groups.values()].sort((a,b)=>a.ratio-b.ratio).slice(0,5).map(g=>({ratio:g.ratio,count:g.count,sample:g.samples[0]}))}));

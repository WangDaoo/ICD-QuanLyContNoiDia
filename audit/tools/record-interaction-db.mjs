import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {guardAuditRuntime,closeConnection,env,root} from './audit-api-client.mjs';

const prefix=process.argv[2];
assert.match(prefix,/^UXT1004[ABCD]$/);
const require=createRequire(resolve(root,'apps/api/package.json'));
let connection;
try{
  const target=await guardAuditRuntime();
  connection=await require('mariadb').createConnection({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),user:env.MYSQL_USER,password:env.MYSQL_PASSWORD,database:env.MYSQL_DATABASE});
  const actual=await connection.query('SELECT DATABASE() AS name');
  assert.equal(actual[0].name,target.database);
  const rows=await connection.query('SELECT id,name,scac_code AS scacCode FROM shipping_line WHERE name LIKE ? ORDER BY name',[prefix+' timing Shipping%']);
  assert.equal(rows.length,20);assert.equal(new Set(rows.map(row=>row.scacCode)).size,20);
  for(let i=0;i<20;i++){const n=String(i+1).padStart(2,'0');assert.equal(rows[i].name,prefix+' timing Shipping'+n);assert.equal(rows[i].scacCode,prefix+n);}
  writeFileSync(resolve(root,'audit/runs/2026-10-03-improvement-02/raw/browser',`interaction-persisted-${prefix}-2026-10-04.json`),JSON.stringify({at:new Date().toISOString(),target,scope:'Read-only database verification of twenty synthetic records created through UI',prefix,status:'PASS',count:rows.length,rows},null,2));
  console.log(JSON.stringify({status:'PASS',prefix,persisted:20,database:target.database}));
}finally{await connection?.end();await closeConnection();}

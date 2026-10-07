const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./improvement-harness.cjs');
test('a read-cache save from the previous session cannot erase the new session same-user record',async()=>{
  const memory=new Map();let finishOld;
  const storage={getItem:async key=>memory.get(key)||null,setItem:async(key,value)=>{memory.set(key,value);if(value.includes('OLD')) await new Promise(resolve=>{finishOld=resolve;});},removeItem:async key=>memory.delete(key),getAllKeys:async()=>[...memory.keys()],multiRemove:async keys=>keys.forEach(key=>memory.delete(key))};
  const {createReadCache}=load('src/storage/read-cache.ts');
  const cache=createReadCache(storage);const scope={userId:'same-user',icdId:'test',apiBaseUrl:'https://fixture.test/api'};
  const old=cache.write(scope,'container','visit',{value:'OLD'});
  await new Promise(resolve=>setImmediate(resolve));
  const clear=cache.clearUser(scope);
  const next=cache.write(scope,'container','visit',{value:'NEW'});
  await new Promise(resolve=>setImmediate(resolve));
  finishOld();await Promise.all([old,clear,next]);
  assert.equal((await cache.read(scope,'container','visit'))?.data.value,'NEW');
});

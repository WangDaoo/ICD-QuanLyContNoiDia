const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

test('Expo web stores the session through AsyncStorage without native SecureStore calls', async () => {
  const values = new Map();
  const asyncStorage = {getItem: async key => values.get(key) ?? null, setItem: async (key,value) => values.set(key,value), removeItem: async key => values.delete(key)};
  const secureStore = {getItemAsync: () => {throw Error('Native SecureStore is unavailable on web');},setItemAsync: () => {throw Error('Native SecureStore is unavailable on web');},deleteItemAsync: () => {throw Error('Native SecureStore is unavailable on web');}};
  const filename = path.resolve(__dirname, '../src/storage/auth.storage.ts');
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = name => name === 'react-native' ? {Platform:{OS:'web'}} : name === 'expo-secure-store' ? secureStore : name === '@react-native-async-storage/async-storage' ? {__esModule:true,default:asyncStorage} : module.require(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  await loaded.exports.authStorage.setTokens('access','refresh');
  assert.equal(await loaded.exports.authStorage.getAccessToken(),'access');
  assert.equal(await loaded.exports.authStorage.getRefreshToken(),'refresh');
  await loaded.exports.authStorage.clear();
  assert.equal(await loaded.exports.authStorage.getAccessToken(),null);
});

test('Metro web override keeps the session in this tab and clears both tokens on logout', async () => {
  const values = new Map();
  const previous = globalThis.sessionStorage;
  globalThis.sessionStorage = {getItem: key => values.get(key) ?? null,setItem:(key,value) => values.set(key,value),removeItem:key => values.delete(key)};
  try {
    const filename = path.resolve(__dirname, '../src/storage/auth.storage.web.ts');
    const loaded = new Module(filename,module);
    loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
    await loaded.exports.authStorage.setTokens('access','refresh');
    assert.equal(await loaded.exports.authStorage.getAccessToken(),'access');
    assert.equal(await loaded.exports.authStorage.getRefreshToken(),'refresh');
    await loaded.exports.authStorage.clear();
    assert.equal(values.size,0);
  } finally { if (previous === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previous; }
});

// SDK emulator control for camera pose only. Uses the running emulator's token privately.
const fs = require('node:fs');
const path = require('node:path');
const grpc = require('../../node_modules/.pnpm/@grpc+grpc-js@1.14.5/node_modules/@grpc/grpc-js');
const loader = require('../../node_modules/.pnpm/@grpc+proto-loader@0.8.1/node_modules/@grpc/proto-loader');
const directory = path.join(process.env.LOCALAPPDATA, 'Temp/avd/running');
const ini = fs.readdirSync(directory).find((name) => name.endsWith('.ini'));
const configuration = Object.fromEntries(fs.readFileSync(path.join(directory, ini), 'utf8').split(/\r?\n/).filter(line => line.includes('=')).map(line => [line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1)]));
const definitions = loader.loadSync(path.join(process.env.LOCALAPPDATA, 'Android/Sdk/emulator/lib/emulator_controller.proto'));
const Client = grpc.loadPackageDefinition(definitions).android.emulation.control.EmulatorController;
const client = new Client(`127.0.0.1:${configuration['grpc.port']}`, grpc.credentials.createInsecure());
const metadata = new grpc.Metadata();
metadata.set('authorization', `Bearer ${configuration['grpc.token']}`);
const action = process.argv[2];
const request = action === 'rotate' ? {x:Number(process.argv[3]),y:Number(process.argv[4]),z:0} : action === 'velocity' ? {x:Number(process.argv[3]),y:Number(process.argv[4]),z:Number(process.argv[5])} : {target: Number(process.argv[3]), value:{data: process.argv.slice(4).map(Number)}};
client[action === 'rotate' ? 'rotateVirtualSceneCamera' : action === 'velocity' ? 'setVirtualSceneCameraVelocity' : action === 'get' ? 'getPhysicalModel' : 'setPhysicalModel'](request, metadata, (error, response) => {
  if (error) { console.error('Emulator camera control failed:', error.code, error.details); process.exitCode = 1; }
  else console.log(action === 'get' ? response : 'Emulator camera pose updated.');
  client.close();
});

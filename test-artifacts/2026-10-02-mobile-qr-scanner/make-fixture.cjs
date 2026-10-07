/* QR fixtures contain no credentials or real signed Gate Pass. */
const fs = require('node:fs');
const qr = require('../../node_modules/.pnpm/qrcode-generator@2.0.4/node_modules/qrcode-generator');
for (const [name, value] of [['container', 'QAOU4835930'], ['gate-pass-invalid', 'gp1.invalid.signature']]) {
  const code = qr(0, 'M');
  code.addData(value); code.make();
  const count = code.getModuleCount();
  fs.writeFileSync(`${__dirname}/${name}-matrix.json`, JSON.stringify(Array.from({length:count}, (_,row) => Array.from({length:count}, (_,col) => code.isDark(row,col)))));
}

// Replace only the generated README appendix; preserve manually maintained prose.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const inventory = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/system/system-inventory.json'), 'utf8'),
);
const snapshotPath = path.join(root, 'docs/system/database-test-snapshot.json');
const snapshot = fs.existsSync(snapshotPath)
  ? JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
  : null;
const esc = (value) =>
  String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\r', '')
    .replaceAll('\n', ' ');
const code = (value) => '`' + esc(value).replaceAll('`', '\\`') + '`';
const link = (file, line, label = 'source') => `[${esc(label)}](${file}${line ? '#L' + line : ''})`;
const lines = [];
const add = (...items) => lines.push(...items);
function table(headers, rows) {
  add('', '| ' + headers.join(' | ') + ' |', '| ' + headers.map(() => '---').join(' | ') + ' |');
  for (const row of rows)
    add('| ' + row.map((value) => String(value ?? '').replace(/\r?\n/g, ' ')).join(' | ') + ' |');
  add('');
}
add(
  '',
  `Source export: **${inventory.capturedOn}**, UTC ${code(inventory.capturedAt)}. Phạm vi: source working tree, không chạy giao dịch.`,
  '',
  '### 11.1. Số lượng API theo module',
);
const groups = Map.groupBy(inventory.endpoints, (e) => e.module);
table(
  ['Module', 'GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'Tổng'],
  [...groups].map(([group, endpoints]) => [
    code(group),
    ...['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].map(
      (m) => endpoints.filter((e) => e.method === m).length,
    ),
    endpoints.length,
  ]),
);
add(
  '### 11.2. Toàn bộ endpoint đã đăng ký',
  '',
  'JWT = phiên nội bộ; PUBLIC = không đòi JWT; PARTNER_API_KEY = bypass JWT nhưng bắt buộc key/scope. Permission liệt kê trong một dòng phải cùng được thỏa mãn. Dấu `-` ở Body/Query là không có DTO loại đó trong signature, không phải lời khẳng định action không kiểm nghiệp vụ. Header/Param được ghi kèm nếu có.',
  '',
  'Return type suy luận được ghi ở inventory JSON; response thực tế theo service/mapper và interceptor. Controller thường không có DTO response tường minh, nên không phát minh JSON Schema response từ tên model Prisma.',
);
for (const [group, endpoints] of groups) {
  add(`#### API ${group} (${endpoints.length})`);
  table(
    ['Method / path', 'Auth / quyền / scope', 'Input', 'Handler / nguồn'],
    endpoints.map((e) => [
      code(e.method + ' ' + e.path),
      code(e.auth) +
        (e.permissions.length ? '<br>' + e.permissions.map(code).join(', ') : '') +
        (e.partnerScopes.length ? '<br>scope: ' + e.partnerScopes.map(code).join(', ') : ''),
      e.inputs
        .map(
          (p) =>
            `${p.location}${p.key ? '(' + code(p.key) + ')' : ''}: ${p.typeFile ? link(p.typeFile, null, p.type) : code(p.type)}`,
        )
        .join('<br>') || '-',
      code(e.handler) + ' ' + link(e.file, e.line),
    ]),
  );
}
add(
  '### 11.3. DTO / field JSON đầu vào',
  '',
  'Đây là catalogue class DTO hiện diện trong source, bao gồm lớp chưa dùng trực tiếp ở signature endpoint và DTO lồng/kế thừa. Tên giống nhau ở file khác nhau không được coi là cùng contract. Link DTO ở bảng API trỏ file import thật của route.',
  '',
  'Bảng field dưới đây ghi member khai báo trực tiếp. Lớp `extends` phải đọc thêm lớp cha; `PartialType` kế thừa và đổi optional theo mapped type. `?`, `IsOptional` và initializer được ghi riêng để không suy diễn required chỉ từ TypeScript. Type được suy luận từ initializer nếu không có annotation thì đọc initializer/validator, không tự khẳng định kiểu mạng.',
  '',
);
for (const dto of inventory.dtos.sort(
  (a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name),
)) {
  add(
    '<details>',
    `<summary>${dto.name} - ${dto.usedDirectly ? 'DTO signature endpoint' : 'lớp lồng/kế thừa hoặc chưa dùng trực tiếp'}</summary>`,
    '',
    link(dto.file, dto.line, dto.file),
    '',
    'Kế thừa: ' + (dto.inherits.map(code).join(', ') || 'không') + '.',
  );
  if (dto.fields.length)
    table(
      ['Field', 'Type / TS optional', 'Default initializer', 'Validation / transform'],
      dto.fields.map((f) => [
        code(f.name),
        code(f.type || 'inferred') + (f.optional ? ' / ?' : ''),
        f.initializer ? code(f.initializer) : '-',
        f.validators.map(code).join('<br>') || '-',
      ]),
    );
  else add('', 'Không khai báo field trực tiếp; xem kế thừa/source.', '');
  add('</details>', '');
}
add(
  '### 11.4. Database snapshot test',
  '',
  snapshot
    ? `DB ${code(snapshot.database)}, MySQL ${code(snapshot.version)}, port ${snapshot.port}, snapshot UTC ${code(snapshot.capturedAt)}. COUNT(*) chính xác tại snapshot read-only; không phản ánh sản lượng thực tế và có thể thay đổi sau khi test tiếp.`
    : 'UNKNOWN: chưa có snapshot DB.',
);
if (snapshot)
  table(
    ['Bảng vật lý', 'Rows tại snapshot', 'Engine', 'Collation', 'Có model Prisma'],
    snapshot.tables.map((t) => [
      code(t.name),
      t.rows,
      t.engine,
      t.collation,
      t.inPrismaSchema ? 'Có' : 'Không',
    ]),
  );
add(
  '### 11.5. Dictionary đủ 53 model / bảng',
  '',
  'Mỗi model gồm cột scalar và relation ORM. Relation không phải cột vật lý; các thuộc tính giữ nguyên từ Prisma (id/unique/default/map/native type/relation/foreign-key). Unique/index đa cột được ghi bên dưới model.',
  '',
);
for (const model of inventory.models) {
  add(
    '<details>',
    `<summary>${model.name} / ${model.table}</summary>`,
    '',
    link(model.file, model.line, model.name),
  );
  table(
    ['Field Prisma', 'Cột DB / relation', 'Type', 'Thuộc tính / constraint'],
    model.fields.map((f) => [
      code(f.name),
      f.relation ? 'Relation ORM' : code(f.column),
      code(f.type),
      f.attributes ? code(f.attributes) : '-',
    ]),
  );
  add(
    'Ràng buộc cấp model:',
    '',
    ...model.constraints.map((c) => '- ' + code(c)),
    '',
    '</details>',
    '',
  );
}
add('### 11.6. Toàn bộ enum Prisma');
table(
  ['Enum', 'Giá trị', 'Nguồn'],
  inventory.enums.map((e) => [code(e.name), e.values.map(code).join(', '), link(e.file, e.line)]),
);
add(
  '### 11.7. Ma trận 56 permission x 7 role mặc định',
  '',
  '**Có / - là mapping seed, không phải chứng nhận tài khoản hiện tại được truy cập.** External-only AGENT/CONSIGNEE bị guard chặn nghiệp vụ như mục 6.3. Khi admin thay RolePermission, mapping runtime khác seed; role inactive/permission inactive không được hợp nhất.',
);
table(
  ['Permission', 'Chức năng', ...inventory.roles.map((r) => r.code)],
  inventory.permissions.map((p) => [
    code(p.code),
    p.name,
    ...inventory.roles.map((r) => (r.permissions.includes(p.code) ? 'Có' : '-')),
  ]),
);
add(
  'Nguồn ma trận: ' +
    link('apps/api/prisma/seed/data/role-permissions.data.ts') +
    '; tên chức năng: ' +
    link('apps/api/prisma/seed/data/permissions.data.ts') +
    '.',
  '',
  '### 11.8. Quyền mở từng tab Web',
);
table(
  ['URL', 'Permission (OR)'],
  Object.entries(inventory.webTabs).map(([tab, permissions]) => [
    code('/app/' + tab),
    permissions.length
      ? permissions.map(code).join(', ')
      : 'Phiên đăng nhập; dữ liệu vẫn kiểm quyền API',
  ]),
);
add(
  'Nguồn: ' + link('apps/web/src/services/permissions.ts') + '.',
  '',
  '### 11.9. Quyền màn/tab Mobile',
);
table(
  ['Screen permission nội bộ', 'Permission backend (OR)'],
  Object.entries(inventory.mobileScreenPermissions).map(([screen, permissions]) => [
    code(screen),
    permissions.map(code).join(', '),
  ]),
);
table(
  ['Tab đăng ký', 'Screen permission (OR)'],
  Object.entries(inventory.mobileTabPermissions).map(([tab, permissions]) => [
    code(tab),
    permissions.map(code).join(', '),
  ]),
);
add(
  'Nguồn: ' +
    link('apps/mobile/src/features/auth/permissions.ts') +
    '. OPERATOR có bộ tab hiển thị riêng; tab đăng ký phụ có thể được dùng để điều hướng task.',
  '',
  '### 11.10. Danh sách file giao diện',
);
table(
  ['Nền tảng', 'File'],
  [
    ...inventory.webViews.map((f) => ['Web view', link(f, null, f)]),
    ...inventory.mobileScreens.map((f) => ['Mobile screen', link(f, null, f)]),
  ],
);
add(
  '### 11.11. Nguồn gọi API frontend',
  '',
  'Call site là bằng chứng static có lệnh đọc/ghi, không phải test pass hay tỷ lệ endpoint coverage. Catalogue bao gồm apiClient/client và wrapper command của AppContext. Các helper dùng biến path, nối điều kiện hoặc gọi qua wrapper khác có thể giữ dynamic/UNKNOWN. `DATA_ROUTES` riêng bên dưới là các collection do AppContext đọc.',
  '',
  'Không lấy số call site chia cho 205 để tuyên bố tích hợp hoàn tất: nhiều caller cùng endpoint, route phát sinh động và có API không thuộc UI.',
);
if (inventory.webDataRoutes)
  table(
    ['Collection Web', 'GET path (trước prefix /api)'],
    Object.entries(inventory.webDataRoutes).map(([name, p]) => [code(name), code(p)]),
  );
table(
  ['Platform', 'Method', 'Path / biểu thức nguồn', 'Nguồn'],
  inventory.frontendCalls.map((c) => [
    c.platform,
    code(c.method),
    code(c.path),
    link(c.file, c.line, c.via || 'call'),
  ]),
);
add('');
const readmePath = path.join(root, 'README.md');
const start = '<!-- SYSTEM-INVENTORY:START -->';
const end = '<!-- SYSTEM-INVENTORY:END -->';
const readme = fs.readFileSync(readmePath, 'utf8');
if (
  readme.split(start).length !== 2 ||
  readme.split(end).length !== 2 ||
  readme.indexOf(end) < readme.indexOf(start)
)
  throw new Error('README inventory markers missing, duplicated or reversed');
const next =
  readme.slice(0, readme.indexOf(start) + start.length) +
  '\n' +
  lines.join('\n') +
  '\n' +
  readme.slice(readme.indexOf(end));
fs.writeFileSync(readmePath, next, 'utf8');
console.log(
  `README: ${next.split('\n').length} lines; ${inventory.endpoints.length} endpoints; ${inventory.models.length} models; ${inventory.permissions.length} permissions; ${inventory.dtos.length} DTO classes.`,
);

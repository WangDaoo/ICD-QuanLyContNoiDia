// Chụp ảnh dẫn chứng cho đợt hồi quy 28/11/2026 trên Web (chế độ Local: Web 5173, API 3000).
// Mật khẩu KHÔNG ghi trong tệp: đọc từ biến môi trường ICD_TEST_PASSWORD (hoặc BOOTSTRAP_ADMIN_PASSWORD).
// Playwright lấy từ PLAYWRIGHT_MODULE (đường dẫn tới thư mục gói playwright), trình duyệt từ CHROMIUM_PATH nếu có.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const WEB = process.env.ICD_WEB_BASE ?? 'http://localhost:5173';
const API = process.env.ICD_API_BASE ?? 'http://127.0.0.1:3000/api';
const OUT = process.env.ICD_OUT_DIR ?? path.resolve('test-artifacts/2026-11-28-full-regression');
const PASSWORD = process.env.ICD_TEST_PASSWORD ?? process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!PASSWORD) throw new Error('Thiếu ICD_TEST_PASSWORD.');
const playwright = await import(pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE, 'index.js')).href);
const chromium = playwright.chromium ?? playwright.default.chromium;

const SHOTS = path.join(OUT, 'screenshots', 'web');
await fs.mkdir(SHOTS, { recursive: true });
const cases = [];
const record = (entry) => { cases.push({ at: new Date().toISOString(), ...entry }); console.log(`${entry.status} ${entry.id} ${entry.title}`); };

const TABS = [
  ['dashboard', 'Tổng quan vận hành'], ['work-queue', 'Danh sách công việc'], ['manifests', 'Manifest'],
  ['containers', 'Container'], ['movement-orders', 'Lệnh di chuyển'], ['truck-visits', 'Chuyến xe ra/vào'],
  ['gate-in', 'Nhập cổng'], ['yard', 'Bãi container'], ['billing', 'Dịch vụ & Thanh toán'],
  ['gate-pass', 'Xuất cổng'], ['edi', 'EDI / CODECO'], ['handovers', 'Bàn giao vận chuyển'],
  ['partner-clients', 'Đối tác tích hợp API'], ['partner-api-logs', 'Nhật ký API đối tác'],
  ['master-data', 'Danh mục dùng chung'], ['users-roles', 'Người dùng & Phân quyền'],
  ['admin', 'Báo cáo'], ['activity', 'Nhật ký kiểm toán'],
];
const ROLES = ['manager', 'operator', 'docs', 'gate', 'yard', 'agent', 'consignee'];

async function apiLogin(email) {
  const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Đăng nhập API thất bại cho ${email}: HTTP ${res.status}`);
  return body.data.accessToken;
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"], .animate-spin'), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(600);
}

/** Văn bản lỗi hiển thị kiểu "undefined", "NaN", "null" trong nội dung chính là dấu hiệu ánh xạ dữ liệu sai. */
async function textFlags(page) {
  const text = await page.locator('main').innerText().catch(() => '');
  return { undefined: /\bundefined\b/.test(text), NaN: /\bNaN\b/.test(text), null: /(^|\s)null(\s|$)/.test(text), chars: text.length };
}

function watch(page) {
  const problems = [];
  page.on('console', (msg) => { if (msg.type() === 'error') problems.push(`console: ${msg.text().slice(0, 300)}`); });
  page.on('pageerror', (err) => problems.push(`pageerror: ${String(err).slice(0, 300)}`));
  page.on('response', (res) => {
    const url = res.url();
    if (url.startsWith(API) && res.status() >= 500) problems.push(`HTTP ${res.status()} ${res.request().method()} ${url.slice(API.length)}`);
  });
  return problems;
}

async function login(page, email) {
  await page.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(PASSWORD);
  await page.getByRole('button', { name: /Đăng nhập/ }).last().click();
  await page.waitForURL(/\/app\//, { timeout: 20000 });
  await settle(page);
}

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });

// 1. Đăng nhập: trang trống, sai mật khẩu, đăng nhập đúng.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
  const page = await ctx.newPage();
  const problems = watch(page);
  await page.goto(`${WEB}/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(SHOTS, '00-login.png') });
  record({ id: 'WEB-AUTH-01', title: 'Trang đăng nhập hiển thị', status: (await page.locator('#login-email').count()) ? 'PASS' : 'FAIL', file: 'screenshots/web/00-login.png' });

  await page.locator('#login-email').fill('admin@icd.local');
  await page.locator('#login-password').fill('sai-mat-khau-co-chu-y');
  await page.getByRole('button', { name: /Đăng nhập/ }).last().click();
  const alert = page.locator('[role="alert"]').first();
  await alert.waitFor({ timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: path.join(SHOTS, '01-login-invalid.png') });
  const stillOnLogin = !/\/app\//.test(page.url());
  record({ id: 'WEB-AUTH-02', title: 'Sai mật khẩu bị từ chối, vẫn ở trang đăng nhập', status: stillOnLogin && (await alert.count()) ? 'PASS' : 'FAIL', detail: (await alert.innerText().catch(() => '')).slice(0, 200), file: 'screenshots/web/01-login-invalid.png' });

  await login(page, 'admin@icd.local');
  await page.screenshot({ path: path.join(SHOTS, '02-login-success-dashboard.png') });
  record({ id: 'WEB-AUTH-03', title: 'Đăng nhập quản trị viên vào bảng điều khiển', status: /\/app\//.test(page.url()) ? 'PASS' : 'FAIL', url: page.url().replace(WEB, ''), file: 'screenshots/web/02-login-success-dashboard.png' });

  const pill = page.getByRole('status').filter({ hasText: /Cập nhật trực tiếp|Đang kết nối|Ngoại tuyến/ }).first();
  await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some((el) => el.textContent?.includes('Cập nhật trực tiếp')), null, { timeout: 15000 }).catch(() => {});
  const pillText = await pill.innerText().catch(() => '');
  await page.locator('header').screenshot({ path: path.join(SHOTS, '03-realtime-indicator.png') }).catch(() => {});
  record({ id: 'WEB-RT-01', title: 'Header báo kênh realtime đang kết nối trực tiếp', status: pillText.includes('Cập nhật trực tiếp') ? 'PASS' : 'FAIL', detail: pillText, file: 'screenshots/web/03-realtime-indicator.png' });

  // 2. Lần lượt mở 18 phân hệ bằng quyền quản trị.
  let n = 10;
  for (const [tab, label] of TABS) {
    const before = problems.length;
    await page.goto(`${WEB}/app/${tab}`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const file = `screenshots/web/${n}-${tab}.png`;
    await page.screenshot({ path: path.join(OUT, file), fullPage: false });
    const flags = await textFlags(page);
    const heading = await page.locator('main h1, main h2').first().innerText().catch(() => '');
    const errorBox = await page.locator('main [role="alert"]').allInnerTexts().catch(() => []);
    const fresh = problems.slice(before);
    const ok = flags.chars > 40 && !flags.undefined && !flags.NaN && fresh.length === 0;
    record({ id: `WEB-TAB-${tab}`, title: `Mở phân hệ ${label}`, status: ok ? 'PASS' : 'FAIL', heading, flags, alerts: errorBox.slice(0, 3), problems: fresh, file });
    n++;
  }

  // AD-01: tra nhật ký kiểm toán theo request ID ngay trên ô tìm kiếm của Web.
  try {
    await page.goto(`${WEB}/app/activity`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const rows = page.locator('main tbody tr');
    const totalRows = await rows.count();
    const requestIds = (await rows.locator('td:last-child').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    const requestId = requestIds[0];
    await page.getByLabel('Tìm nhật ký kiểm toán').fill(requestId ?? 'khong-co-request-id');
    await page.waitForTimeout(600);
    const matched = (await rows.locator('td:last-child').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    const file = `screenshots/web/${n++}-audit-search-request-id.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    record({ id: 'WEB-AUDIT-01', title: 'Tìm nhật ký kiểm toán theo request ID trên Web', status: requestId && matched.length > 0 && matched.every((id) => id === requestId) ? 'PASS' : 'FAIL', detail: { requestId, totalRows, matchedRows: matched.length }, file });
  } catch (error) {
    record({ id: 'WEB-AUDIT-01', title: 'Tìm nhật ký kiểm toán theo request ID trên Web', status: 'FAIL', error: String(error).slice(0, 300) });
  }
  await ctx.close();
}

// 3. Phân quyền theo vai trò: menu phải hiện ĐÚNG các phân hệ mà tập quyền của tài khoản cho phép
// (đối chiếu với bảng TAB_PERMISSIONS của Web và permissionCodes do /auth/me trả về),
// và mở thẳng URL ngoài quyền thì bị chặn.
const permissionsSource = await fs.readFile(path.resolve('apps/web/src/services/permissions.ts'), 'utf8');
const tabMapText = permissionsSource.match(/const TAB_PERMISSIONS[^=]*=\s*(\{[\s\S]*?\n\});/)?.[1];
if (!tabMapText) throw new Error('Không đọc được TAB_PERMISSIONS trong apps/web/src/services/permissions.ts');
const TAB_PERMISSIONS = new Function(`return ${tabMapText};`)();
const canAccessTab = (codes, tab) => {
  const required = TAB_PERMISSIONS[tab];
  if (!required) return false;
  return required.length === 0 || codes.includes('*') || required.some((code) => codes.includes(code));
};

for (const role of ROLES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
  const page = await ctx.newPage();
  const problems = watch(page);
  const email = `${role}@icd.local`;
  try {
    const token = await apiLogin(email);
    const me = await (await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })).json();
    const codes = me?.data?.permissionCodes ?? [];
    const expected = TABS.map(([tab]) => tab).filter((tab) => canAccessTab(codes, tab));
    await login(page, email);
    const labels = await page.locator('aside[aria-label="Điều hướng nghiệp vụ"] button span.truncate').allInnerTexts();
    const visible = TABS.filter(([, label]) => labels.map((text) => text.trim()).includes(label)).map(([tab]) => tab);
    const menuMatches = visible.length === expected.length && expected.every((tab) => visible.includes(tab));
    const file = `screenshots/web/40-role-${role}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    const hidden = TABS.map(([tab]) => tab).filter((tab) => !visible.includes(tab));
    let guard = null;
    if (hidden.length) {
      const target = hidden.includes('users-roles') ? 'users-roles' : hidden[0];
      await page.goto(`${WEB}/app/${target}`, { waitUntil: 'domcontentloaded' });
      await settle(page);
      const landed = new URL(page.url()).pathname;
      const main = await page.locator('main').innerText().catch(() => '');
      guard = { target, landed, blocked: landed !== `/app/${target}` || /không có quyền|Không đủ quyền|không được phép/i.test(main) };
      await page.screenshot({ path: path.join(OUT, `screenshots/web/41-role-${role}-guard-${target}.png`) });
    }
    record({
      id: `WEB-RBAC-${role}`, title: `Vai trò ${role}: menu theo quyền`,
      status: visible.length > 0 && menuMatches && (!guard || guard.blocked) && problems.length === 0 ? 'PASS' : 'FAIL',
      roles: me?.data?.roleCodes, permissionCount: codes.length, expected, visible, guard, problems, file,
    });
  } catch (error) {
    record({ id: `WEB-RBAC-${role}`, title: `Vai trò ${role}: menu theo quyền`, status: 'FAIL', error: String(error).slice(0, 300) });
  }
  await ctx.close();
}

// 4. Realtime: quản trị viên đang mở danh sách Manifest; người khác tạo manifest qua API; màn hình tự hiện bản mới, không tải lại trang.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
  const page = await ctx.newPage();
  await login(page, 'admin@icd.local');
  await page.goto(`${WEB}/app/manifests`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some((el) => el.textContent?.includes('Cập nhật trực tiếp')), null, { timeout: 15000 }).catch(() => {});
  const navigations = [];
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
  await page.screenshot({ path: path.join(SHOTS, '50-realtime-before.png') });

  // Hãng tàu đọc bằng quyền quản trị (danh mục); manifest do tài khoản chứng từ (docs) tạo.
  const adminToken = await apiLogin('admin@icd.local');
  const token = await apiLogin('docs@icd.local');
  const voyage = `RT-${Date.now().toString().slice(-8)}`;
  const lines = await (await fetch(`${API}/admin/master-data/shipping-lines?pageSize=1`, { headers: { Authorization: `Bearer ${adminToken}` } })).json().catch(() => ({}));
  const shippingLineId = Array.isArray(lines?.data) ? lines.data[0]?.id : undefined;
  const eta = new Date(Date.now() + 86400000).toISOString();
  const created = await fetch(`${API}/manifests`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ vesselName: `REALTIME ${voyage}`, voyageNo: voyage, shippingLineId, eta, portOfLoading: 'Cảng Hải Phòng', portOfDischarge: 'ICD Nội địa' }),
  });
  const createdBody = await created.json().catch(() => ({}));
  const started = Date.now();
  const appeared = await page.getByText(voyage).first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  const latencyMs = Date.now() - started;
  await page.screenshot({ path: path.join(SHOTS, '51-realtime-after.png') });
  record({
    id: 'WEB-RT-02', title: 'Manifest do tài khoản khác tạo tự hiện trên màn hình quản trị (không tải lại trang)',
    status: created.ok && appeared && navigations.length === 0 ? 'PASS' : 'FAIL',
    detail: { createStatus: created.status, manifestCode: createdBody?.data?.code ?? createdBody?.data?.manifestNo, voyage, appeared, latencyMs, reloads: navigations.length, error: created.ok ? undefined : createdBody?.error },
    files: ['screenshots/web/50-realtime-before.png', 'screenshots/web/51-realtime-after.png'],
  });
  await ctx.close();
}

await browser.close();
await fs.writeFile(path.join(OUT, 'web-cases.json'), JSON.stringify(cases, null, 2), 'utf8');
const failed = cases.filter((c) => c.status !== 'PASS');
console.log(`TOTAL ${cases.length} PASS ${cases.length - failed.length} FAIL ${failed.length}`);

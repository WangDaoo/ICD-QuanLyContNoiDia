// Chụp ảnh dẫn chứng Mobile (Expo Web, khung 390x844) cho đợt hồi quy 28/11/2026.
// Mật khẩu KHÔNG ghi trong tệp: đọc từ ICD_TEST_PASSWORD (hoặc BOOTSTRAP_ADMIN_PASSWORD).
// Playwright lấy từ PLAYWRIGHT_MODULE (thư mục gói playwright), trình duyệt từ CHROMIUM_PATH nếu có.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const APP = process.env.ICD_MOBILE_BASE ?? 'http://localhost:8081';
const API = process.env.ICD_API_BASE ?? 'http://127.0.0.1:3000/api';
const API_MATCH = process.env.ICD_API_MATCH ?? ':3000/api';
const OUT = process.env.ICD_OUT_DIR ?? path.resolve('test-artifacts/2026-11-28-full-regression');
const PASSWORD = process.env.ICD_TEST_PASSWORD ?? process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!PASSWORD) throw new Error('Thiếu ICD_TEST_PASSWORD.');
const playwright = await import(pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE, 'index.js')).href);
const chromium = playwright.chromium ?? playwright.default.chromium;

const SHOTS = path.join(OUT, 'screenshots', 'mobile');
await fs.mkdir(SHOTS, { recursive: true });
const cases = [];
const record = (entry) => { cases.push({ at: new Date().toISOString(), ...entry }); console.log(`${entry.status} ${entry.id} ${entry.title}`); };
const TAB_LABELS = ['Cổng', 'Bãi', 'Giám định', 'Tra cứu', 'Việc ca', 'Điều phối'];
const ROLES = ['gate', 'yard', 'operator', 'admin', 'docs'];

async function apiLogin(email) {
  const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Đăng nhập API thất bại cho ${email}: HTTP ${res.status}`);
  return body.data.accessToken;
}

async function settle(page, ms = 800) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function bodyFlags(page) {
  const text = await page.locator('body').innerText().catch(() => '');
  return { undefined: /\bundefined\b/.test(text), NaN: /\bNaN\b/.test(text), chars: text.length, text };
}

function watch(page) {
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Cảnh báo phát triển của react-native-web, không phải lỗi chức năng.
    if (/props\.pointerEvents is deprecated|shadow\*" style props are deprecated|useNativeDriver/.test(text)) return;
    problems.push(`console: ${text.slice(0, 300)}`);
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${String(err).slice(0, 300)}`));
  page.on('response', (res) => {
    if (res.url().includes(API_MATCH) && res.status() >= 500) problems.push(`HTTP ${res.status()} ${res.request().method()} ${res.url().split(API_MATCH)[1]}`);
  });
  return problems;
}

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'vi-VN', hasTouch: true, isMobile: false });
  const page = await ctx.newPage();
  return { ctx, page, problems: watch(page) };
}

async function login(page, email) {
  await page.goto(`${APP}/`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Nhập email được cấp').waitFor({ timeout: 60000 });
  await page.getByPlaceholder('Nhập email được cấp').fill(email);
  await page.getByPlaceholder('Nhập mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByPlaceholder('Nhập email được cấp').waitFor({ state: 'detached', timeout: 20000 });
  await settle(page, 1200);
}

const shot = async (page, name) => { await page.screenshot({ path: path.join(SHOTS, name), type: 'jpeg', quality: 82 }); return `screenshots/mobile/${name}`; };

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });

// 1. Đăng nhập: màn hình trống, sai mật khẩu.
{
  const { ctx, page, problems } = await newPage(browser);
  await page.goto(`${APP}/`, { waitUntil: 'domcontentloaded' });
  const ready = await page.getByPlaceholder('Nhập email được cấp').waitFor({ timeout: 90000 }).then(() => true).catch(() => false);
  await settle(page);
  record({ id: 'MB-AUTH-01', title: 'Màn hình đăng nhập Mobile hiển thị', status: ready ? 'PASS' : 'FAIL', file: await shot(page, '00-login.jpg') });

  await page.getByPlaceholder('Nhập email được cấp').fill('gate@icd.local');
  await page.getByPlaceholder('Nhập mật khẩu').fill('sai-mat-khau-co-chu-y');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForTimeout(2500);
  const still = await page.getByPlaceholder('Nhập email được cấp').count();
  const text = (await bodyFlags(page)).text;
  const message = (text.match(/[^\n]*(không đúng|không hợp lệ|thất bại|sai)[^\n]*/i) ?? [''])[0];
  record({ id: 'MB-AUTH-02', title: 'Sai mật khẩu bị từ chối, vẫn ở màn đăng nhập', status: still && message ? 'PASS' : 'FAIL', detail: message.slice(0, 200), problems, file: await shot(page, '01-login-invalid.jpg') });
  await ctx.close();
}

// 2. Theo vai trò: tab hiện trường đúng quyền, mở từng tab, thông báo, tài khoản.
let n = 10;
for (const role of ROLES) {
  const { ctx, page, problems } = await newPage(browser);
  const email = `${role}@icd.local`;
  try {
    await login(page, email);
    const home = await bodyFlags(page);
    const visibleTabs = [];
    for (const label of TAB_LABELS) {
      const tab = page.getByRole('tab', { name: label, exact: true }).or(page.getByRole('button', { name: label, exact: true }));
      if (await tab.first().isVisible().catch(() => false)) visibleTabs.push(label);
    }
    const forbidden = /chưa được cấp quyền sử dụng chức năng hiện trường/.test(home.text);
    record({ id: `MB-ROLE-${role}`, title: `Vai trò ${role}: tab hiện trường theo quyền`, status: (visibleTabs.length > 0 || forbidden) && !home.undefined && !home.NaN ? 'PASS' : 'FAIL', visibleTabs, forbidden, file: await shot(page, `${n++}-${role}-home.jpg`) });

    for (const label of visibleTabs) {
      const before = problems.length;
      await page.getByRole('tab', { name: label, exact: true }).or(page.getByRole('button', { name: label, exact: true })).first().click();
      await settle(page, 1500);
      const flags = await bodyFlags(page);
      const fresh = problems.slice(before);
      const file = await shot(page, `${n++}-${role}-tab-${label.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').replace(/\s+/g, '-').toLowerCase()}.jpg`);
      record({ id: `MB-TAB-${role}-${label}`, title: `${role}: mở tab ${label}`, status: flags.chars > 40 && !flags.undefined && !flags.NaN && fresh.length === 0 ? 'PASS' : 'FAIL', problems: fresh, file });
    }

    if (!forbidden) {
      const bell = page.getByRole('button', { name: 'Thông báo' }).first();
      if (await bell.isVisible().catch(() => false)) {
        const before = problems.length;
        await bell.click();
        await settle(page, 1500);
        const flags = await bodyFlags(page);
        record({ id: `MB-NOTI-${role}`, title: `${role}: mở hộp thông báo`, status: !flags.undefined && !flags.NaN && problems.length === before ? 'PASS' : 'FAIL', problems: problems.slice(before), file: await shot(page, `${n++}-${role}-notifications.jpg`) });
        // Quay lại bằng nút trong ứng dụng (lịch sử trình duyệt không phản ánh stack điều hướng).
        const back = page.getByRole('button', { name: 'Quay lại' }).filter({ visible: true }).first();
        if (await back.isVisible().catch(() => false)) await back.click();
        await settle(page);
      }
    }
    // Màn hình bị cấm có nút mở tài khoản riêng; các màn còn lại dùng biểu tượng trên header.
    const account = page.getByRole('button', { name: 'Tài khoản và kết thúc ca' })
      .or(page.getByRole('button', { name: /Tài khoản/ }))
      .filter({ visible: true }).first();
    const accountVisible = await account.isVisible().catch(() => false);
    if (accountVisible) {
      const before = problems.length;
      await account.click();
      await settle(page, 1200);
      const flags = await bodyFlags(page);
      const showsUser = flags.text.includes(email);
      const hasLogout = /Đăng xuất tài khoản/.test(flags.text);
      record({ id: `MB-ACC-${role}`, title: `${role}: màn tài khoản hiển thị đúng người dùng`, status: showsUser && hasLogout && !flags.undefined && !flags.NaN && problems.length === before ? 'PASS' : 'FAIL', showsUser, hasLogout, problems: problems.slice(before), file: await shot(page, `${n++}-${role}-account.jpg`) });
    } else {
      record({ id: `MB-ACC-${role}`, title: `${role}: màn tài khoản hiển thị đúng người dùng`, status: 'FAIL', error: 'Không thấy nút mở màn tài khoản', file: await shot(page, `${n++}-${role}-account-missing.jpg`) });
    }
  } catch (error) {
    record({ id: `MB-ROLE-${role}`, title: `Vai trò ${role}: đăng nhập và mở tab`, status: 'FAIL', error: String(error).slice(0, 300), file: await shot(page, `${n++}-${role}-error.jpg`).catch(() => undefined) });
  }
  await ctx.close();
}

// 3. Tra cứu container theo số thật lấy từ API.
{
  const token = await apiLogin('admin@icd.local');
  const list = await (await fetch(`${API}/containers?page=1&pageSize=5`, { headers: { Authorization: `Bearer ${token}` } })).json().catch(() => ({}));
  const rows = Array.isArray(list?.data) ? list.data : Array.isArray(list?.data?.data) ? list.data.data : [];
  // Danh sách trả về lượt container (visit); số hiệu nằm trong đối tượng container lồng bên trong.
  const containerNo = rows.map((r) => r.container?.containerNumber ?? r.containerNumber).find(Boolean);
  const { ctx, page, problems } = await newPage(browser);
  try {
    await login(page, 'gate@icd.local');
    await page.getByRole('tab', { name: 'Tra cứu', exact: true }).or(page.getByRole('button', { name: 'Tra cứu', exact: true })).first().click();
    await settle(page);
    const query = containerNo ? containerNo.slice(0, 7) : 'ZZZZ';
    await page.getByPlaceholder('Nhập số hoặc một phần số container').fill(query);
    await page.getByRole('button', { name: 'Tìm kiếm container' }).click();
    await settle(page, 1500);
    const text = (await bodyFlags(page)).text;
    record({ id: 'MB-LOOKUP-01', title: 'Tra cứu container theo một phần số hiệu', status: containerNo && text.includes(containerNo) && problems.length === 0 ? 'PASS' : 'FAIL', detail: { query, containerNo }, problems, file: await shot(page, `${n++}-lookup-results.jpg`) });
  } catch (error) {
    record({ id: 'MB-LOOKUP-01', title: 'Tra cứu container theo một phần số hiệu', status: 'FAIL', error: String(error).slice(0, 300) });
  }
  await ctx.close();
}

// 4. Realtime: điều độ (operator) đang mở "Việc ca"; tài khoản chứng từ tạo manifest qua API;
//    ứng dụng phải tự gọi lại API làm mới màn hình mà không tải lại trang.
{
  const { ctx, page } = await newPage(browser);
  const apiCalls = [];
  let streamOpened = false;
  page.on('request', (req) => {
    const url = req.url();
    if (!url.includes(API_MATCH)) return;
    if (url.includes('/realtime/events')) { streamOpened = true; return; }
    if (url.includes('/health')) return; // health poll is not a realtime refresh
    apiCalls.push({ t: Date.now(), path: url.split(API_MATCH)[1].split('?')[0] });
  });
  const navigations = [];
  try {
    await login(page, 'operator@icd.local');
    await page.getByRole('tab', { name: 'Việc ca', exact: true }).or(page.getByRole('button', { name: 'Việc ca', exact: true })).first().click();
    await settle(page, 4000);
    page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
    const before = await shot(page, `${n++}-realtime-before.jpg`);
    await page.waitForTimeout(3000);
    const quietFrom = Date.now();
    // Hãng tàu đọc bằng quyền quản trị (danh mục); manifest do tài khoản chứng từ (docs) tạo.
    const adminToken = await apiLogin('admin@icd.local');
    const docsToken = await apiLogin('docs@icd.local');
    const lines = await (await fetch(`${API}/admin/master-data/shipping-lines?pageSize=1`, { headers: { Authorization: `Bearer ${adminToken}` } })).json().catch(() => ({}));
    const shippingLineId = Array.isArray(lines?.data) ? lines.data[0]?.id : undefined;
    const voyage = `RTM-${Date.now().toString().slice(-7)}`;
    const created = await fetch(`${API}/manifests`, {
      method: 'POST', headers: { Authorization: `Bearer ${docsToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vesselName: `REALTIME MOBILE ${voyage}`, voyageNo: voyage, shippingLineId, eta: new Date(Date.now() + 86400000).toISOString(), portOfLoading: 'Cảng Hải Phòng', portOfDischarge: 'ICD Nội địa' }),
    });
    const createdAt = Date.now();
    await page.waitForTimeout(8000);
    const refetched = apiCalls.filter((c) => c.t >= createdAt);
    const beforeMutation = apiCalls.filter((c) => c.t >= quietFrom && c.t < createdAt);
    const after = await shot(page, `${n++}-realtime-after.jpg`);
    record({
      id: 'MB-RT-01', title: 'Mobile mở luồng realtime và tự làm mới "Việc ca" khi có thay đổi từ tài khoản khác',
      status: created.ok && streamOpened && refetched.length > 0 && navigations.length === 0 ? 'PASS' : 'FAIL',
      detail: { createStatus: created.status, streamOpened, refetchedPaths: [...new Set(refetched.map((c) => c.path))], firstRefetchMs: refetched[0] ? refetched[0].t - createdAt : null, callsInQuietWindow: beforeMutation.length, reloads: navigations.length },
      files: [before, after],
    });
  } catch (error) {
    record({ id: 'MB-RT-01', title: 'Mobile realtime', status: 'FAIL', error: String(error).slice(0, 300) });
  }
  await ctx.close();
}

await browser.close();
await fs.writeFile(path.join(OUT, 'mobile-cases.json'), JSON.stringify(cases, null, 2), 'utf8');
const failed = cases.filter((c) => c.status !== 'PASS');
console.log(`TOTAL ${cases.length} PASS ${cases.length - failed.length} FAIL ${failed.length}`);

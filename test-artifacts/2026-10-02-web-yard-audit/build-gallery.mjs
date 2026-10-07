import { readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = dirname(fileURLToPath(import.meta.url));
const filenameOrder = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
const categoryLabels = {
  before: 'Trước cập nhật',
  site: 'Sơ đồ ICD',
  hold: 'Lệnh giữ',
  manual: 'Xếp vị trí',
  move: 'Di chuyển',
  booking: 'Đặt lịch',
  inspection: 'Kiểm định',
  'block-tier': 'Block và tầng',
  search: 'Tìm kiếm',
  list: 'Danh sách',
  config: 'Cấu hình',
  responsive: 'Màn hình nhỏ',
  operations: 'Tác nghiệp',
  other: 'Bằng chứng khác',
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export async function collectEvidenceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter(entry => entry.isFile() && /\.jpg$/i.test(entry.name))
    .map(entry => entry.name).sort(filenameOrder.compare);
}

export function describeEvidenceFile(filename) {
  const name = filename.toLowerCase();
  const caption = (category, title) => ({ category, title });
  if (name.includes('before')) return caption('before', 'Trước cập nhật — giao diện bãi ban đầu');
  if (name.includes('responsive') || name.includes('mobile') || name.includes('narrow')) {
    const width = name.match(/\b(?:360|390|412|768|1024|1280|1440|1920)\b/)?.[0];
    return caption('responsive', `Kiểm tra bố cục trên màn hình ${width ? `${width} px` : 'nhỏ'}`);
  }
  const blockTier = /block-([a-z0-9]+)-tier-([a-z0-9]+)/i.exec(filename);
  if (blockTier) return caption('block-tier', `Sơ đồ Block ${blockTier[1].toUpperCase()} — tầng ${blockTier[2]}`);
  if (name.includes('site')) return caption('site', 'Sơ đồ tổng thể ICD — cổng, đường nội bộ và các block bãi');
  if (name.includes('manual')) {
    return caption('manual', name.includes('assigned')
      ? 'Xếp vị trí thủ công — vị trí container sau khi lưu'
      : 'Xếp vị trí thủ công — kiểm tra và chọn slot');
  }
  if (name.includes('inspection')) {
    if (name.includes('hold-note-required')) return caption('inspection', 'Kiểm định HOLD — yêu cầu ghi chú kết quả');
    if (name.includes('map-yellow')) return caption('inspection', 'Trạng thái kiểm định trên sơ đồ bãi');
    if (name.includes('pass')) return caption('inspection', 'Kết quả kiểm định PASS');
    if (name.includes('fail')) return caption('inspection', 'Kết quả kiểm định FAIL');
    if (name.includes('create')) return caption('inspection', 'Tạo yêu cầu kiểm định container');
    if (name.includes('start')) return caption('inspection', 'Bắt đầu thực hiện kiểm định');
    return caption('inspection', 'Kiểm định container — theo dõi yêu cầu và kết quả');
  }
  if (name.includes('hold')) return caption('hold', 'Chi tiết container có lệnh giữ nghiệp vụ');
  if (name.includes('move')) {
    if (name.includes('completion-dialog')) return caption('move', 'Di chuyển nội bãi — hộp thoại xác nhận hoàn tất');
    if (name.includes('completed')) return caption('move', 'Di chuyển nội bãi — vị trí sau khi hoàn tất');
    if (name.includes('validation')) return caption('move', 'Di chuyển nội bãi — kiểm tra thông tin bắt buộc');
    if (name.includes('cancel')) return caption('move', 'Di chuyển nội bãi — hủy lệnh và ghi nhận lý do');
    if (name.includes('start')) return caption('move', 'Di chuyển nội bãi — bắt đầu thực hiện');
    return caption('move', 'Di chuyển nội bãi — tạo và theo dõi lệnh');
  }
  if (name.includes('booking')) {
    if (name.includes('empty-actual-weight')) return caption('booking', 'Kết quả tác nghiệp — trọng lượng chưa đo giữ trống');
    if (name.includes('completed-without-weight')) return caption('booking', 'Hoàn tất tác nghiệp — không tự ghi trọng lượng bằng 0');
    if (name.includes('actual-results')) return caption('booking', 'Đặt lịch tác nghiệp — số kiện, trọng lượng và tình trạng hàng thực tế');
    if (name.includes('result-validation')) return caption('booking', 'Đặt lịch tác nghiệp — kiểm tra số kiện và trọng lượng');
    if (name.includes('date-validation')) return caption('booking', 'Đặt lịch tác nghiệp — kiểm tra ngày giờ dự kiến');
    if (name.includes('local-time') || name.includes('date-fixed')) return caption('booking', 'Đặt lịch tác nghiệp — ngày giờ theo múi giờ thiết bị');
    if (name.includes('cancel-in-progress')) return caption('booking', 'Đặt lịch tác nghiệp — hủy khi đang thực hiện');
    if (name.includes('cancel')) return caption('booking', 'Đặt lịch tác nghiệp — hủy và ghi nhận lý do');
    return caption('booking', 'Đặt lịch tác nghiệp bãi — theo dõi lịch và trạng thái');
  }
  if (name.includes('cancel-reason')) return caption('operations', 'Hủy tác nghiệp — yêu cầu nhập lý do');
  if (name.includes('search')) return caption('search', 'Tìm container trên sơ đồ bãi');
  if (name.includes('list')) return caption('list', name.includes('reefer')
    ? 'Danh sách vị trí bãi — lọc slot có điện lạnh'
    : 'Danh sách vị trí bãi — thông tin slot và container');
  if (name.includes('block') || name.includes('slot') || name.includes('config')) {
    if (name.includes('required')) return caption('config', 'Cấu hình block — kiểm tra thông tin bắt buộc');
    if (name.includes('duplicate')) return caption('config', 'Cấu hình block — kiểm tra mã trùng');
    if (name.includes('alphanumeric')) return caption('config', 'Cấu hình slot — giữ nguyên nhãn tọa độ chữ và số');
    return caption('config', 'Cấu hình block và vị trí bãi');
  }
  if (name.includes('operations')) return caption('operations', 'Danh sách tác nghiệp bãi sau các bước kiểm tra');
  return caption('other', `Ảnh bằng chứng: ${filename.replace(/\.jpg$/i, '').replace(/-/g, ' ')}`);
}

export function renderGallery(filenames) {
  const sortedFiles = [...filenames].sort(filenameOrder.compare);
  const categories = [...new Set(sortedFiles.map(filename => describeEvidenceFile(filename).category))];
  const buttons = categories.map(category => `<button type="button" data-filter="${category}" aria-pressed="false">${categoryLabels[category]}</button>`).join('\n');
  const cards = sortedFiles.map((filename, index) => {
    const { category, title } = describeEvidenceFile(filename);
    const fileUrl = encodeURIComponent(filename);
    return `<figure class="evidence-card" data-category="${category}">
  <a href="${fileUrl}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(`Mở ảnh gốc: ${title}`)}"><img src="${fileUrl}" alt="${escapeHtml(title)}" loading="lazy" decoding="async"></a>
  <figcaption><span class="category">${categoryLabels[category]}</span><h2>${escapeHtml(title)}</h2><p class="filename">${String(index + 1).padStart(2, '0')} · ${escapeHtml(filename)}</p></figcaption>
</figure>`;
  }).join('\n');
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bằng chứng kiểm tra vận hành bãi ICD — 02/10/2026</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3f6fa;color:#172236;font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}a{color:#1659bd}header,main,footer{max-width:1500px;margin:auto;padding:26px 28px}header{padding-bottom:18px}h1{margin:5px 0 10px;font-size:clamp(24px,3vw,36px);line-height:1.2}h2{margin:8px 0 10px;font-size:17px;line-height:1.4}.eyebrow{font-size:12px;font-weight:750;letter-spacing:.09em;text-transform:uppercase;color:#416080}.intro{max-width:850px;margin:0 0 14px;color:#536478}.report-link{display:inline-flex;border:1px solid #b8cae2;border-radius:9px;padding:8px 14px;background:#fff;font-weight:650;text-decoration:none}.toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 12px}.toolbar button{cursor:pointer;border:1px solid #ccd7e4;border-radius:30px;padding:7px 13px;background:#fff;color:#37506d;font:inherit;font-size:13px}.toolbar button[aria-pressed="true"]{background:#195dc4;border-color:#195dc4;color:#fff}button:focus-visible,a:focus-visible{outline:3px solid #f59e0b;outline-offset:3px}.count{font-size:13px;color:#536478}main{padding-top:0}.gallery-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.evidence-card{margin:0;overflow:hidden;border:1px solid #d9e1ec;border-radius:14px;background:#fff;box-shadow:0 4px 16px #17355708}.evidence-card>a{display:block;background:#e8edf4}.evidence-card img{display:block;width:100%;aspect-ratio:16/10;object-fit:contain}.evidence-card figcaption{padding:17px 19px}.category{font-size:11px;font-weight:750;letter-spacing:.06em;text-transform:uppercase;color:#376c9f}.filename{overflow-wrap:anywhere;margin:0;font:12px/1.5 ui-monospace,Consolas,monospace;color:#6e7e90}.empty{padding:30px;border:1px dashed #b7c8dc;border-radius:12px;color:#536478}footer{color:#677b92;font-size:12px}[hidden]{display:none!important}noscript{font-size:13px;color:#536478}@media(max-width:760px){header,main,footer{padding-left:16px;padding-right:16px}.gallery-grid{grid-template-columns:1fr;gap:17px}.toolbar{gap:6px}.toolbar button{padding:6px 10px}}@media print{body{background:#fff}.toolbar,.report-link{display:none}.gallery-grid{gap:14px}.evidence-card{break-inside:avoid;box-shadow:none}header,main,footer{padding:10px}}
</style>
</head>
<body>
<header>
  <div class="eyebrow">ICD Management · Kiểm tra vận hành bãi · 02/10/2026</div>
  <h1>Bằng chứng kiểm tra giao diện Yard</h1>
  <p class="intro">Ảnh chụp giao diện phục vụ đối chiếu sơ đồ bãi, xếp vị trí thủ công và các bước tác nghiệp. Chọn một nhóm để lọc ảnh; bấm vào ảnh để mở bản gốc. Kết quả, phạm vi kiểm tra và các giới hạn được ghi trong báo cáo.</p>
  <a class="report-link" href="REPORT.md">Đọc báo cáo kiểm tra</a>
  <nav class="toolbar" aria-label="Lọc nhóm bằng chứng"><button type="button" data-filter="all" aria-pressed="true">Tất cả</button>${buttons}</nav>
  <output class="count" id="image-count" aria-live="polite">${sortedFiles.length} ảnh</output>
  <noscript><p>Chưa bật JavaScript: tất cả ảnh vẫn hiển thị bên dưới.</p></noscript>
</header>
<main><div class="gallery-grid">${cards || '<p class="empty">Chưa có ảnh bằng chứng. Chạy lại bộ tạo sau khi lưu ảnh JPG vào thư mục này.</p>'}</div></main>
<footer>Danh sách được sắp xếp theo tên tệp theo thứ tự tự nhiên. Chạy lại build-gallery.mjs để đưa các ảnh JPG mới vào trang này. Ảnh và báo cáo sử dụng đường dẫn tương đối trong cùng thư mục.</footer>
<script>
const filterButtons = document.querySelectorAll('[data-filter]');
const cards = document.querySelectorAll('[data-category]');
const count = document.getElementById('image-count');
filterButtons.forEach(button => button.addEventListener('click', () => {
  const category = button.dataset.filter;
  filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  let visible = 0;
  cards.forEach(card => { card.hidden = category !== 'all' && card.dataset.category !== category; if (!card.hidden) visible++; });
  count.textContent = visible + ' / ' + cards.length + ' ảnh';
}));
</script>
</body>
</html>
`;
}

export async function writeGallery(directory = evidenceDirectory) {
  const filenames = await collectEvidenceFiles(directory);
  const html = renderGallery(filenames);
  const imageSources = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(match => decodeURIComponent(match[1]));
  if (imageSources.length !== filenames.length || imageSources.some((filename, index) => filename !== filenames[index])) {
    throw new Error('Danh sách ảnh trong HTML không khớp các tệp bằng chứng.');
  }
  for (const filename of imageSources) {
    if (!(await stat(join(directory, filename))).isFile()) throw new Error(`Ảnh không tồn tại: ${filename}`);
  }
  if (!html.startsWith('<!doctype html>') || !html.includes('<html lang="vi">') || !html.includes('href="REPORT.md"')) {
    throw new Error('HTML thiếu cấu trúc hoặc đường dẫn báo cáo bắt buộc.');
  }
  const outputPath = join(directory, 'gallery.html');
  await writeFile(outputPath, html, 'utf8');
  return { outputPath, imageCount: filenames.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await writeGallery();
  process.stdout.write(`Đã tạo ${result.outputPath} (${result.imageCount} ảnh JPG).\n`);
}

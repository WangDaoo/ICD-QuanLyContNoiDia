"""Generate the high-level ICD entity class diagram from schema-checked names."""

from pathlib import Path
from xml.sax.saxutils import escape


HERE = Path(__file__).resolve().parent
SCHEMA = HERE.parents[2] / "apps/api/prisma/schema.prisma"
SOURCE = SCHEMA.read_text(encoding="utf-8")

# Only the principal domain entities appear here. Attributes use Prisma field names.
ROWS = [
    ("IcdSite", 120, 270, ["id: String", "code: String", "name: String"]),
    ("User", 1010, 270, ["id: String", "icdId: String", "email: String"]),
    ("UserRole", 1900, 270, ["userId: String", "roleId: String"]),
    ("Role", 2790, 270, ["id: String", "code: String"]),
    ("Manifest", 120, 710, ["id: String", "manifestNo: String", "status: ManifestStatus"]),
    ("MasterBl", 1010, 710, ["id: String", "manifestId: String", "mblNumber: String"]),
    ("HouseBl", 1900, 710, ["id: String", "masterBlId: String", "hblNumber: String"]),
    ("Container", 2790, 710, ["id: String", "containerNumber: String", "type: ContainerType"]),
    ("ContainerVisit", 1910, 1150, ["id: String", "containerId: String", "state: ContainerVisitStatus", "gateInAt: DateTime?", "gateOutAt: DateTime?"]),
    ("MovementOrder", 120, 1700, ["id: String", "containerVisitId: String", "status: MovementOrderStatus"]),
    ("TruckVisit", 1010, 1700, ["id: String", "visitCode: String", "status: TruckVisitStatus"]),
    ("ContainerReception", 1900, 1700, ["id: String", "containerVisitId: String", "receivedAt: DateTime"]),
    ("YardBlock", 2790, 1700, ["id: String", "code: String"]),
    ("YardSlot", 3680, 1700, ["id: String", "yardBlockId: String", "slotCode: String?"]),
    ("YardMovement", 120, 2190, ["id: String", "containerVisitId: String", "status: YardMovementStatus"]),
    ("ContainerInspection", 1010, 2190, ["id: String", "containerVisitId: String", "result: ContainerInspectionResult?"]),
    ("InYardBooking", 1900, 2190, ["id: String", "containerVisitId: String", "scheduledAt: DateTime"]),
    ("OperationalHold", 2790, 2190, ["id: String", "containerVisitId: String", "status: OperationalHoldStatus"]),
    ("GatePass", 3680, 2190, ["id: String", "containerVisitId: String", "status: GatePassStatus"]),
    ("ServiceOrder", 120, 2690, ["id: String", "containerVisitId: String", "totalAmount: Decimal"]),
    ("Invoice", 1010, 2690, ["id: String", "serviceOrderId: String", "status: InvoiceStatus"]),
    ("PaymentAllocation", 1900, 2690, ["paymentId: String", "invoiceId: String", "amount: Decimal"]),
    ("Payment", 2790, 2690, ["id: String", "paymentRef: String", "amount: Decimal"]),
    ("TransportHandover", 3680, 2690, ["id: String", "containerVisitId: String", "status: TransportHandoverStatus"]),
]

W, H, NW, NH = 4550, 3280, 735, 260
INK, BLUE, LINE = "#222222", "#C0E4FF", "#647782"
NODES = {name: (x, y, NW, 315 if name == "ContainerVisit" else NH) for name, x, y, _ in ROWS}
assert len(NODES) == len(ROWS)
for name, _, _, attrs in ROWS:
    assert f"model {name} {{" in SOURCE, name
    section = SOURCE.split(f"model {name} {{", 1)[1].split("\n}", 1)[0]
    for attr in attrs:
        assert attr.replace(":", " ").split()[0] in section, (name, attr)

svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
    '<rect width="100%" height="100%" fill="white"/>',
    f'<text x="{W//2}" y="95" text-anchor="middle" font-family="Arial" font-size="66" font-weight="700" fill="{INK}">Biểu đồ lớp thực thể tổng quát của hệ thống ICD</text>',
]
cardinality_labels = []


def edge(a: str, b: str, a_side: str = "right", b_side: str = "left",
         cards: tuple[str, str] = ("1", "0..*")) -> None:
    ax, ay, aw, ah = NODES[a]
    bx, by, bw, bh = NODES[b]
    points = {
        "left": lambda x, y, w, h: (x, y + h / 2),
        "right": lambda x, y, w, h: (x + w, y + h / 2),
        "top": lambda x, y, w, h: (x + w / 2, y),
        "bottom": lambda x, y, w, h: (x + w / 2, y + h),
    }
    x1, y1 = points[a_side](ax, ay, aw, ah)
    x2, y2 = points[b_side](bx, by, bw, bh)
    svg.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{LINE}" stroke-width="3.2"/>')
    for t, value in ((0.13, cards[0]), (0.87, cards[1])):
        lx = x1 + (x2 - x1) * t
        ly = y1 + (y2 - y1) * t - 17
        cardinality_labels.append((lx, ly, value))


# Show the backbone only. Other links are visible through the FK fields in each class.
for args in [
    ("IcdSite", "User", "right", "left"),
    ("User", "UserRole", "right", "left"),
    ("UserRole", "Role", "right", "left", ("0..*", "1")),
    ("IcdSite", "Manifest", "bottom", "top"),
    ("Manifest", "MasterBl", "right", "left"),
    ("MasterBl", "HouseBl", "right", "left"),
    ("HouseBl", "ContainerVisit", "bottom", "top", ("0..1", "0..*")),
    ("Container", "ContainerVisit", "bottom", "top"),
    ("ContainerVisit", "MovementOrder", "left", "top"),
    ("ContainerVisit", "ContainerReception", "bottom", "top", ("1", "0..1")),
    ("TruckVisit", "ContainerReception", "right", "left", ("0..1", "0..*")),
    ("YardBlock", "YardSlot", "right", "left"),
    ("ServiceOrder", "Invoice", "right", "left", ("1", "0..1")),
    ("Invoice", "PaymentAllocation", "right", "left"),
    ("Payment", "PaymentAllocation", "left", "right"),
]:
    edge(*args)

for name, x, y, attrs in ROWS:
    _, _, w, h = NODES[name]
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="white" stroke="{INK}" stroke-width="4"/>')
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="82" fill="{BLUE}" stroke="{INK}" stroke-width="4"/>')
    svg.append(f'<text x="{x+w/2}" y="{y+56}" text-anchor="middle" font-family="Arial" font-size="43" font-weight="700" fill="{INK}">{escape(name)}</text>')
    for index, attr in enumerate(attrs):
        prefix = "+ " if attr.startswith("id:") else "  "
        svg.append(f'<text x="{x+34}" y="{y+122+index*42}" font-family="Arial" font-size="31" fill="{INK}">{escape(prefix+attr)}</text>')

for lx, ly, value in cardinality_labels:
    label_width = max(32, len(value) * 20)
    svg.append(f'<rect x="{lx-label_width/2:.0f}" y="{ly-28:.0f}" width="{label_width}" height="36" fill="white"/>')
    svg.append(f'<text x="{lx:.0f}" y="{ly:.0f}" text-anchor="middle" font-family="Arial" font-size="30" fill="{INK}">{value}</text>')

svg.append(f'<text x="{W//2}" y="3140" text-anchor="middle" font-family="Arial" font-size="36" fill="{LINE}">Sơ đồ rút gọn theo Prisma schema; đường nối thể hiện quan hệ chính.</text>')
svg.append(f'<text x="{W//2}" y="3190" text-anchor="middle" font-family="Arial" font-size="34" fill="{LINE}">Các trường containerVisitId và khóa ngoại còn lại biểu thị liên kết được lược bớt để giữ hình dễ đọc.</text>')
svg.append('</svg>')
HERE.mkdir(parents=True, exist_ok=True)
(HERE / "icd-entity-class-overview.svg").write_text("\n".join(svg), encoding="utf-8")

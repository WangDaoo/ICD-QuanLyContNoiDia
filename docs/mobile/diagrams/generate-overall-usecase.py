"""Render the 17 documented ICD Mobile use cases as an editable UML diagram."""

from __future__ import annotations

import ast
from pathlib import Path
from xml.sax.saxutils import escape


HERE = Path(__file__).resolve().parent
SOURCE = HERE.parents[2] / "test-artifacts/2026-10-08-mobile-report/build_usecases.py"
TREE = ast.parse(SOURCE.read_text(encoding="utf-8"))
CASE_NODES = next(
    node.value.elts
    for node in TREE.body
    if isinstance(node, ast.Assign)
    and any(isinstance(target, ast.Name) and target.id == "CASES" for target in node.targets)
)
assert len(CASE_NODES) == 17
TITLES = [
    ast.literal_eval(next(keyword.value for keyword in call.keywords if keyword.arg == "title"))
    for call in CASE_NODES
]

WIDTH = 3000
HEIGHT = 4780
BOUNDARY_X = 690
ELLIPSE_X = 1870
ELLIPSE_RX = 900
ELLIPSE_RY = 86
INK = "#222222"
BLUE = "#C0E4FF"
MUTED = "#5C6870"

groups = [
    ("DÙNG CHUNG THEO QUYỀN", "Nhân viên ICD", [1, 13, 14, 15, 16]),
    ("NGHIỆP VỤ CỔNG", "Nhân viên cổng", [2, 3, 4, 5]),
    ("BÃI, GIÁM ĐỊNH VÀ BOOKING", "Nhân viên bãi", [6, 7, 8, 9, 10, 11, 12]),
    ("GIÁM SÁT", "Điều độ / Quản lý", [17]),
]

parts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">',
    '<rect width="100%" height="100%" fill="#FFFFFF"/>',
    f'<rect x="{BOUNDARY_X}" y="105" width="2250" height="4570" fill="none" stroke="{INK}" stroke-width="5"/>',
    f'<text x="1815" y="190" text-anchor="middle" font-family="Arial" font-size="63" font-weight="700" fill="{INK}">Hệ thống ICD trên ứng dụng Mobile — 17 ca sử dụng</text>',
]


def line(x1: int, y1: int, x2: int, y2: int, width: int = 4) -> None:
    parts.append(
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="{width}"/>'
    )


def label(x: int, y: int, value: str, size: int, *, bold: bool = False,
          anchor: str = "middle", color: str = INK) -> None:
    parts.append(
        f'<text x="{x}" y="{y}" text-anchor="{anchor}" dominant-baseline="middle" '
        f'font-family="Arial" font-size="{size}" font-weight="{700 if bold else 400}" '
        f'fill="{color}">{escape(value)}</text>'
    )


def actor(y: int, caption: str) -> None:
    x = 345
    top = y - 120
    parts.append(f'<circle cx="{x}" cy="{top}" r="29" fill="white" stroke="{INK}" stroke-width="5"/>')
    line(x, top + 31, x, top + 125, 5)
    line(x - 67, top + 75, x + 67, top + 75, 5)
    line(x, top + 125, x - 64, top + 205, 5)
    line(x, top + 125, x + 64, top + 205, 5)
    label(x, top + 264, caption, 45)


cursor = 270
for heading, role, numbers in groups:
    section_top = cursor
    label(790, section_top + 5, heading, 42, bold=True, anchor="start", color=MUTED)
    first_y = section_top + 125
    ys = [first_y + 220 * index for index in range(len(numbers))]
    actor_y = (ys[0] + ys[-1]) // 2
    actor(actor_y, role)
    for number, y in zip(numbers, ys):
        line(412, actor_y - 45, ELLIPSE_X - ELLIPSE_RX, y)
        parts.append(
            f'<ellipse cx="{ELLIPSE_X}" cy="{y}" rx="{ELLIPSE_RX}" ry="{ELLIPSE_RY}" '
            f'fill="{BLUE}" stroke="{INK}" stroke-width="5"/>'
        )
        title = TITLES[number - 1]
        label(ELLIPSE_X, y - 25, f"UC{number:02d}", 43, bold=True)
        label(ELLIPSE_X, y + 35, title, 53)
    cursor = ys[-1] + 190
    if numbers != [17]:
        line(740, cursor - 72, 2900, cursor - 72, 2)

label(1815, 4630, "UC13 và UC14 chỉ hiển thị khi tài khoản có quyền đọc hoặc quyền nhiệm vụ tương ứng.", 35, color=MUTED)
parts.append("</svg>")
HERE.mkdir(parents=True, exist_ok=True)
(HERE / "UC-tong-quat-chi-tiet.svg").write_text("\n".join(parts), encoding="utf-8")

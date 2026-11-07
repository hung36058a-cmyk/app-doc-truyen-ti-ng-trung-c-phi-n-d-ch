"""
build-data.py — Tạo file dữ liệu từ điển gọn cho app (chạy 1 lần khi cập nhật từ điển).

Đầu vào:
  - CC-CEDICT dạng JSON (gói npm cedict-json), giấy phép CC BY-SA 4.0
  - Unihan (trường kVietnamese) từ gói npm cjk-unihan
Đầu ra (public/data/):
  - cedict.tsv   : mỗi dòng "từ_phồn_thể<TAB>pinyin_số<TAB>nghĩa1 / nghĩa2"
                   (một từ nhiều cách đọc -> nhiều dòng)
  - hanviet.tsv  : mỗi dòng "chữ<TAB>âm1,âm2"

Cách chạy:
  python3 scripts/build-data.py <đường_dẫn_cedict.json> <đường_dẫn_unihan.db>
"""
import json
import sqlite3
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "data"


def build_cedict(src: str) -> int:
    entries = json.load(open(src, encoding="utf-8"))
    lines = []
    for e in entries:
        trad = e["traditional"].strip()
        defs = [d.replace("\t", " ") for d in e["english"] if d.strip()]
        if not trad or not defs:
            continue
        lines.append(f'{trad}\t{e["pinyin"]}\t{" / ".join(defs)}')
    (OUT / "cedict.tsv").write_text("\n".join(lines), encoding="utf-8")
    return len(lines)


def build_hanviet(src: str) -> int:
    con = sqlite3.connect(src)
    rows = con.execute(
        "select character, kVietnamese from unihan "
        "where kVietnamese is not null and kVietnamese != ''"
    ).fetchall()
    lines = []
    for ch, vi in rows:
        # Một số chữ ngoài BMP được lưu dạng "\x{2A0A0}" -> đổi về ký tự thật
        if ch.startswith("\\x{"):
            ch = chr(int(ch[3:-1], 16))
        readings = [r.strip() for r in vi.split() if r.strip()]
        if readings:
            lines.append(f"{ch}\t{','.join(dict.fromkeys(readings))}")
    (OUT / "hanviet.tsv").write_text("\n".join(lines), encoding="utf-8")
    return len(lines)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    print("cedict lines:", build_cedict(sys.argv[1]))
    print("hanviet chars:", build_hanviet(sys.argv[2]))

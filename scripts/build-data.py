"""
build-data.py — Tạo file dữ liệu từ điển gọn cho app (chạy 1 lần khi cập nhật từ điển).

Đầu vào:
  - CC-CEDICT dạng JSON (gói npm cedict-json), giấy phép CC BY-SA 4.0
Đầu ra (public/data/):
  - cedict.tsv   : mỗi dòng "từ_phồn_thể<TAB>pinyin_số<TAB>nghĩa1 / nghĩa2"
                   (một từ nhiều cách đọc -> nhiều dòng)
  (hanviet-v2.tsv giờ do scripts/build-hanviet.py tạo — KHÔNG dùng Unihan kVietnamese vì đó là âm Nôm)

Cách chạy:
  python3 scripts/build-data.py <đường_dẫn_cedict.json>
"""
import json
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


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    print("cedict lines:", build_cedict(sys.argv[1]))

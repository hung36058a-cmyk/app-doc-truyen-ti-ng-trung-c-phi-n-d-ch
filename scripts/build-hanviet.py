"""
build-hanviet.py — Tạo public/data/hanviet-v2.tsv (âm Hán Việt) cho app.

Nguồn: ph0ngp/hanviet-pinyin-wordlist (MIT) — https://github.com/ph0ngp/hanviet-pinyin-wordlist
  Tổng hợp từ Thiều Chửu, Trần Văn Chánh, Đặng Thế Kiệt, Nguyễn Quốc Hùng, hvdic.thivien.net.
  Âm Hán Việt được gắn theo từng cách đọc pinyin (中 zhong1 = trung, zhong4 = trúng).
  (Bản cũ dùng Unihan kVietnamese, nhưng trường đó chủ yếu là âm NÔM: 你=nể, 鏡=kẻng, 馭=ngựa → sai.)

Đầu ra: mỗi dòng "chữ<TAB>pinyin_số<TAB>âm1,âm2"  (pinyin "*" = dùng cho mọi cách đọc)
  Chỉ có chữ phồn thể: truyện giản thể đã được app đổi sang phồn thể trước khi đọc.

Cách chạy:
  python3 scripts/build-hanviet.py <đường_dẫn_hanviet.csv>
"""
import ast
import csv
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "data"


import unicodedata

TONES = "\u0300\u0301\u0303\u0309\u0323"  # huyền sắc ngã hỏi nặng


def new_style(syl: str) -> str:
    """Đặt dấu thanh kiểu mới như Hanzii: hoà→hòa, khoẻ→khỏe, tuỵ→tụy (quý, gì giữ nguyên)."""
    d = unicodedata.normalize("NFD", syl)
    tone = next((c for c in d if c in TONES), "")
    base = "".join(c for c in d if c not in TONES)
    b = unicodedata.normalize("NFC", base)
    if tone and b[-2:] in ("oa", "oe", "uy") and not b.endswith(("qua", "que", "quy")):
        i = len(base) - len(unicodedata.normalize("NFD", b[-1])) - 1  # vị trí o/u trong chuỗi NFD
        return unicodedata.normalize("NFC", base[: i + 1] + tone + base[i + 1 :])
    return syl


def main(src: str) -> None:
    rows: dict[str, list[tuple[str, list[str]]]] = {}
    with open(src, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            readings = [new_style(x.strip()) for x in ast.literal_eval(r["hanviet"]) if x.strip()]
            if r["char"] and readings:
                rows.setdefault(r["char"], []).append((r["pinyin"].strip().lower(), readings))

    lines = [f"{ch}\t{py}\t{','.join(rd)}" for ch, lst in rows.items() for py, rd in lst]
    (OUT / "hanviet-v2.tsv").write_text("\n".join(lines), encoding="utf-8")
    print("hanviet chars:", len(rows), "lines:", len(lines))


if __name__ == "__main__":
    main(sys.argv[1])

"""
build-hanviet.py — Tạo public/data/hanviet.tsv: âm Hán Việt CHUẨN theo từng cách đọc pinyin.

Nguồn: gói npm "hanviet-pinyin-words" (Phong Phan, giấy phép MIT,
https://github.com/ph0ngp/hanviet-pinyin-words), file src/hanvietData.js.
(Bản cũ dùng Unihan kVietnamese: trộn cả âm Nôm nên sai nhiều, vd 看 = "trầu", 你 = "nể", 們 = "món".)

Đầu ra: mỗi dòng "chữ<TAB>pinyin_số:âm1,âm2;pinyin_số:âm"
  - pinyin "*" = âm dùng cho mọi cách đọc, vd "我\t*:ngã"
  - chữ đa âm, vd "行\thang2:hàng,hạng;xing2:hành,hạnh;heng2:hạnh"

Cách chạy (không chạy code của gói, chỉ đọc dữ liệu JSON trong file):
  npm pack hanviet-pinyin-words && tar xzf hanviet-pinyin-words-*.tgz
  python3 scripts/build-hanviet.py package/src/hanvietData.js
"""
import json
import sys
import unicodedata
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "hanviet.tsv"


TONE_MARKS = "\u0300\u0301\u0303\u0309\u0323"  # huyền, sắc, ngã, hỏi, nặng


def new_style(syl: str) -> str:
    """Đặt dấu kiểu mới (phổ biến hiện nay): hoà -> hòa, thuỵ -> thụy, khoẻ -> khỏe. Giữ nguyên quý, quà."""
    d = unicodedata.normalize("NFD", syl)
    tone = next((c for c in d if c in TONE_MARKS), "")
    if not tone:
        return syl
    bare = d.replace(tone, "")
    plain = unicodedata.normalize("NFC", bare)
    if plain.startswith(("qu", "gi")) or not plain.endswith(("oa", "oe", "uy")):
        return syl
    # bỏ dấu ra rồi đặt lại vào nguyên âm áp chót (o / u)
    base = unicodedata.normalize("NFD", plain)
    i = len(base) - 1
    while i >= 0 and not base[i].isalpha():
        i -= 1
    i -= 1  # nguyên âm áp chót
    while i >= 0 and not base[i].isalpha():
        i -= 1
    j = i + 1
    while j < len(base) and unicodedata.combining(base[j]):
        j += 1
    return unicodedata.normalize("NFC", base[:j] + tone + base[j:])


def main(src: str) -> None:
    text = Path(src).read_text(encoding="utf-8")
    data = json.loads(text[text.index("{") : text.rindex("}") + 1])
    lines = []
    for ch, by_pinyin in data.items():
        parts = []
        for py, readings in by_pinyin.items():
            readings = [new_style(r.strip().lower()) for r in readings if r.strip()]
            if readings:
                parts.append(f"{py.lower()}:{','.join(dict.fromkeys(readings))}")
        if parts:
            lines.append(f"{ch}\t{';'.join(parts)}")
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print("hanviet chars:", len(lines))


if __name__ == "__main__":
    main(sys.argv[1])

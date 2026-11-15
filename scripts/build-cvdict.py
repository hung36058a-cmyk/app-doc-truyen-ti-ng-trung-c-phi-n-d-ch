"""
build-cvdict.py — Thêm nghĩa TIẾNG VIỆT (từ điển CVDICT) vào public/data/cedict.tsv thành cột thứ 4.

CVDICT (https://github.com/ph0ngp/CVDICT, tác giả Phong Phan, giấy phép CC BY-SA 4.0) là bản dịch tiếng Việt
của CC-CEDICT, cùng định dạng: "phồn_thể giản_thể [pinyin] /nghĩa1/nghĩa2/".
Ghép theo (chữ phồn thể, pinyin) để mỗi cách đọc nhận đúng nghĩa Việt của nó.
Từ có trong CVDICT mà không có trong cedict.tsv cũng được thêm vào (cột nghĩa Anh để trống).

Đầu ra: cedict.tsv, mỗi dòng "từ<TAB>pinyin_số<TAB>nghĩa Anh (cách nhau ' / ')<TAB>nghĩa Việt (cách nhau ' / ')"

Cách chạy (chạy lại an toàn, cột 4 cũ bị ghi đè):
  python3 scripts/build-cvdict.py <đường_dẫn_CVDICT.u8>
"""
import re
import sys
from pathlib import Path

TSV = Path(__file__).resolve().parent.parent / "public" / "data" / "cedict.tsv"
LINE = re.compile(r"^(\S+) (\S+) \[([^\]]*)\] /(.*)/\s*$")


def main(src: str) -> None:
    vi: dict[tuple[str, str], list[str]] = {}
    order: list[tuple[str, str]] = []
    for raw in open(src, encoding="utf-8"):
        if raw.startswith("#"):
            continue
        m = LINE.match(raw.rstrip("\n"))
        if not m:
            continue
        trad, _simp, pinyin, defs = m.groups()
        key = (trad, pinyin)
        items = [d.strip().replace("\t", " ") for d in defs.split("/") if d.strip()]
        if key not in vi:
            order.append(key)
            vi[key] = []
        vi[key].extend(x for x in items if x not in vi[key])

    out, seen, matched = [], set(), 0
    for line in TSV.read_text(encoding="utf-8").split("\n"):
        cols = line.split("\t")
        if len(cols) < 3:
            continue
        word, pinyin, en = cols[0], cols[1], cols[2]
        key = (word, pinyin)
        seen.add(key)
        v = vi.get(key, [])
        matched += bool(v)
        out.append(f"{word}\t{pinyin}\t{en}\t{' / '.join(v)}")
    added = 0
    for key in order:
        if key not in seen:
            out.append(f"{key[0]}\t{key[1]}\t\t{' / '.join(vi[key])}")
            added += 1
    TSV.write_text("\n".join(out), encoding="utf-8")
    print(f"lines: {len(out)}, with Vietnamese: {matched + added}, added from CVDICT only: {added}")


if __name__ == "__main__":
    main(sys.argv[1])

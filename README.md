# Đọc Truyện

App đọc truyện tiếng Trung phồn thể trên điện thoại: tải EPUB, chạm từ để tra (pinyin, Hán Việt, nghĩa Việt/Anh), bấm giữ đoạn để dịch, lưu từ và xuất thẻ Anki (.apkg).

Cài lên điện thoại: mở trang GitHub Pages của repo bằng Chrome → menu ⋮ → **Cài đặt ứng dụng**.

## Cấu trúc code

| Thư mục | Nhiệm vụ |
|---|---|
| `src/core` | Kiểu dữ liệu và giá trị mặc định |
| `src/modules/epub` | Đọc file EPUB, cắt chương theo mục lục |
| `src/modules/segmenter` | Tách từ tiếng Trung |
| `src/modules/dictionary` | Từ điển offline: CC-CEDICT + nghĩa Việt CVDICT + Hán Việt theo pinyin (hanviet-pinyin-words) |
| `src/modules/ai` | Nhà cung cấp AI (Claude trên claude.ai, Claude API) và prompt |
| `src/modules/storage` | Lưu trữ IndexedDB (Dexie) |
| `src/modules/anki` | Tạo file .apkg |
| `src/services` | Ghép các module; `container.ts` là nơi duy nhất nối chúng |
| `src/ui` | Giao diện (Preact) |

## Lệnh

- `npm run dev` chạy thử trên máy
- `npm run build:web` build bản app (PWA) vào `dist/`
- `npm run build` build thêm bản một trang cho artifact claude.ai vào `artifact/`
- `python3 scripts/build-data.py <cedict.json> <unihan.db>` tạo lại cedict.tsv trong `public/data/` (phần hanviet.tsv của script này đã bỏ, dùng script dưới)
- `python3 scripts/build-hanviet.py <hanvietData.js>` tạo lại `public/data/hanviet.tsv` (âm Hán Việt theo pinyin)

## Dữ liệu và giấy phép

- CC-CEDICT (MDBG), giấy phép CC BY-SA 4.0
- CVDICT (Phong Phan, https://github.com/ph0ngp/CVDICT), giấy phép CC BY-SA 4.0 — nghĩa tiếng Việt, ghép vào cột 4 của `public/data/cedict.tsv` bằng `scripts/build-cvdict.py`
- hanviet-pinyin-words (Phong Phan, https://github.com/ph0ngp/hanviet-pinyin-words), giấy phép MIT — âm Hán Việt theo pinyin, `public/data/hanviet.tsv` (thay cho Unihan kVietnamese từ v4.5)

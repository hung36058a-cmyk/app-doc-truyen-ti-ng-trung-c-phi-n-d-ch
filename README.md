# Đọc Truyện

App đọc truyện tiếng Trung phồn thể trên điện thoại: tải EPUB, chạm từ để tra (pinyin, Hán Việt, nghĩa Việt/Anh), bấm giữ đoạn để dịch, lưu từ và xuất thẻ Anki (.apkg).

Cài lên điện thoại: mở trang GitHub Pages của repo bằng Chrome → menu ⋮ → **Cài đặt ứng dụng**.

## Cấu trúc code

| Thư mục | Nhiệm vụ |
|---|---|
| `src/core` | Kiểu dữ liệu và giá trị mặc định |
| `src/modules/epub` | Đọc file EPUB, cắt chương theo mục lục |
| `src/modules/segmenter` | Tách từ tiếng Trung |
| `src/modules/dictionary` | Từ điển offline: CC-CEDICT + Hán Việt (Unihan) |
| `src/modules/ai` | Nhà cung cấp AI (Claude trên claude.ai, Claude API) và prompt |
| `src/modules/storage` | Lưu trữ IndexedDB (Dexie) |
| `src/modules/anki` | Tạo file .apkg |
| `src/services` | Ghép các module; `container.ts` là nơi duy nhất nối chúng |
| `src/ui` | Giao diện (Preact) |

## Lệnh

- `npm run dev` chạy thử trên máy
- `npm run build:web` build bản app (PWA) vào `dist/`
- `npm run build` build thêm bản một trang cho artifact claude.ai vào `artifact/`
- `python3 scripts/build-data.py <cedict.json> <unihan.db>` tạo lại dữ liệu từ điển trong `public/data/`

## Dữ liệu và giấy phép

- CC-CEDICT (MDBG), giấy phép CC BY-SA 4.0
- Unihan Database (Unicode), trường kVietnamese, giấy phép Unicode

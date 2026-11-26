# App Đọc Truyện — ký ức chung cho mọi phiên Claude (chat, Claude Code)

Đọc file này + `NHAT-KY.md` (chỉ 10 dòng đầu) trước khi làm. Xong việc: thêm 1 dòng lên đầu `NHAT-KY.md`.

## App là gì
PWA đọc truyện tiếng Trung phồn thể cho người Việt (dùng trên Android), Preact + TypeScript + Vite, deploy GitHub Pages
(push `main` → `.github/workflows/pages.yml` tự build). Tra từ offline (CC-CEDICT + CVDICT), Hán Việt, AI Gemini/Claude
dịch câu, lưu từ → xuất Anki .txt. Người dùng trao đổi bằng tiếng Việt, không biết code.

## Quy tắc làm việc
- Code dễ sửa, dễ tách module trước; chạy được là thứ hai. Module chỉ nối nhau trong `src/services/container.ts`.
- Sau khi sửa: cho 1 agent riêng soát code, sửa theo, `npx tsc --noEmit` + `npm run build` sạch rồi mới push.
- Phát hành: thêm mục đầu `src/core/changelog.ts` (tiếng Việt, dễ hiểu), tăng `version` trong `package.json`,
  tăng `VERSION` trong `public/sw.js`. Đổi file dữ liệu trong `public/data` thì đổi tên file (vd `-v3`) để điện thoại không dùng bản cũ.
- Giao diện mới: tham khảo app khác → đề xuất → người dùng duyệt rồi mới làm. Không tự làm frontend.
- "xuất toàn bộ dự án" = gửi file dự án + báo cáo đầy đủ cho một AI mới không có ngữ cảnh.

## Quyết định đã chốt (đừng làm ngược)
- Giao diện "Đêm xanh" (nền navy, nhấn vàng); logo = cuốn sách mở.
- Cuộn tay hoàn toàn; menu trên ẩn, chỉ hiện khi chạm giữa trang. Vuốt back lùi từng lớp, không thoát app.
- Bấm giữ: chọn cả vế câu quanh chữ (giữa các dấu câu), chỉnh bằng 2 con trỏ; không rung.
- Bấm từ: hiện cả cụm (thành ngữ/cụm cố định) + từ nhỏ bên dưới; từ loại viết tắt tiếng Anh (N, V, ADJ), cụm ghi "cụm danh từ"…
- Hộp dịch câu chỉ hiện nghĩa Việt, không Hán Việt. Dịch: chính xác hơn nhưng vẫn nhanh, chấp nhận API đắt hơn chút.
- Key Gemini miễn phí dùng trước, key trả phí dự phòng; nút "Nâng cao" nằm trong popup.
- Hán Việt: `public/data/hanviet-v2.tsv` từ ph0ngp/hanviet-pinyin-wordlist (Thiều Chửu…), tạo bằng `scripts/build-hanviet.py`.
  KHÔNG dùng Unihan kVietnamese (đó là âm Nôm: 你=nể, sai). Chữ nhiều âm chọn theo pinyin.
- Thẻ Anki: mặt trước = từ; mặt sau = pinyin + Hán Việt + nghĩa Việt, nghĩa Anh + từ loại, câu gốc rồi câu ví dụ B2+ (không dịch), mẫu câu, so sánh từ gần nghĩa.

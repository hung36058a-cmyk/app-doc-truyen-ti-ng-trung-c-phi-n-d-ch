// core/changelog.ts — Lịch sử phiên bản app. Mỗi lần phát hành bản mới: thêm một mục lên ĐẦU danh sách
// (và tăng "version" trong package.json cho khớp). Mục đầu tiên là phiên bản hiện tại.

export interface Release {
  version: string;
  date: string; // ngày phát hành, dạng dd/mm/yyyy
  notes: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '0.7',
    date: '08/11/2026',
    notes: [
      'Xuất thẻ ra file .txt, import thẳng vào note type Cơ bản (Basic) của Anki',
      'Nút đưa cả lần xuất gần nhất về Chưa xuất để xuất lại',
      'Mục lục: chương chỉ có số được ghép tên phần; trang 目錄 bấm được',
      'Sửa khung chọn câu bị đè chữ khi câu dài',
      'Hiện phiên bản app trong Cài đặt',
    ],
  },
  {
    version: '0.6',
    date: '08/11/2026',
    notes: [
      'Chế độ AI: Tiết kiệm / Chất lượng cao',
      'Nhiều API key xếp theo thứ tự ưu tiên, hết lượt hoặc hết tiền thì tự chuyển key',
      'Bấm giữ đoạn để chọn từng câu muốn dịch',
      'Nhận key Gemini dạng mới (AQ.…)',
    ],
  },
  { version: '0.5', date: '08/11/2026', notes: ['Thêm Gemini làm nhà cung cấp AI (có gói miễn phí)', 'Báo rõ lỗi hết tiền nạp trước (402)'] },
  {
    version: '0.4',
    date: '08/11/2026',
    notes: ['Cài được lên màn hình chính điện thoại (PWA), dùng được khi không có mạng', 'Sửa không chọn được file EPUB trên Android'],
  },
  { version: '0.3', date: '08/11/2026', notes: ['Sổ từ: AI tạo nội dung thẻ, sửa thẻ, tạo lại', 'Xuất thẻ sang Anki (.apkg)'] },
  {
    version: '0.2',
    date: '07/11/2026',
    notes: ['Bấm giữ đoạn để dịch', 'Thanh chỉnh hiển thị: cỡ chữ, dòng, đoạn, lề, font, màu nền', 'Cắt chương EPUB theo mục lục'],
  },
  { version: '0.1', date: '07/11/2026', notes: ['Thư viện, đọc EPUB, chạm từ để tra pinyin, Hán Việt, nghĩa Việt/Anh, lưu từ'] },
];

export const APP_VERSION = CHANGELOG[0].version;

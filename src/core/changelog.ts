// core/changelog.ts — Lịch sử phiên bản app. Mỗi lần phát hành bản mới: thêm một mục lên ĐẦU danh sách
// (và tăng "version" trong package.json cho khớp). Mục đầu tiên là phiên bản hiện tại.

export interface Release {
  version: string;
  date: string; // ngày phát hành, dạng dd/mm/yyyy
  notes: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '2.0',
    date: '09/11/2026',
    notes: [
      'Logo mới: quyển sách mở, trang phải là bản dịch có từ tô vàng',
      'Thư viện: thẻ "Đọc tiếp" ghi số từ đã lưu từ truyện đó; chip lọc Tất cả / Đang đọc / Chưa đọc / Xong; bìa tự tạo đẹp hơn (chữ đầu tên truyện cỡ lớn, 6 màu)',
      'Trang đọc toàn màn hình: cuộn xuống tự ẩn thanh tiêu đề, chạm giữa trang để hiện/ẩn; chạm mép trái/phải để lật trang (tắt được trong Aa)',
      'Chạm một từ: hiện bong bóng nghĩa nhỏ ngay cạnh từ (Lưu, Nghe, Chi tiết) thay vì bảng che nửa màn hình',
      'Từ đã tra nhưng chưa lưu có gạch chân chấm; từ đã lưu vẫn tô vàng',
      'Cuối chương có thẻ tổng kết: các từ đã lưu trong chương, nút lớn sang chương sau',
      'Sổ từ: nhóm theo truyện, thẻ xuất Anki nằm ngay đầu kèm số thẻ đang chờ',
    ],
  },
  {
    version: '1.1',
    date: '08/11/2026',
    notes: [
      'Đầu mỗi chương có thêm nút Chương trước / Chương sau (cuối chương vẫn giữ)',
      'Tiêu đề chương bấm giữ để bôi đen, chép được',
      'Thanh tiến độ sát mép dưới trang đọc giống Moon Reader: pin + giờ, "Chương X (trang a/b)", % đã đọc cả cuốn',
      'Số phiên bản chỉ hiện ở các màn hình ngoài, không còn hiện trong trang đọc',
    ],
  },
  {
    version: '1.0',
    date: '08/11/2026',
    notes: [
      'Dịch câu: AI viết luôn dòng Hán Việt của cả câu, chọn đúng âm theo nghĩa (cùng một lần gọi với bản dịch)',
      'Số phiên bản hiện nhỏ ở góc dưới màn hình',
    ],
  },
  {
    version: '0.9',
    date: '08/11/2026',
    notes: [
      'Bấm giữ một chữ: tô sáng đúng câu đó và dịch ngay cả câu',
      'Khung dịch câu: từng từ trong câu (chạm để tra), pinyin và Hán Việt cả câu, nút câu trước / câu sau',
      'Nút "Dịch cả đoạn" trong khung dịch câu (thay cho chọn nhiều câu)',
    ],
  },
  {
    version: '0.8',
    date: '08/11/2026',
    notes: [
      'Thẻ Anki: câu ví dụ không còn kèm nghĩa tiếng Việt',
      'Phân biệt từ gần nghĩa: mỗi từ một dòng (thẻ cũ cũng được tách)',
      'Câu ví dụ do AI viết nâng lên trình độ B2 trở lên; câu đầu vẫn là câu gốc trong truyện',
    ],
  },
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

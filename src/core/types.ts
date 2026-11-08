// core/types.ts — Kiểu dữ liệu dùng chung giữa các module. Không chứa logic.

/** Một chương truyện đã được tách thành các đoạn văn thuần (không HTML). */
export interface Chapter {
  id: string;
  title: string;
  paragraphs: string[];
}

/** Một mục trong mục lục, trỏ tới chỉ số chương. */
export interface TocItem {
  title: string;
  chapterIndex: number;
}

/** Truyện đã phân tích xong, sẵn sàng lưu và hiển thị. */
export interface Book {
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
  toc: TocItem[];
  addedAt: number;
}

/** Thông tin rút gọn để hiện ở Thư viện (không kèm nội dung chương). */
export interface BookSummary {
  id: string;
  title: string;
  author: string;
  chapterCount: number;
  addedAt: number;
}

/** Vị trí đang đọc của một truyện. */
export interface ReadingProgress {
  bookId: string;
  chapterIndex: number;
  paragraphIndex: number;
  updatedAt: number;
}

/** Một cách đọc của từ trong từ điển (một từ có thể có nhiều cách đọc). */
export interface DictSense {
  pinyin: string; // dạng có dấu thanh, ví dụ "chēng hu"
  english: string[];
}

/** Kết quả tra từ điển offline. */
export interface DictEntry {
  word: string;
  senses: DictSense[];
  hanviet: string; // "xưng hô"; chữ không có dữ liệu được ghi là "?"
}

/** Nghĩa tiếng Việt do AI tạo, được lưu cache. */
export interface VietMeaning {
  meaning: string; // nghĩa tiếng Việt ngắn gọn
  partOfSpeech: string; // từ loại bằng tiếng Việt
  hanviet?: string; // âm Hán Việt AI bổ sung khi từ điển thiếu
}

/** Một đơn vị sau khi tách từ. isWord = false cho dấu câu, khoảng trắng, chữ Latin. */
export interface Token {
  text: string;
  isWord: boolean;
}

/** Nội dung mặt sau thẻ Anki (AI tạo, người dùng sửa được). Theo mẫu thẻ của người dùng. */
export interface CardContent {
  pinyin: string;
  hanviet: string;
  vietnamese: string; // nghĩa tiếng Việt
  english: string; // nghĩa tiếng Anh
  partOfSpeech: string; // từ loại
  sentenceVi: string; // bản dịch câu gốc trong truyện
  examples: { zh: string; vi: string }[]; // 2–3 câu ví dụ AI tạo
  patterns: string[]; // cấu trúc thường đi kèm
  comparison: string; // phân biệt với từ gần nghĩa
  generatedAt: number;
  edited?: boolean; // người dùng đã sửa tay
}

/** Từ người dùng đã lưu. */
export interface SavedWord {
  word: string; // khóa chính
  pinyin: string;
  hanviet: string;
  english: string;
  vietnamese: string;
  sentence: string; // câu gốc trong truyện
  bookId: string;
  bookTitle: string;
  chapterIndex: number;
  savedAt: number;
  exported: boolean;
  exportedAt?: number;
  card?: CardContent; // chưa có = AI chưa tạo
}

export type MeaningLang = 'vi' | 'en';
export type ThemeMode = 'system' | 'light' | 'dark';

export type ReaderFont = 'serif' | 'sans';
export type ReaderPaper = 'auto' | 'white' | 'ivory' | 'dark';

/** Cách hiển thị chữ ở trang đọc (chỉnh bằng thanh chỉnh nhanh). */
export interface ReaderDisplay {
  fontSize: number; // px
  lineHeight: number; // bội số cỡ chữ
  paraSpacing: number; // em
  margin: number; // px, lề trái/phải
  font: ReaderFont;
  paper: ReaderPaper; // 'auto' = theo giao diện sáng/tối của app
  tapPaging: boolean; // chạm mép trái/phải (chỗ không có chữ) để cuộn lên/xuống một trang
}

export type AiKeyProvider = 'gemini' | 'claude';

/** Một API key người dùng nhập. Key đứng trước được dùng trước; hết lượt / hết tiền thì chuyển key sau. */
export interface AiKey {
  id: string;
  provider: AiKeyProvider;
  label: string; // tên tự đặt, ví dụ "Miễn phí", "Trả phí"
  key: string;
}

/** Mức dịch câu/đoạn, đổi ngay trong khung dịch: save = Dịch tự động (Gemini Flash), quality = Dịch nâng cao (Gemini Pro). */
export type AiMode = 'save' | 'quality';

export interface AppSettings {
  meaningLang: MeaningLang;
  theme: ThemeMode;
  aiKeys: AiKey[]; // API key riêng, xếp theo thứ tự ưu tiên (dùng khi app chạy ngoài claude.ai)
  aiMode: AiMode;
  reader: ReaderDisplay;
  ankiDeck: string; // tên deck khi xuất thẻ
}

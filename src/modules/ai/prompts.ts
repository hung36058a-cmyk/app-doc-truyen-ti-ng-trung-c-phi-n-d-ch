// modules/ai/prompts.ts — Toàn bộ prompt gửi cho AI nằm ở đây, để chỉnh nội dung không cần đụng code khác.

export function translateParagraphPrompt(paragraph: string, target: 'vi' | 'en', context: string): string {
  const lang = target === 'vi' ? 'tiếng Việt' : 'tiếng Anh';
  return `Dịch đoạn văn trong truyện dưới đây sang ${lang} tự nhiên, sát nghĩa, giữ giọng văn và cách xưng hô hợp với nhân vật.
${context ? `Ngữ cảnh (đoạn ngay trước, KHÔNG dịch): ${context}\n` : ''}
Đoạn cần dịch:
${paragraph}

Chỉ trả về bản dịch, không thêm lời giải thích, không nhắc lại bản gốc.`;
}

export interface CardPromptInput {
  word: string;
  sentence: string; // câu gốc trong truyện
  pinyin: string;
  english: string;
  hanviet: string;
}

/** Tạo nội dung mặt sau thẻ Anki theo mẫu thẻ của người dùng (deck zhongwenB1). */
export function cardContentPrompt(w: CardPromptInput): string {
  return `Bạn soạn thẻ từ vựng Anki cho người Việt học tiếng Trung PHỒN THỂ (Đài Loan).
Từ: ${w.word}
Câu gốc trong truyện: ${w.sentence || '(không có)'}
Dữ liệu từ điển (có thể thiếu hoặc chưa sát ngữ cảnh): pinyin "${w.pinyin}", Hán Việt "${w.hanviet}", nghĩa Anh "${w.english}"

Yêu cầu:
- Chọn nghĩa đúng theo câu gốc.
- Mọi câu tiếng Trung viết bằng chữ PHỒN THỂ, tự nhiên, mỗi câu đều chứa đúng từ "${w.word}".
- "examples": 2–3 câu ví dụ trình độ B2 TRỞ LÊN (TOCFL Band C, HSK 5–6): ngữ cảnh đời sống hoặc báo chí thật,
  có cấu trúc câu phức (liên từ, mệnh đề phụ, thành ngữ…) và từ vựng nâng cao. KHÔNG viết câu ngắn, đơn giản kiểu sơ cấp.
  Chỉ viết câu tiếng Trung, KHÔNG kèm bản dịch.
- "patterns": 1–3 cấu trúc hay đi kèm, dạng "${w.word} + ..." kèm nghĩa Việt ngắn.
- "comparison": phân biệt với 1 từ gần nghĩa hay nhầm. Mảng, MỖI TỪ MỘT PHẦN TỬ, ví dụ ["稱呼 (trang trọng, cách xưng hô)", "叫 (gọi thông thường)"]. Không có từ nào hay nhầm thì để [].

Trả về DUY NHẤT một JSON, không giải thích:
{"pinyin": "pinyin có dấu thanh, các âm tiết cách nhau bằng dấu cách",
 "hanviet": "âm Hán Việt từng chữ, viết thường",
 "vietnamese": "nghĩa tiếng Việt ngắn gọn, các nghĩa cách nhau bằng dấu ;",
 "english": "nghĩa tiếng Anh ngắn gọn",
 "partOfSpeech": "từ loại bằng tiếng Việt",
 "examples": ["câu ví dụ B2+", "..."],
 "patterns": ["..."],
 "comparison": ["từ A (giải thích)", "từ B (giải thích)"]}`;
}

export function vietMeaningPrompt(word: string, sentence: string, englishHint: string): string {
  return `Bạn là từ điển Trung–Việt cho người Việt học tiếng Trung phồn thể.
Từ cần giải nghĩa: ${word}
Câu chứa từ (để chọn đúng nghĩa theo ngữ cảnh): ${sentence}
Gợi ý nghĩa tiếng Anh từ CC-CEDICT: ${englishHint || '(không có)'}

Trả về DUY NHẤT một JSON, không giải thích thêm:
{"meaning": "nghĩa tiếng Việt ngắn gọn, đúng ngữ cảnh câu trên, tối đa 15 từ",
 "partOfSpeech": "từ loại bằng tiếng Việt, ví dụ: danh từ, động từ, tính từ",
 "hanviet": "âm Hán Việt của từng chữ, cách nhau bằng dấu cách, viết thường"}`;
}

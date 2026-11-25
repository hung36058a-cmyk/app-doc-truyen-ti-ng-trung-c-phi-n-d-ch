// modules/ai/prompts.ts — Toàn bộ prompt gửi cho AI nằm ở đây, để chỉnh nội dung không cần đụng code khác.

import { POS_CODES_PHRASE, POS_CODES_WORD } from '@/services/partOfSpeech';

/**
 * Dịch NHANH một câu / một đoạn người dùng tự tô chọn: chỉ bản dịch, prompt ngắn để AI trả lời sớm nhất.
 * hanviet = âm Hán Việt CHUẨN từng chữ (từ điển offline), để AI phiên tên riêng đúng, không đoán âm.
 */
export function translateFastPrompt(text: string, target: 'vi' | 'en', context: string, hanviet = ''): string {
  if (target === 'en') {
    return `Translate this passage from a Traditional Chinese novel into natural English, faithful to the meaning in context. Return ONLY the translation.
${context ? `Previous context (do not translate): ${context}\n` : ''}Text: ${text}`;
  }
  return `Dịch đoạn truyện tiếng Trung sau sang tiếng Việt tự nhiên như người Việt viết, đúng nghĩa theo ngữ cảnh.
- Dùng từ thuần Việt cho lời kể, lời thoại; không dịch word-by-word, không để câu cứng kiểu convert.
- TÊN RIÊNG (người, địa danh, môn phái, chiêu thức, danh hiệu): viết bằng âm Hán Việt, viết hoa chữ đầu mỗi âm${hanviet ? ', lấy ĐÚNG âm trong dòng "Âm Hán Việt" bên dưới, không tự đoán' : ''}.
- Xưng hô (anh/em, ta/ngươi, hắn, nàng…) hợp quan hệ nhân vật và ngữ cảnh.
CHỈ trả về bản dịch, không ghi chú, không phiên âm.
${context ? `Ngữ cảnh trước đó (không dịch): ${context}\n` : ''}${hanviet ? `Âm Hán Việt từng chữ (chỉ để tra tên riêng): ${hanviet}\n` : ''}Cần dịch: ${text}`;
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

/**
 * Giải nghĩa MỘT từ vừa chạm, đồng thời nhận ra cụm cố định (collocation) chứa từ đó trong câu.
 * exact = true: người dùng chủ ý tra đúng từ này (bấm từ nhỏ trong cụm) nên KHÔNG mở rộng thành cụm.
 */
export function vietMeaningPrompt(word: string, sentence: string, englishHint: string, exact = false): string {
  const phraseRule = exact
    ? `Chỉ giải nghĩa đúng "${word}", KHÔNG mở rộng thành cụm: "phrase" = "${word}", "parts" = [].`
    : `1) Tìm cụm: trong câu trên, "${word}" có nằm trong một CỤM CỐ ĐỊNH (collocation) không? Gồm thành ngữ, cụm 4 chữ,
   cụm động từ + tân ngữ quen dùng, cụm hay đi liền nhau mà nghĩa của cả cụm khác hoặc tự nhiên hơn nghĩa cộng từng từ
   (ví dụ 汗毛直立, 頭皮發麻, 哭笑不得, 騙吃騙喝). Nếu có: "phrase" = cả cụm, PHẢI là chuỗi chữ liền nhau y hệt trong câu và
   chứa "${word}". Nếu không: "phrase" = "${word}". Không mở rộng thành cả mệnh đề hay cả câu.
   KHÔNG ghép phó từ mức độ / hư từ vào cụm (有點, 很, 非常, 都, 也, 了, 的, 得…): 有點哭笑不得 → cụm là 哭笑不得.
   Bản thân "${word}" đã là thành ngữ / cụm 4 chữ thì giữ nguyên "${word}". Đa số từ KHÔNG nằm trong cụm nào: khi phân vân, chọn "${word}".
2) "meaning" = nghĩa của "phrase" (cả cụm) theo ngữ cảnh.
3) "parts": nếu "phrase" gồm từ 2 từ nhỏ trở lên thì liệt kê từng từ nhỏ theo thứ tự, ghép lại PHẢI đúng bằng "phrase",
   mỗi từ kèm loại từ ("pos", một mã: ${POS_CODES_WORD}) và nghĩa ngắn (tối đa 6 từ).
   Ví dụ 汗毛直立 → [{"text":"汗毛","pos":"N","meaning":"lông tơ"},{"text":"直立","pos":"V","meaning":"dựng đứng"}].
   Nếu "phrase" chỉ là một từ: "parts" = [].`;
  return `Bạn là từ điển Trung–Việt cho người Việt học tiếng Trung phồn thể.
Từ người học vừa chạm: ${word}
Câu chứa từ (để chọn đúng nghĩa theo ngữ cảnh): ${sentence}
Gợi ý nghĩa tiếng Anh của riêng "${word}" từ CC-CEDICT: ${englishHint || '(không có)'}

${phraseRule}

Trả về DUY NHẤT một JSON, không giải thích thêm:
{"phrase": "cụm (hoặc chính từ nếu không có cụm)",
 "pinyin": "pinyin có dấu thanh của phrase, các âm tiết cách nhau bằng dấu cách",
 "meaning": "nghĩa tiếng Việt ngắn gọn của phrase, đúng ngữ cảnh câu trên, tối đa 15 từ",
 "partOfSpeech": "loại từ của phrase theo nghĩa trong câu. phrase là MỘT từ: đúng một mã trong ${POS_CODES_WORD}. phrase là cụm nhiều từ: một trong ${POS_CODES_PHRASE}",
 "hanviet": "âm Hán Việt của từng chữ trong phrase, cách nhau bằng dấu cách, viết thường",
 "parts": [{"text": "từ nhỏ", "pos": "mã loại từ", "meaning": "nghĩa ngắn"}]}`;
}

/** 3 từ đồng nghĩa / gần nghĩa của một từ (hoặc cụm), theo đúng nghĩa đang dùng trong câu. */
export function synonymsPrompt(word: string, meaning: string, sentence: string): string {
  return `Bạn là từ điển Trung–Việt cho người Việt học tiếng Trung phồn thể (trình độ khoảng HSK4–5).
Từ: ${word}
Nghĩa đang dùng: ${meaning || '(theo câu)'}
Câu chứa từ: ${sentence}

Liệt kê đúng 3 từ ĐỒNG NGHĨA hoặc GẦN NGHĨA với "${word}" theo nghĩa trên, viết bằng chữ PHỒN THỂ, hay gặp trong truyện,
ưu tiên từ thông dụng trước. Không lặp lại chính "${word}", không đưa từ trái nghĩa.
Mỗi từ kèm loại từ ("pos", một mã: ${POS_CODES_WORD}; nếu là cụm nhiều từ dùng một trong ${POS_CODES_PHRASE})
và nghĩa tiếng Việt ngắn (tối đa 6 từ).
Trả về DUY NHẤT một JSON, không giải thích thêm:
[{"text": "từ", "pos": "mã", "meaning": "nghĩa ngắn"}]`;
}

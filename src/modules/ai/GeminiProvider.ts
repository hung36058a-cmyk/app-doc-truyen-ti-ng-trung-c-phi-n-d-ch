// modules/ai/GeminiProvider.ts — Gọi Google Gemini API bằng MỘT API key (lấy key ở aistudio.google.com).
// Dùng khi app chạy ngoài claude.ai. Mỗi key là một instance; thứ tự ưu tiên giữa các key do ProviderChain lo.
// Mỗi mức chất lượng có danh sách model dự phòng: model không dùng được (bị gỡ, không có quyền) thì thử model sau.
// Google đổi tên model thì chỉ cần sửa bảng MODELS.

import { AiKeyError, type AiProvider, type CompleteOptions, type Quality } from './AiProvider';

const MODELS: Record<Quality, string[]> = {
  // quick: Gemini Flash — tra từ, tạo thẻ · fast: Gemini Flash — "Dịch tự động" câu/đoạn · best: Gemini Pro — "Dịch nâng cao"
  // (tên model theo trang ai.google.dev/gemini-api/docs/models, 15/11/2026)
  quick: ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash'],
  // dịch: 3.6 Flash đứng đầu vì nó cho mức nghĩ 'minimal' (gần như không nghĩ) — 3.8 Flash thấp nhất chỉ 'low'
  // v4.5: "Dịch tự động" đổi sang 3.6 Flash (mức nghĩ 'minimal' = gần như không nghĩ): dịch đúng hơn hẳn Flash-Lite,
  // chậm hơn chút ít. Flash-Lite chỉ còn là dự phòng khi Flash lỗi / hết lượt.
  fast: ['gemini-3.6-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  best: ['gemini-3.1-pro-preview', 'gemini-2.5-pro'],
};
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Mức "suy nghĩ" cho từng model. Model 3.x mặc định nghĩ nhiều (medium/high) nên trả lời rất chậm.
 * Dịch truyện không cần suy luận dài: Flash nghĩ ít nhất model cho phép; best (Pro) nghĩ ở mức low
 * (Pro mặc định "high" làm Dịch nâng cao chờ 20–40 giây). Gemini 2.5 dùng thinkingBudget (Flash 0 = tắt, Pro tối thiểu 128).
 * Theo ai.google.dev/gemini-api/docs/thinking (15/11/2026): 3.6 Flash và 3-flash-preview nhận 'minimal'; 3.8 Flash thấp nhất 'low'.
 */
const MINIMAL_OK = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3-flash-preview'];
function thinkingConfig(model: string, quality: Quality): Record<string, unknown> | undefined {
  if (quality === 'best') return model.startsWith('gemini-2.5') ? { thinkingBudget: 128 } : { thinkingLevel: 'low' };
  if (model.startsWith('gemini-2.5')) return { thinkingBudget: 0 };
  if (model === 'gemini-3.1-flash-lite') return undefined; // dùng mặc định của model (đã là nghĩ rất ít)
  return { thinkingLevel: MINIMAL_OK.includes(model) ? 'minimal' : 'low' };
}

export class GeminiProvider implements AiProvider {
  /** Model gọi thành công gần nhất cho từng mức, để lần sau gọi thẳng. */
  private working: Partial<Record<Quality, string>> = {};

  constructor(
    private key: string,
    readonly label = 'Gemini',
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.key.trim().length > 20;
  }

  async complete(prompt: string, opts: CompleteOptions = {}): Promise<string> {
    const quality = opts.quality ?? 'quick';
    const list = [...new Set([this.working[quality], ...MODELS[quality]].filter((m): m is string => !!m))];
    let lastError = 'Gemini không trả lời.';
    for (const model of list) {
      // gọi dạng "stream": chữ hiện dần ngay khi AI viết, không phải chờ viết xong cả bản dịch
      const res = await fetch(`${ENDPOINT}/${model}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        signal: opts.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.key.trim() },
        body: JSON.stringify({ // (không đặt temperature: Google khuyên để mặc định với Gemini 3)
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            ...(thinkingConfig(model, quality) && { thinkingConfig: thinkingConfig(model, quality) }),
          },
        }),
      });
      if (res.ok) {
        const text = await readStream(res, opts.onText);
        if (!text) throw new Error('Gemini trả về rỗng (có thể bị bộ lọc nội dung chặn).');
        this.working[quality] = model;
        return text;
      }
      const body = await res.text().catch(() => '');
      if (res.status === 402) throw new AiKeyError('hết tiền nạp trước (402)', 30 * 60_000);
      // Pro thường không có lượt miễn phí: chuyển sang key kế tiếp cho lần này, KHÔNG cho key nghỉ
      // (nếu nghỉ thì key miễn phí cũng thôi dùng cho Dịch tự động)
      if (res.status === 429 && quality === 'best') throw new AiKeyError('Dịch nâng cao (Gemini Pro) hết lượt hoặc cần key trả phí (429)', 0);
      if (res.status === 429) throw new AiKeyError('hết lượt (429)');
      if (/API_KEY_INVALID|API key not valid/i.test(body)) throw new AiKeyError('key không đúng', 24 * 3600_000);
      if (res.status === 403 && !/not found|not supported|permission/i.test(body)) throw new AiKeyError('Google từ chối key (403)');
      lastError = `Gemini báo lỗi ${res.status}.`;
      // 404 (model không còn) hoặc lỗi quyền theo model: thử model kế tiếp
    }
    throw new Error(lastError);
  }
}

type Chunk = { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };

/** Đọc câu trả lời dạng stream (Server-Sent Events): mỗi dòng "data: {...}" là một mẩu chữ mới. */
async function readStream(res: Response, onText?: (textSoFar: string) => void): Promise<string> {
  if (!res.body) {
    const raw = await res.text();
    return raw.split('\n').filter((l) => l.startsWith('data:')).map((l) => chunkText(l)).join('');
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    let grew = false;
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const piece = chunkText(line);
      if (piece) { text += piece; grew = true; }
    }
    if (grew) onText?.(text);
  }
  if (buf.startsWith('data:')) text += chunkText(buf);
  onText?.(text);
  return text;
}

/** Chữ trong một dòng "data: {...}" (bỏ phần "suy nghĩ" của model nếu có). */
function chunkText(line: string): string {
  try {
    const data = JSON.parse(line.slice(5).trim()) as Chunk;
    return data.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? '';
  } catch {
    return '';
  }
}

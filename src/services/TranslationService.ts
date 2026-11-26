// services/TranslationService.ts — Dịch câu / đoạn / phần người dùng tô chọn bằng AI.
// Bản 3.5: ưu tiên TỐC ĐỘ — luôn dùng model nhanh nhất (Gemini Flash-Lite), prompt ngắn, AI chỉ trả bản dịch
// (không còn viết Hán Việt và cụm trước bản dịch, nên chữ dịch hiện ra ngay từ giây đầu).
// Bản 4.5: "Dịch tự động" dùng Gemini Flash (dịch đúng hơn Flash-Lite, vẫn nhanh) và gửi kèm âm Hán Việt
// chuẩn từ từ điển offline để AI viết TÊN RIÊNG (người, nơi, chiêu thức) đúng âm Hán Việt.
// Mỗi đoạn chỉ dịch một lần cho mỗi ngôn ngữ (có cache).

import type { MeaningLang } from '@/core/types';
import type { AiProvider } from '@/modules/ai/AiProvider';
import { translateFastPrompt } from '@/modules/ai/prompts';
import type { TranslationCache } from '@/modules/storage/Storage';

/** Ngữ cảnh gửi kèm: ngắn thôi để AI đọc nhanh. */
const CONTEXT_CHARS = 200;
/** Đổi khi đổi cách dịch, để bản dịch cũ (chất lượng thấp hơn) không bị lấy lại từ cache. */
const CACHE_TAG = 'fast2';

export class TranslationService {
  /** Đoạn đang được dịch (kể cả dịch sẵn chạy ngầm): mở đoạn đó thì chờ chung, không gọi AI lần 2. */
  private inflight = new Map<string, { promise: Promise<string>; listeners: Set<(t: string) => void> }>();

  constructor(
    private ai: AiProvider,
    private cache: TranslationCache,
    /** Âm Hán Việt chuẩn của một chuỗi (từ điển offline); không có thì AI tự phiên âm. */
    private hanviet?: (text: string) => string,
  ) {}

  /** Dịch một câu, một đoạn, hoặc phần chữ tô chọn. context = phần ngay trước, giúp AI dịch đúng xưng hô. */
  async translate(text: string, target: MeaningLang, context: string, onText?: (textSoFar: string) => void): Promise<string> {
    const key = `${target}|${CACHE_TAG}|${text}`;
    const hit = await this.cache.get(key);
    if (hit) {
      onText?.(hit);
      return hit;
    }
    const running = this.inflight.get(key);
    if (running) {
      if (onText) running.listeners.add(onText);
      try { return await running.promise; } finally { if (onText) running.listeners.delete(onText); }
    }
    const listeners = new Set<(t: string) => void>(onText ? [onText] : []);
    const promise = (async () => {
      const out = (
        await this.ai.complete(translateFastPrompt(text, target, [...context].slice(-CONTEXT_CHARS).join(''), this.hanvietHint(text, target)), {
          quality: 'fast',
          onText: (t) => listeners.forEach((f) => f(t)),
        })
      ).trim();
      if (out) await this.cache.set(key, out);
      return out;
    })();
    this.inflight.set(key, { promise, listeners });
    try { return await promise; } finally { this.inflight.delete(key); }
  }

  /** Âm Hán Việt từng chữ của đoạn cần dịch (chỉ khi dịch sang tiếng Việt, đoạn không quá dài). */
  private hanvietHint(text: string, target: MeaningLang): string {
    if (target !== 'vi' || !this.hanviet || [...text].length > 400) return '';
    try { return (text.match(/\p{Script=Han}+/gu) ?? []).map((run) => this.hanviet!(run)).join(' · '); } catch { return ''; }
  }

  /** Dịch sẵn chạy ngầm (vd câu kế tiếp), lỗi thì bỏ qua. */
  prefetch(text: string, target: MeaningLang, context: string): void {
    this.translate(text, target, context).catch(() => {});
  }
}

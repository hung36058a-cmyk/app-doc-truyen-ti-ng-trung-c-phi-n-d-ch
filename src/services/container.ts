// services/container.ts — NƠI DUY NHẤT nối các module với nhau.
// Muốn đổi từ điển, bộ tách từ, nhà cung cấp AI hay cách lưu trữ: chỉ sửa file này.

import { CedictDictionary } from '@/modules/dictionary/CedictDictionary';
import type { Dictionary } from '@/modules/dictionary/Dictionary';
import { MaxMatchSegmenter } from '@/modules/segmenter/MaxMatchSegmenter';
import type { Segmenter } from '@/modules/segmenter/Segmenter';
import { ClaudeArtifactProvider } from '@/modules/ai/ClaudeArtifactProvider';
import { AnthropicApiProvider } from '@/modules/ai/AnthropicApiProvider';
import { ProviderChain, type ChainEntry } from '@/modules/ai/ProviderChain';
import type { AiKey } from '@/core/types';
import { GeminiProvider } from '@/modules/ai/GeminiProvider';
import { createDexieStorage } from '@/modules/storage/DexieStorage';
import type { Storage } from '@/modules/storage/Storage';
import { MeaningService } from './MeaningService';
import { TranslationService } from './TranslationService';
import { CardService } from './CardService';
import { loadSqlJs } from '@/modules/anki/loadSql';

export interface Services {
  storage: Storage;
  dictionary: Dictionary;
  segmenter: Segmenter;
  ai: ProviderChain;
  meanings: MeaningService;
  translations: TranslationService;
  cards: CardService;
}

export function createServices(): Services {
  const storage = createDexieStorage();
  const dictionary = new CedictDictionary({
    cedictUrl: './data/cedict.tsv',
    hanvietUrl: './data/hanviet.tsv',
  });
  const segmenter = new MaxMatchSegmenter(dictionary);
  // Thứ tự ưu tiên: Claude trên claude.ai trước, rồi tới các API key riêng theo thứ tự người dùng xếp
  const artifactClaude = new ClaudeArtifactProvider();
  const byKey = new Map<string, ChainEntry>(); // giữ instance theo key để nhớ model đang chạy được
  const keyEntry = (k: AiKey): ChainEntry => {
    const cacheId = `${k.provider}|${k.key}|${k.label}`;
    let e = byKey.get(cacheId);
    if (!e) {
      const label = `${k.provider === 'gemini' ? 'Gemini' : 'Claude'} · ${k.label}`;
      const provider = k.provider === 'gemini' ? new GeminiProvider(k.key, label) : new AnthropicApiProvider(k.key, label);
      e = { id: k.id, provider };
      byKey.set(cacheId, e);
    }
    return e;
  };
  const ai = new ProviderChain(
    () => [{ id: 'claude-ai', provider: artifactClaude }, ...storage.settings.load().aiKeys.map(keyEntry)],
  );
  const meanings = new MeaningService(dictionary, ai, storage.meanings);
  const translations = new TranslationService(ai, storage.translations);
  const cards = new CardService(ai, dictionary, loadSqlJs);
  return { storage, dictionary, segmenter, ai, meanings, translations, cards };
}

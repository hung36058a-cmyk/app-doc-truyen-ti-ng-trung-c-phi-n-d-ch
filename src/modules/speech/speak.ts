// modules/speech/speak.ts — Đọc to từ tiếng Trung bằng giọng có sẵn của máy (Web Speech API).
// Ưu tiên giọng Đài Loan (zh-TW), không có thì dùng giọng tiếng Trung bất kỳ.

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string): void {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const voice =
    voices.find((v) => v.lang === 'zh-TW') ??
    voices.find((v) => /zh[-_]?(Hant|HK)/i.test(v.lang)) ??
    voices.find((v) => v.lang.startsWith('zh'));
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'zh-TW';
  u.rate = 0.85;
  synth.speak(u);
}

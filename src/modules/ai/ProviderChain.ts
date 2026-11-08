// modules/ai/ProviderChain.ts — Dùng các nhà cung cấp AI theo thứ tự ưu tiên.
// Nhà cung cấp đứng trước báo lỗi KEY (hết lượt, hết tiền, key sai) thì tạm bỏ qua nó một thời gian
// và thử nhà cung cấp kế tiếp. Mức model (quick/best) do từng dịch vụ tự chọn cho mỗi yêu cầu.

import { AiKeyError, AiUnavailableError, type AiProvider, type CompleteOptions } from './AiProvider';

export interface ChainEntry {
  id: string; // khóa ổn định để nhớ thời gian tạm nghỉ
  provider: AiProvider;
}

export class ProviderChain implements AiProvider {
  private resting = new Map<string, { until: number; reason: string }>();

  constructor(
    private getEntries: () => ChainEntry[],
  ) {}

  get label() {
    return this.getEntries().map((e) => e.provider.label).join(' / ');
  }

  private isResting(id: string): boolean {
    const r = this.resting.get(id);
    if (r && r.until > Date.now()) return true;
    this.resting.delete(id);
    return false;
  }

  /** Nhà cung cấp sẽ được dùng cho yêu cầu kế tiếp (để hiện trong Cài đặt). */
  async active(): Promise<AiProvider | null> {
    for (const e of this.getEntries()) if (!this.isResting(e.id) && (await e.provider.isAvailable())) return e.provider;
    return null;
  }

  /** Lý do một key đang tạm nghỉ (null nếu không nghỉ). */
  restingReason(id: string): string | null {
    return this.isResting(id) ? this.resting.get(id)!.reason : null;
  }

  async isAvailable(): Promise<boolean> {
    return (await this.active()) !== null;
  }

  async complete(prompt: string, opts: CompleteOptions = {}): Promise<string> {
    const failures: string[] = [];
    let tried = 0;
    for (const e of this.getEntries()) {
      if (this.isResting(e.id)) {
        failures.push(`${e.provider.label}: ${this.resting.get(e.id)!.reason}`);
        continue;
      }
      if (!(await e.provider.isAvailable())) continue;
      tried++;
      try {
        return await e.provider.complete(prompt, opts);
      } catch (err) {
        if (!(err instanceof AiKeyError)) throw err;
        // cooldownMs = 0: chỉ bỏ qua key này cho yêu cầu hiện tại, không cho nghỉ
        if (err.cooldownMs > 0) this.resting.set(e.id, { until: Date.now() + err.cooldownMs, reason: err.message });
        failures.push(`${e.provider.label}: ${err.message}`);
      }
    }
    if (!tried && !failures.length) throw new AiUnavailableError('Chưa có AI: thêm API key trong Cài đặt.');
    throw new Error(`Không key nào dùng được. ${failures.join(' · ')}.`);
  }

  /** Cho phép thử lại ngay các key đang tạm nghỉ (ví dụ sau khi vừa nạp tiền). */
  clearResting(): void {
    this.resting.clear();
  }
}

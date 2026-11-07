// modules/download/saveFile.ts — Đưa file cho người dùng tải về.
// Trên claude.ai: dùng quyền "downloads" của artifact (chỉ cho phép một số đuôi file, có .zip, không có .apkg).
// Khi tự host: tải thẳng bằng link tải xuống của trình duyệt.

type Downloads = { save(req: { filename: string; data: Blob }): Promise<{ status: string }> } | null;

let downloads: Promise<Downloads> | null = null;

function getDownloads(): Promise<Downloads> {
  if (!downloads) {
    downloads = window.claude?.use
      ? (window.claude.use('downloads') as Promise<Downloads>).catch(() => null)
      : Promise.resolve(null);
  }
  return downloads;
}

/** Đang chạy trong claude.ai (có quyền downloads) hay không: quyết định đuôi file. */
export async function isClaudeHosted(): Promise<boolean> {
  return (await getDownloads()) !== null;
}

export class SaveCancelled extends Error {}

export async function saveFile(filename: string, blob: Blob): Promise<void> {
  const dl = await getDownloads();
  if (dl) {
    try {
      await dl.save({ filename, data: blob });
      return;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'declined') throw new SaveCancelled('Bạn đã hủy tải file.');
      if (code === 'rate_limited') throw new Error('Tải xuống quá nhanh, đợi một chút rồi thử lại.');
      throw new Error((e as Error).message || 'Không tải được file.');
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

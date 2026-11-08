// modules/anki/ankiText.ts — Tạo file .txt để import vào Anki / AnkiDroid (Import -> chọn file).
// Dòng đầu là "header" Anki đọc được: tách bằng tab, có HTML, note type Basic, deck, tag.
// Mỗi thẻ một dòng: mặt trước <tab> mặt sau. Trường được bọc trong dấu nháy kép theo chuẩn CSV.

export interface TextNote {
  front: string;
  back: string;
}

export interface TextOptions {
  deckName: string;
  noteType?: string; // mặc định "Basic", đúng note type người dùng đang dùng
  tags?: string[];
}

const quote = (s: string) => `"${s.replace(/[\t\r\n]+/g, ' ').replace(/"/g, '""')}"`;

export function buildAnkiText(notes: TextNote[], opts: TextOptions): string {
  const header = [
    '#separator:tab',
    '#html:true',
    `#notetype:${opts.noteType ?? 'Basic'}`,
    `#deck:${opts.deckName}`,
    ...(opts.tags?.length ? [`#tags:${opts.tags.join(' ')}`] : []),
    // KHÔNG ghi #columns: Anki bản tiếng Việt đặt tên trường là "Mặt trước/Mặt sau", ghi tên cột tiếng Anh
    // làm Anki ghép sai. Không có tên cột thì Anki ghép theo thứ tự: cột 1 -> trường 1, cột 2 -> trường 2.
  ];
  return [...header, ...notes.map((n) => `${quote(n.front)}\t${quote(n.back)}`)].join('\n') + '\n';
}

// modules/anki/ApkgWriter.ts — Tạo file .apkg (gói thẻ Anki) ngay trên máy, không cần server.
// .apkg = file zip chứa "collection.anki2" (cơ sở dữ liệu SQLite, schema Anki 2.1 bản cũ, AnkiDroid đọc được)
// và file "media". SQLite chạy bằng sql.js (được truyền vào qua loadSql, xem loadSql.ts).
//
// Quy ước để xuất lại không bị trùng thẻ:
// - GUID của note cố định theo chữ (cùng từ -> cùng GUID): import lại sẽ CẬP NHẬT note cũ.
// - ID deck và note type cố định theo tên.

import JSZip from 'jszip';

export interface ApkgNote {
  front: string; // HTML mặt trước
  back: string; // HTML mặt sau
  key: string; // dùng để tạo GUID cố định (ví dụ: chữ Hán của từ)
  tags?: string[];
}

export interface ApkgOptions {
  deckName: string;
  modelName?: string;
  css?: string;
}

/** Phần nhỏ nhất của sql.js mà module này dùng (để không phụ thuộc kiểu của thư viện). */
export interface SqlDatabase {
  run(sql: string, params?: unknown[]): void;
  export(): Uint8Array;
  close(): void;
}
export interface SqlStatic {
  Database: new () => SqlDatabase;
}

const DEFAULT_CSS = `.card { font-family: "Noto Sans TC", "Microsoft JhengHei", Arial, sans-serif; font-size: 20px; text-align: left; color: black; background-color: white; }
.card b { color: #0F6E6A; }`;

export async function buildApkg(notes: ApkgNote[], opts: ApkgOptions, loadSql: () => Promise<SqlStatic>): Promise<Blob> {
  const SQL = await loadSql();
  const db = new SQL.Database();
  try {
    const now = Date.now();
    const nowSec = Math.floor(now / 1000);
    const deckId = await stableId(`deck:${opts.deckName}`);
    const modelName = opts.modelName ?? 'Basic (Đọc Truyện)';
    const modelId = await stableId(`model:${modelName}`);

    db.run(SCHEMA);
    db.run('INSERT INTO col VALUES (1,?,?,?,11,0,0,0,?,?,?,?,?)', [
      nowSec,
      now,
      now,
      JSON.stringify(colConf(deckId, modelId)),
      JSON.stringify({ [modelId]: model(modelId, modelName, deckId, opts.css ?? DEFAULT_CSS, nowSec) }),
      JSON.stringify({ 1: deck(1, 'Default', nowSec), [deckId]: deck(deckId, opts.deckName, nowSec) }),
      JSON.stringify(DCONF),
      '{}',
    ]);

    let i = 0;
    for (const n of notes) {
      const noteId = now + i; // id phải khác nhau
      const cardId = now + notes.length + i;
      const sortField = stripHtml(n.front);
      const tags = n.tags?.length ? ` ${n.tags.map((t) => t.replace(/\s+/g, '_')).join(' ')} ` : '';
      db.run('INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)', [
        noteId,
        await guidFor(n.key),
        modelId,
        nowSec,
        -1,
        tags,
        `${n.front}\x1f${n.back}`,
        sortField,
        await checksum(sortField),
        0,
        '',
      ]);
      // thẻ mới: type 0, queue 0, due = thứ tự
      db.run('INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
        cardId, noteId, deckId, 0, nowSec, -1, 0, 0, i + 1, 0, 0, 0, 0, 0, 0, 0, 0, '',
      ]);
      i++;
    }

    const zip = new JSZip();
    zip.file('collection.anki2', db.export());
    zip.file('media', '{}');
    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  } finally {
    db.close();
  }
}

// ---------- dữ liệu cố định của Anki ----------

const SCHEMA = `
CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null);
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);
CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);`;

function colConf(deckId: number, modelId: number) {
  return {
    activeDecks: [deckId], curDeck: deckId, newSpread: 0, collapseTime: 1200, timeLim: 0, estTimes: true,
    dueCounts: true, curModel: modelId, nextPos: 1, sortType: 'noteFld', sortBackwards: false, addToCur: true,
  };
}

function deck(id: number, name: string, mod: number) {
  return {
    id, name, mod, desc: '', usn: -1, collapsed: false, newToday: [0, 0], revToday: [0, 0], lrnToday: [0, 0],
    timeToday: [0, 0], dyn: 0, extendNew: 10, extendRev: 50, conf: 1,
  };
}

function model(id: number, name: string, did: number, css: string, mod: number) {
  const fld = (fname: string, ord: number) => ({ name: fname, ord, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] });
  return {
    id, name, did, mod, css, type: 0, usn: -1, sortf: 0, vers: [], tags: [],
    flds: [fld('Front', 0), fld('Back', 1)],
    tmpls: [{ name: 'Card 1', ord: 0, qfmt: '{{Front}}', afmt: '{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}', did: null, bqfmt: '', bafmt: '' }],
    req: [[0, 'any', [0]]],
    latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
    latexPost: '\\end{document}',
  };
}

const DCONF = {
  1: {
    id: 1, name: 'Default', mod: 0, usn: 0, maxTaken: 60, autoplay: true, timer: 0, replayq: true, dyn: false,
    new: { bury: false, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 0], order: 1, perDay: 20, separate: true },
    lapse: { delays: [10], leechAction: 1, leechFails: 8, minInt: 1, mult: 0 },
    rev: { bury: false, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 200 },
  },
};

// ---------- tiện ích ----------

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

async function sha1Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Checksum Anki: 8 chữ số hex đầu của SHA-1 trường sắp xếp, đổi ra số. */
async function checksum(text: string): Promise<number> {
  return parseInt((await sha1Hex(text)).slice(0, 8), 16);
}

async function guidFor(key: string): Promise<string> {
  return `dt${(await sha1Hex(`doc-truyen:${key}`)).slice(0, 14)}`;
}

/** ID số cố định theo tên (trong khoảng an toàn của Anki, cỡ 13 chữ số như timestamp ms). */
async function stableId(name: string): Promise<number> {
  return 1_000_000_000_000 + (parseInt((await sha1Hex(name)).slice(0, 10), 16) % 900_000_000_000);
}

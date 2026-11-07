// services/sampleBook.ts — Truyện mẫu ngắn (tự viết) có sẵn trong Thư viện để thử app ngay khi mở lần đầu.

import type { Book } from '@/core/types';

export const SAMPLE_BOOK_ID = 'sample-yuye-shudian';

export function sampleBook(): Book {
  const chapters = [
    {
      id: 'c1',
      title: '第一章　雨中的書店',
      paragraphs: [
        '那天傍晚，雨下得很大。林小雨站在書店門口，不知道該怎麼稱呼眼前這位老先生。',
        '他笑著說：「叫我陳伯就好。這家店開了三十年，下雨天總是有人躲進來。」',
        '小雨點點頭，目光落在書架最上層。那裡放著一本很舊的書，封面上沒有名字。',
        '「那本書不賣，」陳伯好像看出了她的心思，「不過你可以坐下來慢慢看。」',
      ],
    },
    {
      id: 'c2',
      title: '第二章　沒有名字的書',
      paragraphs: [
        '小雨小心地翻開第一頁，上面只寫了一句話：「每個走進這家店的人，都在找一個答案。」',
        '她覺得有點奇怪，可是又忍不住繼續讀下去。書裡寫的，好像正是她最近的生活。',
        '窗外的雨聲越來越小。陳伯泡了一壺熱茶，安靜地放在她旁邊的桌子上。',
      ],
    },
    {
      id: 'c3',
      title: '第三章　雨停了',
      paragraphs: [
        '不知道過了多久，雨終於停了。街上的燈一盞一盞亮起來。',
        '小雨把書放回原來的地方，對陳伯說：「謝謝您，我明天還可以再來嗎？」',
        '陳伯笑了：「當然可以。這本書會等你，就像它等過很多人一樣。」',
      ],
    },
  ];
  return {
    id: SAMPLE_BOOK_ID,
    title: '雨夜書店',
    author: 'Truyện mẫu',
    chapters,
    toc: chapters.map((c, i) => ({ title: c.title, chapterIndex: i })),
    addedAt: 0,
  };
}

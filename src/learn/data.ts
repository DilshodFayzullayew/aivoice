/**
 * O'rganish bo'limi ma'lumotlari (4 ta ilovadan olingan, src/learn/data/*.json).
 * JSON'lar faqat bo'lim birinchi ochilganda yuklanadi — ilova ishga tushishi sekinlashmaydi.
 */

/** [matn, uslub] — uslub: "b" qalin, "r" qizil, "g" yashil, "u" ko'k (birgalikda bo'lishi mumkin: "br") */
export type Run = [string] | [string, string];
export type Paragraph = Run[];

export interface ArticleBlock {
  h?: string;
  p: Paragraph[];
}

export interface Article {
  id: string;
  title: string;
  img?: string;
  blocks: ArticleBlock[];
}

export interface BookSection {
  title: string;
  items: Article[];
}

/** [savol, javoblar, to'g'ri javob raqami, izoh?] */
export type Question = [string, string[], number] | [string, string[], number, string];

export interface TestTopic {
  name: string;
  q: number[];
}

export interface TestsData {
  q: Question[];
  professions: { name: string; topics: TestTopic[] }[];
  documents: { name: string; full: string; topics: TestTopic[] }[];
}

export interface DocGroup {
  key: string;
  title: string;
  full: string;
  pages: { file: string; title: string }[];
}

let tests: TestsData | null = null;
let vl80: BookSection[] | null = null;
let klub: BookSection[] | null = null;
let docs: DocGroup[] | null = null;

export const getTests = (): TestsData => (tests ??= require('./data/tests.json'));
export const getVl80 = (): BookSection[] => (vl80 ??= require('./data/vl80.json'));
export const getKlub = (): BookSection[] => (klub ??= require('./data/klub.json'));
export const getDocs = (): DocGroup[] => (docs ??= require('./data/docs.json'));

export type BookKey = 'vl80' | 'klub';
export const getBook = (book: BookKey) => (book === 'vl80' ? getVl80() : getKlub());

/** Paragraf matni (qidiruv uchun) */
export const paragraphText = (p: Paragraph) => p.map((r) => r[0]).join('');

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

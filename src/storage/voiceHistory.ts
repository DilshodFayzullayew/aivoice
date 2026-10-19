import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServerHistoryItem, clearMyHistory, deleteMyHistoryItem, fetchMyHistory } from '../api/voiceApi';
import { tr } from '../i18n';

export interface HistoryItem {
  id: string;
  createdAt: number;
  /** Mashinist so'ragan savol (STT natijasi yoki tanlangan tezkor savol) */
  question: string;
  source: 'voice' | 'text';
  matched: boolean;
  similarity: number;
  answer?: string;
  kbQuestion?: string;
  /** Javob manbai: bilimlar bazasi yoki AI (Gemini) */
  answerSource?: 'kb' | 'ai';
  /** Mavzuga oidligi tekshirilgan (server tasdiqlagan yoki filtrdan o'tgan) */
  relevanceChecked?: boolean;
  audioUrl?: string;
  /** Yozilgan ovoz davomiyligi, sekund */
  duration?: number;
  /** Admin javobni tuzatgan vaqt — mashinistga "Javob yangilandi" ko'rsatiladi */
  answerUpdatedAt?: number;
  /** Ovoz hali yaratilmagan bo'lsa — ▶ bosilganda shular orqali so'raladi */
  kbId?: number;
  audioId?: string;
}

/*
 * Tarix serverda (PostgreSQL) — har bir mashinistning o'zi bergan savollari.
 * Telefonda faqat oxirgi nusxa saqlanadi (server bilan aloqa bo'lmaganda ko'rsatish uchun),
 * har bir foydalanuvchi uchun alohida kalit bilan.
 */
let cacheKey = 'ovoz_history_guest';

/** auth.tsx foydalanuvchi kirganda/chiqqanda chaqiradi */
export function setHistoryUser(userId: number | null) {
  cacheKey = userId ? `ovoz_history_user_${userId}` : 'ovoz_history_guest';
}

const fromServer = (h: ServerHistoryItem): HistoryItem => ({
  id: String(h.id),
  createdAt: Date.parse(h.created_at),
  question: h.question,
  source: h.source,
  matched: true,
  similarity: h.similarity,
  answer: h.answer_text,
  kbQuestion: h.kb_question ?? undefined,
  answerSource: h.answer_source,
  relevanceChecked: true,
  audioUrl: h.audio_url || undefined,
  kbId: h.kb ?? undefined,
  audioId: h.audio_id || undefined,
  answerUpdatedAt: h.answer_updated_at ? Date.parse(h.answer_updated_at) : undefined,
});

export async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

/** Telefondagi nusxani yangilaydi (server o'zgarishlari allaqachon saqlangan) */
export async function saveHistory(items: HistoryItem[]): Promise<HistoryItem[]> {
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(items.slice(0, 100)));
  } catch {
    // keshga yozib bo'lmasa ham ilova ishlayveradi
  }
  return items;
}

/**
 * Foydalanuvchining tarixi: serverdan (faqat javob topilgan va mavzuga oid savollar saqlanadi).
 * Server bilan aloqa bo'lmasa — telefondagi oxirgi nusxa.
 */
export async function loadRelevantHistory(): Promise<HistoryItem[]> {
  try {
    const items = (await fetchMyHistory()).map(fromServer);
    return saveHistory(items);
  } catch {
    return loadHistory();
  }
}

/** Bitta savolni tarixdan o'chiradi (serverda ham) */
export async function removeHistoryItem(id: string): Promise<HistoryItem[]> {
  await deleteMyHistoryItem(id);
  const items = (await loadHistory()).filter((it) => it.id !== id);
  return saveHistory(items);
}

export async function clearHistory(): Promise<void> {
  await clearMyHistory();
  try {
    await AsyncStorage.removeItem(cacheKey);
  } catch {
    // e'tiborsiz
  }
}

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

export function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return tr('Bugun');
  if (diffDays === 1) return tr('Kecha');
  return `${d.getDate()} ${tr(MONTHS[d.getMonth()])}`;
}

export function timeLabel(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Tarixni kunlar bo'yicha guruhlash (eng yangisi birinchi) */
export function groupByDay(items: HistoryItem[]): { label: string; items: HistoryItem[] }[] {
  const groups: { label: string; items: HistoryItem[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

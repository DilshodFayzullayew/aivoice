import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { tr } from '../i18n';

export interface Suggestion {
  kb_id: number;
  question: string;
  similarity: number;
}

export interface QueryResult {
  stt_text: string;
  matched: boolean;
  similarity: number;
  kb_id?: number;
  kb_question?: string;
  /** "kb" — bilimlar bazasidan, "ai" — bazada yo'q, Gemini javobi */
  answer_source?: 'kb' | 'ai';
  /** AI javobi: ovoz alohida tayyorlanadi — fetchAiAudio(audio_id) */
  audio_id?: string | null;
  /** Savol tushunarsiz yoki mavzuga aloqasiz — javob berilmadi */
  unclear?: boolean;
  /** Savol lokomotiv / temir yo'lga oidmi — tarixga faqat oid savollar yoziladi */
  relevant?: boolean;
  /** Serverdagi tarix yozuvi id'si (javob topilganda) */
  history_id?: number;
  answer_text?: string;
  answer_audio_url?: string;
  detail?: string;
  suggestions?: Suggestion[];
  /** Savol bir nechta lokomotiv seriyasiga mos keldi — mashinistdan qaysi seriya ekanini so'rash kerak */
  need_series?: boolean;
  series_options?: string[];
  /** Javob qaysi seriya bo'yicha (ВЛ-80 / ВЛ-60 / ТЭМ) */
  series?: string;
}

const API_PORT = 8000;
const REQUEST_TIMEOUT_MS = 90_000;

/**
 * Backend manzili:
 * 1) build vaqtidagi EXPO_PUBLIC_API_URL (masalan https://xxx.trycloudflare.com)
 * 2) aks holda Expo dev server ishlayotgan kompyuterning IP manzili, 8000-port
 *    (telefon va kompyuter bitta Wi-Fi'da bo'lsa, qo'lda sozlash shart emas)
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const host = hostUri.split(':')[0] || 'localhost';
  return `http://${host}:${API_PORT}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly kind: 'network' | 'server' | 'timeout' | 'auth',
    public readonly status = 0,
  ) {
    super(message);
  }
}

// Login tokeni: auth.tsx o'rnatadi, har bir so'rovga "Authorization: Token ..." qo'shiladi
let authToken: string | null = null;
let onUnauthorized: () => void = () => {};

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Token yaroqsiz bo'lib qolsa (401) — login sahifasiga qaytarish uchun */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = { ...((init.headers as Record<string, string>) ?? {}) };
  if (authToken) headers.Authorization = `Token ${authToken}`;
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new ApiError(tr('Server javobi juda uzoq kutildi. Qayta urinib ko‘ring.'), 'timeout');
    }
    throw new ApiError(tr('Serverga ulanib bo‘lmadi ({url}).', { url: getApiBaseUrl() }), 'network');
  } finally {
    clearTimeout(timer);
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // JSON bo'lmagan javob — pastda umumiy xato
  }
  if (res.status === 401 && authToken) {
    onUnauthorized();
    throw new ApiError(tr('Sessiya tugagan. Qaytadan kiring.'), 'auth', 401);
  }
  if (res.status === 204) return null as T;
  if (!res.ok) {
    throw new ApiError(body?.detail || tr('Server xatosi ({status}).', { status: res.status }), 'server', res.status);
  }
  return body as T;
}

/**
 * Yozilgan ovozni yuboradi: STT -> bazadan qidiruv -> javob matni + mp3 ovoz.
 * Fayl multipart emas, JSON ichida base64 ko'rinishida yuboriladi: React Native Android
 * multipart faylni "chunked" yuboradi, Django serveri esa bunday so'rov tanasini o'qiy olmaydi.
 */
export async function voiceQuery(fileUri: string): Promise<QueryResult> {
  const ext = (fileUri.split('.').pop() || 'm4a').toLowerCase();
  let audioBase64: string;
  try {
    audioBase64 = await new File(fileUri).base64();
  } catch {
    throw new ApiError(tr('Yozilgan ovoz faylini o‘qib bo‘lmadi. Qayta yozib ko‘ring.'), 'server');
  }
  return request<QueryResult>('/api/voice/query/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // iOS ogg'ni ijro eta olmaydi — mobil ilova uchun mp3 so'raymiz
    body: JSON.stringify({ audio_base64: audioBase64, filename: `question.${ext}`, format: 'mp3' }),
  });
}

/** Matnli so'rov (tezkor savollar va tavsiyalar uchun) */
/** series — mashinist tanlagan lokomotiv seriyasi; source — ovozli savolga aniqlashtirish bo'lsa 'voice' */
export function textQuery(text: string, series?: string, source?: 'voice' | 'text'): Promise<QueryResult> {
  return request<QueryResult>('/api/text/query/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, format: 'mp3', ...(series ? { series } : {}), ...(source ? { source } : {}) }),
  });
}

/** AI javobining ovozi (matn darhol keladi, ovoz bir necha soniyadan keyin tayyor bo'ladi) */
/** Bazadagi javobning ovozi — ▶ bosilganda yaratiladi (avval yaratilgan bo'lsa darhol) */
export async function fetchKbAudio(kbId: number): Promise<string> {
  const res = await request<{ answer_audio_url: string }>(`/api/kb/${kbId}/audio/?audio_format=mp3`, { method: 'GET' });
  return res.answer_audio_url;
}

export async function fetchAiAudio(audioId: string): Promise<string> {
  const res = await request<{ answer_audio_url: string }>(`/api/ai-audio/${audioId}/`, { method: 'GET' });
  return res.answer_audio_url;
}

/** Savollar temir yo'l / lokomotivga oidmi (eski tarixni tozalash uchun). Xato bo'lsa null. */
export async function checkRelevance(questions: string[]): Promise<boolean[] | null> {
  try {
    const res = await request<{ relevant: boolean[] }>('/api/relevance/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    });
    return Array.isArray(res.relevant) && res.relevant.length === questions.length ? res.relevant : null;
  } catch {
    return null;
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await request<{ ok: boolean }>('/api/health/', { method: 'GET' });
    return !!res.ok;
  } catch {
    return false;
  }
}

export interface KbItem {
  id: number;
  question: string;
  answer: string;
}

/** Bazadagi barcha savol-javoblar (Umumiy sahifa ro'yxati) */
export async function fetchKnowledgeBase(): Promise<KbItem[]> {
  const res = await request<{ count: number; results: KbItem[] }>('/api/kb/', { method: 'GET' });
  return res.results;
}

/** Bitta javobning ovozli varianti (server keshlaydi — ikkinchi marta bir zumda) */
export async function fetchAnswerAudio(id: number): Promise<string> {
  const res = await request<{ answer_audio_url: string }>(`/api/kb/${id}/audio/?audio_format=mp3`, { method: 'GET' });
  return res.answer_audio_url;
}

/* ---------------- Autentifikatsiya ---------------- */

export interface AuthUser {
  id: number;
  firstname: string;
  lastname: string;
  username: string;
  tab_number: string | null;
  role: number | null;
  role_name: string | null;
  sex: number | null;
  sex_name: string | null;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
}

export function loginRequest(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  return request('/api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

export function fetchMe(): Promise<AuthUser> {
  return request('/api/auth/me/', { method: 'GET' });
}

export function logoutRequest(): Promise<null> {
  return request('/api/auth/logout/', { method: 'POST' });
}

/* ---------------- Foydalanuvchining o'z tarixi (serverda) ---------------- */

export interface ServerHistoryItem {
  id: number;
  question: string;
  answer_text: string;
  answer_source: 'kb' | 'ai';
  kb_question: string | null;
  similarity: number;
  source: 'voice' | 'text';
  audio_url: string;
  /** AI javobi ovozi uchun identifikator (ovoz ▶ bosilganda yaratiladi) */
  audio_id?: string;
  /** Bazadagi savol-javob id'si (ovoz ▶ bosilganda yaratiladi) */
  kb?: number | null;
  /** Admin javobni tuzatgan/kiritgan vaqt (bo'lmasa null) */
  answer_updated_at: string | null;
  created_at: string;
}

export async function fetchMyHistory(): Promise<ServerHistoryItem[]> {
  const res = await request<{ results: ServerHistoryItem[] }>('/api/me/history/?page_size=100', { method: 'GET' });
  return res.results;
}

export function deleteMyHistoryItem(id: string | number): Promise<null> {
  return request(`/api/me/history/${id}/`, { method: 'DELETE' });
}

export function clearMyHistory(): Promise<{ deleted: number }> {
  return request('/api/me/history/clear/', { method: 'POST' });
}

/* ---------------- Buzilish (nosozlik) xabarlari ---------------- */

export type ReportStatus = 'new' | 'in_progress' | 'resolved';

export interface ReportMedia {
  id: number;
  kind: 'image' | 'video';
  url: string;
  size: number;
}

export interface FaultReport {
  id: number;
  transcript: string;
  audio_url: string | null;
  audio_duration: number;
  locomotive: string;
  location: string;
  status: ReportStatus;
  status_label: string;
  admin_comment: string;
  media: ReportMedia[];
  created_at: string;
  resolved_at: string | null;
}

/** Nosozlik haqidagi ovozni matnga o'giradi (saqlamaydi) — mashinist matnni tekshirib tuzatishi uchun */
export async function transcribeReport(fileUri: string): Promise<string> {
  const ext = (fileUri.split('.').pop() || 'm4a').toLowerCase();
  let audioBase64: string;
  try {
    audioBase64 = await new File(fileUri).base64();
  } catch {
    throw new ApiError(tr('Yozilgan ovoz faylini o‘qib bo‘lmadi. Qayta yozib ko‘ring.'), 'server');
  }
  const res = await request<{ text: string }>('/api/reports/transcribe/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_base64: audioBase64, filename: `report.${ext}` }),
  });
  return res.text;
}

/**
 * Faylni telefonning o'z yuklash mexanizmi orqali multipart sifatida yuboradi.
 * fetch+FormData Android'da faylni "chunked" yuboradi va Django uni o'qiy olmaydi;
 * uploadAsync esa fayl hajmini oldindan aytadi, katta videolar ham muammosiz ketadi.
 */
async function uploadMultipart<T>(path: string, fileUri: string, fieldName: string, mimeType: string, parameters: Record<string, string> = {}): Promise<T> {
  let res: FileSystemLegacy.FileSystemUploadResult;
  try {
    res = await FileSystemLegacy.uploadAsync(`${getApiBaseUrl()}${path}`, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystemLegacy.FileSystemUploadType.MULTIPART,
      fieldName,
      mimeType,
      parameters,
      headers: authToken ? { Authorization: `Token ${authToken}` } : {},
    });
  } catch {
    throw new ApiError(tr('Faylni yuborib bo‘lmadi. Serverga ulanishni tekshiring ({url}).', { url: getApiBaseUrl() }), 'network');
  }
  let body: any = null;
  try {
    body = JSON.parse(res.body);
  } catch {
    // JSON bo'lmagan javob
  }
  if (res.status === 401) {
    onUnauthorized();
    throw new ApiError(tr('Sessiya tugagan. Qaytadan kiring.'), 'auth', 401);
  }
  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(body?.detail || tr('Server xatosi ({status}).', { status: res.status }), 'server', res.status);
  }
  return body as T;
}

export interface NewReport {
  audioUri: string | null;
  audioDuration: number;
  transcript: string;
  locomotive: string;
}

export function createReport(r: NewReport): Promise<FaultReport> {
  const fields = {
    transcript: r.transcript,
    locomotive: r.locomotive,
    audio_duration: String(Math.round(r.audioDuration)),
  };
  if (r.audioUri) {
    return uploadMultipart<FaultReport>('/api/me/reports/', r.audioUri, 'audio', 'audio/mp4', fields);
  }
  return request<FaultReport>('/api/me/reports/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
}

export function uploadReportMedia(reportId: number, fileUri: string, mimeType: string): Promise<ReportMedia> {
  return uploadMultipart<ReportMedia>(`/api/me/reports/${reportId}/media/`, fileUri, 'file', mimeType);
}

export async function fetchMyReports(): Promise<FaultReport[]> {
  const res = await request<{ results: FaultReport[] }>('/api/me/reports/?page_size=50', { method: 'GET' });
  return res.results;
}

export function deleteMyReport(id: number): Promise<null> {
  return request(`/api/me/reports/${id}/`, { method: 'DELETE' });
}

/* ---------------- Oylik (ish haqi qaydnomasi) ---------------- */

export interface SalaryItem {
  code: string;
  label: string;
  amount: number;
}

export interface SalaryRecord {
  id: number;
  period_title: string;
  year: number;
  month: number;
  tab_number: string;
  full_name: string;
  position: string;
  worked_days: string;
  worked_hours: string;
  accrued_total: string;
  withheld_total: string;
  inps: string;
  income_tax: string;
  paid_to_card: string;
  paid_cash: string;
  net_pay: string;
  accruals: SalaryItem[];
  deductions: SalaryItem[];
  /** Excel tartibida barcha qatorlar (Telegram bot formati): 004, 007, ..., Итого начислено, ИНПС, ..., Итого удержано */
  details: { label: string; amount: number }[];
}

export interface SalaryEmployee {
  full_name: string;
  tab_number: string;
  position: string;
  sex_number: string;
  oklad: string;
  stavka: string;
}

/** Foydalanuvchining oyliklari (tabel raqami bo'yicha), eng yangi oy birinchi */
export function fetchMySalary(): Promise<{ tab_number: string | null; employee: SalaryEmployee | null; records: SalaryRecord[] }> {
  return request('/api/me/salary/', { method: 'GET' });
}

/** Telegram bot formati: 7127768 -> "7 127 768,00" */
export function formatAmount(value: string | number): string {
  const n = Number(value) || 0;
  const [int, frac] = Math.abs(n).toFixed(2).split(".");
  return `${n < 0 ? "-" : ""}${int.replace(/B(?=(d{3})+(?!d))/g, " ")},${frac}`;
}

/** 7850000.5 -> "7 850 000" (tiyinsiz, bo'shliq bilan) */
export function formatSum(value: string | number): string {
  const n = Math.round(Number(value) || 0);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

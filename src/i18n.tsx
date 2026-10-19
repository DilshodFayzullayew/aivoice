import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RU } from './i18n.ru';

/**
 * Ilova interfeysi ikki tilda: o'zbekcha (asosiy) va ruscha.
 * Kalit — o'zbekcha matnning o'zi: t('Bosing va gapiring'). Ruscha tarjima i18n.ru.ts da.
 * Bilimlar bazasi, AI javoblari va o'quv materiallari (ruscha) tarjima qilinmaydi.
 * O'zgaruvchilar: t('Savol {n} / {total}', { n: 1, total: 20 }).
 */
export type Lang = 'uz' | 'ru';
const LANG_KEY = 'app_lang';

// Komponentdan tashqaridagi kod uchun (API xatolari, sana yorliqlari)
let currentLang: Lang = 'uz';

export function translate(text: string, vars?: Record<string, string | number>, lang: Lang = currentLang): string {
  let out = lang === 'ru' ? RU[text] ?? text : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Komponentdan tashqarida (hook'siz) tarjima */
export const tr = (text: string, vars?: Record<string, string | number>) => translate(text, vars);

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (text: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue>({ lang: 'uz', setLang: () => {}, t: (s, v) => translate(s, v, 'uz') });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('uz');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((v) => {
        if (v === 'uz' || v === 'ru') {
          currentLang = v;
          setLangState(v);
        }
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    currentLang = l;
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  }, []);

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t: (s, v) => translate(s, v, lang) }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

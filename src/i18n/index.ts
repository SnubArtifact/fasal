import { createContext, useContext } from 'react';
import type { LangCode } from '../types';
import { en, type TKey } from './en';
import { hi } from './hi';

export interface LanguageOption {
  code: LangCode;
  /** Name written in the language itself — the only label a farmer can rely on. */
  native: string;
  latin: string;
  ready: boolean;
}

/**
 * All seven languages are listed. Only the two that are fully translated are
 * selectable — showing an untranslated language as available would be a worse
 * failure than showing it as pending.
 */
export const LANGUAGES: LanguageOption[] = [
  { code: 'hi', native: 'हिंदी', latin: 'Hindi', ready: true },
  { code: 'en', native: 'English', latin: 'English', ready: true },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', latin: 'Punjabi', ready: false },
  { code: 'mr', native: 'मराठी', latin: 'Marathi', ready: false },
  { code: 'gu', native: 'ગુજરાતી', latin: 'Gujarati', ready: false },
  { code: 'bn', native: 'বাংলা', latin: 'Bengali', ready: false },
  { code: 'te', native: 'తెలుగు', latin: 'Telugu', ready: false },
];

const DICTIONARIES: Partial<Record<LangCode, Record<TKey, string>>> = {
  en,
  hi,
};

export function translate(lang: LangCode, key: TKey): string {
  const dict = DICTIONARIES[lang];
  return dict?.[key] ?? en[key] ?? key;
}

export const LangContext = createContext<LangCode>('en');

/** `t` is the only thing screens need in order to be fully translated. */
export function useT() {
  const lang = useContext(LangContext);
  return {
    lang,
    t: (key: TKey) => translate(lang, key),
    /** Digits stay Latin: farmers read rupee amounts and IDs off printed slips. */
    n: (value: number) => value.toLocaleString('en-IN'),
  };
}

const RECENT_KEY = 'fasalnyay.recentLangs';

export function getRecentLanguages(): LangCode[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c): c is LangCode =>
      LANGUAGES.some((l) => l.code === c && l.ready),
    );
  } catch {
    return [];
  }
}

export function rememberLanguage(code: LangCode) {
  try {
    const next = [code, ...getRecentLanguages().filter((c) => c !== code)].slice(0, 3);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* A kiosk with storage disabled simply shows no recent languages. */
  }
}

export type { TKey };

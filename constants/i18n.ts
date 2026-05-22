import { getLocales } from 'expo-localization';

import en from '@/constants/locales/en.json';
import es from '@/constants/locales/es.json';
import fr from '@/constants/locales/fr.json';
import ru from '@/constants/locales/ru.json';
import uk from '@/constants/locales/uk.json';

export type LanguageCode = 'en' | 'ru' | 'uk' | 'fr' | 'es';

const supportedLanguageCodes = ['en', 'ru', 'uk', 'fr', 'es'] as const;

export const languageLocaleMap: Record<LanguageCode, string> = {
  en: 'en-GB',
  es: 'es-ES',
  ru: 'ru-RU',
  uk: 'uk-UA',
  fr: 'fr-FR',
};

export const languageLabels: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
  ru: 'Русский',
  uk: 'Українська',
  fr: 'Français',
};

export type TranslationMap = Record<string, string>;

export const translations: Record<LanguageCode, TranslationMap> = {
  en,
  es,
  ru,
  uk,
  fr,
};

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && supportedLanguageCodes.includes(value as LanguageCode);
}

function normalizeLanguageCodeFromLocale(locale: string): LanguageCode | null {
  const normalizedLocale = locale.trim().toLowerCase();

  if (!normalizedLocale) {
    return null;
  }

  const baseLanguageCode = normalizedLocale.split(/[-_]/)[0];

  return isLanguageCode(baseLanguageCode) ? baseLanguageCode : null;
}

export function detectPreferredLanguage(): LanguageCode {
  const localeCandidates = [
    ...getLocales().flatMap((locale) => [locale.languageCode, locale.languageTag]),
    Intl.DateTimeFormat().resolvedOptions().locale,
  ];

  for (const localeCandidate of localeCandidates) {
    if (!localeCandidate) {
      continue;
    }

    const languageCode = normalizeLanguageCodeFromLocale(localeCandidate);

    if (languageCode) {
      return languageCode;
    }
  }

  return 'en';
}

export function translate(languageCode: LanguageCode, key: string, vars?: Record<string, string | number>): string {
  const table = translations[languageCode] || translations.en;
  const fallback = translations.en[key] || key;
  const template = table[key] || fallback;

  if (!vars) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}

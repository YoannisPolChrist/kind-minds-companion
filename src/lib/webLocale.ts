import { normalizeLanguage, type LanguageCode } from "../runtime/languageStore";

export type LocalizedText = {
  de: string;
} & Partial<Record<LanguageCode, string>>;

const DEFAULT_LANGUAGE: LanguageCode = "de";

const SPEECH_RECOGNITION_LOCALES: Record<LanguageCode, string> = {
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
};

export function getLanguage(locale?: string | null): LanguageCode {
  return normalizeLanguage(locale) ?? DEFAULT_LANGUAGE;
}

export function translate(locale: string | null | undefined, text: LocalizedText) {
  const language = getLanguage(locale);
  return text[language] ?? text.de;
}

export function getSpeechRecognitionLocale(locale?: string | null) {
  return SPEECH_RECOGNITION_LOCALES[getLanguage(locale)];
}

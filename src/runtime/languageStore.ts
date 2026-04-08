import { create } from "zustand";

export type LanguageCode = "de" | "en" | "es" | "fr" | "it";
export type LanguagePreferenceSource = "auto" | "manual";

export interface StorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
}

export interface LanguageStoreConfig {
  storage?: StorageAdapter;
  defaultLocale?: LanguageCode;
  availableLocales?: { code: LanguageCode; label: string }[];
  onLocaleChange?: (locale: LanguageCode) => void;
  detectLocale?: () => LanguageCode | null;
  fetchPreferredLanguage?: (input: {
    userId?: string;
    preferredLanguage?: string | null;
    legacyLanguage?: string | null;
  }) => Promise<LanguageCode | null>;
  persistPreferredLanguage?: (input: { userId?: string; locale: LanguageCode }) => Promise<void>;
}

export interface LanguageStoreState {
  locale: LanguageCode;
  availableLocales: { code: LanguageCode; label: string }[];
  loading: boolean;
  setLocale: (locale: LanguageCode, userId?: string) => Promise<void>;
  initLocale: (userId?: string, preferredLanguage?: string | null, legacyLanguage?: string | null) => Promise<void>;
}

const DEFAULT_AVAILABLE_LOCALES: { code: LanguageCode; label: string }[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Espanol" },
  { code: "fr", label: "Francais" },
  { code: "it", label: "Italiano" },
];

const LANGUAGE_STORAGE_KEY = "user-language";
const LANGUAGE_SOURCE_STORAGE_KEY = "user-language-source";

function parseLanguagePreferenceSource(input?: string | null): LanguagePreferenceSource | null {
  return input === "manual" || input === "auto" ? input : null;
}

export function readStoredLanguagePreference(): LanguageCode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return normalizeLanguage(window.localStorage?.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function readStoredLanguagePreferenceSource(): LanguagePreferenceSource | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return parseLanguagePreferenceSource(window.localStorage?.getItem(LANGUAGE_SOURCE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function readStoredExplicitLanguagePreference(): LanguageCode | null {
  return readStoredLanguagePreferenceSource() === "manual" ? readStoredLanguagePreference() : null;
}

export function normalizeLanguage(input?: string | null): LanguageCode | null {
  if (!input) return null;
  const base = input.toLowerCase().split("-")[0];
  return DEFAULT_AVAILABLE_LOCALES.some((locale) => locale.code === base) ? (base as LanguageCode) : null;
}

export function resolveExplicitLanguage(input: {
  preferredLanguage?: string | null;
  legacyLanguage?: string | null;
}): LanguageCode | null {
  return normalizeLanguage(input.preferredLanguage) ?? normalizeLanguage(input.legacyLanguage);
}

function readExpoLocales(): Array<{ languageTag?: string; languageCode?: string | null }> {
  try {
    // Avoid a hard dependency during web builds and node-based tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const localization = require("expo-localization");
    return typeof localization?.getLocales === "function" ? localization.getLocales() : [];
  } catch {
    return [];
  }
}

export function detectRuntimeLanguage(): LanguageCode | null {
  for (const locale of readExpoLocales()) {
    const detected =
      normalizeLanguage(locale.languageTag) ??
      normalizeLanguage(locale.languageCode);
    if (detected) {
      return detected;
    }
  }

  if (typeof navigator !== "undefined") {
    const candidates = [...(navigator.languages ?? []), navigator.language];
    for (const candidate of candidates) {
      const detected = normalizeLanguage(candidate);
      if (detected) {
        return detected;
      }
    }
  }

  return null;
}

function createBrowserStorageAdapter(): StorageAdapter {
  return {
    async getItem(key: string) {
      if (typeof window === "undefined") return null;
      try {
        return window.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    async setItem(key: string, value: string) {
      if (typeof window === "undefined") return;
      try {
        window.localStorage?.setItem(key, value);
      } catch {
        // ignore quota errors
      }
    },
  };
}

function createMemoryStorageAdapter(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    getItem(key) {
      return map.get(key) ?? null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
}

export function createLanguageStore(config?: LanguageStoreConfig) {
  const storage = config?.storage ?? (typeof window === "undefined" ? createMemoryStorageAdapter() : createBrowserStorageAdapter());
  const availableLocales = config?.availableLocales ?? DEFAULT_AVAILABLE_LOCALES;
  const defaultLocale = config?.defaultLocale ?? "de";

  async function persistResolvedLocale(locale: LanguageCode, source: LanguagePreferenceSource) {
    await storage.setItem(LANGUAGE_STORAGE_KEY, locale);
    await storage.setItem(LANGUAGE_SOURCE_STORAGE_KEY, source);
  }

  async function resolveLocale(
    userId?: string,
    preferredLanguage?: string | null,
    legacyLanguage?: string | null
  ): Promise<{ locale: LanguageCode; source: LanguagePreferenceSource }> {
    const fromProfile = resolveExplicitLanguage({ preferredLanguage, legacyLanguage });
    if (fromProfile) return { locale: fromProfile, source: "manual" };

    if (config?.fetchPreferredLanguage) {
      const fromRemote = await config.fetchPreferredLanguage({ userId, preferredLanguage, legacyLanguage });
      if (fromRemote) return { locale: fromRemote, source: "manual" };
    }

    const fromStorage = normalizeLanguage(await storage.getItem(LANGUAGE_STORAGE_KEY));
    const fromStorageSource = parseLanguagePreferenceSource(await storage.getItem(LANGUAGE_SOURCE_STORAGE_KEY));
    if (fromStorage) return { locale: fromStorage, source: fromStorageSource ?? "manual" };

    const detectedLocale = config?.detectLocale
      ? config.detectLocale()
      : detectRuntimeLanguage();
    if (detectedLocale) return { locale: detectedLocale, source: "auto" };

    return { locale: defaultLocale, source: "auto" };
  }

  const store = create<LanguageStoreState>((set) => ({
    locale: defaultLocale,
    availableLocales,
    loading: true,
    setLocale: async (nextLocale, userId) => {
      const normalized = normalizeLanguage(nextLocale) ?? defaultLocale;
      await persistResolvedLocale(normalized, "manual");
      if (userId && config?.persistPreferredLanguage) {
        await config.persistPreferredLanguage({ userId, locale: normalized });
      }
      config?.onLocaleChange?.(normalized);
      set({ locale: normalized });
    },
    initLocale: async (userId, preferredLanguage, legacyLanguage) => {
      set({ loading: true });
      const resolved = await resolveLocale(userId, preferredLanguage, legacyLanguage);
      await persistResolvedLocale(resolved.locale, resolved.source);
      config?.onLocaleChange?.(resolved.locale);
      set({ locale: resolved.locale, loading: false });
    },
  }));

  return store;
}

export type UseLanguageStore = ReturnType<typeof createLanguageStore>;

export const useLanguageStore = createLanguageStore();

import {
  createLanguageStore,
  normalizeLanguage,
  resolveExplicitLanguage,
  type LanguageCode,
  type StorageAdapter,
} from "../src/runtime/languageStore";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import i18n from "../utils/i18n";

function getNativeAsyncStorage() {
  try {
    // Keep native storage available without forcing web builds to parse the module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@react-native-async-storage/async-storage").default as {
      getItem: (key: string) => Promise<string | null>;
      setItem: (key: string, value: string) => Promise<void>;
    };
  } catch {
    return null;
  }
}

const storageAdapter: StorageAdapter = {
  getItem(key: string) {
    if (typeof window !== "undefined") {
      return Promise.resolve(window.localStorage?.getItem(key) ?? null);
    }

    return getNativeAsyncStorage()?.getItem(key) ?? Promise.resolve(null);
  },
  setItem(key: string, value: string) {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem(key, value);
      return Promise.resolve();
    }

    return getNativeAsyncStorage()?.setItem(key, value) ?? Promise.resolve();
  },
};

async function fetchRemoteLanguage({
  userId,
  preferredLanguage,
  legacyLanguage,
}: {
  userId?: string;
  preferredLanguage?: string | null;
  legacyLanguage?: string | null;
}): Promise<LanguageCode | null> {
  const preferred = resolveExplicitLanguage({ preferredLanguage, legacyLanguage });
  if (preferred) {
    return preferred;
  }

  if (!userId) {
    return null;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return null;
    }

    return resolveExplicitLanguage({
      preferredLanguage: userDoc.data().preferences?.language,
      legacyLanguage: userDoc.data().language,
    });
  } catch (error) {
    console.warn("Failed to fetch remote language preference:", error);
    return null;
  }
}

async function persistRemoteLanguage({ userId, locale }: { userId?: string; locale: LanguageCode }) {
  if (!userId) {
    return;
  }

  try {
    await setDoc(
      doc(db, "users", userId),
      {
        preferences: { language: locale },
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Failed to persist remote language preference:", error);
  }
}

export const useLanguageStore = createLanguageStore({
  storage: storageAdapter,
  defaultLocale: "de",
  onLocaleChange: (locale) => {
    i18n.locale = locale;
  },
  fetchPreferredLanguage: fetchRemoteLanguage,
  persistPreferredLanguage: persistRemoteLanguage,
});

export type { LanguageCode };

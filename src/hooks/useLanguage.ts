import { useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore/lite";
import { useAuth } from "./useAuth";
import {
  createLanguageStore,
  resolveExplicitLanguage,
  type LanguageCode,
} from "../runtime/languageStore";
import { db } from "../lib/firebaseDb";

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

async function persistRemoteLanguage({
  userId,
  locale,
}: {
  userId?: string;
  locale: LanguageCode;
}) {
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

const useWebLanguageStore = createLanguageStore({
  defaultLocale: "de",
  onLocaleChange: (locale) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  },
  fetchPreferredLanguage: fetchRemoteLanguage,
  persistPreferredLanguage: persistRemoteLanguage,
});

export { LanguageCode };

export function useLanguage() {
  const locale = useWebLanguageStore((state) => state.locale);
  const setLocaleStore = useWebLanguageStore((state) => state.setLocale);
  const { user } = useAuth();

  return {
    locale,
    setLanguage: async (lang: string) => {
      await setLocaleStore(lang as LanguageCode, user?.uid);
    },
  };
}

export function LanguageSync() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      void useWebLanguageStore.getState().initLocale(
        user?.uid,
        profile?.preferences?.language,
        profile?.language
      );
    }
  }, [user?.uid, profile?.preferences?.language, profile?.language, loading]);

  return null;
}

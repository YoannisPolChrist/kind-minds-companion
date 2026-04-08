import { useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore/lite";
import { useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import {
  createLanguageStore,
  normalizeLanguage,
  resolveExplicitLanguage,
  type LanguageCode,
} from "../runtime/languageStore";
import { db } from "../lib/firebaseDb";
import {
  getCompanionLanguageFromPath,
  resolveCompanionPathForLanguage,
} from "../runtime/companionPath";

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
  const loading = useWebLanguageStore((state) => state.loading);
  const setLocaleStore = useWebLanguageStore((state) => state.setLocale);
  const { user } = useAuth();

  return {
    locale,
    loading,
    setLanguage: async (lang: string) => {
      const normalized = normalizeLanguage(lang) ?? "de";
      await setLocaleStore(normalized, user?.uid);

      if (typeof window === "undefined") {
        return;
      }

      const redirectTarget = resolveCompanionPathForLanguage(
        window.location.pathname,
        normalized,
        window.location.search,
        window.location.hash
      );

      if (redirectTarget && redirectTarget !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.location.replace(redirectTarget);
      }
    },
  };
}

export function LanguageSync() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const locale = useWebLanguageStore((state) => state.locale);
  const localeLoading = useWebLanguageStore((state) => state.loading);

  useEffect(() => {
    if (!loading) {
      const pathLocale = getCompanionLanguageFromPath(location.pathname);
      const profilePreference = profile?.preferences?.language;
      void useWebLanguageStore.getState().initLocale(
        user?.uid,
        profilePreference ?? pathLocale,
        profilePreference ? profile?.language : pathLocale ? null : profile?.language
      );
    }
  }, [user?.uid, profile?.preferences?.language, profile?.language, loading, location.pathname]);

  useEffect(() => {
    if (loading || localeLoading || typeof window === "undefined") {
      return;
    }

    const pathLocale = getCompanionLanguageFromPath(location.pathname);
    const normalizedLocale = normalizeLanguage(locale);
    if (!normalizedLocale || pathLocale === normalizedLocale) {
      return;
    }

    const redirectTarget = resolveCompanionPathForLanguage(
      window.location.pathname,
      normalizedLocale,
      window.location.search,
      window.location.hash
    );

    if (redirectTarget && redirectTarget !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.location.replace(redirectTarget);
    }
  }, [locale, localeLoading, loading, location.pathname, location.search, location.hash]);

  return null;
}

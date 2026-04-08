import {
  detectRuntimeLanguage,
  normalizeLanguage,
  readStoredExplicitLanguagePreference,
  type LanguageCode,
} from "./languageStore";

export const COMPANION_PATH_SEGMENT = "Prozessbegleitung";

function getPathSegments(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

function getCompanionSegmentIndex(pathname: string) {
  return getPathSegments(pathname).findIndex(
    (segment) => segment.toLowerCase() === COMPANION_PATH_SEGMENT.toLowerCase()
  );
}

export function getCompanionLanguageFromPath(pathname: string) {
  const segments = getPathSegments(pathname);
  const baseIndex = getCompanionSegmentIndex(pathname);
  if (baseIndex < 0) {
    return null;
  }

  return normalizeLanguage(segments[baseIndex + 1]);
}

export function resolveCompanionBasename(pathname: string) {
  const segments = getPathSegments(pathname);
  const baseIndex = getCompanionSegmentIndex(pathname);
  if (baseIndex < 0) {
    return "/";
  }

  const baseSegments = segments.slice(0, baseIndex + 1);
  const pathLanguage = normalizeLanguage(segments[baseIndex + 1]);
  if (pathLanguage) {
    baseSegments.push(pathLanguage);
  }

  return `/${baseSegments.join("/")}`;
}

export function resolveCompanionPathForLanguage(
  pathname: string,
  language: LanguageCode,
  search = "",
  hash = ""
) {
  const segments = getPathSegments(pathname);
  const baseIndex = getCompanionSegmentIndex(pathname);
  if (baseIndex < 0) {
    return null;
  }

  const nextSegments = [...segments];
  const existingLanguage = normalizeLanguage(nextSegments[baseIndex + 1]);
  if (existingLanguage) {
    nextSegments[baseIndex + 1] = language;
  } else {
    nextSegments.splice(baseIndex + 1, 0, language);
  }

  return `/${nextSegments.join("/")}${search}${hash}`;
}

export function resolveCompanionLanguageRedirect(pathname: string, search = "", hash = "") {
  const baseIndex = getCompanionSegmentIndex(pathname);
  if (baseIndex < 0) {
    return null;
  }

  const currentLanguage = getCompanionLanguageFromPath(pathname);
  const explicitLanguage = readStoredExplicitLanguagePreference();
  const fallbackLanguage: LanguageCode = explicitLanguage ?? detectRuntimeLanguage() ?? "de";
  if (currentLanguage === fallbackLanguage) {
    return null;
  }

  return resolveCompanionPathForLanguage(pathname, fallbackLanguage, search, hash);
}

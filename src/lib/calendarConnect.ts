import { auth } from "./firebase";

const DEFAULT_FUNCTIONS_REGION = "us-central1";

function readEnvValue(key: string) {
  return (import.meta.env as Record<string, string | undefined>)[key]?.trim();
}

function deriveFunctionsBaseUrl() {
  const projectId =
    readEnvValue("VITE_FIREBASE_PROJECT_ID") ||
    readEnvValue("EXPO_PUBLIC_FIREBASE_PROJECT_ID");

  if (!projectId) {
    return null;
  }

  return `https://${DEFAULT_FUNCTIONS_REGION}-${projectId}.cloudfunctions.net`;
}

function readFunctionsBaseUrl() {
  const value =
    readEnvValue("VITE_FIREBASE_FUNCTIONS_BASE_URL") ||
    readEnvValue("EXPO_PUBLIC_FIREBASE_FUNCTIONS_BASE_URL") ||
    deriveFunctionsBaseUrl();

  if (!value) {
    throw new Error(
      "Missing Firebase Functions base URL. Set VITE_FIREBASE_FUNCTIONS_BASE_URL or EXPO_PUBLIC_FIREBASE_FUNCTIONS_BASE_URL."
    );
  }

  return value.replace(/\/+$/, "");
}

function readCalendarRedirectUrl() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/settings`;
}

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Nicht eingeloggt.");
  }

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseJsonResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "Anfrage fehlgeschlagen.";
    throw new Error(message);
  }

  return payload;
}

export async function startGoogleCalendarConnect() {
  const response = await fetch(`${readFunctionsBaseUrl()}/googleCalendarAuthStart`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      redirectUrl: readCalendarRedirectUrl(),
    }),
  });

  const payload = await parseJsonResponse(response);
  if (!payload?.authUrl) {
    throw new Error("Google-Autorisierung konnte nicht gestartet werden.");
  }

  window.location.assign(payload.authUrl as string);
}

export async function disconnectGoogleCalendar() {
  const response = await fetch(`${readFunctionsBaseUrl()}/googleCalendarDisconnect`, {
    method: "POST",
    headers: await getAuthHeaders(),
  });

  return parseJsonResponse(response);
}

export interface GoogleCalendarAppointmentPayload {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  location?: string;
}

export async function syncGoogleCalendarAppointment(appointment: GoogleCalendarAppointmentPayload) {
  const response = await fetch(`${readFunctionsBaseUrl()}/googleCalendarSyncAppointment`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ appointment }),
  });

  return parseJsonResponse(response);
}

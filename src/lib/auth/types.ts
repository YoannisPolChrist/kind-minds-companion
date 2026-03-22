export type CalendarProvider = "device" | "google" | "icloud";
export type CalendarConnectionStatus = "connected" | "disconnected" | "error" | "available";

export interface ProviderConnectionSummary {
  provider: CalendarProvider;
  status: CalendarConnectionStatus;
  email?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
  lastError?: string;
}

export interface CalendarConnectionSummary {
  google?: ProviderConnectionSummary;
  apple?: ProviderConnectionSummary;
}

export interface UserProfile {
  id: string;
  email: string;
  role: "client" | "therapist";
  firstName?: string;
  lastName?: string;
  language?: string;
  preferences?: {
    language?: string;
  };
  therapistId?: string;
  nextAppointment?: string;
  bookingUrl?: string;
  onboardingCompleted?: boolean;
  calendarConnectionSummary?: CalendarConnectionSummary;
}

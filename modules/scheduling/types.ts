export type CalendarProvider = 'device' | 'google' | 'icloud';
export type CalendarConnectionStatus = 'connected' | 'disconnected' | 'error' | 'available';

export interface AppointmentDetails {
    id: string;
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    therapistName?: string;
    clientName?: string;
    location?: string;
}

export interface CalendarTarget {
    id: string;
    title: string;
    provider: CalendarProvider;
}

export interface CalendarLink {
    provider: CalendarProvider;
    label: string;
    url: string;
}

export interface AppointmentSyncResult {
    success: boolean;
    provider?: CalendarProvider;
    calendarId?: string;
    eventId?: string;
    error?: Error;
}

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

export interface ClientProfile {
    id: string;
    role?: 'therapist' | 'client';
    firstName?: string;
    lastName?: string;
    email?: string;
    language?: string;
    preferences?: {
        language?: string;
    };
    nextAppointment?: string;
    location?: string;
    defaultLocation?: string;
    [key: string]: unknown;
}

export interface ClientOverview {
    client: ClientProfile | null;
    exerciseCount: number;
    completedCount: number;
    checkinCount: number;
}

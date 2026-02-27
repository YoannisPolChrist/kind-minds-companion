// Shared domain types for the TherapyClientApp

export type ExerciseBlockType =
    | 'reflection'
    | 'text'       // legacy alias for reflection
    | 'scale'
    | 'choice'
    | 'checklist'
    | 'homework'
    | 'gratitude'
    | 'info'
    | 'timer'
    | 'breathing'
    | 'media';

export interface ExerciseBlock {
    id: string;
    type: ExerciseBlockType;
    content: string;
    duration?: number;
    options?: string[];
    minLabel?: string;
    maxLabel?: string;
    mediaUri?: string;
    mediaType?: 'image' | 'video';
    mediaSize?: 'small' | 'medium' | 'large';
}

export interface Exercise {
    id: string;
    title: string;
    description?: string;
    clientId: string;
    therapistId?: string;
    blocks: ExerciseBlock[];
    completed: boolean;
    recurrence?: 'none' | 'daily' | 'weekly';
    answers?: Record<string, string>;
    lastCompletedAt?: string;
    createdAt?: string;
    reminderFrequency?: string;
    archived?: boolean;
}

export interface UserProfile {
    id: string;
    uid: string;
    role: 'therapist' | 'client';
    firstName: string;
    lastName: string;
    email?: string;
    therapistId?: string;
    bookingUrl?: string;
}

export interface CheckinEntry {
    uid: string;
    date: string;           // ISO date string YYYY-MM-DD
    mood: number;           // 1-10
    tags: string[];
    note: string;
    createdAt: string;
}

export interface ExerciseTemplate {
    id: string;
    title: string;
    blocks: ExerciseBlock[];
    createdAt: string;
}

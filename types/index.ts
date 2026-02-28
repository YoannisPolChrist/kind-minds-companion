/**
 * types/index.ts
 *
 * Central type definitions for the TherapyProzessOptimierung app.
 */

export interface Exercise {
    id: string;
    title: string;
    description?: string;
    recurrence?: 'daily' | 'weekly' | 'none';
    completed?: boolean;
    completedAt?: string;
    lastCompletedAt?: string;
    createdAt?: string;
    therapistId?: string;
    archived?: boolean;
    reminderFrequency?: string;
    blocks?: ExerciseBlock[];
}

export interface ExerciseBlock {
    id: string;
    type: 'text' | 'video' | 'reflection' | 'breathing' | 'timer' | 'info' | 'media' | 'scale' | 'choice' | 'checklist' | 'homework' | 'gratitude';
    content?: string;
    mediaUri?: string;
    videoUrl?: string; // fallback
    duration?: number; // for timers/breathing
    options?: string[]; // for choice/checklist
    mediaSize?: 'small' | 'medium' | 'large';
    mediaType?: 'image' | 'video';
    minLabel?: string; // for scale
    maxLabel?: string; // for scale
}

export interface UserProfile {
    id: string;
    email: string;
    role: 'client' | 'therapist';
    firstName?: string;
    lastName?: string;
    phone?: string;
    bookingUrl?: string;
}

export interface Checkin {
    id?: string;
    uid: string;
    date: string;
    mood: number;
    tags: string[];
    note?: string;
    duration?: number;
    createdAt: string;
}

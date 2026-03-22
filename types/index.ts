/**
 * types/index.ts
 *
 * Central type definitions for the TherapyProzessOptimierung app.
 */

export interface Exercise {
    id: string;
    clientId?: string;
    title: string;
    coverImage?: string;
    themeColor?: string;
    description?: string;
    recurrence?: 'daily' | 'weekly' | 'none';
    recurrenceDays?: string[];
    status?: 'assigned' | 'open' | 'in_progress' | 'completed' | 'archived';
    completed?: boolean;
    completedAt?: string;
    lastCompletedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    assignedAt?: string;
    dueDate?: string;
    therapistId?: string;
    archived?: boolean;
    archivedAt?: string;
    reminderFrequency?: string;
    reminderTime?: string; // Optional specific time "HH:mm" for the reminder
    blocks?: ExerciseBlock[];
    answers?: Record<string, string>;
    draftAnswers?: Record<string, any>;
    draftSavedAt?: string;
    sharedAnswers?: boolean;
}

export interface ExerciseBlock {
    id: string;
    type: 'text' | 'video' | 'reflection' | 'breathing' | 'timer' | 'info' | 'media' | 'scale' | 'choice' | 'checklist' | 'homework' | 'gratitude' | 'spider_chart' | 'bar_chart' | 'pie_chart' | 'line_chart';
    content?: string;
    mediaUri?: string;
    videoUrl?: string;
    duration?: number;
    options?: string[];
    mediaSize?: 'small' | 'medium' | 'large';
    mediaType?: 'image' | 'video';
    minLabel?: string;
    maxLabel?: string;
}

export interface UserProfile {
    id: string;
    email: string;
    role: 'client' | 'therapist';
    firstName?: string;
    lastName?: string;
    phone?: string;
    bookingUrl?: string;

    // Extended Client Profile Fields
    birthDate?: string;
    profilePictureUrl?: string;
    therapistId?: string;
    isOfflineProfile?: boolean;
    linkedAuthUid?: string;
    onboardingCompleted?: boolean;
    nextAppointment?: string;
    language?: string;
    lastActivePlatform?: string;
}

export interface Invitation {
    id: string;
    code: string;
    therapistId: string;
    targetOfflineProfileId?: string;
    status: 'pending' | 'used' | 'expired';
    usedBy?: string;
    createdAt: any; // Firestore Timestamp
}

export interface Checkin {
    id?: string;
    uid: string;
    date: string;
    mood: number;
    tags: string[];
    energy?: number; // 1-10
    note?: string;
    duration?: number;
    createdAt: string;
}

export * from './githubBenchmark';

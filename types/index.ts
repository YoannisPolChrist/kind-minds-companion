/**
 * types/index.ts
 *
 * Central type definitions for the TherapyProzessOptimierung app.
 */

export interface Exercise {
    id: string;
    title: string;
    coverImage?: string;
    themeColor?: string;
    description?: string;
    recurrence?: 'daily' | 'weekly' | 'none';
    completed?: boolean;
    completedAt?: string;
    lastCompletedAt?: string;
    createdAt?: string;
    therapistId?: string;
    archived?: boolean;
    reminderFrequency?: string;
    reminderTime?: string; // Optional specific time "HH:mm" for the reminder
    blocks?: ExerciseBlock[];
}

/** Specifies when a block should be shown, based on a prior block's answer */
export interface BlockCondition {
    /** ID of the block whose answer is evaluated */
    sourceBlockId: string;
    /** Operator to test against the threshold */
    operator: '>=' | '<=' | '==' | '>' | '<' | '!=';
    /** Value to compare against (numeric for scale, string for choice) */
    value: string;
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
    /** Optional: only show this block when the condition evaluates to true */
    condition?: BlockCondition;
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
}

export interface Invitation {
    id: string;
    code: string;
    therapistId: string;
    targetOfflineProfileId?: string;
    status: 'pending' | 'used' | 'expired';
    createdAt: any; // Firestore Timestamp
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

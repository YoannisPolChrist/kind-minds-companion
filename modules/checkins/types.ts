export interface CheckinRecord {
    id: string;
    uid: string;
    date: string;
    mood: number;
    emotionId?: string;
    note?: string;
    slot?: 'morning' | 'evening';
    createdAt?: string;
    [key: string]: unknown;
}

export interface CheckinStatusSnapshot {
    checkedInToday: boolean;
    recentCheckins: CheckinRecord[];
}

export interface CheckinPayload {
    uid: string;
    mood: number;
    emotionId?: string;
    note?: string;
    tags?: string[];
    energy?: number;
    duration?: number;
    date: string;
    slot?: 'morning' | 'evening';
    createdAt?: string;
}

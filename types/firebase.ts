import { Timestamp } from 'firebase/firestore';

export interface BaseRecord {
    id: string;
    createdAt?: Timestamp | Date | any;
    updatedAt?: Timestamp | Date | any;
}

export interface Client extends BaseRecord {
    firstName: string;
    lastName: string;
    email: string;
    role: 'client';
    therapistId?: string;
    isActive: boolean;
}

export interface Therapist extends BaseRecord {
    firstName: string;
    lastName: string;
    email: string;
    role: 'therapist';
}

export interface FileResource extends BaseRecord {
    clientId?: string;
    therapistId?: string;
    title: string;
    description?: string;
    type: 'document' | 'video' | 'image' | 'link' | 'pdf';
    url: string;
    originalName?: string;
    storagePath?: string;
    fileSize?: number;
    mimeType?: string;
    isGlobal?: boolean;
}

export interface Note extends BaseRecord {
    clientId: string;
    title?: string;
    content: string;
    imageUrl?: string;
    type: 'journal' | 'session' | 'manual';
    authorRole: 'client' | 'therapist';
    isShared?: boolean;
}

export interface Checkin extends BaseRecord {
    uid: string;
    timestamp: Timestamp | Date | any;
    mood: number;
    emotions: string[];
    energy: string;
    sleep: string;
    activities: string[];
    triggers: string;
    journal: string;
}

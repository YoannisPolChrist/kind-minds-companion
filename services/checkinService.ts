/**
 * checkinService.ts
 *
 * Centralized service for all Firestore mutations related to daily check-ins.
 */

import { db } from '../utils/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { queueSyncAction } from '../utils/SyncManager';

export interface CheckinPayload {
    uid: string;
    mood: number;         // 1–5
    note?: string;
    tags?: string[];
    duration?: number;
    date: string;         // ISO date string "YYYY-MM-DD"
    slot?: 'morning' | 'evening'; // Morning (00:00-12:00) or Evening (12:00-24:00)
    createdAt?: string;
}

/**
 * Submit a daily check-in for a user.
 * Document ID is deterministic: `{uid}_{date}_{slot}` — prevents duplicate entries per slot.
 * Uses SyncManager for offline capability.
 */
export async function submitCheckin(payload: CheckinPayload, isConnected: boolean): Promise<void> {
    const docId = payload.slot ? `${payload.uid}_${payload.date}_${payload.slot}` : `${payload.uid}_${payload.date}`;

    const checkinData = {
        ...payload,
        createdAt: payload.createdAt || new Date().toISOString(),
    };

    if (isConnected) {
        await setDoc(doc(db, 'checkins', docId), checkinData);
    } else {
        await queueSyncAction({
            type: 'SAVE_CHECKIN',
            payload: checkinData
        });
    }
}

/**
 * Update the mood or note of an existing check-in.
 * Only allowed on the same day.
 */
export async function updateCheckin(
    uid: string,
    date: string,
    updates: Partial<Pick<CheckinPayload, 'mood' | 'note' | 'duration' | 'slot'>>
): Promise<void> {
    const docId = updates.slot ? `${uid}_${date}_${updates.slot}` : `${uid}_${date}`;
    await setDoc(doc(db, 'checkins', docId), updates, { merge: true });
}


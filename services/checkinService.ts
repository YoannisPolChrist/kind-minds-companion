/**
 * checkinService.ts
 *
 * Centralized service for all Firestore mutations related to daily check-ins.
 */

import { doc, setDoc } from 'firebase/firestore';
import { normalizeMoodToHundred } from '../utils/checkinMood';
import { queueSyncAction } from '../utils/SyncManager';
import { db } from '../utils/firebase';

export interface CheckinPayload {
    uid: string;
    mood: number;
    note?: string;
    tags?: string[];
    energy?: number; // 1-10
    duration?: number;
    date: string; // ISO date string "YYYY-MM-DD"
    slot?: 'morning' | 'evening';
    createdAt?: string;
}

/**
 * Submit a daily check-in for a user.
 * Document ID is deterministic: `{uid}_{date}_{slot}`.
 */
export async function submitCheckin(payload: CheckinPayload, isConnected: boolean): Promise<void> {
    const docId = payload.slot ? `${payload.uid}_${payload.date}_${payload.slot}` : `${payload.uid}_${payload.date}`;

    const checkinData = {
        ...payload,
        mood: normalizeMoodToHundred(payload.mood),
        createdAt: payload.createdAt || new Date().toISOString(),
    };

    if (isConnected) {
        await setDoc(doc(db, 'checkins', docId), checkinData);
    } else {
        await queueSyncAction({
            type: 'SAVE_CHECKIN',
            payload: checkinData,
        });
    }
}

/**
 * Update the mood or note of an existing check-in.
 */
export async function updateCheckin(
    uid: string,
    date: string,
    updates: Partial<Pick<CheckinPayload, 'mood' | 'note' | 'duration' | 'slot'>>
): Promise<void> {
    const docId = updates.slot ? `${uid}_${date}_${updates.slot}` : `${uid}_${date}`;
    const payload = {
        ...updates,
        ...(updates.mood !== undefined ? { mood: normalizeMoodToHundred(updates.mood) } : {}),
    };

    await setDoc(doc(db, 'checkins', docId), payload, { merge: true });
}

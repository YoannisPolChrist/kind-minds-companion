/**
 * checkinService.ts
 *
 * Centralized service for all Firestore mutations related to daily check-ins.
 */

import { db } from '../utils/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface CheckinPayload {
    uid: string;
    mood: number;         // 1–5
    note?: string;
    date: string;         // ISO date string "YYYY-MM-DD"
}

/**
 * Submit a daily check-in for a user.
 * Document ID is deterministic: `{uid}_{date}` — prevents duplicate entries.
 */
export async function submitCheckin(payload: CheckinPayload): Promise<void> {
    const docId = `${payload.uid}_${payload.date}`;
    await setDoc(doc(db, 'checkins', docId), {
        ...payload,
        submittedAt: new Date().toISOString(),
    });
}

/**
 * Update the mood or note of an existing check-in.
 * Only allowed on the same day.
 */
export async function updateCheckin(
    uid: string,
    date: string,
    updates: Partial<Pick<CheckinPayload, 'mood' | 'note'>>
): Promise<void> {
    const docId = `${uid}_${date}`;
    await setDoc(doc(db, 'checkins', docId), updates, { merge: true });
}

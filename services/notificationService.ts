/**
 * notificationService.ts
 *
 * Centralized service for in-app notification mutations.
 */

import { db } from '../utils/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';

/**
 * Marks a list of notifications as read using a Firestore WriteBatch.
 * This is significantly more efficient than updating them one by one.
 */
export async function markNotificationsAsRead(notificationIds: string[]): Promise<void> {
    if (!notificationIds || notificationIds.length === 0) return;

    const batch = writeBatch(db);
    
    for (const id of notificationIds) {
        const docRef = doc(db, 'notifications', id);
        batch.update(docRef, { read: true });
    }

    await batch.commit();
}

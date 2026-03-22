import {
    addDoc,
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { clearCachedResource, loadCachedQuery } from '../shared';
import { CreateNotificationInput, NotificationRecord } from './types';
import { buildNotificationDocumentData, normalizeNotificationRecord, sortNotifications } from './utils';

function getUnreadNotificationsCacheKey(userId: string): string {
    return `notifications:unread:${userId}`;
}

export async function clearUnreadNotificationsCache(userId: string): Promise<void> {
    await clearCachedResource(getUnreadNotificationsCacheKey(userId));
}

export async function fetchUnreadNotifications(
    userId: string,
    options?: { forceFresh?: boolean; staleTimeMs?: number }
): Promise<NotificationRecord[]> {
    const policy = options?.staleTimeMs ? {
        category: 'summary',
        memoryTtlMs: options.staleTimeMs,
        diskTtlMs: options.staleTimeMs,
    } : 'summary';

    return loadCachedQuery({
        key: getUnreadNotificationsCacheKey(userId),
        policy,
        forceFresh: options?.forceFresh,
        onOfflineFallback: (error) => console.warn('Using offline notifications cache', error),
        load: async () => {
            const snapshot = await getDocs(query(
                collection(db, 'notifications'),
                where('userId', '==', userId),
                where('read', '==', false)
            ));

            return sortNotifications(
                snapshot.docs.map((entry) => normalizeNotificationRecord({
                    id: entry.id,
                    ...entry.data(),
                }))
            );
        },
    });
}

export async function markNotificationsAsRead(notificationIds: string[], userId?: string): Promise<void> {
    if (!notificationIds.length) {
        return;
    }

    const batch = writeBatch(db);
    for (const notificationId of notificationIds) {
        batch.update(doc(db, 'notifications', notificationId), { read: true });
    }

    await batch.commit();

    if (userId) {
        await clearUnreadNotificationsCache(userId);
    }
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
    await addDoc(
        collection(db, 'notifications'),
        buildNotificationDocumentData({
            ...input,
            createdAt: serverTimestamp(),
        })
    );

    await clearUnreadNotificationsCache(input.userId);
}

export async function createExerciseAssignedNotification(input: {
    userId: string;
    exerciseId?: string;
    exerciseTitle?: string;
}): Promise<void> {
    await createNotification({
        userId: input.userId,
        type: 'exercise_assigned',
        exerciseId: input.exerciseId,
        exerciseTitle: input.exerciseTitle,
    });
}

export async function createResourceSharedNotification(input: {
    userId: string;
    resourceId?: string;
    resourceTitle?: string;
    resourceType?: string;
    resourceCount?: number;
}): Promise<void> {
    await createNotification({
        userId: input.userId,
        type: 'resource_shared',
        resourceId: input.resourceId,
        resourceTitle: input.resourceTitle,
        resourceType: input.resourceType,
        resourceCount: input.resourceCount,
    });
}

export async function createFileUploadedNotification(input: {
    userId: string;
    fileName?: string;
}): Promise<void> {
    await createNotification({
        userId: input.userId,
        type: 'file_uploaded',
        fileName: input.fileName,
    });
}

export async function createAppointmentSavedNotification(input: {
    userId: string;
    appointmentLabel?: string;
}): Promise<void> {
    await createNotification({
        userId: input.userId,
        type: 'appointment_saved',
        appointmentLabel: input.appointmentLabel,
    });
}

export async function createCheckinReminderNotification(input: {
    userId: string;
}): Promise<void> {
    await createNotification({
        userId: input.userId,
        type: 'checkin_reminder',
    });
}

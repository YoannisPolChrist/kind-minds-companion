import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { queueSyncAction } from '../../utils/SyncManager';
import { clearCachedResource, getCachedResource, loadCachedQuery, setCachedResource } from '../shared';
import { HistoryEntry, sortHistoryEntries } from '../history/utils';
import { CheckinPayload, CheckinRecord, CheckinStatusSnapshot } from './types';
import {
    buildCheckinDocumentId,
    buildCheckinStatusSnapshot,
    createCheckinRecord,
    mergeCheckinRecords,
    resolveCheckinTime,
    sortCheckinRecords,
} from './utils';

export async function fetchCheckinStatusSnapshot(
    userId: string,
    options?: { forceFresh?: boolean; staleTimeMs?: number }
): Promise<CheckinStatusSnapshot> {
    const cacheKey = `checkins:status:${userId}`;
    const policy = options?.staleTimeMs ? {
        category: 'critical',
        memoryTtlMs: options.staleTimeMs,
        diskTtlMs: options.staleTimeMs,
    } : 'critical';

    return loadCachedQuery({
        key: cacheKey,
        policy,
        forceFresh: options?.forceFresh,
        onOfflineFallback: (error) => console.warn('Using offline checkin status cache', error),
        load: async () => {
            const checksSnap = await getDocs(query(collection(db, 'checkins'), where('uid', '==', userId)));
            const allChecks = sortCheckinRecords(
                checksSnap.docs.map((entry) => ({
                    id: entry.id,
                    ...(entry.data() as CheckinRecord),
                }))
            );

            return buildCheckinStatusSnapshot(allChecks);
        },
    });
}

export async function submitCheckin(payload: CheckinPayload, isConnected: boolean): Promise<void> {
    const docId = buildCheckinDocumentId(payload.uid, payload.date, payload.slot);
    const checkinData = {
        ...payload,
        createdAt: payload.createdAt || new Date().toISOString(),
    };
    const checkinRecord = createCheckinRecord({
        ...payload,
        createdAt: checkinData.createdAt,
    });

    if (isConnected) {
        await setDoc(doc(db, 'checkins', docId), checkinData);
        await Promise.all([
            applyOptimisticCheckinCaches(checkinRecord),
            clearCachedResource(`clients:overview:${payload.uid}`),
        ]);
        return;
    }

    await queueSyncAction({
        type: 'SAVE_CHECKIN',
        payload: checkinData,
    });
    await applyOptimisticCheckinCaches(checkinRecord);
}

export async function updateCheckin(
    uid: string,
    date: string,
    updates: Partial<Pick<CheckinPayload, 'mood' | 'note' | 'duration' | 'slot'>>
): Promise<void> {
    const docId = buildCheckinDocumentId(uid, date, updates.slot);
    await setDoc(doc(db, 'checkins', docId), updates, { merge: true });
    await Promise.all([
        clearCachedResource(`checkins:status:${uid}`),
        clearCachedResource(`checkins:list:${uid}`),
        clearCachedResource(`history:feed:${uid}`),
    ]);
}

export interface TherapistCheckinRecord extends CheckinRecord {
    tags?: string[];
    duration?: number;
}

function toHistoryCheckinEntry(checkin: TherapistCheckinRecord): HistoryEntry {
    return {
        ...checkin,
        isCheckin: true as const,
    };
}

async function applyOptimisticCheckinCaches(checkin: TherapistCheckinRecord): Promise<void> {
    const statusKey = `checkins:status:${checkin.uid}`;
    const listKey = `checkins:list:${checkin.uid}`;
    const historyKey = `history:feed:${checkin.uid}`;

    const [cachedStatus, cachedList, cachedHistory] = await Promise.all([
        getCachedResource<CheckinStatusSnapshot>(statusKey, 'critical', { allowStale: true, preserveExpired: true }),
        getCachedResource<TherapistCheckinRecord[]>(listKey, 'summary', { allowStale: true, preserveExpired: true }),
        getCachedResource<HistoryEntry[]>(historyKey, 'summary', { allowStale: true, preserveExpired: true }),
    ]);

    const nextCheckins = mergeCheckinRecords(cachedList?.data ?? [], checkin);
    const nextStatus = buildCheckinStatusSnapshot(
        mergeCheckinRecords(cachedStatus?.data.recentCheckins ?? nextCheckins, checkin)
    );
    const nextHistory = sortHistoryEntries([
        toHistoryCheckinEntry(checkin),
        ...(cachedHistory?.data ?? []).filter((entry) => !(entry.isCheckin && entry.id === checkin.id)),
    ]);

    await Promise.all([
        setCachedResource(statusKey, nextStatus, 'critical'),
        setCachedResource(listKey, nextCheckins, 'summary'),
        setCachedResource(historyKey, nextHistory, 'summary'),
    ]);
}

export async function fetchTherapistClientCheckins(
    clientId: string,
    options?: { forceFresh?: boolean; staleTimeMs?: number }
): Promise<TherapistCheckinRecord[]> {
    const cacheKey = `checkins:list:${clientId}`;
    const policy = options?.staleTimeMs ? {
        category: 'summary',
        memoryTtlMs: options.staleTimeMs,
        diskTtlMs: options.staleTimeMs,
    } : 'summary';

    return loadCachedQuery({
        key: cacheKey,
        policy,
        forceFresh: options?.forceFresh,
        onOfflineFallback: (error) => console.warn('Using offline therapist checkins cache', error),
        load: async () => {
            const snapshot = await getDocs(query(collection(db, 'checkins'), where('uid', '==', clientId)));
            return sortCheckinRecords(
                snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as TherapistCheckinRecord) }))
            );
        },
    });
}

export function formatTherapistCheckinDate(checkin: TherapistCheckinRecord, locale: string): string {
    const date = new Date(resolveCheckinTime(checkin));
    return date.toLocaleDateString(locale || 'de', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export function formatTherapistCheckinTime(checkin: TherapistCheckinRecord, locale: string): string {
    if (!checkin.createdAt) {
        return '';
    }

    const date = new Date(checkin.createdAt);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleTimeString(locale || 'de', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function groupCheckinsByFormattedDate(checkins: TherapistCheckinRecord[], locale: string) {
    return Object.entries(
        checkins.reduce((accumulator: Record<string, TherapistCheckinRecord[]>, checkin) => {
            const key = formatTherapistCheckinDate(checkin, locale);
            if (!accumulator[key]) {
                accumulator[key] = [];
            }
            accumulator[key].push(checkin);
            return accumulator;
        }, {})
    ).map(([title, data]) => ({ title, data }));
}

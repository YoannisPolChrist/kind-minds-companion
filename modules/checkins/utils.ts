import { CheckinPayload, CheckinRecord, CheckinStatusSnapshot } from './types';

export function buildCheckinDocumentId(uid: string, date: string, slot?: CheckinPayload['slot']): string {
    return slot ? `${uid}_${date}_${slot}` : `${uid}_${date}`;
}

export function createCheckinRecord(payload: CheckinPayload): CheckinRecord {
    return {
        id: buildCheckinDocumentId(payload.uid, payload.date, payload.slot),
        uid: payload.uid,
        date: payload.date,
        mood: payload.mood,
        emotionId: payload.emotionId,
        note: payload.note,
        slot: payload.slot,
        createdAt: payload.createdAt,
        tags: payload.tags,
        energy: payload.energy,
        duration: payload.duration,
    };
}

export function resolveCheckinTime(checkin: Pick<CheckinRecord, 'createdAt' | 'date'>): number {
    if (checkin.createdAt) {
        const createdTime = new Date(checkin.createdAt).getTime();
        if (!Number.isNaN(createdTime)) {
            return createdTime;
        }
    }

    return new Date(checkin.date).getTime();
}

export function sortCheckinRecords<T extends CheckinRecord>(checkins: T[]): T[] {
    return [...checkins].sort((left, right) => resolveCheckinTime(right) - resolveCheckinTime(left));
}

export function mergeCheckinRecords<T extends CheckinRecord>(checkins: T[], nextCheckin: T): T[] {
    const deduped = new Map(checkins.map((entry) => [entry.id, entry]));
    deduped.set(nextCheckin.id, nextCheckin);
    return sortCheckinRecords(Array.from(deduped.values()));
}

export function buildCheckinStatusSnapshot(checkins: CheckinRecord[], now = new Date()): CheckinStatusSnapshot {
    const today = now.toISOString().split('T')[0];
    const currentSlot = now.getHours() < 12 ? 'morning' : 'evening';
    const sorted = sortCheckinRecords(checkins);

    return {
        checkedInToday: sorted.some((entry) => entry.date === today && (!entry.slot || entry.slot === currentSlot)),
        recentCheckins: sorted.slice(0, 14).reverse(),
    };
}

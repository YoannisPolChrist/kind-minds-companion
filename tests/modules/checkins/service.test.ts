import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckinStatusSnapshot, mergeCheckinRecords } from '../../../modules/checkins/utils';

test('mergeCheckinRecords replaces an existing record and keeps newest-first ordering', () => {
    const merged = mergeCheckinRecords(
        [
            { id: 'older', uid: 'u1', date: '2026-03-10', mood: 3, createdAt: '2026-03-10T08:00:00.000Z' },
            { id: 'same', uid: 'u1', date: '2026-03-11', mood: 2, createdAt: '2026-03-11T08:00:00.000Z' },
        ],
        { id: 'same', uid: 'u1', date: '2026-03-11', mood: 5, createdAt: '2026-03-11T09:00:00.000Z' }
    );

    assert.deepEqual(
        merged.map((entry) => ({ id: entry.id, mood: entry.mood })),
        [
            { id: 'same', mood: 5 },
            { id: 'older', mood: 3 },
        ]
    );
});

test('buildCheckinStatusSnapshot marks the active slot as completed and trims recent entries', () => {
    const snapshot = buildCheckinStatusSnapshot(
        Array.from({ length: 16 }, (_, index) => ({
            id: `checkin-${index}`,
            uid: 'u1',
            date: index === 0 ? '2026-03-12' : `2026-03-${String(Math.max(index, 1)).padStart(2, '0')}`,
            mood: 4,
            slot: index === 0 ? 'morning' as const : undefined,
            createdAt: `2026-03-${String(Math.max(index, 1)).padStart(2, '0')}T08:00:00.000Z`,
        })),
        new Date('2026-03-12T08:30:00.000Z')
    );

    assert.equal(snapshot.checkedInToday, true);
    assert.equal(snapshot.recentCheckins.length, 14);
});

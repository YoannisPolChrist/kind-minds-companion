import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenHistoryGroups, formatHistoryWeekLabel, groupHistoryByWeek, sortHistoryEntries } from '../../../modules/history/utils';

const entries = [
    { id: 'exercise-1', title: 'Atem', isCheckin: false as const, lastCompletedAt: '2026-03-10T10:00:00.000Z' },
    { id: 'checkin-1', isCheckin: true as const, date: '2026-03-11', mood: 7, uid: 'u1' },
    { id: 'exercise-2', title: 'Journal', isCheckin: false as const, lastCompletedAt: '2026-03-01T10:00:00.000Z' },
];

test('sortHistoryEntries orders newest entries first', () => {
    assert.deepEqual(sortHistoryEntries(entries).map((entry) => entry.id), ['checkin-1', 'exercise-1', 'exercise-2']);
});

test('groupHistoryByWeek builds stable week buckets', () => {
    const groups = groupHistoryByWeek(entries);
    assert.equal(groups.length, 2);
    assert.equal(groups[0][1].length, 2);
});

test('flattenHistoryGroups adds header entries before items', () => {
    const flat = flattenHistoryGroups(groupHistoryByWeek(entries));
    assert.equal(flat[0].isHeader, true);
    assert.equal(flat[1].id, 'checkin-1');
});

test('formatHistoryWeekLabel returns a readable range', () => {
    assert.match(formatHistoryWeekLabel('2026-03-09', 'de-DE'), /09\./);
});

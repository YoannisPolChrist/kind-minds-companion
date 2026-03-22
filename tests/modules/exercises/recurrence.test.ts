import test from 'node:test';
import assert from 'node:assert/strict';
import { isRecurrenceResetDue } from '../../../modules/exercises/recurrence';

test('daily recurrence resets after the next day', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    assert.equal(isRecurrenceResetDue({
        id: 'exercise-1',
        title: 'Test',
        completed: true,
        lastCompletedAt: yesterday,
        recurrence: 'daily',
    } as any), true);
});

test('non-recurring exercise never resets', () => {
    assert.equal(isRecurrenceResetDue({
        id: 'exercise-2',
        title: 'Test',
        completed: true,
        lastCompletedAt: new Date().toISOString(),
        recurrence: 'none',
    } as any), false);
});

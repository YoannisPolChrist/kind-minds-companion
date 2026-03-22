import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultBlock, duplicateBlock, hasUnsavedChanges, moveBlock, normalizeBuilderPayload } from '../../../modules/exerciseBuilder';

test('createDefaultBlock seeds type-specific defaults', () => {
    const scale = createDefaultBlock('scale');
    const timer = createDefaultBlock('timer');

    assert.equal(scale.minLabel, 'Gar nicht');
    assert.equal(timer.duration, 120);
});

test('duplicateBlock creates a new id', () => {
    const original = { id: 'a1', type: 'reflection', content: 'Hallo' } as any;
    const copy = duplicateBlock(original);

    assert.notEqual(copy.id, original.id);
    assert.equal(copy.content, original.content);
});

test('moveBlock reorders entries safely', () => {
    const moved = moveBlock([
        { id: '1', type: 'reflection' },
        { id: '2', type: 'reflection' },
    ] as any, '2', 'up');

    assert.deepEqual(moved.map((entry: any) => entry.id), ['2', '1']);
});

test('normalizeBuilderPayload strips undefined values', () => {
    const normalized = normalizeBuilderPayload([
        { id: '1', type: 'reflection', content: 'A', duration: undefined },
    ] as any);

    assert.equal('duration' in normalized[0], false);
});

test('hasUnsavedChanges compares builder snapshots', () => {
    assert.equal(hasUnsavedChanges(
        { title: 'A', themeColor: '#111', blocks: [] },
        { title: 'A', themeColor: '#111', blocks: [] as any }
    ), false);

    assert.equal(hasUnsavedChanges(
        { title: 'A', themeColor: '#111', blocks: [] },
        { title: 'B', themeColor: '#111', blocks: [] as any }
    ), true);
});

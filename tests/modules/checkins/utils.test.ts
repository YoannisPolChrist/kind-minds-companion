import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckinDocumentId } from '../../../modules/checkins/utils';

test('buildCheckinDocumentId includes slot when present', () => {
    assert.equal(buildCheckinDocumentId('user-1', '2026-03-11', 'morning'), 'user-1_2026-03-11_morning');
});

test('buildCheckinDocumentId omits slot when not present', () => {
    assert.equal(buildCheckinDocumentId('user-1', '2026-03-11'), 'user-1_2026-03-11');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCompletionRate } from '../../../modules/clients/utils';

test('calculateCompletionRate formats percentages', () => {
    assert.equal(calculateCompletionRate(3, 4), '75%');
});

test('calculateCompletionRate guards empty totals', () => {
    assert.equal(calculateCompletionRate(0, 0), '--');
});

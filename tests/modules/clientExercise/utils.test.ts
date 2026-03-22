import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExercisePdfHtml } from '../../../modules/clientExercise/pdf';
import { sanitizeExerciseAnswers } from '../../../modules/clientExercise/utils';

test('sanitizeExerciseAnswers removes empty values', () => {
    assert.deepEqual(
        sanitizeExerciseAnswers({
            a: 'Text',
            b: '',
            c: null,
            d: 4,
        }),
        { a: 'Text', d: 4 }
    );
});

test('buildExercisePdfHtml includes title and answer content', () => {
    const html = buildExercisePdfHtml(
        {
            id: 'exercise-1',
            title: 'Atemfokus',
            blocks: [
                { id: 'b1', type: 'reflection', content: 'Wie fuehlst du dich?' },
            ],
        } as any,
        { b1: 'Ruhiger als vorher' }
    );

    assert.match(html, /Atemfokus/);
    assert.match(html, /Ruhiger als vorher/);
});

import { BlockCondition } from '../types';

/**
 * Evaluates whether a block condition is satisfied given the current answers map.
 * Returns `true` (show block) when:
 *  - no condition is set
 *  - the source block has an answer that satisfies the operator + value
 */
export function evaluateCondition(
    condition: BlockCondition | undefined,
    answers: Record<string, string>
): boolean {
    if (!condition) return true; // No condition = always show

    const { sourceBlockId, operator, value } = condition;
    const rawAnswer = answers[sourceBlockId];

    if (rawAnswer === undefined || rawAnswer === null || rawAnswer === '') return false;

    // Numeric comparison (for scale blocks)
    const numAnswer = parseFloat(rawAnswer);
    const numValue = parseFloat(value);

    if (!isNaN(numAnswer) && !isNaN(numValue)) {
        switch (operator) {
            case '>=': return numAnswer >= numValue;
            case '<=': return numAnswer <= numValue;
            case '>': return numAnswer > numValue;
            case '<': return numAnswer < numValue;
            case '==': return numAnswer === numValue;
            case '!=': return numAnswer !== numValue;
        }
    }

    // String comparison (for choice blocks)
    switch (operator) {
        case '==': return rawAnswer === value;
        case '!=': return rawAnswer !== value;
        default: return false;
    }
}

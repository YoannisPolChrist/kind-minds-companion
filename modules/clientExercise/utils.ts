export function sanitizeExerciseAnswers(answers: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(answers).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
}

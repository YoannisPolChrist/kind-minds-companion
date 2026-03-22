export function calculateCompletionRate(completedCount: number, exerciseCount: number): string {
    if (!exerciseCount) return '--';
    return `${Math.round((completedCount / exerciseCount) * 100)}%`;
}

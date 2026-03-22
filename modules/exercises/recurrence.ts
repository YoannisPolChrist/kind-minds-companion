import { Exercise } from '../../types';

export function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(a: Date, b: Date): number {
    return Math.ceil(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function isRecurrenceResetDue(exercise: Exercise): boolean {
    if (!exercise.completed || !exercise.lastCompletedAt) return false;
    if (!exercise.recurrence || exercise.recurrence === 'none') return false;

    const lastCompleted = new Date(exercise.lastCompletedAt);
    const today = new Date();
    const lastMidnight = startOfDay(lastCompleted);
    const todayMidnight = startOfDay(today);

    if (exercise.recurrence === 'daily') {
        return todayMidnight.getTime() > lastMidnight.getTime();
    }
    if (exercise.recurrence === 'weekly') {
        return daysBetween(todayMidnight, lastMidnight) >= 7;
    }
    return false;
}

import { CheckinRecord } from '../checkins/types';

export interface HistoryExerciseEntry {
    id: string;
    title?: string;
    createdAt?: string;
    lastCompletedAt?: string;
    completed?: boolean;
    answers?: Record<string, unknown>;
    blocks?: unknown[];
    sharedAnswers?: boolean;
    isCheckin?: false;
    [key: string]: unknown;
}

export type HistoryCheckinEntry = CheckinRecord & { isCheckin: true };
export type HistoryEntry = HistoryExerciseEntry | HistoryCheckinEntry;
export type HistoryGroup = [string, HistoryEntry[]];
export type HistoryFlatEntry = HistoryEntry | { isHeader: true; weekStart: string };

export function getHistoryTimestamp(entry: HistoryEntry): number {
    if (entry.isCheckin) {
        return new Date(entry.date).getTime();
    }

    return new Date(entry.lastCompletedAt || entry.createdAt || Date.now()).getTime();
}

export function sortHistoryEntries(entries: HistoryEntry[]): HistoryEntry[] {
    return [...entries].sort((left, right) => getHistoryTimestamp(right) - getHistoryTimestamp(left));
}

export function groupHistoryByWeek(entries: HistoryEntry[]): HistoryGroup[] {
    const weeks: Record<string, HistoryEntry[]> = {};

    entries.forEach((entry) => {
        const date = new Date(getHistoryTimestamp(entry));
        const monday = new Date(date);
        monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        const key = monday.toISOString().split('T')[0];

        if (!weeks[key]) {
            weeks[key] = [];
        }

        weeks[key].push(entry);
    });

    return Object.entries(weeks)
        .sort(([left], [right]) => right.localeCompare(left))
        .map(([weekStart, weekEntries]) => [weekStart, sortHistoryEntries(weekEntries)] as HistoryGroup);
}

export function flattenHistoryGroups(groups: HistoryGroup[]): HistoryFlatEntry[] {
    return groups.flatMap(([weekStart, entries]) => [
        { isHeader: true as const, weekStart },
        ...entries,
    ]);
}

export function formatHistoryDate(dateStr: string, locale: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: '2-digit',
    });
}

export function formatHistoryWeekLabel(dateStr: string, locale: string): string {
    const start = new Date(dateStr);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return `${start.toLocaleDateString(locale, { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: '2-digit' })}`;
}

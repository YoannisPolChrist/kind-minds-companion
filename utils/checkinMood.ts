const HUNDRED_SCALE_MAX = 100;
const TEN_SCALE_MAX = 10;

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function parseMoodValue(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeMoodToHundred(value: unknown): number {
    const numeric = parseMoodValue(value);
    if (numeric === null || numeric <= 0) return 0;

    if (numeric <= TEN_SCALE_MAX) {
        return clamp(Math.round(numeric * 10), 1, HUNDRED_SCALE_MAX);
    }

    return clamp(Math.round(numeric), 1, HUNDRED_SCALE_MAX);
}

export function normalizeMoodToTen(value: unknown): number {
    const numeric = parseMoodValue(value);
    if (numeric === null || numeric <= 0) return 0;

    if (numeric <= TEN_SCALE_MAX) {
        return clamp(Math.round(numeric), 1, TEN_SCALE_MAX);
    }

    return clamp(Math.round(numeric / 10), 1, TEN_SCALE_MAX);
}

export function formatMoodScore(value: unknown): string {
    return `${normalizeMoodToHundred(value)}/100`;
}

export function isLowMood(value: unknown): boolean {
    const score = normalizeMoodToHundred(value);
    return score > 0 && score <= 40;
}

export function isHighMood(value: unknown): boolean {
    return normalizeMoodToHundred(value) >= 70;
}

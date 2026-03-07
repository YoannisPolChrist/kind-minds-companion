export function formatBirthDateInput(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 2) {
        return digits;
    }

    if (digits.length <= 4) {
        return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    }

    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

export function isValidBirthDate(value: string) {
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
        return false;
    }

    const [dayString, monthString, yearString] = value.split('.');
    const day = Number.parseInt(dayString, 10);
    const month = Number.parseInt(monthString, 10);
    const year = Number.parseInt(yearString, 10);

    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
        return false;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) {
        return false;
    }

    const candidate = new Date(year, month - 1, day);
    return (
        candidate.getFullYear() === year &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day
    );
}

function padDatePart(value: number) {
    return String(value).padStart(2, '0');
}

function formatAppointmentParts(date: Date) {
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

export function normalizeAppointmentInput(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
        return '';
    }

    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
    if (!match) {
        return '';
    }

    const [, yearString, monthString, dayString, hourString, minuteString] = match;
    const year = Number.parseInt(yearString, 10);
    const month = Number.parseInt(monthString, 10);
    const day = Number.parseInt(dayString, 10);
    const hour = Number.parseInt(hourString, 10);
    const minute = Number.parseInt(minuteString, 10);

    if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day) ||
        !Number.isFinite(hour) ||
        !Number.isFinite(minute)
    ) {
        return '';
    }

    if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return '';
    }

    const candidate = new Date(year, month - 1, day, hour, minute);
    if (
        candidate.getFullYear() !== year ||
        candidate.getMonth() !== month - 1 ||
        candidate.getDate() !== day ||
        candidate.getHours() !== hour ||
        candidate.getMinutes() !== minute
    ) {
        return '';
    }

    return formatAppointmentParts(candidate);
}

export function isValidAppointmentInput(value: string) {
    return normalizeAppointmentInput(value).length > 0;
}

export function formatAppointmentInputValue(value?: string | null) {
    if (!value) {
        return '';
    }

    const normalized = normalizeAppointmentInput(value);
    if (normalized) {
        return normalized;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value.trim();
    }

    return formatAppointmentParts(parsed);
}

export function formatAppointmentDisplayValue(value: string | null | undefined, locale: string) {
    const normalized = formatAppointmentInputValue(value);
    if (!normalized) {
        return null;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(parsed);
}

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

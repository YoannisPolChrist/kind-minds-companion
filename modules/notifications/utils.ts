import {
    CreateNotificationInput,
    NotificationDocumentType,
    NotificationRecord,
    NotificationRoute,
    NotificationSourceRecord,
    NotificationTimestampLike,
    NotificationType,
} from './types';

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function asNonEmptyString(value: unknown): string | undefined {
    return isNonEmptyString(value) ? value.trim() : undefined;
}

function withDefinedEntries(entries: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== undefined));
}

function normalizeLegacyFileUploadType(record: Partial<CreateNotificationInput> & Record<string, unknown>): NotificationType {
    const resourceSignals = [
        record.resourceId,
        record.resourceTitle,
        record.resourceType,
        record.title,
        record.body,
        record.message,
    ]
        .filter((value) => typeof value === 'string')
        .join(' ')
        .toLowerCase();

    if (resourceSignals.includes('ressource') || resourceSignals.includes('resource') || resourceSignals.includes('material')) {
        return 'resource_shared';
    }

    return 'file_uploaded';
}

export function normalizeNotificationType(
    type: unknown,
    record: Partial<CreateNotificationInput> & Record<string, unknown> = {}
): NotificationType {
    switch (type as NotificationDocumentType) {
        case 'exercise_assigned':
        case 'resource_shared':
        case 'file_uploaded':
        case 'appointment_saved':
        case 'checkin_reminder':
        case 'general':
            return type as NotificationType;
        case 'FILE_UPLOAD':
            return normalizeLegacyFileUploadType(record);
        default:
            return 'general';
    }
}

export function formatAppointmentNotificationLabel(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return `${value}`;
    }

    const datePart = date.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
    const timePart = date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return `${datePart} um ${timePart} Uhr`;
}

export function buildNotificationRoute(
    type: NotificationType,
    input: Partial<CreateNotificationInput> = {}
): NotificationRoute {
    const exerciseId = asNonEmptyString(input.exerciseId);

    const defaults: Record<NotificationType, NotificationRoute> = {
        exercise_assigned: {
            appPath: exerciseId ? `/(app)/exercise/${exerciseId}` : '/(app)/exercises_overview',
            webPath: exerciseId ? `/exercise/${exerciseId}` : '/exercises_overview',
            actionLabel: exerciseId ? 'Uebung oeffnen' : 'Uebungen ansehen',
        },
        resource_shared: {
            appPath: '/(app)/resources',
            webPath: '/resources',
            actionLabel: 'Ressourcen ansehen',
        },
        file_uploaded: {
            appPath: '/(app)/resources',
            webPath: '/resources',
            actionLabel: 'Dateien ansehen',
        },
        appointment_saved: {
            appPath: '/(app)',
            webPath: '/',
            actionLabel: 'Zum Dashboard',
        },
        checkin_reminder: {
            appPath: '/(app)/checkin',
            webPath: '/checkin',
            actionLabel: 'Check-in starten',
        },
        general: {
            appPath: '/(app)',
            webPath: '/',
            actionLabel: 'App oeffnen',
        },
    };

    return {
        appPath: asNonEmptyString(input.appPath) || defaults[type].appPath,
        webPath: asNonEmptyString(input.webPath) || defaults[type].webPath,
        actionLabel: asNonEmptyString(input.actionLabel) || defaults[type].actionLabel,
    };
}

function buildDefaultNotificationCopy(type: NotificationType, input: Partial<CreateNotificationInput> = {}) {
    const exerciseTitle = asNonEmptyString(input.exerciseTitle);
    const resourceTitle = asNonEmptyString(input.resourceTitle);
    const fileName = asNonEmptyString(input.fileName);
    const appointmentLabel = asNonEmptyString(input.appointmentLabel);
    const resourceCount = typeof input.resourceCount === 'number' ? input.resourceCount : undefined;
    const route = buildNotificationRoute(type, input);

    switch (type) {
        case 'exercise_assigned': {
            const body = exerciseTitle
                ? `Dein Therapeut hat dir "${exerciseTitle}" zugewiesen.`
                : 'Dein Therapeut hat dir eine neue Uebung zugewiesen.';

            return {
                title: 'Neue Uebung',
                body,
                message: body,
                actionLabel: route.actionLabel,
            };
        }
        case 'resource_shared': {
            const body = resourceCount && resourceCount > 1
                ? `Dein Therapeut hat ${resourceCount} neue Ressourcen mit dir geteilt.`
                : resourceTitle
                    ? `Dein Therapeut hat "${resourceTitle}" fuer dich freigeschaltet.`
                    : 'Dein Therapeut hat neues Material fuer dich freigeschaltet.';

            return {
                title: resourceCount && resourceCount > 1 ? 'Neue Ressourcen' : 'Neue Ressource',
                body,
                message: body,
                actionLabel: route.actionLabel,
            };
        }
        case 'file_uploaded': {
            const body = fileName
                ? `Dein Therapeut hat "${fileName}" fuer dich hochgeladen.`
                : 'Dein Therapeut hat eine neue Datei fuer dich hochgeladen.';

            return {
                title: 'Neue Datei',
                body,
                message: body,
                actionLabel: route.actionLabel,
            };
        }
        case 'appointment_saved': {
            const body = appointmentLabel
                ? `Dein neuer Termin ist eingetragen: ${appointmentLabel}.`
                : 'Dein Therapeut hat einen neuen Termin fuer dich eingetragen.';

            return {
                title: 'Neuer Termin',
                body,
                message: body,
                actionLabel: route.actionLabel,
            };
        }
        case 'checkin_reminder': {
            const body = 'Nimm dir einen kurzen Moment fuer deinen taeglichen Check-in.';

            return {
                title: 'Zeit fuer deinen Check-in',
                body,
                message: body,
                actionLabel: route.actionLabel,
            };
        }
        case 'general':
        default: {
            const body = 'Du hast eine neue Benachrichtigung erhalten.';

            return {
                title: 'Neue Benachrichtigung',
                body,
                message: body,
                actionLabel: route.actionLabel,
            };
        }
    }
}

export function buildNotificationDocumentData(input: CreateNotificationInput): Record<string, unknown> {
    const source = input as Partial<CreateNotificationInput> & Record<string, unknown>;
    const normalizedType = normalizeNotificationType(input.type, source);
    const defaults = buildDefaultNotificationCopy(normalizedType, source);
    const route = buildNotificationRoute(normalizedType, source);

    return withDefinedEntries({
        userId: input.userId,
        type: normalizedType,
        title: asNonEmptyString(input.title) || defaults.title,
        body: asNonEmptyString(input.body) || defaults.body,
        message: asNonEmptyString(input.message) || asNonEmptyString(input.body) || defaults.message,
        read: input.read ?? false,
        actionLabel: route.actionLabel,
        appPath: route.appPath,
        webPath: route.webPath,
        exerciseId: asNonEmptyString(input.exerciseId),
        exerciseTitle: asNonEmptyString(input.exerciseTitle),
        resourceId: asNonEmptyString(input.resourceId),
        resourceTitle: asNonEmptyString(input.resourceTitle),
        resourceType: asNonEmptyString(input.resourceType),
        resourceCount: typeof input.resourceCount === 'number' ? input.resourceCount : undefined,
        fileName: asNonEmptyString(input.fileName),
        appointmentLabel: asNonEmptyString(input.appointmentLabel),
        status: asNonEmptyString(input.status),
        createdAt: input.createdAt,
        ...withDefinedEntries(input.extra || {}),
    });
}

export function normalizeNotificationRecord(record: NotificationSourceRecord): NotificationRecord {
    const source = record as Partial<CreateNotificationInput> & Record<string, unknown>;
    const normalizedType = normalizeNotificationType(record.type, source);
    const defaults = buildDefaultNotificationCopy(normalizedType, source);
    const route = buildNotificationRoute(normalizedType, source);

    return {
        ...record,
        id: record.id,
        userId: asNonEmptyString(record.userId) || '',
        rawType: asNonEmptyString(record.type) || normalizedType,
        type: normalizedType,
        title: asNonEmptyString(record.title) || defaults.title,
        body: asNonEmptyString(record.body) || asNonEmptyString(record.message) || defaults.body,
        message: asNonEmptyString(record.message) || asNonEmptyString(record.body) || defaults.message,
        read: Boolean(record.read),
        actionLabel: asNonEmptyString(record.actionLabel) || route.actionLabel,
        appPath: asNonEmptyString(record.appPath) || route.appPath,
        webPath: asNonEmptyString(record.webPath) || route.webPath,
        createdAt: (record.createdAt as NotificationTimestampLike | Date | string | null | undefined) ?? null,
        exerciseId: asNonEmptyString(record.exerciseId),
        exerciseTitle: asNonEmptyString(record.exerciseTitle),
        resourceId: asNonEmptyString(record.resourceId),
        resourceTitle: asNonEmptyString(record.resourceTitle),
        resourceType: asNonEmptyString(record.resourceType),
        resourceCount: typeof record.resourceCount === 'number' ? record.resourceCount : undefined,
        fileName: asNonEmptyString(record.fileName),
        appointmentLabel: asNonEmptyString(record.appointmentLabel),
        status: asNonEmptyString(record.status),
    };
}

export function getNotificationTimestampMs(value: NotificationRecord['createdAt']): number {
    if (!value) {
        return 0;
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (typeof value === 'object') {
        const timestamp = value as NotificationTimestampLike;
        if (typeof timestamp.toDate === 'function') {
            return timestamp.toDate().getTime();
        }
        if (typeof timestamp.seconds === 'number') {
            return timestamp.seconds * 1000;
        }
    }

    return 0;
}

export function sortNotifications<T extends { createdAt?: NotificationRecord['createdAt'] }>(notifications: T[]): T[] {
    return [...notifications].sort((left, right) => getNotificationTimestampMs(right.createdAt) - getNotificationTimestampMs(left.createdAt));
}

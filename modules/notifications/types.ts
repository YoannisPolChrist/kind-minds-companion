export type NotificationType =
    | 'exercise_assigned'
    | 'resource_shared'
    | 'file_uploaded'
    | 'appointment_saved'
    | 'checkin_reminder'
    | 'general';

export type LegacyNotificationType = 'FILE_UPLOAD';

export type NotificationDocumentType = NotificationType | LegacyNotificationType;

export interface NotificationTimestampLike {
    seconds?: number;
    toDate?: () => Date;
}

export interface CreateNotificationInput {
    userId: string;
    type: NotificationDocumentType;
    title?: string;
    body?: string;
    message?: string;
    read?: boolean;
    actionLabel?: string;
    appPath?: string;
    webPath?: string;
    exerciseId?: string;
    exerciseTitle?: string;
    resourceId?: string;
    resourceTitle?: string;
    resourceType?: string;
    resourceCount?: number;
    fileName?: string;
    appointmentLabel?: string;
    status?: string;
    createdAt?: unknown;
    extra?: Record<string, unknown>;
}

export interface NotificationRoute {
    appPath: string;
    webPath: string;
    actionLabel: string;
}

export interface NotificationRecord extends Record<string, unknown> {
    id: string;
    userId: string;
    type: NotificationType;
    rawType?: string;
    title: string;
    body: string;
    message: string;
    read: boolean;
    actionLabel: string;
    appPath: string;
    webPath: string;
    createdAt?: NotificationTimestampLike | Date | string | null;
    exerciseId?: string;
    exerciseTitle?: string;
    resourceId?: string;
    resourceTitle?: string;
    resourceType?: string;
    resourceCount?: number;
    fileName?: string;
    appointmentLabel?: string;
    status?: string;
}

export type NotificationSourceRecord = Record<string, unknown> & { id: string };

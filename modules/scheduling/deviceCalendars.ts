import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { AppointmentDetails, AppointmentSyncResult, CalendarProvider, CalendarTarget } from './types';

const APPOINTMENT_SYNC_KEY = 'synced_appointment_events_v2';

function inferProvider(calendar: Calendar.Calendar): CalendarProvider {
    const sourceName = `${calendar?.source?.name ?? ''}`.toLowerCase();
    const calendarName = `${calendar.title ?? ''}`.toLowerCase();

    if (Platform.OS === 'ios') {
        if (sourceName.includes('icloud') || calendarName.includes('icloud')) {
            return 'icloud';
        }
    }

    if (sourceName.includes('google') || calendarName.includes('google') || calendar.ownerAccount?.toLowerCase().includes('@gmail.com')) {
        return 'google';
    }

    return 'device';
}

export async function getCalendarTargets(): Promise<CalendarTarget[]> {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    return calendars
        .filter((cal) =>
            cal && (
                cal.accessLevel === Calendar.CalendarAccessLevel.OWNER ||
                cal.accessLevel === Calendar.CalendarAccessLevel.EDITOR ||
                cal.accessLevel === Calendar.CalendarAccessLevel.CONTRIBUTOR ||
                cal.accessLevel === Calendar.CalendarAccessLevel.ROOT
            )
        )
        .map((cal) => ({
            id: cal.id,
            title: cal.title ?? cal.source?.name ?? 'Kalender',
            provider: inferProvider(cal),
        }));
}

async function ensureCalendarTarget(preferred?: CalendarProvider): Promise<CalendarTarget | null> {
    const writableTargets = await getCalendarTargets();
    if (!writableTargets.length) {
        return null;
    }

    if (preferred) {
        const preferredTarget = writableTargets.find((target) => target.provider === preferred);
        if (preferredTarget) {
            return preferredTarget;
        }
    }

    // On iOS, try to use the default calendar as a final fallback
    if (Platform.OS === 'ios') {
        try {
            const defaultCalendar = await Calendar.getDefaultCalendarAsync();
            if (defaultCalendar) {
                const fallbackProvider = inferProvider(defaultCalendar);
                return {
                    id: defaultCalendar.id,
                    title: defaultCalendar.title ?? defaultCalendar.source?.name ?? 'Kalender',
                    provider: fallbackProvider,
                };
            }
        } catch {
            // Ignore and fallback to first writable target
        }
    }

    return writableTargets[0];
}

async function readSyncedAppointments() {
    const cached = await AsyncStorage.getItem(APPOINTMENT_SYNC_KEY);
    if (!cached) return {};
    try {
        return JSON.parse(cached);
    } catch {
        return {};
    }
}

async function persistSyncedAppointments(map: Record<string, string>) {
    await AsyncStorage.setItem(APPOINTMENT_SYNC_KEY, JSON.stringify(map));
}

function buildNotes(details: AppointmentDetails) {
    const segments = [];
    if (details.therapistName) {
        segments.push(`Therapeut: ${details.therapistName}`);
    }
    if (details.clientName) {
        segments.push(`Klient: ${details.clientName}`);
    }
    if (details.description) {
        segments.push(details.description);
    }
    return segments.join('\n');
}

interface SyncOptions {
    preferredProvider?: CalendarProvider;
    silent?: boolean;
}

export async function syncAppointmentToDevice(details: AppointmentDetails, options?: SyncOptions): Promise<AppointmentSyncResult> {
    const preferredProvider = options?.preferredProvider;
    const silent = options?.silent ?? false;

    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
        if (!silent) {
            Alert.alert('Kalender', 'Bitte erlaube den Zugriff auf deinen Kalender, um Termine zu synchronisieren.');
        }
        return { success: false };
    }

    const target = await ensureCalendarTarget(preferredProvider);
    if (!target) {
        if (!silent) {
            Alert.alert('Kalender', 'Kein beschreibbarer Kalender auf diesem Geraet gefunden.');
        }
        return { success: false };
    }

    const startDate = details.startDate;
    const endDate = details.endDate || new Date(startDate.getTime() + 45 * 60000);

    const payload: Partial<Calendar.Event> = {
        title: details.title,
        startDate,
        endDate,
        location: details.location ?? null,
        notes: buildNotes(details),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Europe/Berlin',
    };

    const syncedAppointments = await readSyncedAppointments();
    const existingEventId = syncedAppointments[details.id];
    let eventId: string;

    try {
        if (existingEventId) {
            await Calendar.updateEventAsync(existingEventId, payload);
            eventId = existingEventId;
        } else {
            eventId = await Calendar.createEventAsync(target.id, payload);
            syncedAppointments[details.id] = eventId;
            await persistSyncedAppointments(syncedAppointments);
        }

        if (!silent) {
            Alert.alert('Synchronisiert', 'Der Termin wurde in deinem Kalender hinterlegt.');
        }

        return { success: true, provider: target.provider, calendarId: target.id, eventId };
    } catch (error) {
        console.error('Calendar sync failed', error);
        if (!silent) {
            Alert.alert('Fehler', 'Der Termin konnte nicht synchronisiert werden.');
        }
        return { success: false, error: error as Error };
    }
}

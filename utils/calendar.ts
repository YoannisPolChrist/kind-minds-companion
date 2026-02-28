import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { useAppStore } from './useAppStore';
import { Exercise } from '../types';

export async function syncExercisesToCalendar(exercises: Exercise[], silent = false) {
    try {
        // Respect the user's preference in settings
        const { calendarSyncEnabled } = useAppStore.getState();
        if (!calendarSyncEnabled) return;

        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') {
            if (!silent) Alert.alert("Fehler", "Bitte erlaube den Kalender-Zugriff in deinen Geräteeinstellungen.");
            return;
        }

        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        let targetCalendarId = null;

        if (Platform.OS === 'ios') {
            const defaultCalendar = await Calendar.getDefaultCalendarAsync();
            targetCalendarId = defaultCalendar.id;
        } else {
            // Android: find a writable calendar (owner or root)
            const writableCalendars = calendars.filter(c =>
                c.accessLevel === Calendar.CalendarAccessLevel.OWNER ||
                c.accessLevel === Calendar.CalendarAccessLevel.ROOT ||
                c.accessLevel === Calendar.CalendarAccessLevel.CONTRIBUTOR
            );

            if (writableCalendars.length > 0) {
                // Prefer primary calendar if possible
                const primary = writableCalendars.find(c => c.isPrimary);
                targetCalendarId = primary ? primary.id : writableCalendars[0].id;
            } else if (calendars.length > 0) {
                targetCalendarId = calendars[0].id; // Fallback
            }
        }

        if (!targetCalendarId) {
            if (!silent) Alert.alert("Fehler", "Kein beschreibbarer Kalender auf diesem Gerät gefunden.");
            return;
        }

        const syncedIdsStr = await AsyncStorage.getItem('synced_calendar_event_ids');
        const syncedIds = syncedIdsStr ? JSON.parse(syncedIdsStr) : {};

        let syncedCount = 0;
        let requiresSave = false;

        for (const ex of exercises) {
            if (ex.completed) continue;
            if (syncedIds[ex.id]) continue; // Already synced this exercise

            const startDate = new Date();
            // Start the event in 1 hour
            startDate.setHours(startDate.getHours() + 1);
            // Ensure no seconds/milliseconds to prevent some Android calendar issues
            startDate.setMinutes(0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + 1); // 1 hour duration

            let rrule = undefined;
            if (ex.recurrence === 'daily') {
                rrule = { frequency: Calendar.Frequency.DAILY };
            } else if (ex.recurrence === 'weekly') {
                rrule = { frequency: Calendar.Frequency.WEEKLY };
            }

            try {
                const eventId = await Calendar.createEventAsync(targetCalendarId, {
                    title: `Therapie: ${ex.title}`,
                    startDate,
                    endDate,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin', // dynamic timezone based on device
                    notes: `Vergiss nicht deine Übung: ${ex.title} abzuschließen.\nHinweis: ${ex.description || 'Keine Beschreibung'}`,
                    recurrenceRule: rrule as any
                });
                syncedIds[ex.id] = eventId;
                syncedCount++;
                requiresSave = true;
            } catch (e: any) {
                console.error("Failed to sync event:", ex.title, e.message);
            }
        }

        if (requiresSave) {
            await AsyncStorage.setItem('synced_calendar_event_ids', JSON.stringify(syncedIds));
        }

        if (!silent) {
            if (syncedCount > 0) {
                Alert.alert("Erfolg", `${syncedCount} neue Übungen synchronisiert!`);
            } else {
                Alert.alert("Info", "Keine neuen Übungen gefunden.");
            }
        }

    } catch (error) {
        console.error("Calendar Sync Error:", error);
        Alert.alert("Fehler", "Beim Synchronisieren ist ein Fehler aufgetreten.");
    }
}

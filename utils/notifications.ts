import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_REMINDER_HOUR = 10;
const REMINDER_HOUR_KEY = 'reminder_time_hour';
const ANDROID_CHANNEL_ID = 'default';
const NOTIFICATION_TITLE = 'Therapie Erinnerung 🧘';

// ─── Setup ────────────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function configureAndroidChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: ANDROID_CHANNEL_ID,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
    });
}

async function requestPermission(): Promise<boolean> {
    const { status: current } = await Notifications.getPermissionsAsync();
    if (current === 'granted') return true;
    const { status: requested } = await Notifications.requestPermissionsAsync();
    return requested === 'granted';
}

async function loadReminderHour(): Promise<number> {
    try {
        const saved = await AsyncStorage.getItem(REMINDER_HOUR_KEY);
        return saved !== null ? parseInt(saved, 10) : DEFAULT_REMINDER_HOUR;
    } catch {
        return DEFAULT_REMINDER_HOUR;
    }
}

function buildDailyTrigger(hour: number) {
    return { hour, minute: 0, repeats: true, type: 'calendar' } as unknown as Notifications.NotificationTriggerInput;
}

function buildWeeklyTrigger(hour: number) {
    return { weekday: 2, hour, minute: 0, repeats: true, type: 'calendar' } as unknown as Notifications.NotificationTriggerInput;
}

async function scheduleReminder(title: string, frequency: string, reminderHour: number): Promise<void> {
    const trigger = frequency === 'daily'
        ? buildDailyTrigger(reminderHour)
        : buildWeeklyTrigger(reminderHour);

    const body = frequency === 'daily'
        ? `Du hast noch eine offene Aufgabe: "${title}". Nimm dir kurz Zeit!`
        : `Vergiss deine wöchentliche Aufgabe nicht: "${title}".`;

    await Notifications.scheduleNotificationAsync({
        content: { title: NOTIFICATION_TITLE, body },
        trigger,
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function registerForPushNotificationsAsync(): Promise<void> {
    if (Platform.OS === 'web') return;
    if (Platform.OS === 'android') await configureAndroidChannel();
    if (!Device.isDevice) return;

    const granted = await requestPermission();
    if (!granted) console.warn('[Notifications] Permission not granted.');
}

export async function scheduleExerciseReminders(exercises: Exercise[]): Promise<void> {
    if (Platform.OS === 'web') return;

    await Notifications.cancelAllScheduledNotificationsAsync();
    const reminderHour = await loadReminderHour();

    const pendingExercises = exercises.filter(ex => !ex.completed && ex.reminderFrequency);
    for (const ex of pendingExercises) {
        if (ex.reminderFrequency === 'daily' || ex.reminderFrequency === 'weekly') {
            await scheduleReminder(ex.title, ex.reminderFrequency, reminderHour);
        }
    }
}

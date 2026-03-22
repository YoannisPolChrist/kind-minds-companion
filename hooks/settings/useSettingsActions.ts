import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import * as Calendar from 'expo-calendar';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { sendPasswordResetEmail, updateEmail } from 'firebase/auth';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../../utils/firebase';
import { syncExercisesToCalendar } from '../../utils/calendar';
import { scheduleExerciseReminders } from '../../utils/notifications';
import { generateStoragePath, getExtension, uploadFile } from '../../utils/uploadFile';
import { UserProfile } from '../../stores/authStore';

interface UseSettingsActionsOptions {
    profile: UserProfile | null;
    refreshProfile: () => Promise<void>;
    showToast: (message: string, subMessage?: string, type?: 'success' | 'error' | 'warning') => void;
    setCalendarSyncEnabled: (enabled: boolean) => void;
    setNotificationsEnabled: (enabled: boolean) => void;
    setReminderHour: (hour: number) => void;
}

async function fetchUserExercises(userId: string | undefined) {
    if (!userId) {
        return [];
    }

    const snapshot = await getDocs(query(collection(db, 'exercises'), where('clientId', '==', userId)));
    return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as any));
}

export function useSettingsActions({
    profile,
    refreshProfile,
    showToast,
    setCalendarSyncEnabled,
    setNotificationsEnabled,
    setReminderHour,
}: UseSettingsActionsOptions) {
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const pickProfilePhoto = useCallback(async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted || !profile?.id) {
                showToast('Berechtigung', 'Galerie-Zugriff wird benoetigt.', 'warning');
                return null;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (result.canceled || !result.assets?.length) {
                return null;
            }

            setUploadingPhoto(true);
            const asset = result.assets[0];
            const path = generateStoragePath(`profile_pictures/${profile.id}`, getExtension(asset.uri) || 'jpg');
            const downloadUrl = await uploadFile(asset.uri, path, 'image/jpeg');
            await updateDoc(doc(db, 'users', profile.id), { photoURL: downloadUrl });
            await refreshProfile();
            showToast('Gespeichert', 'Profilbild wurde aktualisiert.');
            return downloadUrl;
        } catch (error) {
            console.error('Failed to upload profile photo', error);
            showToast('Fehler', 'Foto konnte nicht hochgeladen werden.', 'error');
            return null;
        } finally {
            setUploadingPhoto(false);
        }
    }, [profile?.id, refreshProfile, showToast]);

    const saveProfile = useCallback(async (payload: { firstName: string; lastName: string; email: string }) => {
        if (!profile?.id) {
            return false;
        }

        setSavingProfile(true);
        try {
            await updateDoc(doc(db, 'users', profile.id), {
                firstName: payload.firstName.trim(),
                lastName: payload.lastName.trim(),
            });

            if (payload.email.trim() && payload.email.trim() !== profile.email && auth.currentUser) {
                try {
                    await updateEmail(auth.currentUser, payload.email.trim());
                    await updateDoc(doc(db, 'users', profile.id), { email: payload.email.trim() });
                } catch (error) {
                    console.warn('Email update failed', error);
                    showToast('Hinweis', 'Name gespeichert, aber E-Mail konnte nicht geaendert werden.', 'warning');
                }
            }

            await refreshProfile();
            showToast('Gespeichert', 'Dein Profil wurde erfolgreich aktualisiert.');
            return true;
        } catch (error) {
            console.error('Failed to save profile', error);
            showToast('Fehler', 'Profil konnte nicht gespeichert werden.', 'error');
            return false;
        } finally {
            setSavingProfile(false);
        }
    }, [profile?.email, profile?.id, refreshProfile, showToast]);

    const toggleCalendarSync = useCallback(async (enabled: boolean) => {
        if (!enabled) {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status !== 'granted') {
                showToast('Fehler', 'Kalender-Zugriff wurde nicht erlaubt.', 'error');
                return false;
            }

            setCalendarSyncEnabled(true);
            try {
                await syncExercisesToCalendar(await fetchUserExercises(profile?.id));
            } catch (error) {
                console.error('Calendar sync failed', error);
            }
            return true;
        }

        setCalendarSyncEnabled(false);
        return true;
    }, [profile?.id, setCalendarSyncEnabled, showToast]);

    const toggleNotifications = useCallback(async (enabled: boolean) => {
        if (!enabled) {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                showToast('Fehler', 'Benachrichtigungen wurden nicht erlaubt.', 'error');
                return false;
            }

            setNotificationsEnabled(true);
            try {
                await scheduleExerciseReminders(await fetchUserExercises(profile?.id));
            } catch (error) {
                console.error('Notification scheduling failed', error);
            }
            return true;
        }

        await Notifications.cancelAllScheduledNotificationsAsync();
        setNotificationsEnabled(false);
        return true;
    }, [profile?.id, setNotificationsEnabled, showToast]);

    const saveReminder = useCallback(async (hour: number) => {
        setReminderHour(hour);

        try {
            await scheduleExerciseReminders(await fetchUserExercises(profile?.id));
        } catch (error) {
            console.error('Reminder reschedule failed', error);
        }

        showToast('Gespeichert', `Erinnerung wurde auf ${hour}:00 gesetzt.`);
    }, [profile?.id, setReminderHour, showToast]);

    const saveBookingUrl = useCallback(async (bookingUrl: string) => {
        if (!profile?.id) {
            return false;
        }

        try {
            await updateDoc(doc(db, 'users', profile.id), { bookingUrl });
            await refreshProfile();
            showToast('Gespeichert', 'Dein Buchungs-Link wurde aktualisiert.');
            return true;
        } catch (error) {
            console.error('Booking url update failed', error);
            showToast('Fehler', 'Link konnte nicht gespeichert werden.', 'error');
            return false;
        }
    }, [profile?.id, refreshProfile, showToast]);

    const resetPassword = useCallback(async () => {
        if (!auth.currentUser?.email) {
            showToast('Fehler', 'Keine E-Mail fuer Passwort-Reset vorhanden.', 'error');
            return false;
        }

        try {
            await sendPasswordResetEmail(auth, auth.currentUser.email);
            showToast('Erfolg', 'Der Link zum Zuruecksetzen wurde versendet.');
            return true;
        } catch (error) {
            console.error('Password reset failed', error);
            showToast('Fehler', 'Passwort konnte nicht zurueckgesetzt werden.', 'error');
            return false;
        }
    }, [showToast]);

    const openTelegramBot = useCallback(async (userId: string | undefined) => {
        if (!userId) {
            return false;
        }

        try {
            await Linking.openURL(`tg://resolve?domain=TherapieAppBot&start=${userId}`);
            return true;
        } catch (error) {
            console.error('Telegram open failed', error);
            showToast('Fehler', 'Telegram konnte nicht geoeffnet werden.', 'error');
            return false;
        }
    }, [showToast]);

    return {
        savingProfile,
        uploadingPhoto,
        pickProfilePhoto,
        saveProfile,
        toggleCalendarSync,
        toggleNotifications,
        saveReminder,
        saveBookingUrl,
        resetPassword,
        openTelegramBot,
    };
}

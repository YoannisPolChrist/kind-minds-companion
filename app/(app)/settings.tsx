import { View, Text, TouchableOpacity, ScrollView as DefaultScrollView, Switch, Alert, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../utils/useAppStore';
import { useState, useEffect } from 'react';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../contexts/AuthContext';
import { syncExercisesToCalendar } from '../../utils/calendar';
import { scheduleExerciseReminders } from '../../utils/notifications';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../utils/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import i18n from '../../utils/i18n';
import { useLanguage } from '../../contexts/LanguageContext';
import { MotiView } from 'moti';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';

export default function SettingsScreen() {
    const router = useRouter();
    const { profile, signOut } = useAuth();
    const [calendarEnabled, setCalendarEnabled] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const { reminderHour, setReminderHour } = useAppStore();
    const [bookingUrl, setBookingUrl] = useState<string>('');
    const { locale, setLanguage } = useLanguage();

    useEffect(() => {
        if (profile?.bookingUrl) {
            setBookingUrl(profile.bookingUrl);
        }
    }, [profile?.bookingUrl]);

    useEffect(() => {
        checkPermissions();
    }, []);

    const saveReminderHour = async (hour: number) => {
        try {
            setReminderHour(hour);
            // Fix #14: Reschedule notifications immediately with the new hour
            try {
                const q = query(collection(db, 'exercises'), where('clientId', '==', profile?.id));
                const snap = await getDocs(q);
                const exercises = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
                await scheduleExerciseReminders(exercises);
            } catch (scheduleErr) {
                console.warn('Could not reschedule reminders immediately:', scheduleErr);
            }
            Alert.alert(i18n.t('settings.saved'), i18n.t('settings.reminder_saved', { hour }));
        } catch (e) {
            console.error("Failed to save settings", e);
        }
    };

    const saveBookingUrl = async () => {
        if (!profile?.id) return;
        try {
            await updateDoc(doc(db, 'users', profile.id), { bookingUrl });
            Alert.alert(i18n.t('settings.saved', { defaultValue: 'Gespeichert' }), i18n.t('settings.booking_url_saved', { defaultValue: 'Dein Buchungs-Link wurde aktualisiert.' }));
        } catch (e) {
            Alert.alert(i18n.t('settings.error', { defaultValue: 'Fehler' }), 'Link konnte nicht gespeichert werden.');
        }
    };

    const checkPermissions = async () => {
        const { status: calStatus } = await Calendar.getCalendarPermissionsAsync();
        setCalendarEnabled(calStatus === 'granted');

        const { status: notifStatus } = await Notifications.getPermissionsAsync();
        setNotificationsEnabled(notifStatus === 'granted');
    };

    const toggleCalendar = async () => {
        if (!calendarEnabled) {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status === 'granted') {
                setCalendarEnabled(true);

                try {
                    const q = query(collection(db, "exercises"), where("clientId", "==", profile?.id));
                    const querySnapshot = await getDocs(q);
                    const exData: any[] = [];
                    querySnapshot.forEach(doc => exData.push({ id: doc.id, ...doc.data() }));

                    await syncExercisesToCalendar(exData);
                } catch (e) {
                    console.error("Failed to fetch exercises for calendar sync", e);
                }
            } else {
                Alert.alert(i18n.t('settings.error'), i18n.t('settings.cal_denied'));
            }
        } else {
            setCalendarEnabled(false);
            // Optional: Remove calendars/events
        }
    };

    const toggleNotifications = async () => {
        if (!notificationsEnabled) {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status === 'granted') {
                setNotificationsEnabled(true);
            } else {
                Alert.alert(i18n.t('settings.error'), i18n.t('settings.notif_denied'));
            }
        } else {
            // Fix #13: Actually cancel all pending reminders when user turns off notifications
            await Notifications.cancelAllScheduledNotificationsAsync();
            setNotificationsEnabled(false);
        }
    };

    const handleResetPassword = async () => {
        if (!profile?.id || !auth.currentUser?.email) {
            Alert.alert(i18n.t('settings.error'), i18n.t('settings.pw_no_email'));
            return;
        }

        try {
            await sendPasswordResetEmail(auth, auth.currentUser.email);
            Alert.alert(i18n.t('settings.success'), i18n.t('settings.pw_sent'));
        } catch (error: any) {
            Alert.alert(i18n.t('settings.error'), i18n.t('settings.pw_error'));
        }
    };

    return (
        <View className="flex-1 bg-[#FAF9F6]">
            {/* Animated Header */}
            <MotiView
                from={{ opacity: 0, translateY: -40 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 50 }}
            >
                <LinearGradient
                    colors={['#1a365d', '#2C3E50']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="pt-16 pb-6 px-6 rounded-b-3xl shadow-md z-10 flex-row items-center justify-between"
                >
                    <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md flex-row items-center">
                        <ChevronLeft size={18} color="white" />
                        <Text className="text-white font-bold ml-1">{i18n.t('exercise.back')}</Text>
                    </TouchableOpacity>
                    <Text className="text-xl font-extrabold text-white flex-1 text-right ml-4">
                        {i18n.t('settings.title')}
                    </Text>
                </LinearGradient>
            </MotiView>

            <DefaultScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="px-6 pt-6 pb-10">

                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300, delay: 150 }}>
                        <Text className="text-xl font-bold text-[#2C3E50] mb-4">{i18n.t('settings.advanced')}</Text>
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, translateY: 25 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 350, delay: 200 }}
                    >
                        <View className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-6">
                            <View className="flex-row justify-between items-center mb-6">
                                <View className="flex-1 pr-4">
                                    <Text className="text-lg font-bold text-[#2C3E50] mb-1 flex-wrap" numberOfLines={2}>{i18n.t('settings.cal_title')}</Text>
                                    <Text className="text-gray-500 text-sm flex-wrap" numberOfLines={3}>{i18n.t('settings.cal_desc')}</Text>
                                </View>
                                <Switch
                                    value={calendarEnabled}
                                    onValueChange={(val) => { toggleCalendar(); }}
                                    trackColor={{ false: '#E5E7EB', true: '#2C3E50' }}
                                />
                            </View>

                            <View className="h-[1px] bg-gray-100 w-full mb-6" />

                            <View className="flex-row justify-between items-center">
                                <View className="flex-1 pr-4">
                                    <Text className="text-lg font-bold text-[#2C3E50] mb-1 flex-wrap" numberOfLines={2}>{i18n.t('settings.notif_title')}</Text>
                                    <Text className="text-gray-500 text-sm flex-wrap" numberOfLines={3}>{i18n.t('settings.notif_desc')}</Text>
                                </View>
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={(val) => { toggleNotifications(); }}
                                    trackColor={{ false: '#E5E7EB', true: '#2C3E50' }}
                                />
                            </View>
                        </View>
                    </MotiView>

                    {notificationsEnabled && (
                        <MotiView
                            from={{ opacity: 0, translateY: 25 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 350, delay: 250 }}
                        >
                            <View className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-6">
                                <Text className="text-lg font-bold text-[#2C3E50] mb-3">{i18n.t('settings.reminder_time')}</Text>
                                <Text className="text-gray-500 text-sm mb-4">{i18n.t('settings.reminder_desc')}</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {['08:00', '10:00', '14:00', '18:00', '20:00'].map((time) => {
                                        const hour = parseInt(time.split(':')[0]);
                                        const isSelected = reminderHour === hour;
                                        return (
                                            <TouchableOpacity
                                                key={time}
                                                onPress={() => {
                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    saveReminderHour(hour);
                                                }}
                                                className={`border px-4 py-3 rounded-xl flex-1 items-center min-w-[30%] ${isSelected ? 'bg-[#2C3E50] border-[#2C3E50]' : 'bg-gray-50 border-gray-200'}`}
                                            >
                                                <Text className={`font-bold ${isSelected ? 'text-white' : 'text-[#2C3E50]'}`}>{time}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        </MotiView>
                    )}

                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300, delay: 300 }}>
                        <Text className="text-xl font-bold text-[#2C3E50] mb-4 mt-2">{i18n.t('settings.app_settings')}</Text>
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, translateY: 25 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 350, delay: 350 }}
                    >
                        {profile?.role === 'therapist' && (
                            <View className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-6">
                                <Text className="text-lg font-bold text-[#2C3E50] mb-1">{i18n.t('settings.booking_title', { defaultValue: 'Buchungs-Link (Cal.com / Calendly)' })}</Text>
                                <Text className="text-gray-500 text-sm mb-4">
                                    {i18n.t('settings.booking_desc', { defaultValue: 'Hinterlege deinen Link, damit Klienten direkt Termine bei dir buchen können.' })}
                                </Text>
                                <View className="flex-row items-center">
                                    <TextInput
                                        value={bookingUrl}
                                        onChangeText={setBookingUrl}
                                        placeholder="https://cal.com/dein-name"
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#2C3E50] font-medium"
                                        autoCapitalize="none"
                                        keyboardType="url"
                                    />
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            saveBookingUrl();
                                        }}
                                        className="bg-[#137386] px-4 py-3 rounded-xl ml-2">
                                        <Text className="text-white font-bold">{i18n.t('settings.save', { defaultValue: 'Speichern' })}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <View className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 mb-6">
                            {/* Language Setting */}
                            <View className="flex-row justify-between items-center py-3">
                                <View className="flex-1 pr-4">
                                    <Text className="text-lg font-bold text-[#2C3E50] flex-wrap" numberOfLines={2}>{i18n.t('settings.lang_title')}</Text>
                                    <Text className="text-gray-500 text-sm flex-wrap" numberOfLines={3}>{i18n.t('settings.lang_desc')}</Text>
                                </View>
                                <DefaultScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pl-2">
                                    {['de', 'en', 'es', 'fr', 'it'].map((lang) => (
                                        <TouchableOpacity
                                            key={lang}
                                            onPress={() => setLanguage(lang)}
                                            className={`px-3 py-1 rounded-lg ${locale === lang ? 'bg-[#2C3E50]' : 'bg-gray-100'} mx-1`}
                                        >
                                            <Text className={`font-bold ${locale === lang ? 'text-white' : 'text-gray-500'}`}>
                                                {lang.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </DefaultScrollView>
                            </View>

                            <View className="h-[1px] bg-gray-100 w-full" />

                            {/* Telegram Connection */}
                            <TouchableOpacity
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    if (!profile?.id) return;
                                    // Replace YOUR_BOT_USERNAME with the actual bot username provided by BotFather
                                    const botUrl = `tg://resolve?domain=TherapieAppBot&start=${profile.id}`;
                                    import('react-native').then(rn => {
                                        rn.Linking.openURL(botUrl).catch(() => {
                                            Alert.alert(i18n.t('settings.error'), i18n.t('settings.telegram_error'));
                                        });
                                    });
                                }}
                                className="flex-row justify-between items-center py-4"
                            >
                                <View className="flex-1 pr-4">
                                    <Text className="text-lg font-bold text-[#2C3E50] flex-wrap" numberOfLines={2}>{i18n.t('settings.telegram_title')}</Text>
                                    <Text className="text-gray-500 text-sm flex-wrap" numberOfLines={3}>{i18n.t('settings.telegram_desc')}</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Text className="text-[#0088cc] font-bold mr-1">Verbinden</Text>
                                    <ChevronRight size={18} color="#0088cc" />
                                </View>
                            </TouchableOpacity>

                            <View className="h-[1px] bg-gray-100 w-full" />

                            {/* Password Reset */}
                            <TouchableOpacity
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    handleResetPassword();
                                }}
                                className="flex-row justify-between items-center py-4">
                                <View className="flex-1 pr-4">
                                    <Text className="text-lg font-bold text-[#2C3E50] flex-wrap" numberOfLines={2}>{i18n.t('settings.pw_title')}</Text>
                                    <Text className="text-gray-500 text-sm flex-wrap" numberOfLines={3}>{i18n.t('settings.pw_desc')}</Text>
                                </View>
                                <ChevronRight size={20} color="#9ca3af" />
                            </TouchableOpacity>

                            <View className="h-[1px] bg-gray-100 w-full" />

                            {/* Exercise History */}
                            <TouchableOpacity
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/(app)/history' as any);
                                }}
                                className="flex-row justify-between items-center py-4">
                                <View className="flex-1 pr-4">
                                    <Text className="text-lg font-bold text-[#2C3E50] flex-wrap" numberOfLines={2}>{i18n.t('settings.hist_title')}</Text>
                                    <Text className="text-gray-500 text-sm flex-wrap" numberOfLines={3}>{i18n.t('settings.hist_desc')}</Text>
                                </View>
                                <ChevronRight size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 350, delay: 400 }}
                    >
                        <TouchableOpacity
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                signOut();
                            }}
                            className="mt-2 bg-red-50 border border-red-100 py-4 rounded-2xl items-center">
                            <Text className="text-red-600 font-bold text-lg">{i18n.t('settings.logout')}</Text>
                        </TouchableOpacity>
                    </MotiView>

                </View>
            </DefaultScrollView>
        </View>
    );
}

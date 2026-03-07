import { View, Text, ScrollView as DefaultScrollView, Switch, Alert, TextInput, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../utils/useAppStore';
import { useState, useEffect } from 'react';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { syncExercisesToCalendar } from '../../utils/calendar';
import { scheduleExerciseReminders } from '../../utils/notifications';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../utils/firebase';
import { sendPasswordResetEmail, updateEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { uploadFile, generateStoragePath, getExtension } from '../../utils/uploadFile';
import i18n from '../../utils/i18n';
import { useLanguage } from '../../contexts/LanguageContext';
import { MotiView } from 'moti';
import { ChevronRight, ChevronLeft, Camera, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import { useAuthStore } from '../../stores/authStore';
import { SuccessAnimation } from '../../components/ui/SuccessAnimation';
import { useTheme, ThemeType } from '../../contexts/ThemeContext';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';

export default function SettingsScreen() {
    const router = useRouter();
    const { profile, signOut } = useAuth();
    const refreshProfile = useAuthStore(state => state.refreshProfile);
    const { reminderHour, setReminderHour, calendarSyncEnabled, setCalendarSyncEnabled, notificationsEnabled, setNotificationsEnabled } = useAppStore();
    const [bookingUrl, setBookingUrl] = useState<string>('');
    const { locale, setLanguage } = useLanguage();
    const { theme, setTheme, colors, isDark } = useTheme();
    const themeLabels = i18n.t('settings.theme_options', { returnObjects: true }) as Record<string, string>;

    // Profile editing state
    const [firstName, setFirstName] = useState(profile?.firstName || '');
    const [lastName, setLastName] = useState(profile?.lastName || '');
    const [email, setEmail] = useState(profile?.email || '');
    const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });

    const showToast = (message: string, subMessage?: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setToast({ visible: true, message, subMessage, type });
    };

    useEffect(() => {
        if (profile) {
            setFirstName(profile.firstName || '');
            setLastName(profile.lastName || '');
            setEmail(profile.email || '');
            setPhotoURL(profile.photoURL || '');
        }
    }, [profile?.id]);

    useEffect(() => {
        if (profile?.bookingUrl) {
            setBookingUrl(profile.bookingUrl);
        }
    }, [profile?.bookingUrl]);

    useEffect(() => {
        checkPermissions();
    }, []);

    const pickProfilePhoto = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                showToast(i18n.t('settings.permission_title'), i18n.t('settings.gallery_permission'), 'warning');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            if (result.canceled || !result.assets?.length) return;

            const asset = result.assets[0];
            setUploadingPhoto(true);

            const ext = getExtension(asset.uri) || 'jpg';
            const path = generateStoragePath(`profile_pictures/${profile?.id}`, ext);
            const downloadUrl = await uploadFile(asset.uri, path, 'image/jpeg');

            // Save to Firestore
            await updateDoc(doc(db, 'users', profile!.id), { photoURL: downloadUrl });
            setPhotoURL(downloadUrl);
            await refreshProfile();
        } catch (e) {
            console.error('Photo upload error:', e);
            showToast(i18n.t('settings.error'), i18n.t('settings.photo_upload_error'), 'error');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const saveProfile = async () => {
        if (!profile?.id) return;
        setSavingProfile(true);
        try {
            await updateDoc(doc(db, 'users', profile.id), {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
            });
            // Update email in Firebase Auth if changed
            if (email.trim() && email.trim() !== profile.email && auth.currentUser) {
                try {
                    await updateEmail(auth.currentUser, email.trim());
                    await updateDoc(doc(db, 'users', profile.id), { email: email.trim() });
                } catch (emailErr: any) {
                    showToast(i18n.t('settings.notice'), i18n.t('settings.email_update_failed'), 'warning');
                }
            }
            await refreshProfile();
            showToast(i18n.t('settings.saved'), i18n.t('settings.profile_saved'));
        } catch (e) {
            showToast(i18n.t('settings.error'), i18n.t('settings.profile_save_error'), 'error');
        } finally {
            setSavingProfile(false);
        }
    };

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
            showToast(i18n.t('settings.saved'), i18n.t('settings.reminder_saved', { hour }));
        } catch (e) {
            console.error("Failed to save settings", e);
        }
    };

    const saveBookingUrl = async () => {
        if (!profile?.id) return;
        try {
            await updateDoc(doc(db, 'users', profile.id), { bookingUrl });
            showToast(i18n.t('settings.saved'), i18n.t('settings.booking_url_saved'));
        } catch (e) {
            showToast(i18n.t('settings.error'), i18n.t('settings.booking_save_error'), 'error');
        }
    };

    const checkPermissions = async () => {
        // Turn off preferences if permissions were revoked system-wide
        const { status: calStatus } = await Calendar.getCalendarPermissionsAsync();
        if (calStatus !== 'granted') setCalendarSyncEnabled(false);

        const { status: notifStatus } = await Notifications.getPermissionsAsync();
        if (notifStatus !== 'granted') setNotificationsEnabled(false);
    };

    const toggleCalendar = async () => {
        if (!calendarSyncEnabled) {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status === 'granted') {
                setCalendarSyncEnabled(true);

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
                showToast(i18n.t('settings.error'), i18n.t('settings.cal_denied'), 'error');
            }
        } else {
            setCalendarSyncEnabled(false);
            // Optional: Remove calendars/events
        }
    };

    const toggleNotifications = async () => {
        if (!notificationsEnabled) {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status === 'granted') {
                setNotificationsEnabled(true);
                // Trigger a rescheduling now that they are enabled
                try {
                    if (profile?.id) {
                        const q = query(collection(db, 'exercises'), where('clientId', '==', profile?.id));
                        const snap = await getDocs(q);
                        const exercises = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
                        await scheduleExerciseReminders(exercises);
                    }
                } catch (e) { console.error('Error scheduling on toggle', e); }
            } else {
                showToast(i18n.t('settings.error'), i18n.t('settings.notif_denied'), 'error');
            }
        } else {
            await Notifications.cancelAllScheduledNotificationsAsync();
            setNotificationsEnabled(false);
        }
    };

    const handleResetPassword = async () => {
        if (!profile?.id || !auth.currentUser?.email) {
            showToast(i18n.t('settings.error'), i18n.t('settings.pw_no_email'), 'error');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, auth.currentUser.email);
            showToast(i18n.t('settings.success'), i18n.t('settings.pw_sent'));
        } catch (error: any) {
            showToast(i18n.t('settings.error'), i18n.t('settings.pw_error'), 'error');
        }
    };

    return (
        <View className="flex-1 bg-[#F7F4EE]">
            <DefaultScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Animated Header */}
            <MotiView
                from={{ opacity: 0, translateY: -40 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 50 }}
                style={{ zIndex: 100, elevation: 100 }}
            >
                <View className="pt-16 pb-6 px-6 rounded-b-3xl shadow-md z-10 flex-row items-center justify-between overflow-hidden">
                    <LinearGradient
                        colors={[colors.primaryDark, colors.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Zurück"
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                if (profile?.role === 'therapist') {
                                    router.replace('/(app)/therapist' as any);
                                } else {
                                    router.replace('/(app)' as any);
                                }
                            }
                        }}
                        withHaptics={false}
                        intensity="subtle"
                        className="bg-white/20 px-4 py-3 rounded-xl backdrop-blur-md flex-row items-center z-50"
                        style={{ zIndex: 50, elevation: 50 }}
                    >
                        <ChevronLeft size={20} color="white" />
                        <Text className="text-white font-bold ml-1">{i18n.t('exercise.back')}</Text>
                    </PressableScale>
                    <Text className="text-xl font-extrabold text-white flex-1 text-right ml-4 z-10">
                        {i18n.t('settings.title')}
                    </Text>
                </View>
            </MotiView>

            <View>
                <View className="px-6 pt-6 pb-10">

                    {/* ─── Profile Section ────────────────────────────────── */}
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 350, delay: 100 }}
                    >
                        <Text style={{ color: colors.text }} className="text-xl font-bold mb-4">{i18n.t('settings.profile_section_title')}</Text>
                        <Card className="mb-6">
                            {/* Avatar */}
                            <View className="items-center mb-6">
                                <PressableScale onPress={pickProfilePhoto} disabled={uploadingPhoto} intensity="medium">
                                    <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#E8F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#2D666B', overflow: 'hidden' }}>
                                        {photoURL ? (
                                            <Image source={{ uri: photoURL }} style={{ width: 96, height: 96, borderRadius: 48 }} />
                                        ) : (
                                            <User size={40} color="#2D666B" />
                                        )}
                                    </View>
                                    <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#2D666B', borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' }}>
                                        <Camera size={16} color="white" />
                                    </View>
                                </PressableScale>
                                <Text className="text-sm text-gray-500 mt-2">
                                    {uploadingPhoto ? i18n.t('settings.profile_photo_uploading') : i18n.t('settings.profile_photo_change')}
                                </Text>
                            </View>

                            {/* Name fields */}
                            <View className="flex-row gap-3 mb-3">
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-[#1F2528] mb-1.5">{i18n.t('settings.profile_first_name_label')}</Text>
                                    <TextInput
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        placeholder={i18n.t('settings.profile_first_name_label')}
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#1F2528] font-medium"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-[#1F2528] mb-1.5">{i18n.t('settings.profile_last_name_label')}</Text>
                                    <TextInput
                                        value={lastName}
                                        onChangeText={setLastName}
                                        placeholder={i18n.t('settings.profile_last_name_label')}
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#1F2528] font-medium"
                                    />
                                </View>
                            </View>

                            {/* Email */}
                            <View className="mb-5">
                                <Text className="text-sm font-bold text-[#1F2528] mb-1.5">{i18n.t('settings.profile_email_label')}</Text>
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder={i18n.t('settings.profile_email_label')}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#1F2528] font-medium"
                                />
                            </View>

                            <PressableScale
                                onPress={saveProfile}
                                disabled={savingProfile}
                                intensity="medium"
                                className="bg-[#2D666B] py-4 rounded-2xl items-center"
                                style={{ opacity: savingProfile ? 0.7 : 1 }}
                            >
                                <Text className="text-white font-bold text-base">
                                    {savingProfile ? i18n.t('settings.profile_saving') : i18n.t('settings.profile_save')}
                                </Text>
                            </PressableScale>
                        </Card>
                    </MotiView>

                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300, delay: 150 }}>
                        <Text style={{ color: colors.text }} className="text-xl font-bold mb-4">{i18n.t('settings.advanced')}</Text>
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, translateY: 25 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 350, delay: 200 }}
                    >
                        <Card className="mb-6">
                            <View className="flex-row justify-between items-center mb-6">
                                <View className="flex-1 pr-4">
                                    <Text className="text-lg font-bold text-[#1F2528] mb-1 flex-wrap" numberOfLines={2}>{i18n.t('settings.cal_title')}</Text>
                                    <Text className="text-gray-500 text-sm flex-wrap" numberOfLines={3}>{i18n.t('settings.cal_desc')}</Text>
                                </View>
                                <Switch
                                    value={calendarSyncEnabled}
                                    onValueChange={(val) => { toggleCalendar(); }}
                                    trackColor={{ false: '#E7E0D4', true: '#2D666B' }}
                                />
                            </View>

                            <View className="h-[1px] bg-gray-100 w-full mb-6" />

                            <View className="flex-row justify-between items-center">
                                <View className="flex-1 pr-4">
                                    <Text className="text-lg font-bold text-[#1F2528] mb-1 flex-wrap" numberOfLines={2}>{i18n.t('settings.notif_title')}</Text>
                                    <Text className="text-gray-500 text-sm flex-wrap" numberOfLines={3}>{i18n.t('settings.notif_desc')}</Text>
                                </View>
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={(val) => { toggleNotifications(); }}
                                    trackColor={{ false: '#E7E0D4', true: '#2D666B' }}
                                />
                            </View>
                        </Card>
                    </MotiView>

                    {notificationsEnabled && (
                        <MotiView
                            from={{ opacity: 0, translateY: 25 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 350, delay: 250 }}
                        >
                            <Card padding="sm" className="mb-6">
                                <Text style={{ color: colors.text }} className="text-lg font-bold mb-3">{i18n.t('settings.reminder_time')}</Text>
                                <Text className="text-gray-500 text-sm mb-4">{i18n.t('settings.reminder_desc')}</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {['08:00', '10:00', '14:00', '18:00', '20:00'].map((time) => {
                                        const hour = parseInt(time.split(':')[0]);
                                        const isSelected = reminderHour === hour;
                                        return (
                                            <PressableScale
                                                key={time}
                                                onPress={() => {
                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    saveReminderHour(hour);
                                                }}
                                                withHaptics={false}
                                                intensity="subtle"
                                                className={`border px-4 py-3 rounded-xl flex-1 items-center min-w-[30%] ${isSelected ? 'bg-[#2D666B] border-[#2D666B]' : 'bg-gray-50 border-gray-200'}`}
                                            >
                                                <Text className={`font-bold ${isSelected ? 'text-white' : 'text-[#1F2528]'}`}>{time}</Text>
                                            </PressableScale>
                                        );
                                    })}
                                </View>
                            </Card>
                        </MotiView>
                    )}

                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300, delay: 300 }}>
                        <Text className="text-xl font-bold text-[#1F2528] mb-4 mt-2">{i18n.t('settings.app_settings')}</Text>
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, translateY: 25 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 350, delay: 350 }}
                    >
                        {profile?.role === 'therapist' && (
                            <Card padding="sm" className="mb-6">
                                <Text style={{ color: colors.text }} className="text-lg font-bold mb-1">{i18n.t('settings.booking_title')}</Text>
                                <Text className="text-gray-500 text-sm mb-4">
                                    {i18n.t('settings.booking_desc')}
                                </Text>
                                <View className="flex-row items-center">
                                    <TextInput
                                        value={bookingUrl}
                                        onChangeText={setBookingUrl}
                                        placeholder="https://cal.com/dein-name"
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#1F2528] font-medium"
                                        autoCapitalize="none"
                                        keyboardType="url"
                                        style={{ color: '#1F2528' }}
                                    />
                                    <PressableScale
                                        onPress={() => {
                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            saveBookingUrl();
                                        }}
                                        withHaptics={false}
                                        intensity="subtle"
                                        className="bg-[#2D666B] px-4 py-3 rounded-xl ml-2">
                                        <Text className="text-white font-bold">{i18n.t('settings.save', { defaultValue: 'Speichern' })}</Text>
                                    </PressableScale>
                                </View>
                            </Card>
                        )}

                        <Card padding="sm" className="mb-6">
                            {/* Theme Setting */}
                            <View className="flex-row items-center justify-between mb-2">
                                <Text style={{ color: colors.text }} className="text-base font-bold">{i18n.t('settings.theme_title')}</Text>
                            </View>
                            <View className="flex-row bg-gray-50 rounded-xl p-1 mb-4 border border-gray-200">
                                {['system', 'light', 'dark'].map((t) => {
                                    const isActive = theme === t;
                                    return (
                                        <PressableScale
                                            key={t}
                                            onPress={() => setTheme(t as ThemeType)}
                                            intensity="subtle"
                                            className={`flex-1 py-2.5 items-center justify-center rounded-lg ${isActive ? 'bg-white shadow-sm' : ''}`}
                                            style={isActive ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {}}
                                        >
                                            <Text className={`font-bold ${isActive ? 'text-[#2D666B]' : 'text-gray-500'}`}>
                                                {themeLabels?.[t] || t}
                                            </Text>
                                        </PressableScale>
                                    );
                                })}
                            </View>

                            <View className="h-[1px] bg-gray-100 w-full mb-4" />

                            {/* Language Setting */}
                            <View className="flex-row justify-between items-center py-3">
                                <View className="flex-1 pr-4">
                                    <Text style={{ color: colors.text }} className="text-lg font-bold flex-wrap" numberOfLines={2}>{i18n.t('settings.lang_title')}</Text>
                                    <Text className="text-gray-500 text-sm flex-wrap" numberOfLines={3}>{i18n.t('settings.lang_desc')}</Text>
                                </View>
                                <DefaultScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pl-2">
                                    {['de', 'en', 'es', 'fr', 'it'].map((lang) => (
                                        <PressableScale
                                            key={lang}
                                            onPress={() => setLanguage(lang)}
                                            intensity="subtle"
                                            className={`px-3 py-1 rounded-lg ${locale === lang ? 'bg-[#2D666B]' : 'bg-gray-100'} mx-1`}
                                        >
                                            <Text className={`font-bold ${locale === lang ? 'text-white' : 'text-gray-500'}`}>
                                                {lang.toUpperCase()}
                                            </Text>
                                        </PressableScale>
                                    ))}
                                </DefaultScrollView>
                            </View>

                            <View className="h-[1px] bg-gray-100 w-full" />

                            {/* Telegram Connection */}
                            <PressableScale
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    if (!profile?.id) return;
                                    // Replace YOUR_BOT_USERNAME with the actual bot username provided by BotFather
                                    const botUrl = `tg://resolve?domain=TherapieAppBot&start=${profile.id}`;
                                    import('react-native').then(rn => {
                                        rn.Linking.openURL(botUrl).catch(() => {
                                            showToast(i18n.t('settings.error'), i18n.t('settings.telegram_error'), 'error');
                                        });
                                    });
                                }}
                                withHaptics={false}
                                intensity="subtle"
                                className="flex-row justify-between items-center py-4"
                            >
                                <View className="flex-1 pr-4">
                                    <Text style={{ color: colors.text }} className="text-lg font-bold flex-wrap" numberOfLines={2}>{i18n.t('settings.telegram_title')}</Text>
                                    <Text className="text-gray-500 text-sm flex-wrap" numberOfLines={3}>{i18n.t('settings.telegram_desc')}</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Text className="text-[#0088cc] font-bold mr-1">{i18n.t('settings.telegram_connect_button')}</Text>
                                    <ChevronRight size={18} color="#0088cc" />
                                </View>
                            </PressableScale>

                            <View className="h-[1px] bg-gray-100 w-full" />

                            {/* Password Reset */}
                            <PressableScale
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    handleResetPassword();
                                }}
                                withHaptics={false}
                                intensity="subtle"
                                className="flex-row justify-between items-center py-4">
                                <View className="flex-1 pr-4">
                                    <Text style={{ color: colors.text }} className="text-lg font-bold flex-wrap" numberOfLines={2}>{i18n.t('settings.pw_title')}</Text>
                                    <Text className="text-gray-500 text-sm flex-wrap" numberOfLines={3}>{i18n.t('settings.pw_desc')}</Text>
                                </View>
                                <ChevronRight size={20} color="#8B938E" />
                            </PressableScale>

                            <View className="h-[1px] bg-gray-100 w-full" />

                            {/* Exercise History */}
                            <PressableScale
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/(app)/history' as any);
                                }}
                                withHaptics={false}
                                intensity="subtle"
                                className="flex-row justify-between items-center py-4">
                                <View className="flex-1 pr-4">
                                    <Text style={{ color: colors.text }} className="text-lg font-bold flex-wrap" numberOfLines={2}>{i18n.t('settings.hist_title')}</Text>
                                    <Text className="text-gray-500 text-sm flex-wrap" numberOfLines={3}>{i18n.t('settings.hist_desc')}</Text>
                                </View>
                                <ChevronRight size={20} color="#8B938E" />
                            </PressableScale>
                        </Card>
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 350, delay: 400 }}
                    >
                        <PressableScale
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                signOut();
                            }}
                            withHaptics={false}
                            intensity="medium"
                            className="mt-2 bg-red-50 border border-red-100 py-4 rounded-2xl items-center">
                            <Text className="text-red-600 font-bold text-lg">{i18n.t('settings.logout')}</Text>
                        </PressableScale>
                    </MotiView>

                </View>
            </View>
            </DefaultScrollView>

            <SuccessAnimation
                visible={toast.visible}
                type={toast.type}
                message={toast.message}
                subMessage={toast.subMessage}
                onAnimationDone={() => setToast(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}


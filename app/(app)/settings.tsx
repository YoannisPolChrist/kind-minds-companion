import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { MotiView } from 'moti';
import { Bell, BookOpen, CalendarDays, Camera, ChevronLeft, FileText, History, KeyRound, Languages, Link2, LogOut, Palette, User, Users } from 'lucide-react-native';
import { useAppStore } from '../../utils/useAppStore';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuthStore } from '../../stores/authStore';
import { useTheme, ThemeType } from '../../contexts/ThemeContext';
import i18n from '../../utils/i18n';
import { Card } from '../../components/ui/Card';
import { ChoiceChipGroup } from '../../components/ui/ChoiceChipGroup';
import { QuickRowCard } from '../../components/ui/QuickRowCard';
import { SettingSwitchCard } from '../../components/ui/SettingSwitchCard';
import { SuccessAnimation } from '../../components/ui/SuccessAnimation';
import { TherapistHeroBanner } from '../../components/therapist/TherapistHeroBanner';
import { useSettingsActions } from '../../hooks/settings/useSettingsActions';

type ToastState = { visible: boolean; message: string; subMessage?: string; type: 'success' | 'error' | 'warning' };

const CALENDAR_PROVIDER_OPTIONS = [
  { key: 'device', label: 'Geraet' },
  { key: 'google', label: 'Google' },
  { key: 'icloud', label: 'iCloud' },
] as const;

const REMINDER_OPTIONS = ['08:00', '10:00', '14:00', '18:00', '20:00'] as const;

const LANGUAGE_OPTIONS = [
  { key: 'de', label: 'DE' },
  { key: 'en', label: 'EN' },
  { key: 'es', label: 'ES' },
  { key: 'fr', label: 'FR' },
  { key: 'it', label: 'IT' },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const {
    reminderHour,
    setReminderHour,
    calendarSyncEnabled,
    setCalendarSyncEnabled,
    preferredCalendarProvider,
    setPreferredCalendarProvider,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useAppStore();
  const { locale, setLanguage } = useLanguage();
  const { theme, setTheme, colors, isDark } = useTheme();
  const languageDescription =
    locale === 'de'
      ? 'Beim ersten Start wird die Geraete-Sprache erkannt. Hier kannst du sie jederzeit aendern.'
      : i18n.t('settings.lang_desc');
  const [bookingUrl, setBookingUrl] = useState('');
  const [firstName, setFirstName] = useState(profile?.firstName || '');
  const [lastName, setLastName] = useState(profile?.lastName || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const showToast = (message: string, subMessage?: string, type: ToastState['type'] = 'success') => setToast({ visible: true, message, subMessage, type });
  const settingsActions = useSettingsActions({
    profile,
    refreshProfile,
    showToast,
    setCalendarSyncEnabled,
    setNotificationsEnabled,
    setReminderHour,
  });

  useEffect(() => {
    setSavingProfile(settingsActions.savingProfile);
  }, [settingsActions.savingProfile]);

  useEffect(() => {
    setUploadingPhoto(settingsActions.uploadingPhoto);
  }, [settingsActions.uploadingPhoto]);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName || '');
    setLastName(profile.lastName || '');
    setEmail(profile.email || '');
    setPhotoURL(profile.photoURL || '');
    setBookingUrl(profile.bookingUrl || '');
  }, [profile?.id, profile?.bookingUrl, profile?.email, profile?.firstName, profile?.lastName, profile?.photoURL]);

  useEffect(() => {
    (async () => {
      const cal = await Calendar.getCalendarPermissionsAsync();
      if (cal.status !== 'granted') setCalendarSyncEnabled(false);
      const notif = await Notifications.getPermissionsAsync();
      if (notif.status !== 'granted') setNotificationsEnabled(false);
    })();
  }, [setCalendarSyncEnabled, setNotificationsEnabled]);

  const navItems = useMemo(() => profile?.role === 'therapist'
    ? [
        { key: 'clients', icon: <Users size={18} color={colors.primary} />, title: 'Alle Klienten', desc: 'Uebersicht, Betreuung und Zuweisungen', onPress: () => router.push('/(app)/therapist/clients' as any) },
        { key: 'templates', icon: <BookOpen size={18} color={colors.primary} />, title: 'Vorlagen', desc: 'Interaktive Uebungsvorlagen verwalten', onPress: () => router.push('/(app)/therapist/templates' as any) },
        { key: 'resources', icon: <FileText size={18} color={colors.primary} />, title: 'Bibliothek', desc: 'Materialien, Links und Uploads', onPress: () => router.push('/(app)/therapist/resources' as any) },
      ]
    : [
        { key: 'checkins', icon: <CalendarDays size={18} color={colors.primary} />, title: 'Mein Tagebuch', desc: 'Check-ins und Stimmungsverlauf', onPress: () => router.push('/(app)/checkins' as any) },
        { key: 'exercises', icon: <BookOpen size={18} color={colors.primary} />, title: 'Alle Uebungen', desc: 'Deine Aufgaben und Routinen', onPress: () => router.push('/(app)/exercises' as any) },
        { key: 'notes', icon: <FileText size={18} color={colors.primary} />, title: 'Therapie-Tagebuch', desc: 'Notizen, Journal und Reflexion', onPress: () => router.push('/(app)/notes' as any) },
        { key: 'history', icon: <History size={18} color={colors.primary} />, title: 'Verlauf', desc: 'Erledigte Inhalte und Fortschritt', onPress: () => router.push('/(app)/history' as any) },
      ], [colors.primary, profile?.role, router]);

  const goBack = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) return router.back();
    router.replace(profile?.role === 'therapist' ? '/(app)/therapist' as any : '/(app)' as any);
  };

  const pickProfilePhoto = async () => {
    const nextPhoto = await settingsActions.pickProfilePhoto();
    if (nextPhoto) {
      setPhotoURL(nextPhoto);
    }
  };

  const saveProfile = async () => {
    await settingsActions.saveProfile({ firstName, lastName, email });
  };

  const toggleCalendar = async () => {
    await settingsActions.toggleCalendarSync(calendarSyncEnabled);
  };

  const toggleNotifications = async () => {
    await settingsActions.toggleNotifications(notificationsEnabled);
  };

  const saveReminder = async (hour: number) => {
    await settingsActions.saveReminder(hour);
  };

  const saveBookingUrl = async () => {
    await settingsActions.saveBookingUrl(bookingUrl);
  };

  const resetPassword = async () => {
    await settingsActions.resetPassword();
  };

/*
  const pickProfilePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted || !profile?.id) return showToast('Berechtigung', 'Galerie-Zugriff wird benoetigt.', 'warning');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets?.length) return;
      setUploadingPhoto(true);
      const asset = result.assets[0];
      const path = generateStoragePath(`profile_pictures/${profile.id}`, getExtension(asset.uri) || 'jpg');
      const downloadUrl = await uploadFile(asset.uri, path, 'image/jpeg');
      await updateDoc(doc(db, 'users', profile.id), { photoURL: downloadUrl });
      setPhotoURL(downloadUrl);
      await refreshProfile();
      showToast('Gespeichert', 'Profilbild wurde aktualisiert.');
    } catch (error) {
      console.error(error);
      showToast('Fehler', 'Foto konnte nicht hochgeladen werden.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfile = async () => {
    if (!profile?.id) return;
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', profile.id), { firstName: firstName.trim(), lastName: lastName.trim() });
      if (email.trim() && email.trim() !== profile.email && auth.currentUser) {
        try {
          await updateEmail(auth.currentUser, email.trim());
          await updateDoc(doc(db, 'users', profile.id), { email: email.trim() });
        } catch {
          showToast('Hinweis', 'Name gespeichert, aber E-Mail konnte nicht geaendert werden.', 'warning');
        }
      }
      await refreshProfile();
      showToast('Gespeichert', 'Dein Profil wurde erfolgreich aktualisiert.');
    } catch {
      showToast('Fehler', 'Profil konnte nicht gespeichert werden.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleCalendar = async () => {
    if (!calendarSyncEnabled) {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') return showToast(i18n.t('settings.error'), i18n.t('settings.cal_denied'), 'error');
      setCalendarSyncEnabled(true);
      try {
        const q = query(collection(db, 'exercises'), where('clientId', '==', profile?.id));
        const snap = await getDocs(q);
        await syncExercisesToCalendar(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
      } catch (error) {
        console.error(error);
      }
      return;
    }
    setCalendarSyncEnabled(false);
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return showToast(i18n.t('settings.error'), i18n.t('settings.notif_denied'), 'error');
      setNotificationsEnabled(true);
      try {
        const q = query(collection(db, 'exercises'), where('clientId', '==', profile?.id));
        const snap = await getDocs(q);
        await scheduleExerciseReminders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
      } catch (error) {
        console.error(error);
      }
      return;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    setNotificationsEnabled(false);
  };

  const saveReminder = async (hour: number) => {
    setReminderHour(hour);
    try {
      const q = query(collection(db, 'exercises'), where('clientId', '==', profile?.id));
      const snap = await getDocs(q);
      await scheduleExerciseReminders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
    } catch (error) {
      console.error(error);
    }
    showToast(i18n.t('settings.saved'), i18n.t('settings.reminder_saved', { hour }));
  };

  const saveBookingUrl = async () => {
    if (!profile?.id) return;
    try {
      await updateDoc(doc(db, 'users', profile.id), { bookingUrl });
      showToast(i18n.t('settings.saved', { defaultValue: 'Gespeichert' }), i18n.t('settings.booking_url_saved', { defaultValue: 'Dein Buchungs-Link wurde aktualisiert.' }));
    } catch {
      showToast(i18n.t('settings.error', { defaultValue: 'Fehler' }), 'Link konnte nicht gespeichert werden.', 'error');
    }
  };

  const resetPassword = async () => {
    if (!auth.currentUser?.email) return showToast(i18n.t('settings.error'), i18n.t('settings.pw_no_email'), 'error');
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      showToast(i18n.t('settings.success'), i18n.t('settings.pw_sent'));
    } catch {
      showToast(i18n.t('settings.error'), i18n.t('settings.pw_error'), 'error');
    }
  };
*/

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <TherapistHeroBanner seed={`settings-${profile?.role || 'client'}`} baseColor={colors.primary}>
          <TouchableOpacity onPress={goBack} activeOpacity={0.85} style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}>
            <ChevronLeft size={18} color="white" />
            <Text style={{ color: 'white', fontWeight: '800' }}>{i18n.t('exercise.back')}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={pickProfilePhoto} disabled={uploadingPhoto} activeOpacity={0.9}>
              <View style={{ width: 84, height: 84, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {photoURL ? <Image source={{ uri: photoURL }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <User size={34} color="white" />}
              </View>
              <View style={{ position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={15} color={colors.primary} />
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontSize: 31, fontWeight: '900', letterSpacing: -0.9 }}>{i18n.t('settings.title')}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, fontWeight: '600', marginTop: 4 }}>{profile?.firstName} {profile?.lastName} · {profile?.role === 'therapist' ? i18n.t('settings.role_therapist', { defaultValue: 'Therapeut' }) : i18n.t('settings.role_client', { defaultValue: 'Klient' })}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13, fontWeight: '500', marginTop: 4 }}>{uploadingPhoto ? 'Profilbild wird hochgeladen...' : (profile?.email || '')}</Text>
            </View>
          </View>
        </TherapistHeroBanner>

        <View style={{ width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 26 }}>
          <MotiView from={{ opacity: 0, translateY: 14 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 280 }}>
            <Card className="mb-5" style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }}>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.6, marginBottom: 6 }}>{i18n.t('settings.profile_title', { defaultValue: 'Mein Profil' })}</Text>
              <Text style={{ color: colors.textSubtle, fontSize: 14, marginBottom: 16 }}>{i18n.t('settings.profile_desc', { defaultValue: 'Persoenliche Angaben und Kontaktdaten.' })}</Text>
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <View style={{ flex: 1, minWidth: 220 }}><Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 6 }}>Vorname</Text><TextInput value={firstName} onChangeText={setFirstName} placeholder="Vorname" placeholderTextColor={colors.textSubtle} style={{ backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontWeight: '600' }} /></View>
                <View style={{ flex: 1, minWidth: 220 }}><Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 6 }}>Nachname</Text><TextInput value={lastName} onChangeText={setLastName} placeholder="Nachname" placeholderTextColor={colors.textSubtle} style={{ backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontWeight: '600' }} /></View>
              </View>
              <View style={{ marginBottom: 16 }}><Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 6 }}>E-Mail-Adresse</Text><TextInput value={email} onChangeText={setEmail} placeholder="E-Mail" placeholderTextColor={colors.textSubtle} keyboardType="email-address" autoCapitalize="none" style={{ backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontWeight: '600' }} /></View>
              <TouchableOpacity onPress={saveProfile} disabled={savingProfile} activeOpacity={0.88} style={{ minHeight: 52, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: savingProfile ? 0.7 : 1 }}><Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>{savingProfile ? 'Wird gespeichert...' : 'Profil speichern'}</Text></TouchableOpacity>
            </Card>
          </MotiView>

          <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 60 }}>
            <Card className="mb-5" style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }}>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.6, marginBottom: 6 }}>{i18n.t('settings.quick_access_title', { defaultValue: 'Schnellzugriff' })}</Text>
              <Text style={{ color: colors.textSubtle, fontSize: 14, marginBottom: 16 }}>{i18n.t('settings.quick_access_desc', { defaultValue: 'Navigation zu den wichtigsten Bereichen.' })}</Text>
              <View style={{ gap: 12 }}>
                {navItems.map((item) => (
                  <QuickRowCard key={item.key} icon={item.icon} title={item.title} description={item.desc} onPress={item.onPress} />
                ))}
              </View>
            </Card>
          </MotiView>

          <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 100 }}>
            <Card className="mb-5" style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.4, marginBottom: 16 }}>{i18n.t('settings.advanced')}</Text>
              <View style={{ gap: 14 }}>
                <SettingSwitchCard
                  icon={<CalendarDays size={18} color={colors.primary} />}
                  title={i18n.t('settings.cal_title')}
                  description={i18n.t('settings.cal_desc')}
                  value={calendarSyncEnabled}
                  onValueChange={() => {
                    void toggleCalendar();
                  }}
                >
                  {calendarSyncEnabled ? (
                    <View style={{ marginTop: 16 }}>
                      <ChoiceChipGroup
                        compact
                        options={CALENDAR_PROVIDER_OPTIONS as any}
                        value={preferredCalendarProvider}
                        onChange={(value) => setPreferredCalendarProvider(value as 'device' | 'google' | 'icloud')}
                      />
                    </View>
                  ) : null}
                </SettingSwitchCard>
                <SettingSwitchCard
                  icon={<Bell size={18} color={colors.primary} />}
                  title={i18n.t('settings.notif_title')}
                  description={i18n.t('settings.notif_desc')}
                  value={notificationsEnabled}
                  onValueChange={() => {
                    void toggleNotifications();
                  }}
                />
              </View>
            </Card>
          </MotiView>

          {notificationsEnabled ? <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 260, delay: 140 }}><Card padding="sm" className="mb-5" style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }}><Text style={{ color: colors.text, fontSize: 19, fontWeight: '900', marginBottom: 6 }}>{i18n.t('settings.reminder_time')}</Text><Text style={{ color: colors.textSubtle, fontSize: 14, marginBottom: 14 }}>{i18n.t('settings.reminder_desc')}</Text><ChoiceChipGroup options={REMINDER_OPTIONS.map((time) => ({ key: time, label: time })) as any} value={`${String(reminderHour).padStart(2, '0')}:00`} onChange={(time) => { void saveReminder(parseInt(time.split(':')[0], 10)); }} /></Card></MotiView> : null}

          <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 180 }}>
            <Card padding="sm" className="mb-5" style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.4, marginBottom: 16 }}>{i18n.t('settings.app_settings')}</Text>
              {profile?.role === 'therapist' ? <View style={{ marginBottom: 18 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}><Link2 size={16} color={colors.secondary} /><Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{i18n.t('settings.booking_title', { defaultValue: 'Buchungs-Link' })}</Text></View><Text style={{ color: colors.textSubtle, fontSize: 13, marginBottom: 12 }}>{i18n.t('settings.booking_desc', { defaultValue: 'Hinterlege deinen Link, damit Klienten direkt Termine buchen koennen.' })}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><TextInput value={bookingUrl} onChangeText={setBookingUrl} placeholder="https://cal.com/dein-name" placeholderTextColor={colors.textSubtle} autoCapitalize="none" keyboardType="url" style={{ flex: 1, minWidth: 220, backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontWeight: '600' }} /><TouchableOpacity onPress={saveBookingUrl} activeOpacity={0.85} style={{ minHeight: 48, borderRadius: 16, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}><Text style={{ color: 'white', fontWeight: '900' }}>{i18n.t('settings.save', { defaultValue: 'Speichern' })}</Text></TouchableOpacity></View></View> : null}
              <View style={{ marginBottom: 18 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}><Palette size={16} color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{i18n.t('settings.appearance_title', { defaultValue: 'Erscheinungsbild' })}</Text></View><View style={{ flexDirection: 'row', backgroundColor: colors.input, borderRadius: 18, padding: 6, borderWidth: 1, borderColor: colors.border }}>{(['system', 'light', 'dark'] as ThemeType[]).map((option) => { const active = theme === option; return <TouchableOpacity key={option} onPress={() => setTheme(option)} activeOpacity={0.85} style={{ flex: 1, minHeight: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.card : 'transparent', borderWidth: active ? 1 : 0, borderColor: active ? colors.border : 'transparent' }}><Text style={{ color: active ? colors.primary : colors.textSubtle, fontWeight: '800' }}>{({ system: i18n.t('settings.theme_system', { defaultValue: 'System' }), light: i18n.t('settings.theme_light', { defaultValue: 'Hell' }), dark: i18n.t('settings.theme_dark', { defaultValue: 'Dunkel' }) } as Record<ThemeType, string>)[option]}</Text></TouchableOpacity>; })}</View></View>
              <View style={{ marginBottom: 18 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}><Languages size={16} color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{i18n.t('settings.lang_title')}</Text></View><Text style={{ color: colors.textSubtle, fontSize: 13, marginBottom: 12 }}>{languageDescription}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{ paddingRight: 4 }}><ChoiceChipGroup compact options={LANGUAGE_OPTIONS as any} value={locale as typeof LANGUAGE_OPTIONS[number]['key']} onChange={(lang) => setLanguage(lang)} /></View></ScrollView></View>
              <View style={{ gap: 12 }}>
                <QuickRowCard icon={<View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(0,136,204,0.12)', alignItems: 'center', justifyContent: 'center' }}><Link2 size={17} color="#0088cc" /></View>} title={i18n.t('settings.telegram_title')} description={i18n.t('settings.telegram_desc')} onPress={() => { void settingsActions.openTelegramBot(profile?.id); }} />
                <QuickRowCard icon={<View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: isDark ? 'rgba(25,163,188,0.12)' : '#EEF7F8', alignItems: 'center', justifyContent: 'center' }}><KeyRound size={17} color={colors.primary} /></View>} title={i18n.t('settings.pw_title')} description={i18n.t('settings.pw_desc')} onPress={resetPassword} />
                <QuickRowCard icon={<View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: isDark ? 'rgba(25,163,188,0.12)' : '#EEF7F8', alignItems: 'center', justifyContent: 'center' }}><History size={17} color={colors.primary} /></View>} title={i18n.t('settings.hist_title')} description={i18n.t('settings.hist_desc')} onPress={() => router.push('/(app)/history' as any)} />
              </View>
            </Card>
          </MotiView>

          <MotiView from={{ opacity: 0, translateY: 14 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 280, delay: 220 }}>
            <TouchableOpacity onPress={signOut} activeOpacity={0.9} style={{ marginTop: 4, borderRadius: 22, backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.18)', minHeight: 58, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
              <LogOut size={18} color={colors.danger} />
              <Text style={{ color: colors.danger, fontWeight: '900', fontSize: 16 }}>{i18n.t('settings.logout')}</Text>
            </TouchableOpacity>
          </MotiView>
        </View>
      </ScrollView>

      <SuccessAnimation visible={toast.visible} type={toast.type} message={toast.message} subMessage={toast.subMessage} onAnimationDone={() => setToast((prev) => ({ ...prev, visible: false }))} />
    </View>
  );
}

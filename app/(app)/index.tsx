import { View, Text, TouchableOpacity, ActivityIndicator, InteractionManager, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import { Settings, Calendar, BookOpen, Edit3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../utils/useAppStore';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useCallback, useMemo, useState, lazy, Suspense } from 'react';
import { useRouter, useFocusEffect, Redirect } from 'expo-router';
import { collection, query, where, limit, getDocs, getDoc, doc } from 'firebase/firestore';
import Animated from 'react-native-reanimated';
import { db } from '../../utils/firebase';
import { registerForPushNotificationsAsync } from '../../utils/notifications';
import { useClientExercises } from '../../hooks/useClientExercises';
import i18n from '../../utils/i18n';
import { ProgressBar } from '../../components/dashboard/ProgressBar';
import { StatsRow } from '../../components/dashboard/StatsRow';
import { CheckinBanner } from '../../components/dashboard/CheckinBanner';
import { OpenExerciseCard } from '../../components/dashboard/OpenExerciseCard';
import { CompletedExerciseCard } from '../../components/dashboard/CompletedExerciseCard';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { ClientMetricCard } from '../../components/dashboard/ClientMetricCard';
import { DashboardSectionHeader } from '../../components/dashboard/DashboardSectionHeader';
import { QuickActionCard } from '../../components/dashboard/QuickActionCard';
import { useCheckinStatus } from '../../hooks/useCheckinStatus';
// Lazy load heavy charting libraries to reduce initial JS bundle size
const MoodChart = lazy(() => import('../../components/dashboard/MoodChart').then(m => ({ default: m.MoodChart })));
import { Skeleton } from '../../components/ui/Skeleton';
import { markNotificationsAsRead } from '../../services/notificationService';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

const HOME_BACKGROUNDS = [
    require('../../assets/HomeUi1.webp'),
    require('../../assets/HomeUi2.webp'),
    require('../../assets/HomeUi3.webp'),
    require('../../assets/HomeUi4.webp'),
    require('../../assets/HomeUi5.webp'),
    require('../../assets/HomeUi6.webp')
];

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ClientDashboard() {
    const { profile } = useAuth();
    const router = useRouter();
    const { exercises, loading, fetchExercises } = useClientExercises(profile?.id);
    const { checkedInToday, recentCheckins, fetchCheckinStatus } = useCheckinStatus(profile?.id);

    const [notifications, setNotifications] = useState<any[]>([]);
    const { colors, isDark } = useTheme();

    // Replace context-bound state with Zustand global store state
    const bookingUrl = useAppStore(state => profile?.id ? state.therapistBookingUrls[profile.id] : null);
    const setTherapistBookingUrl = useAppStore(state => state.setTherapistBookingUrl);

    // ── Responsive layout ─────────────────────────────────────────────────────
    const { width: screenWidth, isXs, isSm, isTablet, isDesktop, contentMaxWidth, gutter, sectionGap, headerTop } = useResponsiveLayout();

    const randomBg = useMemo(() => HOME_BACKGROUNDS[Math.floor(Math.random() * HOME_BACKGROUNDS.length)], []);

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            registerForPushNotificationsAsync();
        });

        // Fetch therapist booking URL
        const fetchBookingUrl = async () => {
            if (!profile?.id || !profile?.therapistId) return;
            try {
                // Return early if already in store config cache
                if (bookingUrl) return;

                const therapistSnap = await getDoc(doc(db, 'users', profile.therapistId));
                if (therapistSnap.exists()) {
                    const therapistData = therapistSnap.data();
                    if (therapistData.bookingUrl) {
                        setTherapistBookingUrl(profile.id, therapistData.bookingUrl);
                    }
                }
            } catch (e) {
                console.warn('Could not fetch booking URL', e);
            }
        };
        fetchBookingUrl();

        return () => task.cancel();
    }, []);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            const load = async () => {
                const promises = [fetchExercises()];
                if (active) {
                    promises.push(fetchCheckinStatus());
                    promises.push(fetchNotifications());
                }
                await Promise.all(promises);
            };
            load();
            return () => { active = false; };
        }, [profile?.id, fetchExercises])
    );

    const fetchNotifications = async () => {
        if (!profile?.id) return;
        try {
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', profile.id),
                where('read', '==', false)
            );
            const snap = await getDocs(q);
            const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // sort by createdAt manually since we can't easily compound query without an index
            notifs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setNotifications(notifs);
        } catch (e) {
            console.error('Error fetching notifications', e);
        }
    };

    const handleNotificationClick = async () => {
        // Mark all as read using batch mutation
        try {
            await markNotificationsAsRead(notifications.map(n => n.id));
            setNotifications([]);
            router.push('/(app)/resources' as any);
        } catch (e) {
            console.error('Error updating notifications', e);
        }
    };

    const openExercises = useMemo(() => exercises.filter(ex => !ex.completed), [exercises]);
    const completedExercises = useMemo(() => exercises.filter(ex => ex.completed), [exercises]);
    const recentCheckinCount = recentCheckins?.length ?? 0;



    if (profile?.role === 'therapist') {
        return <Redirect href="/(app)/therapist" />;
    }

    if (loading && exercises.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#1F2528', paddingTop: headerTop, paddingBottom: 56, paddingHorizontal: gutter, borderBottomLeftRadius: 48, borderBottomRightRadius: 48 }}>
                    <Skeleton width={200} height={34} borderRadius={8} />
                    <Skeleton width={140} height={16} borderRadius={4} style={{ marginTop: 12 }} />
                </View>
                <View style={{ padding: gutter }}>
                    <Skeleton width="100%" height={100} borderRadius={24} style={{ marginBottom: 24 }} />
                    <Skeleton width={180} height={24} borderRadius={6} style={{ marginBottom: 16 }} />
                    <Skeleton width="100%" height={80} borderRadius={20} style={{ marginBottom: 12 }} />
                    <Skeleton width="100%" height={80} borderRadius={20} style={{ marginBottom: 12 }} />
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 56 }}
                style={{ flex: 1 }}
                bounces={false}
            >
                {/* ── Header ────────────────────────────────── */}
                <View
                    style={{
                        paddingTop: headerTop,
                        paddingBottom: isXs ? 24 : isSm ? 32 : 56,
                        paddingHorizontal: isXs ? 12 : 20,
                        borderBottomLeftRadius: isSm ? 32 : 48,
                        borderBottomRightRadius: isSm ? 32 : 48,
                        overflow: 'hidden',
                        zIndex: 10,
                        shadowColor: colors.primaryDark,
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: 0.18,
                        shadowRadius: 24,
                        elevation: 10,
                        marginBottom: isSm ? 16 : 24,
                    }}
                >
                    <Image
                        source={randomBg}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        contentFit="cover"
                    />

                    {/* Foreground Card — fully responsive */}
                    <View style={{ zIndex: 10, maxWidth: 680, width: '100%', alignSelf: 'center' }} pointerEvents="box-none">
                        <BlurView
                            intensity={Platform.OS === 'android' ? 100 : 60}
                            tint={isDark ? 'dark' : 'light'}
                            style={{
                                borderRadius: isSm ? 24 : 36,
                                overflow: 'hidden',
                                padding: isXs ? 14 : isSm ? 16 : 24,
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                backgroundColor: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.75)',
                            }}
                        >
                            {/* Logo — hidden on very small phones to save space */}
                            {screenWidth >= 360 && (
                                <View style={{ alignItems: 'center', marginBottom: isSm ? 10 : 16 }}>
                                    <Image
                                        source={require('../../assets/logo-transparent.png')}
                                        style={{
                                            width: isXs ? 160 : isSm ? 200 : 260,
                                            height: isXs ? 44 : isSm ? 56 : 80,
                                            tintColor: isDark ? '#FFF' : undefined,
                                        }}
                                        contentFit="contain"
                                    />
                                </View>
                            )}

                            {/* Greeting row */}
                            <View style={{ flexDirection: isXs ? 'column' : 'row', justifyContent: 'space-between', alignItems: isXs ? 'flex-start' : 'center', marginBottom: isSm ? 12 : 20, gap: isXs ? 12 : 0 }}>
                                <View style={{ flex: 1, paddingRight: 12 }}>
                                    <Text
                                        style={{
                                            fontSize: isXs ? 20 : isSm ? 24 : 34,
                                            fontWeight: '900',
                                            color: colors.text,
                                            letterSpacing: -0.5,
                                            lineHeight: isXs ? 26 : isSm ? 30 : 40,
                                        }}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.75}
                                        numberOfLines={1}
                                    >
                                        Hi {profile?.firstName || ''} 👋
                                    </Text>
                                </View>
                                {/* Settings button */}
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel="Einstellungen"
                                    onPress={() => {
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        router.push('/(app)/settings' as any);
                                    }}
                                    style={{
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
                                        paddingHorizontal: isSm ? 12 : 18,
                                        paddingVertical: isSm ? 10 : 16,
                                        borderRadius: 18,
                                        borderWidth: 1,
                                        borderColor: isDark ? 'transparent' : 'rgba(0,0,0,0.05)',
                                        alignSelf: isXs ? 'flex-start' : 'auto',
                                    }}
                                >
                                    <Settings size={isSm ? 18 : 22} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Progress bar */}
                            {exercises.length > 0 ? (
                                <ProgressBar completed={completedExercises.length} total={exercises.length} />
                            ) : null}
                        </BlurView>
                    </View>
                </View>

                {/* Responsive content column: no max-width on mobile, capped on tablet/desktop */}
                <View style={[contentMaxWidth ? { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' } : undefined, { paddingHorizontal: gutter }]}>
                    <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: sectionGap, marginBottom: 20 }}>
                        <ClientMetricCard
                            icon={Calendar}
                            label="Offene Ubungen"
                            value={String(openExercises.length)}
                            hint={openExercises.length === 0 ? 'Heute ist nichts mehr offen.' : 'Deine aktuellen Aufgaben fuer die naechsten Schritte.'}
                            tone="primary"
                        />
                        <ClientMetricCard
                            icon={BookOpen}
                            label="Erledigt"
                            value={String(completedExercises.length)}
                            hint={completedExercises.length === 0 ? 'Noch keine abgeschlossenen Einheiten.' : 'Abgeschlossene Uebungen bleiben fuer dich abrufbar.'}
                            tone="secondary"
                        />
                        <ClientMetricCard
                            icon={Edit3}
                            label="Check-ins"
                            value={String(recentCheckinCount)}
                            hint={recentCheckinCount === 0 ? 'Noch keine Eintraege in den letzten Tagen.' : 'Deine letzten Eintraege fuer Verlauf und Reflexion.'}
                            tone="success"
                        />
                    </View>

                    <DashboardSectionHeader
                        title="Heute"
                        subtitle="Alles Wichtige fuer deinen naechsten Schritt."
                    />

                    {profile?.nextAppointment && (
                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 400, delay: 100 }}
                            style={{ marginBottom: 20 }}
                        >
                            <View className={`border rounded-3xl p-5 ${isDark ? 'bg-pink-600/15 border-pink-600/30' : 'bg-pink-50 border-pink-100'
                                }`}>
                                <View className="flex-row items-center mb-3">
                                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(219, 39, 119, 0.2)' : '#FCE7F3', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                        <Calendar size={24} color="#DB2777" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#DB2777', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                                            Nächster Termin
                                        </Text>
                                        <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>
                                            {profile.nextAppointment}
                                        </Text>
                                    </View>
                                </View>
                                {bookingUrl && (
                                    <TouchableOpacity
                                        onPress={() => Linking.openURL(bookingUrl)}
                                        style={{
                                            backgroundColor: '#DB2777',
                                            paddingVertical: 12,
                                            borderRadius: 16,
                                            alignItems: 'center',
                                            marginTop: 4
                                        }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>Termin verwalten</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </MotiView>
                    )}

                    {notifications.length > 0 ? (
                        <MotiView
                            from={{ opacity: 0, translateY: -20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                            style={{ marginBottom: 16 }}
                        >
                            <TouchableOpacity
                                onPress={handleNotificationClick}
                                className={`border rounded-2xl p-4 flex-row items-center shadow-sm elevation-sm ${isDark ? 'bg-sky-500/15 border-sky-500/30' : 'bg-sky-100 border-sky-200'
                                    }`}
                                style={{
                                    shadowColor: isDark ? '#000' : '#0284C7',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 8,
                                }}
                            >
                                <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${isDark ? 'bg-sky-500' : 'bg-sky-600'}`}>
                                    <BookOpen size={20} color="white" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: isDark ? '#38BDF8' : '#0369A1', fontWeight: 'bold', fontSize: 16, marginBottom: 2 }}>{notifications.length} neue Nachricht{notifications.length > 1 ? 'en' : ''}</Text>
                                    <Text style={{ color: isDark ? '#7DD3FC' : '#0284C7', fontSize: 13 }} numberOfLines={2}>
                                        {notifications[0]?.body || notifications[0]?.message || 'Dein Therapeut hat neue Ressourcen für dich freigeschaltet.'}
                                    </Text>
                                </View>
                                <View style={{ backgroundColor: isDark ? 'rgba(56,189,248,0.2)' : 'rgba(2,132,199,0.1)', padding: 8, borderRadius: 100 }}>
                                    <Text style={{ color: isDark ? '#38BDF8' : '#0369A1', fontWeight: 'bold' }}>{'>'}</Text>
                                </View>
                            </TouchableOpacity>
                        </MotiView>
                    ) : null}

                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 120, delay: 100 }}
                    >
                        <CheckinBanner
                            done={checkedInToday}
                            onPress={() => checkedInToday
                                ? router.push('/(app)/checkins_overview' as any)
                                : router.push('/(app)/checkin' as any)
                            }
                        />
                    </MotiView>

                    {(recentCheckins && recentCheckins.length > 0) ? (
                        <MotiView
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 350, delay: 120 }}
                        >
                            <Suspense fallback={<View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>}>
                                <MoodChart checkins={recentCheckins} />
                            </Suspense>
                        </MotiView>
                    ) : null}

                    <DashboardSectionHeader
                        title="Dein Raum"
                        subtitle="Direkte Zugaenge fuer Ressourcen, Termine und Reflexion."
                    />

                    <View style={{ flexDirection: isTablet ? 'row' : 'column', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                        {bookingUrl ? (
                            <View style={{ flex: isTablet ? 1 : undefined, width: isTablet ? undefined : '100%' }}>
                                <MotiView
                                    from={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: 'timing', duration: 300, delay: 100 }}
                                >
                                    <QuickActionCard
                                        icon={Calendar}
                                        title={i18n.t('dashboard.book_session', { defaultValue: 'Termin buchen' })}
                                        description={i18n.t('dashboard.book_desc', { defaultValue: 'Vereinbare dein naechstes Coaching' })}
                                        tone="primary"
                                        onPress={() => {
                                            if (bookingUrl.startsWith('https://') || bookingUrl.startsWith('http://')) {
                                                Linking.openURL(bookingUrl);
                                            }
                                        }}
                                    />
                                </MotiView>
                            </View>
                        ) : null}

                        <View style={{ flex: isTablet ? 1 : undefined, width: isTablet ? undefined : '100%' }}>
                            <MotiView
                                from={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'timing', duration: 300, delay: 150 }}
                            >
                                <QuickActionCard
                                    icon={BookOpen}
                                    title={i18n.t('dashboard.resources', { defaultValue: 'Ressourcen' })}
                                    description={i18n.t('dashboard.resources_desc', { defaultValue: 'Dokumente und Links von deinem Coach' })}
                                    tone="secondary"
                                    onPress={() => {
                                        router.push('/(app)/resources');
                                    }}
                                />
                            </MotiView>
                        </View>

                        <View style={{ flex: isTablet ? 1 : undefined, width: isTablet ? undefined : '100%' }}>
                            <MotiView
                                from={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'timing', duration: 300, delay: 160 }}
                            >
                                <QuickActionCard
                                    icon={Edit3}
                                    title="Session Notes"
                                    description="Fuege Notizen und Erkenntnisse nach deiner Session hinzu."
                                    tone="accent"
                                    onPress={() => {
                                        router.push('/(app)/notes' as any);
                                    }}
                                />
                            </MotiView>
                        </View>
                    </View>

                    {exercises.length > 0 && (
                        <>
                            <DashboardSectionHeader
                                title="Fortschritt"
                                subtitle="Dein aktueller Stand ueber alle Aufgaben."
                                actionLabel="Alle ansehen"
                                onActionPress={() => router.push('/(app)/exercises_overview' as any)}
                            />
                            <MotiView
                                from={{ opacity: 0, translateY: 20 }}
                                animate={{ opacity: 1, translateY: 0 }}
                                transition={{ type: 'timing', duration: 350, delay: 150 }}
                            >
                                <StatsRow
                                    total={exercises.length}
                                    open={openExercises.length}
                                    completed={completedExercises.length}
                                    onPress={() => router.push('/(app)/exercises_overview' as any)}
                                />
                            </MotiView>
                        </>
                    )}

                    {exercises.length === 0 ? (
                        <MotiView
                            from={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'timing', duration: 300, delay: 200 }}
                        >
                            <EmptyState />
                        </MotiView>
                    ) : (
                        <>
                            {openExercises.length > 0 ? (
                                <View style={{ marginBottom: 24 }}>
                                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300, delay: 200 }}>
                                        <DashboardSectionHeader
                                            title={i18n.t('dashboard.exercises.title')}
                                            subtitle={`${openExercises.length} offene Aufgabe${openExercises.length > 1 ? 'n' : ''} warten auf dich.`}
                                        />
                                    </MotiView>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
                                        {openExercises.map((ex, idx) => {
                                            const itemWidth = isDesktop ? '33.33%' : isTablet ? '50%' : '100%';
                                            return (
                                                <MotiView
                                                    key={ex.id}
                                                    from={{ opacity: 0, translateY: 30 }}
                                                    animate={{ opacity: 1, translateY: 0 }}
                                                    transition={{ type: 'timing', duration: 350, delay: 250 + ((idx % 10) * 50) }}
                                                    style={{ width: itemWidth as any, paddingHorizontal: 8, paddingBottom: 16 }}
                                                >
                                                    <OpenExerciseCard exercise={ex} onPress={() => router.push(`/(app)/exercise/${ex.id}` as any)} />
                                                </MotiView>
                                            );
                                        })}
                                    </View>
                                </View>
                            ) : null}
                            {completedExercises.length > 0 ? (
                                <View>
                                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300, delay: 300 }}>
                                        <View style={{ marginTop: 8 }}>
                                            <DashboardSectionHeader
                                                title={i18n.t('dashboard.completed.title')}
                                                subtitle={`${completedExercises.length} abgeschlossene Aufgabe${completedExercises.length > 1 ? 'n' : ''} bleiben fuer dich abrufbar.`}
                                            />
                                        </View>
                                    </MotiView>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
                                        {completedExercises.map((ex, idx) => {
                                            const itemWidth = isDesktop ? '33.33%' : isTablet ? '50%' : '100%';
                                            return (
                                                <MotiView
                                                    key={ex.id}
                                                    from={{ opacity: 0, translateY: 30 }}
                                                    animate={{ opacity: 1, translateY: 0 }}
                                                    transition={{ type: 'timing', duration: 350, delay: 350 + ((idx % 10) * 50) }}
                                                    style={{ width: itemWidth as any, paddingHorizontal: 8, paddingBottom: 16 }}
                                                >
                                                    <CompletedExerciseCard exercise={ex} onPress={() => router.push(`/(app)/exercise/${ex.id}` as any)} />
                                                </MotiView>
                                            );
                                        })}
                                    </View>
                                </View>
                            ) : null}
                        </>
                    )}
                </View>
            </Animated.ScrollView>
        </View>
    );
}


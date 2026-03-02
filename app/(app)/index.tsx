import { View, Text, TouchableOpacity, ActivityIndicator, InteractionManager, Linking, Platform, useWindowDimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Settings, Calendar, BookOpen, Edit3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../utils/useAppStore';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useCallback, useMemo, useState } from 'react';
import { useRouter, useFocusEffect, Redirect } from 'expo-router';
import { collection, query, where, limit, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolate } from 'react-native-reanimated';
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
import { useCheckinStatus } from '../../hooks/useCheckinStatus';
import { MoodChart } from '../../components/dashboard/MoodChart';
import { DarkAmbientOrbs, LightAmbientOrbs } from '../../components/ui/AmbientOrbs';
import { Skeleton } from '../../components/ui/Skeleton';
import { markNotificationsAsRead } from '../../services/notificationService';

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ClientDashboard() {
    const { profile } = useAuth();
    const router = useRouter();
    const { exercises, loading, fetchExercises } = useClientExercises(profile?.id);
    const { checkedInToday, recentCheckins, fetchCheckinStatus } = useCheckinStatus(profile?.id);

    const [notifications, setNotifications] = useState<any[]>([]);

    // Replace context-bound state with Zustand global store state
    const bookingUrl = useAppStore(state => profile?.id ? state.therapistBookingUrls[profile.id] : null);
    const setTherapistBookingUrl = useAppStore(state => state.setTherapistBookingUrl);

    // ── Responsive layout ─────────────────────────────────────────────────────
    const { width: screenWidth } = useWindowDimensions();
    // Mobile: natural width | Tablet: cap at 600px | Desktop: cap at 720px
    const contentMaxWidth = screenWidth < 600 ? undefined : screenWidth < 1024 ? 600 : 720;
    // Scale horizontal padding: 16px mobile, 24px tablet, 32px desktop
    const horizPadding = screenWidth < 600 ? 16 : screenWidth < 1024 ? 24 : 32;

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            registerForPushNotificationsAsync();
        });

        // Fetch therapist booking URL
        const fetchBookingUrl = async () => {
            if (!profile?.id) return;
            try {
                // Return early if already in store config cache
                if (bookingUrl) return;

                // If not in cache, query
                const q = query(collection(db, 'users'), where('role', '==', 'therapist'), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const therapistData = snap.docs[0].data();
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
                where('clientId', '==', profile.id),
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



    if (profile?.role === 'therapist') {
        return <Redirect href="/(app)/therapist" />;
    }

    if (loading && exercises.length === 0) {
        return (
            <View className="flex-1 bg-[#F9F8F6]">
                <View style={{ backgroundColor: '#2C3E50', paddingTop: Platform.OS === 'android' ? 64 : 72, paddingBottom: 56, paddingHorizontal: 24, borderBottomLeftRadius: 48, borderBottomRightRadius: 48 }}>
                    <Skeleton width={200} height={34} borderRadius={8} />
                    <Skeleton width={140} height={16} borderRadius={4} style={{ marginTop: 12 }} />
                </View>
                <View style={{ padding: 24 }}>
                    <Skeleton width="100%" height={100} borderRadius={24} style={{ marginBottom: 24 }} />
                    <Skeleton width={180} height={24} borderRadius={6} style={{ marginBottom: 16 }} />
                    <Skeleton width="100%" height={80} borderRadius={20} style={{ marginBottom: 12 }} />
                    <Skeleton width="100%" height={80} borderRadius={20} style={{ marginBottom: 12 }} />
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#F9F8F6]">
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 56 }}
                style={{ flex: 1 }}
                bounces={false}
            >
                {/* ── Header ────────────────────────────────── */}
                <View
                    style={{
                        paddingTop: Platform.OS === 'android' ? 64 : 72,
                        paddingBottom: 56,
                        paddingHorizontal: 24,
                        borderBottomLeftRadius: 48,
                        borderBottomRightRadius: 48,
                        overflow: 'hidden',
                        zIndex: 10,
                        shadowColor: '#0d6474',
                        shadowOffset: { width: 0, height: 16 },
                        shadowOpacity: 0.2,
                        shadowRadius: 32,
                        elevation: 14,
                        marginBottom: 24,
                    }}
                >
                    <LinearGradient
                        colors={['#0d6474', '#137386', '#1a8fa5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    {/* Ambient 3D depth orbs */}
                    <DarkAmbientOrbs />

                    {/* Foreground Content — max-width 680px for web readability */}
                    <View style={{ zIndex: 10, maxWidth: 680, width: '100%', alignSelf: 'center' }} pointerEvents="box-none">
                        {/* Logo */}
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <Image
                                source={require('../../assets/logo-transparent.png')}
                                style={{ width: 180, height: 50, resizeMode: 'contain', tintColor: '#ffffff' }}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ flex: 1, paddingRight: 16 }}>
                                <Text
                                    style={{ fontSize: 34, fontWeight: '900', color: 'white', letterSpacing: -1, lineHeight: 40 }}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                    numberOfLines={2}
                                >
                                    Hi {profile?.firstName || ''} 👋
                                </Text>
                            </View>
                            {/* Settings button — 48px hit target (6 × 8pt) */}
                            <TouchableOpacity
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/(app)/settings' as any);
                                }}
                                style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 18, paddingVertical: 16, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}
                            >
                                <Settings size={22} color="white" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ marginTop: 4 }}>
                            {exercises.length > 0 && (
                                <ProgressBar completed={completedExercises.length} total={exercises.length} />
                            )}
                        </View>
                    </View>
                </View>

                {/* Responsive content column: no max-width on mobile, capped on tablet/desktop */}
                <View style={[contentMaxWidth ? { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' } : undefined, { paddingHorizontal: horizPadding }]}>

                    {notifications.length > 0 && (
                        <MotiView
                            from={{ opacity: 0, translateY: -20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                            style={{ marginBottom: 16 }}
                        >
                            <TouchableOpacity
                                onPress={handleNotificationClick}
                                style={{
                                    backgroundColor: '#E0F2FE',
                                    borderWidth: 1,
                                    borderColor: '#BAE6FD',
                                    borderRadius: 16,
                                    padding: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    shadowColor: '#0284C7',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 8,
                                    elevation: 2
                                }}
                            >
                                <View style={{ backgroundColor: '#0284C7', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                    <BookOpen size={20} color="white" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#0369A1', fontWeight: 'bold', fontSize: 16, marginBottom: 2 }}>{notifications.length} neue Nachricht{notifications.length > 1 ? 'en' : ''}</Text>
                                    <Text style={{ color: '#0284C7', fontSize: 13 }} numberOfLines={2}>
                                        {notifications[0]?.message || 'Dein Therapeut hat neue Ressourcen für dich freigeschaltet.'}
                                    </Text>
                                </View>
                                <View style={{ backgroundColor: 'rgba(2,132,199,0.1)', padding: 8, borderRadius: 100 }}>
                                    <Text style={{ color: '#0369A1', fontWeight: 'bold' }}>{'>'}</Text>
                                </View>
                            </TouchableOpacity>
                        </MotiView>
                    )}

                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 120, delay: 100 }}
                    >
                        <CheckinBanner done={checkedInToday} onPress={() => router.push('/(app)/checkin' as any)} />
                    </MotiView>

                    {recentCheckins && recentCheckins.length > 0 && (
                        <MotiView
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 350, delay: 120 }}
                        >
                            <MoodChart checkins={recentCheckins} />
                        </MotiView>
                    )}

                    {bookingUrl && (
                        <MotiView
                            from={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'timing', duration: 300, delay: 140 }}
                            style={{ marginBottom: 16 }}
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    if (bookingUrl.startsWith('https://') || bookingUrl.startsWith('http://')) {
                                        Linking.openURL(bookingUrl);
                                    }
                                }}
                                style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', padding: 24, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 }}>
                                    <View style={{ backgroundColor: 'rgba(19,115,134,0.1)', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 20 }}>
                                        <Calendar size={24} color="#137386" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#243842', fontWeight: '800', fontSize: 16, marginBottom: 4 }}>{i18n.t('dashboard.book_session', { defaultValue: 'Termin buchen' })}</Text>
                                        <Text style={{ color: 'rgba(36,56,66,0.55)', fontSize: 13, fontWeight: '500', lineHeight: 18 }}>{i18n.t('dashboard.book_desc', { defaultValue: 'Vereinbare dein nächstes Coaching' })}</Text>
                                    </View>
                                </View>
                                <View style={{ backgroundColor: '#F9F8F6', padding: 10, borderRadius: 100 }}>
                                    <Text style={{ color: 'rgba(36,56,66,0.35)', fontWeight: '700', fontSize: 16, lineHeight: 16 }}>{'>'}</Text>
                                </View>
                            </TouchableOpacity>
                        </MotiView>
                    )}

                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'timing', duration: 300, delay: 150 }}
                        style={{ marginBottom: 16 }}
                    >
                        <TouchableOpacity
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/(app)/resources');
                            }}
                            style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', padding: 24, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 }}>
                                <View style={{ backgroundColor: 'rgba(192,157,89,0.12)', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 20 }}>
                                    <BookOpen size={24} color="#C09D59" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#243842', fontWeight: '800', fontSize: 16, marginBottom: 4 }}>{i18n.t('dashboard.resources', { defaultValue: 'Ressourcen' })}</Text>
                                    <Text style={{ color: 'rgba(36,56,66,0.55)', fontSize: 13, fontWeight: '500', lineHeight: 18 }} numberOfLines={2}>{i18n.t('dashboard.resources_desc', { defaultValue: 'Dokumente & Links von deinem Coach' })}</Text>
                                </View>
                            </View>
                            <View style={{ backgroundColor: '#F9F8F6', padding: 10, borderRadius: 100 }}>
                                <Text style={{ color: 'rgba(36,56,66,0.35)', fontWeight: '700', fontSize: 16, lineHeight: 16 }}>{'>'}</Text>
                            </View>
                        </TouchableOpacity>
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'timing', duration: 300, delay: 160 }}
                        style={{ marginBottom: 24 }}
                    >
                        <TouchableOpacity
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/(app)/notes' as any);
                            }}
                            style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', padding: 24, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 }}>
                                <View style={{ backgroundColor: 'rgba(59,130,246,0.1)', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 20 }}>
                                    <Edit3 size={24} color="#3B82F6" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#243842', fontWeight: '800', fontSize: 16, marginBottom: 4 }}>Session Notes</Text>
                                    <Text style={{ color: 'rgba(36,56,66,0.55)', fontSize: 13, fontWeight: '500', lineHeight: 18 }} numberOfLines={2}>Deine persönlichen Notizen</Text>
                                </View>
                            </View>
                            <View style={{ backgroundColor: '#F9F8F6', padding: 10, borderRadius: 100 }}>
                                <Text style={{ color: 'rgba(36,56,66,0.35)', fontWeight: '700', fontSize: 16, lineHeight: 16 }}>{'>'}</Text>
                            </View>
                        </TouchableOpacity>
                    </MotiView>

                    {exercises.length > 0 && (
                        <MotiView
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 350, delay: 150 }}
                        >
                            <StatsRow total={exercises.length} open={openExercises.length} completed={completedExercises.length} />
                        </MotiView>
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
                            {openExercises.length > 0 && (
                                <View className="mb-6">
                                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300, delay: 200 }}>
                                        <Text className="text-xl font-black text-[#243842] mb-4 tracking-tight">{i18n.t('dashboard.exercises.title')}</Text>
                                    </MotiView>
                                    {openExercises.map((ex, idx) => (
                                        <MotiView
                                            key={ex.id}
                                            from={{ opacity: 0, translateX: -30 }}
                                            animate={{ opacity: 1, translateX: 0 }}
                                            transition={{ type: 'timing', duration: 350, delay: 250 + (idx * 50) }}
                                        >
                                            <OpenExerciseCard exercise={ex} onPress={() => router.push(`/(app)/exercise/${ex.id}` as any)} />
                                        </MotiView>
                                    ))}
                                </View>
                            )}
                            {completedExercises.length > 0 && (
                                <View>
                                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300, delay: 300 }}>
                                        <View className="flex-row items-center mt-4 mb-4">
                                            <View className="h-[1px] flex-1 bg-[#E5E7EB]" />
                                            <Text className="px-4 text-sm font-bold text-[#243842]/40 tracking-wider uppercase">{i18n.t('dashboard.completed.title')}</Text>
                                            <View className="h-[1px] flex-1 bg-[#E5E7EB]" />
                                        </View>
                                    </MotiView>
                                    {completedExercises.map((ex, idx) => (
                                        <MotiView
                                            key={ex.id}
                                            from={{ opacity: 0, translateX: 30 }}
                                            animate={{ opacity: 1, translateX: 0 }}
                                            transition={{ type: 'timing', duration: 350, delay: 350 + (idx * 50) }}
                                        >
                                            <CompletedExerciseCard exercise={ex} onPress={() => router.push(`/(app)/exercise/${ex.id}` as any)} />
                                        </MotiView>
                                    ))}
                                </View>
                            )}
                        </>
                    )}
                </View>
            </Animated.ScrollView>
        </View>
    );
}

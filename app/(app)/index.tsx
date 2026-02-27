import { View, Text, TouchableOpacity, ActivityIndicator, InteractionManager, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Settings, Calendar, BookOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../utils/useAppStore';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useCallback, useMemo, useState } from 'react';
import { useRouter, useFocusEffect, Redirect } from 'expo-router';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
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

function getTodayQuote(): string {
    const quotes = i18n.t('dashboard.daily_quotes', { returnObjects: true }) as string[];
    if (!Array.isArray(quotes) || quotes.length === 0) return '';
    return quotes[new Date().getDay() % quotes.length];
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ClientDashboard() {
    const { profile } = useAuth();
    const router = useRouter();
    const { exercises, loading, fetchExercises } = useClientExercises(profile?.id);
    const { checkedInToday, recentCheckins, fetchCheckinStatus } = useCheckinStatus(profile?.id);

    // Replace context-bound state with Zustand global store state
    const bookingUrl = useAppStore(state => profile?.id ? state.therapistBookingUrls[profile.id] : null);
    const setTherapistBookingUrl = useAppStore(state => state.setTherapistBookingUrl);

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
                }
                await Promise.all(promises);
            };
            load();
            return () => { active = false; };
        }, [profile?.id, fetchExercises])
    );

    const openExercises = useMemo(() => exercises.filter(ex => !ex.completed), [exercises]);
    const completedExercises = useMemo(() => exercises.filter(ex => ex.completed), [exercises]);

    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const headerAnimatedStyle = useAnimatedStyle(() => {
        const translateY = interpolate(scrollY.value, [-100, 0, 200], [0, 0, -20], Extrapolate.CLAMP);
        const scale = interpolate(scrollY.value, [-100, 0, 200], [1.05, 1, 0.98], Extrapolate.CLAMP);
        return {
            transform: [{ translateY }, { scale }]
        };
    });

    if (profile?.role === 'therapist') {
        return <Redirect href="/(app)/therapist" />;
    }

    if (loading && exercises.length === 0) {
        return (
            <View className="flex-1 bg-[#F9F8F6]">
                <View style={{ backgroundColor: '#2C3E50', paddingTop: Platform.OS === 'android' ? 48 : 56, paddingBottom: 40, paddingHorizontal: 24, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}>
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
            {/* ── Header ────────────────────────────────── */}
            <Animated.View
                style={[
                    {
                        paddingTop: Platform.OS === 'android' ? 48 : 56,
                        paddingBottom: 40,
                        paddingHorizontal: 24,
                        borderBottomLeftRadius: 40,
                        borderBottomRightRadius: 40,
                        overflow: 'hidden',
                        zIndex: 10,
                        shadowColor: '#1e293b',
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: 0.15,
                        shadowRadius: 24,
                        elevation: 12,
                    },
                    headerAnimatedStyle
                ]}
            >
                <LinearGradient
                    colors={['#0d6474', '#137386', '#1a8fa5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                {/* Ambient 3D depth orbs */}
                <DarkAmbientOrbs />

                {/* Foreground Content */}
                <View style={{ zIndex: 10 }} pointerEvents="box-none">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text
                                style={{ fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: -0.8, lineHeight: 38 }}
                                adjustsFontSizeToFit
                                minimumFontScale={0.8}
                                numberOfLines={2}
                            >
                                {i18n.t('dashboard.greeting', { name: profile?.firstName || '' })}
                            </Text>
                            <Text
                                style={{ color: '#C09D59', marginTop: 8, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}
                                adjustsFontSizeToFit
                                minimumFontScale={0.8}
                                numberOfLines={2}
                            >
                                „{getTodayQuote()}"
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/(app)/settings' as any);
                            }}
                            style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                            <Settings size={22} color="white" />
                        </TouchableOpacity>
                    </View>
                    <View style={{ marginTop: 8 }}>
                        {exercises.length > 0 && (
                            <ProgressBar completed={completedExercises.length} total={exercises.length} />
                        )}
                    </View>
                </View>
            </Animated.View>

            <Animated.ScrollView
                className="flex-1 px-6 pt-6"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
            >
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
                        className="mb-4"
                    >
                        <TouchableOpacity
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (bookingUrl.startsWith('https://') || bookingUrl.startsWith('http://')) {
                                    Linking.openURL(bookingUrl);
                                }
                            }}
                            className="bg-white border border-[#E5E7EB] p-5 rounded-[28px] shadow-sm flex-row items-center justify-between"
                        >
                            <View className="flex-row items-center flex-1 pr-4">
                                <View className="bg-[#137386]/10 w-14 h-14 rounded-full items-center justify-center mr-4">
                                    <Calendar size={24} color="#137386" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[#243842] font-extrabold text-[17px] mb-1">{i18n.t('dashboard.book_session', { defaultValue: 'Termin buchen' })}</Text>
                                    <Text className="text-[#243842]/60 text-[13px] font-medium leading-tight">{i18n.t('dashboard.book_desc', { defaultValue: 'Vereinbare dein nächstes Coaching' })}</Text>
                                </View>
                            </View>
                            <View className="bg-[#F9F8F6] p-2.5 rounded-full">
                                <Text className="text-[#243842]/40 font-bold text-lg leading-none">{'>'}</Text>
                            </View>
                        </TouchableOpacity>
                    </MotiView>
                )}

                <MotiView
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 300, delay: 150 }}
                    className="mb-6"
                >
                    <TouchableOpacity
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/(app)/resources');
                        }}
                        className="bg-white border border-[#E5E7EB] p-5 rounded-[28px] shadow-sm flex-row items-center justify-between"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="bg-[#C09D59]/15 w-14 h-14 rounded-full items-center justify-center mr-4">
                                <BookOpen size={24} color="#C09D59" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[#243842] font-extrabold text-[17px] mb-1">{i18n.t('dashboard.resources', { defaultValue: 'Ressourcen' })}</Text>
                                <Text className="text-[#243842]/60 text-[13px] font-medium leading-tight" numberOfLines={2}>{i18n.t('dashboard.resources_desc', { defaultValue: 'Dokumente & Links von deinem Coach' })}</Text>
                            </View>
                        </View>
                        <View className="bg-[#F9F8F6] p-2.5 rounded-full">
                            <Text className="text-[#243842]/40 font-bold text-lg leading-none">{'>'}</Text>
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
            </Animated.ScrollView>
        </View>
    );
}

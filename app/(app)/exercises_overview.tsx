import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useClientExercises } from '../../hooks/useClientExercises';
import { useTheme } from '../../contexts/ThemeContext';
import { useCallback, useMemo } from 'react';
import i18n from '../../utils/i18n';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolate } from 'react-native-reanimated';
import { ChevronLeft, BookOpen, Clock3, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { OpenExerciseCard } from '../../components/dashboard/OpenExerciseCard';
import { CompletedExerciseCard } from '../../components/dashboard/CompletedExerciseCard';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { ClientMetricCard } from '../../components/dashboard/ClientMetricCard';
import { DashboardSectionHeader } from '../../components/dashboard/DashboardSectionHeader';
import { MotiView } from 'moti';
import { Skeleton } from '../../components/ui/Skeleton';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export default function ExercisesOverview() {
    const { profile } = useAuth();
    const router = useRouter();
    const { exercises, loading, fetchExercises } = useClientExercises(profile?.id);
    const { colors, isDark } = useTheme();

    const { isXs, isSm, isTablet, isDesktop, contentMaxWidth, gutter, sectionGap, headerTop } = useResponsiveLayout();

    const openExercises = useMemo(() => exercises.filter(ex => !ex.completed), [exercises]);
    const completedExercises = useMemo(() => exercises.filter(ex => ex.completed), [exercises]);

    useFocusEffect(
        useCallback(() => {
            fetchExercises();
        }, [fetchExercises])
    );

    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    const headerAnimatedStyle = useAnimatedStyle(() => {
        const height = interpolate(scrollY.value, [0, 100], [Platform.OS === 'android' ? 120 : 130, Platform.OS === 'android' ? 80 : 90], Extrapolate.CLAMP);
        const padding = interpolate(scrollY.value, [0, 100], [headerTop - 8, Platform.OS === 'android' ? 24 : 34], Extrapolate.CLAMP);
        return {
            height,
            paddingTop: padding,
            paddingBottom: 24,
            paddingHorizontal: gutter,
            borderBottomLeftRadius: isSm ? 28 : 36,
            borderBottomRightRadius: isSm ? 28 : 36,
            overflow: 'hidden',
            zIndex: 10,
            shadowColor: colors.primaryDark,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 8,
            flexDirection: isXs ? 'column' as const : 'row' as const,
            alignItems: isXs ? 'flex-start' as const : 'center' as const,
            justifyContent: 'space-between' as const,
            gap: isXs ? 12 : 0,
        };
    });

    if (loading && exercises.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.primary, paddingTop: headerTop, paddingBottom: 56, paddingHorizontal: gutter, borderBottomLeftRadius: 48, borderBottomRightRadius: 48 }}>
                    <Skeleton width={200} height={34} borderRadius={8} />
                    <Skeleton width={140} height={16} borderRadius={4} style={{ marginTop: 12 }} />
                </View>
                <View style={{ padding: gutter }}>
                    <Skeleton width="100%" height={140} borderRadius={24} style={{ marginBottom: 24 }} />
                    <Skeleton width={180} height={24} borderRadius={6} style={{ marginBottom: 16 }} />
                    <Skeleton width="100%" height={100} borderRadius={20} style={{ marginBottom: 12 }} />
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Animated.View style={[headerAnimatedStyle]}>
                <LinearGradient
                    colors={[colors.primaryDark, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={i18n.t('exercise.back', { defaultValue: 'Zurück' })}
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                    style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        paddingHorizontal: isXs ? 12 : 16,
                        paddingVertical: 12,
                        borderRadius: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        zIndex: 50,
                    }}
                >
                    <ChevronLeft size={20} color="white" />
                    <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: 4 }}>
                        {i18n.t('exercise.back', { defaultValue: 'Zurück' })}
                    </Text>
                </TouchableOpacity>
                <Text
                    style={{
                        fontSize: isXs ? 20 : 22,
                        fontWeight: '900',
                        color: 'white',
                        flex: 1,
                        textAlign: isXs ? 'left' : 'right',
                        marginLeft: isXs ? 0 : 16,
                        letterSpacing: -0.5
                    }}
                    numberOfLines={1}
                >
                    {i18n.t('dashboard.exercises.title', { defaultValue: 'Übungen' })}
                </Text>
            </Animated.View>

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingTop: 24, paddingBottom: 56 }}
                style={{ flex: 1 }}
            >
                <View style={[contentMaxWidth ? { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' } : undefined, { paddingHorizontal: gutter }]}>
                    <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: sectionGap, marginBottom: 24 }}>
                        <ClientMetricCard
                            icon={BookOpen}
                            label="Gesamt"
                            value={String(exercises.length)}
                            hint={exercises.length === 0 ? 'Derzeit sind keine Uebungen verfuegbar.' : 'Alle dir zugewiesenen Uebungen in einer Ansicht.'}
                            tone="primary"
                        />
                        <ClientMetricCard
                            icon={Clock3}
                            label="Offen"
                            value={String(openExercises.length)}
                            hint={openExercises.length === 0 ? 'Alle Aufgaben sind aktuell abgeschlossen.' : 'Hier liegen deine naechsten Schritte.'}
                            tone="secondary"
                        />
                        <ClientMetricCard
                            icon={CheckCircle2}
                            label="Abgeschlossen"
                            value={String(completedExercises.length)}
                            hint="Erledigte Uebungen bleiben fuer Wiederholung und Rueckblick erhalten."
                            tone="success"
                        />
                    </View>

                    {exercises.length === 0 ? (
                        <MotiView
                            from={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'timing', duration: 300 }}
                        >
                            <EmptyState />
                        </MotiView>
                    ) : (
                        <>
                            {openExercises.length > 0 ? (
                                <View style={{ marginBottom: 32 }}>
                                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300 }}>
                                        <DashboardSectionHeader
                                            title={i18n.t('dashboard.exercises.title', { defaultValue: 'Offen' })}
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
                                                    transition={{ type: 'timing', duration: 350, delay: (idx % 10) * 50 }}
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
                                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300 }}>
                                        <View style={{ marginTop: 8 }}>
                                            <DashboardSectionHeader
                                                title={i18n.t('dashboard.completed.title', { defaultValue: 'Abgeschlossen' })}
                                                subtitle={`${completedExercises.length} erledigte Aufgabe${completedExercises.length > 1 ? 'n' : ''} kannst du jederzeit wieder oeffnen.`}
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
                                                    transition={{ type: 'timing', duration: 350, delay: (idx % 10) * 50 }}
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

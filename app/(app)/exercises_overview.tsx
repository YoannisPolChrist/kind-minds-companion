import { View, Text, TouchableOpacity, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useClientExercises } from '../../hooks/useClientExercises';
import { useTheme } from '../../contexts/ThemeContext';
import { useMemo } from 'react';
import i18n from '../../utils/i18n';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolate } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { OpenExerciseCard } from '../../components/dashboard/OpenExerciseCard';
import { CompletedExerciseCard } from '../../components/dashboard/CompletedExerciseCard';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { MotiView } from 'moti';
import { Skeleton } from '../../components/ui/Skeleton';

export default function ExercisesOverview() {
    const { profile } = useAuth();
    const router = useRouter();
    const { exercises, loading } = useClientExercises(profile?.id);
    const { colors, isDark } = useTheme();

    const { width: screenWidth } = useWindowDimensions();
    const isTablet = screenWidth > 768;
    const isDesktop = screenWidth > 1024;
    const contentMaxWidth = screenWidth < 600 ? undefined : screenWidth < 1024 ? 600 : 720;
    const horizPadding = screenWidth < 600 ? 16 : screenWidth < 1024 ? 24 : 32;

    const openExercises = useMemo(() => exercises.filter(ex => !ex.completed), [exercises]);
    const completedExercises = useMemo(() => exercises.filter(ex => ex.completed), [exercises]);

    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    const headerAnimatedStyle = useAnimatedStyle(() => {
        const height = interpolate(scrollY.value, [0, 100], [Platform.OS === 'android' ? 120 : 130, Platform.OS === 'android' ? 80 : 90], Extrapolate.CLAMP);
        const padding = interpolate(scrollY.value, [0, 100], [Platform.OS === 'android' ? 44 : 54, Platform.OS === 'android' ? 24 : 34], Extrapolate.CLAMP);
        return {
            height,
            paddingTop: padding,
            paddingBottom: 24,
            paddingHorizontal: horizPadding,
            borderBottomLeftRadius: 36,
            borderBottomRightRadius: 36,
            overflow: 'hidden',
            zIndex: 10,
            shadowColor: colors.primaryDark,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 8,
            flexDirection: 'row' as const,
            alignItems: 'center' as const,
            justifyContent: 'space-between' as const,
        };
    });

    if (loading && exercises.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.primary, paddingTop: Platform.OS === 'android' ? 64 : 72, paddingBottom: 56, paddingHorizontal: 24, borderBottomLeftRadius: 48, borderBottomRightRadius: 48 }}>
                    <Skeleton width={200} height={34} borderRadius={8} />
                    <Skeleton width={140} height={16} borderRadius={4} style={{ marginTop: 12 }} />
                </View>
                <View style={{ padding: 24 }}>
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
                        paddingHorizontal: 16,
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
                        fontSize: 22,
                        fontWeight: '900',
                        color: 'white',
                        flex: 1,
                        textAlign: 'right',
                        marginLeft: 16,
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
                <View style={[contentMaxWidth ? { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' } : undefined, { paddingHorizontal: horizPadding }]}>

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
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.5 }}>
                                                {i18n.t('dashboard.exercises.title', { defaultValue: 'Offen' })}
                                            </Text>
                                            <View style={{ backgroundColor: `${colors.primary}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 12 }}>
                                                <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>{openExercises.length}</Text>
                                            </View>
                                        </View>
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
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 24 }}>
                                            <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
                                            <Text style={{ paddingHorizontal: 16, fontSize: 12, fontWeight: '800', color: colors.textSubtle, letterSpacing: 1, textTransform: 'uppercase' }}>
                                                {i18n.t('dashboard.completed.title', { defaultValue: 'Abgeschlossen' })}
                                            </Text>
                                            <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
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

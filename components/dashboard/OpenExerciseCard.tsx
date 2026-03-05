import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Exercise } from '../../types';
import i18n from '../../utils/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useState } from 'react';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { CalendarDays, Play } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

export function OpenExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
    const [pressed, setPressed] = useState(false);
    const { colors, isDark } = useTheme();

    const handlePressIn = () => {
        setPressed(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    };

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={() => setPressed(false)}
            onPress={onPress}
        >
            <MotiView
                animate={{ scale: pressed ? 0.96 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
                {exercise.coverImage && (
                    <View style={{ marginBottom: 20, borderRadius: 20, overflow: 'hidden', width: '100%', height: 128, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }}>
                        <Image source={{ uri: exercise.coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    </View>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <View style={{ flex: 1, paddingRight: 20 }}>
                        <Text style={{ fontSize: 19, fontWeight: '900', color: colors.text, letterSpacing: -0.5, marginBottom: 12 }}>{exercise.title}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9F8F6', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: isDark ? 'transparent' : colors.border }}>
                                <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }}>{i18n.t('dashboard.exercises.modules', { count: exercise.blocks?.length ?? 0 })}</Text>
                            </View>
                            {exercise.recurrence && exercise.recurrence !== 'none' && (
                                <View style={{ backgroundColor: `${exercise.themeColor || colors.primary}1A`, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center' }}>
                                    <CalendarDays size={14} color={exercise.themeColor || colors.primary} style={{ marginRight: 6 }} />
                                    <Text style={{ color: exercise.themeColor || colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                        {exercise.recurrence === 'daily' ? i18n.t('dashboard.exercises.daily') : i18n.t('dashboard.exercises.weekly')}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={styles.iconContainer}>
                        <LinearGradient
                            colors={exercise.themeColor ? [exercise.themeColor, exercise.themeColor + 'cc'] : ['#137386', '#0d6474']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradientIcon}
                        >
                            <Play size={20} color="white" fill="white" style={{ marginLeft: 2 }} />
                        </LinearGradient>
                    </View>
                </View>
            </MotiView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 4,
    },
    iconContainer: {
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    gradientIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    }
});

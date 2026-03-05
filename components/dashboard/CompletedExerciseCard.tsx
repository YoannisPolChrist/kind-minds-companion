import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Exercise } from '../../types';
import i18n from '../../utils/i18n';
import { useState } from 'react';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { CheckCircle2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../contexts/ThemeContext';

function formatShortDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export function CompletedExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
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
                animate={{ scale: pressed ? 0.97 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F8F6', borderColor: colors.border }]}
            >
                {exercise.coverImage && (
                    <View style={{ marginBottom: 20, borderRadius: 20, overflow: 'hidden', width: '100%', height: 96, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6', opacity: 0.5, borderColor: isDark ? 'transparent' : colors.border, borderWidth: 1 }}>
                        <Image source={{ uri: exercise.coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    </View>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8, gap: 16 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textSubtle, textDecorationLine: 'line-through', marginBottom: 6 }} numberOfLines={2}>{exercise.title}</Text>
                        {exercise.lastCompletedAt && (
                            <Text style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#9CA3AF', fontSize: 12, fontWeight: '500' }} numberOfLines={1}>
                                {i18n.t('dashboard.completed.done_on', { date: formatShortDate(exercise.lastCompletedAt), defaultValue: `Erledigt am ${formatShortDate(exercise.lastCompletedAt)}` })}
                            </Text>
                        )}
                    </View>
                    <View
                        style={{ width: 56, height: 56, borderWidth: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: `${exercise.themeColor || colors.primary}15`, borderColor: `${exercise.themeColor || colors.primary}33` }}
                    >
                        <CheckCircle2 size={28} color={exercise.themeColor || colors.primary} />
                    </View>
                </View>
            </MotiView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 24,
        borderRadius: 32,
        borderWidth: 1,
        marginBottom: 16,
    }
});

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Exercise } from '../../types';
import i18n from '../../utils/i18n';
import { useState } from 'react';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { CheckCircle2 } from 'lucide-react-native';

function formatShortDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export function CompletedExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
    const [pressed, setPressed] = useState(false);

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
                style={styles.card}
            >
                <View className="flex-row justify-between items-center opacity-80 gap-4">
                    <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-500 line-through mb-1.5 flex-wrap" numberOfLines={2}>{exercise.title}</Text>
                        {exercise.lastCompletedAt && (
                            <Text className="text-gray-400 text-xs font-medium flex-wrap" numberOfLines={1}>{i18n.t('dashboard.completed.done_on', { date: formatShortDate(exercise.lastCompletedAt), defaultValue: `Erledigt am ${formatShortDate(exercise.lastCompletedAt)}` })}</Text>
                        )}
                    </View>
                    <View className="w-14 h-14 bg-[#10b981]/10 border border-[#10b981]/20 rounded-full items-center justify-center">
                        <CheckCircle2 size={28} color="#10b981" />
                    </View>
                </View>
            </MotiView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#F9F8F6',
        padding: 24,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
    }
});

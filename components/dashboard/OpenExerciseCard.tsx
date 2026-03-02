import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Exercise } from '../../types';
import i18n from '../../utils/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useState } from 'react';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { CalendarDays, Play } from 'lucide-react-native';

export function OpenExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
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
                animate={{ scale: pressed ? 0.96 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={styles.card}
            >
                {exercise.coverImage && (
                    <View className="mb-5 rounded-[20px] overflow-hidden w-full h-32 bg-gray-100 border border-gray-100">
                        <Image source={{ uri: exercise.coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    </View>
                )}
                <View className="flex-row justify-between items-center gap-4">
                    <View className="flex-1 pr-5">
                        <Text className="text-[19px] font-black tracking-tight text-[#243842] mb-3 leading-snug">{exercise.title}</Text>
                        <View className="flex-row flex-wrap gap-2.5">
                            <View className="bg-[#F9F8F6] px-3.5 py-1.5 rounded-full border border-gray-100">
                                <Text className="text-[#243842]/70 text-xs font-bold tracking-wide uppercase">{i18n.t('dashboard.exercises.modules', { count: exercise.blocks?.length ?? 0 })}</Text>
                            </View>
                            {exercise.recurrence && exercise.recurrence !== 'none' && (
                                <View className="bg-[#C09D59]/10 px-3.5 py-1.5 rounded-full flex-row items-center">
                                    <CalendarDays size={14} color="#C09D59" style={{ marginRight: 6 }} />
                                    <Text className="text-[#C09D59] text-xs font-bold tracking-wide uppercase">
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

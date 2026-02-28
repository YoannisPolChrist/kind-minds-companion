import { View, Text, Pressable, StyleSheet } from 'react-native';
import i18n from '../../utils/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Sparkles } from 'lucide-react-native';

export function CheckinBanner({ done, onPress }: { done: boolean; onPress: () => void }) {
    const [pressed, setPressed] = useState(false);

    if (done) {
        return (
            <View className="bg-white/60 border border-[#E5E7EB] p-6 rounded-[32px] mb-6 shadow-sm flex-row items-center gap-5">
                <View className="bg-[#137386]/10 w-14 h-14 rounded-full items-center justify-center">
                    <Sparkles size={24} color="#137386" />
                </View>
                <View className="flex-1 pr-2">
                    <Text className="text-[#243842] font-black text-[19px] tracking-tight leading-snug mb-0.5">{i18n.t('dashboard.checkin.completed', { defaultValue: 'Check-in erledigt!' })}</Text>
                    <Text className="text-[#243842]/50 text-sm font-medium tracking-wide">{i18n.t('dashboard.checkin.tomorrow', { defaultValue: 'Morgen wieder verfügbar.' })}</Text>
                </View>
            </View>
        );
    }

    const handlePressIn = () => {
        setPressed(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    };

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={() => setPressed(false)}
            onPress={onPress}
        >
            <MotiView
                animate={{ scale: pressed ? 0.95 : 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                style={styles.shadow}
            >
                <LinearGradient
                    colors={['#D4AF37', '#AA7C11']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientCard}
                >
                    <View className="flex-1 pr-6">
                        <Text className="text-white font-black text-[22px] tracking-tight leading-tight mb-1.5">{i18n.t('dashboard.checkin.title')}</Text>
                        <Text className="text-white/80 text-[15px] leading-snug font-semibold">{i18n.t('dashboard.checkin.subtitle')}</Text>
                    </View>
                    <View className="bg-[#1e293b] px-6 py-4 rounded-full shadow-md">
                        <Text className="text-white font-extrabold text-[15px] tracking-wide">{i18n.t('dashboard.checkin.button')}</Text>
                    </View>
                </LinearGradient>
            </MotiView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    shadow: {
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 8,
        marginBottom: 24,
    },
    gradientCard: {
        padding: 24,
        borderRadius: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    }
});

import { View, Text, Pressable, StyleSheet } from 'react-native';
import i18n from '../../utils/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Sparkles, CheckCircle2, Heart, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Platform } from 'react-native';

export function CheckinBanner({ done, onPress }: { done: boolean; onPress: () => void }) {
    const [pressed, setPressed] = useState(false);
    const { colors, isDark } = useTheme();

    if (done) {
        return (
            <MotiView
                from={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                style={{ marginBottom: 24 }}
            >
                <Pressable onPress={onPress} style={{ borderRadius: 28, overflow: 'hidden' }}>
                    <LinearGradient
                        colors={isDark ? ['rgba(16,185,129,0.2)', 'rgba(5,150,105,0.15)'] : ['#ECFDF5', '#D1FAE5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.completedCard}
                    >
                        <View style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.15)', width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 size={26} color="#10B981" />
                        </View>
                        <View style={{ flex: 1, paddingHorizontal: 16 }}>
                            <Text style={{ color: isDark ? '#34D399' : '#065F46', fontWeight: '900', fontSize: 17, letterSpacing: -0.3, marginBottom: 2 }}>
                                {i18n.t('dashboard.checkin.completed', { defaultValue: 'Check-in erledigt!' })}
                            </Text>
                            <Text style={{ color: isDark ? '#6EE7B7' : '#047857', fontSize: 13, fontWeight: '600' }}>
                                Auswertung anzeigen →
                            </Text>
                        </View>
                        <Sparkles size={20} color={isDark ? 'rgba(52,211,153,0.5)' : 'rgba(16,185,129,0.4)'} />
                    </LinearGradient>
                </Pressable>
            </MotiView>
        );
    }

    const handlePressIn = () => {
        setPressed(true);
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
        }
    };

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={() => setPressed(false)}
            onPress={onPress}
        >
            <MotiView
                animate={{ scale: pressed ? 0.96 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={styles.shadow}
            >
                <LinearGradient
                    colors={['#C09D59', '#A07C39', '#8B6520']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientCard}
                >
                    {/* Left: Icon + Text */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                            <Heart size={26} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
                                Tages-Check-in
                            </Text>
                            <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 19, letterSpacing: -0.5, lineHeight: 24 }}>
                                {i18n.t('dashboard.checkin.title')}
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginTop: 3 }}>
                                {i18n.t('dashboard.checkin.subtitle')}
                            </Text>
                        </View>
                    </View>

                    {/* Right: CTA pill */}
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowRight size={22} color="#ffffff" />
                    </View>
                </LinearGradient>
            </MotiView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    shadow: {
        shadowColor: '#C09D59',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
        marginBottom: 24,
    },
    gradientCard: {
        padding: 24,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    completedCard: {
        padding: 20,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.25)',
    },
});

import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import i18n from '../../utils/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Sparkles, CheckCircle2, HeartPulse, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export function CheckinBanner({ done, onPress }: { done: boolean; onPress: () => void }) {
    const [pressed, setPressed] = useState(false);
    const { colors, isDark } = useTheme();
    const { isXs, isSm } = useResponsiveLayout();

    if (done) {
        return (
            <MotiView
                from={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                style={{ marginBottom: 24 }}
            >
                <Pressable onPress={onPress} style={{ borderRadius: isSm ? 24 : 32, overflow: 'hidden' }}>
                    <LinearGradient
                        colors={isDark ? ['rgba(120,142,118,0.16)', 'rgba(95,117,96,0.06)'] : ['#EEF3EE', '#F5F1EA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.completedCard, isXs ? styles.completedCardCompact : null, { borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#D8E2D7' }]}
                    >
                        <View style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#D8E2D7', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#788E76', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}>
                            <CheckCircle2 size={28} color="#788E76" />
                        </View>
                        <View style={{ flex: 1, paddingHorizontal: isXs ? 0 : 16, paddingTop: isXs ? 12 : 0 }}>
                            <Text style={{ color: isDark ? '#34D399' : '#065F46', fontWeight: '900', fontSize: isXs ? 16 : 18, letterSpacing: -0.5, marginBottom: 4 }}>
                                {i18n.t('dashboard.checkin.completed', { defaultValue: 'Check-in erledigt!' })}
                            </Text>
                            <Text style={{ color: isDark ? '#C7D5BC' : '#788E76', fontSize: 13, fontWeight: '700' }}>
                                {'Auswertung anzeigen ->'}
                            </Text>
                        </View>
                        <MotiView
                            from={{ rotate: '0deg' }}
                            animate={{ rotate: '360deg' }}
                            transition={{ loop: true, type: 'timing', duration: 8000 }}
                            style={{ alignSelf: isXs ? 'flex-start' : 'auto' }}
                        >
                            <Sparkles size={24} color={isDark ? 'rgba(52,211,153,0.6)' : 'rgba(16,185,129,0.5)'} />
                        </MotiView>
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
                style={[styles.shadow, { shadowColor: isDark ? '#000' : '#2D666B' }]}
            >
                <View style={{ borderRadius: isSm ? 24 : 32, overflow: 'hidden' }}>
                    <LinearGradient
                        colors={isDark ? ['#1E3A8A', '#182428'] : [colors.primary, colors.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.gradientCard, isXs ? styles.gradientCardCompact : null]}
                    >
                        <View style={{ position: 'absolute', right: -20, top: -20, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                        <View style={{ position: 'absolute', right: 40, bottom: -40, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)' }} />

                        <View style={{ flexDirection: isXs ? 'column' : 'row', alignItems: isXs ? 'flex-start' : 'center', flex: 1, paddingRight: isXs ? 0 : 16, gap: isXs ? 14 : 0 }}>
                            <MotiView
                                from={{ scale: 0.9, opacity: 0.8 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', loop: true, duration: 2000 }}
                                style={{ backgroundColor: 'rgba(255,255,255,0.15)', width: isXs ? 56 : 64, height: isXs ? 56 : 64, borderRadius: isXs ? 28 : 32, alignItems: 'center', justifyContent: 'center', marginRight: isXs ? 0 : 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                            >
                                <HeartPulse size={isXs ? 24 : 30} color="#fff" />
                            </MotiView>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399', marginRight: 6 }} />
                                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                                        Tages-Check-in
                                    </Text>
                                </View>
                                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: isXs ? 20 : 24, letterSpacing: -0.5, lineHeight: isXs ? 24 : 28 }}>
                                    {i18n.t('dashboard.checkin.title')}
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                                    {i18n.t('dashboard.checkin.subtitle')}
                                </Text>
                            </View>
                        </View>

                        <MotiView
                            animate={{ translateX: pressed ? 5 : 0 }}
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', alignSelf: isXs ? 'flex-start' : 'auto' }}
                        >
                            <ArrowRight size={24} color="#ffffff" />
                        </MotiView>
                    </LinearGradient>
                </View>
            </MotiView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    shadow: {
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 10,
        marginBottom: 24,
    },
    gradientCard: {
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
    },
    gradientCardCompact: {
        padding: 18,
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 18,
    },
    completedCard: {
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
    },
    completedCardCompact: {
        padding: 18,
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
    },
});

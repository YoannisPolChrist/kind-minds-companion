import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import i18n from '../../utils/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Sparkles, CheckCircle2, HeartPulse, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

export function CheckinBanner({ done, onPress }: { done: boolean; onPress: () => void }) {
    const [pressed, setPressed] = useState(false);
    const { colors, isDark } = useTheme();
    const { width } = useWindowDimensions();
    const isSmall = width < 380;

    if (done) {
        return (
            <MotiView
                from={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                style={{ marginBottom: 24 }}
            >
                <Pressable onPress={onPress} style={{ borderRadius: 32, overflow: 'hidden' }}>
                    <LinearGradient
                        colors={isDark ? ['rgba(16,185,129,0.15)', 'rgba(5,150,105,0.05)'] : ['#ECFDF5', '#F8FAFC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.completedCard, { borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#D1FAE5' }]}
                    >
                        <View style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}>
                            <CheckCircle2 size={28} color="#10B981" />
                        </View>
                        <View style={{ flex: 1, paddingHorizontal: 16 }}>
                            <Text style={{ color: isDark ? '#34D399' : '#065F46', fontWeight: '900', fontSize: isSmall ? 16 : 18, letterSpacing: -0.5, marginBottom: 4 }}>
                                {i18n.t('dashboard.checkin.completed', { defaultValue: 'Check-in erledigt!' })}
                            </Text>
                            <Text style={{ color: isDark ? '#6EE7B7' : '#059669', fontSize: 13, fontWeight: '700' }}>
                                Auswertung anzeigen →
                            </Text>
                        </View>
                        <MotiView
                            from={{ rotate: '0deg' }}
                            animate={{ rotate: '360deg' }}
                            transition={{ loop: true, type: 'timing', duration: 8000 }}
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
                style={[styles.shadow, { shadowColor: isDark ? '#000' : '#137386' }]}
            >
                <View style={{ borderRadius: 32, overflow: 'hidden' }}>
                    <LinearGradient
                        colors={isDark ? ['#1E3A8A', '#0F172A'] : [colors.primary, colors.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientCard}
                    >
                        {/* Background decorative elements */}
                        <View style={{ position: 'absolute', right: -20, top: -20, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                        <View style={{ position: 'absolute', right: 40, bottom: -40, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)' }} />

                        {/* Left: Icon + Text */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 }}>
                            <MotiView
                                from={{ scale: 0.9, opacity: 0.8 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', loop: true, duration: 2000 }}
                                style={{ backgroundColor: 'rgba(255,255,255,0.15)', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginRight: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                            >
                                <HeartPulse size={30} color="#fff" />
                            </MotiView>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399', marginRight: 6 }} />
                                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                                        Tages-Check-in
                                    </Text>
                                </View>
                                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: isSmall ? 20 : 24, letterSpacing: -0.5, lineHeight: 28 }}>
                                    {i18n.t('dashboard.checkin.title')}
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                                    {i18n.t('dashboard.checkin.subtitle')}
                                </Text>
                            </View>
                        </View>

                        {/* Right: CTA pill */}
                        <MotiView
                            animate={{ translateX: pressed ? 5 : 0 }}
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
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
    completedCard: {
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
    },
});

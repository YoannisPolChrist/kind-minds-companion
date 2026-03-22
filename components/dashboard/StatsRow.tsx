import { View, Text, StyleSheet } from 'react-native';
import i18n from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';
import { PressableScale } from '../ui/PressableScale';

export function StatsRow({ total, open, completed, onPress }: { total: number; open: number; completed: number, onPress?: () => void }) {
    const { colors, isDark } = useTheme();
    return (
        <PressableScale onPress={onPress || (() => { })}>
            <View className="flex-row gap-3">
                {[
                    { value: total, label: i18n.t('dashboard.stats.total', { defaultValue: 'Gesamt' }), bg: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', text: colors.text, labelText: colors.textSubtle, border: isDark ? 'rgba(255,255,255,0.08)' : colors.border, accent: colors.text },
                    { value: open, label: i18n.t('dashboard.stats.open', { defaultValue: 'Offen' }), bg: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', text: colors.primary, labelText: colors.primary, border: isDark ? 'rgba(255,255,255,0.08)' : colors.border, accent: colors.primary },
                    { value: completed, label: i18n.t('dashboard.stats.completed', { defaultValue: 'Erledigt' }), bg: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', text: colors.secondary, labelText: colors.secondary, border: isDark ? 'rgba(255,255,255,0.08)' : colors.border, accent: colors.secondary },
                ].map((stat, i) => (
                    <View key={stat.label + i} style={[styles.statBox, { backgroundColor: stat.bg, borderColor: stat.border, shadowColor: isDark ? '#000' : '#1e293b', shadowOpacity: isDark ? 0.2 : 0.04 }]}>
                        <View style={{ width: 28, height: 4, borderRadius: 999, backgroundColor: stat.accent, marginBottom: 14, opacity: 0.9 }} />
                        <Text style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, color: stat.labelText, marginBottom: 10, opacity: 0.82 }}>{stat.label}</Text>
                        <Text style={{ fontSize: 30, fontWeight: '900', color: stat.text, letterSpacing: -1 }}>{stat.value}</Text>
                    </View>
                ))}
            </View>
        </PressableScale>
    );
}

const styles = StyleSheet.create({
    statBox: {
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 14,
        borderRadius: 24,
        alignItems: 'flex-start',
        borderWidth: 1,
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
    }
});

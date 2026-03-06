import { View, Text, StyleSheet } from 'react-native';
import i18n from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';
import { PressableScale } from '../ui/PressableScale';

export function StatsRow({ total, open, completed, onPress }: { total: number; open: number; completed: number, onPress?: () => void }) {
    const { colors, isDark } = useTheme();
    return (
        <PressableScale onPress={onPress || (() => { })}>
            <View className="flex-row gap-3.5 mb-8">
                {[
                    { value: total, label: i18n.t('dashboard.stats.total', { defaultValue: 'Gesamt' }), bg: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', text: colors.text, labelText: colors.textSubtle, border: isDark ? 'transparent' : colors.border },
                    { value: open, label: i18n.t('dashboard.stats.open', { defaultValue: 'Offen' }), bg: `${colors.primary}1A`, text: colors.primary, labelText: colors.primary, border: isDark ? 'transparent' : `${colors.primary}33` },
                    { value: completed, label: i18n.t('dashboard.stats.completed', { defaultValue: 'Erledigt' }), bg: `${colors.secondary}1A`, text: colors.secondary, labelText: colors.secondary, border: isDark ? 'transparent' : `${colors.secondary}33` },
                ].map((stat, i) => (
                    <View key={stat.label + i} style={[styles.statBox, { backgroundColor: stat.bg, borderColor: stat.border, shadowColor: isDark ? '#000' : '#1e293b', shadowOpacity: isDark ? 0.2 : 0.04 }]}>
                        <Text style={{ fontSize: 32, fontWeight: '900', color: stat.text, letterSpacing: -1 }}>{stat.value}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, color: stat.labelText, marginTop: 6, opacity: 0.8 }}>{stat.label}</Text>
                    </View>
                ))}
            </View>
        </PressableScale>
    );
}

const styles = StyleSheet.create({
    statBox: {
        flex: 1,
        paddingVertical: 22,
        borderRadius: 28,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
    }
});

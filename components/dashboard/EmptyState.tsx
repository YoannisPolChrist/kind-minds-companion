import { View, Text } from 'react-native';
import i18n from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';

export function EmptyState() {
    const { colors, isDark } = useTheme();
    return (
        <View style={{ backgroundColor: colors.surface, padding: 40, borderRadius: 32, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 32, shadowColor: isDark ? '#000' : '#20363A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 12, elevation: 3 }}>
            <View style={{ width: 80, height: 80, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7F4EE', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Text style={{ fontSize: 40 }}>🌿</Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 22, textAlign: 'center', marginBottom: 8, letterSpacing: -0.5, lineHeight: 28 }}>{i18n.t('dashboard.exercises.empty_title')}</Text>
            <Text style={{ color: colors.textSubtle, textAlign: 'center', fontSize: 15, lineHeight: 24, paddingHorizontal: 8, fontWeight: '500' }}>
                {i18n.t('dashboard.exercises.empty_desc')}
            </Text>
        </View>
    );
}


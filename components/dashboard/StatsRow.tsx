import { View, Text, StyleSheet } from 'react-native';
import i18n from '../../utils/i18n';

export function StatsRow({ total, open, completed }: { total: number; open: number; completed: number }) {
    return (
        <View className="flex-row gap-3.5 mb-8">
            {[
                { value: total, label: i18n.t('dashboard.stats.total', { defaultValue: 'Gesamt' }), bg: '#ffffff', text: '#243842', labelText: '#24384280', border: '#E5E7EB' },
                { value: open, label: i18n.t('dashboard.stats.open', { defaultValue: 'Offen' }), bg: '#C09D5910', text: '#C09D59', labelText: '#C09D5980', border: '#C09D5920' },
                { value: completed, label: i18n.t('dashboard.stats.completed', { defaultValue: 'Erledigt' }), bg: '#13738610', text: '#137386', labelText: '#13738680', border: '#13738620' },
            ].map(stat => (
                <View key={stat.label} style={[styles.statBox, { backgroundColor: stat.bg, borderColor: stat.border }]}>
                    <Text style={{ fontSize: 32, fontWeight: '900', color: stat.text, letterSpacing: -1 }}>{stat.value}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, color: stat.labelText, marginTop: 6 }}>{stat.label}</Text>
                </View>
            ))}
        </View>
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

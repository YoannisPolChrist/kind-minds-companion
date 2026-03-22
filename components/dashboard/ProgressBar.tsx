import { View, Text } from 'react-native';
import i18n from '../../utils/i18n';

export function ProgressBar({ completed, total }: { completed: number; total: number }) {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (
        <View className="bg-white/10 rounded-3xl p-4 mt-2 shadow-sm border border-white/5">
            <View className="flex-row justify-between items-center mb-3">
                <Text className="text-white/70 text-xs font-bold uppercase tracking-widest">{i18n.t('dashboard.progress.title', { defaultValue: 'Fortschritt heute' })}</Text>
                <Text className="text-[#C09D59] font-extrabold">{pct}%</Text>
            </View>
            <View className="h-2.5 bg-black/20 rounded-full overflow-hidden">
                <View className="h-full bg-[#C09D59] rounded-full" style={{ width: `${pct}%` }} />
            </View>
            <Text className="text-white/50 text-xs mt-3 font-medium tracking-wide">{i18n.t('dashboard.progress.count', { completed, total, defaultValue: `${completed} von ${total} erledigt` })}</Text>
        </View>
    );
}

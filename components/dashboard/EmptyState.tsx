import { View, Text } from 'react-native';
import i18n from '../../utils/i18n';

export function EmptyState() {
    return (
        <View className="bg-white p-10 rounded-[32px] border border-[#E5E7EB] items-center justify-center mt-4 mb-8" style={{ shadowColor: '#1e293b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 }}>
            <View className="w-20 h-20 bg-[#F9F8F6] rounded-full items-center justify-center mb-6">
                <Text className="text-[40px]">🌿</Text>
            </View>
            <Text className="text-[#243842] font-black text-[22px] text-center mb-2 tracking-tight leading-snug">{i18n.t('dashboard.exercises.empty_title')}</Text>
            <Text className="text-[#243842]/60 text-center text-[15px] leading-relaxed px-2 font-medium">
                {i18n.t('dashboard.exercises.empty_desc')}
            </Text>
        </View>
    );
}

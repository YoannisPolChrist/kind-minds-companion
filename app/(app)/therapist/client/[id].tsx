import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ClientView() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    return (
        <View className="flex-1 bg-[#FAF9F6] p-6">
            <View className="flex-row items-center justify-between mb-8">
                <TouchableOpacity onPress={() => router.back()} className="bg-gray-200 px-4 py-2 rounded-lg">
                    <Text className="text-[#2C3E50] font-medium">Zurück</Text>
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-[#2C3E50]">Klient Details</Text>
            </View>

            <Text className="text-gray-500 mb-6">ID: {id}</Text>

            <View className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
                <Text className="text-xl font-bold text-[#2C3E50] mb-2">Aktive Übungen</Text>
                <Text className="text-gray-500 italic">Noch keine Übungen zugewiesen.</Text>
            </View>

            <TouchableOpacity className="bg-blue-500 py-4 rounded-xl items-center mt-auto">
                <Text className="text-white font-bold text-lg">+ Neue Übung zuweisen</Text>
            </TouchableOpacity>
        </View>
    );
}

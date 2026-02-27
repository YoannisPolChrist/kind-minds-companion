import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import i18n from '../../utils/i18n';
import { MotiView } from 'moti';

export default function ResourcesScreen() {
    const router = useRouter();
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchResources = async () => {
        try {
            const q = query(collection(db, "resources"));
            const querySnapshot = await getDocs(q);
            const data: any[] = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            // Client-side sort if index missing
            data.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            });
            setResources(data);
        } catch (error) {
            console.error("Error fetching resources:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchResources();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchResources();
    }, []);

    const handleOpenResource = (url: string) => {
        Linking.openURL(url).catch(err => {
            console.error("Cannot open url", err);
            alert(i18n.t('resources.open_error', { defaultValue: 'Error opening resource.' }));
        });
    };

    return (
        <View className="flex-1 bg-[#F9F8F6]">
            {/* Animated Header */}
            <MotiView
                from={{ opacity: 0, translateY: -40 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 50 }}
            >
                <View className="bg-[#137386] pt-16 pb-6 px-6 rounded-b-3xl shadow-md z-10 flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2.5 rounded-2xl backdrop-blur-md">
                        <Text className="text-white font-bold">{i18n.t('exercise.back')}</Text>
                    </TouchableOpacity>
                    <Text className="text-xl font-extrabold text-white flex-1 text-right ml-4">
                        {i18n.t('resources.title', { defaultValue: 'Resource Library' })}
                    </Text>
                </View>
            </MotiView>

            <ScrollView
                className="flex-1 px-6 pt-6"
                contentContainerStyle={{ paddingBottom: 60 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#137386" />}
            >
                <Text className="text-gray-500 font-medium mb-6">
                    {i18n.t('resources.library_desc', { defaultValue: 'Here you will find helpful documents, worksheets and links provided by your therapist.' })}
                </Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#137386" className="mt-10" />
                ) : resources.length === 0 ? (
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm items-center mt-4"
                    >
                        <Text className="text-4xl mb-4">📚</Text>
                        <Text className="text-[#2C3E50] font-bold text-lg text-center mb-1">{i18n.t('resources.no_resources')}</Text>
                        <Text className="text-gray-500 text-center leading-5">{i18n.t('resources.no_documents_uploaded')}</Text>
                    </MotiView>
                ) : (
                    resources.map((item, index) => (
                        <MotiView
                            key={item.id}
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 100 + (index * 50) }}
                            className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-4"
                        >
                            <View className="flex-row items-start mb-3">
                                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${item.type === 'pdf' ? 'bg-red-50' : 'bg-blue-50'}`}>
                                    <Text className="text-xl">{item.type === 'pdf' ? '📄' : '🔗'}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-[#2C3E50] leading-tight mb-1">{item.title}</Text>
                                    <View className="flex-row items-center">
                                        <View className={`px-2 py-0.5 rounded-md ${item.type === 'pdf' ? 'bg-red-50' : 'bg-blue-50'}`}>
                                            <Text className={`text-[10px] font-bold uppercase tracking-wider ${item.type === 'pdf' ? 'text-red-600' : 'text-blue-600'}`}>
                                                {item.type === 'pdf' ? 'PDF Dokument' : 'Web Link'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {item.description ? (
                                <Text className="text-gray-500 text-sm mb-4 leading-5">{item.description}</Text>
                            ) : null}

                            <TouchableOpacity
                                onPress={() => handleOpenResource(item.url)}
                                className={`py-3.5 rounded-xl items-center flex-row justify-center ${item.type === 'pdf' ? 'bg-red-500' : 'bg-[#137386]'}`}
                            >
                                <Text className="text-white font-bold">{item.type === 'pdf' ? i18n.t('resources.open_pdf', { defaultValue: 'Open PDF' }) : i18n.t('resources.open_link', { defaultValue: 'Open Link' })}</Text>
                            </TouchableOpacity>
                        </MotiView>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

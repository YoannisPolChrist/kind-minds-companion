import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking, RefreshControl, Platform } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import i18n from '../../utils/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Link as LinkIcon, Download, X, Eye } from 'lucide-react-native';
import { Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useClientResources } from '../../hooks/firebase/useClientResources';
import { useTheme } from '../../contexts/ThemeContext';

export default function ResourcesScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { resources, loading, refreshing, onRefresh } = useClientResources();
    const [selectedResource, setSelectedResource] = useState<any>(null);

    const handleOpenResource = (url: string) => {
        Linking.openURL(url).catch(err => {
            console.error("Cannot open url", err);
            alert(i18n.t('resources.open_error', { defaultValue: 'Error opening resource.' }));
        });
    };

    return (
        <View className="flex-1 bg-[#F9F8F6]">
            {/* Animated Premium Header */}
            <MotiView
                from={{ opacity: 0, translateY: -40 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 50 }}
            >
                <LinearGradient
                    colors={[colors.primaryDark, colors.primary]}
                    style={{ paddingTop: Platform.OS === 'android' ? 56 : 64, paddingBottom: 24, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                    <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '700' }}>Zurück</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: 'white', flex: 1, textAlign: 'right', marginLeft: 16 }}>
                        {i18n.t('resources.title', { defaultValue: 'Bibliothek' })}
                    </Text>
                </LinearGradient>
            </MotiView>

            <Animated.FlatList
                data={resources}
                keyExtractor={(item: any) => item.id}
                style={{ flex: 1, width: '100%', maxWidth: 860, alignSelf: 'center' }}
                className="px-6 pt-6"
                contentContainerStyle={{ paddingBottom: 60 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListHeaderComponent={() => (
                    <Text className="text-gray-500 font-medium mb-6 leading-5">
                        Hier findest du hilfreiche Dokumente, Arbeitsblätter und Links, die dir von deinem Therapeuten zur Verfügung gestellt wurden.
                    </Text>
                )}
                ListEmptyComponent={() => (
                    loading ? (
                        <ActivityIndicator size="large" color={colors.primary} className="mt-10" />
                    ) : (
                        <Animated.View
                            entering={FadeInDown.springify()}
                            className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm items-center mt-4"
                        >
                            <Text className="text-4xl mb-4">📚</Text>
                            <Text className="text-[#2C3E50] font-bold text-lg text-center mb-1">{i18n.t('resources.no_resources', { defaultValue: 'Keine Ressourcen' })}</Text>
                            <Text className="text-gray-500 text-center leading-5">{i18n.t('resources.no_documents_uploaded', { defaultValue: 'Dein Therapeut hat noch keine Dokumente hinterlegt.' })}</Text>
                        </Animated.View>
                    )
                )}
                renderItem={({ item, index }: { item: any, index: number }) => (
                    <Animated.View
                        entering={FadeInDown.delay(100 + (index * 50)).springify()}
                        layout={Layout.springify()}
                        style={{ backgroundColor: 'white', padding: 24, borderRadius: 28, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 16, shadowColor: '#1e293b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}
                    >
                        <View className="flex-row items-start mb-4">
                            <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 flex-shrink-0 ${item.type === 'document' ? 'bg-indigo-50' : item.type === 'pdf' ? 'bg-red-50' : item.type === 'video' ? 'bg-purple-50' : item.type === 'image' ? 'bg-pink-50' : 'bg-blue-50'}`}>
                                {item.type === 'document' ? <FileText size={24} color="#6366F1" /> : item.type === 'pdf' ? <Text className="text-xl">📄</Text> : item.type === 'video' ? <Text className="text-xl">🎥</Text> : item.type === 'image' ? <Text className="text-xl">🖼️</Text> : <Text className="text-xl">🔗</Text>}
                            </View>
                            <View className="flex-1">
                                <Text className="text-lg font-bold text-[#2C3E50] leading-tight mb-1">{item.title}</Text>
                                <View className="flex-row items-center">
                                    <View className={`px-2 py-0.5 rounded-md ${item.type === 'document' ? 'bg-indigo-50' : item.type === 'pdf' ? 'bg-red-50' : item.type === 'video' ? 'bg-purple-50' : item.type === 'image' ? 'bg-pink-50' : 'bg-blue-50'}`}>
                                        <Text className={`text-[10px] font-bold uppercase tracking-wider ${item.type === 'document' ? 'text-indigo-600' : item.type === 'pdf' ? 'text-red-600' : item.type === 'video' ? 'text-purple-600' : item.type === 'image' ? 'text-pink-600' : 'text-blue-600'}`}>
                                            {item.type === 'document' ? 'Geteiltes Dokument' : item.type === 'pdf' ? 'PDF Dokument' : item.type === 'video' ? 'Video' : item.type === 'image' ? 'Bild' : 'Web Link'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {item.description ? (
                            <Text className="text-gray-500 text-sm mb-5 leading-5">{item.description}</Text>
                        ) : null}

                        {/* Button sits inside card padding — extra mx ensures it never kisses the card border */}
                        <TouchableOpacity
                            onPress={() => setSelectedResource(item)}
                            style={{ marginHorizontal: 0, paddingVertical: 14, borderRadius: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', backgroundColor: item.type === 'document' ? colors.primary : item.type === 'pdf' ? '#DC2626' : item.type === 'video' ? '#C09D59' : item.type === 'image' ? '#DB2777' : colors.primary }}
                        >
                            <Eye size={18} color="white" style={{ marginRight: 8 }} />
                            <Text className="text-white font-bold">{item.type === 'document' || item.type === 'pdf' ? 'Details & Vorschau' : item.type === 'video' ? 'Video ansehen' : item.type === 'image' ? 'Bild ansehen' : 'Vorschau öffnen'}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            />

            {/* Resource Detail & Preview Modal */}
            <Modal
                visible={!!selectedResource}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedResource(null)}
            >
                <View className="flex-1 bg-[#F9F8F6]">
                    {/* Modal Header */}
                    <View className="bg-[#137386] flex-row items-center justify-between" style={{ paddingTop: Platform.OS === 'android' ? 56 : 64, paddingBottom: 24, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, zIndex: 10 }}>
                        <Text className="text-white text-[20px] font-black max-w-[80%]" numberOfLines={1}>
                            {selectedResource?.title || 'Vorschau'}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedResource(null)} className="w-10 h-10 bg-white/20 rounded-full items-center justify-center backdrop-blur-md">
                            <X size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Modal Content */}
                    <View className="flex-1">
                        {selectedResource && (
                            <View className="flex-1">
                                {/* Details Section */}
                                <View className="bg-white p-6 rounded-b-[32px] border-b border-gray-100 shadow-sm z-0">
                                    <View className="flex-row items-center mb-3">
                                        <View className={`px-2.5 py-1 rounded-lg ${selectedResource.type === 'document' ? 'bg-indigo-50' : selectedResource.type === 'pdf' ? 'bg-red-50' : selectedResource.type === 'video' ? 'bg-purple-50' : selectedResource.type === 'image' ? 'bg-pink-50' : 'bg-blue-50'}`}>
                                            <Text className={`text-[11px] font-black uppercase tracking-widest ${selectedResource.type === 'document' ? 'text-indigo-600' : selectedResource.type === 'pdf' ? 'text-red-600' : selectedResource.type === 'video' ? 'text-purple-600' : selectedResource.type === 'image' ? 'text-pink-600' : 'text-blue-600'}`}>
                                                {selectedResource.type === 'document' ? 'Geteiltes Dokument' : selectedResource.type === 'pdf' ? 'PDF Dokument' : selectedResource.type === 'video' ? 'Video' : selectedResource.type === 'image' ? 'Bild' : 'Web Link'}
                                            </Text>
                                        </View>
                                    </View>
                                    {selectedResource.description ? (
                                        <Text className="text-[#243842]/70 text-[15px] leading-relaxed mb-4">
                                            {selectedResource.description}
                                        </Text>
                                    ) : null}

                                    {/* Download / Open Externally Action */}
                                    <TouchableOpacity
                                        onPress={() => handleOpenResource(selectedResource.url)}
                                        className="bg-[#C09D59] flex-row items-center justify-center py-4 rounded-[20px] shadow-sm"
                                        style={{ shadowColor: '#C09D59', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                                    >
                                        {selectedResource.type !== 'link' && <Download size={20} color="white" style={{ marginRight: 8 }} />}
                                        <Text className="text-white font-bold text-[16px]">
                                            {selectedResource.type === 'link' ? 'Im Browser öffnen' : 'Speichern / Herunterladen'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Embedded Preview Section */}
                                <View className="flex-1 bg-gray-50/50 mt-4 mx-4 mb-8 rounded-[32px] overflow-hidden border border-gray-200">
                                    {selectedResource.type === 'image' ? (
                                        <Image
                                            source={{ uri: selectedResource.url }}
                                            style={{ width: '100%', height: '100%' }}
                                            contentFit="contain"
                                        />
                                    ) : selectedResource.type === 'pdf' || selectedResource.type === 'document' ? (
                                        Platform.OS === 'web' ? (
                                            // @ts-ignore
                                            <iframe src={selectedResource.url} width="100%" height="100%" style={{ border: 'none', backgroundColor: 'transparent' }} />
                                        ) : (
                                            <WebView
                                                source={{ uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(selectedResource.url)}` }}
                                                style={{ flex: 1, backgroundColor: 'transparent' }}
                                                startInLoadingState={true}
                                                renderLoading={() => <ActivityIndicator size="large" color="#137386" style={{ flex: 1, justifyContent: 'center' }} />}
                                            />
                                        )
                                    ) : (
                                        Platform.OS === 'web' ? (
                                            // @ts-ignore
                                            <iframe src={selectedResource.url} width="100%" height="100%" style={{ border: 'none', backgroundColor: 'transparent' }} />
                                        ) : (
                                            <WebView
                                                source={{ uri: selectedResource.url }}
                                                style={{ flex: 1, backgroundColor: 'transparent' }}
                                                startInLoadingState={true}
                                                renderLoading={() => <ActivityIndicator size="large" color="#137386" style={{ flex: 1, justifyContent: 'center' }} />}
                                            />
                                        )
                                    )}
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

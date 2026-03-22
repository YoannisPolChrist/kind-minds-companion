import React from 'react';
import { ActivityIndicator, Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import { Download } from 'lucide-react-native';
import { Image } from 'expo-image';
import { ResizeMode, Video } from 'expo-av';
import { WebView } from 'react-native-webview';
import { ClientFilePreviewKind, ClientFileRecord } from '../../../modules/clientFiles';

interface ClientFilePreviewContentProps {
    file: ClientFileRecord;
    previewKind: ClientFilePreviewKind;
}

export default function ClientFilePreviewContent({ file, previewKind }: ClientFilePreviewContentProps) {
    return (
        <View className="flex-1">
            <View className="bg-white p-6 rounded-b-[32px] border-b border-gray-100 shadow-sm z-0">
                {file.description ? (
                    <Text className="text-[#243842]/70 text-[15px] leading-relaxed mb-4">
                        {file.description}
                    </Text>
                ) : null}

                <TouchableOpacity
                    onPress={() => Linking.openURL(file.url)}
                    className="bg-[#C09D59] flex-row items-center justify-center py-4 rounded-[20px] shadow-sm"
                    style={{ shadowColor: '#C09D59', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                >
                    <Download size={20} color="white" style={{ marginRight: 8 }} />
                    <Text className="text-white font-bold text-[16px]">
                        Speichern / Herunterladen
                    </Text>
                </TouchableOpacity>
            </View>

            <View className="flex-1 bg-gray-50/50 mt-4 mx-4 mb-8 rounded-[32px] overflow-hidden border border-gray-200">
                {previewKind === 'image' ? (
                    <Image
                        source={{ uri: file.url }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                    />
                ) : previewKind === 'video' ? (
                    <Video
                        source={{ uri: file.url }}
                        style={{ width: '100%', height: '100%' }}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping={false}
                        shouldPlay={false}
                    />
                ) : previewKind === 'pdf' ? (
                    Platform.OS === 'web' ? (
                        <iframe src={file.url} width="100%" height="100%" style={{ border: 'none', backgroundColor: 'transparent' }} />
                    ) : (
                        <WebView
                            source={{ uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(file.url)}` }}
                            style={{ flex: 1, backgroundColor: 'transparent' }}
                            startInLoadingState={true}
                            renderLoading={() => <ActivityIndicator size="large" color="#137386" style={{ flex: 1, justifyContent: 'center' }} />}
                        />
                    )
                ) : (
                    Platform.OS === 'web' ? (
                        <iframe src={file.url} width="100%" height="100%" style={{ border: 'none', backgroundColor: 'transparent' }} />
                    ) : (
                        <WebView
                            source={{ uri: file.url }}
                            style={{ flex: 1, backgroundColor: 'transparent' }}
                            startInLoadingState={true}
                            renderLoading={() => <ActivityIndicator size="large" color="#137386" style={{ flex: 1, justifyContent: 'center' }} />}
                        />
                    )
                )}
            </View>
        </View>
    );
}

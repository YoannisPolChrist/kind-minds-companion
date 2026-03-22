import { View, Text, TouchableOpacity, Modal, Platform, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { Download, X } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { TYPE_CONFIG } from './ResourceDesign';

export function PreviewModal({
    resource,
    onClose,
}: {
    resource: any | null;
    onClose: () => void;
}) {
    if (!resource) return null;

    const config = TYPE_CONFIG[resource.type] || TYPE_CONFIG.file;
    const previewUrl =
        resource.type === 'document' || resource.type === 'pdf'
            ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(resource.url)}`
            : resource.url;

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
                <View style={{ height: '92%', backgroundColor: '#F4F1EA', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}>
                    <View style={{ paddingTop: Platform.OS === 'android' ? 46 : 60, paddingBottom: 18, paddingHorizontal: 22, backgroundColor: '#243842', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', maxWidth: '78%' }} numberOfLines={1}>
                            {resource.title}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ padding: 22, backgroundColor: '#FFFFFF' }}>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: config.bg, alignSelf: 'flex-start', marginBottom: 12 }}>
                            <Text style={{ color: config.text, fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>{config.label.toUpperCase()}</Text>
                        </View>
                        {resource.description ? (
                            <Text style={{ color: '#6B7C85', fontSize: 15, lineHeight: 22, marginBottom: 14 }}>{resource.description}</Text>
                        ) : null}
                        <TouchableOpacity
                            onPress={() => Linking.openURL(resource.url)}
                            style={{ backgroundColor: '#C09D59', borderRadius: 18, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            <Download size={18} color="#FFFFFF" />
                            <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{resource.type === 'link' ? 'Im Browser oeffnen' : 'Herunterladen'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1, margin: 16, borderRadius: 28, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                        {resource.type === 'image' ? (
                            <Image source={{ uri: resource.url }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                        ) : resource.type === 'video' ? (
                            <Video
                                source={{ uri: resource.url }}
                                style={{ width: '100%', height: '100%' }}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay={false}
                            />
                        ) : Platform.OS === 'web' ? (
                            <iframe src={previewUrl} width="100%" height="100%" style={{ border: 'none' }} />
                        ) : (
                            <WebView source={{ uri: previewUrl }} style={{ flex: 1 }} />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

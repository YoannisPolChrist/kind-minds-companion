import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';

export function AddResourceModal({
    visible,
    onClose,
    onSaveLink,
    onUploadFile,
    loading,
}: {
    visible: boolean;
    onClose: () => void;
    onSaveLink: (payload: { title: string; description: string; linkUrl: string; tagsInput: string }) => Promise<void>;
    onUploadFile: (payload: { title: string; description: string; tagsInput: string }) => Promise<void>;
    loading: boolean;
}) {
    const [resourceType, setResourceType] = useState<'file' | 'link'>('link');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [tagsInput, setTagsInput] = useState('');

    useEffect(() => {
        if (!visible) {
            setResourceType('link');
            setTitle('');
            setDescription('');
            setLinkUrl('');
            setTagsInput('');
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 16 }}
            >
                <View style={{ width: '100%', maxWidth: 560, backgroundColor: '#FFFFFF', borderRadius: 32, padding: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <Text style={{ color: '#243842', fontSize: 24, fontWeight: '900' }}>Ressource hinzufuegen</Text>
                        <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4F1EA', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={18} color="#6B7C85" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
                        {(['link', 'file'] as const).map((type) => {
                            const active = resourceType === type;
                            return (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => setResourceType(type)}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 14,
                                        borderRadius: 18,
                                        backgroundColor: active ? '#243842' : '#F7F4EE',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: active ? '#FFFFFF' : '#6B7C85', fontWeight: '900' }}>{type === 'link' ? 'Link' : 'Datei'}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={{ gap: 14 }}>
                        <View>
                            <Text style={{ color: '#6B7C85', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Titel</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                placeholder="z.B. Arbeitsblatt Achtsamkeit"
                                placeholderTextColor="#94A3B8"
                                style={{ backgroundColor: '#F7F4EE', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, color: '#243842', fontWeight: '700' }}
                            />
                        </View>

                        <View>
                            <Text style={{ color: '#6B7C85', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Beschreibung</Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Optionale Beschreibung"
                                placeholderTextColor="#94A3B8"
                                multiline
                                textAlignVertical="top"
                                style={{ backgroundColor: '#F7F4EE', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, color: '#243842', fontWeight: '600', minHeight: 98 }}
                            />
                        </View>

                        {resourceType === 'link' && (
                            <View>
                                <Text style={{ color: '#6B7C85', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>URL</Text>
                                <TextInput
                                    value={linkUrl}
                                    onChangeText={setLinkUrl}
                                    placeholder="https://..."
                                    placeholderTextColor="#94A3B8"
                                    autoCapitalize="none"
                                    style={{ backgroundColor: '#F7F4EE', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, color: '#243842', fontWeight: '700' }}
                                />
                            </View>
                        )}

                        <View>
                            <Text style={{ color: '#6B7C85', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Tags</Text>
                            <TextInput
                                value={tagsInput}
                                onChangeText={setTagsInput}
                                placeholder="achtsamkeit, uebung, therapie"
                                placeholderTextColor="#94A3B8"
                                style={{ backgroundColor: '#F7F4EE', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, color: '#243842', fontWeight: '700' }}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => resourceType === 'link'
                            ? onSaveLink({ title, description, linkUrl, tagsInput })
                            : onUploadFile({ title, description, tagsInput })}
                        disabled={loading}
                        style={{ marginTop: 20, paddingVertical: 16, borderRadius: 20, backgroundColor: '#243842', alignItems: 'center' }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 16 }}>
                                {resourceType === 'link' ? 'Link hinzufuegen' : 'Datei auswaehlen und hochladen'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

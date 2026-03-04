import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile, generateStoragePath, getExtension } from '../../utils/uploadFile';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { NoteRepository } from '../../utils/repositories/NoteRepository';
import i18n from '../../utils/i18n';
import { MotiView } from 'moti';
import { useAuth } from '../../contexts/AuthContext';
import { Edit3, Plus, ArrowLeft, X } from 'lucide-react-native';
import { SuccessAnimation } from '../../components/ui/SuccessAnimation';

export default function ClientNotesScreen() {
    const router = useRouter();
    const { profile } = useAuth();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showNoteModal, setShowNoteModal] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newNoteImage, setNewNoteImage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Toast state
    const [toast, setToast] = useState<{ visible: boolean, message: string, subMessage?: string, type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });

    const fetchNotes = async () => {
        if (!profile?.id) return;
        try {
            const data = await NoteRepository.findByClientId(profile.id);
            setNotes(data);
        } catch (error) {
            console.error("Error fetching notes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, [profile?.id]);

    const pickImage = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                setToast({ visible: true, message: 'Berechtigung', subMessage: 'Galerie-Zugriff wird benötigt.', type: 'warning' });
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
            });
            if (!result.canceled && result.assets?.[0]) {
                setNewNoteImage(result.assets[0].uri);
            }
        } catch (e) {
            console.error('Error picking note image:', e);
        }
    };

    const handleSaveNote = async () => {
        if (!newNoteContent.trim() || !profile?.id) {
            setToast({ visible: true, message: "Fehler", subMessage: "Bitte gib einen Text ein.", type: 'warning' });
            return;
        }
        setSaving(true);
        try {
            let uploadedImageUrl = null;
            if (newNoteImage) {
                const ext = getExtension(newNoteImage) || 'jpg';
                const path = generateStoragePath(`client_notes/${profile.id}`, ext);
                uploadedImageUrl = await uploadFile(newNoteImage, path, `image/${ext === 'png' ? 'png' : 'jpeg'}`);
            }

            await NoteRepository.create({
                clientId: profile.id,
                content: newNoteContent.trim(),
                imageUrl: uploadedImageUrl || undefined,
                type: 'manual'
            });

            setNewNoteContent('');
            setNewNoteImage(null);
            setShowNoteModal(false);
            fetchNotes();
            setToast({ visible: true, message: "Erfolg", subMessage: "Notiz wurde erfolgreich gespeichert.", type: 'success' });
        } catch (error) {
            console.error("Error saving note:", error);
            setToast({ visible: true, message: "Fehler", subMessage: "Notiz konnte nicht gespeichert werden.", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <View className="flex-1 bg-[#F9F8F6]">
            {/* Header */}
            <MotiView
                from={{ opacity: 0, translateY: -40 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 50 }}
            >
                <View className="bg-[#137386] pt-16 pb-6 px-6 rounded-b-[40px] shadow-lg z-10 flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2.5 rounded-2xl backdrop-blur-md flex-row items-center">
                        <ArrowLeft size={18} color="white" style={{ marginRight: 6 }} />
                        <Text className="text-white font-bold">{i18n.t('exercise.back')}</Text>
                    </TouchableOpacity>
                    <Text className="text-[22px] font-black text-white flex-1 text-right ml-4 tracking-tight">
                        Session Notes
                    </Text>
                </View>
            </MotiView>

            <View className="flex-1 max-w-4xl mx-auto w-full px-6 pt-8">
                <View className="flex-row justify-between items-center mb-8">
                    <Text className="text-[26px] font-black text-[#243842] tracking-tight">Meine Notizen</Text>
                    <TouchableOpacity
                        onPress={() => setShowNoteModal(true)}
                        className="bg-[#137386] px-5 py-3.5 rounded-2xl flex-row items-center shadow-sm"
                        style={{ shadowColor: '#137386', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
                    >
                        <Plus size={20} color="white" style={{ marginRight: 8 }} />
                        <Text className="text-white font-bold text-[16px]">Neu</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#137386" className="mt-10" />
                ) : notes.length === 0 ? (
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white border-2 border-dashed border-gray-200/80 py-16 px-8 rounded-[32px] items-center mt-4"
                    >
                        <View className="w-24 h-24 bg-[#F9F8F6] rounded-full items-center justify-center mb-6 shadow-sm border border-gray-100">
                            <Edit3 size={40} color="#D1D5DB" />
                        </View>
                        <Text className="text-[#243842] text-[22px] mb-3 text-center font-black tracking-tight">Keine Notizen</Text>
                        <Text className="text-[#243842]/50 text-[16px] text-center max-w-[340px] leading-relaxed font-medium">Erstelle Notizen zu deinen Gedanken, Gefühlen oder Sitzungen.</Text>
                    </MotiView>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        style={{ flex: 1 }}
                    >
                        <View className="gap-6">
                            {notes.map((note, index) => (
                                <MotiView
                                    key={note.id}
                                    from={{ opacity: 0, translateY: 20 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    transition={{ delay: index * 50 }}
                                    className="bg-white p-8 rounded-[32px] border border-blue-100/60 shadow-sm"
                                    style={{ shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 3 }}
                                >
                                    <View className="flex-row items-center mb-5">
                                        <View className="w-12 h-12 bg-blue-50 rounded-[16px] items-center justify-center mr-4 border border-blue-100/50">
                                            <Edit3 size={20} color="#3B82F6" />
                                        </View>
                                        <Text className="text-[15px] text-[#243842]/60 font-bold tracking-widest uppercase">
                                            {new Date(note.createdAt).toLocaleDateString(i18n.locale, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    {note.imageUrl && (
                                        <View style={{ width: '100%', height: 200, borderRadius: 24, overflow: 'hidden', marginBottom: 16 }}>
                                            <Image source={{ uri: note.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                        </View>
                                    )}
                                    <Text className="text-[#243842] text-[17px] leading-relaxed font-medium">{note.content}</Text>
                                </MotiView>
                            ))}
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* Note Creation Modal */}
            <Modal visible={showNoteModal} animationType="slide" transparent={false}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: '#ffffff' }}
                >
                    <View className="flex-1 px-6 pt-16 pb-8">
                        {/* Modal Header */}
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-[28px] font-black text-[#243842] tracking-tight">Neue Notiz</Text>
                            <TouchableOpacity onPress={() => setShowNoteModal(false)} className="bg-gray-100 p-3 rounded-full">
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* Image Preview / Picker */}
                        {newNoteImage ? (
                            <View className="relative w-full h-[200px] mb-6 rounded-3xl overflow-hidden shadow-sm">
                                <Image source={{ uri: newNoteImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                <TouchableOpacity
                                    onPress={() => setNewNoteImage(null)}
                                    className="absolute top-3 right-3 bg-black/50 p-2 rounded-full backdrop-blur-md"
                                >
                                    <X size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={pickImage}
                                className="w-full flex-row items-center justify-center bg-[#F8FAFC] py-4 rounded-2xl border-2 border-dashed border-[#E2E8F0] mb-6"
                            >
                                <Plus size={20} color="#137386" style={{ marginRight: 8 }} />
                                <Text className="font-bold text-[#137386] text-[16px]">Bild hinzufügen</Text>
                            </TouchableOpacity>
                        )}

                        <TextInput
                            style={{
                                flex: 1,
                                fontSize: 18,
                                fontWeight: '500',
                                color: '#0F172A',
                                textAlignVertical: 'top',
                                lineHeight: 28
                            }}
                            placeholder="Schreibe deine Gedanken auf..."
                            placeholderTextColor="#94A3B8"
                            value={newNoteContent}
                            onChangeText={setNewNoteContent}
                            multiline
                            autoFocus
                        />

                        <TouchableOpacity
                            onPress={handleSaveNote}
                            disabled={saving || (!newNoteContent.trim() && !newNoteImage)}
                            className={`py-5 mt-4 rounded-3xl flex-row justify-center items-center ${saving || (!newNoteContent.trim() && !newNoteImage) ? 'bg-gray-200' : 'bg-[#137386]'}`}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                            ) : (
                                <Text className={`font-black text-[18px] ${(!newNoteContent.trim() && !newNoteImage) ? 'text-gray-400' : 'text-white'}`}>Speichern</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <SuccessAnimation
                visible={toast.visible}
                type={toast.type}
                message={toast.message}
                subMessage={toast.subMessage}
                onAnimationDone={() => setToast(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}
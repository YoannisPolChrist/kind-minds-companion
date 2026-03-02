import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import i18n from '../../utils/i18n';
import { MotiView } from 'moti';
import { useAuth } from '../../contexts/AuthContext';
import { Edit3, Plus, ArrowLeft } from 'lucide-react-native';
import { NoteRepository } from '../../utils/repositories/NoteRepository';

export default function ClientNotesScreen() {
    const router = useRouter();
    const { profile } = useAuth();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [saving, setSaving] = useState(false);

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

    const handleSaveNote = async () => {
        if (!newNoteContent.trim() || !profile?.id) return;
        setSaving(true);
        try {
            await NoteRepository.create({
                clientId: profile.id,
                content: newNoteContent.trim(),
                type: 'manual'
            });
            setNewNoteContent('');
            setShowNoteModal(false);
            fetchNotes();
            Alert.alert("Erfolg", "Notiz gespeichert.");
        } catch (error) {
            console.error("Error saving note:", error);
            Alert.alert("Fehler", "Notiz konnte nicht gespeichert werden.");
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
                <View className="bg-[#137386] pt-16 pb-6 px-6 rounded-b-3xl shadow-md z-10 flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2.5 rounded-2xl backdrop-blur-md flex-row items-center">
                        <ArrowLeft size={18} color="white" style={{ marginRight: 6 }} />
                        <Text className="text-white font-bold">{i18n.t('exercise.back')}</Text>
                    </TouchableOpacity>
                    <Text className="text-xl font-extrabold text-white flex-1 text-right ml-4">
                        Session Notes
                    </Text>
                </View>
            </MotiView>

            <View className="flex-1 px-6 pt-6">
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-[24px] font-black text-[#243842] tracking-tight">Meine Notizen</Text>
                    <TouchableOpacity
                        onPress={() => setShowNoteModal(true)}
                        className="bg-[#137386] px-5 py-3 rounded-2xl flex-row items-center shadow-sm"
                    >
                        <Plus size={18} color="white" style={{ marginRight: 8 }} />
                        <Text className="text-white font-bold text-[15px]">Neu</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#137386" className="mt-10" />
                ) : notes.length === 0 ? (
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm items-center mt-4"
                    >
                        <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-6 border border-blue-100">
                            <Edit3 size={32} color="#3B82F6" />
                        </View>
                        <Text className="text-[#2C3E50] font-bold text-lg text-center mb-1">Keine Notizen</Text>
                        <Text className="text-gray-500 text-center leading-5">Erstelle Notizen zu deinen Gedanken, Gefühlen oder Sitzungen.</Text>
                    </MotiView>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >
                        <View className="gap-4">
                            {notes.map((note, index) => (
                                <MotiView
                                    key={note.id}
                                    from={{ opacity: 0, translateY: 20 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    transition={{ delay: index * 50 }}
                                    className="bg-white p-6 rounded-[24px] border border-blue-100/60 shadow-sm"
                                    style={{ shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }}
                                >
                                    <View className="flex-row items-center mb-3">
                                        <View className="w-8 h-8 bg-blue-50 rounded-[12px] items-center justify-center mr-3 border border-blue-100/50">
                                            <Edit3 size={14} color="#3B82F6" />
                                        </View>
                                        <Text className="text-[13px] text-[#243842]/60 font-bold tracking-wide">
                                            {new Date(note.createdAt).toLocaleDateString(i18n.locale, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    <Text className="text-[#243842] text-[16px] leading-relaxed font-medium">{note.content}</Text>
                                </MotiView>
                            ))}
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* Note Creation Modal */}
            <Modal visible={showNoteModal} animationType="fade" transparent={true}>
                <View className="flex-1 bg-black/50 justify-center items-center p-6">
                    <View className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-[#2C3E50]">Neue Notiz</Text>
                            <TouchableOpacity onPress={() => setShowNoteModal(false)} className="bg-gray-100 p-2 rounded-full">
                                <Text className="text-gray-600 font-bold">X</Text>
                            </TouchableOpacity>
                        </View>

                        <Text className="text-sm font-medium text-gray-700 mb-2">Inhalt *</Text>
                        <TextInput style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 24, color: '#1F2937', minHeight: 120, textAlignVertical: 'top' }}
                            placeholder="Schreibe deine Gedanken auf..."
                            value={newNoteContent}
                            onChangeText={setNewNoteContent}
                            multiline
                        />

                        <TouchableOpacity
                            onPress={handleSaveNote}
                            disabled={saving || !newNoteContent.trim()}
                            className={`py-4 rounded-xl items-center flex-row justify-center ${saving || !newNoteContent.trim() ? 'bg-[#137386]/60' : 'bg-[#137386]'}`}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                            ) : (
                                <Text className="text-white font-bold text-lg">Speichern</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

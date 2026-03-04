import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile, generateStoragePath, getExtension } from '../../../../../utils/uploadFile';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { NoteRepository } from '../../../../../utils/repositories/NoteRepository';
import i18n from '../../../../../utils/i18n';
import { MotiView, AnimatePresence } from 'moti';
import { Edit3, Plus, ArrowLeft, X, Calendar, ChevronRight, Search, Trash2, Camera, UserSquare2 } from 'lucide-react-native';
import { SuccessAnimation } from '../../../../../components/ui/SuccessAnimation';
import { useDebounce } from '../../../../../hooks/useDebounce';
import { ErrorHandler } from '../../../../../utils/errors';
import { RichTextToolbar } from '../../../../../components/ui/RichTextToolbar';
import Markdown from 'react-native-markdown-display';
import React from 'react';

const NoteCard = React.memo(({ note, gi, ni, isExpanded, onToggleExpand, onDeletePrompt, formatTime }: any) => {
    const preview = note.content.length > 120 ? note.content.substring(0, 120) + '...' : note.content;
    return (
        <MotiView
            from={{ opacity: 0, translateX: -12 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ delay: (gi * 60) + (ni * 40) }}
            style={{ marginBottom: 16, position: 'relative' }}
        >
            {/* Timeline dot */}
            <View style={{ position: 'absolute', left: -22, top: 20, width: 12, height: 12, borderRadius: 6, backgroundColor: '#137386', borderWidth: 2, borderColor: 'white' }} />

            <TouchableOpacity
                onPress={onToggleExpand}
                activeOpacity={0.85}
                style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: isExpanded ? '#137386' : '#E8E6E1', shadowColor: '#243842', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}
            >
                {/* Top row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF7F8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                        <Edit3 size={13} color="#137386" />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#137386', marginLeft: 5 }}>{formatTime(note)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                            onPress={onDeletePrompt}
                            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FECACA' }}
                        >
                            <Trash2 size={15} color="#EF4444" />
                        </TouchableOpacity>
                        <ChevronRight size={18} color={isExpanded ? '#137386' : '#94A3B8'} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
                    </View>
                </View>

                {note.imageUrl && (
                    <View style={{ width: '100%', height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
                        <Image source={{ uri: note.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    </View>
                )}

                {/* Title and Content */}
                {note.title && (
                    <Text style={{ fontSize: 18, color: '#243842', fontWeight: '800', marginBottom: 6 }}>
                        {note.title}
                    </Text>
                )}
                <Markdown
                    style={{
                        body: { fontSize: 15, color: '#243842', lineHeight: 23, fontWeight: '500' },
                        heading1: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 10, marginBottom: 5 },
                        heading2: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 8, marginBottom: 4 },
                        strong: { fontWeight: '800', color: '#137386' },
                        em: { fontStyle: 'italic' },
                    }}
                >
                    {isExpanded ? note.content : preview + (!isExpanded && note.content?.length > 150 ? "..." : "")}
                </Markdown>
                {note.content.length > 120 && (
                    <Text style={{ fontSize: 13, color: '#137386', fontWeight: '700', marginTop: 8 }}>
                        {isExpanded ? '▲ Weniger anzeigen' : '▼ Mehr anzeigen'}
                    </Text>
                )}
            </TouchableOpacity>
        </MotiView>
    );
});

export default function TherapistClientNotesScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);

    // Modal state
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const [newNoteImage, setNewNoteImage] = useState<{ uri: string, base64?: string | null, file?: any } | null>(null);
    const [saving, setSaving] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Expand / delete
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<any>(null);

    const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });

    const fetchNotes = async () => {
        if (!id) return;
        try {
            const data = await NoteRepository.findByClientId(id as string);
            setNotes(data);
        } catch (error) {
            const { message } = ErrorHandler.handle(error, 'Fetch Notes');
            setToast({ visible: true, message: 'Fehler', subMessage: message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchNotes(); }, [id]);

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
                base64: true, // Fix for web blob hanging
            });
            if (!result.canceled && result.assets?.[0]) {
                setNewNoteImage({
                    uri: result.assets[0].uri,
                    base64: result.assets[0].base64
                });
            }
        } catch (error) {
            const { message } = ErrorHandler.handle(error, 'Pick Note Image');
            setToast({ visible: true, message: 'Fehler', subMessage: 'Bild konnte nicht geladen werden.', type: 'error' });
        }
    };

    const handleSaveNote = async () => {
        if ((!newNoteContent.trim() && !newNoteImage) || !id) {
            setToast({ visible: true, message: 'Fehler', subMessage: 'Bitte gib einen Text ein oder lade ein Bild hoch.', type: 'warning' });
            return;
        }
        setSaving(true);
        try {
            let uploadedImageUrl = null;
            if (newNoteImage) {
                const ext = getExtension(newNoteImage.uri) || 'jpg';
                const path = generateStoragePath(`client_notes/${id}`, ext);

                let rawBase64 = newNoteImage.base64
                    ? (newNoteImage.base64.includes(',') ? newNoteImage.base64.split(',')[1] : newNoteImage.base64)
                    : undefined;

                // Handle web File drop
                if (!rawBase64 && newNoteImage.file && Platform.OS === 'web') {
                    const reader = new FileReader();
                    rawBase64 = await new Promise<string>((resolve, reject) => {
                        reader.onload = () => {
                            const res = reader.result as string;
                            resolve(res.split(',')[1]);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(newNoteImage.file);
                    });
                }

                uploadedImageUrl = await uploadFile(
                    newNoteImage.uri,
                    path,
                    `image/${ext === 'png' ? 'png' : 'jpeg'}`,
                    rawBase64
                );
            }

            await NoteRepository.create({
                clientId: id as string,
                title: newNoteTitle.trim() || undefined,
                content: newNoteContent.trim(),
                imageUrl: uploadedImageUrl || undefined,
                type: 'manual'
            });
            setNewNoteContent('');
            setNewNoteTitle('');
            setNewNoteImage(null);
            setShowNoteModal(false);
            fetchNotes();
            setToast({ visible: true, message: 'Gespeichert', subMessage: 'Notiz wurde erfolgreich gespeichert.', type: 'success' });
        } catch (error) {
            const { message } = ErrorHandler.handle(error, 'Save Note');
            setToast({ visible: true, message: 'Fehler', subMessage: message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteNote = async () => {
        if (!noteToDelete) return;
        try {
            await NoteRepository.delete?.(noteToDelete.id);
            setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
            setToast({ visible: true, message: 'Gelöscht', type: 'success' });
        } catch (error) {
            const { message } = ErrorHandler.handle(error, 'Delete Note');
            setToast({ visible: true, message: 'Fehler', subMessage: message, type: 'error' });
        } finally {
            setDeleteModalVisible(false);
            setNoteToDelete(null);
        }
    };

    const filteredNotes = notes.filter(n =>
        !debouncedSearch.trim() || n.content?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    const formatDate = (note: any) => {
        const ts = note.createdAt?.seconds ? note.createdAt.seconds * 1000 : note.createdAt;
        return new Date(ts || Date.now()).toLocaleDateString(i18n.locale, {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const formatTime = (note: any) => {
        const ts = note.createdAt?.seconds ? note.createdAt.seconds * 1000 : note.createdAt;
        return new Date(ts || Date.now()).toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' });
    };

    const groupByDate = (items: any[]) => {
        const groups: { [key: string]: any[] } = {};
        items.forEach(item => {
            const key = formatDate(item);
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return Object.entries(groups);
    };

    const grouped = groupByDate(filteredNotes);

    return (
        <View style={{ flex: 1, backgroundColor: '#F9F8F6' }}>
            {/* Header */}
            <MotiView from={{ opacity: 0, translateY: -30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 380 }}>
                <View style={{ backgroundColor: '#137386', paddingTop: 64, paddingBottom: 28, paddingHorizontal: 28 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
                            <ArrowLeft size={18} color="white" />
                            <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8, fontSize: 15 }}>Zurück</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowNoteModal(true)}
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 }}
                        >
                            <Plus size={18} color="#137386" />
                            <Text style={{ color: '#137386', fontWeight: '800', marginLeft: 6, fontSize: 15 }}>Neue Notiz</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={{ color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>Session Notes</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                        {notes.length} {notes.length === 1 ? 'Notiz' : 'Notizen'} insgesamt
                    </Text>

                    {/* Search */}
                    {notes.length > 0 && (
                        <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 }}>
                            <Search size={18} color="rgba(255,255,255,0.7)" />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Notizen durchsuchen..."
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                style={{ flex: 1, marginLeft: 10, color: 'white', fontSize: 15, fontWeight: '600' } as any}
                            />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch('')}>
                                    <X size={18} color="rgba(255,255,255,0.7)" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </MotiView>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#137386" />
                </View>
            ) : notes.length === 0 ? (
                /* Empty state */
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 100 }} style={{ alignItems: 'center' }}>
                        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#E8E6E1', borderStyle: 'dashed' }}>
                            <Edit3 size={40} color="#CBD5E1" />
                        </View>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#243842', marginBottom: 10, textAlign: 'center' }}>Noch keine Notizen</Text>
                        <Text style={{ fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22, maxWidth: 280, fontWeight: '500', marginBottom: 32 }}>
                            Halte Beobachtungen, Erkenntnisse und Fortschritte aus euren Sessions fest.
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowNoteModal(true)}
                            style={{ backgroundColor: '#137386', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}
                        >
                            <Plus size={20} color="white" />
                            <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Erste Notiz erstellen</Text>
                        </TouchableOpacity>
                    </MotiView>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 120, maxWidth: 860, alignSelf: 'center', width: '100%' }}>
                    {grouped.length === 0 && (
                        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                            <Text style={{ fontSize: 15, color: '#94A3B8', fontWeight: '600' }}>Keine Notizen gefunden für „{search}"</Text>
                        </View>
                    )}
                    {grouped.map(([dateLabel, items], gi) => (
                        <View key={dateLabel} style={{ marginBottom: 32 }}>
                            {/* Date header */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E8E6E1', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}>
                                    <Calendar size={14} color="#137386" />
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#243842', marginLeft: 6 }}>{dateLabel}</Text>
                                </View>
                                <View style={{ flex: 1, height: 1, backgroundColor: '#E8E6E1', marginLeft: 12 }} />
                            </View>

                            {/* Notes in this group — Timeline layout */}
                            <View style={{ paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: '#E8E6E1' }}>
                                {items.map((note, ni) => (
                                    <NoteCard
                                        key={note.id}
                                        note={note}
                                        gi={gi}
                                        ni={ni}
                                        isExpanded={expandedId === note.id}
                                        onToggleExpand={() => setExpandedId(expandedId === note.id ? null : note.id)}
                                        onDeletePrompt={() => { setNoteToDelete(note); setDeleteModalVisible(true); }}
                                        formatTime={formatTime}
                                    />
                                ))}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Create Note Modal */}
            <Modal visible={showNoteModal} animationType="slide" transparent={false}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: '#ffffff' }}
                >
                    <View className="flex-1 px-6 pt-16 pb-8">
                        {/* Modal Header */}
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-[28px] font-black text-[#243842] tracking-tight">Neue Notiz</Text>
                            <TouchableOpacity onPress={() => { setShowNoteModal(false); setNewNoteContent(''); setNewNoteTitle(''); setNewNoteImage(null); }} className="bg-gray-100 p-3 rounded-full">
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View
                            className="flex-1"
                            {...(Platform.OS === 'web' ? {
                                onDragOver: (e: any) => { e.preventDefault(); setIsDragging(true); },
                                onDragLeave: () => setIsDragging(false),
                                onDrop: (e: any) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    const file = e.dataTransfer?.files?.[0];
                                    if (file && file.type.startsWith('image/')) {
                                        setNewNoteImage({
                                            uri: URL.createObjectURL(file), // create temporary URL for preview
                                            file: file
                                        });
                                    }
                                }
                            } : {})}
                        >
                            {/* Image Preview / Picker */}
                            {newNoteImage ? (
                                <View className="relative w-full h-[200px] mb-6 rounded-3xl overflow-hidden shadow-sm">
                                    <Image source={{ uri: newNoteImage.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
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
                                    className={`w-full flex-row items-center justify-center py-4 rounded-2xl border-2 border-dashed mb-6 transition-colors ${isDragging ? 'bg-[#137386]/10 border-[#137386]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                                        }`}
                                >
                                    <Plus size={20} color="#137386" style={{ marginRight: 8 }} />
                                    <Text className="font-bold text-[#137386] text-[16px]">
                                        {isDragging ? 'Bild hier ablegen' : 'Bild hinzufügen (oder hierher ziehen)'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <TextInput
                                style={{
                                    fontSize: 20,
                                    fontWeight: '800',
                                    color: '#0F172A',
                                    marginBottom: 16,
                                }}
                                placeholder="Titel (optional)"
                                placeholderTextColor="#94A3B8"
                                value={newNoteTitle}
                                onChangeText={setNewNoteTitle}
                            />

                            <RichTextToolbar
                                onInsert={(prefix, suffix) => {
                                    const textBefore = newNoteContent.substring(0, selection.start);
                                    const textSelected = newNoteContent.substring(selection.start, selection.end) || 'Text';
                                    const textAfter = newNoteContent.substring(selection.end);

                                    setNewNoteContent(textBefore + prefix + textSelected + suffix + textAfter);
                                }}
                            />

                            <TextInput
                                style={{
                                    flex: 1,
                                    fontSize: 18,
                                    fontWeight: '500',
                                    color: '#0F172A',
                                    textAlignVertical: 'top',
                                    lineHeight: 28
                                }}
                                placeholder="Schreibe deine Beobachtungen, Erkenntnisse oder Notizen aus der heutigen Session..."
                                placeholderTextColor="#94A3B8"
                                value={newNoteContent}
                                onChangeText={setNewNoteContent}
                                onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                                multiline
                                autoFocus
                            />
                        </View>

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

            {/* Delete note confirmation */}
            <Modal visible={deleteModalVisible} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 }}>
                    <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: 'white', borderRadius: 36, padding: 40, width: '100%', maxWidth: 380 }}>
                        <View style={{ alignItems: 'center', marginBottom: 28 }}>
                            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Trash2 size={32} color="#EF4444" />
                            </View>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#243842', textAlign: 'center', marginBottom: 8 }}>Notiz löschen?</Text>
                            <Text style={{ fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22 }}>Diese Aktion kann nicht rückgängig gemacht werden.</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{ flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: 18, alignItems: 'center' }}>
                                <Text style={{ fontWeight: '700', color: '#243842', fontSize: 16 }}>Abbrechen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDeleteNote} style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 16, borderRadius: 18, alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}>
                                <Text style={{ fontWeight: '800', color: 'white', fontSize: 16 }}>Löschen</Text>
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                </View>
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
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile, generateStoragePath, getExtension } from '../../utils/uploadFile';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { NoteRepository } from '../../utils/repositories/NoteRepository';
import i18n from '../../utils/i18n';
import { MotiView, AnimatePresence } from 'moti';
import { useAuth } from '../../contexts/AuthContext';
import { Edit3, Plus, ArrowLeft, X, Calendar, ChevronRight, Search, Trash2, Camera, UserSquare2 } from 'lucide-react-native';
import { SuccessAnimation } from '../../components/ui/SuccessAnimation';
import { useDebounce } from '../../hooks/useDebounce';
import { ErrorHandler } from '../../utils/errors';
import RenderHtml from 'react-native-render-html';
import React, { useRef } from 'react';

let RichEditor: any = null;
let RichToolbar: any = null;
let actions: any = null;

if (Platform.OS !== 'web') {
    const pell = require('react-native-pell-rich-editor');
    RichEditor = pell.RichEditor;
    RichToolbar = pell.RichToolbar;
    actions = pell.actions;
}

const NoteCard = React.memo(({ note, gi, ni, isExpanded, onToggleExpand, onDeletePrompt, formatTime }: any) => {
    const { width } = useWindowDimensions();
    const isMine = !note.authorRole || note.authorRole === 'client';

    return (
        <MotiView
            from={{ opacity: 0, translateX: -12 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ delay: (gi * 60) + (ni * 40), type: 'spring', damping: 18, stiffness: 120 }}
            style={{ marginBottom: 20, position: 'relative' }}
        >
            {/* Timeline dot */}
            <View style={{ position: 'absolute', left: -23, top: 24, width: 14, height: 14, borderRadius: 7, backgroundColor: '#137386', borderWidth: 3, borderColor: '#F9F8F6' }} />

            <TouchableOpacity
                onPress={onToggleExpand}
                activeOpacity={0.85}
                style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: isExpanded ? '#137386' : '#F1F5F9', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 16, elevation: 3 }}
            >
                {/* Top row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF7F8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                            <Edit3 size={13} color="#137386" />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#137386', marginLeft: 5 }}>{formatTime(note)}</Text>
                        </View>
                        {!isMine && (
                            <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#FEF08A' }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#D97706' }}>Vom Therapeut</Text>
                            </View>
                        )}
                        {isMine && note.isShared && (
                            <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#C7D2FE' }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#4F46E5' }}>Freigegeben</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                        {isMine && (
                            <TouchableOpacity
                                onPress={onDeletePrompt}
                                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FECACA' }}
                            >
                                <Trash2 size={15} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                        <ChevronRight size={18} color={isExpanded ? '#137386' : '#94A3B8'} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
                    </View>
                </View>

                {/* Title and Content */}
                {note.title && (
                    <Text style={{ fontSize: 19, color: '#0F172A', fontWeight: '800', letterSpacing: -0.3, marginBottom: 8 }}>
                        {note.title}
                    </Text>
                )}
                {isExpanded && (
                    <View style={{ marginTop: 4 }}>
                        {note.imageUrl && (
                            <View style={{ width: '100%', height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                                <Image source={{ uri: note.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                            </View>
                        )}
                        <RenderHtml
                            contentWidth={width - 80}
                            source={{ html: note.content || '' }}
                            baseStyle={{ fontSize: 15, color: '#243842', lineHeight: 23, fontWeight: '500' }}
                        />
                    </View>
                )}
            </TouchableOpacity>
        </MotiView>
    );
});

export default function ClientNotesScreen() {
    const router = useRouter();
    const richText = useRef<any>(null);
    const { profile } = useAuth();
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
    const [isShared, setIsShared] = useState(false);
    const [filter, setFilter] = useState<'all' | 'mine' | 'therapist'>('all');

    // Expand / delete
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<any>(null);

    // Toast state
    const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });

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
                quality: 0.8
            });
            if (!result.canceled && result.assets?.[0]) {
                setNewNoteImage({
                    uri: result.assets[0].uri
                });
            }
        } catch (error) {
            const { message } = ErrorHandler.handle(error, 'Pick Note Image');
            setToast({ visible: true, message: 'Fehler', subMessage: 'Bild konnte nicht geladen werden.', type: 'error' });
        }
    };

    const handleSaveNote = async () => {
        if ((!newNoteContent.trim() && !newNoteImage) || !profile?.id) {
            setToast({ visible: true, message: 'Fehler', subMessage: 'Bitte gib einen Text ein oder lade ein Bild hoch.', type: 'warning' });
            return;
        }
        setSaving(true);
        try {
            let uploadedImageUrl = null;
            if (newNoteImage) {
                const ext = getExtension(newNoteImage.uri) || 'jpg';
                const path = generateStoragePath(`client_notes/${profile.id}`, ext);

                uploadedImageUrl = await uploadFile(
                    newNoteImage.uri,
                    path,
                    `image/${ext === 'png' ? 'png' : 'jpeg'}`
                );
            }

            await NoteRepository.create({
                clientId: profile.id,
                title: newNoteTitle.trim() || undefined,
                content: newNoteContent.trim(),
                imageUrl: uploadedImageUrl || undefined,
                type: 'journal',
                authorRole: 'client',
                isShared: isShared
            });
            setNewNoteContent('');
            setNewNoteTitle('');
            setNewNoteImage(null);
            setIsShared(false);
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

    const filteredNotes = notes.filter(n => {
        // Never show session notes to the client
        if (n.type === 'session') return false;
        // Client can see their own journal/manual notes AND shared therapist notes
        const canSee = n.authorRole === 'client' || !n.authorRole || (n.authorRole === 'therapist' && n.isShared);
        if (!canSee) return false;

        const isMine = n.authorRole === 'client' || !n.authorRole;
        if (filter === 'mine' && !isMine) return false;
        if (filter === 'therapist' && isMine) return false;

        return !debouncedSearch.trim() || n.content?.toLowerCase().includes(debouncedSearch.toLowerCase());
    });

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
        <View className="flex-1 bg-[#F9F8F6]">
            {/* Header */}
            <MotiView
                from={{ opacity: 0, translateY: -40 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 50 }}
            >
                <View className="bg-[#137386] pb-6 px-6 pt-16 rounded-b-[40px] shadow-lg z-10 flex-col">
                    <View className="flex-row items-center justify-between mb-2">
                        <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2.5 rounded-2xl backdrop-blur-md flex-row items-center">
                            <ArrowLeft size={18} color="white" style={{ marginRight: 6 }} />
                            <Text className="text-white font-bold">{i18n.t('exercise.back')}</Text>
                        </TouchableOpacity>
                        <Text className="text-[22px] font-black text-white flex-1 text-center mx-4 tracking-tight" numberOfLines={1}>
                            Mein Tagebuch
                        </Text>
                        <TouchableOpacity onPress={() => setShowNoteModal(true)} className="bg-white px-4 py-2.5 rounded-2xl flex-row items-center shadow-sm">
                            <Plus size={18} color="#137386" style={{ marginRight: 4 }} />
                            <Text className="text-[#137386] font-bold">Neue Notiz</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Filter Chips */}
                    {notes.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12, gap: 10 }}>
                            <TouchableOpacity onPress={() => setFilter('all')} style={{ backgroundColor: filter === 'all' ? 'white' : 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}>
                                <Text style={{ color: filter === 'all' ? '#137386' : 'white', fontWeight: '700', fontSize: 13 }}>Alle Notizen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setFilter('mine')} style={{ backgroundColor: filter === 'mine' ? 'white' : 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}>
                                <Text style={{ color: filter === 'mine' ? '#137386' : 'white', fontWeight: '700', fontSize: 13 }}>Meine Privaten</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setFilter('therapist')} style={{ backgroundColor: filter === 'therapist' ? 'white' : 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}>
                                <Text style={{ color: filter === 'therapist' ? '#137386' : 'white', fontWeight: '700', fontSize: 13 }}>Vom Therapeut</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}

                    {/* Search */}
                    {notes.length > 0 && (
                        <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 }}>
                            <Search size={18} color="rgba(255,255,255,0.7)" />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Notizen durchsuchen..."
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                style={{ flex: 1, marginLeft: 10, color: 'white', fontSize: 15, fontWeight: '600' } as any}
                            />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 }}>
                    <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 100, type: 'spring' }} style={{ alignItems: 'center' }}>
                        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 28, borderWidth: 2, borderColor: '#F1F5F9', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.03, shadowRadius: 24, elevation: 2 }}>
                            <Edit3 size={48} color="#94A3B8" />
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, marginBottom: 12, textAlign: 'center' }}>Noch keine Notizen</Text>
                        <Text style={{ fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24, maxWidth: 300, fontWeight: '500', marginBottom: 36 }}>
                            Halte Beobachtungen, Erkenntnisse und Fortschritte aus deinen Sessions fest.
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowNoteModal(true)}
                            style={{ backgroundColor: '#137386', paddingHorizontal: 32, paddingVertical: 18, borderRadius: 24, flexDirection: 'row', alignItems: 'center', shadowColor: '#137386', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 }}
                        >
                            <Plus size={20} color="white" />
                            <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Erste Notiz erstellen</Text>
                        </TouchableOpacity>
                    </MotiView>
                </View>
            ) : (
                <View style={{ flex: 1 }}>


                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 120, maxWidth: 860, alignSelf: 'center', width: '100%' }}>
                        {grouped.length === 0 && (
                            <View style={{ alignItems: 'center', paddingVertical: 80 }}>
                                <Search size={40} color="#CBD5E1" style={{ marginBottom: 16 }} />
                                <Text style={{ fontSize: 17, color: '#64748B', fontWeight: '600' }}>Keine Notizen gefunden für „{search}"</Text>
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
                </View>
            )}

            {/* Note Creation Modal */}
            <Modal visible={showNoteModal} animationType="slide" transparent={false}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: '#ffffff' }}
                >
                    <View className="flex-1 px-6 pt-16 pb-10">
                        {/* Modal Header */}
                        <View className="flex-row justify-between items-center mb-8">
                            <Text className="text-[32px] font-black text-[#0F172A] tracking-tight">Neue Notiz</Text>
                            <TouchableOpacity onPress={() => { setShowNoteModal(false); setNewNoteContent(''); setNewNoteTitle(''); setNewNoteImage(null); }} className="bg-[#F1F5F9] p-3 rounded-full" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View
                            className="flex-1 mb-8"
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
                                <View className="relative w-full h-[220px] mb-6 rounded-[24px] overflow-hidden shadow-sm">
                                    <Image source={{ uri: newNoteImage.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                    <TouchableOpacity
                                        onPress={() => setNewNoteImage(null)}
                                        className="absolute top-4 right-4 bg-black/50 p-2.5 rounded-full backdrop-blur-md"
                                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                    >
                                        <X size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={pickImage}
                                    className={`w-full flex-row items-center justify-center py-5 rounded-[24px] border-2 border-dashed mb-6 transition-colors ${isDragging ? 'bg-[#137386]/10 border-[#137386]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                                        }`}
                                >
                                    <Camera size={22} color="#137386" style={{ marginRight: 10 }} />
                                    <Text className="font-bold text-[#137386] text-[16px]">
                                        {isDragging ? 'Bild hier ablegen' : 'Bild hinzufügen (oder hierher ziehen)'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Editor Container */}
                            <View className="flex-1 bg-[#F8FAFC] rounded-[24px] border border-[#E2E8F0] p-6 shadow-sm">
                                <TextInput
                                    style={{
                                        fontSize: 22,
                                        fontWeight: '900',
                                        color: '#0F172A',
                                        marginBottom: 16,
                                        letterSpacing: -0.5
                                    }}
                                    placeholder="Titel (optional)"
                                    placeholderTextColor="#94A3B8"
                                    value={newNoteTitle}
                                    onChangeText={setNewNoteTitle}
                                />

                                {Platform.OS === 'web' ? (
                                    <TextInput
                                        multiline
                                        value={newNoteContent}
                                        onChangeText={setNewNoteContent}
                                        placeholder="Schreibe deine Gedanken, Reflexionen oder Notizen auf..."
                                        placeholderTextColor="#94A3B8"
                                        style={{ flex: 1, minHeight: 200, fontSize: 16, color: '#334155', textAlignVertical: 'top' } as any}
                                    />
                                ) : (
                                    <>
                                        <RichToolbar
                                            editor={richText}
                                            actions={actions ? [
                                                actions.setBold,
                                                actions.setItalic,
                                                actions.insertBulletsList,
                                                actions.insertOrderedList,
                                                actions.setStrikethrough,
                                                actions.heading1,
                                            ] : []}
                                            style={{ backgroundColor: 'transparent', marginBottom: 10 }}
                                        />

                                        <ScrollView style={{ flex: 1 }}>
                                            <RichEditor
                                                ref={richText}
                                                initialContentHTML={newNoteContent}
                                                onChange={setNewNoteContent}
                                                placeholder="Schreibe deine Gedanken, Reflexionen oder Notizen auf..."
                                                editorStyle={{
                                                    backgroundColor: 'transparent',
                                                    color: '#334155',
                                                    placeholderColor: '#94A3B8'
                                                }}
                                                style={{ flex: 1, minHeight: 200 }}
                                            />
                                        </ScrollView>
                                    </>
                                )}
                            </View>

                            <View className="flex-row items-center justify-between bg-[#F8FAFC] p-4 rounded-[20px] mb-2 border border-[#E2E8F0]">
                                <View className="flex-row items-center flex-1">
                                    <View className="w-10 h-10 bg-[#EEF2FF] rounded-[12px] items-center justify-center mr-3">
                                        <UserSquare2 size={20} color="#4F46E5" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-bold text-[#0F172A] text-[16px]">Mit Therapeut teilen</Text>
                                        <Text className="text-[#64748B] text-[13px] font-medium mt-0.5 max-w-[200px]">Dein Therapeut kann diese Notiz sehen.</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setIsShared(!isShared)}
                                    className={`w-14 h-8 rounded-full justify-center px-1 transition-colors duration-200 ${isShared ? 'bg-[#4F46E5]' : 'bg-[#CBD5E1]'}`}
                                >
                                    <MotiView
                                        animate={{ translateX: isShared ? 24 : 0 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        className="w-6 h-6 bg-white rounded-full shadow-sm"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleSaveNote}
                            disabled={saving || (!newNoteContent.trim() && !newNoteImage)}
                            className={`py-5 rounded-[24px] flex-row justify-center items-center shadow-sm ${saving || (!newNoteContent.trim() && !newNoteImage) ? 'bg-[#F1F5F9]' : 'bg-[#137386]'}`}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                            ) : (
                                <Text className={`font-black text-[18px] ${(!newNoteContent.trim() && !newNoteImage) ? 'text-[#94A3B8]' : 'text-white'}`}>Notiz Speichern</Text>
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
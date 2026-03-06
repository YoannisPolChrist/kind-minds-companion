import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile, generateStoragePath, getExtension } from '../../utils/uploadFile';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { NoteRepository } from '../../utils/repositories/NoteRepository';
import i18n from '../../utils/i18n';
import { MotiView, AnimatePresence } from 'moti';
import { useAuth } from '../../contexts/AuthContext';
import { Edit3, Plus, ArrowLeft, X, Calendar, ChevronRight, Search, Trash2, Camera, UserSquare2, Lock } from 'lucide-react-native';
import { DarkAmbientOrbs } from '../../components/ui/AmbientOrbs';
import { SuccessAnimation } from '../../components/ui/SuccessAnimation';
import { useDebounce } from '../../hooks/useDebounce';
import RenderHtml from 'react-native-render-html';
import React, { useRef } from 'react';
import { VoiceNoteTaker } from '../../components/therapist/VoiceNoteTaker';
import { useClientNotes } from '../../hooks/firebase/useClientNotes';

let RichEditor: any = null;
let RichToolbar: any = null;
let actions: any = null;

if (Platform.OS !== 'web') {
    const pell = require('react-native-pell-rich-editor');
    RichEditor = pell.RichEditor;
    RichToolbar = pell.RichToolbar;
    actions = pell.actions;
}

const NoteCard = React.memo(({ note, gi, ni, isExpanded, onToggleExpand, onDeletePrompt, onEditPrompt, formatTime }: any) => {
    const { width } = useWindowDimensions();
    const isMine = !note.authorRole || note.authorRole === 'client';

    // Notion/Bear inspired clean style
    return (
        <MotiView
            from={{ opacity: 0, translateY: 10, scale: 0.98 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ delay: (gi * 60) + (ni * 40), type: 'spring', damping: 20, stiffness: 150 }}
            style={{ marginBottom: 20 }}
        >
            <TouchableOpacity
                onPress={onToggleExpand}
                activeOpacity={0.9}
                style={{
                    backgroundColor: 'white',
                    borderRadius: 24,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: isExpanded ? '#137386' : 'rgba(226, 232, 240, 0.6)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.04,
                    shadowRadius: 28,
                    elevation: 3
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                        <Text style={{ fontSize: 22, color: '#0F172A', fontWeight: '900', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 }}>
                            {note.title || (isMine ? 'Tagebucheintrag' : 'Therapeuten-Notiz')}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8' }}>{formatTime(note)}</Text>

                            {!isMine && (
                                <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>Vom Therapeut</Text>
                                </View>
                            )}
                            {isMine && note.isShared && (
                                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#4F46E5' }}>Freigegeben</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <ChevronRight size={20} color={isExpanded ? '#137386' : '#CBD5E1'} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
                </View>

                {isExpanded && (
                    <MotiView
                        from={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{ marginTop: 24 }}
                    >
                        <View style={{ height: 1, backgroundColor: 'rgba(226, 232, 240, 0.8)', marginBottom: 20 }} />

                        {note.imageUrl && (
                            <View style={{ width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' }}>
                                <Image source={{ uri: note.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                            </View>
                        )}
                        <RenderHtml
                            contentWidth={width - 80}
                            source={{ html: note.content || '<p></p>' }}
                            baseStyle={{ fontSize: 16, color: '#334155', lineHeight: 26, fontWeight: '500', fontFamily: 'System' }}
                        />

                        {/* Action buttons at the bottom when expanded */}
                        {isMine && (
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F8FAFC' }}>
                                <TouchableOpacity
                                    onPress={() => onEditPrompt(note)}
                                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
                                >
                                    <Edit3 size={14} color="#64748B" />
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginLeft: 6 }}>Bearbeiten</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={onDeletePrompt}
                                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
                                >
                                    <Trash2 size={14} color="#EF4444" />
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444', marginLeft: 6 }}>Löschen</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </MotiView>
                )}
            </TouchableOpacity>
        </MotiView>
    );
});

export default function ClientNotesScreen() {
    const router = useRouter();
    const richText = useRef<any>(null);
    const { profile } = useAuth();

    const { notes, loading, saving, saveNote, deleteNote, fetchNotes } = useClientNotes();

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);

    // Modal state
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const [newNoteImage, setNewNoteImage] = useState<{ uri: string, base64?: string | null, file?: any } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isShared, setIsShared] = useState(false);
    const [filter, setFilter] = useState<'all' | 'mine' | 'therapist'>('all');

    // Expand / delete
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<any>(null);

    // Toast state
    const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });

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
            console.error('Pick Note Image', error);
            setToast({ visible: true, message: 'Fehler', subMessage: 'Bild konnte nicht geladen werden.', type: 'error' });
        }
    };

    const handleSaveNote = async () => {
        await saveNote(
            editingNoteId,
            newNoteTitle,
            newNoteContent,
            newNoteImage,
            isShared,
            () => {
                setNewNoteContent('');
                setNewNoteTitle('');
                setNewNoteImage(null);
                setIsShared(false);
                setEditingNoteId(null);
                setShowNoteModal(false);
                setToast({ visible: true, message: 'Gespeichert', subMessage: 'Notiz wurde erfolgreich gespeichert.', type: 'success' });
            },
            (errMessage) => {
                setToast({ visible: true, message: 'Fehler', subMessage: errMessage, type: 'error' });
            }
        );
    };

    const handleEditNote = useCallback((note: any) => {
        setEditingNoteId(note.id);
        setNewNoteTitle(note.title || '');
        setNewNoteContent(note.content || '');
        setNewNoteImage(note.imageUrl ? { uri: note.imageUrl } : null);
        setIsShared(note.isShared || false);
        setShowNoteModal(true);

        setTimeout(() => {
            if (richText.current) {
                richText.current.setContentHTML(note.content || '');
            }
        }, 300);
    }, []);

    const handleDeleteNote = useCallback(async () => {
        if (!noteToDelete) return;
        await deleteNote(
            noteToDelete.id,
            () => {
                setToast({ visible: true, message: 'Gelöscht', type: 'success' });
                setDeleteModalVisible(false);
                setNoteToDelete(null);
            },
            (errStr) => {
                setToast({ visible: true, message: 'Fehler', subMessage: errStr, type: 'error' });
                setDeleteModalVisible(false);
                setNoteToDelete(null);
            }
        );
    }, [noteToDelete, deleteNote]);

    const filteredNotes = useMemo(() => notes.filter(n => {
        // Never show session notes to the client
        if (n.type === 'session') return false;
        // Client can see their own journal/manual notes AND shared therapist notes
        const canSee = n.authorRole === 'client' || !n.authorRole || (n.authorRole === 'therapist' && n.isShared);
        if (!canSee) return false;

        const isMine = n.authorRole === 'client' || !n.authorRole;
        if (filter === 'mine' && !isMine) return false;
        if (filter === 'therapist' && isMine) return false;

        return !debouncedSearch.trim() || n.content?.toLowerCase().includes(debouncedSearch.toLowerCase());
    }), [notes, filter, debouncedSearch]);

    const formatDate = useCallback((note: any) => {
        const ts = note.createdAt?.seconds ? note.createdAt.seconds * 1000 : note.createdAt;
        return new Date(ts || Date.now()).toLocaleDateString(i18n.locale, {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    }, []);

    const formatTime = useCallback((note: any) => {
        const ts = note.createdAt?.seconds ? note.createdAt.seconds * 1000 : note.createdAt;
        return new Date(ts || Date.now()).toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' });
    }, []);

    const groupByDate = useCallback((items: any[]) => {
        const groups: { [key: string]: any[] } = {};
        items.forEach(item => {
            const key = formatDate(item);
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return Object.entries(groups);
    }, [formatDate]);

    const grouped = useMemo(() => groupByDate(filteredNotes), [filteredNotes, groupByDate]);

    return (
        <View className="flex-1 bg-[#F9F8F6]">
            {/* Header */}
            <MotiView
                from={{ opacity: 0, translateY: -40 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 50 }}
                style={{ zIndex: 10 }}
            >
                <View className="bg-[#137386] pb-8 px-6 pt-16 rounded-b-[40px] shadow-lg flex-col overflow-hidden relative">
                    <DarkAmbientOrbs />
                    <View className="flex-row items-center justify-between mb-4 z-10">
                        <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2.5 rounded-2xl backdrop-blur-md flex-row items-center">
                            <ArrowLeft size={18} color="white" style={{ marginRight: 6 }} />
                            <Text className="text-white font-bold">{i18n.t('exercise.back')}</Text>
                        </TouchableOpacity>
                        <Text className="text-[22px] font-black text-white flex-1 text-center mx-4 tracking-tight" numberOfLines={1}>
                            Mein Tagebuch
                        </Text>
                        <TouchableOpacity onPress={() => { setEditingNoteId(null); setNewNoteContent(''); setNewNoteTitle(''); setNewNoteImage(null); setShowNoteModal(true); }} className="bg-white px-4 py-2.5 rounded-2xl flex-row items-center shadow-sm">
                            <Plus size={18} color="#137386" style={{ marginRight: 4 }} />
                            <Text className="text-[#137386] font-bold">Neue Notiz</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Filter Chips */}
                    {notes.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12, gap: 10 }} style={{ zIndex: 10 }}>
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
                    ) : null}

                    {/* Search */}
                    {notes.length > 0 ? (
                        <View style={{ marginTop: 6, zIndex: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}) } as any}>
                            <Search size={18} color="rgba(255,255,255,0.7)" />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Notizen durchsuchen..."
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                style={{ flex: 1, marginLeft: 10, color: 'white', fontSize: 15, fontWeight: '600' } as any}
                            />
                            {search.length > 0 ? (
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel="Suche leeren"
                                    onPress={() => setSearch('')}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    <X size={18} color="rgba(255,255,255,0.7)" />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    ) : null}
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
                            onPress={() => { setEditingNoteId(null); setNewNoteContent(''); setNewNoteTitle(''); setNewNoteImage(null); setShowNoteModal(true); }}
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
                        {grouped.map(([dateLabel, items]: any, gi: number) => (
                            <View key={dateLabel as string} style={{ marginBottom: 32 }}>
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
                                    {(items as any[]).map((note: any, ni: number) => (
                                        <NoteCard
                                            key={note.id}
                                            note={note}
                                            gi={gi}
                                            ni={ni}
                                            isExpanded={expandedId === note.id}
                                            onToggleExpand={() => setExpandedId(expandedId === note.id ? null : note.id)}
                                            onDeletePrompt={() => { setNoteToDelete(note); setDeleteModalVisible(true); }}
                                            onEditPrompt={handleEditNote}
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
            <Modal visible={showNoteModal} animationType="slide" presentationStyle="formSheet">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: '#ffffff' }}
                >
                    <View style={{ flex: 1, paddingTop: Platform.OS === 'android' ? 60 : 20, backgroundColor: '#ffffff' }}>

                        {/* Minimalist Bear-Style Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16 }}>
                            <TouchableOpacity onPress={() => { setShowNoteModal(false); setNewNoteContent(''); setNewNoteTitle(''); setNewNoteImage(null); }} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                                <ArrowLeft size={24} color="#94A3B8" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setIsShared(!isShared)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isShared ? '#EEF2FF' : '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                                {isShared ? <UserSquare2 size={14} color="#4F46E5" /> : <Lock size={14} color="#64748B" />}
                                <Text style={{ fontSize: 13, fontWeight: '800', color: isShared ? '#4F46E5' : '#64748B' }}>
                                    {isShared ? 'Geteilt' : 'Privat'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleSaveNote} disabled={saving || (!newNoteContent.trim() && !newNoteImage)}>
                                {saving ? <ActivityIndicator size="small" color="#137386" /> : (
                                    <Text style={{ fontSize: 17, fontWeight: '800', color: (!newNoteContent.trim() && !newNoteImage) ? '#E2E8F0' : '#137386' }}>
                                        Speichern
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Title Input */}
                        <TextInput
                            style={{ fontSize: 32, fontWeight: '900', color: '#0F172A', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, letterSpacing: -0.5 } as any}
                            placeholder="Titel..."
                            placeholderTextColor="#CBD5E1"
                            value={newNoteTitle}
                            onChangeText={setNewNoteTitle}
                        />

                        {/* Content Area */}
                        <View
                            style={{ flex: 1, marginBottom: 0 }}
                            {...(Platform.OS === 'web' ? {
                                onDragOver: (e: any) => { e.preventDefault(); setIsDragging(true); },
                                onDragLeave: () => setIsDragging(false),
                                onDrop: (e: any) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    const file = e.dataTransfer?.files?.[0];
                                    if (file && file.type.startsWith('image/')) {
                                        setNewNoteImage({ uri: URL.createObjectURL(file), file });
                                    }
                                }
                            } : {})}
                        >
                            {/* Image Preview */}
                            {newNoteImage && (
                                <View style={{ marginHorizontal: 24, height: 220, borderRadius: 20, overflow: 'hidden', marginBottom: 16, position: 'relative' }}>
                                    <Image source={{ uri: newNoteImage.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                    <TouchableOpacity onPress={() => setNewNoteImage(null)} style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 50 }}>
                                        <X size={18} color="white" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Main Editor */}
                            <View style={{ flex: 1 }}>
                                {Platform.OS === 'web' ? (
                                    <TextInput
                                        multiline
                                        value={newNoteContent}
                                        onChangeText={setNewNoteContent}
                                        placeholder="Beginne hier zu schreiben..."
                                        placeholderTextColor="#94A3B8"
                                        style={{ flex: 1, paddingHorizontal: 24, fontSize: 18, color: '#334155', textAlignVertical: 'top', lineHeight: 28, outlineStyle: 'none' } as any}
                                    />
                                ) : (
                                    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                                        {RichEditor && (
                                            <RichEditor
                                                ref={richText}
                                                initialContentHTML={newNoteContent}
                                                onChange={setNewNoteContent}
                                                placeholder="Beginne hier zu schreiben..."
                                                editorStyle={{ backgroundColor: 'transparent', color: '#334155', placeholderColor: '#94A3B8', cssText: 'padding: 0 24px; font-size: 18px; line-height: 28px;' }}
                                                style={{ flex: 1, minHeight: 400 }}
                                            />
                                        )}
                                    </ScrollView>
                                )}
                            </View>
                        </View>

                        {/* Bottom Toolbar */}
                        <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 8, flexDirection: 'row', alignItems: 'center' }}>
                            {Platform.OS !== 'web' && RichToolbar && (
                                <View style={{ flex: 1, overflow: 'hidden' }}>
                                    <RichToolbar
                                        editor={richText}
                                        actions={actions ? [
                                            actions.setBold,
                                            actions.setItalic,
                                            actions.insertBulletsList,
                                            actions.insertOrderedList,
                                        ] : []}
                                        iconTint="#64748B"
                                        selectedIconTint="#137386"
                                        style={{ backgroundColor: 'transparent', paddingHorizontal: 0 }}
                                    />
                                </View>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                                <VoiceNoteTaker
                                    type="journal"
                                    onTranscriptionComplete={(text) => {
                                        setNewNoteContent(prev => {
                                            const newText = prev ? prev + '<br><br>' + text : text;
                                            if (richText.current) richText.current.setContentHTML(newText);
                                            return newText;
                                        });
                                    }}
                                />
                                <TouchableOpacity onPress={pickImage} style={{ padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12 }}>
                                    <Camera size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>
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
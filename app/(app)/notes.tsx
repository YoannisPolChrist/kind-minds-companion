import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import i18n from '../../utils/i18n';
import { MotiView } from 'moti';
import { Edit3, Plus, ArrowLeft, X, Calendar, ChevronRight, Search, Trash2, Camera, UserSquare2, Lock, Clock3, FileText, Share2, Sparkles } from 'lucide-react-native';
import { DarkAmbientOrbs } from '../../components/ui/AmbientOrbs';
import { SuccessAnimation } from '../../components/ui/SuccessAnimation';
import { useDebounce } from '../../hooks/useDebounce';
import RenderHtml from 'react-native-render-html';
import React, { useRef } from 'react';
import { useClientNotes } from '../../hooks/firebase/useClientNotes';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ClientMetricCard } from '../../components/dashboard/ClientMetricCard';
import { DashboardSectionHeader } from '../../components/dashboard/DashboardSectionHeader';

let RichEditor: any = null;
let RichToolbar: any = null;
let actions: any = null;

if (Platform.OS !== 'web') {
    const pell = require('react-native-pell-rich-editor');
    RichEditor = pell.RichEditor;
    RichToolbar = pell.RichToolbar;
    actions = pell.actions;
}

const QUICK_PROMPTS = [
    'Was hat mir heute gutgetan?',
    'Welche Gedanken moechte ich festhalten?',
    'Was war heute herausfordernd?',
    'Was nehme ich in die naechste Woche mit?',
];

function getTimestamp(value: any) {
    if (!value) return Date.now();
    if (typeof value === 'string' || value instanceof Date) return new Date(value).getTime();
    if (typeof value?.seconds === 'number') return value.seconds * 1000;
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    return Date.now();
}

function truncate(text: string, maxLength: number) {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}...`;
}

const NoteCard = React.memo(({ note, gi, ni, isExpanded, onToggleExpand, onDeletePrompt, onEditPrompt, formatTime, formatDateTime, stripHtml }: any) => {
    const { width } = useWindowDimensions();
    const isMine = !note.authorRole || note.authorRole === 'client';
    const plainText = stripHtml(note.content || '');
    const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
    const preview = truncate(plainText, 140);
    const detailLabel = note.updatedAt ? `Aktualisiert ${formatDateTime(note.updatedAt)}` : formatDateTime(note.createdAt);

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
                    borderColor: isExpanded ? '#2D666B' : 'rgba(226, 232, 240, 0.6)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.04,
                    shadowRadius: 28,
                    elevation: 3
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ fontSize: 22, color: '#182428', fontWeight: '900', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 }}>
                            {note.title || (isMine ? 'Tagebucheintrag' : 'Therapeuten-Notiz')}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: preview ? 12 : 0 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F1EA', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }}>
                                <Clock3 size={12} color="#6F7472" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#6F7472', marginLeft: 5 }}>{formatTime(note)}</Text>
                            </View>

                            {!isMine && (
                                <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>Vom Therapeut</Text>
                                </View>
                            )}
                            {isMine && note.isShared && (
                                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#4F46E5' }}>Freigegeben</Text>
                                </View>
                            )}
                            {isMine && !note.isShared && (
                                <View style={{ backgroundColor: '#F5F1EA', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#6F7472' }}>Privat</Text>
                                </View>
                            )}
                            {note.imageUrl && (
                                <View style={{ backgroundColor: '#EEF4F3', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#2D666B' }}>Mit Bild</Text>
                                </View>
                            )}
                            {wordCount > 0 && (
                                <View style={{ backgroundColor: '#F5F1EA', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#5E655F' }}>{wordCount} Woerter</Text>
                                </View>
                            )}
                        </View>

                        {!isExpanded && preview ? (
                            <Text style={{ fontSize: 15, color: '#5E655F', lineHeight: 22, fontWeight: '500' }}>
                                {preview}
                            </Text>
                        ) : null}
                    </View>

                    <ChevronRight size={20} color={isExpanded ? '#2D666B' : '#BEC7C0'} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
                </View>

                <Text style={{ fontSize: 12, color: '#8B938E', fontWeight: '700', marginTop: 12 }}>
                    {detailLabel}
                </Text>

                {isExpanded && (
                    <MotiView
                        from={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{ marginTop: 24 }}
                    >
                        <View style={{ height: 1, backgroundColor: 'rgba(226, 232, 240, 0.8)', marginBottom: 20 }} />

                        {note.imageUrl && (
                            <View style={{ width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#F3EEE6' }}>
                                <Image source={{ uri: note.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                            </View>
                        )}
                        <RenderHtml
                            contentWidth={width - 80}
                            source={{ html: note.content || '<p></p>' }}
                            baseStyle={{ fontSize: 16, color: '#3A4340', lineHeight: 26, fontWeight: '500', fontFamily: 'System' }}
                        />

                        {/* Action buttons at the bottom when expanded */}
                        {isMine && (
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F5F1EA' }}>
                                <TouchableOpacity
                                    onPress={() => onEditPrompt(note)}
                                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F1EA', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
                                >
                                    <Edit3 size={14} color="#6F7472" />
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#6F7472', marginLeft: 6 }}>Bearbeiten</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={onDeletePrompt}
                                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
                                >
                                    <Trash2 size={14} color="#EF4444" />
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444', marginLeft: 6 }}>LÃ¶schen</Text>
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
    const { colors } = useTheme();
    const { width } = useWindowDimensions();

    const { notes, loading, saving, saveNote, deleteNote, stripHtml } = useClientNotes();

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);

    const [showNoteModal, setShowNoteModal] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newNoteImage, setNewNoteImage] = useState<{ uri: string, base64?: string | null, file?: any } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isShared, setIsShared] = useState(false);
    const [filter, setFilter] = useState<'all' | 'mine' | 'therapist'>('all');
    const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<any>(null);

    const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });
    const draftPlainText = useMemo(() => stripHtml(newNoteContent || ''), [newNoteContent, stripHtml]);
    const canSaveDraft = draftPlainText.length > 0 || !!newNoteImage;

    const resetComposer = useCallback(() => {
        setEditingNoteId(null);
        setNewNoteTitle('');
        setNewNoteContent('');
        setNewNoteImage(null);
        setIsShared(false);
        setIsDragging(false);
        if (richText.current?.setContentHTML) {
            richText.current.setContentHTML('');
        }
    }, []);

    const closeNoteModal = useCallback(() => {
        setShowNoteModal(false);
        resetComposer();
    }, [resetComposer]);

    const openCreateModal = useCallback(() => {
        resetComposer();
        setShowNoteModal(true);
    }, [resetComposer]);

    const pickImage = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                setToast({ visible: true, message: 'Berechtigung', subMessage: 'Galerie-Zugriff wird benÃ¶tigt.', type: 'warning' });
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
                closeNoteModal();
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
            if (richText.current?.setContentHTML) {
                richText.current.setContentHTML(note.content || '');
            }
        }, 250);
    }, []);

    const handleDeleteNote = useCallback(async () => {
        if (!noteToDelete) return;
        await deleteNote(
            noteToDelete.id,
            () => {
                setToast({ visible: true, message: 'GelÃ¶scht', type: 'success' });
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

    const appendPrompt = useCallback((prompt: string) => {
        const nextValue = newNoteContent.trim()
            ? `${newNoteContent.trim()}\n\n${prompt}\n`
            : `${prompt}\n`;
        setNewNoteContent(nextValue);
        if (richText.current?.setContentHTML) {
            richText.current.setContentHTML(nextValue);
        }
    }, [newNoteContent]);

    const filteredNotes = useMemo(() => {
        const visibleNotes = notes.filter((note: any) => {
            if (note.type === 'session') return false;

            const canSee = note.authorRole === 'client' || !note.authorRole || (note.authorRole === 'therapist' && note.isShared);
            if (!canSee) return false;

            const isMine = note.authorRole === 'client' || !note.authorRole;
            if (filter === 'mine' && !isMine) return false;
            if (filter === 'therapist' && isMine) return false;

            const haystack = `${note.title || ''} ${stripHtml(note.content || '')}`.toLowerCase();
            return !debouncedSearch.trim() || haystack.includes(debouncedSearch.toLowerCase());
        });

        visibleNotes.sort((left: any, right: any) => {
            const leftTime = getTimestamp(left.updatedAt || left.createdAt);
            const rightTime = getTimestamp(right.updatedAt || right.createdAt);
            return sortOrder === 'latest' ? rightTime - leftTime : leftTime - rightTime;
        });

        return visibleNotes;
    }, [notes, filter, debouncedSearch, stripHtml, sortOrder]);

    const formatDate = useCallback((note: any) => {
        const ts = getTimestamp(note.updatedAt || note.createdAt);
        return new Date(ts).toLocaleDateString(i18n.locale, {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    }, []);

    const formatDateTime = useCallback((value: any) => {
        return new Date(getTimestamp(value)).toLocaleDateString(i18n.locale, {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    }, []);

    const formatTime = useCallback((note: any) => {
        const ts = getTimestamp(note.updatedAt || note.createdAt);
        return new Date(ts).toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' });
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
    const noteStats = useMemo(() => ({
        total: notes.filter(n => n.type !== 'session').length,
        mine: notes.filter(n => (n.authorRole === 'client' || !n.authorRole) && n.type !== 'session').length,
        therapist: notes.filter(n => n.authorRole === 'therapist' && n.isShared && n.type !== 'session').length,
    }), [notes]);
    const lastUpdatedNote = filteredNotes[0];

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <MotiView
                from={{ opacity: 0, translateY: -40 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 50 }}
                style={{ zIndex: 10 }}
            >
                <View className="bg-[#2D666B] pb-8 px-6 pt-16 rounded-b-[40px] shadow-lg flex-col overflow-hidden relative">
                    <DarkAmbientOrbs />
                    <View className="flex-row items-center justify-between mb-4 z-10">
                        <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2.5 rounded-2xl backdrop-blur-md flex-row items-center">
                            <ArrowLeft size={18} color="white" style={{ marginRight: 6 }} />
                            <Text className="text-white font-bold">{i18n.t('exercise.back')}</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1, marginHorizontal: 16 }}>
                            <Text className="text-[22px] font-black text-white text-center tracking-tight" numberOfLines={1}>
                                Mein Tagebuch
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
                                {filteredNotes.length} sichtbar{lastUpdatedNote ? ` â€¢ zuletzt ${formatDateTime(lastUpdatedNote.updatedAt || lastUpdatedNote.createdAt)}` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={openCreateModal} className="bg-white px-4 py-2.5 rounded-2xl flex-row items-center shadow-sm">
                            <Plus size={18} color="#2D666B" style={{ marginRight: 4 }} />
                            <Text className="text-[#2D666B] font-bold">Neue Notiz</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Filter Chips */}
                    {notes.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12, gap: 10 }} style={{ zIndex: 10 }}>
                            <TouchableOpacity onPress={() => setFilter('all')} style={{ backgroundColor: filter === 'all' ? 'white' : 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}>
                                <Text style={{ color: filter === 'all' ? '#2D666B' : 'white', fontWeight: '700', fontSize: 13 }}>Alle Notizen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setFilter('mine')} style={{ backgroundColor: filter === 'mine' ? 'white' : 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}>
                                <Text style={{ color: filter === 'mine' ? '#2D666B' : 'white', fontWeight: '700', fontSize: 13 }}>Meine Privaten</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setFilter('therapist')} style={{ backgroundColor: filter === 'therapist' ? 'white' : 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}>
                                <Text style={{ color: filter === 'therapist' ? '#2D666B' : 'white', fontWeight: '700', fontSize: 13 }}>Vom Therapeut</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    ) : null}

                    {notes.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8, gap: 8 }} style={{ zIndex: 10 }}>
                            <TouchableOpacity onPress={() => setSortOrder('latest')} style={{ backgroundColor: sortOrder === 'latest' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: sortOrder === 'latest' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }}>
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Neueste zuerst</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setSortOrder('oldest')} style={{ backgroundColor: sortOrder === 'oldest' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: sortOrder === 'oldest' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }}>
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Aelteste zuerst</Text>
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
                                placeholder="Titel oder Inhalt durchsuchen..."
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

            {!loading ? (
                <View style={{ paddingHorizontal: 24, paddingTop: 20, width: '100%', maxWidth: 960, alignSelf: 'center' }}>
                    <View style={{ flexDirection: width > 768 ? 'row' : 'column', gap: 12, marginBottom: 20 }}>
                        <ClientMetricCard
                            icon={Edit3}
                            label="Notizen gesamt"
                            value={String(noteStats.total)}
                            hint="Alle sichtbaren Eintraege in deinem Journal."
                            tone="primary"
                        />
                        <ClientMetricCard
                            icon={Lock}
                            label="Private Eintraege"
                            value={String(noteStats.mine)}
                            hint="Notizen nur fuer dich und deine persoenliche Reflexion."
                            tone="secondary"
                        />
                        <ClientMetricCard
                            icon={UserSquare2}
                            label="Vom Therapeut"
                            value={String(noteStats.therapist)}
                            hint="Freigegebene Notizen aus der therapeutischen Arbeit."
                            tone="success"
                        />
                    </View>
                </View>
            ) : null}

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#2D666B" />
                </View>
            ) : notes.length === 0 ? (
                /* Empty state */
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 }}>
                    <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 100, type: 'spring' }} style={{ alignItems: 'center' }}>
                        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 28, borderWidth: 2, borderColor: '#F3EEE6', shadowColor: '#182428', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.03, shadowRadius: 24, elevation: 2 }}>
                            <FileText size={48} color="#8B938E" />
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#182428', letterSpacing: -0.5, marginBottom: 12, textAlign: 'center' }}>Noch keine Notizen</Text>
                        <Text style={{ fontSize: 16, color: '#6F7472', textAlign: 'center', lineHeight: 24, maxWidth: 300, fontWeight: '500', marginBottom: 36 }}>
                            Halte Beobachtungen, Erkenntnisse und Fortschritte aus deinen Sessions fest. Du kannst Text, Bild und Sprache kombinieren.
                        </Text>
                        <TouchableOpacity
                            onPress={openCreateModal}
                            style={{ backgroundColor: '#2D666B', paddingHorizontal: 32, paddingVertical: 18, borderRadius: 24, flexDirection: 'row', alignItems: 'center', shadowColor: '#2D666B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 }}
                        >
                            <Plus size={20} color="white" />
                            <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Erste Notiz erstellen</Text>
                        </TouchableOpacity>
                    </MotiView>
                </View>
            ) : (
                <View style={{ flex: 1 }}>


                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 120, maxWidth: 860, alignSelf: 'center', width: '100%' }}>
                        <DashboardSectionHeader
                            title="Journal"
                            subtitle="Suche, filtere und oeffne deine Eintraege nach Datum."
                        />
                        {grouped.length === 0 && (
                            <View style={{ alignItems: 'center', paddingVertical: 80 }}>
                                <Search size={40} color="#BEC7C0" style={{ marginBottom: 16 }} />
                                <Text style={{ fontSize: 17, color: '#6F7472', fontWeight: '600' }}>Keine Notizen gefunden fÃ¼r â€ž{search}"</Text>
                            </View>
                        )}
                        {grouped.map(([dateLabel, items]: any, gi: number) => (
                            <View key={dateLabel as string} style={{ marginBottom: 32 }}>
                                {/* Date header */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E7E0D4', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}>
                                        <Calendar size={14} color="#2D666B" />
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#1F2528', marginLeft: 6 }}>{dateLabel}</Text>
                                    </View>
                                    <View style={{ flex: 1, height: 1, backgroundColor: '#E7E0D4', marginLeft: 12 }} />
                                </View>

                                {/* Notes in this group â€” Timeline layout */}
                                <View style={{ paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: '#E7E0D4' }}>
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
                                            formatDateTime={formatDateTime}
                                            stripHtml={stripHtml}
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
                            <TouchableOpacity onPress={closeNoteModal} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                                <ArrowLeft size={24} color="#8B938E" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setIsShared(!isShared)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isShared ? '#EEF2FF' : '#F5F1EA', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                                {isShared ? <Share2 size={14} color="#4F46E5" /> : <Lock size={14} color="#6F7472" />}
                                <Text style={{ fontSize: 13, fontWeight: '800', color: isShared ? '#4F46E5' : '#6F7472' }}>
                                    {isShared ? 'Freigegeben' : 'Privat'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleSaveNote} disabled={saving || !canSaveDraft}>
                                {saving ? <ActivityIndicator size="small" color="#2D666B" /> : (
                                    <Text style={{ fontSize: 17, fontWeight: '800', color: !canSaveDraft ? '#E7E0D4' : '#2D666B' }}>
                                        Speichern
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={{ paddingHorizontal: 24, marginBottom: 10 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#8B938E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                {editingNoteId ? 'Notiz bearbeiten' : 'Neue Notiz'}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                <View style={{ backgroundColor: '#F5F1EA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#6F7472' }}>{draftPlainText.length} Zeichen</Text>
                                </View>
                                <View style={{ backgroundColor: isShared ? '#EEF2FF' : '#F5F1EA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: isShared ? '#4F46E5' : '#6F7472' }}>
                                        {isShared ? 'Sichtbar fuer Therapeut' : 'Nur fuer mich sichtbar'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <TextInput
                            style={{ fontSize: 32, fontWeight: '900', color: '#182428', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, letterSpacing: -0.5 } as any}
                            placeholder="Titel..."
                            placeholderTextColor="#BEC7C0"
                            value={newNoteTitle}
                            onChangeText={setNewNoteTitle}
                        />

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 24, paddingBottom: 12 }}>
                            {QUICK_PROMPTS.map((prompt) => (
                                <TouchableOpacity
                                    key={prompt}
                                    onPress={() => appendPrompt(prompt)}
                                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F1EA', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#E7E0D4' }}
                                >
                                    <Sparkles size={14} color="#2D666B" />
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2528', marginLeft: 6 }}>{prompt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

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
                                        placeholderTextColor="#8B938E"
                                        style={{ flex: 1, paddingHorizontal: 24, fontSize: 18, color: '#3A4340', textAlignVertical: 'top', lineHeight: 28, outlineStyle: 'none' } as any}
                                    />
                                ) : (
                                    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                                        {RichEditor && (
                                            <RichEditor
                                                ref={richText}
                                                initialContentHTML={newNoteContent}
                                                onChange={setNewNoteContent}
                                                placeholder="Beginne hier zu schreiben..."
                                                editorStyle={{ backgroundColor: 'transparent', color: '#3A4340', placeholderColor: '#8B938E', cssText: 'padding: 0 24px; font-size: 18px; line-height: 28px;' }}
                                                style={{ flex: 1, minHeight: 400 }}
                                            />
                                        )}
                                    </ScrollView>
                                )}
                            </View>
                        </View>

                        {/* Bottom Toolbar */}
                        <View style={{ borderTopWidth: 1, borderTopColor: '#F5F1EA', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 8, flexDirection: 'row', alignItems: 'center' }}>
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
                                        iconTint="#6F7472"
                                        selectedIconTint="#2D666B"
                                        style={{ backgroundColor: 'transparent', paddingHorizontal: 0 }}
                                    />
                                </View>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                                <TouchableOpacity onPress={pickImage} style={{ padding: 10, backgroundColor: '#F5F1EA', borderRadius: 12 }}>
                                    <Camera size={20} color="#6F7472" />
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
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#1F2528', textAlign: 'center', marginBottom: 8 }}>Notiz lÃ¶schen?</Text>
                            <Text style={{ fontSize: 15, color: '#8B938E', textAlign: 'center', lineHeight: 22 }}>Diese Aktion kann nicht rÃ¼ckgÃ¤ngig gemacht werden.</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{ flex: 1, backgroundColor: '#F3EEE6', paddingVertical: 16, borderRadius: 18, alignItems: 'center' }}>
                                <Text style={{ fontWeight: '700', color: '#1F2528', fontSize: 16 }}>Abbrechen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDeleteNote} style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 16, borderRadius: 18, alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}>
                                <Text style={{ fontWeight: '800', color: 'white', fontSize: 16 }}>LÃ¶schen</Text>
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



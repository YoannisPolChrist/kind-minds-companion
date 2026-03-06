import { View, Text, TouchableOpacity, SectionList, ScrollView, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { uploadFile, generateStoragePath, getExtension } from '../../../../../utils/uploadFile';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '../../../../../hooks/useSafeBack';
import { useState, useEffect } from 'react';
import { NoteRepository } from '../../../../../utils/repositories/NoteRepository';
import i18n from '../../../../../utils/i18n';
import { MotiView } from 'moti';
import { Edit3, Plus, ArrowLeft, X, Calendar, ChevronRight, Search, Trash2, Camera, Lock, BookOpen } from 'lucide-react-native';
import { SuccessAnimation } from '../../../../../components/ui/SuccessAnimation';
import { useDebounce } from '../../../../../hooks/useDebounce';
import { ErrorHandler } from '../../../../../utils/errors';
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

/** Returns true for notes the therapist created as session notes */
const isSessionNote = (note: any) =>
    note.type === 'session' || (note.authorRole === 'therapist' && note.type !== 'journal');

/** Returns true for client journal entries */
const isJournalEntry = (note: any) =>
    note.type === 'journal' || note.authorRole === 'client';

// ─── Note Card ────────────────────────────────────────────────────────────────

const NoteCard = React.memo(({ note, isExpanded, onToggleExpand, onDeletePrompt, formatTime }: any) => {
    const { width } = useWindowDimensions();
    const session = isSessionNote(note);

    const accentColor = session ? '#137386' : '#16A34A';
    const bgColor = session ? '#EEF7F8' : '#F0FDF4';

    return (
        <MotiView
            from={{ opacity: 0, translateY: 10, scale: 0.98 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
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
                    borderColor: isExpanded ? accentColor : 'rgba(226, 232, 240, 0.6)',
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
                            {note.title || (session ? 'Session Note' : 'Tagebucheintrag')}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8' }}>{formatTime(note)}</Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bgColor, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                {session
                                    ? <Lock size={10} color={accentColor} strokeWidth={3} />
                                    : <BookOpen size={10} color={accentColor} strokeWidth={3} />
                                }
                                <Text style={{ fontSize: 11, fontWeight: '800', color: accentColor, marginLeft: 4, letterSpacing: 0.3 }}>
                                    {session ? 'Session Note' : 'Tagebucheintrag'}
                                </Text>
                            </View>

                            {!session && note.isShared && (
                                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#4F46E5' }}>Geteilt</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <ChevronRight size={20} color={isExpanded ? accentColor : '#CBD5E1'} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
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

                        {/* Actions */}
                        {session && (
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F8FAFC' }}>
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TherapistClientNotesScreen() {
    const router = useRouter();
    const goBack = useSafeBack();
    const richText = useRef<any>(null);
    const { id } = useLocalSearchParams();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);

    // Modal state
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newNoteImage, setNewNoteImage] = useState<{ uri: string; base64?: string | null; file?: any } | null>(null);
    const [saving, setSaving] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Filter: 'all' | 'session' | 'journal'
    const [filter, setFilter] = useState<'all' | 'session' | 'journal'>('all');

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
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
            if (!result.canceled && result.assets?.[0]) {
                setNewNoteImage({ uri: result.assets[0].uri });
            }
        } catch (error) {
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
                const mimeType = newNoteImage.file?.type || 'image/jpeg';
                const dynamicExt = newNoteImage.file?.name?.split('.').pop() || getExtension(newNoteImage.uri) || (mimeType === 'image/png' ? 'png' : 'jpg');
                const path = generateStoragePath(`client_notes/${id}`, dynamicExt);
                uploadedImageUrl = await uploadFile(newNoteImage.uri, path, mimeType);
            }

            await NoteRepository.create({
                clientId: id as string,
                title: newNoteTitle.trim() || undefined,
                content: newNoteContent.trim(),
                imageUrl: uploadedImageUrl || undefined,
                type: 'session',          // Therapeuten schreiben immer Session Notes
                authorRole: 'therapist',
                isShared: false,           // Session Notes sind niemals geteilt
            });

            setNewNoteContent('');
            setNewNoteTitle('');
            setNewNoteImage(null);
            setShowNoteModal(false);
            fetchNotes();
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setToast({ visible: true, message: 'Gespeichert', subMessage: 'Session Note wurde gespeichert.', type: 'success' });
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
        if (filter === 'session' && !isSessionNote(n)) return false;
        if (filter === 'journal' && !isJournalEntry(n)) return false;
        return !debouncedSearch.trim() || n.content?.toLowerCase().includes(debouncedSearch.toLowerCase()) || n.title?.toLowerCase().includes(debouncedSearch.toLowerCase());
    });

    const formatDate = (note: any) => {
        const ts = note.createdAt?.seconds ? note.createdAt.seconds * 1000 : note.createdAt;
        return new Date(ts || Date.now()).toLocaleDateString(i18n.locale, { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const formatTime = (note: any) => {
        const ts = note.createdAt?.seconds ? note.createdAt.seconds * 1000 : note.createdAt;
        return new Date(ts || Date.now()).toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' });
    };

    const grouped = Object.entries(
        filteredNotes.reduce((acc: any, note) => {
            const key = formatDate(note);
            if (!acc[key]) acc[key] = [];
            acc[key].push(note);
            return acc;
        }, {})
    ) as [string, any[]][];

    const sections = grouped.map(([title, data]) => ({ title, data }));

    const sessionCount = notes.filter(isSessionNote).length;
    const journalCount = notes.filter(isJournalEntry).length;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <View style={{ flex: 1, backgroundColor: '#F9F8F6' }}>
            {/* Header */}
            <MotiView from={{ opacity: 0, translateY: -30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 380 }}>
                <View style={{ backgroundColor: '#137386', paddingTop: 64, paddingBottom: 28, paddingHorizontal: 28 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <TouchableOpacity onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
                            <ArrowLeft size={18} color="white" />
                            <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8, fontSize: 15 }}>Zurück</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowNoteModal(true)}
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 }}
                        >
                            <Plus size={18} color="#137386" />
                            <Text style={{ color: '#137386', fontWeight: '800', marginLeft: 6, fontSize: 15 }}>Session Note</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={{ color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 }}>Notizen & Tagebuch</Text>

                    {/* Stats row */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                            <Lock size={12} color="rgba(255,255,255,0.9)" />
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginLeft: 5 }}>{sessionCount} Session Notes</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                            <BookOpen size={12} color="rgba(255,255,255,0.9)" />
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginLeft: 5 }}>{journalCount} Tagebucheinträge</Text>
                        </View>
                    </View>

                    {/* Filter Chips */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                        {([
                            { key: 'all', label: 'Alle' },
                            { key: 'session', label: 'Session Notes' },
                            { key: 'journal', label: 'Tagebuch' },
                        ] as const).map(({ key, label }) => (
                            <TouchableOpacity
                                key={key}
                                onPress={() => setFilter(key)}
                                style={{ backgroundColor: filter === key ? 'white' : 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 }}
                            >
                                <Text style={{ color: filter === key ? '#137386' : 'white', fontWeight: '700', fontSize: 13 }}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Search */}
                    {notes.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 }}>
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
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 100, type: 'spring' }} style={{ alignItems: 'center' }}>
                        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#F1F5F9' }}>
                            <Edit3 size={40} color="#94A3B8" />
                        </View>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, marginBottom: 10, textAlign: 'center' }}>Keine Notizen</Text>
                        <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, maxWidth: 300, fontWeight: '500', marginBottom: 32 }}>
                            Halte Beobachtungen und Erkenntnisse aus euren Sessions fest.
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowNoteModal(true)}
                            style={{ backgroundColor: '#137386', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}
                        >
                            <Plus size={18} color="white" />
                            <Text style={{ color: 'white', fontWeight: '800', fontSize: 15, marginLeft: 8 }}>Erste Session Note</Text>
                        </TouchableOpacity>
                    </MotiView>
                </View>
            ) : filteredNotes.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <Search size={40} color="#CBD5E1" />
                    <Text style={{ fontSize: 16, color: '#64748B', fontWeight: '600', marginTop: 16, textAlign: 'center' }}>Keine Notizen für diesen Filter</Text>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 24, paddingBottom: 100, maxWidth: 860, alignSelf: 'center', width: '100%' }}
                    showsVerticalScrollIndicator={false}
                    renderSectionHeader={({ section: { title, data } }) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E8E6E1', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}>
                                <Calendar size={13} color="#137386" />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#243842', marginLeft: 6 }}>{title}</Text>
                                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginLeft: 6 }}>{data.length} Einträge</Text>
                            </View>
                            <View style={{ flex: 1, height: 1, backgroundColor: '#E8E6E1', marginLeft: 12 }} />
                        </View>
                    )}
                    renderItem={({ item }) => (
                        <View style={{ paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: '#E8E6E1' }}>
                            <NoteCard
                                note={item}
                                isExpanded={expandedId === item.id}
                                onToggleExpand={() => {
                                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                                    setExpandedId(prev => prev === item.id ? null : item.id);
                                }}
                                onDeletePrompt={() => {
                                    setNoteToDelete(item);
                                    setDeleteModalVisible(true);
                                }}
                                formatTime={formatTime}
                            />
                        </View>
                    )}
                    renderSectionFooter={() => <View style={{ marginBottom: 24 }} />}
                />
            )}

            {/* ── Create Note Modal (Bear / Notion Redesign) ──────────────── */}
            <Modal visible={showNoteModal} animationType="slide" presentationStyle="formSheet">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: '#ffffff' }}
                >
                    <View style={{ flex: 1, paddingTop: Platform.OS === 'android' ? 60 : 20, backgroundColor: '#ffffff' }}>

                        {/* Minimalist Bear-Style Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16 }}>
                            <TouchableOpacity onPress={() => setShowNoteModal(false)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                                <ArrowLeft size={24} color="#94A3B8" />
                            </TouchableOpacity>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF7F8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                                <Lock size={12} color="#137386" />
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#137386' }}>Therapeut</Text>
                            </View>
                            <TouchableOpacity onPress={handleSaveNote} disabled={saving || (!newNoteContent.trim() && !newNoteImage)}>
                                {saving ? <ActivityIndicator size="small" color="#137386" /> : (
                                    <Text style={{ fontSize: 17, fontWeight: '800', color: (!newNoteContent.trim() && !newNoteImage) ? '#E2E8F0' : '#137386' }}>
                                        Speichern
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Title Input - Huge and Borderless */}
                        <TextInput
                            style={{ fontSize: 32, fontWeight: '900', color: '#0F172A', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, letterSpacing: -0.5 } as any}
                            placeholder="Titel..."
                            placeholderTextColor="#CBD5E1"
                            value={newNoteTitle}
                            onChangeText={setNewNoteTitle}
                        />

                        {/* Image Preview (if added) */}
                        {newNoteImage && (
                            <View style={{ marginHorizontal: 24, height: 220, borderRadius: 20, overflow: 'hidden', marginBottom: 16, position: 'relative' }}>
                                <Image source={{ uri: newNoteImage.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                <TouchableOpacity onPress={() => setNewNoteImage(null)} style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 50 }}>
                                    <X size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}

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
                            <TouchableOpacity onPress={pickImage} style={{ padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12 }}>
                                <Camera size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Delete Confirmation ───────────────────────────────────────── */}
            <Modal visible={deleteModalVisible} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 }}>
                    <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: 'white', borderRadius: 32, padding: 36, width: '100%', maxWidth: 380 }}>
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                                <Trash2 size={28} color="#EF4444" />
                            </View>
                            <Text style={{ fontSize: 20, fontWeight: '900', color: '#243842', textAlign: 'center', marginBottom: 6 }}>Session Note löschen?</Text>
                            <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 }}>Diese Aktion kann nicht rückgängig gemacht werden.</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{ flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 15, borderRadius: 16, alignItems: 'center' }}>
                                <Text style={{ fontWeight: '700', color: '#243842', fontSize: 15 }}>Abbrechen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDeleteNote} style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 15, borderRadius: 16, alignItems: 'center' }}>
                                <Text style={{ fontWeight: '800', color: 'white', fontSize: 15 }}>Löschen</Text>
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
import { View, Text, ScrollView, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { PressableScale } from '../../components/ui/PressableScale';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import i18n from '../../utils/i18n';
import { MotiView } from 'moti';
import {
    Edit3,
    Plus,
    ArrowLeft,
    X,
    Calendar,
    ChevronRight,
    Search,
    Trash2,
    Camera,
    UserSquare2,
    Lock,
    Clock3,
    FileText,
    Share2,
    Sparkles,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Heading1,
    Heading2,
    List,
    ListOrdered,
    ListChecks,
    Quote,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Highlighter,
    MinusSquare,
    Type
} from 'lucide-react-native';
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

if (Platform.OS !== 'web') {
    const pell = require('react-native-pell-rich-editor');
    RichEditor = pell.RichEditor;
}

const getQuickPrompts = () => [
    i18n.t('notes.prompts.energy', { defaultValue: 'Was hat mir heute gutgetan?' }),
    i18n.t('notes.prompts.thoughts', { defaultValue: 'Welche Gedanken moechte ich festhalten?' }),
    i18n.t('notes.prompts.challenges', { defaultValue: 'Was war heute herausfordernd?' }),
    i18n.t('notes.prompts.next_week', { defaultValue: 'Was nehme ich in die naechste Woche mit?' }),
];

const getWordTemplates = () => [
    {
        id: 'session',
        title: i18n.t('notes.templates.session.title', { defaultValue: 'Sitzungsprotokoll' }),
        description: i18n.t('notes.templates.session.description', { defaultValue: 'Agenda, Erkenntnisse, Hausaufgaben' }),
        body: i18n.t(
            'notes.templates.session.body',
            {
                defaultValue: `<h2>Session Agenda</h2><ul><li>Schwerpunkte:</li><li>Koerperliche Wahrnehmungen:</li></ul>
<h2>Erkenntnisse</h2><p></p>
<h2>Hausaufgabe</h2><ol><li>Praxisübung:</li><li>Selbstreflexion:</li></ol>`
            }
        )
    },
    {
        id: 'gratitude',
        title: i18n.t('notes.templates.gratitude.title', { defaultValue: 'Dankbarkeitsjournal' }),
        description: i18n.t('notes.templates.gratitude.description', { defaultValue: '3 Highlights und Emotionen' }),
        body: i18n.t(
            'notes.templates.gratitude.body',
            {
                defaultValue: `<h2>Dankbarkeit des Tages</h2><ol><li></li><li></li><li></li></ol>
<blockquote>Stimmung heute: </blockquote>`
            }
        )
    },
    {
        id: 'progress',
        title: i18n.t('notes.templates.progress.title', { defaultValue: 'Fortschrittsnotiz' }),
        description: i18n.t('notes.templates.progress.description', { defaultValue: 'Ziele, Huerden, naechster Schritt' }),
        body: i18n.t(
            'notes.templates.progress.body',
            {
                defaultValue: `<h2>Was lief gut?</h2><p></p>
<h2>Wo stehe ich an?</h2><p></p>
<h2>Naechster Schritt</h2><p></p>`
            }
        )
    }
];

type FormatCommand =
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strike'
    | 'heading1'
    | 'heading2'
    | 'bullet'
    | 'ordered'
    | 'check'
    | 'quote'
    | 'align-left'
    | 'align-center'
    | 'align-right'
    | 'highlight'
    | 'code'
    | 'divider';

type ToolbarCommand = {
    command: FormatCommand;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    label: string;
};

type ToolbarGroup = {
    label: string;
    commands: ToolbarCommand[];
};

const getWordToolbarGroups = (): ToolbarGroup[] => ([
    {
        label: i18n.t('notes.toolbar.typography', { defaultValue: 'Schrift' }),
        commands: [
            { command: 'bold', icon: Bold, label: i18n.t('notes.toolbar.bold', { defaultValue: 'Fett' }) },
            { command: 'italic', icon: Italic, label: i18n.t('notes.toolbar.italic', { defaultValue: 'Kursiv' }) },
            { command: 'underline', icon: Underline, label: i18n.t('notes.toolbar.underline', { defaultValue: 'Unterstrichen' }) },
            { command: 'strike', icon: Strikethrough, label: i18n.t('notes.toolbar.strike', { defaultValue: 'Durchgestrichen' }) }
        ]
    },
    {
        label: i18n.t('notes.toolbar.structure', { defaultValue: 'Struktur' }),
        commands: [
            { command: 'heading1', icon: Heading1, label: i18n.t('notes.toolbar.heading1', { defaultValue: 'Überschrift' }) },
            { command: 'heading2', icon: Heading2, label: i18n.t('notes.toolbar.heading2', { defaultValue: 'Untertitel' }) },
            { command: 'bullet', icon: List, label: i18n.t('notes.toolbar.bullet', { defaultValue: 'Aufzählung' }) },
            { command: 'ordered', icon: ListOrdered, label: i18n.t('notes.toolbar.ordered', { defaultValue: 'Nummeriert' }) },
            { command: 'check', icon: ListChecks, label: i18n.t('notes.toolbar.checklist', { defaultValue: 'Checkliste' }) },
            { command: 'quote', icon: Quote, label: i18n.t('notes.toolbar.quote', { defaultValue: 'Zitat' }) },
            { command: 'divider', icon: MinusSquare, label: i18n.t('notes.toolbar.divider', { defaultValue: 'Trenner' }) }
        ]
    },
    {
        label: i18n.t('notes.toolbar.alignment', { defaultValue: 'Ausrichtung' }),
        commands: [
            { command: 'align-left', icon: AlignLeft, label: i18n.t('notes.toolbar.align_left', { defaultValue: 'Links' }) },
            { command: 'align-center', icon: AlignCenter, label: i18n.t('notes.toolbar.align_center', { defaultValue: 'Zentriert' }) },
            { command: 'align-right', icon: AlignRight, label: i18n.t('notes.toolbar.align_right', { defaultValue: 'Rechts' }) }
        ]
    },
    {
        label: i18n.t('notes.toolbar.highlights', { defaultValue: 'Highlight' }),
        commands: [
            { command: 'highlight', icon: Highlighter, label: i18n.t('notes.toolbar.marker', { defaultValue: 'Marker' }) },
            { command: 'code', icon: Type, label: i18n.t('notes.toolbar.code', { defaultValue: 'Code' }) }
        ]
    }
]);

function stripTags(text: string) {
    return text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractDocumentOutline(content: string) {
    if (!content) return [];
    const outline: { id: string; title: string; level: number }[] = [];
    const regex = /<(h[1-3])[^>]*>(.*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
        const level = Number(match[1].replace('h', '')) || 1;
        const title = stripTags(match[2]);
        outline.push({ id: `${match.index}-${level}`, title: title || `Abschnitt ${outline.length + 1}`, level });
    }
    return outline.slice(0, 12);
}

function calculateDocumentStats(content: string) {
    const plain = stripTags(content);
    const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
    const characters = plain.length;
    const readingMinutes = Math.max(1, Math.ceil(words / 180));
    const paragraphs = (content.match(/<p/gi) || []).length || 1;
    return { words, characters, readingMinutes, paragraphs };
}

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
            <PressableScale
                onPress={onToggleExpand}
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
                            {note.title || (isMine ? i18n.t('notes.tags.diary_entry', { defaultValue: 'Tagebucheintrag' }) : i18n.t('notes.tags.therapist_note', { defaultValue: 'Therapeuten-Notiz' }))}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: preview ? 12 : 0 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F1EA', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }}>
                                <Clock3 size={12} color="#6F7472" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#6F7472', marginLeft: 5 }}>{formatTime(note)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF4F3', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }}>
                                <Type size={12} color="#2D666B" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#2D666B', marginLeft: 5 }}>{wordCount} Wörter</Text>
                            </View>

                            {!isMine && (
                                <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>
                                        {i18n.t('notes.tags.therapist_tag', { defaultValue: 'Vom Therapeut' })}
                                    </Text>
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
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#2D666B' }}>
                                        {i18n.t('notes.tags.with_image', { defaultValue: 'Mit Bild' })}
                                    </Text>
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
                        <View style={{ borderWidth: 1, borderColor: '#EEE6DC', borderRadius: 20, padding: 18, backgroundColor: '#FFFCF7' }}>
                            <RenderHtml
                                contentWidth={width - 80}
                                source={{ html: note.content || '<p></p>' }}
                                baseStyle={{ fontSize: 16, color: '#3A4340', lineHeight: 26, fontWeight: '500', fontFamily: 'System' }}
                            />
                        </View>

                        {/* Action buttons at the bottom when expanded */}
                        {isMine && (
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F5F1EA' }}>
                                <PressableScale
                                    onPress={() => onEditPrompt(note)}
                                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F1EA', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
                                >
                                    <Edit3 size={14} color="#6F7472" />
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#6F7472', marginLeft: 6 }}>Bearbeiten</Text>
                                </PressableScale>
                                <PressableScale
                                    onPress={onDeletePrompt}
                                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
                                >
                                    <Trash2 size={14} color="#EF4444" />
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444', marginLeft: 6 }}>
                                        {i18n.t('notes.actions.delete', { defaultValue: 'Löschen' })}
                                    </Text>
                                </PressableScale>
                            </View>
                        )}
                    </MotiView>
                )}
            </PressableScale>
        </MotiView>
    );
});

export default function ClientNotesScreen() {
    const router = useRouter();
    const richText = useRef<any>(null);
    const webEditorRef = useRef<any>(null);
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
    const [pageMode, setPageMode] = useState<'page' | 'wide'>('page');

    const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });
    const locale = i18n.locale;
    const quickPrompts = useMemo(() => getQuickPrompts(), [locale]);
    const wordTemplates = useMemo(() => getWordTemplates(), [locale]);
    const toolbarGroups = useMemo(() => getWordToolbarGroups(), [locale]);
    const draftPlainText = useMemo(() => stripHtml(newNoteContent || ''), [newNoteContent, stripHtml]);
    const canSaveDraft = draftPlainText.length > 0 || !!newNoteImage;
    const documentOutline = useMemo(() => extractDocumentOutline(newNoteContent || ''), [newNoteContent]);
    const documentStats = useMemo(() => calculateDocumentStats(newNoteContent || ''), [newNoteContent]);

    const syncWebEditorContent = useCallback((html: string) => {
        if (Platform.OS === 'web' && webEditorRef.current) {
            webEditorRef.current.innerHTML = html && html.length ? html : '<p></p>';
        }
    }, []);

    const handleWebEditorInput = useCallback(() => {
        if (Platform.OS !== 'web' || !webEditorRef.current) return;
        setNewNoteContent(webEditorRef.current.innerHTML);
    }, []);

    const focusWebEditor = useCallback(() => {
        if (Platform.OS !== 'web' || !webEditorRef.current) return;
        webEditorRef.current.focus();
    }, []);

    const resetComposer = useCallback(() => {
        setEditingNoteId(null);
        setNewNoteTitle('');
        setNewNoteContent('');
        setNewNoteImage(null);
        setIsShared(false);
        setIsDragging(false);
        syncWebEditorContent('<p></p>');
        if (richText.current?.setContentHTML) {
            richText.current.setContentHTML('');
        }
    }, [syncWebEditorContent]);

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
            setToast({
                visible: true,
                message: i18n.t('notes.toast.permission_title', { defaultValue: 'Berechtigung' }),
                subMessage: i18n.t('notes.toast.permission_body', { defaultValue: 'Galerie-Zugriff wird benötigt.' }),
                type: 'warning'
            });
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
            setToast({
                visible: true,
                message: i18n.t('notes.toast.error_title', { defaultValue: 'Fehler' }),
                subMessage: i18n.t('notes.toast.image_error', { defaultValue: 'Bild konnte nicht geladen werden.' }),
                type: 'error'
            });
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
                setToast({
                    visible: true,
                    message: i18n.t('notes.toast.saved_title', { defaultValue: 'Gespeichert' }),
                    subMessage: i18n.t('notes.toast.saved_body', { defaultValue: 'Notiz wurde erfolgreich gespeichert.' }),
                    type: 'success'
                });
            },
            (errMessage) => {
                setToast({
                    visible: true,
                    message: i18n.t('notes.toast.error_title', { defaultValue: 'Fehler' }),
                    subMessage: errMessage,
                    type: 'error'
                });
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
            if (Platform.OS === 'web') {
                syncWebEditorContent(note.content || '');
            }
        }, 250);
    }, [syncWebEditorContent]);

    const handleDeleteNote = useCallback(async () => {
        if (!noteToDelete) return;
        await deleteNote(
            noteToDelete.id,
            () => {
                setToast({
                    visible: true,
                    message: i18n.t('notes.toast.deleted_title', { defaultValue: 'Gelöscht' }),
                    subMessage: i18n.t('notes.toast.deleted_body', { defaultValue: 'Notiz wurde entfernt.' }),
                    type: 'success'
                });
                setDeleteModalVisible(false);
                setNoteToDelete(null);
            },
            (errStr) => {
                setToast({
                    visible: true,
                    message: i18n.t('notes.toast.error_title', { defaultValue: 'Fehler' }),
                    subMessage: errStr,
                    type: 'error'
                });
                setDeleteModalVisible(false);
                setNoteToDelete(null);
            }
        );
    }, [noteToDelete, deleteNote]);

    const applyTemplate = useCallback((templateBody: string) => {
        setNewNoteContent(prev => {
            const next = prev?.trim()?.length ? `${prev}\n\n${templateBody}` : templateBody;
            if (Platform.OS !== 'web') {
                requestAnimationFrame(() => {
                    if (richText.current?.setContentHTML) {
                        richText.current.setContentHTML(next);
                    }
                });
            } else {
                requestAnimationFrame(() => syncWebEditorContent(next));
            }
            return next;
        });
    }, [syncWebEditorContent]);

    const handleFormatCommand = useCallback((command: FormatCommand) => {
        if (Platform.OS === 'web') {
            if (typeof document === 'undefined') return;
            focusWebEditor();
            const exec = (cmd: string, value?: string) => {
                try {
                    document.execCommand(cmd, false, value);
                } catch {
                    // ignore
                }
            };
            switch (command) {
                case 'bold':
                    exec('bold');
                    break;
                case 'italic':
                    exec('italic');
                    break;
                case 'underline':
                    exec('underline');
                    break;
                case 'strike':
                    exec('strikeThrough');
                    break;
                case 'heading1':
                    exec('formatBlock', 'h1');
                    break;
                case 'heading2':
                    exec('formatBlock', 'h2');
                    break;
                case 'bullet':
                    exec('insertUnorderedList');
                    break;
                case 'ordered':
                    exec('insertOrderedList');
                    break;
                case 'check':
                    exec('insertHTML', '<ul><li>☐ Aufgabe</li></ul>');
                    break;
                case 'quote':
                    exec('formatBlock', 'blockquote');
                    break;
                case 'align-left':
                    exec('justifyLeft');
                    break;
                case 'align-center':
                    exec('justifyCenter');
                    break;
                case 'align-right':
                    exec('justifyRight');
                    break;
                case 'highlight':
                    exec('backColor', '#FEF9C3');
                    break;
                case 'code':
                    exec('formatBlock', 'pre');
                    break;
                case 'divider':
                    exec('insertHTML', '<hr />');
                    break;
                default:
                    break;
            }
            setTimeout(handleWebEditorInput, 10);
            return;
        }

        if (richText.current) {
            const editor = richText.current;
            switch (command) {
                case 'bold':
                    editor.setBold?.();
                    return;
                case 'italic':
                    editor.setItalic?.();
                    return;
                case 'underline':
                    editor.setUnderline?.();
                    return;
                case 'strike':
                    editor.setStrikethrough?.();
                    return;
                case 'heading1':
                    editor.heading1?.();
                    return;
                case 'heading2':
                    editor.heading2?.();
                    return;
                case 'bullet':
                    editor.insertBulletsList?.();
                    return;
                case 'ordered':
                    editor.insertOrderedList?.();
                    return;
                case 'check':
                    editor.insertHTML?.('<ul><li>☐ Aufgabe</li></ul>');
                    return;
                case 'quote':
                    editor.insertHTML?.('<blockquote></blockquote>');
                    return;
                case 'align-left':
                    editor.setAlignLeft?.();
                    return;
                case 'align-center':
                    editor.setAlignCenter?.();
                    return;
                case 'align-right':
                    editor.setAlignRight?.();
                    return;
                case 'highlight':
                    editor.insertHTML?.('<span style="background-color:#FEF9C3"></span>');
                    return;
                case 'code':
                    editor.insertHTML?.('<pre></pre>');
                    return;
                case 'divider':
                    editor.insertHTML?.('<hr />');
                    return;
                default:
                    return;
            }
        }
    }, [focusWebEditor, handleWebEditorInput]);

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
                        <PressableScale onPress={() => router.back()} className="bg-white/20 px-4 py-2.5 rounded-2xl backdrop-blur-md flex-row items-center">
                            <ArrowLeft size={18} color="white" style={{ marginRight: 6 }} />
                            <Text className="text-white font-bold">{i18n.t('exercise.back')}</Text>
                        </PressableScale>
                        <View style={{ flex: 1, marginHorizontal: 16 }}>
                            <Text className="text-[22px] font-black text-white text-center tracking-tight" numberOfLines={1}>
                                {i18n.t('notes.journal_title', { defaultValue: 'Mein Tagebuch' })}
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
                                {filteredNotes.length} sichtbar{lastUpdatedNote ? ` • zuletzt ${formatDateTime(lastUpdatedNote.updatedAt || lastUpdatedNote.createdAt)}` : ''}
                            </Text>
                        </View>
                        <PressableScale onPress={openCreateModal} className="bg-white px-4 py-2.5 rounded-2xl flex-row items-center shadow-sm">
                            <Plus size={18} color="#2D666B" style={{ marginRight: 4 }} />
                            <Text className="text-[#2D666B] font-bold">{i18n.t('notes.actions.new_note', { defaultValue: 'Neue Notiz' })}</Text>
                        </PressableScale>
                    </View>

                    {/* Filter Chips */}
                    {notes.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12, gap: 10 }} style={{ zIndex: 10 }}>
                            <PressableScale onPress={() => setFilter('all')} style={{ backgroundColor: filter === 'all' ? 'white' : 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}>
                                <Text style={{ color: filter === 'all' ? '#2D666B' : 'white', fontWeight: '700', fontSize: 13 }}>
                                    {i18n.t('notes.filters.all', { defaultValue: 'Alle Notizen' })}
                                </Text>
                            </PressableScale>
                            <PressableScale onPress={() => setFilter('mine')} style={{ backgroundColor: filter === 'mine' ? 'white' : 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}>
                                <Text style={{ color: filter === 'mine' ? '#2D666B' : 'white', fontWeight: '700', fontSize: 13 }}>
                                    {i18n.t('notes.filters.mine', { defaultValue: 'Meine Privaten' })}
                                </Text>
                            </PressableScale>
                            <PressableScale onPress={() => setFilter('therapist')} style={{ backgroundColor: filter === 'therapist' ? 'white' : 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}>
                                <Text style={{ color: filter === 'therapist' ? '#2D666B' : 'white', fontWeight: '700', fontSize: 13 }}>
                                    {i18n.t('notes.filters.therapist', { defaultValue: 'Vom Therapeut' })}
                                </Text>
                            </PressableScale>
                        </ScrollView>
                    ) : null}

                    {notes.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8, gap: 8 }} style={{ zIndex: 10 }}>
                            <PressableScale onPress={() => setSortOrder('latest')} style={{ backgroundColor: sortOrder === 'latest' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: sortOrder === 'latest' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }}>
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>
                                    {i18n.t('notes.sort.latest', { defaultValue: 'Neueste zuerst' })}
                                </Text>
                            </PressableScale>
                            <PressableScale onPress={() => setSortOrder('oldest')} style={{ backgroundColor: sortOrder === 'oldest' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: sortOrder === 'oldest' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }}>
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>
                                    {i18n.t('notes.sort.oldest', { defaultValue: 'Aelteste zuerst' })}
                                </Text>
                            </PressableScale>
                        </ScrollView>
                    ) : null}

                    {/* Search */}
                    {notes.length > 0 ? (
                        <View style={{ marginTop: 6, zIndex: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}) } as any}>
                            <Search size={18} color="rgba(255,255,255,0.7)" />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder={i18n.t('notes.search.placeholder', { defaultValue: 'Titel oder Inhalt durchsuchen...' })}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                style={{ flex: 1, marginLeft: 10, color: 'white', fontSize: 15, fontWeight: '600' } as any}
                            />
                            {search.length > 0 ? (
                                <PressableScale
                                    accessibilityRole="button"
                                    accessibilityLabel={i18n.t('notes.search.clear', { defaultValue: 'Suche leeren' })}
                                    onPress={() => setSearch('')}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    <X size={18} color="rgba(255,255,255,0.7)" />
                                </PressableScale>
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
                            label={i18n.t('notes.stats.total_label', { defaultValue: 'Journal entries' })}
                            value={String(noteStats.total)}
                hint={i18n.t('notes.stats.total_hint', { defaultValue: 'Alle sichtbaren Einträge in deinem Journal.' })}
                            tone="primary"
                        />
                        <ClientMetricCard
                            icon={Lock}
                label={i18n.t('notes.stats.private_label', { defaultValue: 'Private Einträge' })}
                            value={String(noteStats.mine)}
                hint={i18n.t('notes.stats.private_hint', { defaultValue: 'Notizen nur für dich und deine persönliche Reflexion.' })}
                            tone="secondary"
                        />
                        <ClientMetricCard
                            icon={UserSquare2}
                            label={i18n.t('notes.stats.shared_label', { defaultValue: 'Vom Therapeut' })}
                            value={String(noteStats.therapist)}
                            hint={i18n.t('notes.stats.shared_hint', { defaultValue: 'Freigegebene Notizen aus der therapeutischen Arbeit.' })}
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
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#182428', letterSpacing: -0.5, marginBottom: 12, textAlign: 'center' }}>
                            {i18n.t('notes.empty.title', { defaultValue: 'Noch keine Notizen' })}
                        </Text>
                        <Text style={{ fontSize: 16, color: '#6F7472', textAlign: 'center', lineHeight: 24, maxWidth: 300, fontWeight: '500', marginBottom: 36 }}>
                            {i18n.t('notes.empty.description', { defaultValue: 'Halte Beobachtungen, Erkenntnisse und Fortschritte aus deinen Sessions fest. Du kannst Text, Bild und Sprache kombinieren.' })}
                        </Text>
                        <PressableScale
                            onPress={openCreateModal}
                            style={{ backgroundColor: '#2D666B', paddingHorizontal: 32, paddingVertical: 18, borderRadius: 24, flexDirection: 'row', alignItems: 'center', shadowColor: '#2D666B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 }}
                        >
                            <Plus size={20} color="white" />
                            <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>
                                {i18n.t('notes.empty.cta', { defaultValue: 'Erste Notiz erstellen' })}
                            </Text>
                        </PressableScale>
                    </MotiView>
                </View>
            ) : (
                <View style={{ flex: 1 }}>


                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 120, maxWidth: 860, alignSelf: 'center', width: '100%' }}>
                        <DashboardSectionHeader
                            title={i18n.t('notes.section.title', { defaultValue: 'Journal' })}
              subtitle={i18n.t('notes.section.subtitle', { defaultValue: 'Suche, filtere und öffne deine Einträge nach Datum.' })}
                        />
                        {grouped.length === 0 && (
                            <View style={{ alignItems: 'center', paddingVertical: 80 }}>
                                <Search size={40} color="#BEC7C0" style={{ marginBottom: 16 }} />
                                <Text style={{ fontSize: 17, color: '#6F7472', fontWeight: '600' }}>
                                    {i18n.t('notes.search.empty', { defaultValue: 'Keine Notizen gefunden für "%{query}"', query: search })}
                                </Text>
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

                                {/* Notes in this group — Timeline layout */}
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
                            <PressableScale onPress={closeNoteModal} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                                <ArrowLeft size={24} color="#5C696F" />
                            </PressableScale>

                            <PressableScale onPress={() => setIsShared(!isShared)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isShared ? '#EEF2FF' : '#F5F1EA', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                                {isShared ? <Share2 size={14} color="#4F46E5" /> : <Lock size={14} color="#56636B" />}
                                <Text style={{ fontSize: 13, fontWeight: '800', color: isShared ? '#4F46E5' : '#56636B' }}>
                                {isShared ? i18n.t('notes.privacy.shared', { defaultValue: 'Freigegeben' }) : i18n.t('notes.privacy.private', { defaultValue: 'Privat' })}
                                </Text>
                            </PressableScale>

                            <PressableScale onPress={handleSaveNote} disabled={saving || !canSaveDraft}>
                                {saving ? <ActivityIndicator size="small" color="#2D666B" /> : (
                                    <Text style={{ fontSize: 17, fontWeight: '800', color: !canSaveDraft ? '#7E8A90' : '#2D666B' }}>
                                        Speichern
                                    </Text>
                                )}
                            </PressableScale>
                        </View>

                        <View style={{ paddingHorizontal: 24, marginBottom: 10 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#66737A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                {editingNoteId
                                    ? i18n.t('notes.actions.edit_note', { defaultValue: 'Notiz bearbeiten' })
                                    : i18n.t('notes.actions.new_note', { defaultValue: 'Neue Notiz' })}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                <View style={{ backgroundColor: '#F5F1EA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#56636B' }}>
                                    {draftPlainText.length} {i18n.t('notes.characters_label', { defaultValue: 'Zeichen' })}
                                </Text>
                                </View>
                                <View style={{ backgroundColor: isShared ? '#EEF2FF' : '#F5F1EA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: isShared ? '#4F46E5' : '#56636B' }}>
                    {isShared ? i18n.t('notes.privacy.shared_hint', { defaultValue: 'Sichtbar für Therapeut' }) : i18n.t('notes.privacy.private_hint', { defaultValue: 'Nur für mich sichtbar' })}
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
                            {quickPrompts.map((prompt) => (
                                <PressableScale
                                    key={prompt}
                                    onPress={() => appendPrompt(prompt)}
                                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F1EA', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#E7E0D4' }}
                                >
                                    <Sparkles size={14} color="#2D666B" />
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2528', marginLeft: 6 }}>{prompt}</Text>
                                </PressableScale>
                            ))}
                        </ScrollView>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 24, paddingBottom: 12 }}>
                            {wordTemplates.map(template => (
                                <PressableScale
                                    key={template.id}
                                    onPress={() => applyTemplate(template.body)}
                                    style={{ width: 220, backgroundColor: '#FFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#ECE4D9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 }}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#1F2528', marginBottom: 6 }}>{template.title}</Text>
                                    <Text style={{ fontSize: 12, color: '#6F7472', lineHeight: 18 }}>{template.description}</Text>
                                    <Text style={{ fontSize: 11, color: '#9AA29D', marginTop: 8 }}>
                                        {i18n.t('notes.editor.tap_to_insert', { defaultValue: 'Tippen zum Einfügen' })}
                                    </Text>
                                </PressableScale>
                            ))}
                        </ScrollView>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 12, gap: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <PressableScale
                                    onPress={() => setPageMode('page')}
                                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: pageMode === 'page' ? '#2D666B' : '#E7E0D4', backgroundColor: pageMode === 'page' ? '#E0F2F1' : '#F5F1EA' }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: pageMode === 'page' ? '#1F4F52' : '#6F7472' }}>Seitenlayout</Text>
                                </PressableScale>
                                <PressableScale
                                    onPress={() => setPageMode('wide')}
                                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: pageMode === 'wide' ? '#2D666B' : '#E7E0D4', backgroundColor: pageMode === 'wide' ? '#E0F2F1' : '#F5F1EA' }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: pageMode === 'wide' ? '#1F4F52' : '#6F7472' }}>Volle Breite</Text>
                                </PressableScale>
                            </View>
                        </ScrollView>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 12, gap: 16 }}>
                            {toolbarGroups.map(group => (
                                <View key={group.label} style={{ backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: '#ECE4D9', paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    {group.commands.map(cmd => (
                                        <PressableScale
                                            key={cmd.command}
                                            onPress={() => handleFormatCommand(cmd.command)}
                                            style={{ padding: 8, borderRadius: 12, backgroundColor: '#F6F2EC' }}
                                        >
                                            <cmd.icon size={16} color="#2D666B" />
                                        </PressableScale>
                                    ))}
                                </View>
                            ))}
                        </ScrollView>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 12, gap: 10 }}>
                            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#ECE4D9' }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#6F7472' }}>Wörter</Text>
                                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1F2528' }}>{documentStats.words}</Text>
                            </View>
                            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#ECE4D9' }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#6F7472' }}>
                                    {i18n.t('notes.characters_label', { defaultValue: 'Zeichen' })}
                                </Text>
                                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1F2528' }}>{documentStats.characters}</Text>
                            </View>
                            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#ECE4D9' }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#6F7472' }}>Lesedauer</Text>
                                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1F2528' }}>{documentStats.readingMinutes} min</Text>
                            </View>
                            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#ECE4D9' }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#6F7472' }}>Abschnitte</Text>
                                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1F2528' }}>{documentOutline.length}</Text>
                            </View>
                        </ScrollView>

                        <View style={{ paddingHorizontal: 24, marginBottom: 8 }}>
                            <View style={{ backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#ECE4D9', padding: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#6F7472', marginBottom: 10 }}>Dokumentenstruktur</Text>
                                {documentOutline.length === 0 ? (
                                    <Text style={{ fontSize: 12, color: '#9AA29D' }}>Füge Überschriften hinzu, um hier eine Gliederung zu sehen.</Text>
                                ) : (
                                    documentOutline.map(item => (
                                        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                            <View style={{ width: item.level * 8 }} />
                                            <Text style={{ fontSize: 13, color: '#1F2528', fontWeight: '600' }}>{item.title}</Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>

                        {/* Content Area */}
                        <View style={{ flex: 1, marginBottom: 0 }}>
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 16 }}>
                                <View
                                    style={{
                                        marginHorizontal: pageMode === 'page' ? 24 : 0,
                                        alignSelf: pageMode === 'page' ? 'center' : 'stretch',
                                        width: pageMode === 'page' ? Math.min(width - 48, 820) : '100%',
                                        backgroundColor: isDragging ? '#F0FFF9' : '#FFFFFF',
                                        borderRadius: 30,
                                        borderWidth: 1,
                                        borderColor: isDragging ? '#2D666B' : '#ECE4D9',
                                        borderStyle: isDragging ? 'dashed' : 'solid',
                                        paddingVertical: 32,
                                        paddingHorizontal: 32,
                                        shadowColor: '#000',
                                        shadowOpacity: 0.05,
                                        shadowRadius: 30,
                                        elevation: 3
                                    }}
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
                                    {newNoteImage && (
                                        <View style={{ height: 220, borderRadius: 20, overflow: 'hidden', marginBottom: 24, position: 'relative' }}>
                                            <Image source={{ uri: newNoteImage.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                            <PressableScale onPress={() => setNewNoteImage(null)} style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 50 }}>
                                                <X size={18} color="white" />
                                            </PressableScale>
                                        </View>
                                    )}
                                    {Platform.OS === 'web' ? (
                                        <>
                                            <View style={{ minHeight: 240, position: 'relative' }}>
                                                {React.createElement('div', {
                                                    ref: (node: any) => {
                                                        if (node) {
                                                            webEditorRef.current = node;
                                                            node.innerHTML = newNoteContent || '<p></p>';
                                                        } else {
                                                            webEditorRef.current = null;
                                                        }
                                                    },
                                                    contentEditable: true,
                                                    suppressContentEditableWarning: true,
                                                    onInput: handleWebEditorInput,
                                                    onBlur: handleWebEditorInput,
                                                    style: {
                                                        minHeight: 240,
                                                        fontSize: 18,
                                                        lineHeight: '28px',
                                                        color: '#1F2528',
                                                        outline: 'none',
                                                        border: '1px solid #ECE4D9',
                                                        borderRadius: 16,
                                                        padding: 16,
                                                        backgroundColor: 'transparent',
                                                        whiteSpace: 'pre-wrap'
                                                    }
                                                })}
                                                {!newNoteContent?.trim() && (
                                                    <Text style={{ position: 'absolute', top: 30, left: 32, color: '#9AA29D' }}>
                                                        Beginne hier zu schreiben...
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={{ marginTop: 16, borderWidth: 1, borderColor: '#ECE4D9', borderRadius: 18, padding: 16, backgroundColor: '#FAF8F5' }}>
                                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#6F7472', marginBottom: 8 }}>Live-Vorschau</Text>
                                                <RenderHtml
                                                    contentWidth={Math.min(width - 64, 720)}
                                                    source={{ html: newNoteContent || '<p></p>' }}
                                                    baseStyle={{ fontSize: 17, lineHeight: 26, color: '#1F2528' }}
                                                />
                                            </View>
                                        </>
                                    ) : (
                                        <View style={{ minHeight: 400 }}>
                                            {RichEditor && (
                                                <RichEditor
                                                    ref={richText}
                                                    initialContentHTML={newNoteContent}
                                                    onChange={setNewNoteContent}
                                                    placeholder="Beginne hier zu schreiben..."
                                                    editorStyle={{ backgroundColor: 'transparent', color: '#3A4340', placeholderColor: '#7E8A90', cssText: 'font-size: 18px; line-height: 28px;' }}
                                                    style={{ flex: 1, minHeight: 400 }}
                                                />
                                            )}
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                        </View>

                        {/* Bottom Toolbar */}
                        <View style={{ borderTopWidth: 1, borderTopColor: '#F5F1EA', backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: Platform.OS === 'ios' ? 16 : 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <PressableScale onPress={pickImage} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5F1EA', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18 }}>
                                <Camera size={18} color="#2D666B" />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#2D666B' }}>
                                    {i18n.t('notes.editor.insert_image', { defaultValue: 'Bild einfügen' })}
                                </Text>
                            </PressableScale>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Text style={{ fontSize: 12, color: '#6F7472', fontWeight: '600' }}>
                                    {draftPlainText.length} {i18n.t('notes.characters_label', { defaultValue: 'Zeichen' })}
                                </Text>
                                <Text style={{ fontSize: 12, color: '#6F7472', fontWeight: '600' }}>
                                    {documentStats.words} {i18n.t('notes.word_count_label', { defaultValue: 'Wörter' })}
                                </Text>
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
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#1F2528', textAlign: 'center', marginBottom: 8 }}>
                                {i18n.t('notes.delete.title', { defaultValue: 'Notiz löschen?' })}
                            </Text>
                            <Text style={{ fontSize: 15, color: '#5C696F', textAlign: 'center', lineHeight: 22 }}>
                                {i18n.t('notes.delete.body', { defaultValue: 'Diese Aktion kann nicht rückgängig gemacht werden.' })}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <PressableScale onPress={() => setDeleteModalVisible(false)} style={{ flex: 1, backgroundColor: '#F3EEE6', paddingVertical: 16, borderRadius: 18, alignItems: 'center' }}>
                                <Text style={{ fontWeight: '700', color: '#1F2528', fontSize: 16 }}>
                                    {i18n.t('notes.delete.cancel', { defaultValue: 'Abbrechen' })}
                                </Text>
                            </PressableScale>
                            <PressableScale onPress={handleDeleteNote} style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 16, borderRadius: 18, alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}>
                                <Text style={{ fontWeight: '800', color: 'white', fontSize: 16 }}>
                                    {i18n.t('notes.delete.confirm', { defaultValue: 'Löschen' })}
                                </Text>
                            </PressableScale>
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



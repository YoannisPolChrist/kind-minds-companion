import { View, Text, ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList, Platform, Linking, KeyboardAvoidingView } from 'react-native';
import { PressableScale } from '../../../components/ui/PressableScale';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useState, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { collection, addDoc, query, getDocs, deleteDoc, doc, serverTimestamp, where, updateDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../utils/firebase';
import i18n from '../../../utils/i18n';
import { MotiView } from 'moti';
import { FileText, Link as LinkIcon, Trash2, PlusCircle, UploadCloud, ArrowLeft, Send, X, FileVideo, Search, Star, Tag, Check, Clock, Plus, Library, Download, Image as ImageIcon } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { SuccessAnimation } from '../../../components/ui/SuccessAnimation';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { LinearGradient } from 'expo-linear-gradient';
import { uploadFile } from '../../../utils/uploadFile';
import * as Haptics from 'expo-haptics';
import { WebView } from 'react-native-webview';

const normalizeResourceUrl = (url?: string) => {
    const trimmed = (url || '').trim();
    if (!trimmed) return '';
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
};

export default function TherapistResources() {
    const router = useRouter();
    const { profile } = useAuth();
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // New Resource State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [resourceType, setResourceType] = useState<'file' | 'link'>('file');
    const [tagsInput, setTagsInput] = useState('');
    const [addModalVisible, setAddModalVisible] = useState(false);

    // Filter & Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'documents' | 'media' | 'links'>('all');

    // Assignment State
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedResourcesForAssign, setSelectedResourcesForAssign] = useState<any[]>([]);

    const [toast, setToast] = useState<{ visible: boolean, message: string, subMessage?: string, type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });
    const [confirmModal, setConfirmModal] = useState<{ visible: boolean, title: string, message: string, confirmText?: string, isDestructive?: boolean, onConfirm: () => void | Promise<void> }>({ visible: false, title: '', message: '', onConfirm: () => { } });

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'error') => {
        setToast({ visible: true, message: title, subMessage: message, type });
    };

    const [selectedClientsForAssign, setSelectedClientsForAssign] = useState<string[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Bulk Selection State
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);

    // History State
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedResourceForHistory, setSelectedResourceForHistory] = useState<any>(null);

    // Preview State
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [selectedResourceForPreview, setSelectedResourceForPreview] = useState<any>(null);
    const previewUrl = normalizeResourceUrl(selectedResourceForPreview?.url);

    useEffect(() => {
        fetchResources();
    }, [profile?.id]);

    useEffect(() => {
        if (profile?.id) {
            fetchClientsForAssignment();
        }
    }, [profile?.id]);

    const fetchClientsForAssignment = async () => {
        if (!profile?.id) return;

        try {
            const q = query(
                collection(db, "users"),
                where("role", "==", "client"),
                where("therapistId", "==", profile.id)
            );
            const querySnapshot = await getDocs(q);
            const rawClients = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((c: any) => !c.isArchived);
            setClients(rawClients);
        } catch (e) {
            console.error("Error fetching clients for modal", e);
        }
    };

    const fetchResources = async () => {
        if (!profile?.id) {
            setResources([]);
            setLoading(false);
            return;
        }

        try {
            const q = query(collection(db, "resources"), where("therapistId", "==", profile.id));
            const querySnapshot = await getDocs(q);
            const data: any[] = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            // sort by createdAt desc safely
            data.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            });
            setResources(data);
        } catch (error) {
            console.error("Error fetching resources:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadFile = async () => {
        if (!title) {
            showAlert("Fehler", "Bitte gib einen Titel an.", "error");
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            setUploading(true);
            const asset = result.assets[0];
            const fileUri = asset.uri;

            // Determine if it's an image, video, or generic doc
            let fileIconType = 'document';
            const mimeType = asset.mimeType || '';
            if (mimeType.startsWith('image/')) fileIconType = 'image';
            else if (mimeType.startsWith('video/')) fileIconType = 'video';
            else if (mimeType === 'application/pdf') fileIconType = 'pdf';

            const filename = `resources/${Date.now()}_${asset.name}`;
            const downloadUrl = await uploadFile(fileUri, filename, mimeType);

            const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);

            // Save to Firestore
            await addDoc(collection(db, "resources"), {
                title,
                description,
                type: fileIconType,
                url: downloadUrl,
                storagePath: filename,
                originalName: asset.name,
                therapistId: profile?.id,
                isPinned: false,
                tags: tagsArray,
                createdAt: serverTimestamp()
            });

            showAlert("Erfolg", "Datei wurde erfolgreich hochgeladen.", "success");
            resetForm();
            setAddModalVisible(false);
            fetchResources();
        } catch (err) {
            console.error(err);
            showAlert("Fehler", "Upload fehlgeschlagen.", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleAddLink = async () => {
        if (!title || !linkUrl) {
            showAlert("Fehler", "Bitte gib Titel und Link an.", "error");
            return;
        }

        setUploading(true);
        try {
            const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
            const normalizedUrl = normalizeResourceUrl(linkUrl);

            await addDoc(collection(db, "resources"), {
                title,
                description,
                type: 'link',
                url: normalizedUrl,
                therapistId: profile?.id,
                isPinned: false,
                tags: tagsArray,
                createdAt: serverTimestamp()
            });

            showAlert("Erfolg", "Link wurde erfolgreich hinzugefügt.", "success");
            resetForm();
            setAddModalVisible(false);
            fetchResources();
        } catch (err) {
            console.error(err);
            showAlert("Fehler", "Speichern fehlgeschlagen.", "error");
        } finally {
            setUploading(false);
        }
    };

    const openAssignModal = (resourcesToAssign: any[]) => {
        setSelectedResourcesForAssign(resourcesToAssign);
        setSelectedClientsForAssign([]);
        setAssignModalVisible(true);
    };

    const toggleClientSelection = (clientId: string) => {
        setSelectedClientsForAssign(prev =>
            prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
        );
    };

    const confirmBulkAssign = async () => {
        if (selectedResourcesForAssign.length === 0 || selectedClientsForAssign.length === 0) return;

        try {
            const promises = [];

            for (const client of selectedClientsForAssign) {
                for (const resource of selectedResourcesForAssign) {
                    promises.push(
                        addDoc(collection(db, "client_resources"), {
                            clientId: client,
                            therapistId: profile?.id || "unknown",
                            title: resource.title,
                            description: resource.description || '',
                            type: resource.type,
                            url: resource.url || '',
                            originalName: resource.originalName || null,
                            storagePath: resource.storagePath || null,
                            originalResourceId: resource.id,
                            createdAt: serverTimestamp()
                        })
                    );
                }

                promises.push(
                    addDoc(collection(db, "notifications"), {
                        userId: client,
                        type: 'FILE_UPLOAD',
                        title: 'Neue Ressource',
                        body: i18n.t('therapist.new_file_notification', { defaultValue: 'Hey, für dich wurde neues Material hinterlegt!' }),
                        message: i18n.t('therapist.new_file_notification', { defaultValue: 'Hey, für dich wurde neues Material hinterlegt!' }),
                        read: false,
                        createdAt: serverTimestamp()
                    })
                );
            }

            await Promise.all(promises);

            setAssignModalVisible(false);
            setSelectionMode(false);
            setSelectedResourceIds([]);
            let msg = '';
            if (selectedResourcesForAssign.length === 1 && selectedClientsForAssign.length === 1) {
                msg = `Erfolgreich an 1 Klient zugewiesen.`;
            } else {
                msg = `${selectedResourcesForAssign.length} Ressource(n) erfolgreich an ${selectedClientsForAssign.length} Klient(en) zugewiesen.`;
            }
            showAlert("Erfolg", msg, "success");
        } catch (e) {
            showAlert("Fehler", "Zuweisung fehlgeschlagen.", "error");
            console.error(e);
        }
    };

    const openHistoryModal = async (resource: any) => {
        setSelectedResourceForHistory(resource);
        setHistoryModalVisible(true);
        setLoadingHistory(true);

        try {
            const q = query(
                collection(db, "client_resources"),
                where("originalResourceId", "==", resource.id),
                where("therapistId", "==", profile?.id || "__missing__")
            );
            const querySnapshot = await getDocs(q);

            const history: any[] = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                // Find client info from our loaded clients state
                const client = clients.find(c => c.id === data.clientId);
                if (client) {
                    history.push({
                        id: doc.id,
                        clientName: `${client.firstName} ${client.lastName}`,
                        assignedAt: data.createdAt?.toDate() || new Date()
                    });
                }
            });

            history.sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());
            setHistoryData(history);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleDelete = async (item: any) => {
        setConfirmModal({
            visible: true,
            title: 'Ressource löschen',
            message: `Möchtest du "${item.title}" wirklich löschen?`,
            confirmText: 'Löschen',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    if (item.type !== 'link' && item.storagePath) {
                        const storageRef = ref(storage, item.storagePath);
                        try {
                            await deleteObject(storageRef);
                        } catch (e) {
                            console.warn("Konnte Datei im Storage nicht löschen", e);
                        }
                    }
                    await deleteDoc(doc(db, "resources", item.id));
                    setResources(prev => prev.filter(r => r.id !== item.id));
                    setSelectedResourcesForAssign(prev => prev.filter(id => id !== item.id));
                } catch (error) {
                    console.error("Error deleting resource:", error);
                    showAlert("Fehler", "Konnte nicht gelöscht werden.", "error");
                } finally {
                    setConfirmModal(prev => ({ ...prev, visible: false }));
                }
            }
        });
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setLinkUrl('');
        setTagsInput('');
    };

    const handleTogglePin = async (item: any) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await updateDoc(doc(db, "resources", item.id), {
                isPinned: !item.isPinned
            });
            // Optimistic UI update
            setResources(prev => prev.map(r => r.id === item.id ? { ...r, isPinned: !r.isPinned } : r));
        } catch (e) {
            console.error("Error pinning", e);
        }
    };

    const handlePressAssign = (item: any) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        openAssignModal([item]);
    };

    const handlePressDelete = (item: any) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        handleDelete(item);
    };

    const handlePressPreview = (item: any) => {
        setSelectedResourceForPreview(item);
        setPreviewModalVisible(true);
    };

    // Derived filtered resources
    let filteredResources = resources.filter(res => {
        const matchesSearch = res.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            res.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (res.tags && res.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())));

        let matchesFilter = true;
        if (activeFilter === 'documents') {
            matchesFilter = ['document', 'pdf', 'file'].includes(res.type);
        } else if (activeFilter === 'media') {
            matchesFilter = ['image', 'video'].includes(res.type);
        } else if (activeFilter === 'links') {
            matchesFilter = res.type === 'link';
        }

        return matchesSearch && matchesFilter;
    });

    // Sort pinned to top, then by newer
    filteredResources.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
    });

    const toggleResourceSelection = (id: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedResourceIds(prev =>
            prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
        );
    };

    const TYPE_CONFIG: Record<string, { bg: string; border: string; text: string; label: string; icon: string }> = {
        document: { bg: '#EEF2FF', border: '#C7D2FE', text: '#4F46E5', label: 'Dokument', icon: '📄' },
        file: { bg: '#EEF2FF', border: '#C7D2FE', text: '#4F46E5', label: 'Datei', icon: '📄' },
        pdf: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: 'PDF', icon: '📋' },
        video: { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED', label: 'Video', icon: '🎥' },
        image: { bg: '#F6EFE8', border: '#E7DCCB', text: '#8A6A53', label: 'Bild', icon: '🖼️' },
        link: { bg: '#EEF4F3', border: '#D8E6E4', text: '#2D666B', label: 'Web Link', icon: '🔗' },
    };
    const TYPE_ICON_OVERRIDES: Record<string, string> = {
        document: 'DOC',
        file: 'FILE',
        pdf: 'PDF',
        video: 'VID',
        image: 'IMG',
        link: 'WEB',
    };
    const TYPE_ICON_COMPONENTS: Record<string, any> = {
        document: FileText,
        file: FileText,
        pdf: FileText,
        video: FileVideo,
        image: ImageIcon,
        link: LinkIcon,
    };

    const renderResourceItem = ({ item, index }: { item: any, index: number }) => {
        const isSelected = selectedResourceIds.includes(item.id);
        const baseCfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.file;
        const cfg = { ...baseCfg, icon: TYPE_ICON_OVERRIDES[item.type] ?? TYPE_ICON_OVERRIDES.file };
        const ResourceIcon = TYPE_ICON_COMPONENTS[item.type] ?? TYPE_ICON_COMPONENTS.file;

        return (
            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 120, delay: Math.min(index * 40, 400) }}
                style={{
                    backgroundColor: isSelected ? '#FAF7F0' : 'white',
                    borderRadius: 28,
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#B08C57' : 'rgba(0,0,0,0.06)',
                    marginBottom: 16,
                    shadowColor: isSelected ? '#B08C57' : '#182428',
                    shadowOffset: { width: 0, height: isSelected ? 8 : 4 },
                    shadowOpacity: isSelected ? 0.15 : 0.05,
                    shadowRadius: 20,
                    elevation: isSelected ? 5 : 3,
                    overflow: 'hidden',
                }}
            >
                <PressableScale
                    onPress={() => selectionMode ? toggleResourceSelection(item.id) : handlePressPreview(item)}
                    onLongPress={() => { setSelectionMode(true); toggleResourceSelection(item.id); }}
                >
                    {/* Pinned indicator */}
                    {item.isPinned && (
                        <LinearGradient
                            colors={['#FFFBEB', '#F6F0E7']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 1, borderBottomColor: '#FDE68A' }}
                        >
                            <Star size={12} color="#D97706" fill="#D97706" />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309', letterSpacing: 0.5 }}>ANGEHEFTET</Text>
                        </LinearGradient>
                    )}

                    <View style={{ padding: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                            {/* Selection checkbox */}
                            {selectionMode && (
                                <View style={{ justifyContent: 'center', paddingTop: 4 }}>
                                    <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: isSelected ? '#B08C57' : 'transparent', borderWidth: isSelected ? 0 : 2, borderColor: '#BEC7C0', alignItems: 'center', justifyContent: 'center' }}>
                                        {isSelected && <Check size={14} color="#fff" />}
                                    </View>
                                </View>
                            )}

                            {/* Icon Box */}
                            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ResourceIcon size={24} color={cfg.text} strokeWidth={2.2} />
                            </View>

                            {/* Content */}
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#182428', flex: 1, lineHeight: 22, marginRight: 8 }} numberOfLines={2}>{item.title}</Text>
                                    <PressableScale onPress={() => handleTogglePin(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Star size={20} color={item.isPinned ? '#F59E0B' : '#BEC7C0'} fill={item.isPinned ? '#F59E0B' : 'transparent'} />
                                    </PressableScale>
                                </View>
                                {/* Type badge */}
                                <View style={{ backgroundColor: cfg.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: cfg.border, alignSelf: 'flex-start' }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: cfg.text, letterSpacing: 0.5 }}>{cfg.label.toUpperCase()}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Description */}
                        {item.description ? (
                            <View style={{ marginTop: 14, backgroundColor: '#F5F1EA', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                <Text style={{ fontSize: 14, color: '#5E655F', lineHeight: 20, fontWeight: '500' }}>{item.description}</Text>
                            </View>
                        ) : null}

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                                {item.tags.map((tag: string, idx: number) => (
                                    <View key={idx} style={{ backgroundColor: '#F3EEE6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Tag size={11} color="#8B938E" />
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#6F7472' }}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Action buttons */}
                        {!selectionMode && (
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <PressableScale
                                    onPress={() => handlePressDelete(item)}
                                    style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#FEF2F2', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#FECACA' }}
                                >
                                    <Trash2 size={15} color="#EF4444" />
                                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>Löschen</Text>
                                </PressableScale>
                                <PressableScale
                                    onPress={() => openHistoryModal(item)}
                                    style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#F5F1EA', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Clock size={16} color="#6F7472" />
                                </PressableScale>
                                <PressableScale
                                    onPress={() => handlePressAssign(item)}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1F2528', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, shadowColor: '#1F2528', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                                >
                                    <Send size={15} color="#B08C57" />
                                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>Zuweisen</Text>
                                </PressableScale>
                            </View>
                        )}
                    </View>
                </PressableScale>
            </MotiView>
        );
    };

    const FILTER_OPTIONS = [
        { key: 'all', label: 'Alle', icon: null, color: '#1F2528' },
        { key: 'documents', label: 'Dokumente', icon: <FileText size={14} color="inherit" />, color: '#1F2528' },
        { key: 'media', label: 'Medien', icon: <FileVideo size={14} color="inherit" />, color: '#B08C57' },
        { key: 'links', label: 'Links', icon: <LinkIcon size={14} color="inherit" />, color: '#8B7355' },
    ] as const;

    const listHeaderElement = (
        <View style={{ paddingTop: 8 }}>
            {/* Search bar */}
            <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 280, delay: 80 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.06)', shadowColor: '#182428', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                    <Search color="#8B938E" size={20} style={{ marginRight: 10 }} />
                    <TextInput
                        placeholder="Bibliothek durchsuchen..."
                        placeholderTextColor="#8B938E"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={{ flex: 1, color: '#182428', fontWeight: '600', fontSize: 16 } as any}
                    />
                    {searchQuery.length > 0 ? (
                        <PressableScale
                            accessibilityRole="button"
                            accessibilityLabel="Suche leeren"
                            onPress={() => setSearchQuery('')}
                            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3EEE6', alignItems: 'center', justifyContent: 'center' }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <X color="#6F7472" size={14} />
                        </PressableScale>
                    ) : null}
                </View>

                {/* Filter chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8, gap: 8, paddingBottom: 4 }} style={{ marginBottom: 20 }}>
                    {FILTER_OPTIONS.map(opt => {
                        const isActive = activeFilter === opt.key;
                        return (
                            <PressableScale
                                key={opt.key}
                                onPress={() => setActiveFilter(opt.key as any)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                    paddingHorizontal: 16,
                                    paddingVertical: 9,
                                    borderRadius: 20,
                                    backgroundColor: isActive ? opt.color : 'white',
                                    borderWidth: 1.5,
                                    borderColor: isActive ? opt.color : 'rgba(0,0,0,0.07)',
                                    shadowColor: isActive ? opt.color : 'transparent',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 8,
                                    elevation: isActive ? 4 : 0,
                                }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '800', color: isActive ? 'white' : '#6F7472', letterSpacing: 0.2 }}>{opt.label}</Text>
                            </PressableScale>
                        );
                    })}
                </ScrollView>
            </MotiView>

            {/* Section heading */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '900', color: '#8B938E', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    Bibliothek · {filteredResources.length} {filteredResources.length === 1 ? 'Eintrag' : 'Einträge'}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginLeft: 12 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1F2528" style={{ marginTop: 40 }} />
            ) : filteredResources.length === 0 ? (
                <MotiView from={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} style={{ alignItems: 'center', paddingVertical: 56, backgroundColor: 'white', borderRadius: 28, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', marginBottom: 16 }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F1EA', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <Library size={36} color="#BEC7C0" strokeWidth={1.5} />
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#182428', marginBottom: 8 }}>Nichts gefunden</Text>
                    <Text style={{ fontSize: 14, color: '#8B938E', fontWeight: '500', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 }}>Ändere die Suchkriterien oder füge eine neue Ressource hinzu.</Text>
                </MotiView>
            ) : null}
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Premium Header */}
            <MotiView from={{ opacity: 0, translateY: -20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 350 }}>
                <LinearGradient
                    colors={['#1F2528', '#3D5166']}
                    style={{ paddingTop: Platform.OS === 'android' ? 56 : 64, paddingBottom: 28, paddingHorizontal: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8, zIndex: 10 }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <PressableScale
                            onPress={() => router.replace('/therapist')}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}
                        >
                            <ArrowLeft size={18} color="rgba(255,255,255,0.9)" />
                            <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 14 }}>Zurück</Text>
                        </PressableScale>

                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ fontSize: 20, fontWeight: '900', color: 'white', letterSpacing: -0.3 }}>Bibliothek</Text>
                        </View>

                        <PressableScale
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setAddModalVisible(true);
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#B08C57', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, shadowColor: '#B08C57', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 3 }}
                        >
                            <Plus size={17} color="white" />
                            <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>Hinzufügen</Text>
                        </PressableScale>
                    </View>

                    {/* Subtitle stats */}
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600', marginTop: 8 }}>
                        {resources.length} {resources.length === 1 ? 'Ressource' : 'Ressourcen'} · Gemeinsames Material
                    </Text>
                </LinearGradient>
            </MotiView>

            <FlatList
                data={filteredResources}
                scrollEnabled={false}
                keyExtractor={item => item.id}
                renderItem={renderResourceItem}
                ListHeaderComponent={listHeaderElement}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0, maxWidth: 860, alignSelf: 'center', width: '100%' }}
            />

            {/* Add Resource Modal */}
            </ScrollView>
            <Modal visible={addModalVisible} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
                >
                    <PressableScale className="flex-1" onPress={() => setAddModalVisible(false)} />
                    <View className="bg-white rounded-t-[32px] p-6 pb-10" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 }}>
                        <View className="flex-row justify-between items-center mb-6">
                            <View className="flex-row items-center">
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#C5D2DC' }}>
                                    <PlusCircle color="#1F2528" size={22} />
                                </View>
                                <Text className="text-xl font-black text-[#1F2528]">Ressource hinzufügen</Text>
                            </View>
                            <PressableScale onPress={() => setAddModalVisible(false)} className="bg-gray-100 p-2.5 rounded-full" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <X size={20} color="#1F2528" />
                            </PressableScale>
                        </View>

                        {/* Tabs */}
                        <View className="flex-row gap-3 mb-6 bg-[#F7F4EE] p-1.5 rounded-2xl border border-[#E7E0D4]">
                            <PressableScale
                                onPress={() => setResourceType('file')}
                                className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${resourceType === 'file' ? 'bg-white shadow-sm border border-[#E7E0D4]' : 'border border-transparent'}`}
                            >
                                <FileText size={18} color={resourceType === 'file' ? '#1F2528' : '#8B938E'} />
                                <Text style={{ fontWeight: '700', color: resourceType === 'file' ? '#1F2528' : '#8B938E' }}>Datei</Text>
                            </PressableScale>
                            <PressableScale
                                onPress={() => setResourceType('link')}
                                className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${resourceType === 'link' ? 'bg-white shadow-sm border border-[#E7E0D4]' : 'border border-transparent'}`}
                            >
                                <LinkIcon size={18} color={resourceType === 'link' ? '#B08C57' : '#8B938E'} />
                                <Text style={{ fontWeight: '700', color: resourceType === 'link' ? '#B08C57' : '#8B938E' }}>Web Link</Text>
                            </PressableScale>
                        </View>

                        <View className="mb-4">
                            <Text className="text-[11px] font-bold text-[#5C696F] uppercase tracking-widest mb-2 ml-1">Titel der Ressource</Text>
                            <TextInput
                                placeholder="Z.B. Arbeitsblatt Entspannung"
                                placeholderTextColor="#8B938E"
                                value={title}
                                onChangeText={setTitle}
                                className="bg-[#F7F4EE] border border-[#E7E0D4] p-4 rounded-2xl font-bold text-[#1F2528] text-base"
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-[11px] font-bold text-[#5C696F] uppercase tracking-widest mb-2 ml-1">Kurze Beschreibung (optional)</Text>
                            <TextInput
                                placeholder="Z.B. Eine einfache Atemübung für den Alltag"
                                placeholderTextColor="#8B938E"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                className="bg-[#F7F4EE] border border-[#E7E0D4] p-4 rounded-2xl text-[#1F2528] text-base min-h-[80px]"
                                textAlignVertical="top"
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-[11px] font-bold text-[#5C696F] uppercase tracking-widest mb-2 ml-1">Tags (Komma getrennt, optional)</Text>
                            <TextInput
                                placeholder="Z.B. Angst, Achtsamkeit, Übung"
                                placeholderTextColor="#8B938E"
                                value={tagsInput}
                                onChangeText={setTagsInput}
                                className="bg-[#F7F4EE] border border-[#E7E0D4] p-4 rounded-2xl font-bold text-[#1F2528] text-base"
                            />
                        </View>

                        {resourceType === 'link' && (
                            <View className="mb-6">
                                <Text className="text-[11px] font-bold text-[#5C696F] uppercase tracking-widest mb-2 ml-1">URL</Text>
                                <TextInput
                                    placeholder="https://..."
                                    placeholderTextColor="#8B938E"
                                    value={linkUrl}
                                    onChangeText={setLinkUrl}
                                    autoCapitalize="none"
                                    keyboardType="url"
                                    className="bg-[#F7F4EE] border border-[#E7E0D4] p-4 rounded-2xl text-[#1F2528] text-base font-medium"
                                />
                            </View>
                        )}

                        <PressableScale
                            onPress={resourceType === 'file' ? handleUploadFile : handleAddLink}
                            disabled={uploading}
                            style={{ paddingVertical: 16, marginTop: 8, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: uploading ? '#E7E0D4' : '#1F2528', shadowColor: '#1F2528', shadowOffset: { width: 0, height: 4 }, shadowOpacity: uploading ? 0 : 0.3, shadowRadius: 8, elevation: uploading ? 0 : 4 }}
                        >
                            {uploading ? (
                                <ActivityIndicator color="#B08C57" style={{ marginRight: 8 }} />
                            ) : (
                                resourceType === 'file' ? <UploadCloud color="#B08C57" size={20} style={{ marginRight: 8 }} /> : <LinkIcon color="#B08C57" size={20} style={{ marginRight: 8 }} />
                            )}
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 }}>
                                {uploading ? 'Speichern...' : resourceType === 'file' ? 'Datei Auswählen & Hochladen' : 'Link Speichern'}
                            </Text>
                        </PressableScale>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Assignment Modal */}
            <Modal visible={assignModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/40 p-4">
                    <MotiView
                        from={{ opacity: 0, scale: 0.95, translateY: 20 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
                        style={{ backgroundColor: 'white' }}
                    >
                        <View className="p-6 flex-row justify-between items-center" style={{ backgroundColor: '#F8F5EF', borderBottomWidth: 1, borderBottomColor: '#E7E0D4' }}>
                            <Text className="text-[20px] font-black text-[#1F2528] tracking-tight">An Klienten Senden</Text>
                            <PressableScale onPress={() => setAssignModalVisible(false)} className="bg-white shadow-sm p-2.5 rounded-full border border-gray-100" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <X size={20} color="#1F2528" />
                            </PressableScale>
                        </View>

                        <View className="p-6">
                            <Text style={{ color: '#4B5A61', fontWeight: '500', fontSize: 15, marginBottom: 16, lineHeight: 22 }}>
                                {selectedResourcesForAssign.length === 1
                                    ? <Text>An wen möchtest du <Text style={{ fontWeight: '700', color: '#1F2528' }}>"{selectedResourcesForAssign[0]?.title}"</Text> zuweisen?</Text>
                                    : <Text>An wen möchtest du die <Text style={{ fontWeight: '700', color: '#1F2528' }}>{selectedResourcesForAssign.length} markierten Ressourcen</Text> zuweisen?</Text>
                                }
                            </Text>

                            <FlatList
                                data={clients}
                                keyExtractor={(c) => c.id}
                                renderItem={({ item }) => {
                                    const isClientSelected = selectedClientsForAssign.includes(item.id);
                                    return (
                                        <PressableScale
                                            onPress={() => toggleClientSelection(item.id)}
                                            style={{ padding: 16, borderRadius: 20, borderWidth: 1.5, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isClientSelected ? '#FAF7F0' : 'white', borderColor: isClientSelected ? '#B08C57' : '#F5F1EA' }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isClientSelected ? 'rgba(192, 157, 89, 0.1)' : '#F0F4F8', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: isClientSelected ? 'rgba(192, 157, 89, 0.3)' : '#C5D2DC' }}>
                                                    <Text style={{ color: isClientSelected ? '#B08C57' : '#1F2528', fontWeight: '800' }}>{item.firstName?.charAt(0)}{item.lastName?.charAt(0)}</Text>
                                                </View>
                                                <Text style={{ fontWeight: '800', color: '#1F2528', fontSize: 16 }}>{item.firstName} {item.lastName}</Text>
                                            </View>
                                            <View style={{ width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: isClientSelected ? '#B08C57' : 'white', borderWidth: isClientSelected ? 0 : 2, borderColor: '#E7E0D4' }}>
                                                {isClientSelected && <Check size={14} color="#fff" />}
                                            </View>
                                        </PressableScale>
                                    );
                                }}
                                style={{ maxHeight: 250 }}
                                showsVerticalScrollIndicator={false}
                            />

                            <PressableScale
                                onPress={confirmBulkAssign}
                                disabled={selectedClientsForAssign.length === 0}
                                style={{ marginTop: 20, paddingVertical: 16, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: selectedClientsForAssign.length > 0 ? '#1F2528' : '#E7E0D4', shadowColor: '#1F2528', shadowOffset: { width: 0, height: 4 }, shadowOpacity: selectedClientsForAssign.length > 0 ? 0.3 : 0, shadowRadius: 8, elevation: selectedClientsForAssign.length > 0 ? 4 : 0 }}
                            >
                                <Send size={18} color={selectedClientsForAssign.length > 0 ? '#B08C57' : '#8B938E'} style={{ marginRight: 8 }} />
                                <Text style={{ color: selectedClientsForAssign.length > 0 ? 'white' : '#8B938E', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 }}>
                                    An {selectedClientsForAssign.length} Klient(en) senden
                                </Text>
                            </PressableScale>
                        </View>
                    </MotiView>
                </View>
            </Modal>

            {/* Preview Modal */}
            <Modal
                visible={previewModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setPreviewModalVisible(false)}
            >
                <View className="flex-1 bg-[#F7F4EE]">
                    <View className="bg-[#2D666B] flex-row items-center justify-between" style={{ paddingTop: Platform.OS === 'android' ? 56 : 64, paddingBottom: 24, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, zIndex: 10 }}>
                        <Text className="text-white text-[20px] font-black max-w-[80%]" numberOfLines={1}>
                            {selectedResourceForPreview?.title || selectedResourceForPreview?.originalName || 'Vorschau'}
                        </Text>
                        <PressableScale onPress={() => setPreviewModalVisible(false)} className="w-10 h-10 rounded-full items-center justify-center backdrop-blur-md" style={{ backgroundColor: 'rgba(255,255,255,0.24)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                            <X size={20} color="white" />
                        </PressableScale>
                    </View>

                    <View className="flex-1">
                        {selectedResourceForPreview && (
                            <View className="flex-1">
                                <View className="bg-white p-6 rounded-b-[32px] border-b border-gray-100 shadow-sm z-0">
                                    <View className="flex-row items-center mb-3">
                                        <View className={`px-2.5 py-1 rounded-lg ${selectedResourceForPreview.type === 'document' ? 'bg-indigo-50' : selectedResourceForPreview.type === 'pdf' ? 'bg-red-50' : selectedResourceForPreview.type === 'video' ? 'bg-purple-50' : selectedResourceForPreview.type === 'image' ? 'bg-pink-50' : 'bg-blue-50'}`}>
                                            <Text className={`text-[11px] font-black uppercase tracking-widest ${selectedResourceForPreview.type === 'document' ? 'text-indigo-600' : selectedResourceForPreview.type === 'pdf' ? 'text-red-600' : selectedResourceForPreview.type === 'video' ? 'text-purple-600' : selectedResourceForPreview.type === 'image' ? 'text-pink-600' : 'text-blue-600'}`}>
                                                {selectedResourceForPreview.type === 'document' ? 'Dokument' : selectedResourceForPreview.type === 'pdf' ? 'PDF Dokument' : selectedResourceForPreview.type === 'video' ? 'Video' : selectedResourceForPreview.type === 'image' ? 'Bild' : 'Web Link'}
                                            </Text>
                                        </View>
                                    </View>

                                    {selectedResourceForPreview.description ? (
                                        <Text className="text-[15px] leading-relaxed mb-4" style={{ color: '#4B5A61' }}>
                                            {selectedResourceForPreview.description}
                                        </Text>
                                    ) : null}

                                    <PressableScale
                                        onPress={() => Linking.openURL(previewUrl)}
                                        className="bg-[#B08C57] flex-row items-center justify-center py-4 rounded-[20px] shadow-sm"
                                        style={{ shadowColor: '#B08C57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                                    >
                                        {selectedResourceForPreview.type !== 'link' && <Download size={20} color="white" style={{ marginRight: 8 }} />}
                                        <Text className="text-white font-bold text-[16px]">
                                            {selectedResourceForPreview.type === 'link' ? 'Im Browser öffnen' : 'Speichern / Herunterladen'}
                                        </Text>
                                    </PressableScale>
                                </View>

                                {/* Embedded Preview Section */}
                                <View className="flex-1 mt-4 mx-4 mb-8 rounded-[32px] overflow-hidden border" style={{ backgroundColor: '#F5F1EA', borderColor: '#D9E1E5' }}>
                                    {selectedResourceForPreview.type === 'image' ? (
                                        <Image
                                            source={{ uri: previewUrl }}
                                            style={{ width: '100%', height: '100%' }}
                                            contentFit="contain"
                                        />
                                    ) : selectedResourceForPreview.type === 'video' ? (
                                        <Video
                                            source={{ uri: previewUrl }}
                                            style={{ width: '100%', height: '100%' }}
                                            useNativeControls
                                            resizeMode={ResizeMode.CONTAIN}
                                            isLooping={false}
                                            shouldPlay={false}
                                        />
                                    ) : selectedResourceForPreview.type === 'document' || selectedResourceForPreview.type === 'pdf' ? (
                                        Platform.OS === 'web' ? (
                                            <iframe src={previewUrl} width="100%" height="100%" style={{ border: 'none', backgroundColor: 'transparent' }} />
                                        ) : (
                                            <WebView
                                                source={{ uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(previewUrl)}` }}
                                                style={{ flex: 1, backgroundColor: 'transparent' }}
                                                startInLoadingState={true}
                                                renderLoading={() => <ActivityIndicator size="large" color="#2D666B" style={{ flex: 1, justifyContent: 'center' }} />}
                                            />
                                        )
                                    ) : (
                                        Platform.OS === 'web' ? (
                                            <iframe src={previewUrl} width="100%" height="100%" style={{ border: 'none', backgroundColor: 'transparent' }} />
                                        ) : (
                                            <WebView
                                                source={{ uri: previewUrl }}
                                                style={{ flex: 1, backgroundColor: 'transparent' }}
                                                startInLoadingState={true}
                                                renderLoading={() => <ActivityIndicator size="large" color="#2D666B" style={{ flex: 1, justifyContent: 'center' }} />}
                                            />
                                        )
                                    )}
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* History Modal */}
            <Modal visible={historyModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/40 p-4">
                    <MotiView
                        from={{ opacity: 0, scale: 0.95, translateY: 20 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
                        style={{ backgroundColor: 'white' }}
                    >
                        <View className="p-6 flex-row justify-between items-center" style={{ backgroundColor: '#F8F5EF', borderBottomWidth: 1, borderBottomColor: '#E7E0D4' }}>
                            <Text className="text-[20px] font-black text-[#1F2528] tracking-tight">Verlauf</Text>
                            <PressableScale onPress={() => setHistoryModalVisible(false)} className="bg-white shadow-sm p-2.5 rounded-full border border-gray-100" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <X size={20} color="#1F2528" />
                            </PressableScale>
                        </View>

                        <View className="p-6">
                            <Text style={{ color: '#4B5A61', fontWeight: '500', fontSize: 15, marginBottom: 16 }}>
                                Bisherige Zuweisungen für <Text style={{ fontWeight: '700', color: '#1F2528' }}>"{selectedResourceForHistory?.title}"</Text>
                            </Text>

                            {loadingHistory ? (
                                <ActivityIndicator size="small" color="#1F2528" style={{ marginVertical: 32 }} />
                            ) : historyData.length === 0 ? (
                                <View style={{ paddingVertical: 32, alignItems: 'center', backgroundColor: '#F7F4EE', borderRadius: 18, borderWidth: 1.5, borderColor: '#E7E0D4', borderStyle: 'dashed' }}>
                                    <Clock size={32} color="#7D8B91" style={{ marginBottom: 12 }} />
                                    <Text style={{ color: '#4B5A61', textAlign: 'center', fontWeight: '500' }}>Noch nicht zugewiesen.</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={historyData}
                                    keyExtractor={(h) => h.id}
                                    renderItem={({ item }) => (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderColor: '#F0F4F8', borderRadius: 16, marginBottom: 8, backgroundColor: 'white' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0F4F8', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#C5D2DC' }}>
                                                    <Text style={{ color: '#1F2528', fontWeight: '800', fontSize: 12 }}>{item.clientName.charAt(0)}</Text>
                                                </View>
                                                <Text style={{ fontWeight: '800', color: '#1F2528' }}>{item.clientName}</Text>
                                            </View>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B938E' }}>
                                                {item.assignedAt.toLocaleDateString('de-DE')}
                                            </Text>
                                        </View>
                                    )}
                                    style={{ maxHeight: 300 }}
                                    showsVerticalScrollIndicator={false}
                                />
                            )}
                        </View>
                    </MotiView>
                </View>
            </Modal>


            <ConfirmModal
                visible={confirmModal.visible}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                cancelText="Abbrechen"
                isDestructive={confirmModal.isDestructive}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
            />

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



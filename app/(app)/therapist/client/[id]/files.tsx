import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Modal, Platform, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { db, storage } from '../../../../../utils/firebase';
import i18n from '../../../../../utils/i18n';
import { MotiView } from 'moti';
import { useAuth } from '../../../../../contexts/AuthContext';
import { FileUp, FileText, ArrowLeft, X, Trash2, FolderOpen, Download, Image, Film, FileCode, File, Search } from 'lucide-react-native';
import { SuccessAnimation } from '../../../../../components/ui/SuccessAnimation';
import { useDebounce } from '../../../../../hooks/useDebounce';
import { uploadFile } from '../../../../../utils/uploadFile';

// ─── File type helpers ─────────────────────────────────────────────────────────

function getFileInfo(file: any): { Icon: any; color: string; bg: string; border: string; label: string } {
    const name = (file.originalName || file.title || '').toLowerCase();
    if (name.endsWith('.pdf')) return { Icon: FileText, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', label: 'PDF' };
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some(e => name.endsWith(e)))
        return { Icon: Image, color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', label: 'Bild' };
    if (['.mp4', '.mov', '.avi', '.mkv'].some(e => name.endsWith(e)))
        return { Icon: Film, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'Video' };
    if (['.doc', '.docx'].some(e => name.endsWith(e)))
        return { Icon: FileText, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Word' };
    if (['.xls', '.xlsx', '.csv'].some(e => name.endsWith(e)))
        return { Icon: FileCode, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', label: 'Excel' };
    if (['.ppt', '.pptx'].some(e => name.endsWith(e)))
        return { Icon: FileText, color: '#F97316', bg: '#FFF7ED', border: '#FED7AA', label: 'PPT' };
    return { Icon: File, color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', label: 'Datei' };
}

function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FileCard = React.memo(({ file, index, setFileToDelete, setDeleteModalVisible }: any) => {
    const info = getFileInfo(file);
    return (
        <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: index * 40 }}
            style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E8E6E1', shadowColor: '#243842', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* File type icon */}
                <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: info.bg, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: info.border, flexShrink: 0 }}>
                    <info.Icon size={28} color={info.color} />
                </View>

                {/* File info */}
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#243842', flex: 1 }} numberOfLines={1}>{file.title}</Text>
                        <View style={{ backgroundColor: info.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: info.border }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: info.color }}>{info.label}</Text>
                        </View>
                    </View>

                    {file.description ? (
                        <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500', lineHeight: 18, marginBottom: 6 }} numberOfLines={2}>{file.description}</Text>
                    ) : null}

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600' }}>
                            {new Date((file.createdAt?.seconds || 0) * 1000 || Date.now()).toLocaleDateString(i18n.locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                        {file.fileSize ? (
                            <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600' }}>· {formatFileSize(file.fileSize)}</Text>
                        ) : null}
                    </View>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 8, marginLeft: 12 }}>
                    {file.url && (
                        <TouchableOpacity
                            onPress={() => Linking.openURL(file.url)}
                            style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#F0F9FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BAE6FD' }}
                        >
                            <Download size={18} color="#0EA5E9" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={() => { setFileToDelete(file); setDeleteModalVisible(true); }}
                        style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FECACA' }}
                    >
                        <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </MotiView>
    );
});

export default function TherapistClientFilesScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { profile } = useAuth();

    const [clientFiles, setClientFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);

    // Upload Modal
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newFileTitle, setNewFileTitle] = useState('');
    const [newFileDesc, setNewFileDesc] = useState('');
    const [uploadingFile, setUploadingFile] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);

    // Delete
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<any>(null);

    const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });

    const fetchClientFiles = async () => {
        if (!id) return;
        try {
            const q = query(collection(db, 'client_resources'), where('clientId', '==', id));
            const snap = await getDocs(q);
            const files = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            files.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setClientFiles(files);
        } catch (error) {
            console.error('Error fetching client files', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchClientFiles(); }, [id]);

    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setSelectedAsset(asset);
            if (!newFileTitle.trim()) {
                setNewFileTitle(asset.name.replace(/\.[^/.]+$/, ''));
            }
        }
    };

    const handleUploadClientFile = async () => {
        if (!newFileTitle.trim()) {
            setToast({ visible: true, message: 'Fehler', subMessage: 'Bitte gib einen Titel für die Datei an.', type: 'warning' });
            return;
        }
        if (!selectedAsset) {
            setToast({ visible: true, message: 'Fehler', subMessage: 'Bitte wähle zuerst eine Datei aus.', type: 'warning' });
            return;
        }

        setUploadingFile(true);
        try {
            const mimeType = selectedAsset.mimeType || 'application/octet-stream';
            const filename = `client_resources/${id}/${Date.now()}_${selectedAsset.name}`;

            const downloadUrl = await uploadFile(selectedAsset.uri, filename, mimeType);

            await addDoc(collection(db, 'client_resources'), {
                clientId: id,
                therapistId: profile?.id || 'unknown',
                title: newFileTitle.trim(),
                description: newFileDesc.trim(),
                type: 'document',
                url: downloadUrl,
                originalName: selectedAsset.name,
                storagePath: filename,
                fileSize: selectedAsset.size,
                mimeType,
                createdAt: serverTimestamp(),
            });

            await addDoc(collection(db, 'notifications'), {
                clientId: id,
                type: 'FILE_UPLOAD',
                message: 'Hey, für dich wurde eine neue Datei hinterlegt!',
                read: false,
                createdAt: serverTimestamp(),
            });

            setToast({ visible: true, message: 'Hochgeladen!', subMessage: 'Klient wurde benachrichtigt.', type: 'success' });
            setNewFileTitle('');
            setNewFileDesc('');
            setSelectedAsset(null);
            setShowUploadModal(false);
            fetchClientFiles();
        } catch (err: any) {
            console.error('Upload error', err);
            setToast({ visible: true, message: 'Fehler', subMessage: err.message || 'Upload fehlgeschlagen.', type: 'error' });
        } finally {
            setUploadingFile(false);
        }
    };

    const confirmDeleteFile = async () => {
        if (!fileToDelete) return;
        try {
            if (fileToDelete.storagePath) {
                try { await deleteObject(ref(storage, fileToDelete.storagePath)); } catch { /* ignore */ }
            }
            await deleteDoc(doc(db, 'client_resources', fileToDelete.id));
            setClientFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
            setToast({ visible: true, message: 'Gelöscht', type: 'success' });
        } catch {
            setToast({ visible: true, message: 'Fehler', subMessage: 'Datei konnte nicht gelöscht werden.', type: 'error' });
        } finally {
            setDeleteModalVisible(false);
            setFileToDelete(null);
        }
    };

    const filteredFiles = clientFiles.filter(f =>
        !debouncedSearch.trim() || f.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) || f.originalName?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#F9F8F6' }}>
            {/* Header */}
            <MotiView from={{ opacity: 0, translateY: -30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 380 }}>
                <View style={{ backgroundColor: '#C09D59', paddingTop: 64, paddingBottom: 28, paddingHorizontal: 28 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
                            <ArrowLeft size={18} color="white" />
                            <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8, fontSize: 15 }}>Zurück</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowUploadModal(true)}
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 }}
                        >
                            <FileUp size={18} color="#C09D59" />
                            <Text style={{ color: '#C09D59', fontWeight: '800', marginLeft: 6, fontSize: 15 }}>Hochladen</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={{ color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>Dateien</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                        {clientFiles.length} {clientFiles.length === 1 ? 'Datei' : 'Dateien'}
                    </Text>

                    {clientFiles.length > 0 && (
                        <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 }}>
                            <Search size={18} color="rgba(255,255,255,0.7)" />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Dateien durchsuchen..."
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                style={{ flex: 1, marginLeft: 10, color: 'white', fontSize: 15, fontWeight: '600' } as any}
                            />
                            {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><X size={18} color="rgba(255,255,255,0.7)" /></TouchableOpacity>}
                        </View>
                    )}
                </View>
            </MotiView>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#C09D59" />
                </View>
            ) : clientFiles.length === 0 ? (
                /* Empty State */
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 100 }} style={{ alignItems: 'center' }}>
                        <View style={{ width: 100, height: 100, borderRadius: 28, backgroundColor: '#FFF9EC', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#F5DFA0', borderStyle: 'dashed' }}>
                            <FolderOpen size={44} color="#C09D59" />
                        </View>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#243842', marginBottom: 10, textAlign: 'center' }}>Noch keine Dateien</Text>
                        <Text style={{ fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22, maxWidth: 280, fontWeight: '500', marginBottom: 32 }}>
                            Lade PDFs, Arbeitsblätter oder andere Dokumente für den Klienten hoch.
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowUploadModal(true)}
                            style={{ backgroundColor: '#C09D59', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}
                        >
                            <FileUp size={20} color="white" />
                            <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Erste Datei hochladen</Text>
                        </TouchableOpacity>
                    </MotiView>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 120, maxWidth: 860, alignSelf: 'center', width: '100%' }}>
                    {filteredFiles.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                            <Text style={{ fontSize: 15, color: '#94A3B8', fontWeight: '600' }}>Keine Dateien gefunden für „{search}"</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 14 }}>
                            {filteredFiles.map((file, index) => (
                                <FileCard
                                    key={file.id}
                                    file={file}
                                    index={index}
                                    setFileToDelete={setFileToDelete}
                                    setDeleteModalVisible={setDeleteModalVisible}
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Upload Modal — Bottom sheet style */}
            <Modal visible={showUploadModal} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <MotiView
                        from={{ translateY: 400 }}
                        animate={{ translateY: 0 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 200 }}
                        style={{ backgroundColor: 'white', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 28, paddingBottom: 48 }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <Text style={{ fontSize: 24, fontWeight: '900', color: '#243842', letterSpacing: -0.5 }}>Datei hochladen</Text>
                            <TouchableOpacity onPress={() => { setShowUploadModal(false); setSelectedAsset(null); setNewFileTitle(''); setNewFileDesc(''); }} style={{ backgroundColor: '#F1F5F9', padding: 10, borderRadius: 20 }}>
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* File pick area */}
                        <TouchableOpacity
                            onPress={pickDocument}
                            style={{
                                backgroundColor: selectedAsset ? '#F0FDF4' : '#F8FAFC',
                                borderWidth: 2,
                                borderStyle: 'dashed',
                                borderColor: selectedAsset ? '#86EFAC' : '#CBD5E1',
                                borderRadius: 24,
                                padding: 24,
                                alignItems: 'center',
                                marginBottom: 20,
                            }}
                        >
                            {selectedAsset ? (
                                <>
                                    <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                                        <FileText size={26} color="#16A34A" />
                                    </View>
                                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#16A34A', marginBottom: 2 }}>{selectedAsset.name}</Text>
                                    {selectedAsset.size && <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '500' }}>{formatFileSize(selectedAsset.size)}</Text>}
                                    <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 8, fontWeight: '600' }}>Tippe um eine andere Datei zu wählen</Text>
                                </>
                            ) : (
                                <>
                                    <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                        <FolderOpen size={26} color="#64748B" />
                                    </View>
                                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#243842', marginBottom: 4 }}>Datei auswählen</Text>
                                    <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '500' }}>PDF, Word, Excel, Bilder, Videos…</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Title field */}
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Titel *</Text>
                        <TextInput
                            style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 18, padding: 16, marginBottom: 16, fontSize: 15, color: '#243842', fontWeight: '500' }}
                            placeholder="z.B. Arbeitsblatt Angstbewältigung"
                            placeholderTextColor="#94A3B8"
                            value={newFileTitle}
                            onChangeText={setNewFileTitle}
                        />

                        {/* Description field */}
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Beschreibung (Optional)</Text>
                        <TextInput
                            style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 18, padding: 16, marginBottom: 24, fontSize: 15, color: '#243842', fontWeight: '500', minHeight: 88, textAlignVertical: 'top' }}
                            placeholder="Kurze Info oder Anleitung für den Klienten..."
                            placeholderTextColor="#94A3B8"
                            value={newFileDesc}
                            onChangeText={setNewFileDesc}
                            multiline
                        />

                        {/* Upload button */}
                        <TouchableOpacity
                            onPress={handleUploadClientFile}
                            disabled={uploadingFile || !newFileTitle.trim() || !selectedAsset}
                            style={{
                                backgroundColor: (uploadingFile || !newFileTitle.trim() || !selectedAsset) ? '#E2E8F0' : '#C09D59',
                                paddingVertical: 18,
                                borderRadius: 22,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                shadowColor: '#C09D59',
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: (uploadingFile || !newFileTitle.trim() || !selectedAsset) ? 0 : 0.25,
                                shadowRadius: 16,
                                elevation: (uploadingFile || !newFileTitle.trim() || !selectedAsset) ? 0 : 4,
                            }}
                        >
                            {uploadingFile ? (
                                <>
                                    <ActivityIndicator color="white" style={{ marginRight: 10 }} />
                                    <Text style={{ fontWeight: '800', fontSize: 16, color: 'white' }}>Lädt hoch…</Text>
                                </>
                            ) : (
                                <>
                                    <FileUp size={20} color={(uploadingFile || !newFileTitle.trim() || !selectedAsset) ? '#94A3B8' : 'white'} style={{ marginRight: 8 }} />
                                    <Text style={{ fontWeight: '800', fontSize: 16, color: (uploadingFile || !newFileTitle.trim() || !selectedAsset) ? '#94A3B8' : 'white' }}>
                                        Hochladen
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <Text style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 14 }}>Der Klient wird nach dem Upload benachrichtigt</Text>
                    </MotiView>
                </View>
            </Modal>

            {/* Delete confirmation */}
            <Modal visible={deleteModalVisible} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 }}>
                    <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: 'white', borderRadius: 36, padding: 40, width: '100%', maxWidth: 380 }}>
                        <View style={{ alignItems: 'center', marginBottom: 28 }}>
                            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Trash2 size={32} color="#EF4444" />
                            </View>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#243842', textAlign: 'center', marginBottom: 8 }}>Datei löschen?</Text>
                            {fileToDelete && <Text style={{ fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22 }}>„{fileToDelete.title}" wird endgültig entfernt.</Text>}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{ flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: 18, alignItems: 'center' }}>
                                <Text style={{ fontWeight: '700', color: '#243842', fontSize: 16 }}>Abbrechen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmDeleteFile} style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 16, borderRadius: 18, alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}>
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
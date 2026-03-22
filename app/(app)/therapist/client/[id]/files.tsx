import { View, Text, TouchableOpacity, ActivityIndicator, TextInput, Modal, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '../../../../../hooks/useSafeBack';
import React, { Suspense, useMemo, useState } from 'react';
import i18n from '../../../../../utils/i18n';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { MotiView } from 'moti';
import { useAuth } from '../../../../../contexts/AuthContext';
import { FileUp, X, Trash2, FolderOpen, Search, Eye } from 'lucide-react-native';
import { SuccessAnimation } from '../../../../../components/ui/SuccessAnimation';
import { TherapistClientScreenHeader } from '../../../../../components/therapist/client/TherapistClientScreenHeader';
import {
    ClientFileRecord,
    formatClientFileSize,
    getClientFileDisplayInfo,
    getClientFilePreviewKind,
} from '../../../../../modules/clientFiles';
import { useClientFilesManager } from '../../../../../hooks/therapist/useClientFilesManager';

const LazyClientFilePreviewContent = React.lazy(() => import('../../../../../components/therapist/client/ClientFilePreviewContent'));

const FileCard = React.memo(({ file, index, onDeletePrompt, onPreview }: {
    file: ClientFileRecord;
    index: number;
    onDeletePrompt: (file: ClientFileRecord) => void;
    onPreview: (file: ClientFileRecord) => void;
}) => {
    const info = getClientFileDisplayInfo(file);
    const handleDelete = React.useCallback(() => onDeletePrompt(file), [file, onDeletePrompt]);
    const handlePreview = React.useCallback(() => onPreview(file), [file, onPreview]);

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 40).springify()}
            layout={Layout.springify()}
            style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E8E6E1', shadowColor: '#243842', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: info.bg, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: info.border, flexShrink: 0 }}>
                    <info.Icon size={28} color={info.color} />
                </View>

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
                            <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600' }}>· {formatClientFileSize(file.fileSize)}</Text>
                        ) : null}
                    </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginLeft: 12 }}>
                    {file.url ? (
                        <TouchableOpacity
                            onPress={handlePreview}
                            style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#F0F9FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BAE6FD' }}
                        >
                            <Eye size={18} color="#0EA5E9" />
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        onPress={handleDelete}
                        style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FECACA' }}
                    >
                        <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
});

export default function TherapistClientFilesScreen() {
    const goBack = useSafeBack();
    const { id } = useLocalSearchParams();
    const { profile } = useAuth();
    const clientId = typeof id === 'string' ? id : id?.[0];
    const {
        clientFiles,
        filteredFiles,
        loading,
        uploadingFile,
        searchQuery: search,
        setSearchQuery: setSearch,
        selectedAsset,
        clearSelectedAsset,
        pickDocument,
        uploadSelectedFile,
        removeFile,
    } = useClientFilesManager(clientId, profile?.id);

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newFileTitle, setNewFileTitle] = useState('');
    const [newFileDesc, setNewFileDesc] = useState('');
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<ClientFileRecord | null>(null);
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [selectedResourceForPreview, setSelectedResourceForPreview] = useState<ClientFileRecord | null>(null);
    const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });

    const previewKind = useMemo(
        () => selectedResourceForPreview ? getClientFilePreviewKind(selectedResourceForPreview) : null,
        [selectedResourceForPreview]
    );

    const handleDeletePrompt = React.useCallback((file: ClientFileRecord) => {
        setFileToDelete(file);
        setDeleteModalVisible(true);
    }, []);

    const handlePreview = React.useCallback((file: ClientFileRecord) => {
        setSelectedResourceForPreview(file);
        setPreviewModalVisible(true);
    }, []);

    const closePreviewModal = React.useCallback(() => {
        setPreviewModalVisible(false);
        setSelectedResourceForPreview(null);
    }, []);

    const handlePickDocument = async () => {
        const asset = await pickDocument();
        if (asset && !newFileTitle.trim()) {
            setNewFileTitle(asset.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const resetUploadForm = () => {
        clearSelectedAsset();
        setNewFileTitle('');
        setNewFileDesc('');
    };

    const handleUploadClientFile = async () => {
        if (!newFileTitle.trim()) {
            setToast({ visible: true, message: 'Fehler', subMessage: 'Bitte gib einen Titel fuer die Datei an.', type: 'warning' });
            return;
        }
        if (!selectedAsset) {
            setToast({ visible: true, message: 'Fehler', subMessage: 'Bitte waehle zuerst eine Datei aus.', type: 'warning' });
            return;
        }

        try {
            await uploadSelectedFile({
                title: newFileTitle.trim(),
                description: newFileDesc.trim(),
            });
            setToast({ visible: true, message: 'Hochgeladen!', subMessage: 'Klient wurde benachrichtigt.', type: 'success' });
            resetUploadForm();
            setShowUploadModal(false);
        } catch (error: any) {
            console.error('Upload error', error);
            setToast({ visible: true, message: 'Fehler', subMessage: error?.message || 'Upload fehlgeschlagen.', type: 'error' });
        }
    };

    const confirmDeleteFile = async () => {
        if (!fileToDelete) return;

        try {
            await removeFile(fileToDelete);
            setToast({ visible: true, message: 'Geloescht', type: 'success' });
        } catch (error) {
            console.error('Delete error', error);
            setToast({ visible: true, message: 'Fehler', subMessage: 'Datei konnte nicht geloescht werden.', type: 'error' });
        } finally {
            setDeleteModalVisible(false);
            setFileToDelete(null);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F9F8F6' }}>
            <TherapistClientScreenHeader
                clientId={clientId as string}
                title="Dateien"
                subtitle="Dokumente, PDFs und Materialien fuer diesen Verlauf."
                onBack={goBack}
                seedSuffix="files"
                actions={[
                    {
                        key: 'upload',
                        label: 'Hochladen',
                        icon: <FileUp size={16} color="#137386" />,
                        onPress: () => setShowUploadModal(true),
                        variant: 'white',
                    },
                ]}
                stats={[
                    { key: 'files', label: 'Dateien', value: clientFiles.length },
                ]}
            />

            {clientFiles.length > 0 ? (
                <View style={{ width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 18 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 }}>
                        <Search size={18} color="#94A3B8" />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Dateien durchsuchen..."
                            placeholderTextColor="#94A3B8"
                            style={{ flex: 1, marginLeft: 10, color: '#0F172A', fontSize: 15, fontWeight: '600' } as any}
                        />
                        {search.length > 0 ? (
                            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <X size={18} color="#94A3B8" />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            ) : null}

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#C09D59" />
                </View>
            ) : clientFiles.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 100 }} style={{ alignItems: 'center' }}>
                        <View style={{ width: 100, height: 100, borderRadius: 28, backgroundColor: '#FFF9EC', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#F5DFA0', borderStyle: 'dashed' }}>
                            <FolderOpen size={44} color="#C09D59" />
                        </View>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#243842', marginBottom: 10, textAlign: 'center' }}>Noch keine Dateien</Text>
                        <Text style={{ fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22, maxWidth: 280, fontWeight: '500', marginBottom: 32 }}>
                            Lade PDFs, Arbeitsblaetter oder andere Dokumente fuer den Klienten hoch.
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
                <Animated.FlatList
                    data={filteredFiles}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 24, paddingBottom: 120, maxWidth: 860, alignSelf: 'center', width: '100%' }}
                    itemLayoutAnimation={Layout.springify()}
                    ListEmptyComponent={(
                        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                            <Text style={{ fontSize: 15, color: '#94A3B8', fontWeight: '600' }}>Keine Dateien gefunden fuer "{search}"</Text>
                        </View>
                    )}
                    renderItem={({ item, index }: any) => (
                        <FileCard
                            file={item}
                            index={index}
                            onDeletePrompt={handleDeletePrompt}
                            onPreview={handlePreview}
                        />
                    )}
                    ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
                    showsVerticalScrollIndicator={false}
                />
            )}

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
                            <TouchableOpacity onPress={() => { setShowUploadModal(false); resetUploadForm(); }} style={{ backgroundColor: '#F1F5F9', padding: 10, borderRadius: 20 }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={handlePickDocument}
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
                                        <FolderOpen size={26} color="#16A34A" />
                                    </View>
                                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#16A34A', marginBottom: 2 }}>{selectedAsset.name}</Text>
                                    {selectedAsset.size ? <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '500' }}>{formatClientFileSize(selectedAsset.size)}</Text> : null}
                                    <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 8, fontWeight: '600' }}>Tippe um eine andere Datei zu waehlen</Text>
                                </>
                            ) : (
                                <>
                                    <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                        <FolderOpen size={26} color="#64748B" />
                                    </View>
                                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#243842', marginBottom: 4 }}>Datei auswaehlen</Text>
                                    <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '500' }}>PDF, Word, Excel, Bilder, Videos…</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Titel *</Text>
                        <TextInput
                            style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 18, padding: 16, marginBottom: 16, fontSize: 15, color: '#243842', fontWeight: '500' }}
                            placeholder="z.B. Arbeitsblatt Angstbewaeltigung"
                            placeholderTextColor="#94A3B8"
                            value={newFileTitle}
                            onChangeText={setNewFileTitle}
                        />

                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Beschreibung (Optional)</Text>
                        <TextInput
                            style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 18, padding: 16, marginBottom: 24, fontSize: 15, color: '#243842', fontWeight: '500', minHeight: 88, textAlignVertical: 'top' }}
                            placeholder="Kurze Info oder Anleitung fuer den Klienten..."
                            placeholderTextColor="#94A3B8"
                            value={newFileDesc}
                            onChangeText={setNewFileDesc}
                            multiline
                        />

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
                                    <Text style={{ fontWeight: '800', fontSize: 16, color: 'white' }}>Laedt hoch…</Text>
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

            <Modal visible={deleteModalVisible} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 }}>
                    <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: 'white', borderRadius: 36, padding: 40, width: '100%', maxWidth: 380 }}>
                        <View style={{ alignItems: 'center', marginBottom: 28 }}>
                            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Trash2 size={32} color="#EF4444" />
                            </View>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#243842', textAlign: 'center', marginBottom: 8 }}>Datei loeschen?</Text>
                            {fileToDelete ? <Text style={{ fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22 }}>"{fileToDelete.title}" wird endgueltig entfernt.</Text> : null}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{ flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: 18, alignItems: 'center' }}>
                                <Text style={{ fontWeight: '700', color: '#243842', fontSize: 16 }}>Abbrechen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmDeleteFile} style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 16, borderRadius: 18, alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}>
                                <Text style={{ fontWeight: '800', color: 'white', fontSize: 16 }}>Loeschen</Text>
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                </View>
            </Modal>

            <Modal
                visible={previewModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={closePreviewModal}
            >
                <View className="flex-1 bg-[#F9F8F6]">
                    <View className="bg-[#137386] flex-row items-center justify-between" style={{ paddingTop: Platform.OS === 'android' ? 56 : 64, paddingBottom: 24, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, zIndex: 10 }}>
                        <Text className="text-white text-[20px] font-black max-w-[80%]" numberOfLines={1}>
                            {selectedResourceForPreview?.title || selectedResourceForPreview?.originalName || 'Vorschau'}
                        </Text>
                        <TouchableOpacity onPress={closePreviewModal} className="w-10 h-10 bg-white/20 rounded-full items-center justify-center backdrop-blur-md">
                            <X size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-1">
                        {selectedResourceForPreview ? (
                            <Suspense fallback={(
                                <View className="flex-1 items-center justify-center">
                                    <ActivityIndicator size="large" color="#137386" />
                                </View>
                            )}>
                                <LazyClientFilePreviewContent
                                    file={selectedResourceForPreview}
                                    previewKind={previewKind || 'web'}
                                />
                            </Suspense>
                        ) : null}
                    </View>
                </View>
            </Modal>

            <SuccessAnimation
                visible={toast.visible}
                type={toast.type}
                message={toast.message}
                subMessage={toast.subMessage}
                onAnimationDone={() => setToast((prev) => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Library, PlusCircle, Search, X } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { SuccessAnimation } from '../../../components/ui/SuccessAnimation';
import { AddResourceModal } from '../../../components/therapist/resources/AddResourceModal';
import { AssignModal } from '../../../components/therapist/resources/AssignModal';
import { PreviewModal } from '../../../components/therapist/resources/PreviewModal';
import { ResourceCard } from '../../../components/therapist/resources/ResourceCard';
import { FILTER_OPTIONS, HEADER_IMAGES } from '../../../components/therapist/resources/ResourceDesign';
import { useTherapistClients } from '../../../hooks/therapist/useClients';
import { useTherapistResources } from '../../../hooks/therapist/useResources';

export default function TherapistResources() {
    const router = useRouter();
    const { profile } = useAuth();
    const { width } = useWindowDimensions();
    const headerImage = useMemo(() => HEADER_IMAGES[5], []);
    const contentMaxWidth = width >= 1200 ? 960 : width >= 900 ? 860 : undefined;

    const [addModalVisible, setAddModalVisible] = useState(false);
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [previewResource, setPreviewResource] = useState<any | null>(null);
    const [resourcesToAssign, setResourcesToAssign] = useState<any[]>([]);
    const [confirmModal, setConfirmModal] = useState<{ visible: boolean; title: string; message: string; onConfirm: () => void | Promise<void> }>({
        visible: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });
    const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: 'success' | 'error' | 'warning' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const { clients } = useTherapistClients(profile?.id);
    const {
        filteredResources,
        loading,
        saving,
        assigning,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
        saveLink: saveLinkAction,
        uploadResourceFile: uploadResourceFileAction,
        assignResources: assignResourcesAction,
        removeResource,
        togglePin: togglePinAction,
    } = useTherapistResources();

    const showToast = (message: string, subMessage: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setToast({ visible: true, message, subMessage, type });
    };

    const saveLink = async ({ title, description, linkUrl, tagsInput }: { title: string; description: string; linkUrl: string; tagsInput: string }) => {
        if (!title.trim() || !linkUrl.trim()) {
            showToast('Fehler', 'Bitte gib Titel und Link an.', 'error');
            return;
        }
        try {
            await saveLinkAction({ title, description, linkUrl, tagsInput });
            setAddModalVisible(false);
            showToast('Erfolg', 'Link wurde hinzugefuegt.', 'success');
        } catch (error) {
            console.error(error);
            showToast('Fehler', 'Speichern fehlgeschlagen.', 'error');
        }
    };

    const uploadResourceFile = async ({ title, description, tagsInput }: { title: string; description: string; tagsInput: string }) => {
        if (!title.trim()) {
            showToast('Fehler', 'Bitte gib einen Titel an.', 'error');
            return;
        }
        try {
            await uploadResourceFileAction({ title, description, tagsInput });
            setAddModalVisible(false);
            showToast('Erfolg', 'Datei wurde hochgeladen.', 'success');
        } catch (error) {
            console.error(error);
            showToast('Fehler', 'Upload fehlgeschlagen.', 'error');
        }
    };

    const assignResources = async (clientIds: string[]) => {
        if (!profile?.id || clientIds.length === 0) return;
        try {
            await assignResourcesAction(profile.id, clientIds, resourcesToAssign);
            setAssignModalVisible(false);
            setResourcesToAssign([]);
            showToast('Erfolg', `${resourcesToAssign.length} Ressource(n) wurden zugewiesen.`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Fehler', 'Zuweisung fehlgeschlagen.', 'error');
        }
    };

    const handleDelete = (resource: any) => {
        setConfirmModal({
            visible: true,
            title: 'Ressource loeschen',
            message: `Moechtest du "${resource.title}" wirklich loeschen?`,
            onConfirm: async () => {
                try {
                    await removeResource(resource);
                    showToast('Erfolg', 'Ressource wurde geloescht.', 'success');
                } catch (error) {
                    console.error(error);
                    showToast('Fehler', 'Loeschen fehlgeschlagen.', 'error');
                } finally {
                    setConfirmModal((prev) => ({ ...prev, visible: false }));
                }
            },
        });
    };

    const togglePin = async (resource: any) => {
        try {
            await togglePinAction(resource);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F4F1EA' }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
                <View style={{ backgroundColor: '#243842', borderBottomLeftRadius: 42, borderBottomRightRadius: 42, overflow: 'hidden' }}>
                    <Image source={headerImage} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
                    <LinearGradient colors={['rgba(19,34,45,0.26)', 'rgba(19,34,45,0.78)']} style={{ position: 'absolute', inset: 0 }} />
                    <View style={{ paddingTop: Platform.OS === 'android' ? 54 : 68, paddingBottom: 30, paddingHorizontal: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <TouchableOpacity onPress={() => router.push('/(app)/therapist' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
                                <ArrowLeft size={16} color="#FFFFFF" />
                                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Zurueck</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setAddModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }}>
                                <PlusCircle size={16} color="#FFFFFF" />
                                <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>Hinzufuegen</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.8, marginBottom: 4 }}>Bibliothek</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, fontWeight: '700', marginBottom: 22 }}>Ressourcen und Materialien fuer deine Klienten verwalten.</Text>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', flexDirection: 'row', alignItems: 'center' }}>
                            <Search size={18} color="rgba(255,255,255,0.76)" />
                            <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Bibliothek durchsuchen..." placeholderTextColor="rgba(255,255,255,0.48)" style={{ flex: 1, marginLeft: 12, color: '#FFFFFF', fontSize: 16, fontWeight: '700' } as any} />
                            {searchQuery ? (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={14} color="#FFFFFF" />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>
                </View>

                <View style={[contentMaxWidth ? { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' } : undefined, { paddingHorizontal: 20, paddingTop: 24 }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8, marginBottom: 20 }}>
                        {FILTER_OPTIONS.map((filter) => {
                            const active = activeFilter === filter.key;
                            return (
                                <TouchableOpacity key={filter.key} onPress={() => setActiveFilter(filter.key)} style={{ paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, backgroundColor: active ? '#243842' : '#FFFFFF', borderWidth: 1, borderColor: active ? '#243842' : 'rgba(36,56,66,0.08)' }}>
                                    <Text style={{ color: active ? '#FFFFFF' : '#6B7C85', fontWeight: '900' }}>{filter.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {loading ? (
                        <View style={{ paddingVertical: 72, alignItems: 'center' }}><ActivityIndicator size="large" color="#137386" /></View>
                    ) : filteredResources.length === 0 ? (
                        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 30, padding: 30, borderWidth: 1, borderColor: 'rgba(36,56,66,0.07)', alignItems: 'center' }}>
                            <View style={{ width: 78, height: 78, borderRadius: 28, backgroundColor: '#F7F4EE', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                                <Library size={34} color="#243842" />
                            </View>
                            <Text style={{ color: '#243842', fontSize: 22, fontWeight: '900', marginBottom: 8 }}>Keine Ressourcen</Text>
                            <Text style={{ color: '#6B7C85', fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 360 }}>{searchQuery ? 'Keine Ergebnisse fuer deine Suche.' : 'Fuege deine erste Ressource hinzu.'}</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 16 }}>
                            {filteredResources.map((resource: any, index: number) => (
                                <ResourceCard
                                    key={resource.id}
                                    resource={resource}
                                    index={index}
                                    onDelete={handleDelete}
                                    onPreview={setPreviewResource}
                                    onAssign={(entry) => {
                                        setResourcesToAssign([entry]);
                                        setAssignModalVisible(true);
                                    }}
                                    onTogglePin={togglePin}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            <AddResourceModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} onSaveLink={saveLink} onUploadFile={uploadResourceFile} loading={saving} />
            <AssignModal visible={assignModalVisible} onClose={() => setAssignModalVisible(false)} clients={clients} onConfirm={assignResources} loading={assigning} />
            <PreviewModal resource={previewResource} onClose={() => setPreviewResource(null)} />
            <ConfirmModal visible={confirmModal.visible} title={confirmModal.title} message={confirmModal.message} confirmText="Loeschen" cancelText="Abbrechen" isDestructive onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))} />
            <SuccessAnimation visible={toast.visible} type={toast.type} message={toast.message} subMessage={toast.subMessage} onAnimationDone={() => setToast((prev) => ({ ...prev, visible: false }))} />
        </View>
    );
}

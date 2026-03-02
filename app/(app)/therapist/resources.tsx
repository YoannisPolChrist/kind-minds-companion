import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { collection, addDoc, query, getDocs, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../utils/firebase';
import i18n from '../../../utils/i18n';
import { MotiView } from 'moti';
import { FileText, Link as LinkIcon, Trash2, PlusCircle, UploadCloud, ChevronLeft, Send, X, FileVideo, FileImage } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { SuccessAnimation } from '../../../components/ui/SuccessAnimation';

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

    // Assignment State
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedResourceForAssign, setSelectedResourceForAssign] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchResources();
        fetchClientsForAssignment();
    }, []);

    const fetchClientsForAssignment = async () => {
        try {
            const q = query(collection(db, "users"), where("role", "==", "client"));
            const querySnapshot = await getDocs(q);
            const rawClients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setClients(rawClients);
        } catch (e) {
            console.error("Error fetching clients for modal", e);
        }
    };

    const fetchResources = async () => {
        try {
            const q = query(collection(db, "resources"));
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
            if (Platform.OS === 'web') window.alert("Bitte gib einen Titel an.");
            else Alert.alert("Fehler", "Bitte gib einen Titel an.");
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

            // Upload to Firebase Storage
            const response = await fetch(fileUri);
            const blob = await response.blob();
            const filename = `resources/${Date.now()}_${asset.name}`;
            const storageRef = ref(storage, filename);

            await uploadBytes(storageRef, blob);
            const downloadUrl = await getDownloadURL(storageRef);

            // Save to Firestore
            await addDoc(collection(db, "resources"), {
                title,
                description,
                type: fileIconType,
                url: downloadUrl,
                storagePath: filename,
                originalName: asset.name,
                createdAt: serverTimestamp()
            });

            if (Platform.OS === 'web') window.alert("Datei wurde erfolgreich hochgeladen.");
            else Alert.alert("Erfolg", "Datei wurde erfolgreich hochgeladen.");
            resetForm();
            fetchResources();
        } catch (err) {
            console.error(err);
            if (Platform.OS === 'web') window.alert("Upload fehlgeschlagen.");
            else Alert.alert("Fehler", "Upload fehlgeschlagen.");
        } finally {
            setUploading(false);
        }
    };

    const handleAddLink = async () => {
        if (!title || !linkUrl) {
            if (Platform.OS === 'web') window.alert("Bitte gib Titel und Link an.");
            else Alert.alert("Fehler", "Bitte gib Titel und Link an.");
            return;
        }

        setUploading(true);
        try {
            await addDoc(collection(db, "resources"), {
                title,
                description,
                type: 'link',
                url: linkUrl,
                createdAt: serverTimestamp()
            });

            if (Platform.OS === 'web') window.alert("Link wurde erfolgreich hinzugefügt.");
            else Alert.alert("Erfolg", "Link wurde erfolgreich hinzugefügt.");
            resetForm();
            fetchResources();
        } catch (err) {
            console.error(err);
            if (Platform.OS === 'web') window.alert("Speichern fehlgeschlagen.");
            else Alert.alert("Fehler", "Speichern fehlgeschlagen.");
        } finally {
            setUploading(false);
        }
    };

    const openAssignModal = (resource: any) => {
        setSelectedResourceForAssign(resource);
        setAssignModalVisible(true);
    };

    const confirmAssignToClient = async (clientId: string) => {
        if (!selectedResourceForAssign) return;
        try {
            await addDoc(collection(db, "client_resources"), {
                clientId: clientId,
                therapistId: profile?.id || "unknown",
                title: selectedResourceForAssign.title,
                description: selectedResourceForAssign.description || '',
                type: selectedResourceForAssign.type,
                url: selectedResourceForAssign.url,
                originalName: selectedResourceForAssign.originalName || null,
                storagePath: selectedResourceForAssign.storagePath || null,
                createdAt: serverTimestamp()
            });

            await addDoc(collection(db, "notifications"), {
                clientId: clientId,
                type: 'FILE_UPLOAD',
                message: i18n.t('therapist.new_file_notification', { defaultValue: 'Hey, für dich wurde eine neue Datei hinterlegt!' }),
                read: false,
                createdAt: serverTimestamp()
            });

            setAssignModalVisible(false);
            setSuccessMessage(`"${selectedResourceForAssign.title}" wurde erfolgreich zugewiesen.`);
            setShowSuccess(true);
        } catch (e) {
            if (Platform.OS === 'web') window.alert("Zuweisung fehlgeschlagen.");
            else Alert.alert("Fehler", "Zuweisung fehlgeschlagen.");
            console.error(e);
        }
    };

    const handleDelete = async (item: any) => {
        if (Platform.OS === 'web') {
            if (window.confirm(`Möchtest du "${item.title}" wirklich löschen?`)) {
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
                } catch (err) {
                    window.alert("Konnte nicht gelöscht werden.");
                }
            }
            return;
        }

        Alert.alert(
            "Löschen",
            `Möchtest du "${item.title}" wirklich löschen?`,
            [
                { text: "Abbrechen", style: "cancel" },
                {
                    text: "Löschen",
                    style: "destructive",
                    onPress: async () => {
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
                        } catch (err) {
                            Alert.alert("Fehler", "Konnte nicht gelöscht werden.");
                        }
                    }
                }
            ]
        );
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setLinkUrl('');
    };

    return (
        <View className="flex-1 bg-[#F9F8F6]">
            {/* Header */}
            <View className="bg-[#137386] pt-16 pb-8 px-6 rounded-b-[40px] shadow-md z-10 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()} className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                    <ChevronLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text className="text-2xl font-extrabold text-white flex-1 text-right ml-4">
                    Ressourcen
                </Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 60 }}>
                {/* Add Resource */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 300, delay: 100 }}
                    className="bg-white p-6 rounded-[32px] border border-[#E8E6E1] mb-8"
                    style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 6 }}
                >
                    <View className="flex-row items-center mb-6">
                        <View className="w-10 h-10 rounded-full bg-teal-50 items-center justify-center mr-3">
                            <PlusCircle color="#137386" size={22} />
                        </View>
                        <Text className="text-xl font-black text-[#243842]">Ressource hinzufügen</Text>
                    </View>

                    {/* Tabs */}
                    <View className="flex-row gap-3 mb-6 bg-[#F9F8F6] p-1.5 rounded-2xl border border-[#E8E6E1]">
                        <TouchableOpacity
                            onPress={() => setResourceType('file')}
                            className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${resourceType === 'file' ? 'bg-white shadow-sm border border-[#E8E6E1]' : 'border border-transparent'}`}
                        >
                            <FileText size={18} color={resourceType === 'file' ? '#137386' : '#9CA3AF'} />
                            <Text className={`font-bold ${resourceType === 'file' ? 'text-[#137386]' : 'text-gray-500'}`}>Datei</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setResourceType('link')}
                            className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${resourceType === 'link' ? 'bg-white shadow-sm border border-[#E8E6E1]' : 'border border-transparent'}`}
                        >
                            <LinkIcon size={18} color={resourceType === 'link' ? '#137386' : '#9CA3AF'} />
                            <Text className={`font-bold ${resourceType === 'link' ? 'text-[#137386]' : 'text-gray-500'}`}>Web Link</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mb-4">
                        <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Titel der Ressource</Text>
                        <TextInput
                            placeholder="Z.B. Arbeitsblatt Entspannung"
                            placeholderTextColor="#9CA3AF"
                            value={title}
                            onChangeText={setTitle}
                            className="bg-[#F9F8F6] border border-[#E8E6E1] p-4 rounded-2xl font-bold text-[#243842] text-base"
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Kurze Beschreibung (optional)</Text>
                        <TextInput
                            placeholder="Z.B. Eine einfache Atemübung für den Alltag"
                            placeholderTextColor="#9CA3AF"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            className="bg-[#F9F8F6] border border-[#E8E6E1] p-4 rounded-2xl text-[#6B7C85] text-base min-h-[80px]"
                            textAlignVertical="top"
                        />
                    </View>

                    {resourceType === 'link' && (
                        <View className="mb-4">
                            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">URL</Text>
                            <TextInput
                                placeholder="https://..."
                                placeholderTextColor="#9CA3AF"
                                value={linkUrl}
                                onChangeText={setLinkUrl}
                                autoCapitalize="none"
                                keyboardType="url"
                                className="bg-[#F9F8F6] border border-[#E8E6E1] p-4 rounded-2xl text-[#243842] text-base font-medium"
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={resourceType === 'file' ? handleUploadFile : handleAddLink}
                        disabled={uploading}
                        className={`py-4 mt-2 rounded-2xl flex-row justify-center items-center ${uploading ? 'bg-gray-300' : 'bg-[#137386]'}`}
                        style={{ shadowColor: '#137386', shadowOffset: { width: 0, height: 4 }, shadowOpacity: uploading ? 0 : 0.3, shadowRadius: 8, elevation: uploading ? 0 : 4 }}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#fff" className="mr-2" />
                        ) : (
                            resourceType === 'file' ? <UploadCloud color="#fff" size={20} className="mr-2" /> : <LinkIcon color="#fff" size={20} className="mr-2" />
                        )}
                        <Text className="text-white font-black text-base tracking-wide">
                            {uploading ? 'Speichern...' : resourceType === 'file' ? 'Datei Auswählen & Hochladen' : 'Link Speichern'}
                        </Text>
                    </TouchableOpacity>
                </MotiView>

                {/* Resource List */}
                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">Verfügbare Ressourcen</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#137386" className="mt-8" />
                ) : resources.length === 0 ? (
                    <View className="items-center justify-center py-12 bg-white rounded-[32px] border-2 border-[#E8E6E1] border-dashed mb-8">
                        <FileText size={48} color="#CBD5E1" strokeWidth={1.5} />
                        <Text className="text-gray-400 font-bold mt-4 text-center px-8">Noch keine Ressourcen vorhanden.{'\n'}Füge Arbeitsblätter oder Links hinzu.</Text>
                    </View>
                ) : (
                    resources.map((item, index) => (
                        <MotiView
                            key={item.id}
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 200 + (index * 50) }}
                            className="bg-white p-5 rounded-[24px] border border-[#E8E6E1] mb-4 flex-row justify-between items-center"
                            style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}
                        >
                            <View className="flex-1 pr-4 flex-row items-center">
                                <View className={`w-12 h-12 rounded-[16px] items-center justify-center mr-4 ${item.type === 'link' ? 'bg-blue-50' : 'bg-red-50'}`}>
                                    {item.type === 'link' ? <LinkIcon color="#3B82F6" size={24} /> : 
                                     item.type === 'video' ? <FileVideo color="#EF4444" size={24} /> :
                                     item.type === 'image' ? <FileImage color="#EF4444" size={24} /> :
                                     <FileText color="#EF4444" size={24} />}
                                </View>
                                <View className="flex-1">
                                    <Text className="font-bold text-[#243842] text-base">{item.title}</Text>
                                    {item.description ? (
                                        <Text className="text-[#6B7C85] text-sm mt-1" numberOfLines={2}>{item.description}</Text>
                                    ) : null}
                                </View>
                            </View>
                            <View className="flex-col gap-2">
                                <TouchableOpacity onPress={() => handleDelete(item)} className="bg-red-50 w-11 h-11 rounded-[16px] items-center justify-center border border-red-100/50">
                                    <Trash2 color="#EF4444" size={20} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => openAssignModal(item)} className="bg-[#137386] w-11 h-11 rounded-[16px] items-center justify-center shadow-sm" style={{ shadowColor: '#137386', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 2 }}>
                                    <Send size={16} color="white" style={{ marginLeft: -2 }} />
                                </TouchableOpacity>
                            </View>
                        </MotiView>
                    ))
                )}
            </ScrollView>

            {/* Assignment Modal */}
            <Modal visible={assignModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/40 p-4">
                    <MotiView
                        from={{ opacity: 0, scale: 0.95, translateY: 20 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
                        style={{ backgroundColor: 'white' }}
                    >
                        <View className="bg-gray-50/50 p-6 border-b border-gray-100 flex-row justify-between items-center">
                            <Text className="text-[20px] font-black text-[#243842] tracking-tight">Ressource Zuweisen</Text>
                            <TouchableOpacity onPress={() => setAssignModalVisible(false)} className="bg-white shadow-sm p-2.5 rounded-full border border-gray-100">
                                <X size={20} color="#243842" />
                            </TouchableOpacity>
                        </View>

                        <View className="p-6">
                            <Text className="text-[#243842]/60 font-medium text-[15px] mb-6 leading-relaxed">
                                Wem möchtest du die Ressource <Text className="font-bold text-[#137386]">"{selectedResourceForAssign?.title}"</Text> zuweisen?
                            </Text>

                            <FlatList
                                data={clients}
                                keyExtractor={(c) => c.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => confirmAssignToClient(item.id)}
                                        className="bg-white p-5 rounded-[20px] border border-gray-100 mb-3 flex-row items-center justify-between"
                                        style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 1 }}
                                    >
                                        <View className="flex-row items-center">
                                            <View className="w-10 h-10 bg-[#137386]/10 rounded-full items-center justify-center mr-3">
                                                <Text className="text-[#137386] font-bold">{item.firstName?.charAt(0)}{item.lastName?.charAt(0)}</Text>
                                            </View>
                                            <Text className="font-black text-[#243842] text-[16px]">{item.firstName} {item.lastName}</Text>
                                        </View>
                                        <View className="bg-[#137386] w-9 h-9 rounded-full items-center justify-center opacity-90">
                                            <Send size={14} color="#ffffff" style={{ marginLeft: -2 }} />
                                        </View>
                                    </TouchableOpacity>
                                )}
                                style={{ maxHeight: 300 }}
                                showsVerticalScrollIndicator={false}
                            />
                        </View>
                    </MotiView>
                </View>
            </Modal>

            <SuccessAnimation
                visible={showSuccess}
                message={successMessage}
                onAnimationDone={() => setShowSuccess(false)}
            />
        </View>
    );
}

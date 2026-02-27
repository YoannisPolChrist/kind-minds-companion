import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { collection, addDoc, query, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../utils/firebase';
import i18n from '../../../utils/i18n';
import { MotiView } from 'moti';

export default function TherapistResources() {
    const router = useRouter();
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // New Resource State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [resourceType, setResourceType] = useState<'pdf' | 'link'>('pdf');

    useEffect(() => {
        fetchResources();
    }, []);

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

    const handleUploadPdf = async () => {
        if (!title) {
            Alert.alert("Fehler", "Bitte gib einen Titel an.");
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            setUploading(true);
            const asset = result.assets[0];
            const fileUri = asset.uri;

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
                type: 'pdf',
                url: downloadUrl,
                storagePath: filename,
                createdAt: serverTimestamp()
            });

            Alert.alert("Erfolg", "Dokument wurde erfolgreich hochgeladen.");
            resetForm();
            fetchResources();
        } catch (err) {
            console.error(err);
            Alert.alert("Fehler", "Upload fehlgeschlagen.");
        } finally {
            setUploading(false);
        }
    };

    const handleAddLink = async () => {
        if (!title || !linkUrl) {
            Alert.alert("Fehler", "Bitte gib Titel und Link an.");
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

            Alert.alert("Erfolg", "Link wurde erfolgreich hinzugefügt.");
            resetForm();
            fetchResources();
        } catch (err) {
            console.error(err);
            Alert.alert("Fehler", "Speichern fehlgeschlagen.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (item: any) => {
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
                            if (item.type === 'pdf' && item.storagePath) {
                                const storageRef = ref(storage, item.storagePath);
                                try {
                                    await deleteObject(storageRef);
                                } catch (e) {
                                    console.warn("Konnte Datei im Storage nicht löschen (vielleicht schon weg?)", e);
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
            <View className="bg-[#137386] pt-16 pb-6 px-6 rounded-b-[40px] shadow-md z-10 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2.5 rounded-2xl backdrop-blur-md">
                    <Text className="text-white font-bold">{i18n.t('exercise.back') || 'Zurück'}</Text>
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
                    className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-8"
                >
                    <Text className="text-xl font-bold text-[#243842] mb-4">Neue Ressource hinzufügen</Text>

                    <View className="flex-row gap-2 mb-4">
                        <TouchableOpacity
                            onPress={() => setResourceType('pdf')}
                            className={`flex-1 py-2 rounded-xl items-center border ${resourceType === 'pdf' ? 'bg-[#243842] border-[#243842]' : 'bg-gray-50 border-gray-200'}`}
                        >
                            <Text className={`font-bold ${resourceType === 'pdf' ? 'text-white' : 'text-gray-500'}`}>PDF Upload</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setResourceType('link')}
                            className={`flex-1 py-2 rounded-xl items-center border ${resourceType === 'link' ? 'bg-[#243842] border-[#243842]' : 'bg-gray-50 border-gray-200'}`}
                        >
                            <Text className={`font-bold ${resourceType === 'link' ? 'text-white' : 'text-gray-500'}`}>Web Link</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        placeholder="Titel der Ressource"
                        value={title}
                        onChangeText={setTitle}
                        className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-3 font-medium text-[#2C3E50]"
                    />

                    <TextInput
                        placeholder="Kurze Beschreibung (optional)"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-3 text-[#2C3E50]"
                    />

                    {resourceType === 'link' && (
                        <TextInput
                            placeholder="https://..."
                            value={linkUrl}
                            onChangeText={setLinkUrl}
                            autoCapitalize="none"
                            keyboardType="url"
                            className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-4 text-[#2C3E50]"
                        />
                    )}

                    <TouchableOpacity
                        onPress={resourceType === 'pdf' ? handleUploadPdf : handleAddLink}
                        disabled={uploading}
                        className={`py-4 flex-row justify-center items-center rounded-xl shadow-sm ${uploading ? 'bg-gray-400' : 'bg-[#137386]'}`}
                    >
                        {uploading && <ActivityIndicator color="#fff" className="mr-2" />}
                        <Text className="text-white font-bold text-base">
                            {uploading ? 'Wird gespeichert...' : resourceType === 'pdf' ? 'PDF Auswählen & Hochladen' : 'Link Speichern'}
                        </Text>
                    </TouchableOpacity>
                </MotiView>

                {/* Resource List */}
                <Text className="text-xl font-bold text-[#243842] mb-4">Verfügbare Ressourcen</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#137386" />
                ) : resources.length === 0 ? (
                    <Text className="text-gray-500 text-center italic mt-4">Noch keine Ressourcen vorhanden.</Text>
                ) : (
                    resources.map((item, index) => (
                        <MotiView
                            key={item.id}
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 200 + (index * 50) }}
                            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-3 flex-row justify-between items-center"
                        >
                            <View className="flex-1 pr-4 flex-row items-center">
                                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${item.type === 'pdf' ? 'bg-red-50' : 'bg-blue-50'}`}>
                                    <Text>{item.type === 'pdf' ? '📄' : '🔗'}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="font-bold text-[#2C3E50]">{item.title}</Text>
                                    {item.description ? (
                                        <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={2}>{item.description}</Text>
                                    ) : null}
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => handleDelete(item)} className="bg-red-50 p-2 rounded-xl">
                                <Text className="text-red-500">🗑️</Text>
                            </TouchableOpacity>
                        </MotiView>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, Dimensions, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { addDoc, collection, serverTimestamp, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { storage, db } from '../../../../utils/firebase';
import { ExerciseRepository } from '../../../../utils/repositories/ExerciseRepository';
import { ClientRepository } from '../../../../utils/repositories/ClientRepository';
import { NoteRepository } from '../../../../utils/repositories/NoteRepository';
import ExerciseBuilder, { ExerciseBlock } from '../../../../components/therapist/ExerciseBuilder';
import { VoiceNoteTaker } from '../../../../components/therapist/VoiceNoteTaker';
import i18n from '../../../../utils/i18n';
import { ClipboardList, Trash2, Sparkles, Activity, Edit3, Lock, FileUp, FileText, Link as LinkIcon, Download } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useAuth } from '../../../../contexts/AuthContext';

export default function ClientView() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { profile } = useAuth();

    const [client, setClient] = useState<any>(null);
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBuilder, setShowBuilder] = useState(false);

    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [recurrence, setRecurrence] = useState<string>('none');
    const [reminderFrequency, setReminderFrequency] = useState<string>('none');
    const [builderMode, setBuilderMode] = useState<'select' | 'build'>('select');
    const [notes, setNotes] = useState<any[]>([]);

    // File Upload State
    const [clientFiles, setClientFiles] = useState<any[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newFileTitle, setNewFileTitle] = useState('');
    const [newFileDesc, setNewFileDesc] = useState('');

    useEffect(() => {
        if (id) {
            fetchClientData();
            fetchExercises();
            fetchTemplates();
            fetchNotes();
            fetchClientFiles();
        }
    }, [id]);

    // ─── Data Fetching (via Repositories) ────────────────────────────────────────

    const fetchClientData = async () => {
        const c = await ClientRepository.findById(id as string);
        if (c) setClient(c);
    };

    const fetchExercises = async () => {
        try {
            const data = await ExerciseRepository.findByClientId(id as string);
            setExercises(data);
        } finally {
            setLoading(false);
        }
    };

    const fetchClientFiles = async () => {
        try {
            const q = query(
                collection(db, 'client_resources'),
                where('clientId', '==', id)
            );
            const snap = await getDocs(q);
            const files = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            files.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setClientFiles(files);
        } catch (error) {
            console.error('Error fetching client files', error);
        }
    };

    const fetchNotes = async () => {
        const data = await NoteRepository.findByClientId(id as string);
        setNotes(data);
    };

    const fetchTemplates = async () => {
        try {
            const { getDocs, query, collection, limit } = await import('firebase/firestore');
            const { db } = await import('../../../../utils/firebase');
            const q = query(collection(db, 'exercise_templates'), limit(30));
            const snap = await getDocs(q);
            setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching templates', error);
        }
    };

    const handleOpenModal = () => {
        setShowBuilder(true);
        setBuilderMode('select');
        setSelectedTemplate(null);
        setRecurrence('none');
        setReminderFrequency('none');
    };

    const handleSaveNote = async (text: string) => {
        try {
            await NoteRepository.create({ clientId: id as string, content: text });
            Alert.alert('Erfolg', 'AI Note wurde erfolgreich gespeichert.');
            fetchNotes();
        } catch (err) {
            Alert.alert('Fehler', 'Note konnte nicht gespeichert werden.');
        }
    };

    const deleteExercise = async (exerciseId: string, title: string) => {
        Alert.alert(
            i18n.t('therapist.delete_title'),
            i18n.t('therapist.delete_msg', { title }),
            [
                { text: i18n.t('therapist.cancel'), style: 'cancel' },
                {
                    text: i18n.t('exercise.complete') || 'Löschen',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ExerciseRepository.archive(exerciseId);
                            setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
                        } catch {
                            Alert.alert('Fehler', i18n.t('therapist.delete_err'));
                        }
                    }
                }
            ]
        );
    };

    const handleUploadClientFile = async () => {
        if (!newFileTitle) {
            Alert.alert("Fehler", "Bitte gib einen Titel für die Datei an.");
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

            setUploadingFile(true);
            const asset = result.assets[0];
            const fileUri = asset.uri;

            const response = await fetch(fileUri);
            const blob = await response.blob();
            const filename = `client_resources/${id}/${Date.now()}_${asset.name}`;
            const storageRef = ref(storage, filename);

            await uploadBytes(storageRef, blob);
            const downloadUrl = await getDownloadURL(storageRef);

            // Save to Firestore client_resources
            await addDoc(collection(db, "client_resources"), {
                clientId: id,
                therapistId: profile?.id || "unknown",
                title: newFileTitle,
                description: newFileDesc,
                type: 'document',
                url: downloadUrl,
                originalName: asset.name,
                storagePath: filename,
                createdAt: serverTimestamp()
            });

            // Create Notification for the client
            await addDoc(collection(db, "notifications"), {
                clientId: id,
                type: 'FILE_UPLOAD',
                message: i18n.t('therapist.new_file_notification', { defaultValue: 'Hey, für dich wurde eine neue Datei hinterlegt!' }),
                read: false,
                createdAt: serverTimestamp()
            });

            Alert.alert("Erfolg", "Datei wurde erfolgreich hochgeladen und der Klient benachrichtigt.");
            setNewFileTitle('');
            setNewFileDesc('');
            setShowUploadModal(false);
            fetchClientFiles();
        } catch (err) {
            console.error("Upload error", err);
            Alert.alert("Fehler", "Upload fehlgeschlagen.");
        } finally {
            setUploadingFile(false);
        }
    };

    const deleteClientFile = async (item: any) => {
        Alert.alert(
            "Datei löschen",
            `Möchtest du "${item.title}" wirklich löschen?`,
            [
                { text: "Abbrechen", style: "cancel" },
                {
                    text: "Löschen",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (item.storagePath) {
                                const storageRef = ref(storage, item.storagePath);
                                try {
                                    await deleteObject(storageRef);
                                } catch (e) {
                                    console.warn("Storage deletion error", e);
                                }
                            }
                            await deleteDoc(doc(db, "client_resources", item.id));
                            setClientFiles(prev => prev.filter(f => f.id !== item.id));
                        } catch (err) {
                            Alert.alert("Fehler", "Konnte die Datei nicht löschen.");
                        }
                    }
                }
            ]
        );
    };

    const saveExercise = async (title: string, blocks: ExerciseBlock[]) => {
        try {
            // Upload media blocks first
            const processedBlocks = await Promise.all(blocks.map(async (block) => {
                if (block.type === 'media' && block.mediaUri && !block.mediaUri.startsWith('http')) {
                    try {
                        const response = await fetch(block.mediaUri);
                        const blob = await response.blob();
                        const filename = block.mediaUri.substring(block.mediaUri.lastIndexOf('/') + 1);
                        const ext = filename.split('.').pop() || (block.mediaType === 'video' ? 'mp4' : 'jpg');
                        const storageRef = ref(storage, `exercise_media/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`);

                        await uploadBytes(storageRef, blob);
                        const downloadUrl = await getDownloadURL(storageRef);
                        return { ...block, mediaUri: downloadUrl };
                    } catch (uploadError) {
                        console.error("Error uploading media:", uploadError);
                        throw new Error(i18n.t('therapist.err_upload'));
                    }
                }
                return block;
            }));

            const exerciseData = {
                clientId: id,
                therapistId: profile?.id || "unknown", // Prevent undefined
                title,
                blocks: processedBlocks,
                recurrence: recurrence || 'none',
                reminderFrequency: reminderFrequency || 'none',
                createdAt: serverTimestamp(),
                completed: false,
            };

            await addDoc(collection(db, "exercises"), exerciseData);
            setShowBuilder(false);
            setSelectedTemplate(null);
            fetchExercises(); // Refresh the list
            Alert.alert("Erfolg", i18n.t('therapist.success_assigned'));
        } catch (error: any) {
            console.error("Error saving exercise", error);
            Alert.alert("Fehler", error.message || "Übung konnte nicht gespeichert werden.");
        }
    };

    const confirmTemplateAssignment = () => {
        if (!selectedTemplate) {
            Alert.alert("Fehler", "Bitte wähle eine Vorlage aus.");
            return;
        }
        saveExercise(selectedTemplate.title, selectedTemplate.blocks);
    }

    const triggerTelegramWebhook = async (exercise: any) => {
        Alert.alert(
            "Telegram Erinnerung senden",
            `Möchtest du dem Klienten eine Erinnerung für "${exercise.title}" senden? (Dies löst den Activepieces Webhook aus)`,
            [
                { text: "Abbrechen", style: "cancel" },
                {
                    text: "Senden",
                    onPress: async () => {
                        try {
                            // TODO: Replace with the actual Activepieces Webhook URL once created
                            const webhookUrl = "https://cloud.activepieces.com/api/v1/webhooks/PLACEHOLDER";
                            const response = await fetch(webhookUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    clientId: id,
                                    clientName: client?.firstName || 'Klient',
                                    exerciseId: exercise.id,
                                    exerciseTitle: exercise.title
                                })
                            });

                            if (response.ok || response.type === 'opaque') {
                                Alert.alert("Erfolg", "Erinnerung wurde gesendet.");
                            } else {
                                Alert.alert("Hinweis", "Webhook wurde angesprochen, aber Activepieces hat mit einem Fehler geantwortet. Bitte prüfe den Flow.");
                            }
                        } catch (error) {
                            console.error("Error triggering webhook", error);
                            // It's common for no-cors/fire-and-forget webhooks to throw CORS errors in web dev mode, so we treat it softly
                            Alert.alert("Webhook gesendet", "Die Anfrage wurde verschickt. Bitte überprüfe Activepieces auf neue Runs.");
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#FAF9F6]">
                <ActivityIndicator size="large" color="#2C3E50" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#FAF9F6]">
            {/* Header Section */}
            <View className="bg-[#2C3E50] pt-16 pb-8 px-6 rounded-b-3xl shadow-md z-10">
                <View className="flex-row items-center justify-between w-full max-w-5xl mx-auto">
                    <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md">
                        <Text className="text-white font-bold">{i18n.t('exercise.back')}</Text>
                    </TouchableOpacity>
                    <View className="flex-row items-center flex-1 justify-end ml-4">
                        <View className="bg-white/10 w-10 h-10 rounded-full items-center justify-center mr-3 border border-white/20">
                            {client?.photoURL ? (
                                <Text className="text-white text-xs">PIC</Text> // Placeholder if we get real images later
                            ) : (
                                <Text className="text-white font-bold text-lg">
                                    {client?.firstName?.charAt(0)}{client?.lastName?.charAt(0)}
                                </Text>
                            )}
                        </View>
                        <Text className="text-xl font-extrabold text-white" numberOfLines={1}>
                            {client?.firstName ? `${client.firstName} ${client.lastName}` : i18n.t('therapist.client_details')}
                        </Text>
                    </View>
                </View>
            </View>

            <View className="flex-1 px-6 pt-6 w-full max-w-5xl mx-auto">
                <VoiceNoteTaker onTranscriptionComplete={handleSaveNote} />

                {notes.length > 0 && (
                    <View className="mb-6">
                        <Text className="text-xl font-bold text-[#2C3E50] mb-3">Letzte Session Notes</Text>
                        {notes.map(note => (
                            <View key={note.id} className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 mb-3">
                                <Text className="text-xs text-blue-400 font-bold mb-2 uppercase tracking-wide">
                                    {new Date(note.createdAt).toLocaleDateString(i18n.locale, { day: '2-digit', month: 'long', year: 'numeric' })}
                                </Text>
                                <Text className="text-[#2C3E50] leading-5">{note.content}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Client Files Section */}
                <View className="mb-6">
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-xl font-bold text-[#2C3E50]">Hinterlegte Dateien</Text>
                        <TouchableOpacity
                            onPress={() => setShowUploadModal(true)}
                            className="bg-[#137386] px-4 py-2 rounded-xl flex-row items-center shadow-sm"
                        >
                            <FileUp size={16} color="white" style={{ marginRight: 6 }} />
                            <Text className="text-white font-bold text-sm">Datei hochladen</Text>
                        </TouchableOpacity>
                    </View>

                    {clientFiles.length === 0 ? (
                        <View className="bg-gray-50 border border-gray-100 p-5 rounded-3xl items-center">
                            <Text className="text-gray-500 text-sm mb-1 text-center font-medium">Noch keine Dateien hochgeladen.</Text>
                            <Text className="text-gray-400 text-xs text-center">Hier kannst du PDFs oder Dokumente speziell für diesen Klienten ablegen.</Text>
                        </View>
                    ) : (
                        clientFiles.map(file => (
                            <View key={file.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-3 flex-row justify-between items-center">
                                <View className="flex-1 pr-4 flex-row items-center">
                                    <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                                        <FileText size={20} color="#3B82F6" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-bold text-[#2C3E50]">{file.title}</Text>
                                        {file.description ? (
                                            <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>{file.description}</Text>
                                        ) : null}
                                        <Text className="text-gray-400 text-[10px] mt-1">
                                            {new Date(file.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString(i18n.locale)}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => deleteClientFile(file)} className="bg-red-50 p-2 rounded-xl">
                                    <Trash2 size={16} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                <View className="flex-row justify-between items-center mb-4 mt-2">
                    <Text className="text-xl font-bold text-[#2C3E50]">{i18n.t('therapist.exercises')}</Text>
                    <View className="flex-row gap-2">
                        <View className="bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
                            <Text className="text-orange-700 text-xs font-bold">{i18n.t('therapist.open_exercises', { count: exercises.filter(e => !e.completed).length })}</Text>
                        </View>
                        <View className="bg-green-100 px-3 py-1 rounded-full border border-green-200">
                            <Text className="text-green-700 text-xs font-bold">{i18n.t('therapist.done_exercises', { count: exercises.filter(e => e.completed).length })}</Text>
                        </View>
                    </View>
                </View>

                {exercises.length === 0 ? (
                    <View className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm items-center mt-2 mb-6">
                        <ClipboardList size={36} color="#9CA3AF" style={{ marginBottom: 12, alignSelf: 'center' }} />
                        <Text className="text-gray-500 italic text-center font-medium">{i18n.t('therapist.no_exercises_assigned')}</Text>
                        <Text className="text-gray-400 text-xs text-center mt-1">{i18n.t('therapist.tap_to_assign')}</Text>
                    </View>
                ) : (
                    <View className="mb-6">
                        {/* Open Exercises Section */}
                        {exercises.filter(e => !e.completed).length > 0 && (
                            <View className="mb-6">
                                <Text className="text-sm font-bold text-[#2C3E50]/60 uppercase tracking-wider mb-3">Offene Übungen</Text>
                                {exercises.filter(e => !e.completed).map((ex) => (
                                    <View key={ex.id} className="bg-white p-5 rounded-3xl border border-orange-100 shadow-sm mb-4">
                                        <View className="flex-row justify-between items-start mb-2">
                                            <View className="flex-1 pr-3">
                                                <Text className="text-base font-bold text-[#2C3E50]">{ex.title}</Text>
                                                <View className="flex-row flex-wrap gap-1 mt-1">
                                                    <View className="px-2 py-0.5 rounded-full self-start bg-orange-100">
                                                        <Text className="text-xs font-bold text-orange-700">
                                                            {i18n.t('therapist.status_open')}
                                                        </Text>
                                                    </View>
                                                    {ex.recurrence && ex.recurrence !== 'none' && (
                                                        <View className="bg-blue-50 px-2 py-0.5 rounded-full self-start">
                                                            <Text className="text-blue-600 text-xs font-bold">
                                                                {ex.recurrence === 'daily' ? i18n.t('therapist.recur_daily') : i18n.t('therapist.recur_weekly')}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => deleteExercise(ex.id, ex.title)}
                                                className="bg-red-50 w-9 h-9 rounded-full items-center justify-center ml-2"
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Trash2 size={18} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                        <View className="mt-3 pt-3 border-t border-gray-100">
                                            <TouchableOpacity
                                                onPress={() => triggerTelegramWebhook(ex)}
                                                className="bg-[#0088cc] py-2 rounded-xl flex-row justify-center items-center shadow-sm"
                                            >
                                                <Text className="text-white font-bold text-sm mr-2">{i18n.t('therapist.send_reminder_telegram')}</Text>
                                            </TouchableOpacity>
                                            <Text className="text-gray-400 text-[10px] text-center mt-1">{i18n.t('therapist.telegram_desc')}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Completed Exercises Section */}
                        {exercises.filter(e => e.completed).length > 0 && (
                            <View className="mb-2">
                                <Text className="text-sm font-bold text-[#2C3E50]/60 uppercase tracking-wider mb-3">Abgeschlossene Übungen</Text>
                                {exercises.filter(e => e.completed).map((ex) => (
                                    <View key={ex.id} className="bg-white p-5 rounded-3xl border border-green-100 shadow-sm mb-4">
                                        <View className="flex-row justify-between items-start mb-2">
                                            <View className="flex-1 pr-3">
                                                <Text className="text-base font-bold text-[#2C3E50]">{ex.title}</Text>
                                                <View className="flex-row flex-wrap gap-1 mt-1">
                                                    <View className="px-2 py-0.5 rounded-full self-start bg-green-100">
                                                        <Text className="text-xs font-bold text-green-700">
                                                            {i18n.t('therapist.status_done')}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => deleteExercise(ex.id, ex.title)}
                                                className="bg-red-50 w-9 h-9 rounded-full items-center justify-center ml-2"
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Trash2 size={18} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>

                                        <View className="mt-3 pt-3 border-t border-gray-100">
                                            <Text className="text-[#2C3E50] font-bold text-xs uppercase tracking-wider mb-2">{i18n.t('therapist.client_answers')}</Text>

                                            {ex.sharedAnswers === false ? (
                                                <View className="bg-gray-50 p-4 rounded-xl items-center justify-center border border-gray-100 mt-1">
                                                    <Lock size={20} color="#9CA3AF" style={{ marginBottom: 8 }} />
                                                    <Text className="text-gray-500 text-sm font-medium text-center">
                                                        Der Klient hat sich entschieden, die Antworten privat zu halten.
                                                    </Text>
                                                    <Text className="text-gray-400 text-xs text-center mt-1">
                                                        Abgeschlossen am: {new Date(ex.lastCompletedAt || ex.createdAt).toLocaleDateString(i18n.locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </Text>
                                                </View>
                                            ) : (
                                                ex.answers && Object.keys(ex.answers).length > 0 && ex.blocks?.map((block: any) => {
                                                    if (!ex.answers[block.id]) return null;
                                                    return (
                                                        <View key={block.id} className="mb-2 bg-gray-50 p-3 rounded-xl">
                                                            <View className="flex-row items-center mb-1.5 mt-0.5">
                                                                {block.type === 'scale' ? <Activity size={14} color="#9CA3AF" style={{ marginRight: 4 }} /> : <Edit3 size={14} color="#9CA3AF" style={{ marginRight: 4 }} />}
                                                                <Text className="text-xs text-gray-400 font-bold">
                                                                    {block.type === 'scale' ? (i18n.t('blocks.scale') || 'Skala') : (i18n.t('blocks.reflection') || 'Reflektion')}
                                                                </Text>
                                                            </View>
                                                            <Text className="text-xs text-gray-500 mb-1.5" numberOfLines={2}>{block.content}</Text>
                                                            <View className="bg-white px-3 py-2 rounded-lg border border-gray-200">
                                                                <Text className="text-sm text-[#2C3E50] font-medium">{ex.answers[block.id]}</Text>
                                                            </View>
                                                        </View>
                                                    );
                                                })
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                <TouchableOpacity
                    className="bg-[#2C3E50] py-5 rounded-2xl items-center shadow-sm mb-8"
                    onPress={handleOpenModal}
                >
                    <Text className="text-white font-bold text-lg">{i18n.t('therapist.assign_exercise')}</Text>
                </TouchableOpacity>
            </View>

            {/* Exercise Assignment Modal */}
            <Modal visible={showBuilder} animationType="slide" presentationStyle="formSheet">
                <View className="flex-1 bg-[#FAF9F6]">
                    <View className="bg-[#2C3E50] pt-6 pb-6 px-6 shadow-md z-10">
                        <View className="flex-row items-center justify-between w-full max-w-4xl mx-auto">
                            <Text className="text-2xl font-extrabold text-white tracking-tight">{i18n.t('therapist.assign_title')}</Text>
                            <TouchableOpacity onPress={() => setShowBuilder(false)} className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md">
                                <Text className="text-white font-bold">{i18n.t('therapist.cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {builderMode === 'select' ? (
                        <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40, maxWidth: 896, width: '100%', marginHorizontal: 'auto' }}>
                            <Text className="text-lg font-bold text-[#2C3E50] mb-3">{i18n.t('therapist.step_1_select')}</Text>

                            <TouchableOpacity
                                onPress={() => setBuilderMode('build')}
                                className="bg-blue-50 border border-blue-200 p-5 rounded-2xl mb-6 shadow-sm flex-row items-center"
                            >
                                <Sparkles size={28} color="#1D4ED8" style={{ marginRight: 12 }} />
                                <View>
                                    <Text className="text-blue-900 font-bold text-lg">{i18n.t('therapist.create_new')}</Text>
                                    <Text className="text-blue-700 text-sm">{i18n.t('therapist.create_new_desc')}</Text>
                                </View>
                            </TouchableOpacity>

                            {templates.length > 0 && (
                                <>
                                    <Text className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-3">{i18n.t('therapist.or_template')}</Text>
                                    {templates.map(t => (
                                        <TouchableOpacity
                                            key={t.id}
                                            onPress={() => setSelectedTemplate(t)}
                                            className={`p-4 rounded-xl mb-3 border ${selectedTemplate?.id === t.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white'}`}
                                        >
                                            <Text className={`font-bold text-lg ${selectedTemplate?.id === t.id ? 'text-teal-900' : 'text-[#2C3E50]'}`}>{t.title}</Text>
                                            <Text className="text-gray-500 text-sm">{t.blocks?.length || 0} Module</Text>
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}

                            <View className="mt-8">
                                <Text className="text-lg font-bold text-[#2C3E50] mb-3">{i18n.t('therapist.step_2_recur')}</Text>
                                <View className="flex-row gap-2 mb-6">
                                    {['none', 'daily', 'weekly'].map(freq => (
                                        <TouchableOpacity
                                            key={freq}
                                            onPress={() => setRecurrence(freq)}
                                            className={`flex-1 py-3 rounded-xl items-center border ${recurrence === freq ? 'bg-[#2C3E50] border-[#2C3E50]' : 'bg-white border-gray-200'}`}
                                        >
                                            <Text className={`font-bold ${recurrence === freq ? 'text-white' : 'text-gray-600'}`}>
                                                {freq === 'none' ? i18n.t('therapist.frequency_none') : freq === 'daily' ? i18n.t('therapist.recur_daily').replace('🔁 ', '') : i18n.t('therapist.recur_weekly').replace('🔁 ', '')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View className="mt-2">
                                <Text className="text-lg font-bold text-[#2C3E50] mb-3">{i18n.t('therapist.step_3_remind')}</Text>
                                <View className="flex-row gap-2 mb-6">
                                    {['none', 'daily', 'weekly'].map(freq => (
                                        <TouchableOpacity
                                            key={freq}
                                            onPress={() => setReminderFrequency(freq)}
                                            className={`flex-1 py-3 rounded-xl items-center border ${reminderFrequency === freq ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-200'}`}
                                        >
                                            <Text className={`font-bold ${reminderFrequency === freq ? 'text-white' : 'text-gray-600'}`}>
                                                {freq === 'none' ? i18n.t('therapist.frequency_none') : freq === 'daily' ? i18n.t('therapist.recur_daily').replace('🔁 ', '') : i18n.t('therapist.recur_weekly').replace('🔁 ', '')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={confirmTemplateAssignment}
                                disabled={!selectedTemplate}
                                className={`py-5 rounded-2xl items-center shadow-sm mt-4 ${(selectedTemplate) ? 'bg-[#2C3E50]' : 'bg-gray-300'}`}
                            >
                                <Text className="text-white font-bold text-lg">{i18n.t('therapist.assign_save')}</Text>
                            </TouchableOpacity>
                            <View className="h-20" />
                        </ScrollView>
                    ) : (
                        <ExerciseBuilder
                            onSave={saveExercise}
                            onCancel={() => setBuilderMode('select')}
                        />
                    )}
                </View>
            </Modal>

            {/* File Upload Modal */}
            <Modal visible={showUploadModal} animationType="fade" transparent={true}>
                <View className="flex-1 bg-black/50 justify-center items-center p-6">
                    <View className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-[#2C3E50]">Datei hochladen</Text>
                            <TouchableOpacity onPress={() => setShowUploadModal(false)} className="bg-gray-100 p-2 rounded-full">
                                <Text className="text-gray-600 font-bold">X</Text>
                            </TouchableOpacity>
                        </View>

                        <Text className="text-sm font-medium text-gray-700 mb-2">Titel der Datei *</Text>
                        <TextInput style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 16, color: '#1F2937' }}
                            placeholder="z.B. Arbeitsblatt zur Angstbewältigung"
                            value={newFileTitle}
                            onChangeText={setNewFileTitle}
                        />

                        <Text className="text-sm font-medium text-gray-700 mb-2">Beschreibung (Optional)</Text>
                        <TextInput style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 24, color: '#1F2937', minHeight: 80, textAlignVertical: 'top' }}
                            placeholder="Kurze Anleitung oder Info für den Klienten..."
                            value={newFileDesc}
                            onChangeText={setNewFileDesc}
                            multiline
                        />

                        <TouchableOpacity
                            onPress={handleUploadClientFile}
                            disabled={uploadingFile}
                            className={`py-4 rounded-xl items-center flex-row justify-center ${uploadingFile ? 'bg-[#137386]/60' : 'bg-[#137386]'}`}
                        >
                            {uploadingFile ? (
                                <>
                                    <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                                    <Text className="text-white font-bold text-lg">Lädt hoch...</Text>
                                </>
                            ) : (
                                <>
                                    <FileUp size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text className="text-white font-bold text-lg">Datei auswählen & senden</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <Text className="text-center text-xs text-gray-400 mt-4">Der Klient wird über den Upload benachrichtigt.</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

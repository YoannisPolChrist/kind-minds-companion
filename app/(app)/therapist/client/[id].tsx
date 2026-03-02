import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, Dimensions, TextInput, Platform } from 'react-native';
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
import i18n from '../../../../utils/i18n';
import { ClipboardList, Trash2, Sparkles, Activity, Edit3, Lock, FileUp, FileText, Link as LinkIcon, Download, Clock, Plus } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useAuth } from '../../../../contexts/AuthContext';
import { generateDetailedClientSummary } from '../../../../utils/geminiAI';
import { SuccessAnimation } from '../../../../components/ui/SuccessAnimation';

export default function ClientView() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { profile } = useAuth();

    const [client, setClient] = useState<any>(null);
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBuilder, setShowBuilder] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [recurrence, setRecurrence] = useState<string>('none');
    const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
    const [reminderFrequency, setReminderFrequency] = useState<string>('none');
    const [reminderTime, setReminderTime] = useState<string>('18:00');
    const [builderMode, setBuilderMode] = useState<'select' | 'build'>('select');

    const toggleDay = (dayKey: string) => {
        setRecurrenceDays(prev =>
            prev.includes(dayKey) ? prev.filter(d => d !== dayKey) : [...prev, dayKey]
        );
    };

    const WEEKDAYS = [
        { key: '1', label: 'Mo' },
        { key: '2', label: 'Di' },
        { key: '3', label: 'Mi' },
        { key: '4', label: 'Do' },
        { key: '5', label: 'Fr' },
        { key: '6', label: 'Sa' },
        { key: '0', label: 'So' }
    ];
    const [notes, setNotes] = useState<any[]>([]);

    // File Upload State
    const [clientFiles, setClientFiles] = useState<any[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newFileTitle, setNewFileTitle] = useState('');
    const [newFileDesc, setNewFileDesc] = useState('');

    // Deep navigation state
    const [activeSection, setActiveSection] = useState<'dashboard' | 'exercises' | 'notes' | 'files'>('dashboard');

    const [showNoteModal, setShowNoteModal] = useState(false);

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
        try {
            const c = await ClientRepository.findById(id as string);
            if (c) setClient(c);
        } catch (error) {
            console.error('Error fetching client data', error);
        }
    };

    const fetchExercises = async () => {
        try {
            const data = await ExerciseRepository.findByClientId(id as string);
            setExercises(data);
        } catch (error) {
            console.error('Error fetching exercises', error);
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
        try {
            const data = await NoteRepository.findByClientId(id as string);
            setNotes(data);
        } catch (error) {
            console.error('Error fetching notes', error);
        }
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

    const handleSaveNewNote = async (text: string) => {
        if (!text.trim()) return;
        setSavingNote(true);
        try {
            await NoteRepository.create({ clientId: id as string, content: text.trim(), type: 'manual' });
            Alert.alert('Erfolg', 'Notiz wurde erfolgreich gespeichert.');
            setManualNote('');
            setShowNoteModal(false);
            fetchNotes();
        } catch (err) {
            Alert.alert('Fehler', 'Notiz konnte nicht gespeichert werden.');
        } finally {
            setSavingNote(false);
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

            let blob: Blob | Uint8Array;
            if (Platform.OS === 'web' && asset.file) {
                blob = asset.file;
            } else {
                const response = await fetch(asset.uri);
                blob = await response.blob();
            }

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
                therapistId: profile?.id || "unknown",
                title,
                blocks: processedBlocks,
                recurrence: recurrence || 'none',
                recurrenceDays: recurrence === 'custom' ? recurrenceDays : [],
                reminderTime: reminderTime || '18:00',
                createdAt: serverTimestamp(),
                completed: false,
            };

            await addDoc(collection(db, "exercises"), exerciseData);
            setShowBuilder(false);
            setSelectedTemplate(null);
            fetchExercises(); // Refresh the list
            setSuccessMessage(i18n.t('therapist.success_assigned'));
            setShowSuccess(true);
        } catch (error: any) {
            console.error("Error saving exercise", error);
            if (Platform.OS === 'web') window.alert(error.message || "Übung konnte nicht gespeichert werden.");
            else Alert.alert("Fehler", error.message || "Übung konnte nicht gespeichert werden.");
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
                    <TouchableOpacity onPress={() => activeSection === 'dashboard' ? router.back() : setActiveSection('dashboard')} className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md">
                        <Text className="text-white font-bold">{activeSection === 'dashboard' ? i18n.t('exercise.back') : 'Zurück zum Dashboard'}</Text>
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

            <ScrollView className="flex-1 w-full" contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 32, paddingBottom: 120, maxWidth: 1024, marginHorizontal: 'auto' }}>
                {activeSection === 'dashboard' && (
                    <View className="flex-1 w-full max-w-4xl mx-auto">
                        <Text className="text-[28px] font-black text-[#243842] mb-8 tracking-tight">Patienten-Akte</Text>
                        <View className="flex-row flex-wrap gap-6">
                            <TouchableOpacity
                                onPress={() => setActiveSection('exercises')}
                                className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 items-center justify-center flex-1 min-w-[240px] max-w-full md:max-w-[calc(50%-12px)] aspect-square max-h-[280px]"
                                style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4 }}
                            >
                                <View className="w-20 h-20 bg-[#F9F8F6] rounded-full items-center justify-center mb-5">
                                    <Activity size={36} color="#137386" />
                                </View>
                                <Text className="text-[22px] font-bold text-[#243842] mb-1.5">Übungen</Text>
                                <Text className="text-[15px] text-[#243842]/60 font-medium text-center leading-relaxed">{exercises.filter(e => !e.completed).length} offen, {exercises.filter(e => e.completed).length} abgeschlossen</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setActiveSection('notes')}
                                className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 items-center justify-center flex-1 min-w-[240px] max-w-full md:max-w-[calc(50%-12px)] aspect-square max-h-[280px]"
                                style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4 }}
                            >
                                <View className="w-20 h-20 bg-[#F9F8F6] rounded-full items-center justify-center mb-5">
                                    <Edit3 size={36} color="#3B82F6" />
                                </View>
                                <Text className="text-[22px] font-bold text-[#243842] mb-1.5">Session Notes</Text>
                                <Text className="text-[15px] text-[#243842]/60 font-medium text-center leading-relaxed">{notes.length} gespeicherte Notizen</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setActiveSection('files')}
                                className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 items-center justify-center flex-1 min-w-[240px] max-w-full md:max-w-[calc(50%-12px)] aspect-square max-h-[280px]"
                                style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4 }}
                            >
                                <View className="w-20 h-20 bg-[#F9F8F6] rounded-full items-center justify-center mb-5">
                                    <FileText size={36} color="#C09D59" />
                                </View>
                                <Text className="text-[22px] font-bold text-[#243842] mb-1.5">Dateien</Text>
                                <Text className="text-[15px] text-[#243842]/60 font-medium text-center leading-relaxed">{clientFiles.length} Dokumente geteilt</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {activeSection === 'notes' && (
                    <View className="flex-1 max-w-4xl mx-auto w-full">
                        <View className="flex-row justify-between items-center mb-8 mt-4">
                            <Text className="text-[28px] font-black text-[#243842] tracking-tight">Session Notes</Text>
                            <TouchableOpacity
                                onPress={() => setShowNoteModal(true)}
                                className="bg-[#137386] px-5 py-3 rounded-2xl flex-row items-center shadow-sm"
                            >
                                <Plus size={18} color="white" style={{ marginRight: 8 }} />
                                <Text className="text-white font-bold text-[15px]">Neue Notiz</Text>
                            </TouchableOpacity>
                        </View>

                        {notes.length === 0 ? (
                            <View className="bg-[#F9F8F6] border-2 border-dashed border-gray-200/80 py-16 px-8 rounded-[32px] items-center mt-4 mb-10">
                                <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-6 shadow-sm border border-gray-100">
                                    <Edit3 size={40} color="#D1D5DB" />
                                </View>
                                <Text className="text-[#243842] text-[20px] mb-3 text-center font-black tracking-tight">Noch keine Notizen</Text>
                                <Text className="text-[#243842]/50 text-[15px] text-center max-w-[320px] leading-relaxed font-medium">Hier kannst du wichtige Notizen und Beobachtungen zu den Sessions festhalten.</Text>
                            </View>
                        ) : (
                            <View className="gap-6 mb-10">
                                {notes.map(note => (
                                    <View key={note.id} className="bg-white p-6 rounded-[28px] border border-blue-100/60 shadow-sm" style={{ shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 3 }}>
                                        <View className="flex-row items-center mb-4">
                                            <View className="w-10 h-10 bg-blue-50 rounded-[16px] items-center justify-center mr-3 border border-blue-100/50">
                                                <Edit3 size={18} color="#3B82F6" />
                                            </View>
                                            <Text className="text-[14px] text-[#243842]/60 font-bold tracking-wide">
                                                {new Date(note.createdAt).toLocaleDateString(i18n.locale, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                        <Text className="text-[#243842] text-[16px] leading-relaxed font-medium">{note.content}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {activeSection === 'files' && (
                    <View className="mb-8 flex-1 max-w-4xl mx-auto w-full">
                        <View className="flex-row justify-between items-center mb-6 mt-2">
                            <Text className="text-[24px] font-black text-[#243842]">Hinterlegte Dateien</Text>
                            <TouchableOpacity
                                onPress={() => setShowUploadModal(true)}
                                className="bg-[#137386] px-5 py-3 rounded-2xl flex-row items-center shadow-sm"
                            >
                                <FileUp size={18} color="white" style={{ marginRight: 8 }} />
                                <Text className="text-white font-bold text-[15px]">Datei hochladen</Text>
                            </TouchableOpacity>
                        </View>

                        {clientFiles.length === 0 ? (
                            <View className="bg-[#F9F8F6] border-2 border-dashed border-gray-200/80 py-16 px-8 rounded-[32px] items-center mt-4 mb-10">
                                <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-6 shadow-sm border border-gray-100">
                                    <FileText size={40} color="#D1D5DB" />
                                </View>
                                <Text className="text-[#243842] text-[20px] mb-3 text-center font-black tracking-tight">Noch keine Dateien hochgeladen</Text>
                                <Text className="text-[#243842]/50 text-[15px] text-center max-w-[320px] leading-relaxed font-medium">Hier kannst du PDFs, Arbeitsblätter oder Dokumente speziell für diesen Klienten ablegen.</Text>
                            </View>
                        ) : (
                            <View className="flex-row flex-wrap gap-6">
                                {clientFiles.map(file => (
                                    <View
                                        key={file.id}
                                        className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex-row justify-between items-center flex-1 min-w-[300px] max-w-full md:max-w-[calc(50%-12px)]"
                                        style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2 }}
                                    >
                                        <View className="flex-1 pr-4 flex-row items-center">
                                            <View className="w-14 h-14 rounded-[20px] bg-amber-50/80 items-center justify-center mr-4 border border-amber-100/50">
                                                <FileText size={24} color="#C09D59" />
                                            </View>
                                            <View className="flex-1 justify-center">
                                                <Text className="font-bold text-[16px] text-[#243842] mb-1">{file.title}</Text>
                                                {file.description ? (
                                                    <Text className="text-[#243842]/60 text-[13px] mb-1.5 font-medium" numberOfLines={1}>{file.description}</Text>
                                                ) : null}
                                                <Text className="text-[#243842]/40 text-[11px] font-bold tracking-wider uppercase">
                                                    {new Date(file.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString(i18n.locale)}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => deleteClientFile(file)} className="bg-red-50/80 p-3 rounded-xl border border-red-100">
                                            <Trash2 size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {activeSection === 'exercises' && (
                    <View className="flex-1 max-w-4xl mx-auto w-full">
                        <View className="flex-row justify-between items-center mb-8 mt-4">
                            <Text className="text-[28px] font-black text-[#243842] tracking-tight">{i18n.t('therapist.exercises')}</Text>
                            <View className="flex-row gap-3">
                                <View className="bg-orange-50 px-4 py-2 rounded-[16px] border border-orange-100/50 shadow-sm">
                                    <Text className="text-orange-600 text-[13px] font-black tracking-wide uppercase">{i18n.t('therapist.open_exercises', { count: exercises.filter(e => !e.completed).length })}</Text>
                                </View>
                                <View className="bg-emerald-50 px-4 py-2 rounded-[16px] border border-emerald-100/50 shadow-sm">
                                    <Text className="text-emerald-600 text-[13px] font-black tracking-wide uppercase">{i18n.t('therapist.done_exercises', { count: exercises.filter(e => e.completed).length })}</Text>
                                </View>
                            </View>
                        </View>

                        {exercises.length === 0 ? (
                            <View className="bg-[#F9F8F6] p-10 py-16 px-8 rounded-[32px] border-2 border-dashed border-gray-200/80 items-center mt-4 mb-10">
                                <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-6 shadow-sm border border-gray-100">
                                    <ClipboardList size={40} color="#D1D5DB" />
                                </View>
                                <Text className="text-[#243842] text-[20px] text-center font-black mb-3 tracking-tight">{i18n.t('therapist.no_exercises_assigned')}</Text>
                                <Text className="text-[#243842]/50 text-[15px] text-center max-w-[320px] leading-relaxed font-medium">{i18n.t('therapist.tap_to_assign')}</Text>
                            </View>
                        ) : (
                            <View className="mb-6">
                                {/* Open Exercises Section */}
                                {exercises.filter(e => !e.completed).length > 0 && (
                                    <View className="mb-8">
                                        <Text className="text-[13px] font-black text-[#243842]/40 uppercase tracking-widest mb-4 ml-2">Offene Übungen</Text>
                                        <View className="flex-row flex-wrap gap-6">
                                            {exercises.filter(e => !e.completed).map((ex) => (
                                                <View
                                                    key={ex.id}
                                                    className="bg-white p-6 rounded-[28px] border border-orange-100/60 shadow-sm flex-1 min-w-[300px] max-w-full md:max-w-[calc(50%-12px)]"
                                                    style={{ shadowColor: '#F97316', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4 }}
                                                >
                                                    <View className="flex-row justify-between items-start mb-4">
                                                        <View className="flex-1 pr-4">
                                                            <Text className="text-[18px] font-bold text-[#243842] mb-2">{ex.title}</Text>
                                                            <View className="flex-row flex-wrap gap-2 mt-1">
                                                                <View className="px-3 py-1.5 rounded-xl self-start bg-orange-50 border border-orange-100/50">
                                                                    <Text className="text-[13px] font-bold text-orange-600">
                                                                        {i18n.t('therapist.status_open')}
                                                                    </Text>
                                                                </View>
                                                                {ex.recurrence && ex.recurrence !== 'none' && (
                                                                    <View className="bg-sky-50 px-3 py-1.5 rounded-xl self-start border border-sky-100/50">
                                                                        <Text className="text-sky-600 text-[13px] font-bold">
                                                                            {ex.recurrence === 'daily' ? i18n.t('therapist.recur_daily') : i18n.t('therapist.recur_weekly')}
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        </View>
                                                        <TouchableOpacity
                                                            onPress={() => deleteExercise(ex.id, ex.title)}
                                                            className="bg-red-50/80 w-11 h-11 rounded-full items-center justify-center ml-2 border border-red-100"
                                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                        >
                                                            <Trash2 size={18} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <View className="mt-auto pt-5 border-t border-gray-100">
                                                        <TouchableOpacity
                                                            onPress={() => triggerTelegramWebhook(ex)}
                                                            className="bg-[#137386] py-3.5 rounded-2xl flex-row justify-center items-center shadow-sm"
                                                        >
                                                            <Text className="text-white font-bold text-[15px] mr-2">{i18n.t('therapist.send_reminder_telegram')}</Text>
                                                        </TouchableOpacity>
                                                        <Text className="text-[#243842]/40 text-[11px] text-center mt-2.5 font-medium">{i18n.t('therapist.telegram_desc')}</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Completed Exercises Section */}
                                {exercises.filter(e => e.completed).length > 0 && (
                                    <View className="mb-4">
                                        <Text className="text-[13px] font-black text-[#243842]/40 uppercase tracking-widest mb-4 ml-2">Abgeschlossene Übungen</Text>
                                        <View className="flex-row flex-wrap gap-6">
                                            {exercises.filter(e => e.completed).map((ex) => (
                                                <View
                                                    key={ex.id}
                                                    className="bg-white p-6 rounded-[28px] border border-emerald-100/60 shadow-sm flex-1 min-w-[300px] max-w-full md:max-w-[calc(50%-12px)]"
                                                    style={{ shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 24, elevation: 3 }}
                                                >
                                                    <View className="flex-row justify-between items-start mb-4">
                                                        <View className="flex-1 pr-4">
                                                            <Text className="text-[18px] font-bold text-[#243842] mb-2">{ex.title}</Text>
                                                            <View className="flex-row flex-wrap gap-2 mt-1">
                                                                <View className="px-3 py-1.5 rounded-xl self-start bg-emerald-50 border border-emerald-100/50">
                                                                    <Text className="text-[13px] font-bold text-emerald-600">
                                                                        {i18n.t('therapist.status_done')}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        </View>
                                                        <TouchableOpacity
                                                            onPress={() => deleteExercise(ex.id, ex.title)}
                                                            className="bg-red-50/80 w-11 h-11 rounded-full items-center justify-center ml-2 border border-red-100"
                                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                        >
                                                            <Trash2 size={18} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>

                                                    <View className="mt-auto pt-5 border-t border-gray-100">
                                                        <Text className="text-[#243842]/50 font-bold text-[12px] uppercase tracking-wider mb-4">{i18n.t('therapist.client_answers')}</Text>

                                                        {ex.sharedAnswers === false ? (
                                                            <View className="bg-[#F9F8F6] p-6 rounded-[20px] items-center justify-center border border-gray-100 mt-2 flex-1">
                                                                <Lock size={24} color="#C09D59" style={{ marginBottom: 12 }} />
                                                                <Text className="text-[#243842]/70 text-[14px] font-medium text-center leading-relaxed">
                                                                    Der Klient hat sich entschieden, die Antworten privat zu halten.
                                                                </Text>
                                                                <Text className="text-[#243842]/50 text-[12px] text-center mt-3 font-medium">
                                                                    Abgeschlossen am: {new Date(ex.lastCompletedAt || ex.createdAt).toLocaleDateString(i18n.locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                </Text>
                                                            </View>
                                                        ) : (
                                                            <View className="flex-1 gap-3">
                                                                {ex.answers && Object.keys(ex.answers).length > 0 && ex.blocks?.map((block: any) => {
                                                                    if (!ex.answers[block.id]) return null;
                                                                    return (
                                                                        <View key={block.id} className="mb-2 bg-[#F9F8F6] p-4 rounded-[20px] border border-gray-200/50">
                                                                            <View className="flex-row items-center mb-2 mt-0.5">
                                                                                {block.type === 'scale' ? <Activity size={16} color="#137386" style={{ marginRight: 6 }} /> : <Edit3 size={16} color="#137386" style={{ marginRight: 6 }} />}
                                                                                <Text className="text-[13px] text-[#137386]/80 font-bold tracking-wide">
                                                                                    {block.type === 'scale' ? (i18n.t('blocks.scale') || 'Skala') : (i18n.t('blocks.reflection') || 'Reflektion')}
                                                                                </Text>
                                                                            </View>
                                                                            <Text className="text-[14px] text-[#243842]/70 mb-3 font-medium" numberOfLines={2}>{block.content}</Text>
                                                                            <View className="bg-white px-4 py-3 rounded-2xl border border-gray-200 shadow-sm">
                                                                                <Text className="text-[15px] text-[#243842] font-semibold">{ex.answers[block.id]}</Text>
                                                                            </View>
                                                                        </View>
                                                                    );
                                                                })}
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {activeSection === 'exercises' && (
                    <View className="flex-1 max-w-4xl mx-auto w-full">
                        <TouchableOpacity
                            className="bg-[#137386] py-5 rounded-[24px] items-center justify-center flex-row shadow-sm mb-12"
                            style={{ shadowColor: '#137386', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 6 }}
                            onPress={handleOpenModal}
                        >
                            <Activity size={20} color="white" style={{ marginRight: 10 }} />
                            <Text className="text-white font-bold text-[18px]">{i18n.t('therapist.assign_exercise')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Exercise Assignment Modal */}
            <Modal visible={showBuilder} animationType="slide" presentationStyle="formSheet">
                <View className="flex-1 bg-[#F9F8F6]">
                    <View className="bg-[#137386] pt-8 pb-8 px-8 shadow-lg z-10 rounded-b-[32px]">
                        <View className="flex-row items-center justify-between w-full max-w-4xl mx-auto">
                            <Text className="text-[24px] font-black text-white tracking-tight">{i18n.t('therapist.assign_title')}</Text>
                            <TouchableOpacity onPress={() => setShowBuilder(false)} className="bg-white/20 px-4 py-2.5 rounded-2xl backdrop-blur-md">
                                <Text className="text-white font-bold">{i18n.t('therapist.cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {builderMode === 'select' ? (
                        <>
                            <ScrollView className="flex-1 w-full" contentContainerStyle={{ padding: 32, paddingBottom: 60, maxWidth: 896, marginHorizontal: 'auto' }}>
                                <Text className="text-[18px] font-black text-[#243842] mb-4">{i18n.t('therapist.step_1_select')}</Text>

                                <TouchableOpacity
                                    onPress={() => setBuilderMode('build')}
                                    className="bg-sky-50 border border-sky-200/60 p-6 rounded-[24px] mb-8 shadow-sm flex-row items-center"
                                >
                                    <View className="w-14 h-14 bg-white rounded-[20px] items-center justify-center shadow-sm mr-5">
                                        <Sparkles size={24} color="#0EA5E9" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sky-900 font-bold text-[18px] mb-1">{i18n.t('therapist.create_new')}</Text>
                                        <Text className="text-sky-700/80 text-[14px] font-medium leading-relaxed">{i18n.t('therapist.create_new_desc')}</Text>
                                    </View>
                                </TouchableOpacity>

                                {templates.length > 0 && (
                                    <>
                                        <Text className="text-[#243842]/40 font-black text-[13px] uppercase tracking-widest mb-4">{i18n.t('therapist.or_template')}</Text>
                                        {templates.map(t => (
                                            <TouchableOpacity
                                                key={t.id}
                                                onPress={() => setSelectedTemplate(t)}
                                                className={`p-5 rounded-[24px] mb-4 border ${selectedTemplate?.id === t.id ? 'border-[#137386] bg-[#137386]/5' : 'border-gray-200 bg-white'}`}
                                                style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 }}
                                            >
                                                <Text className={`font-bold text-[18px] mb-1 ${selectedTemplate?.id === t.id ? 'text-[#137386]' : 'text-[#243842]'}`}>{t.title}</Text>
                                                <Text className="text-[#243842]/50 text-[14px] font-medium">{t.blocks?.length || 0} Module</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </>
                                )}

                                <View className="mt-10">
                                    <Text className="text-[18px] font-black text-[#243842] mb-4">Wiederholung der Übung</Text>
                                    <View className="flex-row gap-3 mb-5">
                                        {['none', 'daily', 'custom'].map(freq => (
                                            <TouchableOpacity
                                                key={freq}
                                                onPress={() => setRecurrence(freq)}
                                                className={`flex-1 py-4 rounded-[20px] items-center border ${recurrence === freq ? 'bg-[#243842] border-[#243842]' : 'bg-white border-gray-200'}`}
                                                style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 4 }, shadowOpacity: recurrence === freq ? 0.2 : 0.02, shadowRadius: 12, elevation: 2 }}
                                            >
                                                <Text className={`font-bold text-[15px] ${recurrence === freq ? 'text-white' : 'text-[#243842]/60'}`}>
                                                    {freq === 'none' ? 'Keine' : freq === 'daily' ? 'Täglich' : 'Spezifische Tage'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    {recurrence === 'custom' && (
                                        <View className="flex-row justify-between mb-8 bg-white p-5 rounded-[24px] border border-gray-200 shadow-sm" style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 }}>
                                            {WEEKDAYS.map(day => {
                                                const isActive = recurrenceDays.includes(day.key);
                                                return (
                                                    <TouchableOpacity
                                                        key={day.key}
                                                        onPress={() => toggleDay(day.key)}
                                                        className={`w-12 h-12 rounded-[16px] items-center justify-center ${isActive ? 'bg-[#137386]' : 'bg-[#F9F8F6] border border-gray-100'}`}
                                                    >
                                                        <Text className={`font-bold text-[15px] ${isActive ? 'text-white' : 'text-[#243842]/50'}`}>{day.label}</Text>
                                                    </TouchableOpacity>
                                                )
                                            })}
                                        </View>
                                    )}
                                </View>

                                <View className="mt-4">
                                    <Text className="text-[18px] font-black text-[#243842] mb-4">Push-Erinnerung (Uhrzeit)</Text>
                                    <View className="flex-row items-center bg-white border border-gray-200 rounded-[24px] p-5 mb-8 shadow-sm" style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12, elevation: 2 }}>
                                        <View className="w-12 h-12 bg-blue-50 rounded-[16px] items-center justify-center mr-4 border border-blue-100/50">
                                            <Clock size={24} color="#3B82F6" />
                                        </View>
                                        <TextInput
                                            value={reminderTime}
                                            onChangeText={setReminderTime}
                                            placeholder="18:00"
                                            keyboardType="numeric"
                                            maxLength={5}
                                            className="flex-1 font-black text-[24px] text-[#243842] tracking-wider"
                                        />
                                        <Text className="text-[#243842]/40 font-bold text-[16px] uppercase tracking-widest ml-3">Uhr</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={confirmTemplateAssignment}
                                    disabled={!selectedTemplate}
                                    className={`py-5 rounded-[24px] items-center shadow-sm mt-4 ${(selectedTemplate) ? 'bg-[#137386]' : 'bg-gray-300'}`}
                                    style={{ shadowColor: selectedTemplate ? '#137386' : 'transparent', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: selectedTemplate ? 4 : 0 }}
                                >
                                    <Text className="text-white font-bold text-[18px]">{i18n.t('therapist.assign_save')}</Text>
                                </TouchableOpacity>
                                <View className="h-32" />
                            </ScrollView>

                            <SuccessAnimation
                                visible={showSuccess}
                                message={successMessage}
                                onAnimationDone={() => setShowSuccess(false)}
                            />
                        </>
                    ) : (
                        <ExerciseBuilder
                            onSave={saveExercise}
                            onCancel={() => setBuilderMode('select')}
                        />
                    )}
                </View>
            </Modal >

            {/* Note Creation Modal */}
            <Modal visible={showNoteModal} animationType="fade" transparent={true}>
                <View className="flex-1 bg-black/50 justify-center items-center p-6">
                    <View className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-[#2C3E50]">Neue Notiz</Text>
                            <TouchableOpacity onPress={() => setShowNoteModal(false)} className="bg-gray-100 p-2 rounded-full">
                                <Text className="text-gray-600 font-bold">X</Text>
                            </TouchableOpacity>
                        </View>

                        <Text className="text-sm font-medium text-gray-700 mb-2">Inhalt der Notiz *</Text>
                        <TextInput style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 24, color: '#1F2937', minHeight: 120, textAlignVertical: 'top' }}
                            placeholder="Schreibe eine Notiz..."
                            value={manualNote}
                            onChangeText={setManualNote}
                            multiline
                        />

                        <TouchableOpacity
                            onPress={() => handleSaveNewNote(manualNote)}
                            disabled={savingNote || !manualNote.trim()}
                            className={`py-4 rounded-xl items-center flex-row justify-center ${savingNote || !manualNote.trim() ? 'bg-[#137386]/60' : 'bg-[#137386]'}`}
                        >
                            {savingNote ? (
                                <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                            ) : (
                                <Text className="text-white font-bold text-lg">Speichern</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* File Upload Modal */}
            < Modal visible={showUploadModal} animationType="fade" transparent={true} >
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
            </Modal >
        </View >
    );
}

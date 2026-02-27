import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../../../../utils/firebase';
import { ExerciseRepository } from '../../../../utils/repositories/ExerciseRepository';
import { ClientRepository } from '../../../../utils/repositories/ClientRepository';
import { NoteRepository } from '../../../../utils/repositories/NoteRepository';
import ExerciseBuilder, { ExerciseBlock } from '../../../../components/therapist/ExerciseBuilder';
import { VoiceNoteTaker } from '../../../../components/therapist/VoiceNoteTaker';
import i18n from '../../../../utils/i18n';
import { ClipboardList, Trash2, Sparkles, Activity, Edit3 } from 'lucide-react-native';
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

    useEffect(() => {
        if (id) {
            fetchClientData();
            fetchExercises();
            fetchTemplates();
            fetchNotes();
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
            <View className="bg-[#2C3E50] pt-16 pb-8 px-6 rounded-b-3xl shadow-md z-10 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md">
                    <Text className="text-white font-bold">{i18n.t('exercise.back')}</Text>
                </TouchableOpacity>
                <Text className="text-xl font-extrabold text-white flex-1 text-right ml-4" numberOfLines={1}>
                    {client?.firstName ? `${client.firstName} ${client.lastName}` : i18n.t('therapist.client_details')}
                </Text>
            </View>

            <View className="flex-1 px-6 pt-6">
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

                <View className="flex-row justify-between items-center mb-4 mt-2">
                    <Text className="text-xl font-bold text-[#2C3E50]">{i18n.t('therapist.exercises')}</Text>
                    <View className="flex-row gap-2">
                        <View className="bg-orange-100 px-3 py-1 rounded-full">
                            <Text className="text-orange-700 text-xs font-bold">{i18n.t('therapist.open_exercises', { count: exercises.filter(e => !e.completed).length })}</Text>
                        </View>
                        <View className="bg-green-100 px-3 py-1 rounded-full">
                            <Text className="text-green-700 text-xs font-bold">{i18n.t('therapist.done_exercises', { count: exercises.filter(e => e.completed).length })}</Text>
                        </View>
                    </View>
                </View>

                <View style={{ flex: 1, minHeight: 400 }}>
                    <FlashList<any>
                        data={exercises}
                        // @ts-ignore - FlashList typing issue in this environment
                        estimatedItemSize={180}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => (
                            <View className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm items-center mt-2">
                                <ClipboardList size={36} color="#9CA3AF" style={{ marginBottom: 12, alignSelf: 'center' }} />
                                <Text className="text-gray-500 italic text-center font-medium">{i18n.t('therapist.no_exercises_assigned')}</Text>
                                <Text className="text-gray-400 text-xs text-center mt-1">{i18n.t('therapist.tap_to_assign')}</Text>
                            </View>
                        )}
                        renderItem={({ item: ex }) => (
                            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-4">
                                {/* Card Header */}
                                <View className="flex-row justify-between items-start mb-2">
                                    <View className="flex-1 pr-3">
                                        <Text className="text-base font-bold text-[#2C3E50]">{ex.title}</Text>
                                        <View className="flex-row flex-wrap gap-1 mt-1">
                                            <View className={`px-2 py-0.5 rounded-full self-start ${ex.completed ? 'bg-green-100' : 'bg-orange-100'}`}>
                                                <Text className={`text-xs font-bold ${ex.completed ? 'text-green-700' : 'text-orange-700'}`}>
                                                    {ex.completed ? i18n.t('therapist.status_done') : i18n.t('therapist.status_open')}
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

                                {/* Client Answers */}
                                {ex.completed && ex.answers && Object.keys(ex.answers).length > 0 && (
                                    <View className="mt-3 pt-3 border-t border-gray-100">
                                        <Text className="text-[#2C3E50] font-bold text-xs uppercase tracking-wider mb-2">{i18n.t('therapist.client_answers')}</Text>
                                        {ex.blocks?.map((block: any) => {
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
                                        })}
                                    </View>
                                )}
                                {/* Telegram Reminder Button for Open Exercises */}
                                {!ex.completed && (
                                    <View className="mt-3 pt-3 border-t border-gray-100">
                                        <TouchableOpacity
                                            onPress={() => triggerTelegramWebhook(ex)}
                                            className="bg-[#0088cc] py-2 rounded-xl flex-row justify-center items-center shadow-sm"
                                        >
                                            <Text className="text-white font-bold text-sm mr-2">{i18n.t('therapist.send_reminder_telegram')}</Text>
                                        </TouchableOpacity>
                                        <Text className="text-gray-400 text-[10px] text-center mt-1">{i18n.t('therapist.telegram_desc')}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    />
                </View>

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
                    <View className="bg-[#2C3E50] pt-6 pb-6 px-6 shadow-md z-10 flex-row items-center justify-between">
                        <Text className="text-2xl font-extrabold text-white tracking-tight">{i18n.t('therapist.assign_title')}</Text>
                        <TouchableOpacity onPress={() => setShowBuilder(false)} className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md">
                            <Text className="text-white font-bold">{i18n.t('therapist.cancel')}</Text>
                        </TouchableOpacity>
                    </View>

                    {builderMode === 'select' ? (
                        <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
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
        </View>
    );
}

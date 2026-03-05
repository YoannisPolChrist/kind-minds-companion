import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref } from 'firebase/storage';
import { uploadFile, getExtension } from '../../../../utils/uploadFile';
import * as FileSystem from 'expo-file-system';
import { storage, db } from '../../../../utils/firebase';
import { ExerciseRepository } from '../../../../utils/repositories/ExerciseRepository';
import { ClientRepository } from '../../../../utils/repositories/ClientRepository';
import ExerciseBuilder, { ExerciseBlock } from '../../../../components/therapist/ExerciseBuilder';
import i18n from '../../../../utils/i18n';
import { ClipboardList, Trash2, Sparkles, Activity, Edit3, Lock, FileText, Clock, ArrowLeft, Send } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useAuth } from '../../../../contexts/AuthContext';
import { SuccessAnimation } from '../../../../components/ui/SuccessAnimation';
import { useSafeBack } from '../../../../hooks/useSafeBack';

export default function ClientView() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const goBack = useSafeBack();
    const { profile } = useAuth();

    const [client, setClient] = useState<any>(null);
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBuilder, setShowBuilder] = useState(false);
    const [toast, setToast] = useState<{ visible: boolean, message: string, subMessage?: string, type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });

    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [recurrence, setRecurrence] = useState<string>('none');
    const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
    const [reminderFrequency, setReminderFrequency] = useState<string>('none');
    const [reminderTime, setReminderTime] = useState<string>('18:00');
    const [builderMode, setBuilderMode] = useState<'select' | 'build'>('select');
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Modals
    const [deleteExerciseModalVisible, setDeleteExerciseModalVisible] = useState(false);
    const [exerciseToDelete, setExerciseToDelete] = useState<{ id: string, title: string } | null>(null);

    const [telegramModalVisible, setTelegramModalVisible] = useState(false);
    const [exerciseToRemind, setExerciseToRemind] = useState<{ id: string, title: string } | null>(null);

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

    useEffect(() => {
        if (id) {
            fetchClientData();
            fetchExercises();
            fetchTemplates();
        }
    }, [id]);

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



    const saveExercise = async (title: string, blocks: ExerciseBlock[]) => {
        try {
            // Upload media blocks first
            const processedBlocks = await Promise.all(blocks.map(async (block) => {
                if (block.type === 'media' && block.mediaUri && !block.mediaUri.startsWith('http')) {
                    try {
                        const ext = getExtension(block.mediaUri);
                        const filename = `exercise_media/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                        const downloadUrl = await uploadFile(block.mediaUri, filename);
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
            setToast({ visible: true, message: "Erfolg", subMessage: i18n.t('therapist.success_assigned'), type: 'success' });
        } catch (error: any) {
            console.error("Error saving exercise", error);
            setToast({ visible: true, message: "Fehler", subMessage: error.message || "Übung konnte nicht gespeichert werden.", type: 'error' });
        }
    };

    const promptDeleteExercise = (exerciseId: string, title: string) => {
        setExerciseToDelete({ id: exerciseId, title });
        setDeleteExerciseModalVisible(true);
    };

    const confirmDeleteExercise = async () => {
        if (!exerciseToDelete) return;
        setDeleteExerciseModalVisible(false);
        try {
            await ExerciseRepository.archive(exerciseToDelete.id);
            setExercises(prev => prev.filter(ex => ex.id !== exerciseToDelete.id));
        } catch {
            setToast({ visible: true, message: 'Fehler', subMessage: i18n.t('therapist.delete_err'), type: 'error' });
        } finally {
            setExerciseToDelete(null);
        }
    };

    const confirmTemplateAssignment = () => {
        if (!selectedTemplate) {
            setToast({ visible: true, message: "Fehler", subMessage: "Bitte wähle eine Vorlage aus.", type: 'warning' });
            return;
        }
        saveExercise(selectedTemplate.title, selectedTemplate.blocks);
    }

    const promptTelegramWebhook = (exercise: any) => {
        setExerciseToRemind({ id: exercise.id, title: exercise.title });
        setTelegramModalVisible(true);
    };

    const confirmTelegramWebhook = async () => {
        if (!exerciseToRemind) return;
        setTelegramModalVisible(false);
        try {
            const webhookUrl = "https://cloud.activepieces.com/api/v1/webhooks/PLACEHOLDER";
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientId: id,
                    clientName: client?.firstName || 'Klient',
                    exerciseId: exerciseToRemind.id,
                    exerciseTitle: exerciseToRemind.title
                })
            });

            if (response.ok || response.type === 'opaque') {
                setToast({ visible: true, message: "Erfolg", subMessage: "Erinnerung wurde gesendet.", type: 'success' });
            } else {
                setToast({ visible: true, message: "Hinweis", subMessage: "Webhook angesprochen, aber mit Fehler geantwortet.", type: 'warning' });
            }
        } catch (error) {
            console.error("Error triggering webhook", error);
            setToast({ visible: true, message: "Gesendet", subMessage: "Anfrage verschickt. Bitte Activepieces prüfen.", type: 'success' });
        } finally {
            setExerciseToRemind(null);
        }
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
            <View className="bg-[#137386] pt-16 pb-8 px-8 rounded-b-[40px] shadow-lg z-10">
                <View className="flex-row items-center justify-between w-full max-w-5xl mx-auto">
                    <TouchableOpacity onPress={goBack} className="bg-white/20 px-4 py-3 rounded-2xl backdrop-blur-md flex-row items-center">
                        <ArrowLeft size={20} color="white" style={{ marginRight: 8 }} />
                        <Text className="text-white font-bold text-[16px]">Zurück</Text>
                    </TouchableOpacity>
                    <View className="flex-row items-center flex-1 justify-end ml-4">
                        <View className="bg-white/10 w-12 h-12 rounded-[16px] items-center justify-center mr-4 border border-white/20">
                            {client?.photoURL ? (
                                <Text className="text-white text-xs">PIC</Text> // Placeholder if we get real images later
                            ) : (
                                <Text className="text-white font-black text-[20px]">
                                    {client?.firstName?.charAt(0)}{client?.lastName?.charAt(0)}
                                </Text>
                            )}
                        </View>
                        <Text className="text-[24px] font-black text-white tracking-tight" numberOfLines={1}>
                            {client?.firstName ? `${client.firstName} ${client.lastName}` : i18n.t('therapist.client_details')}
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1 w-full" contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 32, paddingBottom: 120, maxWidth: 1024, marginHorizontal: 'auto' }}>
                <View className="w-full max-w-4xl mx-auto">
                    <Text className="text-[28px] font-black text-[#243842] mb-8 tracking-tight">Patienten-Akte</Text>

                    <View className="flex-row flex-wrap gap-6 mb-12">
                        <TouchableOpacity
                            onPress={() => router.push(`/(app)/therapist/client/${id}/notes` as any)}
                            className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 items-center justify-center flex-1 min-w-[240px] max-w-full md:max-w-[calc(33%-16px)] aspect-square max-h-[260px]"
                            style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 24, elevation: 4 }}
                        >
                            <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-5 border border-blue-100/50">
                                <Edit3 size={36} color="#3B82F6" />
                            </View>
                            <Text className="text-[22px] font-bold text-[#243842] mb-1.5">Session Notes</Text>
                            <Text className="text-[15px] text-[#243842]/50 font-medium text-center leading-relaxed">Verwalte Notizen</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push(`/(app)/therapist/client/${id}/files` as any)}
                            className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 items-center justify-center flex-1 min-w-[240px] max-w-full md:max-w-[calc(33%-16px)] aspect-square max-h-[260px]"
                            style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 24, elevation: 4 }}
                        >
                            <View className="w-20 h-20 bg-amber-50 rounded-full items-center justify-center mb-5 border border-amber-100/50">
                                <FileText size={36} color="#C09D59" />
                            </View>
                            <Text className="text-[22px] font-bold text-[#243842] mb-1.5">Dateien</Text>
                            <Text className="text-[15px] text-[#243842]/50 font-medium text-center leading-relaxed">Hinterlegte Dokumente</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push(`/(app)/therapist/client/${id}/checkins` as any)}
                            className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 items-center justify-center flex-1 min-w-[240px] max-w-full md:max-w-[calc(33%-16px)] aspect-square max-h-[260px]"
                            style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 24, elevation: 4 }}
                        >
                            <View className="w-20 h-20 bg-emerald-50 rounded-full items-center justify-center mb-5 border border-emerald-100/50">
                                <Activity size={36} color="#10B981" />
                            </View>
                            <Text className="text-[22px] font-bold text-[#243842] mb-1.5">Check-ins</Text>
                            <Text className="text-[15px] text-[#243842]/50 font-medium text-center leading-relaxed">Stimmungs-Tagebuch</Text>
                        </TouchableOpacity>
                    </View>

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
                                                        onPress={() => promptDeleteExercise(ex.id, ex.title)}
                                                        className="bg-red-50/80 w-11 h-11 rounded-full items-center justify-center ml-2 border border-red-100"
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    >
                                                        <Trash2 size={18} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={{ marginTop: 'auto', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Text className="text-[#243842]/50 text-[12px] font-medium leading-tight shrink pr-4">
                                                        {i18n.t('therapist.telegram_desc')}
                                                    </Text>
                                                    <TouchableOpacity
                                                        onPress={() => promptTelegramWebhook(ex)}
                                                        className="bg-[#137386] w-12 h-12 rounded-full items-center justify-center shadow-sm"
                                                        style={{ shadowColor: '#137386', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 }}
                                                    >
                                                        <Send size={18} color="white" style={{ marginLeft: -2 }} />
                                                    </TouchableOpacity>
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
                                                        onPress={() => promptDeleteExercise(ex.id, ex.title)}
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

                <View className="max-w-4xl mx-auto w-full mt-8">
                    <TouchableOpacity
                        className="bg-[#137386] py-5 rounded-[24px] items-center justify-center flex-row shadow-sm mb-12"
                        style={{ shadowColor: '#137386', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 6 }}
                        onPress={handleOpenModal}
                    >
                        <Activity size={20} color="white" style={{ marginRight: 10 }} />
                        <Text className="text-white font-bold text-[18px]">{i18n.t('therapist.assign_exercise')}</Text>
                    </TouchableOpacity>
                </View>
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
                        <View style={{ flex: 1 }}>
                            <ExerciseBuilder
                                onSave={saveExercise}
                                onCancel={() => setBuilderMode('select')}
                            />
                        </View>
                    )}
                </View>
            </Modal >

            {/* Delete Confirmation Modal */}
            <Modal visible={deleteExerciseModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/40 p-6">
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ width: '100%', maxWidth: 384, backgroundColor: 'white', borderRadius: 40, padding: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 10 }}
                    >
                        <View className="items-center mb-10">
                            <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-6">
                                <Trash2 size={40} color="#EF4444" />
                            </View>
                            <Text className="text-[24px] font-black text-[#243842] mb-3 text-center tracking-tight">{i18n.t('therapist.delete_title')}</Text>
                            <Text className="text-[#243842]/60 font-medium text-center text-[16px] leading-relaxed mb-8">
                                Möchtest du diese Übung wirklich entfernen?
                            </Text>
                            {exerciseToDelete && (
                                <View className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-5 flex-row items-center">
                                    <View className="flex-1">
                                        <Text className="font-bold text-[#243842] text-[17px] text-center" numberOfLines={1}>{exerciseToDelete.title}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 4 }}>
                            <TouchableOpacity onPress={() => setDeleteExerciseModalVisible(false)} style={{ flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 18, borderRadius: 20, alignItems: 'center' }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#243842' }}>{i18n.t('therapist.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmDeleteExercise} style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 18, borderRadius: 20, alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 17, color: 'white' }}>Löschen</Text>
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                </View>
            </Modal>

            {/* Telegram Webhook Modal */}
            <Modal visible={telegramModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/40 p-6">
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ width: '100%', maxWidth: 384, backgroundColor: 'white', borderRadius: 40, padding: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 10 }}
                    >
                        <View className="items-center mb-10">
                            <View className="w-20 h-20 bg-[#137386]/10 rounded-full items-center justify-center mb-6">
                                <Activity size={40} color="#137386" />
                            </View>
                            <Text className="text-[24px] font-black text-[#243842] mb-3 text-center tracking-tight">Erinnerung senden</Text>
                            <Text className="text-[#243842]/60 font-medium text-center text-[16px] leading-relaxed mb-8">
                                Möchtest du dem Klienten eine Erinnerung senden?
                            </Text>
                            {exerciseToRemind && (
                                <View className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-5 flex-row items-center">
                                    <View className="flex-1">
                                        <Text className="font-bold text-[#243842] text-[17px] text-center" numberOfLines={1}>{exerciseToRemind.title}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 4 }}>
                            <TouchableOpacity onPress={() => setTelegramModalVisible(false)} style={{ flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 18, borderRadius: 20, alignItems: 'center' }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#243842' }}>{i18n.t('therapist.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmTelegramWebhook} style={{ flex: 1, backgroundColor: '#137386', paddingVertical: 18, borderRadius: 20, alignItems: 'center', shadowColor: '#137386', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 17, color: 'white' }}>Senden</Text>
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
        </View >
    );
}
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, TextInput, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import { useTimerBlock } from '../../../hooks/useTimerBlock';
import { Exercise, ExerciseBlock } from '../../../types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import i18n from '../../../utils/i18n';

import { Edit3, CheckCircle2, ListChecks, Heart, BookOpen, Clock, Wind, Image as ImageIcon, CircleDot, Activity } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type Answers = Record<string, string>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blockTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        text: i18n.t('blocks.reflection') || 'Reflektion',
        reflection: i18n.t('blocks.reflection') || 'Reflektion',
        scale: i18n.t('blocks.scale') || 'Skala',
        choice: i18n.t('blocks.choice') || 'Auswahl',
        checklist: i18n.t('blocks.checklist') || 'Checkliste',
        homework: i18n.t('blocks.homework') || 'Hausaufgabe',
        gratitude: i18n.t('blocks.gratitude') || 'Dankbarkeit',
        timer: i18n.t('blocks.timer') || 'Timer',
        breathing: i18n.t('blocks.breathing') || 'Atemübung',
        info: i18n.t('blocks.info') || 'Information',
        media: 'Medium'
    };
    return labels[type] ?? 'Block';
}

function getBlockIcon(type: string) {
    switch (type) {
        case 'text':
        case 'reflection': return Edit3;
        case 'scale': return Activity;
        case 'choice': return CircleDot;
        case 'checklist': return ListChecks;
        case 'homework': return CheckCircle2;
        case 'gratitude': return Heart;
        case 'info': return BookOpen;
        case 'media': return ImageIcon;
        case 'timer': return Clock;
        case 'breathing': return Wind;
        default: return Edit3;
    }
}

function formatPdfHtml(exercise: Exercise, answers: Answers): string {
    const rows = (exercise.blocks ?? [])
        .filter(b => b.type === 'text' || b.type === 'reflection')
        .map(b => `<div style="margin-top:20px">
            <h3>Aufgabe:</h3><p>${b.content}</p>
            <h3>Antwort:</h3>
            <p style="background:#f5f5f5;padding:10px;border-radius:5px">${answers[b.id] ?? '<i>Keine Antwort</i>'}</p>
        </div>`)
        .join('');
    return `<html><body style="font-family:Arial;padding:20px">
        <h1 style="color:#2C3E50">${exercise.title}</h1><hr/>${rows}
    </body></html>`;
}

// ─── Block renderers ─────────────────────────────────────────────────────────

function MediaBlock({ block }: { block: ExerciseBlock }) {
    if (!block.mediaUri) return null;

    const sizeClass =
        block.mediaSize === 'small' ? 'h-32' :
            block.mediaSize === 'large' ? 'h-72' :
                'h-48'; // medium is default

    return (
        <View className="mb-4">
            {block.content ? (
                <Text style={{ fontSize: 16, color: '#2C3E50', marginBottom: 12, lineHeight: 24, fontWeight: '500' }}>
                    {block.content}
                </Text>
            ) : null}

            <View className={`w-full ${sizeClass} bg-gray-100 rounded-2xl overflow-hidden border border-gray-200`}>
                {block.mediaType === 'video' ? (
                    <View className="flex-1 items-center justify-center bg-gray-200">
                        <Text className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-2">Video abspielen</Text>
                    </View>
                ) : (
                    <Image
                        source={{ uri: block.mediaUri }}
                        className="w-full h-full"
                        contentFit={block.mediaSize === 'large' ? 'contain' : 'cover'}
                    />
                )}
            </View>
        </View>
    );
}

function ReflectionBlock({ block, value, onChange }: { block: ExerciseBlock; value: string; onChange: (v: string) => void }) {
    return (
        <View>
            {block.content ? <Text style={{ fontSize: 16, color: '#2C3E50', marginBottom: 16, lineHeight: 24, fontWeight: '500' }}>{block.content}</Text> : null}
            {block.type !== 'info' && (
                <View className="bg-gray-50 rounded-2xl p-1 border border-gray-100">
                    <Text className="text-gray-400 font-bold text-xs uppercase tracking-wider mx-3 mt-3 mb-2">Deine Reflektion</Text>
                    <TextInput multiline placeholder="Schreibe deine Gedanken hier auf..." placeholderTextColor="#9CA3AF"
                        className="p-3 min-h-[110px] text-[#2C3E50] text-base" textAlignVertical="top"
                        value={value} onChangeText={onChange} />
                </View>
            )}
        </View>
    );
}

function ScaleBlock({ block, value, onChange }: { block: ExerciseBlock; value: string; onChange: (v: string) => void }) {
    return (
        <View>
            <Text style={{ fontSize: 16, color: '#2C3E50', marginBottom: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center' }}>
                {block.content || 'Bitte bewerte auf einer Skala von 1 bis 10:'}
            </Text>
            <View className="flex-row justify-between mb-2">
                <Text className="text-xs text-gray-400">{block.minLabel ?? 'Gar nicht'}</Text>
                <Text className="text-xs text-gray-400">{block.maxLabel ?? 'Sehr stark'}</Text>
            </View>
            <View className="flex-row flex-wrap justify-center gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                    const selected = value === String(num);
                    return (
                        <TouchableOpacity key={num} onPress={() => onChange(String(num))}
                            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: selected ? '#A855F7' : '#fff', borderColor: selected ? '#A855F7' : '#E5E7EB' }}>
                            <Text style={{ fontWeight: '700', fontSize: 16, color: selected ? '#fff' : '#2C3E50' }}>{num}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

function ChoiceBlock({ block, value, onChange }: { block: ExerciseBlock; value: string; onChange: (v: string) => void }) {
    return (
        <View>
            {block.content ? <Text style={{ fontSize: 16, color: '#2C3E50', marginBottom: 14, lineHeight: 24, fontWeight: '600' }}>{block.content}</Text> : null}
            {(block.options ?? []).map((opt, i) => {
                const selected = value === opt;
                return (
                    <TouchableOpacity key={i} onPress={() => onChange(opt)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, backgroundColor: selected ? '#EEF2FF' : '#F9FAFB', borderWidth: 1.5, borderColor: selected ? '#6366F1' : '#E5E7EB', borderRadius: 14, padding: 14 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selected ? '#6366F1' : '#D1D5DB', backgroundColor: selected ? '#6366F1' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                            {selected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
                        </View>
                        <Text style={{ fontSize: 15, color: selected ? '#4338CA' : '#374151', fontWeight: selected ? '700' : '500', flex: 1 }}>{opt}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

function ChecklistBlock({ block, value, onChange }: { block: ExerciseBlock; value: string; onChange: (v: string) => void }) {
    const checked: string[] = (() => { try { return JSON.parse(value || '[]'); } catch { return []; } })();
    const toggle = (opt: string) => {
        const next = checked.includes(opt) ? checked.filter(c => c !== opt) : [...checked, opt];
        onChange(JSON.stringify(next));
    };
    return (
        <View>
            {block.content ? <Text style={{ fontSize: 16, color: '#2C3E50', marginBottom: 14, fontWeight: '600' }}>{block.content}</Text> : null}
            {(block.options ?? []).map((opt, i) => {
                const isChecked = checked.includes(opt);
                return (
                    <TouchableOpacity key={i} onPress={() => toggle(opt)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, backgroundColor: isChecked ? '#ECFDF5' : '#F9FAFB', borderWidth: 1.5, borderColor: isChecked ? '#10B981' : '#E5E7EB', borderRadius: 14, padding: 14 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: isChecked ? '#10B981' : '#D1D5DB', backgroundColor: isChecked ? '#10B981' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                            {isChecked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
                        </View>
                        <Text style={{ fontSize: 15, color: isChecked ? '#065F46' : '#374151', fontWeight: isChecked ? '700' : '500', flex: 1 }}>{opt}</Text>
                    </TouchableOpacity>
                );
            })}
            {checked.length > 0 && <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 4 }}>{checked.length}/{block.options?.length} erledigt</Text>}
        </View>
    );
}

const ABC_FIELDS = [
    { key: 'A', label: 'A – Auslöser', hint: 'Was ist passiert? (Situation, Ort, Zeit)' },
    { key: 'B', label: 'B – Bewertung', hint: 'Was habe ich gedacht / bewertet?' },
    { key: 'C', label: 'C – Konsequenz', hint: 'Was habe ich gefühlt / getan? (0–10)' },
];

function HomeworkBlock({ block, answers, onChange }: { block: ExerciseBlock; answers: Answers; onChange: (key: string, val: string) => void }) {
    return (
        <View>
            {block.content ? <Text style={{ fontSize: 15, color: '#374151', marginBottom: 16, lineHeight: 22 }}>{block.content}</Text> : null}
            {ABC_FIELDS.map(field => (
                <View key={field.key} style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 4 }}>{field.label}</Text>
                    <TextInput multiline placeholder={field.hint} placeholderTextColor="#9CA3AF"
                        value={answers[`${block.id}_${field.key}`] ?? ''}
                        onChangeText={t => onChange(`${block.id}_${field.key}`, t)}
                        style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', minHeight: 70, textAlignVertical: 'top' }} />
                </View>
            ))}
        </View>
    );
}

function GratitudeBlock({ block, answers, onChange }: { block: ExerciseBlock; answers: Answers; onChange: (key: string, val: string) => void }) {
    return (
        <View>
            {block.content ? <Text style={{ fontSize: 15, color: '#374151', marginBottom: 16, lineHeight: 22 }}>{block.content}</Text> : null}
            {[1, 2, 3].map(n => (
                <View key={n} style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#9D174D', marginBottom: 4 }}>{n}. Ich bin dankbar für...</Text>
                    <TextInput placeholder="..." placeholderTextColor="#9CA3AF"
                        value={answers[`${block.id}_${n}`] ?? ''}
                        onChangeText={t => onChange(`${block.id}_${n}`, t)}
                        style={{ backgroundColor: '#FDF2F8', borderWidth: 1, borderColor: '#FBCFE8', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827' }} />
                </View>
            ))}
        </View>
    );
}

function TimerBlock({ block }: { block: ExerciseBlock }) {
    const isBreathing = block.type === 'breathing';
    const { timeLeft, isRunning, breathPhase, toggle } = useTimerBlock(block.id, block.duration ?? 60, isBreathing);
    const mins = Math.floor(timeLeft / 60);
    const secs = String(timeLeft % 60).padStart(2, '0');
    return (
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            {block.content ? <Text style={{ fontSize: 14, color: '#4B5563', textAlign: 'center', marginBottom: 16 }}>{block.content}</Text> : null}
            {isBreathing && breathPhase ? (
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#0D9488', marginBottom: 12 }}>{breathPhase}</Text>
            ) : isBreathing ? (
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>4-4-4 Atemrhythmus</Text>
            ) : null}
            <View style={{ width: 176, height: 176, borderRadius: 88, alignItems: 'center', justifyContent: 'center', marginBottom: 24, backgroundColor: isRunning ? (isBreathing ? '#14B8A6' : '#2C3E50') : (isBreathing ? '#F0FDFA' : '#F8FAFC'), borderWidth: isRunning ? 0 : 10, borderColor: isBreathing ? '#99F6E4' : '#E2E8F0' }}>
                <Text style={{ fontSize: 36, fontWeight: '800', color: isRunning ? '#fff' : '#2C3E50' }}>{mins}:{secs}</Text>
                {isRunning && <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>läuft...</Text>}
            </View>
            <TouchableOpacity onPress={toggle}
                style={{ paddingHorizontal: 48, paddingVertical: 14, borderRadius: 28, backgroundColor: isRunning ? '#EF4444' : (isBreathing ? '#14B8A6' : '#2C3E50') }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{isRunning ? '⏸ Stop' : '▶ Starten'}</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Block dispatcher ─────────────────────────────────────────────────────────

function ExerciseBlockRenderer({ block, answers, onAnswerChange }: {
    block: ExerciseBlock;
    answers: Answers;
    onAnswerChange: (key: string, val: string) => void;
}) {
    const onChange = (val: string) => onAnswerChange(block.id, val);
    const value = answers[block.id] ?? '';

    switch (block.type) {
        case 'text':
        case 'reflection':
        case 'info':
            return <ReflectionBlock block={block} value={value} onChange={onChange} />;
        case 'media':
            return <MediaBlock block={block} />;
        case 'scale':
            return <ScaleBlock block={block} value={value} onChange={onChange} />;
        case 'choice':
            return <ChoiceBlock block={block} value={value} onChange={onChange} />;
        case 'checklist':
            return <ChecklistBlock block={block} value={value} onChange={onChange} />;
        case 'homework':
            return <HomeworkBlock block={block} answers={answers} onChange={onAnswerChange} />;
        case 'gratitude':
            return <GratitudeBlock block={block} answers={answers} onChange={onAnswerChange} />;
        case 'timer':
        case 'breathing':
            return <TimerBlock block={block} />;
        default:
            return null;
    }
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ExerciseExecutionView() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Answers>({});

    useEffect(() => { if (id) loadExercise(); }, [id]);

    const loadExercise = async () => {
        try {
            const snap = await getDoc(doc(db, 'exercises', id));
            if (snap.exists()) setExercise({ id: snap.id, ...snap.data() } as Exercise);
        } catch (err) {
            console.error('Failed to load exercise:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (key: string, val: string) => {
        setAnswers(prev => ({ ...prev, [key]: val }));
    };

    const handleComplete = async () => {
        try {
            const cleanAnswers: any = {};
            Object.entries(answers).forEach(([k, v]) => {
                if (v !== undefined && v !== null) cleanAnswers[k] = v;
            });

            await updateDoc(doc(db, 'exercises', id as string), {
                completed: true,
                answers: cleanAnswers,
                lastCompletedAt: new Date().toISOString(),
            });

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            Alert.alert(i18n.t('exercise.complete_success'), i18n.t('exercise.complete_success_msg'));
            router.back();
        } catch {
            Alert.alert('Fehler', 'Konnte den Fortschritt nicht speichern.');
        }
    };

    const handleExportPdf = async () => {
        if (!exercise) return;
        try {
            const { uri } = await Print.printToFileAsync({ html: formatPdfHtml(exercise, answers) });
            await Sharing.shareAsync(uri);
        } catch {
            Alert.alert('Fehler', 'PDF konnte nicht generiert werden.');
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2C3E50" />;

    return (
        <View className="flex-1 bg-[#FAF9F6]">
            <View className="bg-[#2C3E50] pt-16 pb-6 px-6 rounded-b-3xl shadow-md z-10 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2 rounded-xl">
                    <Text className="text-white font-bold">{i18n.t('exercise.back')}</Text>
                </TouchableOpacity>
                <Text className="text-xl font-extrabold text-white flex-1 text-right ml-4" numberOfLines={1}>
                    {exercise?.title ?? 'Übung'}
                </Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {(exercise?.blocks ?? []).map((block, index) => (
                    <View key={block.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
                        <View className="flex-row items-center mb-4">
                            <View className="w-8 h-8 rounded-full bg-[#2C3E50]/10 items-center justify-center mr-3">
                                <Text className="text-[#2C3E50] font-bold text-sm">{index + 1}</Text>
                            </View>
                            {(() => {
                                const Icon = getBlockIcon(block.type);
                                return <Icon size={16} color="#9CA3AF" style={{ marginRight: 6 }} />;
                            })()}
                            <Text className="text-gray-400 font-bold text-xs uppercase tracking-wider">
                                {blockTypeLabel(block.type)}
                            </Text>
                        </View>
                        <ExerciseBlockRenderer block={block} answers={answers} onAnswerChange={handleAnswerChange} />
                    </View>
                ))}

                <View className="mt-4 mb-8 gap-4">
                    <TouchableOpacity onPress={handleComplete} disabled={exercise?.completed}
                        className={`py-5 rounded-2xl items-center shadow-sm ${exercise?.completed ? 'bg-gray-200' : 'bg-[#2C3E50]'}`}>
                        <Text className={`font-bold text-lg tracking-wide ${exercise?.completed ? 'text-gray-500' : 'text-white'}`}>
                            {exercise?.completed ? `${i18n.t('exercise.completed') || 'Bereits abgeschlossen'}` : i18n.t('exercise.complete')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleExportPdf} className="bg-white border-2 border-gray-100 py-4 rounded-2xl items-center">
                        <Text className="font-bold text-gray-600 text-lg">{i18n.t('exercise.export_pdf')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, TextInput, ActivityIndicator, Dimensions } from 'react-native';
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
import { useAuth } from '../../../contexts/AuthContext';
import { SuccessAnimation } from '../../../components/ui/SuccessAnimation';
import { MotiView, AnimatePresence } from 'moti';
import { ProgressChart, BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { WebView } from 'react-native-webview';

import { Edit3, CheckCircle2, ListChecks, Heart, BookOpen, Clock, Wind, Image as ImageIcon, CircleDot, Activity, Lock, Unlock, Radar, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon, Film } from 'lucide-react-native';

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
        media: 'Medium',
        video: 'Video-Link',
        spider_chart: 'Netzdiagramm',
        bar_chart: 'Balkendiagramm',
        pie_chart: 'Kreisdiagramm',
        line_chart: 'Liniendiagramm',
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
        case 'video': return Film;
        case 'timer': return Clock;
        case 'breathing': return Wind;
        case 'spider_chart': return Radar;
        case 'bar_chart': return BarChart3;
        case 'pie_chart': return PieChartIcon;
        case 'line_chart': return LineChartIcon;
        default: return Edit3;
    }
}

function formatPdfHtml(exercise: Exercise, answers: Answers): string {
    const rows = (exercise.blocks ?? [])
        .map(b => {
            let hasAnswer = false;
            let answerHtml = '';

            if (b.type === 'text' || b.type === 'reflection' || b.type === 'scale' || b.type === 'choice') {
                const ans = answers[b.id];
                if (ans && ans.trim().length > 0) {
                    hasAnswer = true;
                    answerHtml = `<p style="background:#f5f5f5;padding:10px;border-radius:5px">${ans}</p>`;
                }
            } else if (b.type === 'checklist') {
                const ans = answers[b.id];
                if (ans) {
                    try {
                        const parsed = JSON.parse(ans);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            hasAnswer = true;
                            answerHtml = `<ul style="background:#f5f5f5;padding:10px 10px 10px 30px;border-radius:5px">
                                 ${parsed.map((item: string) => `<li>${item}</li>`).join('')}
                             </ul>`;
                        }
                    } catch (e) { }
                }
            } else if (b.type === 'homework') {
                const a = answers[`${b.id}_A`];
                const b_ans = answers[`${b.id}_B`];
                const c = answers[`${b.id}_C`];
                if ((a && a.trim().length > 0) || (b_ans && b_ans.trim().length > 0) || (c && c.trim().length > 0)) {
                    hasAnswer = true;
                    answerHtml = `<div style="background:#f5f5f5;padding:10px;border-radius:5px">
                         ${a && a.trim().length > 0 ? `<p><strong>A (Auslöser):</strong><br/>${a}</p>` : ''}
                         ${b_ans && b_ans.trim().length > 0 ? `<p><strong>B (Bewertung):</strong><br/>${b_ans}</p>` : ''}
                         ${c && c.trim().length > 0 ? `<p><strong>C (Konsequenz):</strong><br/>${c}</p>` : ''}
                     </div>`;
                }
            } else if (b.type === 'gratitude') {
                const a1 = answers[`${b.id}_1`];
                const a2 = answers[`${b.id}_2`];
                const a3 = answers[`${b.id}_3`];
                const acts = [a1, a2, a3].filter(x => x && x.trim().length > 0);
                if (acts.length > 0) {
                    hasAnswer = true;
                    answerHtml = `<ul style="background:#f5f5f5;padding:10px 10px 10px 30px;border-radius:5px">
                         ${acts.map(item => `<li>${item}</li>`).join('')}
                     </ul>`;
                }
            }

            if (hasAnswer) {
                return `<div style="margin-top:20px">
                     <h3>${blockTypeLabel(b.type)} / Aufgabe:</h3><p>${b.content || ''}</p>
                     <h3>Antwort:</h3>
                     ${answerHtml}
                 </div>`;
            }
            return '';
        })
        .filter(html => html.length > 0)
        .join('');

    return `<html><body style="font-family:Arial;padding:20px">
        <h1 style="color:#2C3E50">${exercise.title}</h1><hr/>${rows || '<p><i>Keine ausgefüllten Übungen vorhanden.</i></p>'}
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

function VideoBlock({ block }: { block: ExerciseBlock }) {
    if (!block.videoUrl && !block.content) return null;

    // Attempt to extract YouTube Video ID for embed URL
    const getEmbedUrl = (url?: string) => {
        if (!url) return '';
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        if (match && match[1]) {
            return `https://www.youtube.com/embed/${match[1]}?rel=0`;
        }
        return url;
    };

    const embedUrl = getEmbedUrl(block.videoUrl || block.content);
    if (!embedUrl) return null;

    return (
        <View className="mb-4">
            {block.content && block.content !== block.videoUrl && (
                <Text style={{ fontSize: 16, color: '#2C3E50', marginBottom: 12, lineHeight: 24, fontWeight: '500' }}>
                    {block.content}
                </Text>
            )}
            <View style={{ height: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <WebView
                    source={{ uri: embedUrl }}
                    style={{ flex: 1 }}
                    allowsFullscreenVideo
                    javaScriptEnabled
                    mediaPlaybackRequiresUserAction={false}
                />
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

const CHART_PALETTE = ['#F97316', '#0EA5E9', '#10B981', '#8B5CF6', '#F43F5E', '#F59E0B', '#14B8A6', '#64748B', '#EC4899', '#3B82F6'];

function InteractiveChartBlock({ block, value, onChange }: { block: ExerciseBlock; value: string; onChange: (v: string) => void }) {
    const currentValues: Record<string, number> = (() => {
        try { return value ? JSON.parse(value) : {}; } catch { return {}; }
    })();

    const updateValue = (label: string, valStr: string) => {
        const next = { ...currentValues };
        const num = parseFloat(valStr);
        if (isNaN(num)) {
            delete next[label];
        } else {
            next[label] = num;
        }
        onChange(JSON.stringify(next));
    };

    const data = (block.options ?? []).map((opt, i) => {
        const parts = opt.split(':');
        const label = parts[0] || `Option ${i + 1}`;
        const defaultVal = parseFloat(parts[1] || '0');
        const color = parts[2] || CHART_PALETTE[i % CHART_PALETTE.length];
        const currentVal = currentValues[label] !== undefined ? currentValues[label] : defaultVal;
        return { label, currentVal, color };
    });

    const screenWidth = Dimensions.get('window').width - 96;

    return (
        <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring' }}
            className="items-center"
        >
            {block.content ? <Text style={{ fontSize: 16, color: '#2C3E50', marginBottom: 20, textAlign: 'center', fontWeight: '600' }}>{block.content}</Text> : null}

            <View className="bg-white rounded-[32px] p-4 shadow-sm border border-gray-100 items-center justify-center overflow-hidden w-full mb-6">
                {block.type === 'spider_chart' && (
                    <ProgressChart
                        data={{
                            labels: data.map(d => d.label),
                            data: data.map(d => Math.min(Math.max(d.currentVal / 100, 0), 1)),
                            colors: data.map(d => d.color)
                        }}
                        width={screenWidth}
                        height={220}
                        strokeWidth={12}
                        radius={32}
                        hideLegend={false}
                        chartConfig={{
                            backgroundColor: 'transparent',
                            backgroundGradientFrom: '#F8FAFC',
                            backgroundGradientTo: '#F1F5F9',
                            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            labelColor: (opacity = 1) => `#6B7C85`,
                        }}
                        style={{ marginVertical: 8 }}
                    />
                )}
                {block.type === 'bar_chart' && (
                    <BarChart
                        data={{
                            labels: data.map(d => d.label),
                            datasets: [{
                                data: data.map(d => d.currentVal || 0),
                                colors: data.map(d => () => d.color)
                            }]
                        }}
                        width={screenWidth}
                        height={220}
                        yAxisLabel=""
                        yAxisSuffix=""
                        fromZero
                        withCustomBarColorFromData={true}
                        flatColor={true}
                        chartConfig={{
                            backgroundColor: 'transparent',
                            backgroundGradientFrom: '#F8FAFC',
                            backgroundGradientTo: '#F1F5F9',
                            color: (opacity = 1) => `rgba(0,0,0, ${opacity})`,
                            labelColor: (opacity = 1) => `#6B7C85`,
                            barPercentage: 0.6,
                        }}
                        style={{ marginVertical: 8 }}
                    />
                )}
                {block.type === 'pie_chart' && (
                    <PieChart
                        data={data.map((d) => ({
                            name: d.label,
                            population: d.currentVal || 0,
                            color: d.color,
                            legendFontColor: '#6B7C85',
                            legendFontSize: 12
                        }))}
                        width={screenWidth}
                        height={220}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                        chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                        style={{ marginVertical: 8 }}
                    />
                )}
                {block.type === 'line_chart' && (
                    <LineChart
                        data={{
                            labels: data.map(d => d.label),
                            datasets: [{ data: data.map(d => d.currentVal || 0) }]
                        }}
                        width={screenWidth}
                        height={220}
                        bezier
                        chartConfig={{
                            backgroundColor: 'transparent',
                            backgroundGradientFrom: '#F8FAFC',
                            backgroundGradientTo: '#F1F5F9',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                            labelColor: (opacity = 1) => `#6B7C85`,
                            propsForDots: { r: "6", strokeWidth: "2", stroke: "#059669" }
                        }}
                        style={{ marginVertical: 8 }}
                    />
                )}
            </View>

            <View className="w-full gap-3">
                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Deine Werte eintragen</Text>
                {data.map((item, i) => (
                    <MotiView
                        key={i}
                        from={{ opacity: 0, translateX: -10 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        transition={{ delay: i * 100 }}
                        className="flex-row items-center bg-gray-50 p-3 rounded-2xl border border-gray-100"
                    >
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: item.color, marginRight: 12 }} />
                        <Text className="flex-1 font-bold text-[#2C3E50] text-base">{item.label}</Text>
                        <TextInput
                            keyboardType="numeric"
                            value={currentValues[item.label] !== undefined ? String(currentValues[item.label]) : ''}
                            onChangeText={(t) => updateValue(item.label, t)}
                            placeholder={String(item.currentVal)}
                            placeholderTextColor="#CBD5E1"
                            className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-center font-bold text-[#137386] min-w-[80px]"
                        />
                    </MotiView>
                ))}
            </View>
        </MotiView>
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
        case 'video':
            return <VideoBlock block={block} />;
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
        case 'spider_chart':
        case 'bar_chart':
        case 'pie_chart':
        case 'line_chart':
            return <InteractiveChartBlock block={block} value={value} onChange={onChange} />;
        default:
            return null;
    }
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ExerciseExecutionView() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { profile } = useAuth();
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Answers>({});
    const [sharedAnswers, setSharedAnswers] = useState(true);
    const [toast, setToast] = useState<{ visible: boolean, message: string, subMessage?: string, type: 'success' | 'error' | 'warning', onDone?: () => void }>({ visible: false, message: '', type: 'success' });

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'error', onDone?: () => void) => {
        setToast({ visible: true, message: title, subMessage: message, type, onDone });
    };

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
                sharedAnswers, // Save privacy preference
                lastCompletedAt: new Date().toISOString(),
            });

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            // Trigger Therapist Notification Webhook
            try {
                const webhookUrl = "https://cloud.activepieces.com/api/v1/webhooks/PLACEHOLDER_COMPLETION"; // Configure in ActivePieces
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'exercise_completed',
                        clientId: profile?.id,
                        clientName: profile?.firstName || 'Ein Klient',
                        exerciseId: id,
                        exerciseTitle: exercise?.title,
                        isShared: sharedAnswers,
                        therapistId: exercise?.therapistId
                    })
                });
            } catch (webhookErr) {
                console.log("Failed to send completion webhook", webhookErr);
            }

            showAlert(i18n.t('exercise.complete_success') || 'Erfolg', i18n.t('exercise.complete_success_msg') || 'Abgeschlossen', 'success', () => {
                router.back();
            });
        } catch {
            showAlert('Fehler', 'Konnte den Fortschritt nicht speichern.', 'error');
        }
    };

    const handleExportPdf = async () => {
        if (!exercise) return;
        try {
            const { uri } = await Print.printToFileAsync({ html: formatPdfHtml(exercise, answers) });
            await Sharing.shareAsync(uri);
        } catch {
            showAlert('Fehler', 'PDF konnte nicht generiert werden.', 'error');
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2C3E50" />;

    return (
        <View className="flex-1 bg-[#FAF9F6]">
            <View className="bg-[#2C3E50] pt-16 pb-6 px-6 rounded-b-3xl shadow-md z-10 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 }}>
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

                {!exercise?.completed && (
                    <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6 mt-2">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1 pr-4">
                                <Text className="text-[#2C3E50] font-bold text-base mb-1">
                                    Antworten teilen
                                </Text>
                                <Text className="text-gray-500 text-xs">
                                    {sharedAnswers
                                        ? "Dein Therapeut kann deine geschriebenen Texte lesen."
                                        : "Deine Antworten bleiben in dieser App verschlüsselt und privat."}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setSharedAnswers(!sharedAnswers)}
                                className={`w-14 h-14 rounded-full items-center justify-center ${sharedAnswers ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100 border border-gray-300'}`}
                            >
                                {sharedAnswers ? <Unlock size={24} color="#3B82F6" /> : <Lock size={24} color="#9CA3AF" />}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <View style={{ marginTop: 16, marginBottom: 32, gap: 14 }}>
                    <TouchableOpacity onPress={handleComplete} disabled={exercise?.completed}
                        style={{ paddingVertical: 18, borderRadius: 20, alignItems: 'center', backgroundColor: exercise?.completed ? '#E5E7EB' : '#2C3E50', shadowColor: '#2C3E50', shadowOffset: { width: 0, height: 8 }, shadowOpacity: exercise?.completed ? 0 : 0.2, shadowRadius: 16, elevation: exercise?.completed ? 0 : 4 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 18, letterSpacing: 0.3, color: exercise?.completed ? '#9CA3AF' : 'white' }}>
                            {exercise?.completed ? `${i18n.t('exercise.completed') || 'Bereits abgeschlossen'}` : i18n.t('exercise.complete')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleExportPdf} style={{ paddingVertical: 18, borderRadius: 20, alignItems: 'center', backgroundColor: 'white', borderWidth: 2, borderColor: '#F3F4F6' }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#6B7280' }}>{i18n.t('exercise.export_pdf')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <SuccessAnimation
                visible={toast.visible}
                type={toast.type}
                message={toast.message}
                subMessage={toast.subMessage}
                onAnimationDone={() => {
                    setToast(prev => ({ ...prev, visible: false }));
                    if (toast.onDone) toast.onDone();
                }}
            />
        </View>
    );
}

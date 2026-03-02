import React, { useState, useCallback, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform, KeyboardTypeOptions } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Edit3, CheckCircle2, ListChecks, Heart, BookOpen, Clock, Wind, Image as ImageIcon, CircleDot, Activity, Radar, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { ProgressChart, BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import ExerciseFlowTimeline from './ExerciseFlowTimeline';
import ExerciseDifficultyGauge from './ExerciseDifficultyGauge';
import Block3DTiltWrapper from './Block3DTiltWrapper';
import Block3DEntrance from './Block3DEntrance';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExerciseBlockType =
    | 'reflection' | 'scale' | 'choice'
    | 'checklist' | 'homework' | 'gratitude'
    | 'info' | 'timer' | 'breathing' | 'media'
    | 'spider_chart' | 'bar_chart' | 'pie_chart' | 'line_chart';

export interface ExerciseBlock {
    id: string;
    type: ExerciseBlockType;
    content: string;
    duration?: number;
    options?: string[];
    minLabel?: string;
    maxLabel?: string;
    mediaUri?: string;
    mediaType?: 'image' | 'video';
    mediaSize?: 'small' | 'medium' | 'large';
}

interface ExerciseBuilderProps {
    initialTitle?: string;
    initialCoverImage?: string;
    initialThemeColor?: string;
    initialBlocks?: ExerciseBlock[];
    onSave: (title: string, blocks: ExerciseBlock[], coverImage?: string, themeColor?: string) => void;
    onCancel: () => void;
}

// ─── Block Catalogue (Fabulous-style) ─────────────────────────────────────────

const CATALOGUE: {
    type: ExerciseBlockType;
    label: string;
    icon: any;
    desc: string;
    accent: string;
    bg: string;
    text: string;
    border: string;
}[] = [
        { type: 'reflection', label: 'Reflektion', icon: Edit3, desc: 'Freie Texteingabe', accent: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
        { type: 'scale', label: 'Skala 1–10', icon: Activity, desc: 'Numerische Bewertung', accent: '#F59E0B', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
        { type: 'choice', label: 'Auswahl', icon: CircleDot, desc: 'Einzelauswahl', accent: '#6366F1', bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
        { type: 'checklist', label: 'Checkliste', icon: ListChecks, desc: 'Mehrfachauswahl', accent: '#10B981', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
        { type: 'homework', label: 'ABC-Protokoll', icon: CheckCircle2, desc: 'Verhaltens-Tagebuch', accent: '#C09D59', bg: '#F9F8F6', text: '#243842', border: '#E5E7EB' },
        { type: 'gratitude', label: 'Dankbarkeit', icon: Heart, desc: 'Dankbarkeits-Journal', accent: '#EC4899', bg: '#FDF2F8', text: '#9D174D', border: '#FBCFE8' },
        { type: 'info', label: 'Info-Text', icon: BookOpen, desc: 'Psychoedukation', accent: '#14B8A6', bg: '#F0FDFA', text: '#134E4A', border: '#99F6E4' },
        { type: 'media', label: 'Foto / Video', icon: ImageIcon, desc: 'Medien-Upload', accent: '#F43F5E', bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
        { type: 'timer', label: 'Timer', icon: Clock, desc: 'Countdown Start', accent: '#8B5CF6', bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
        { type: 'breathing', label: 'Atemübung', icon: Wind, desc: '4-4-4 Rhythmus', accent: '#137386', bg: '#F9F8F6', text: '#243842', border: '#E5E7EB' },
        { type: 'spider_chart', label: 'Netzdiagramm', icon: Radar, desc: 'Profilanalyse', accent: '#F97316', bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
        { type: 'bar_chart', label: 'Balkendiagramm', icon: BarChart3, desc: 'Wertevergleich', accent: '#0EA5E9', bg: '#F0F9FF', text: '#0369A1', border: '#BAE6FD' },
        { type: 'pie_chart', label: 'Kreisdiagramm', icon: PieChartIcon, desc: 'Verteilung', accent: '#8B5CF6', bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
        { type: 'line_chart', label: 'Liniendiagramm', icon: LineChartIcon, desc: 'Entwicklung', accent: '#10B981', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
    ];

function getCat(type: ExerciseBlockType) {
    return CATALOGUE.find(c => c.type === type) ?? CATALOGUE[0];
}

const CHART_PALETTE = ['#F97316', '#0EA5E9', '#10B981', '#8B5CF6', '#F43F5E', '#F59E0B', '#14B8A6', '#64748B', '#EC4899', '#3B82F6'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).substring(2, 9); }

function defaultBlock(type: ExerciseBlockType): ExerciseBlock {
    const block: any = { id: uid(), type, content: '' };
    if (type === 'timer' || type === 'breathing') block.duration = 120;
    if (type === 'choice' || type === 'checklist' || type === 'spider_chart' || type === 'bar_chart' || type === 'pie_chart' || type === 'line_chart') block.options = ['', ''];
    if (type === 'scale') {
        block.minLabel = 'Gar nicht';
        block.maxLabel = 'Sehr stark';
    }
    return block as ExerciseBlock;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const SectionLabel = memo(function SectionLabel({ text }: { text: string }) {
    return <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{text}</Text>;
});

const StyledInput = memo(function StyledInput({ value, onChangeText, placeholder, multiline, keyboardType }: {
    value: string; onChangeText: (t: string) => void; placeholder: string; multiline?: boolean; keyboardType?: KeyboardTypeOptions;
}) {
    return (
        <TextInput
            value={value} onChangeText={onChangeText} placeholder={placeholder}
            placeholderTextColor="#8F9CA3" multiline={multiline}
            keyboardType={keyboardType}
            textAlignVertical={multiline ? 'top' : 'center'}
            style={{
                backgroundColor: '#F9F8F6', borderWidth: 1.5, borderColor: '#E8E6E1',
                borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18,
                fontSize: 16, color: '#243842', minHeight: multiline ? 140 : undefined,
                fontWeight: '500'
            }}
        />
    );
});

// ─── Block Form ───────────────────────────────────────────────────────────────

const BlockForm = memo(function BlockForm({ block, onUpdateBlock, onRemoveBlock, onMoveBlock, isFirst, isLast, onDuplicateBlock }: {
    block: ExerciseBlock;
    onUpdateBlock: (id: string, updates: Partial<ExerciseBlock>) => void;
    onRemoveBlock: (id: string) => void;
    onMoveBlock: (id: string, dir: 'up' | 'down') => void;
    isFirst: boolean; isLast: boolean;
    onDuplicateBlock: (id: string) => void;
}) {
    const cat = getCat(block.type);
    const id = block.id;

    const onChange = useCallback((updates: Partial<ExerciseBlock>) => onUpdateBlock(id, updates), [id, onUpdateBlock]);
    const onRemove = useCallback(() => onRemoveBlock(id), [id, onRemoveBlock]);
    const onMove = useCallback((dir: 'up' | 'down') => onMoveBlock(id, dir), [id, onMoveBlock]);
    const onDuplicate = useCallback(() => onDuplicateBlock(id), [id, onDuplicateBlock]);

    const addOption = useCallback(() => onChange({ options: [...(block.options ?? []), ''] }), [block.options, onChange]);
    const removeOption = useCallback((i: number) => onChange({ options: (block.options ?? []).filter((_, idx) => idx !== i) }), [block.options, onChange]);
    const updateOption = useCallback((i: number, val: string) => {
        const opts = [...(block.options ?? [])]; opts[i] = val;
        onChange({ options: opts });
    }, [block.options, onChange]);

    const pickMedia = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Berechtigung verweigert", "Zugriff auf die Galerie wird benötigt.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'], // both images and videos
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            onChange({
                mediaUri: asset.uri,
                mediaType: asset.type === 'video' ? 'video' : 'image'
            });
        }
    };

    return (
        <View style={{ marginBottom: 28, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: cat.border, backgroundColor: '#FFFFFF', shadowColor: cat.accent, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 6 }}>
            {/* Context Handler / Drag Indication */}
            <View style={{ alignItems: 'center', backgroundColor: cat.bg, paddingTop: 8, paddingBottom: 4 }}>
                <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: cat.text, opacity: 0.15 }} />
            </View>

            {/* Card Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20, paddingTop: 16, backgroundColor: cat.bg, borderBottomWidth: 1, borderBottomColor: cat.border }}>
                {/* Type Badge */}
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: cat.accent, alignItems: 'center', justifyContent: 'center', shadowColor: cat.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 }}>
                        <cat.icon size={22} color="#fff" />
                    </View>
                    <View>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: cat.text }}>{cat.label}</Text>
                        <Text style={{ fontSize: 12, color: cat.text, opacity: 0.75, fontWeight: '600', marginTop: 1 }}>{cat.desc}</Text>
                    </View>
                </View>
                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                        { icon: '↑', onPress: () => onMove('up'), disabled: isFirst },
                        { icon: '↓', onPress: () => onMove('down'), disabled: isLast },
                        { icon: '⧉', onPress: onDuplicate, disabled: false },
                        { icon: '✕', onPress: onRemove, disabled: false, danger: true },
                    ].map((btn, i) => (
                        <TouchableOpacity key={i} onPress={btn.onPress} disabled={btn.disabled}
                            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: btn.danger ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center', opacity: btn.disabled ? 0.3 : 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: btn.danger ? '#EF4444' : '#475569' }}>{btn.icon}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Card Body */}
            <View style={{ padding: 32, backgroundColor: '#FFFFFF' }}>

                {/* REFLECTION */}
                {block.type === 'reflection' && (
                    <>
                        <SectionLabel text="Aufgabe / Frage an den Klienten" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })}
                            placeholder="Was möchtest du reflektieren? Beschreibe die Aufgabe..." multiline />
                    </>
                )}

                {/* INFO */}
                {block.type === 'info' && (
                    <>
                        <SectionLabel text="Psycho-edukations-Text (Klient liest nur)" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })}
                            placeholder="Erkläre dem Klienten z.B. das ABC-Modell, Grounding-Techniken, Verhaltensexperimente..." multiline />
                    </>
                )}

                {/* SCALE */}
                {block.type === 'scale' && (
                    <>
                        <SectionLabel text="Frage für die Skala" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })}
                            placeholder="z.B. Wie stark ist deine Anspannung gerade? (0 = keine, 10 = maximal)" />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <View style={{ flex: 1 }}>
                                <SectionLabel text="Label 1 (links)" />
                                <StyledInput value={block.minLabel ?? ''} onChangeText={t => onChange({ minLabel: t })} placeholder="Gar nicht" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <SectionLabel text="Label 10 (rechts)" />
                                <StyledInput value={block.maxLabel ?? ''} onChangeText={t => onChange({ maxLabel: t })} placeholder="Sehr stark" />
                            </View>
                        </View>
                        {/* Scale Preview */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 2 }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <View key={n} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: cat.bg, borderWidth: 1, borderColor: cat.border, alignItems: 'center', justifyContent: 'center', shadowColor: cat.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: cat.text }}>{n}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 8, fontWeight: '500' }}>Vorschau – Klient wählt einen Wert</Text>
                    </>
                )}

                {/* CHOICE */}
                {block.type === 'choice' && (
                    <>
                        <SectionLabel text="Frage" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })} placeholder="z.B. Wie war deine Stimmung heute?" />
                        <View style={{ marginTop: 12 }}>
                            <SectionLabel text="Antwortmöglichkeiten (Einzelauswahl)" />
                            <AnimatePresence>
                                {(block.options ?? []).map((opt, i) => (
                                    <MotiView
                                        key={`choice-${i}`}
                                        from={{ opacity: 0, translateY: -10 }}
                                        animate={{ opacity: 1, translateY: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
                                        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                                    >
                                        <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: cat.accent }} />
                                        <View style={{ flex: 1 }}>
                                            <StyledInput value={opt} onChangeText={t => updateOption(i, t)} placeholder={`Option ${i + 1}...`} />
                                        </View>
                                        {(block.options?.length ?? 0) > 2 && (
                                            <TouchableOpacity onPress={() => removeOption(i)}>
                                                <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 18 }}>×</Text>
                                            </TouchableOpacity>
                                        )}
                                    </MotiView>
                                ))}
                            </AnimatePresence>
                            <TouchableOpacity onPress={addOption}
                                style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: cat.border, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8, backgroundColor: cat.bg }}>
                                <Text style={{ color: cat.accent, fontWeight: '800', fontSize: 14 }}>+ Option hinzufügen</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {/* CHECKLIST */}
                {block.type === 'checklist' && (
                    <>
                        <SectionLabel text="Anweisung / Titel der Gewohnheitsliste" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })} placeholder="z.B. Was hast du heute für dich getan?" />
                        <View style={{ marginTop: 12 }}>
                            <SectionLabel text="Checklisten-Elemente" />
                            <AnimatePresence>
                                {(block.options ?? []).map((opt, i) => (
                                    <MotiView
                                        key={`checklist-${i}`}
                                        from={{ opacity: 0, translateY: -10 }}
                                        animate={{ opacity: 1, translateY: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
                                        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                                    >
                                        <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: cat.accent }} />
                                        <View style={{ flex: 1 }}>
                                            <StyledInput value={opt} onChangeText={t => updateOption(i, t)} placeholder={`Element ${i + 1}...`} />
                                        </View>
                                        {(block.options?.length ?? 0) > 2 && (
                                            <TouchableOpacity onPress={() => removeOption(i)}>
                                                <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 18 }}>×</Text>
                                            </TouchableOpacity>
                                        )}
                                    </MotiView>
                                ))}
                            </AnimatePresence>
                            <TouchableOpacity onPress={addOption}
                                style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: cat.border, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8, backgroundColor: cat.bg }}>
                                <Text style={{ color: cat.accent, fontWeight: '800', fontSize: 14 }}>+ Element hinzufügen</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {/* HOMEWORK (ABC-Protokoll) */}
                {block.type === 'homework' && (
                    <>
                        <SectionLabel text="Aufgabe / Anweisung" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })}
                            placeholder="z.B. Notiere täglich eine Situation die dich belastet hat und analysiere sie nach dem ABC-Schema..." multiline />
                        <View style={{ marginTop: 16, backgroundColor: cat.bg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: cat.border }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: cat.text, marginBottom: 12 }}>📝 ABC-Protokoll Vorlage</Text>
                            {[
                                { label: 'A – Auslöser', hint: 'Was ist passiert? (Situation, Ort, Zeit)' },
                                { label: 'B – Bewertung', hint: 'Was habe ich gedacht / bewertet?' },
                                { label: 'C – Consequence', hint: 'Was habe ich gefühlt / getan? (0–10)' },
                            ].map(row => (
                                <View key={row.label} style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start', gap: 8 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.accent, marginTop: 5 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '800', color: cat.text }}>{row.label}</Text>
                                        <Text style={{ fontSize: 13, color: cat.text, opacity: 0.8, marginTop: 2 }}>{row.hint}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* GRATITUDE */}
                {block.type === 'gratitude' && (
                    <>
                        <SectionLabel text="Anweisung an den Klienten" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })}
                            placeholder="z.B. Notiere 3 Dinge, für die du heute dankbar bist – egal wie klein..." />
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                            {['1.', '2.', '3.'].map(n => (
                                <View key={n} style={{ flex: 1, backgroundColor: cat.bg, borderRadius: 20, borderWidth: 1, borderColor: cat.border, paddingVertical: 20, alignItems: 'center', shadowColor: cat.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 }}>
                                    <Text style={{ fontSize: 24 }}>🙏</Text>
                                    <Text style={{ fontSize: 14, fontWeight: '800', color: cat.text, marginTop: 6 }}>{n}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* MEDIA (Photo/Video) */}
                {block.type === 'media' && (
                    <>
                        <SectionLabel text="Aufgabenbeschreibung / Titel zum Medium" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })}
                            placeholder="z.B. Schau dir dieses Bild an und beschreibe deine Gefühle..." multiline />

                        <View style={{ marginTop: 16 }}>
                            <SectionLabel text="Foto oder Video anhängen" />
                            {block.mediaUri ? (
                                <View style={{ marginTop: 12, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', position: 'relative' }}>
                                    {block.mediaType === 'video' ? (
                                        <View style={{ height: 240, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0' }}>
                                            <Text style={{ fontSize: 40 }}>🎥</Text>
                                            <Text style={{ marginTop: 12, fontWeight: '700', color: '#475569', fontSize: 16 }}>Video ausgewählt</Text>
                                        </View>
                                    ) : (
                                        <Image source={{ uri: block.mediaUri }} style={{ width: '100%', height: 240 }} contentFit="cover" />
                                    )}
                                    <View style={{ position: 'absolute', top: 16, right: 16, flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity onPress={pickMedia} style={{ backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155' }}>Ändern</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => onChange({ mediaUri: undefined, mediaType: undefined })} style={{ backgroundColor: 'rgba(239,68,68,0.95)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Löschen</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Size Selector */}
                                    <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 12 }}>Anzeigegröße in der App:</Text>
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            {(['small', 'medium', 'large'] as const).map(size => {
                                                const isActive = block.mediaSize === size || (!block.mediaSize && size === 'medium');
                                                const labels = { small: 'Klein', medium: 'Mittel', large: 'Vollbild' };
                                                return (
                                                    <TouchableOpacity
                                                        key={size}
                                                        onPress={() => onChange({ mediaSize: size })}
                                                        style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: isActive ? cat.accent : '#E2E8F0', backgroundColor: isActive ? cat.bg : '#fff' }}
                                                    >
                                                        <Text style={{ fontSize: 14, fontWeight: '700', color: isActive ? cat.accent : '#64748B' }}>
                                                            {labels[size]}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )
                                            })}
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={pickMedia}
                                    style={{ marginTop: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: 20, paddingVertical: 40, alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <Text style={{ fontSize: 32, color: '#3B82F6' }}>📸</Text>
                                    </View>
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 6 }}>Medium auswählen</Text>
                                    <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', fontWeight: '500' }}>Unterstützt Fotos und Videos aus der Galerie</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}

                {/* TIMER / BREATHING */}
                {(block.type === 'timer' || block.type === 'breathing') && (
                    <>
                        <SectionLabel text={block.type === 'breathing' ? 'Anweisung zur Atemübung' : 'Anweisung / Beschreibung'} />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })}
                            placeholder={block.type === 'breathing' ? 'z.B. Atme ruhig und gleichmäßig. Konzentriere dich auf deinen Atem.' : 'z.B. Halte inne, schließe die Augen und entspanne dich.'} />
                        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 16 }}>
                            <Text style={{ fontSize: 14, color: '#334155', fontWeight: '800' }}>Dauer</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {[30, 60, 120, 300].map(sec => {
                                    const isActive = block.duration === sec;
                                    return (
                                        <TouchableOpacity key={sec} onPress={() => onChange({ duration: sec })}
                                            style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: isActive ? cat.accent : '#F1F5F9', shadowColor: isActive ? cat.accent : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isActive ? 0.3 : 0, shadowRadius: 4, elevation: isActive ? 2 : 0 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#fff' : '#64748B' }}>
                                                {sec < 60 ? `${sec}s` : `${sec / 60}min`}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                        {block.type === 'breathing' && (
                            <View style={{ marginTop: 12, backgroundColor: cat.bg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: cat.border, flexDirection: 'row', justifyContent: 'space-around' }}>
                                {['4s Einatmen', '4s Halten', '4s Ausatmen'].map(phase => (
                                    <View key={phase} style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 24 }}>🌬️</Text>
                                        <Text style={{ fontSize: 12, color: cat.text, fontWeight: '800', marginTop: 4 }}>{phase}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* SPIDER CHART / RADAR CHART */}
                {block.type === 'spider_chart' && (
                    <>
                        <SectionLabel text="Titel / Fragestellung" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })} placeholder="z.B. Werteprofil der aktuellen Lebensbereiche" />

                        <View style={{ marginTop: 16 }}>
                            <SectionLabel text="Kategorien & Werte (z.B. 0-100)" />
                            <AnimatePresence>
                                {(block.options ?? []).map((opt, i) => {
                                    const parts = opt.split(':');
                                    const label = parts[0] || '';
                                    const val = parts[1] || '';
                                    const color = parts[2] || CHART_PALETTE[i % CHART_PALETTE.length];
                                    return (
                                        <MotiView
                                            key={`spider-${i}`}
                                            from={{ opacity: 0, translateX: -20 }}
                                            animate={{ opacity: 1, translateX: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
                                            transition={{ type: 'timing', duration: 300 }}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                                        >
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    const nextIdx = (CHART_PALETTE.indexOf(color) + 1) % CHART_PALETTE.length;
                                                    updateOption(i, `${label}:${val}:${CHART_PALETTE[nextIdx]}`);
                                                }}
                                                style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, borderWidth: 2, borderColor: '#E8E6E1', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: {width: 0, height: 1}, elevation: 1 }} 
                                            />
                                            <View style={{ flex: 2 }}>
                                                <StyledInput value={label} onChangeText={t => updateOption(i, `${t}:${val}:${color}`)} placeholder={`Kategorie ${i + 1}...`} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <StyledInput value={val} keyboardType="numeric" onChangeText={t => updateOption(i, `${label}:${t}:${color}`)} placeholder="Wert (z.B. 80)" />
                                            </View>
                                            {(block.options?.length ?? 0) > 3 && (
                                                <TouchableOpacity onPress={() => removeOption(i)}>
                                                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 18 }}>×</Text>
                                                </TouchableOpacity>
                                            )}
                                        </MotiView>
                                    );
                                })}
                            </AnimatePresence>
                            <TouchableOpacity onPress={() => updateOption((block.options?.length ?? 0), '::')}
                                style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: cat.border, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8, backgroundColor: cat.bg }}>
                                <Text style={{ color: cat.accent, fontWeight: '800', fontSize: 14 }}>+ Kategorie hinzufügen</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Chart Preview */}
                        <View style={{ marginTop: 24, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E6E1', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7C85', marginBottom: 12 }}>VORSCHAU</Text>
                            <ProgressChart
                                data={{
                                    labels: (block.options ?? []).map(o => o.split(':')[0] || '?'),
                                    data: (block.options ?? []).map(o => {
                                        const v = parseFloat(o.split(':')[1] || '0');
                                        return isNaN(v) ? 0 : Math.min(Math.max(v / 100, 0), 1); // Normalize to 0-1 range for ProgressChart
                                    }),
                                    colors: (block.options ?? []).map((o, i) => o.split(':')[2] || CHART_PALETTE[i % CHART_PALETTE.length])
                                }}
                                width={Dimensions.get('window').width > 800 ? 400 : Dimensions.get('window').width - 120}
                                height={220}
                                strokeWidth={12}
                                radius={32}
                                hideLegend={false}
                                chartConfig={{
                                    backgroundColor: '#ffffff',
                                    backgroundGradientFrom: '#ffffff',
                                    backgroundGradientTo: '#ffffff',
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                                    style: { borderRadius: 16 },
                                    propsForLabels: { fontSize: 10, fontWeight: 'bold' }
                                }}
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                        </View>
                    </>
                )}

                {/* BAR CHART */}
                {block.type === 'bar_chart' && (
                    <>
                        <SectionLabel text="Titel / Fragestellung" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })} placeholder="z.B. Häufigkeit von Symptomen diese Woche" />

                        <View style={{ marginTop: 16 }}>
                            <SectionLabel text="Kategorien & Werte" />
                            <AnimatePresence>
                                {(block.options ?? []).map((opt, i) => {
                                    const parts = opt.split(':');
                                    const label = parts[0] || '';
                                    const val = parts[1] || '';
                                    const color = parts[2] || CHART_PALETTE[i % CHART_PALETTE.length];
                                    return (
                                        <MotiView
                                            key={`bar-${i}`}
                                            from={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            transition={{ type: 'spring', delay: i * 50 }}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                                        >
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    const nextIdx = (CHART_PALETTE.indexOf(color) + 1) % CHART_PALETTE.length;
                                                    updateOption(i, `${label}:${val}:${CHART_PALETTE[nextIdx]}`);
                                                }}
                                                style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: color, borderWidth: 2, borderColor: '#E8E6E1', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: {width: 0, height: 1}, elevation: 1 }} 
                                            />
                                            <View style={{ flex: 2 }}>
                                                <StyledInput value={label} onChangeText={t => updateOption(i, `${t}:${val}:${color}`)} placeholder={`Parameter ${i + 1}...`} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <StyledInput value={val} keyboardType="numeric" onChangeText={t => updateOption(i, `${label}:${t}:${color}`)} placeholder="Wert" />
                                            </View>
                                            {(block.options?.length ?? 0) > 2 && (
                                                <TouchableOpacity onPress={() => removeOption(i)}>
                                                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 18 }}>×</Text>
                                                </TouchableOpacity>
                                            )}
                                        </MotiView>
                                    );
                                })}
                            </AnimatePresence>
                            <TouchableOpacity onPress={() => updateOption((block.options?.length ?? 0), '::')}
                                style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: cat.border, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8, backgroundColor: cat.bg }}>
                                <Text style={{ color: cat.accent, fontWeight: '800', fontSize: 14 }}>+ Parameter hinzufügen</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Chart Preview */}
                        <View style={{ marginTop: 24, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E6E1', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7C85', marginBottom: 12 }}>VORSCHAU</Text>
                            <BarChart
                                data={{
                                    labels: (block.options ?? []).map(o => o.split(':')[0] || '?'),
                                    datasets: [{ 
                                        data: (block.options ?? []).map(o => parseFloat(o.split(':')[1] || '0') || 0),
                                        colors: (block.options ?? []).map((o, i) => {
                                            const c = o.split(':')[2] || CHART_PALETTE[i % CHART_PALETTE.length];
                                            return () => c;
                                        })
                                    }]
                                }}
                                width={Dimensions.get('window').width > 800 ? 400 : Dimensions.get('window').width - 120}
                                height={220}
                                yAxisLabel=""
                                yAxisSuffix=""
                                fromZero
                                withCustomBarColorFromData={true}
                                flatColor={true}
                                chartConfig={{
                                    backgroundColor: '#ffffff',
                                    backgroundGradientFrom: '#ffffff',
                                    backgroundGradientTo: '#ffffff',
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                                    barPercentage: 0.6,
                                    propsForLabels: { fontSize: 10, fontWeight: 'bold' }
                                }}
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                        </View>
                    </>
                )}

                {/* PIE CHART */}
                {block.type === 'pie_chart' && (
                    <>
                        <SectionLabel text="Titel / Fragestellung" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })} placeholder="z.B. Wie teilt sich deine Zeit auf?" />

                        <View style={{ marginTop: 16 }}>
                            <SectionLabel text="Kategorien & Werte" />
                            <AnimatePresence>
                                {(block.options ?? []).map((opt, i) => {
                                    const parts = opt.split(':');
                                    const label = parts[0] || '';
                                    const val = parts[1] || '';
                                    const color = parts[2] || CHART_PALETTE[i % CHART_PALETTE.length];
                                    return (
                                        <MotiView
                                            key={`pie-${i}`}
                                            from={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            transition={{ type: 'spring', delay: i * 50 }}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                                        >
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    const nextIdx = (CHART_PALETTE.indexOf(color) + 1) % CHART_PALETTE.length;
                                                    updateOption(i, `${label}:${val}:${CHART_PALETTE[nextIdx]}`);
                                                }}
                                                style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, borderWidth: 2, borderColor: '#E8E6E1', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: {width: 0, height: 1}, elevation: 1 }} 
                                            />
                                            <View style={{ flex: 2 }}>
                                                <StyledInput value={label} onChangeText={t => updateOption(i, `${t}:${val}:${color}`)} placeholder={`Segment ${i + 1}...`} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <StyledInput value={val} keyboardType="numeric" onChangeText={t => updateOption(i, `${label}:${t}:${color}`)} placeholder="Wert" />
                                            </View>
                                            {(block.options?.length ?? 0) > 2 && (
                                                <TouchableOpacity onPress={() => removeOption(i)}>
                                                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 18 }}>×</Text>
                                                </TouchableOpacity>
                                            )}
                                        </MotiView>
                                    );
                                })}
                            </AnimatePresence>
                            <TouchableOpacity onPress={() => updateOption((block.options?.length ?? 0), '::')}
                                style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: cat.border, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8, backgroundColor: cat.bg }}>
                                <Text style={{ color: cat.accent, fontWeight: '800', fontSize: 14 }}>+ Segment hinzufügen</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Chart Preview */}
                        <View style={{ marginTop: 24, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E6E1', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7C85', marginBottom: 12 }}>VORSCHAU</Text>
                            <PieChart
                                data={(block.options ?? []).map((o, i) => ({
                                    name: o.split(':')[0] || '?',
                                    population: parseFloat(o.split(':')[1] || '0') || 0,
                                    color: o.split(':')[2] || CHART_PALETTE[i % CHART_PALETTE.length],
                                    legendFontColor: '#6B7C85',
                                    legendFontSize: 12
                                }))}
                                width={Dimensions.get('window').width > 800 ? 400 : Dimensions.get('window').width - 120}
                                height={220}
                                chartConfig={{
                                    backgroundColor: '#ffffff',
                                    backgroundGradientFrom: '#ffffff',
                                    backgroundGradientTo: '#ffffff',
                                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                }}
                                accessor="population"
                                backgroundColor="transparent"
                                paddingLeft="15"
                                absolute
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                        </View>
                    </>
                )}

                {/* LINE CHART */}
                {block.type === 'line_chart' && (
                    <>
                        <SectionLabel text="Titel / Fragestellung" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })} placeholder="z.B. Stimmung im Tagesverlauf" />

                        <View style={{ marginTop: 16 }}>
                            <SectionLabel text="Kategorien & Werte (Zeitpunkte/Datenpunkte)" />
                            <AnimatePresence>
                                {(block.options ?? []).map((opt, i) => {
                                    const parts = opt.split(':');
                                    const label = parts[0] || '';
                                    const val = parts[1] || '';
                                    return (
                                        <MotiView
                                            key={`line-${i}`}
                                            from={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            transition={{ type: 'spring', delay: i * 50 }}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                                        >
                                            <View style={{ flex: 2 }}>
                                                <StyledInput value={label} onChangeText={t => updateOption(i, `${t}:${val}`)} placeholder={`X-Achse (z.B. Mo) ${i + 1}...`} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <StyledInput value={val} keyboardType="numeric" onChangeText={t => updateOption(i, `${label}:${t}`)} placeholder="Y-Wert" />
                                            </View>
                                            {(block.options?.length ?? 0) > 2 && (
                                                <TouchableOpacity onPress={() => removeOption(i)}>
                                                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 18 }}>×</Text>
                                                </TouchableOpacity>
                                            )}
                                        </MotiView>
                                    );
                                })}
                            </AnimatePresence>
                            <TouchableOpacity onPress={() => updateOption((block.options?.length ?? 0), ':')}
                                style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: cat.border, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8, backgroundColor: cat.bg }}>
                                <Text style={{ color: cat.accent, fontWeight: '800', fontSize: 14 }}>+ Datenpunkt hinzufügen</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Chart Preview */}
                        <View style={{ marginTop: 24, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E6E1', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7C85', marginBottom: 12 }}>VORSCHAU</Text>
                            <LineChart
                                data={{
                                    labels: (block.options ?? []).map(o => o.split(':')[0] || '?'),
                                    datasets: [{ data: (block.options ?? []).map(o => parseFloat(o.split(':')[1] || '0') || 0) }]
                                }}
                                width={Dimensions.get('window').width > 800 ? 400 : Dimensions.get('window').width - 120}
                                height={220}
                                chartConfig={{
                                    backgroundColor: '#ffffff',
                                    backgroundGradientFrom: '#ffffff',
                                    backgroundGradientTo: '#ffffff',
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                                    propsForDots: {
                                        r: "6",
                                        strokeWidth: "2",
                                        stroke: "#059669"
                                    }
                                }}
                                bezier
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                        </View>
                    </>
                )}
            </View>
        </View>
    );
});

// ─── Block Picker ─────────────────────────────────────────────────────────────

const BlockPicker = memo(function BlockPicker({ onAdd, onClose }: { onAdd: (t: ExerciseBlockType) => void; onClose: () => void }) {
    return (
        <View style={{ marginVertical: 24, backgroundColor: '#FFFFFF', borderRadius: 32, padding: 32, borderWidth: 1, borderColor: '#E8E6E1', shadowColor: '#243842', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.1, shadowRadius: 32, elevation: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ color: '#243842', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>Neuen Block hinzufügen</Text>
                <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F9F8F6', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#6B7C85', fontWeight: '800', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                {CATALOGUE.map(cat => (
                    <TouchableOpacity key={cat.type} onPress={() => onAdd(cat.type)}
                        style={{ flexBasis: '46%', flexGrow: 1, backgroundColor: '#F9F8F6', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E8E6E1', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: cat.bg, borderWidth: 1, borderColor: cat.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: cat.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 }}>
                            <cat.icon size={26} color={cat.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#243842', marginBottom: 2 }}>{cat.label}</Text>
                            <Text style={{ fontSize: 13, color: '#6B7C85', fontWeight: '600' }}>{cat.desc}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
});

// ─── Main Component ───────────────────────────────────────────────────────────

const THEME_COLORS = ['#137386', '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#10B981', '#64748B'];

export default function ExerciseBuilder({ initialTitle = '', initialCoverImage, initialThemeColor, initialBlocks = [], onSave, onCancel }: ExerciseBuilderProps) {
    const [title, setTitle] = useState(initialTitle);
    const [coverImage, setCoverImage] = useState<string | undefined>(initialCoverImage);
    const [themeColor, setThemeColor] = useState<string>(initialThemeColor || THEME_COLORS[0]);
    const [blocks, setBlocks] = useState<ExerciseBlock[]>(initialBlocks);
    const [showPicker, setShowPicker] = useState(false);

    const pickCoverImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Berechtigung verweigert", "Zugriff auf die Galerie wird benötigt.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setCoverImage(result.assets[0].uri);
        }
    };

    const addBlock = useCallback((type: ExerciseBlockType) => {
        setBlocks(prev => [...prev, defaultBlock(type)]);
        setShowPicker(false);
    }, []);

    const updateBlock = useCallback((id: string, updates: Partial<ExerciseBlock>) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    }, []);

    const removeBlock = useCallback((id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
    }, []);

    const moveBlock = useCallback((id: string, dir: 'up' | 'down') => {
        setBlocks(prev => {
            const i = prev.findIndex(b => b.id === id);
            if (dir === 'up' && i === 0) return prev;
            if (dir === 'down' && i === prev.length - 1) return prev;
            const next = [...prev];
            const s = dir === 'up' ? i - 1 : i + 1;
            [next[i], next[s]] = [next[s], next[i]];
            return next;
        });
    }, []);

    const duplicateBlock = useCallback((id: string) => {
        setBlocks(prev => {
            const i = prev.findIndex(b => b.id === id);
            const copy = { ...prev[i], id: uid() };
            const next = [...prev];
            next.splice(i + 1, 0, copy);
            return next;
        });
    }, []);

    const handleSave = () => {
        if (!title.trim()) {
            if (Platform.OS === 'web') window.alert('Bitte gib der Übung einen Titel.');
            else Alert.alert('Fehler', 'Bitte gib der Übung einen Titel.');
            return;
        }
        if (blocks.length === 0) {
            if (Platform.OS === 'web') window.alert('Füge mindestens einen Block hinzu.');
            else Alert.alert('Fehler', 'Füge mindestens einen Block hinzu.');
            return;
        }

        // Remove undefined values to prevent Firestore errors
        const sanitizedBlocks = blocks.map(block => {
            const cleanBlock: any = {};
            for (const key in block) {
                const val = (block as any)[key];
                if (val !== undefined && val !== null) {
                    cleanBlock[key] = val;
                }
            }
            return cleanBlock;
        });

        onSave(title.trim(), sanitizedBlocks as ExerciseBlock[], coverImage, themeColor);
    };

    const handleCancel = () => {
        // Fix #16: Guard against accidental cancellation with data loss
        if (blocks.length > 0 || title.trim()) {
            if (Platform.OS === 'web') {
                if (window.confirm('Du hast Änderungen, die noch nicht gespeichert wurden. Möchtest du wirklich abbrechen?')) {
                    onCancel();
                }
            } else {
                Alert.alert(
                    'Änderungen verwerfen?',
                    'Du hast Änderungen, die noch nicht gespeichert wurden. Möchtest du wirklich abbrechen?',
                    [
                        { text: 'Weiter bearbeiten', style: 'cancel' },
                        { text: 'Verwerfen', style: 'destructive', onPress: onCancel },
                    ]
                );
            }
        } else {
            onCancel();
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FAF9F6' }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 32, paddingBottom: 80, maxWidth: 896, width: '100%', marginHorizontal: 'auto' }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Title,                {/* Title */}
                <View style={{ backgroundColor: '#fff', borderRadius: 36, borderWidth: 1, borderColor: '#E8E6E1', padding: 36, marginBottom: 36, shadowColor: '#243842', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.05, shadowRadius: 40, elevation: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7C85', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>Übungs-Titel</Text>
                    <TextInput
                        value={title} onChangeText={setTitle}
                        placeholder="z.B. Gedankenprotokoll Woche 1..."
                        placeholderTextColor="#A0AAB2"
                        style={{ fontSize: 28, fontWeight: '900', color: '#243842', letterSpacing: -0.5, backgroundColor: '#F9F8F6', padding: 20, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8E6E1' }}
                    />

                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7C85', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 24, marginBottom: 12 }}>Titelbild (Optional)</Text>
                    {coverImage ? (
                        <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
                            <Image source={{ uri: coverImage }} style={{ width: '100%', height: 160 }} contentFit="cover" />
                            <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity onPress={pickCoverImage} style={{ backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>Ändern</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setCoverImage(undefined)} style={{ backgroundColor: 'rgba(239,68,68,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>Löschen</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={pickCoverImage} style={{ backgroundColor: '#F9F8F6', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#E8E6E1', borderRadius: 16, padding: 20, alignItems: 'center' }}>
                            <Text style={{ fontSize: 28, marginBottom: 8 }}>🖼️</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#6B7C85' }}>Bild auswählen</Text>
                        </TouchableOpacity>
                    )}

                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7C85', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 24, marginBottom: 12 }}>Design-Farbe</Text>
                    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                        {THEME_COLORS.map(color => (
                            <TouchableOpacity
                                key={color}
                                onPress={() => setThemeColor(color)}
                                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color, borderWidth: 3, borderColor: themeColor === color ? '#243842' : 'transparent', shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                            />
                        ))}
                    </View>
                </View>

                {/* Flow Timeline — horizontal journey view */}
                <ExerciseFlowTimeline blocks={blocks} />

                {/* Gauge + Composition side by side for compact analytics */}
                {blocks.length > 0 && (
                    <ExerciseDifficultyGauge blocks={blocks} />
                )}

                {/* Block Count divider */}
                {blocks.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#E8E6E1' }} />
                        <Text style={{ fontSize: 11, color: '#8F9CA3', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>{blocks.length} {blocks.length === 1 ? 'Block' : 'Blöcke'}</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#E8E6E1' }} />
                    </View>
                )}

                {/* Blocks — 3D entrances + tilt interactions */}
                {blocks.map((block, index) => (
                    <Block3DEntrance key={block.id} index={index}>
                        <Block3DTiltWrapper>
                            <BlockForm
                                block={block}
                                onUpdateBlock={updateBlock}
                                onRemoveBlock={removeBlock}
                                onMoveBlock={moveBlock}
                                onDuplicateBlock={duplicateBlock}
                                isFirst={index === 0} isLast={index === blocks.length - 1}
                            />
                        </Block3DTiltWrapper>
                    </Block3DEntrance>
                ))}

                {/* Add Block / Picker */}
                {!showPicker ? (
                    <TouchableOpacity onPress={() => setShowPicker(true)}
                        style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: '#D7D3CC', borderRadius: 32, paddingVertical: 32, alignItems: 'center', marginBottom: 16, backgroundColor: '#FAF9F6' }}>
                        <Text style={{ color: '#8F9CA3', fontWeight: '800', fontSize: 18 }}>＋ Neuen Block hinzufügen</Text>
                    </TouchableOpacity>
                ) : (
                    <BlockPicker onAdd={addBlock} onClose={() => setShowPicker(false)} />
                )}
            </ScrollView>

            {/* Save / Cancel Footer */}
            <View style={{ padding: 24, paddingBottom: Platform.OS === 'ios' ? 48 : 32, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E8E6E1', shadowColor: '#243842', shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.06, shadowRadius: 32, elevation: 20 }}>
                <View style={{ flexDirection: 'row', gap: 16, maxWidth: 896, width: '100%', marginHorizontal: 'auto' }}>
                    <TouchableOpacity onPress={handleCancel}
                        style={{ paddingVertical: 18, paddingHorizontal: 32, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E8E6E1', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 }}>
                        <Text style={{ fontWeight: '800', color: '#6B7C85', fontSize: 16 }}>Abbrechen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave}
                        style={{ flex: 1, paddingVertical: 18, borderRadius: 20, backgroundColor: '#137386', alignItems: 'center', shadowColor: '#137386', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 }}>
                        <Text style={{ fontWeight: '900', color: '#fff', fontSize: 16, letterSpacing: 0.5 }}>
                            💾 Speichern · {blocks.length} {blocks.length === 1 ? 'Block' : 'Blöcke'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

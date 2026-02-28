import React, { useState, useCallback, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Edit3, CheckCircle2, ListChecks, Heart, BookOpen, Clock, Wind, Image as ImageIcon, CircleDot, Activity } from 'lucide-react-native';
import ExerciseFlowTimeline from './ExerciseFlowTimeline';
import ExerciseDifficultyGauge from './ExerciseDifficultyGauge';
import Block3DTiltWrapper from './Block3DTiltWrapper';
import Block3DEntrance from './Block3DEntrance';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExerciseBlockType =
    | 'reflection' | 'scale' | 'choice'
    | 'checklist' | 'homework' | 'gratitude'
    | 'info' | 'timer' | 'breathing' | 'media';

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
    initialBlocks?: ExerciseBlock[];
    onSave: (title: string, blocks: ExerciseBlock[]) => void;
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
    ];

function getCat(type: ExerciseBlockType) {
    return CATALOGUE.find(c => c.type === type) ?? CATALOGUE[0];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).substring(2, 9); }

function defaultBlock(type: ExerciseBlockType): ExerciseBlock {
    const block: any = { id: uid(), type, content: '' };
    if (type === 'timer' || type === 'breathing') block.duration = 120;
    if (type === 'choice' || type === 'checklist') block.options = ['', ''];
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

const StyledInput = memo(function StyledInput({ value, onChangeText, placeholder, multiline }: {
    value: string; onChangeText: (t: string) => void; placeholder: string; multiline?: boolean;
}) {
    return (
        <TextInput
            value={value} onChangeText={onChangeText} placeholder={placeholder}
            placeholderTextColor="#9CA3AF" multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            style={{
                backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#E2E8F0',
                borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
                fontSize: 14, color: '#0F172A', minHeight: multiline ? 100 : undefined,
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1
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
        <View style={{ marginBottom: 16, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
            {/* Context Handler / Drag Indication */}
            <View style={{ alignItems: 'center', backgroundColor: cat.bg, paddingTop: 6, paddingBottom: 2 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.1)' }} />
            </View>

            {/* Card Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, backgroundColor: cat.bg, borderBottomWidth: 1, borderBottomColor: cat.border }}>
                {/* Type Badge */}
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: cat.accent, alignItems: 'center', justifyContent: 'center', shadowColor: cat.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 }}>
                        <cat.icon size={20} color="#fff" />
                    </View>
                    <View>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: cat.text }}>{cat.label}</Text>
                        <Text style={{ fontSize: 11, color: cat.text, opacity: 0.7, fontWeight: '500' }}>{cat.desc}</Text>
                    </View>
                </View>
                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[
                        { icon: '↑', onPress: () => onMove('up'), disabled: isFirst },
                        { icon: '↓', onPress: () => onMove('down'), disabled: isLast },
                        { icon: '⧉', onPress: onDuplicate, disabled: false },
                        { icon: '✕', onPress: onRemove, disabled: false, danger: true },
                    ].map((btn, i) => (
                        <TouchableOpacity key={i} onPress={btn.onPress} disabled={btn.disabled}
                            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: btn.danger ? '#FEF2F2' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', opacity: btn.disabled ? 0.3 : 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: btn.danger ? '#EF4444' : '#4B5563' }}>{btn.icon}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Card Body */}
            <View style={{ padding: 18 }}>

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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 2 }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <View key={n} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: cat.bg, borderWidth: 1, borderColor: cat.border, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: cat.text }}>{n}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={{ textAlign: 'center', fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Vorschau – Klient wählt einen Wert</Text>
                    </>
                )}

                {/* CHOICE */}
                {block.type === 'choice' && (
                    <>
                        <SectionLabel text="Frage" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })} placeholder="z.B. Wie war deine Stimmung heute?" />
                        <View style={{ marginTop: 12 }}>
                            <SectionLabel text="Antwortmöglichkeiten (Einzelauswahl)" />
                            {(block.options ?? []).map((opt, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: cat.accent }} />
                                    <View style={{ flex: 1 }}>
                                        <StyledInput value={opt} onChangeText={t => updateOption(i, t)} placeholder={`Option ${i + 1}...`} />
                                    </View>
                                    {(block.options?.length ?? 0) > 2 && (
                                        <TouchableOpacity onPress={() => removeOption(i)}>
                                            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 18 }}>×</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            <TouchableOpacity onPress={addOption}
                                style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: cat.border, borderRadius: 10, paddingVertical: 8, alignItems: 'center', marginTop: 2 }}>
                                <Text style={{ color: cat.accent, fontWeight: '600', fontSize: 13 }}>+ Option hinzufügen</Text>
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
                            {(block.options ?? []).map((opt, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: cat.accent }} />
                                    <View style={{ flex: 1 }}>
                                        <StyledInput value={opt} onChangeText={t => updateOption(i, t)} placeholder={`Element ${i + 1}...`} />
                                    </View>
                                    {(block.options?.length ?? 0) > 2 && (
                                        <TouchableOpacity onPress={() => removeOption(i)}>
                                            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 18 }}>×</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            <TouchableOpacity onPress={addOption}
                                style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: cat.border, borderRadius: 10, paddingVertical: 8, alignItems: 'center', marginTop: 2 }}>
                                <Text style={{ color: cat.accent, fontWeight: '600', fontSize: 13 }}>+ Element hinzufügen</Text>
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
                        <View style={{ marginTop: 12, backgroundColor: cat.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: cat.border }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: cat.text, marginBottom: 8 }}>📝 ABC-Protokoll Vorlage</Text>
                            {[
                                { label: 'A – Auslöser', hint: 'Was ist passiert? (Situation, Ort, Zeit)' },
                                { label: 'B – Bewertung', hint: 'Was habe ich gedacht / bewertet?' },
                                { label: 'C – Consequence', hint: 'Was habe ich gefühlt / getan? (0–10)' },
                            ].map(row => (
                                <View key={row.label} style={{ flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start', gap: 6 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cat.accent, marginTop: 5 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: cat.text }}>{row.label}</Text>
                                        <Text style={{ fontSize: 11, color: cat.text, opacity: 0.65 }}>{row.hint}</Text>
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
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                            {['1.', '2.', '3.'].map(n => (
                                <View key={n} style={{ flex: 1, backgroundColor: cat.bg, borderRadius: 14, borderWidth: 1, borderColor: cat.border, paddingVertical: 16, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 20 }}>🙏</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: cat.text, marginTop: 4 }}>{n}</Text>
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
                                <View style={{ marginTop: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', position: 'relative' }}>
                                    {block.mediaType === 'video' ? (
                                        <View style={{ height: 200, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D1D5DB' }}>
                                            <Text style={{ fontSize: 32 }}>🎥</Text>
                                            <Text style={{ marginTop: 8, fontWeight: '600', color: '#4B5563' }}>Video ausgewählt</Text>
                                        </View>
                                    ) : (
                                        <Image source={{ uri: block.mediaUri }} style={{ width: '100%', height: 200 }} contentFit="cover" />
                                    )}
                                    <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity onPress={pickMedia} style={{ backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151' }}>Ändern</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => onChange({ mediaUri: undefined, mediaType: undefined })} style={{ backgroundColor: 'rgba(239,68,68,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Löschen</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Size Selector */}
                                    <View style={{ padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#4B5563', marginBottom: 8 }}>Anzeigegröße in der App:</Text>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {(['small', 'medium', 'large'] as const).map(size => {
                                                const isActive = block.mediaSize === size || (!block.mediaSize && size === 'medium');
                                                const labels = { small: 'Klein', medium: 'Mittel', large: 'Vollbild' };
                                                return (
                                                    <TouchableOpacity
                                                        key={size}
                                                        onPress={() => onChange({ mediaSize: size })}
                                                        style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: isActive ? cat.accent : '#E5E7EB', backgroundColor: isActive ? cat.bg : '#fff' }}
                                                    >
                                                        <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? cat.accent : '#6B7280' }}>
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
                                    style={{ marginTop: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D1D5DB', borderRadius: 16, paddingVertical: 32, alignItems: 'center', backgroundColor: '#F9FAFB' }}>
                                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                        <Text style={{ fontSize: 24, color: '#3B82F6' }}>📸</Text>
                                    </View>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 }}>Medium auswählen</Text>
                                    <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>Unterstützt Fotos und Videos aus der Galerie</Text>
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
                        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 }}>
                            <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>Dauer</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
                                {[30, 60, 120, 300].map(sec => {
                                    const isActive = block.duration === sec;
                                    return (
                                        <TouchableOpacity key={sec} onPress={() => onChange({ duration: sec })}
                                            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginLeft: 4, backgroundColor: isActive ? cat.accent : '#E5E7EB' }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#fff' : '#6B7280' }}>
                                                {sec < 60 ? `${sec}s` : `${sec / 60}min`}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                        {block.type === 'breathing' && (
                            <View style={{ marginTop: 10, backgroundColor: cat.bg, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: cat.border, flexDirection: 'row', justifyContent: 'space-around' }}>
                                {['4s Einatmen', '4s Halten', '4s Ausatmen'].map(phase => (
                                    <View key={phase} style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 18 }}>🌬️</Text>
                                        <Text style={{ fontSize: 10, color: cat.text, fontWeight: '600', marginTop: 2 }}>{phase}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </View>
        </View>
    );
});

// ─── Block Picker ─────────────────────────────────────────────────────────────

const BlockPicker = memo(function BlockPicker({ onAdd, onClose }: { onAdd: (t: ExerciseBlockType) => void; onClose: () => void }) {
    return (
        <View style={{ marginVertical: 16, backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: '#243842', fontSize: 18, fontWeight: '800' }}>Neuen Block hinzufügen</Text>
                <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#6B7280', fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {CATALOGUE.map(cat => (
                    <TouchableOpacity key={cat.type} onPress={() => onAdd(cat.type)}
                        style={{ flexBasis: '48%', flexGrow: 1, backgroundColor: '#F9F8F6', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: cat.bg, borderWidth: 1, borderColor: cat.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <cat.icon size={22} color={cat.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#243842' }}>{cat.label}</Text>
                            <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500' }}>{cat.desc}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExerciseBuilder({ initialTitle = '', initialBlocks = [], onSave, onCancel }: ExerciseBuilderProps) {
    const [title, setTitle] = useState(initialTitle);
    const [blocks, setBlocks] = useState<ExerciseBlock[]>(initialBlocks);
    const [showPicker, setShowPicker] = useState(false);

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
        if (!title.trim()) { Alert.alert('Fehler', 'Bitte gib der Übung einen Titel.'); return; }
        if (blocks.length === 0) { Alert.alert('Fehler', 'Füge mindestens einen Block hinzu.'); return; }

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

        onSave(title.trim(), sanitizedBlocks as ExerciseBlock[]);
    };

    const handleCancel = () => {
        // Fix #16: Guard against accidental cancellation with data loss
        if (blocks.length > 0 || title.trim()) {
            Alert.alert(
                'Änderungen verwerfen?',
                'Du hast Änderungen, die noch nicht gespeichert wurden. Möchtest du wirklich abbrechen?',
                [
                    { text: 'Weiter bearbeiten', style: 'cancel' },
                    { text: 'Verwerfen', style: 'destructive', onPress: onCancel },
                ]
            );
        } else {
            onCancel();
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 24, paddingBottom: 64, maxWidth: 896, width: '100%', marginHorizontal: 'auto' }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Title */}
                <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Übungs-Titel</Text>
                    <TextInput
                        value={title} onChangeText={setTitle}
                        placeholder="z.B. Gedankenprotokoll Woche 1..."
                        placeholderTextColor="#D1D5DB"
                        style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}
                    />
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
                        <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                        <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>{blocks.length} {blocks.length === 1 ? 'Block' : 'Blöcke'}</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
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
                        style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: '#D1D5DB', borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ color: '#6B7280', fontWeight: '700', fontSize: 15 }}>＋ Block hinzufügen</Text>
                    </TouchableOpacity>
                ) : (
                    <BlockPicker onAdd={addBlock} onClose={() => setShowPicker(false)} />
                )}
            </ScrollView>

            {/* Save / Cancel Footer */}
            <View style={{ padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 15 }}>
                <View style={{ flexDirection: 'row', gap: 12, maxWidth: 896, width: '100%', marginHorizontal: 'auto' }}>
                    <TouchableOpacity onPress={handleCancel}
                        style={{ paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' }}>
                        <Text style={{ fontWeight: '700', color: '#4B5563', fontSize: 15 }}>Abbrechen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave}
                        style={{ flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#137386', alignItems: 'center', shadowColor: '#137386', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 }}>
                        <Text style={{ fontWeight: '800', color: '#fff', fontSize: 15 }}>
                            💾 Speichern · {blocks.length} {blocks.length === 1 ? 'Block' : 'Blöcke'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

import React, { useState, useCallback, memo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform, KeyboardTypeOptions, ActivityIndicator, Animated, StyleSheet, Modal } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Save, Edit3, CheckCircle2, ListChecks, Heart, BookOpen, Clock, Wind, Image as ImageIcon, CircleDot, Activity, Radar, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon, Link as LinkIcon, Film } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { ProgressChart, BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import ExerciseFlowTimeline from './ExerciseFlowTimeline';
import ExerciseDifficultyGauge from './ExerciseDifficultyGauge';
import Block3DTiltWrapper from './Block3DTiltWrapper';
import Block3DEntrance from './Block3DEntrance';
import { BlockConditionEditor } from './BlockConditionEditor';
import { uploadFile, generateStoragePath, getExtension } from '../../utils/uploadFile';
import { useTheme } from '../../contexts/ThemeContext';

import {
    ExerciseBlockType,
    ExerciseBlock,
    CATALOGUE,
    getCat,
    CHART_PALETTE
} from './blocks/exerciseRegistry';

export type { ExerciseBlockType, ExerciseBlock };

interface ExerciseBuilderProps {
    initialTitle?: string;
    initialCoverImage?: string;
    initialThemeColor?: string;
    initialBlocks?: ExerciseBlock[];
    onSave: (title: string, blocks: ExerciseBlock[], coverImage?: string, themeColor?: string) => void;
    onCancel: () => void;
}

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

const BlockForm = memo(function BlockForm({ block, onUpdateBlock, onRemoveBlock, onMoveBlock, isFirst, isLast, onDuplicateBlock, allBlocks }: {
    block: ExerciseBlock;
    onUpdateBlock: (id: string, updates: Partial<ExerciseBlock>) => void;
    onRemoveBlock: (id: string) => void;
    onMoveBlock: (id: string, dir: 'up' | 'down') => void;
    isFirst: boolean; isLast: boolean;
    onDuplicateBlock: (id: string) => void;
    allBlocks: ExerciseBlock[];
}) {
    const cat = getCat(block.type);
    const id = block.id;
    const [mediaUploading, setMediaUploading] = useState(false);

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
            mediaTypes: ['images', 'videos'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            const isVideo = asset.type === 'video';
            setMediaUploading(true);
            try {
                const ext = asset.fileName?.split('.').pop() || getExtension(asset.uri) || (isVideo ? 'mp4' : 'jpg');
                const mimeType = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
                const path = generateStoragePath('exercises/media', ext);
                const downloadUrl = await uploadFile(
                    asset.uri,
                    path,
                    mimeType
                );
                onChange({
                    mediaUri: downloadUrl,
                    mediaType: isVideo ? 'video' : 'image'
                });
            } catch (err) {
                console.error('Media upload failed:', err);
                Alert.alert('Upload fehlgeschlagen', 'Die Datei konnte nicht hochgeladen werden. Bitte versuche es erneut.');
            } finally {
                setMediaUploading(false);
            }
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
                                <TouchableOpacity onPress={pickMedia} disabled={mediaUploading}
                                    style={{ marginTop: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: 20, paddingVertical: 40, alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                                    {mediaUploading ? (
                                        <>
                                            <ActivityIndicator size="large" color="#3B82F6" style={{ marginBottom: 12 }} />
                                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#3B82F6' }}>Datei wird hochgeladen…</Text>
                                            <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Bitte warten</Text>
                                        </>
                                    ) : (
                                        <>
                                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                                <Text style={{ fontSize: 32, color: '#3B82F6' }}>📸</Text>
                                            </View>
                                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 6 }}>Medium auswählen</Text>
                                            <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', fontWeight: '500' }}>Unterstützt Fotos und Videos aus der Galerie</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}

                {/* VIDEO (Web) */}
                {block.type === 'video' && (
                    <>
                        <SectionLabel text="Titel / Beschreibung für das Video" />
                        <StyledInput value={block.content} onChangeText={t => onChange({ content: t })}
                            placeholder="z.B. Schau dir dieses Video zur Achtsamkeit an..." multiline />

                        <View style={{ marginTop: 16 }}>
                            <SectionLabel text="YouTube / Vimeo URL" />
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F8F6', borderWidth: 1.5, borderColor: '#E8E6E1', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 }}>
                                <LinkIcon size={20} color="#94A3B8" />
                                <TextInput
                                    style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#243842' }}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    placeholderTextColor="#94A3B8"
                                    value={block.videoUrl || ''}
                                    onChangeText={t => onChange({ videoUrl: t })}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="url"
                                />
                            </View>
                            {block.videoUrl ? (
                                <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: '#F1F5F9', padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                                    <Film size={32} color="#64748B" />
                                    <Text style={{ marginTop: 8, fontSize: 13, color: '#475569', fontWeight: '600' }}>Video-Link wird in der App als Player eingebunden</Text>
                                </View>
                            ) : null}
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
                                                style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, borderWidth: 2, borderColor: '#E8E6E1', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
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
                        <MotiView
                            from={{ opacity: 0, scale: 0.95, translateY: 20 }}
                            animate={{ opacity: 1, scale: 1, translateY: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 90, delay: 150 }}
                            style={{ marginTop: 24, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E6E1', alignItems: 'center' }}
                        >
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
                                    backgroundColor: 'transparent',
                                    backgroundGradientFrom: '#F8FAFC',
                                    backgroundGradientTo: '#F1F5F9',
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                                    style: { borderRadius: 16 },
                                    propsForLabels: { fontSize: 10, fontWeight: 'bold' }
                                }}
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                        </MotiView>
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
                                                style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: color, borderWidth: 2, borderColor: '#E8E6E1', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
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
                        <MotiView
                            from={{ opacity: 0, scale: 0.95, translateY: 20 }}
                            animate={{ opacity: 1, scale: 1, translateY: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 90, delay: 150 }}
                            style={{ marginTop: 24, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E6E1', alignItems: 'center' }}
                        >
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
                                    backgroundColor: 'transparent',
                                    backgroundGradientFrom: '#F8FAFC',
                                    backgroundGradientTo: '#F1F5F9',
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                                    barPercentage: 0.6,
                                    propsForLabels: { fontSize: 10, fontWeight: 'bold' }
                                }}
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                        </MotiView>
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
                                                style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, borderWidth: 2, borderColor: '#E8E6E1', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
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
                        <MotiView
                            from={{ opacity: 0, scale: 0.95, translateY: 20 }}
                            animate={{ opacity: 1, scale: 1, translateY: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 90, delay: 150 }}
                            style={{ marginTop: 24, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E6E1', alignItems: 'center' }}
                        >
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
                                    backgroundColor: 'transparent',
                                    backgroundGradientFrom: '#F8FAFC',
                                    backgroundGradientTo: '#F1F5F9',
                                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                }}
                                accessor="population"
                                backgroundColor="transparent"
                                paddingLeft="15"
                                absolute
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                        </MotiView>
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
                        <MotiView
                            from={{ opacity: 0, scale: 0.95, translateY: 20 }}
                            animate={{ opacity: 1, scale: 1, translateY: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 90, delay: 150 }}
                            style={{ marginTop: 24, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E6E1', alignItems: 'center' }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7C85', marginBottom: 12 }}>VORSCHAU</Text>
                            <LineChart
                                data={{
                                    labels: (block.options ?? []).map(o => o.split(':')[0] || '?'),
                                    datasets: [{ data: (block.options ?? []).map(o => parseFloat(o.split(':')[1] || '0') || 0) }]
                                }}
                                width={Dimensions.get('window').width > 800 ? 400 : Dimensions.get('window').width - 120}
                                height={220}
                                chartConfig={{
                                    backgroundColor: 'transparent',
                                    backgroundGradientFrom: '#F8FAFC',
                                    backgroundGradientTo: '#F1F5F9',
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
                        </MotiView>
                    </>
                )}

            </View>
        </View>
    );
});

// ─── Block Picker ─────────────────────────────────────────────────────────────

const BLOCK_CATEGORIES: { label: string; types: ExerciseBlockType[] }[] = [
    { label: 'Schnellzugriff', types: ['reflection', 'checklist', 'scale', 'info'] },
    { label: '📝 Interaktion', types: ['reflection', 'scale', 'choice', 'checklist', 'homework', 'gratitude'] },
    { label: '📖 Inhalt', types: ['info', 'media', 'video'] },
    { label: '⏱ Zeit & Achtsamkeit', types: ['timer', 'breathing'] },
    { label: '📊 Visualisierung', types: ['spider_chart', 'bar_chart', 'pie_chart', 'line_chart'] },
];

const BlockPicker = memo(function BlockPicker({ onAdd, onClose }: { onAdd: (t: ExerciseBlockType) => void; onClose: () => void }) {
    const [search, setSearch] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState<string>('Schnellzugriff');

    const filteredCatalogue = React.useMemo(() => {
        if (search.trim()) {
            const q = search.toLowerCase();
            return CATALOGUE.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
        }
        const cat = BLOCK_CATEGORIES.find(c => c.label === activeCategory);
        if (!cat) return CATALOGUE;
        return CATALOGUE.filter(c => cat.types.includes(c.type));
    }, [search, activeCategory]);

    const quickTypes: ExerciseBlockType[] = ['reflection', 'checklist', 'scale', 'info'];

    return (
        <View style={{ marginVertical: 24, backgroundColor: '#FFFFFF', borderRadius: 32, padding: 32, borderWidth: 1, borderColor: '#E8E6E1', shadowColor: '#243842', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.1, shadowRadius: 32, elevation: 12 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View>
                    <Text style={{ color: '#243842', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>Block hinzufügen</Text>
                    <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600', marginTop: 2 }}>{CATALOGUE.length} Blocktypen verfügbar</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F9F8F6', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#6B7C85', fontWeight: '800', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Quick-add Pills */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Häufig verwendet</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {quickTypes.map(type => {
                        const cat = getCat(type);
                        return (
                            <TouchableOpacity
                                key={type}
                                onPress={() => onAdd(type)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: cat.bg, borderWidth: 1, borderColor: cat.border, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 }}
                            >
                                <cat.icon size={16} color={cat.accent} />
                                <Text style={{ fontSize: 14, fontWeight: '800', color: cat.text }}>{cat.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Search Bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F8F6', borderWidth: 1.5, borderColor: '#E8E6E1', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 }}>
                <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Block suchen..."
                    placeholderTextColor="#94A3B8"
                    style={{ flex: 1, fontSize: 15, color: '#243842', fontWeight: '600' }}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')} style={{ paddingLeft: 8 }}>
                        <Text style={{ color: '#94A3B8', fontWeight: '700', fontSize: 18 }}>×</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Category Tabs */}
            {!search.trim() && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {BLOCK_CATEGORIES.filter(c => c.label !== 'Schnellzugriff').map(cat => {
                        const isActive = activeCategory === cat.label;
                        return (
                            <TouchableOpacity
                                key={cat.label}
                                onPress={() => setActiveCategory(cat.label)}
                                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: isActive ? '#137386' : '#F9F8F6', borderWidth: 1, borderColor: isActive ? '#137386' : '#E8E6E1' }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? 'white' : '#6B7C85' }}>{cat.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Block Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {filteredCatalogue.map(cat => (
                    <TouchableOpacity key={cat.type} onPress={() => onAdd(cat.type)}
                        style={{ flexBasis: '46%', flexGrow: 1, backgroundColor: cat.bg, borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: cat.border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: cat.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: cat.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 }}>
                            <cat.icon size={24} color={cat.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: cat.text, marginBottom: 1 }}>{cat.label}</Text>
                            <Text style={{ fontSize: 12, color: cat.text, opacity: 0.7, fontWeight: '600' }}>{cat.desc}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
                {filteredCatalogue.length === 0 && (
                    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 32 }}>
                        <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#94A3B8' }}>Kein Block gefunden</Text>
                    </View>
                )}
            </View>
        </View>
    );
});

// ─── Main Component ───────────────────────────────────────────────────────────

const THEME_COLORS = ['#137386', '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#10B981', '#64748B'];

import { SuccessAnimation } from '../ui/SuccessAnimation';

export default function ExerciseBuilder({ initialTitle = '', initialCoverImage, initialThemeColor, initialBlocks = [], onSave, onCancel }: ExerciseBuilderProps) {
    const [title, setTitle] = useState(initialTitle);
    const [coverImage, setCoverImage] = useState<string | undefined>(initialCoverImage);
    const [coverImageUploading, setCoverImageUploading] = useState(false);
    const [themeColor, setThemeColor] = useState<string>(initialThemeColor || THEME_COLORS[0]);
    const [blocks, setBlocks] = useState<ExerciseBlock[]>(initialBlocks);
    const [showPicker, setShowPicker] = useState(false);
    const [toast, setToast] = useState<{ visible: boolean, message: string, type: 'error' | 'success' | 'warning' }>({ visible: false, message: '', type: 'error' });
    const [showDiscardBanner, setShowDiscardBanner] = useState(false);
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const HEADER_HEIGHT = insets.top + 64;

    // ── Scroll-hide animation ──────────────────────────────────────────────────
    const scrollY = useRef(new Animated.Value(0)).current;
    const lastScrollY = useRef(0);
    const headerVisible = useRef(new Animated.Value(0)).current; // 0 = visible, 1 = hidden

    const headerTranslateY = headerVisible.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -HEADER_HEIGHT],
    });

    const headerOpacity = headerVisible.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
            useNativeDriver: false,
            listener: (event: any) => {
                const currentY = event.nativeEvent.contentOffset.y;
                const diff = currentY - lastScrollY.current;
                lastScrollY.current = currentY;

                if (currentY < 10) {
                    // Near the top — always show
                    Animated.spring(headerVisible, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
                } else if (diff > 4) {
                    // Scrolling down — hide header
                    Animated.spring(headerVisible, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }).start();
                } else if (diff < -4) {
                    // Scrolling up — show header
                    Animated.spring(headerVisible, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
                }
            },
        }
    );

    const pickCoverImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            setToast({ visible: true, message: 'Zugriff auf die Galerie wird benötigt.', type: 'error' });
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setCoverImageUploading(true);
            try {
                const ext = getExtension(asset.uri) || 'jpg';
                const path = generateStoragePath('exercises/covers', ext);
                const downloadUrl = await uploadFile(
                    asset.uri,
                    path,
                    'image/jpeg'
                );
                setCoverImage(downloadUrl);
            } catch (err) {
                console.error('Cover image upload failed:', err);
                setToast({ visible: true, message: 'Titelbild konnte nicht hochgeladen werden.', type: 'error' });
            } finally {
                setCoverImageUploading(false);
            }
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
            setToast({ visible: true, message: 'Bitte gib der Übung einen Titel.', type: 'warning' });
            return;
        }
        if (blocks.length === 0) {
            setToast({ visible: true, message: 'Füge mindestens einen Block hinzu.', type: 'warning' });
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
        if (blocks.length > 0 || title.trim()) {
            // Show an inline confirmation banner instead of a dialog
            setShowDiscardBanner(true);
        } else {
            onCancel();
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>

            {/* ── Premium Header ──────────────────────────────────────── */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        // Increased height for the new design
                        height: HEADER_HEIGHT + 20,
                        overflow: 'hidden',
                        borderBottomLeftRadius: 32,
                        borderBottomRightRadius: 32,
                        shadowColor: '#137386',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.25,
                        shadowRadius: 24,
                        elevation: 12,
                    },
                    {
                        transform: [{ translateY: headerTranslateY }],
                        opacity: headerOpacity,
                    },
                ]}
            >
                {/* Background: BlurView on iOS, solid Deep Slate on Android */}
                {Platform.OS === 'ios' ? (
                    <BlurView
                        intensity={88}
                        tint="dark"
                        style={[
                            StyleSheet.absoluteFillObject,
                            { backgroundColor: 'rgba(19, 115, 134, 0.85)' }
                        ]}
                    />
                ) : (
                    <View
                        style={[StyleSheet.absoluteFillObject, { backgroundColor: '#137386' }]}
                    />
                )}

                {/* Subtle gold accent line at the very bottom */}
                <View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 1.5,
                        backgroundColor: 'rgba(192, 157, 89, 0.45)',
                    }}
                />

                {/* Content row */}
                <View
                    style={{
                        paddingTop: insets.top + 10,
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 24,
                    }}
                >
                    {/* ← Back button */}
                    <TouchableOpacity
                        onPress={handleCancel}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderRadius: 16,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                        }}
                    >
                        <ChevronLeft size={20} color="white" />
                        <Text style={{
                            color: 'white',
                            fontWeight: '700',
                            fontSize: 16,
                            marginLeft: 4,
                        }}>Zurück</Text>
                    </TouchableOpacity>

                    {/* Title */}
                    <Text
                        numberOfLines={1}
                        style={{
                            flex: 1,
                            fontSize: 22,
                            fontWeight: '900',
                            color: '#FFFFFF',
                            textAlign: 'center',
                            marginHorizontal: 16,
                        }}
                    >
                        {title.trim() || 'Neue Übung'}
                    </Text>

                    {/* Speichern – Gold CTA */}
                    <TouchableOpacity
                        onPress={handleSave}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderRadius: 16,
                            backgroundColor: '#C09D59',
                            shadowColor: '#C09D59',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.4,
                            shadowRadius: 12,
                            elevation: 6,
                        }}
                    >
                        <Save size={18} color="#fff" strokeWidth={2.5} />
                        <Text style={{
                            color: '#fff',
                            fontWeight: '800',
                            fontSize: 16,
                        }}>Speichern</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* ── Scrollable Content ──────────────────────────────────────────── */}
            <Animated.ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingTop: HEADER_HEIGHT + 36,
                    paddingBottom: 80,
                    maxWidth: 896,
                    width: '100%',
                    marginHorizontal: 'auto',
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >


                <View style={{
                    backgroundColor: colors.surface, borderRadius: 36, borderWidth: 1, borderColor: colors.border, padding: 36, marginBottom: 36, shadowColor: isDark ? '#000' : '#243842', shadowOffset: { width: 0, height: 16 }, shadowOpacity: isDark ? 0.3 : 0.05, shadowRadius: 40, elevation: 6
                }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSubtle, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>Übungs-Titel</Text>
                    <TextInput
                        value={title} onChangeText={setTitle}
                        placeholder="z.B. Gedankenprotokoll Woche 1..."
                        placeholderTextColor={colors.textSubtle}
                        style={{ fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.5, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9F8F6', padding: 20, borderRadius: 20, borderWidth: 1.5, borderColor: isDark ? 'transparent' : '#E8E6E1' }}
                    />

                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSubtle, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 24, marginBottom: 12 }}>Titelbild (Optional)</Text>
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
                        <TouchableOpacity onPress={pickCoverImage} disabled={coverImageUploading} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F8F6', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 16, padding: 20, alignItems: 'center' }}>
                            {coverImageUploading ? (
                                <>
                                    <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 8 }} />
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>Bild wird hochgeladen…</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={{ fontSize: 28, marginBottom: 8 }}>🖼️</Text>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSubtle }}>Bild auswählen</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSubtle, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 24, marginBottom: 12 }}>Design-Farbe</Text>
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
                                allBlocks={blocks}
                            />
                        </Block3DTiltWrapper>
                    </Block3DEntrance>
                ))}

                {/* Add Block / Picker */}
                {!showPicker ? (
                    <TouchableOpacity onPress={() => setShowPicker(true)}
                        style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(19, 115, 134, 0.3)', borderRadius: 32, paddingVertical: 32, alignItems: 'center', marginBottom: 16, backgroundColor: 'rgba(19, 115, 134, 0.05)' }}>
                        <Text style={{ color: '#137386', fontWeight: '800', fontSize: 18 }}>＋ Neuen Block hinzufügen</Text>
                    </TouchableOpacity>
                ) : (
                    <BlockPicker onAdd={addBlock} onClose={() => setShowPicker(false)} />
                )}

                {/* Save / Cancel — only visible at the very end of the scroll */}

                <View style={{ marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E8E6E1', gap: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' }}>
                        Fertig? Übung jetzt speichern
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <TouchableOpacity onPress={handleCancel}
                            style={{ paddingVertical: 18, paddingHorizontal: 32, borderRadius: 24, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderWidth: 1.5, borderColor: isDark ? 'transparent' : colors.border }}>
                            <Text style={{ fontWeight: '800', color: isDark ? colors.text : colors.textSubtle, fontSize: 16 }}>Abbrechen</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave}
                            style={{ flex: 1, paddingVertical: 18, borderRadius: 24, backgroundColor: '#C09D59', alignItems: 'center', shadowColor: '#C09D59', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 }}>
                            <Text style={{ fontWeight: '900', color: '#fff', fontSize: 16, letterSpacing: 0.5 }}>
                                💾 Speichern · {blocks.length} {blocks.length === 1 ? 'Block' : 'Blöcke'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.ScrollView>

            <SuccessAnimation
                visible={toast.visible}
                type={toast.type}
                message={toast.message}
                subMessage={toast.type === 'error' ? 'Bitte versuche es erneut.' : ''}
                onAnimationDone={() => setToast(prev => ({ ...prev, visible: false }))}
            />

            {/* Discard Confirmation Modal */}
            <Modal visible={showDiscardBanner} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 }}>
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ width: '100%', maxWidth: 400, backgroundColor: '#FEF3C7', borderRadius: 32, padding: 32, borderWidth: 1.5, borderColor: '#F59E0B', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 10 }}
                    >
                        <Text style={{ fontSize: 20, fontWeight: '900', color: '#92400E', marginBottom: 12, textAlign: 'center' }}>⚠️ Nicht gespeichert</Text>
                        <Text style={{ fontSize: 15, color: '#78350F', fontWeight: '500', lineHeight: 22, marginBottom: 24, textAlign: 'center' }}>
                            Du hast Änderungen, die noch nicht gespeichert wurden. Wenn du jetzt zurückgehst, gehen sie verloren.
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setShowDiscardBanner(false)}
                                style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#F59E0B', alignItems: 'center' }}
                            >
                                <Text style={{ fontWeight: '900', color: '#92400E', fontSize: 15 }}>Weiter bearbeiten</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onCancel}
                                style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: '#EF4444', alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}
                            >
                                <Text style={{ fontWeight: '900', color: '#fff', fontSize: 15 }}>Verwerfen</Text>
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                </View>
            </Modal>
        </View>
    );
}

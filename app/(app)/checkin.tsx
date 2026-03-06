import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { useNetwork } from '../../contexts/NetworkContext';
import { submitCheckin } from '../../services/checkinService';
import { EMOTION_PRESETS, getEmotionLabel } from '../../constants/emotions';
import { useCheckin } from '../../hooks/firebase/useCheckin';
import { useTheme } from '../../contexts/ThemeContext';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react-native';
import i18n from '../../utils/i18n';

const getQuickTags = () => {
    return i18n.t('checkin.tags', { returnObjects: true }) as string[];
};

export default function CheckinScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const {
        selectedEmotionId, setSelectedEmotionId,
        note, setNote,
        energy, setEnergy,
        saving, saved, alreadyCompleted,
        loadingCheckin, inlineError, setInlineError,
        handleSave
    } = useCheckin();

    const QUICK_TAGS = getQuickTags();
    const activeEmotion = EMOTION_PRESETS.find(e => e.id === selectedEmotionId);

    // ── Success Screen ────────────────────────────────────────────────────────
    if (saved) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                <MotiView
                    from={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 16, stiffness: 100 }}
                    style={{ alignItems: 'center', width: '100%', maxWidth: 480 }}
                >
                    <MotiView
                        from={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 14, stiffness: 120, delay: 100 }}
                    >
                        <View style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 32, borderWidth: 2, borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0' }}>
                            <CheckCircle2 size={64} color="#10B981" />
                        </View>
                    </MotiView>

                    <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 200 }}>
                        <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 10, letterSpacing: -0.5 }}>
                            Check-in gespeichert! 🎉
                        </Text>
                        <Text style={{ fontSize: 16, color: colors.textSubtle, textAlign: 'center', lineHeight: 24, fontWeight: '500', maxWidth: 300, marginBottom: 40, alignSelf: 'center' }}>
                            Super gemacht — du hast heute wieder auf dich geachtet!
                        </Text>
                    </MotiView>

                    <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 300 }} style={{ width: '100%' }}>
                        <TouchableOpacity
                            onPress={() => router.replace('/(app)/checkins_overview' as any)}
                            style={{ backgroundColor: '#137386', borderRadius: 24, paddingVertical: 18, paddingHorizontal: 36, alignItems: 'center', width: '100%', marginBottom: 14, flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: '#137386', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 }}
                        >
                            <TrendingUp size={20} color="white" />
                            <Text style={{ color: 'white', fontSize: 17, fontWeight: '900' }}>Meine Auswertung</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.dismissAll()}
                            style={{ paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center' }}
                        >
                            <Text style={{ color: colors.textSubtle, fontSize: 15, fontWeight: '700' }}>Zurück zur App</Text>
                        </TouchableOpacity>
                    </MotiView>
                </MotiView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Animated Header */}
            <MotiView
                from={{ opacity: 0, translateY: -50 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400 }}
            >
                <LinearGradient
                    colors={activeEmotion && !isDark && !alreadyCompleted ? [`${activeEmotion.color}E6`, `${activeEmotion.color}99`] : [colors.primaryDark, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingTop: 60, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 }}
                >
                    <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, marginBottom: 20 }}>
                        <Text style={{ color: '#fff', fontWeight: '800' }}>← {i18n.t('exercise.back')}</Text>
                    </TouchableOpacity>
                    <Text
                        style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        numberOfLines={1}
                    >
                        {alreadyCompleted ? '✅ ' : ''}{i18n.t('checkin.title')}
                    </Text>
                    <Text
                        style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4, fontWeight: '600' }}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        numberOfLines={1}
                    >
                        {new Date().toLocaleDateString(i18n.locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                </LinearGradient>
            </MotiView>

            {loadingCheckin ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView style={{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }} contentContainerStyle={{ padding: 20, paddingBottom: 60, width: '100%' }} showsVerticalScrollIndicator={false}>

                    {/* Mood Selector Grouping */}
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 150, delay: 100 }}
                    >
                        <View style={{ backgroundColor: colors.surface, borderRadius: 32, padding: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 16, elevation: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSubtle, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 }}>
                                Wie fühlst du dich jetzt gerade?
                            </Text>

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                                {EMOTION_PRESETS.map((preset, idx) => {
                                    const isSelected = selectedEmotionId === preset.id;
                                    return (
                                        <MotiView
                                            key={preset.id}
                                            from={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ type: 'spring', delay: 150 + (idx * 20), damping: 14, stiffness: 100 }}
                                        >
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (!alreadyCompleted) {
                                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setSelectedEmotionId(preset.id);
                                                    }
                                                }}
                                                activeOpacity={alreadyCompleted ? 1 : 0.7}
                                                style={{
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 10,
                                                    borderRadius: 24,
                                                    backgroundColor: isSelected ? preset.color : (isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6'),
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    borderWidth: isSelected ? 0 : 1,
                                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'transparent',
                                                    opacity: alreadyCompleted && !isSelected ? 0.3 : 1
                                                }}>
                                                <Text style={{ fontSize: 18 }}>{preset.emoji}</Text>
                                                <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? '#fff' : colors.text }}>
                                                    {getEmotionLabel(preset, i18n.locale)}
                                                </Text>
                                            </TouchableOpacity>
                                        </MotiView>
                                    );
                                })}
                            </View>
                        </View>
                    </MotiView>

                    {/* Energy Level Slider */}
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'spring', damping: 20, delay: 200 }}
                    >
                        <View style={{ backgroundColor: colors.surface, borderRadius: 32, padding: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 16, elevation: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSubtle, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 }}>
                                Dein Energielevel (1-10)
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#94A3B8' }}>Erschöpft</Text>
                                <Text style={{ fontSize: 24, fontWeight: '900', color: activeEmotion ? activeEmotion.color : '#137386' }}>
                                    {energy}
                                </Text>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#94A3B8' }}>Voller Energie</Text>
                            </View>
                            <View style={{ marginTop: 24, paddingHorizontal: 10, height: 40, justifyContent: 'center' }}>
                                {/* Note: Since Slider from react-native is mostly deprecated, an easy cross-platform custom slider UI is built here since it's just 1-10 */}
                                <View style={{ height: 6, backgroundColor: isDark ? '#334155' : '#E2E8F0', borderRadius: 3, flex: 1, position: 'relative' }}>
                                    {/* Active Track */}
                                    <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${(energy - 1) * 11.11}%`, backgroundColor: activeEmotion ? activeEmotion.color : '#137386', borderRadius: 3 }} />
                                    {/* Handle & Steps */}
                                    <View style={{ position: 'absolute', top: -14, left: 0, right: 0, height: 34, flexDirection: 'row', justifyContent: 'space-between' }}>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                                            <TouchableOpacity
                                                key={val}
                                                onPress={() => {
                                                    if (!alreadyCompleted) {
                                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setEnergy(val);
                                                    }
                                                }}
                                                activeOpacity={alreadyCompleted ? 1 : 0.7}
                                                style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <View style={{
                                                    width: energy === val ? 24 : 12,
                                                    height: energy === val ? 24 : 12,
                                                    borderRadius: 12,
                                                    backgroundColor: energy === val ? (activeEmotion ? activeEmotion.color : '#137386') : 'transparent',
                                                    borderWidth: energy === val ? 0 : 2,
                                                    borderColor: energy === val ? 'transparent' : (isDark ? '#475569' : '#CBD5E1'),
                                                    shadowColor: energy === val ? (activeEmotion ? activeEmotion.color : '#137386') : 'transparent',
                                                    shadowOffset: { width: 0, height: 4 },
                                                    shadowOpacity: energy === val ? 0.3 : 0,
                                                    shadowRadius: 8
                                                }} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>
                    </MotiView>

                    {/* Notes Field */}
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'spring', damping: 20, delay: 300 }}
                    >
                        <View style={{ backgroundColor: colors.surface, borderRadius: 32, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 16, elevation: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSubtle, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 }}>
                                Möchtest du noch etwas ergänzen? (Optional)
                            </Text>
                            <TextInput
                                multiline value={note} onChangeText={setNote}
                                placeholder={alreadyCompleted ? '' : "Gedanken, Notizen..."}
                                placeholderTextColor={colors.textSubtle + '80'} textAlignVertical="top"
                                editable={!alreadyCompleted}
                                style={{ fontSize: 15, color: colors.text, minHeight: 120, lineHeight: 24, backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : '#F8FAFC', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border, opacity: alreadyCompleted ? 0.7 : 1 }}
                            />
                        </View>
                    </MotiView>

                    {/* Action Area */}
                    {!alreadyCompleted ? (
                        <MotiView
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'spring', damping: 20, delay: 350 }}
                        >
                            <TouchableOpacity onPress={handleSave} disabled={saving || !selectedEmotionId}
                                style={{
                                    backgroundColor: selectedEmotionId ? (activeEmotion?.color || '#137386') : (isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0'),
                                    padding: 20,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    marginBottom: 12,
                                    shadowColor: selectedEmotionId ? activeEmotion?.color : 'transparent',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: selectedEmotionId ? 0.4 : 0,
                                    shadowRadius: 16,
                                    elevation: selectedEmotionId ? 8 : 0
                                }}>
                                {saving ? <ActivityIndicator color="#fff" /> :
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ color: selectedEmotionId ? '#fff' : colors.textSubtle, fontWeight: '900', fontSize: 18, letterSpacing: -0.5 }}>Check-in speichern</Text>
                                        <CheckCircle2 size={20} color={selectedEmotionId ? '#fff' : colors.textSubtle} />
                                    </View>
                                }
                            </TouchableOpacity>
                            {inlineError && (
                                <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                                    <AlertCircle size={18} color="#DC2626" />
                                    <Text style={{ color: '#DC2626', fontWeight: '700', flex: 1, fontSize: 14 }}>{inlineError}</Text>
                                </MotiView>
                            )}
                        </MotiView>
                    ) : (
                        <MotiView
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                        >
                            <View style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', padding: 20, borderRadius: 24, alignItems: 'center', marginBottom: 16, flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#A7F3D0' }}>
                                <CheckCircle2 size={24} color="#10B981" />
                                <Text style={{ color: '#10B981', fontWeight: '900', fontSize: 18, letterSpacing: -0.5 }}>{i18n.t('checkin.completed')}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => router.push('/(app)/checkins_overview' as any)}
                                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 18, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}
                            >
                                <TrendingUp size={20} color={colors.textSubtle} />
                                <Text style={{ color: colors.textSubtle, fontWeight: '800', fontSize: 16 }}>Meine Auswertung anzeigen</Text>
                            </TouchableOpacity>
                        </MotiView>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

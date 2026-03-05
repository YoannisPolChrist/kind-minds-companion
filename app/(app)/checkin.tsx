import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Platform, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { useNetwork } from '../../contexts/NetworkContext';
import { getDoc, doc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import i18n from '../../utils/i18n';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Frown, Meh, Smile, Laugh, Star, Sparkles, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { submitCheckin } from '../../services/checkinService';

const getMoods = () => {
    const labels = i18n.t('checkin.moods', { returnObjects: true }) as string[];
    const icons = [
        { Icon: Frown, color: '#ef4444' },
        { Icon: Frown, color: '#f87171' },
        { Icon: Meh, color: '#fb923c' },
        { Icon: Meh, color: '#9ca3af' },
        { Icon: Smile, color: '#a3e635' },
        { Icon: Smile, color: '#22c55e' },
        { Icon: Laugh, color: '#10b981' },
        { Icon: Star, color: '#0ea5e9' },
        { Icon: Star, color: '#8b5cf6' },
        { Icon: Sparkles, color: '#ec4899' },
    ];
    return icons.map((conf, index) => ({
        value: index + 1,
        Icon: conf.Icon,
        color: conf.color,
        label: labels[index] || `Level ${index + 1}`
    }));
};

const getQuickTags = () => {
    return i18n.t('checkin.tags', { returnObjects: true }) as string[];
};

export default function CheckinScreen() {
    const { profile } = useAuth();
    const { isConnected } = useNetwork();
    const router = useRouter();
    const [mood, setMood] = useState<number | null>(null);
    const [note, setNote] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [alreadyCompleted, setAlreadyCompleted] = useState(false);
    const [loadingCheckin, setLoadingCheckin] = useState(true);
    const { colors, isDark } = useTheme();
    const [inlineError, setInlineError] = useState<string | null>(null);

    useEffect(() => {
        const checkToday = async () => {
            if (!profile?.id) return;
            const today = new Date().toISOString().split('T')[0];
            try {
                const snap = await getDoc(doc(db, 'checkins', `${profile.id}_${today}`));
                if (snap.exists()) {
                    const data = snap.data();
                    setMood(data.mood);
                    setNote(data.note || '');
                    setSelectedTags(data.tags || []);
                    setAlreadyCompleted(true);
                }
            } catch (e) {
                console.error("Failed checking today's checkin", e);
            } finally {
                setLoadingCheckin(false);
            }
        };
        checkToday();
    }, [profile?.id]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const handleSave = async () => {
        if (!mood) { setInlineError(i18n.t('checkin.error_mood')); return; }
        if (!profile?.id) { setInlineError(i18n.t('checkin.error_auth')); return; }
        setInlineError(null);
        setSaving(true);

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            await submitCheckin({
                uid: profile.id,
                date: today,
                mood,
                tags: selectedTags,
                note: note.trim(),
                createdAt: new Date().toISOString(),
            }, isConnected);

            setSaved(true);
        } catch (e) {
            console.error('Check-in save error:', e);
            setInlineError(i18n.t('checkin.error_save') || 'Speichern fehlgeschlagen.');
        } finally {
            setSaving(false);
        }
    };

    const MOODS = getMoods();
    const QUICK_TAGS = getQuickTags();
    const selectedMood = MOODS.find(m => m.value === mood);

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
                    colors={['#1a365d', '#2C3E50']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingTop: 60, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
                >
                    <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 16 }}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>← {i18n.t('exercise.back')}</Text>
                    </TouchableOpacity>
                    <Text
                        style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        numberOfLines={1}
                    >
                        {alreadyCompleted ? '✅ ' : ''}{i18n.t('checkin.title')}
                    </Text>
                    <Text
                        style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        numberOfLines={1}
                    >
                        {new Date().toLocaleDateString(i18n.locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                </LinearGradient>
            </MotiView>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

                {/* Mood Selector */}
                <MotiView
                    from={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 120, delay: 100 }}
                >
                    <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSubtle, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Wie geht es dir heute?</Text>
                        {selectedMood && (
                            <MotiView
                                from={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'timing', duration: 300 }}
                            >
                                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                                    <selectedMood.Icon size={48} color={selectedMood.color} />
                                    <Text
                                        style={{ fontSize: 18, color: colors.text, fontWeight: '700', marginTop: 8, textAlign: 'center' }}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.7}
                                        numberOfLines={2}
                                    >
                                        {selectedMood.label}
                                    </Text>
                                </View>
                            </MotiView>
                        )}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: selectedMood ? 8 : 12, justifyContent: 'center' }}>
                            {MOODS.map((m, idx) => (
                                <MotiView
                                    key={m.value}
                                    from={{ opacity: 0, scale: 0.3 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: 'timing', duration: 300, delay: 150 + (idx * 30) }}
                                >
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (!alreadyCompleted) {
                                                if (Platform.OS !== 'web') {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                }
                                                setMood(m.value);
                                            }
                                        }}
                                        activeOpacity={alreadyCompleted ? 1 : 0.7}
                                        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: mood === m.value ? (isDark ? 'rgba(255,255,255,0.2)' : '#2C3E50') : (isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6'), alignItems: 'center', justifyContent: 'center', borderWidth: mood === m.value ? 2 : 0, borderColor: isDark ? colors.border : '#2C3E50', opacity: alreadyCompleted && mood !== m.value ? 0.3 : 1 }}>
                                        <m.Icon size={24} color={mood === m.value ? (isDark ? colors.text : '#ffffff') : m.color} />
                                    </TouchableOpacity>
                                </MotiView>
                            ))}
                        </View>
                    </View>
                </MotiView>

                {/* Emotion Tags */}
                <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350, delay: 200 }}
                >
                    <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSubtle, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Gefühle & Tags</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {QUICK_TAGS.map((tag, idx) => {
                                const active = selectedTags.includes(tag);
                                return (
                                    <MotiView
                                        key={tag}
                                        from={{ opacity: 0, translateX: -20 }}
                                        animate={{ opacity: 1, translateX: 0 }}
                                        transition={{ type: 'timing', duration: 300, delay: 250 + (idx * 20) }}
                                    >
                                        <TouchableOpacity onPress={() => !alreadyCompleted && toggleTag(tag)}
                                            activeOpacity={alreadyCompleted ? 1 : 0.7}
                                            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? (isDark ? 'rgba(255,255,255,0.2)' : '#2C3E50') : (isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6'), borderWidth: active ? 0 : 1, borderColor: active ? 'transparent' : colors.border, opacity: alreadyCompleted && !active ? 0.4 : 1 }}>
                                            <Text style={{ fontWeight: '600', fontSize: 13, color: active ? (isDark ? colors.text : '#fff') : colors.textSubtle }}>{tag}</Text>
                                        </TouchableOpacity>
                                    </MotiView>
                                );
                            })}
                        </View>
                    </View>
                </MotiView>

                {/* Notes */}
                <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350, delay: 300 }}
                >
                    <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSubtle, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Notiz (optional)</Text>
                        <TextInput
                            multiline value={note} onChangeText={setNote}
                            placeholder={alreadyCompleted ? '' : i18n.t('checkin.note_placeholder')}
                            placeholderTextColor={colors.textSubtle} textAlignVertical="top"
                            editable={!alreadyCompleted}
                            style={{ fontSize: 14, color: colors.text, minHeight: 120, lineHeight: 22, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#F9FAFB', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, opacity: alreadyCompleted ? 0.7 : 1 }}
                        />
                    </View>
                </MotiView>

                {!alreadyCompleted ? (
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 350, delay: 350 }}
                    >
                        <TouchableOpacity onPress={handleSave} disabled={saving || !mood}
                            style={{ backgroundColor: mood ? '#2C3E50' : (isDark ? 'rgba(255,255,255,0.05)' : '#D1D5DB'), padding: 18, borderRadius: 18, alignItems: 'center', marginBottom: 12 }}>
                            {saving ? <ActivityIndicator color="#fff" /> :
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Speichern ✓</Text>
                            }
                        </TouchableOpacity>
                        {inlineError && (
                            <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                                <AlertCircle size={16} color="#DC2626" />
                                <Text style={{ color: '#DC2626', fontWeight: '600', flex: 1, fontSize: 14 }}>{inlineError}</Text>
                            </MotiView>
                        )}
                    </MotiView>
                ) : (
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                    >
                        <View style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', padding: 18, borderRadius: 18, alignItems: 'center', marginBottom: 16, flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#A7F3D0' }}>
                            <CheckCircle2 size={22} color="#10B981" />
                            <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 16 }}>{i18n.t('checkin.completed')}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push('/(app)/checkins_overview' as any)}
                            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 16, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}
                        >
                            <TrendingUp size={18} color={colors.textSubtle} />
                            <Text style={{ color: colors.textSubtle, fontWeight: '700', fontSize: 15 }}>Meine Auswertung anzeigen</Text>
                        </TouchableOpacity>
                    </MotiView>
                )}

            </ScrollView>
        </View>
    );
}

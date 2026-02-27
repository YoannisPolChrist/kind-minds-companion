import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { useNetwork } from '../../contexts/NetworkContext';
import { doc, setDoc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import i18n from '../../utils/i18n';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Frown, Meh, Smile, Laugh, Star, Sparkles } from 'lucide-react-native';

const getMoods = () => {
    const labels = i18n.t('checkin.moods', { returnObjects: true }) as string[];
    const icons = [
        { Icon: Frown, color: '#ef4444' }, // Sehr schlecht
        { Icon: Frown, color: '#f87171' }, // Schlecht
        { Icon: Meh, color: '#fb923c' },   // Eher schlecht
        { Icon: Meh, color: '#9ca3af' },   // Neutral
        { Icon: Smile, color: '#a3e635' }, // Einigermaßen gut
        { Icon: Smile, color: '#22c55e' }, // Gut
        { Icon: Laugh, color: '#10b981' }, // Sehr gut
        { Icon: Star, color: '#0ea5e9' },  // Großartig
        { Icon: Star, color: '#8b5cf6' },  // Fantastisch
        { Icon: Sparkles, color: '#ec4899' }, // Perfekt
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
    const [alreadyCompleted, setAlreadyCompleted] = useState(false);
    const [loadingCheckin, setLoadingCheckin] = useState(true);
    const [therapistPhone, setTherapistPhone] = useState<string | null>(null);

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

    // Fix #2: Fetch therapist phone from Firestore — never hardcode personal data in the app bundle
    useEffect(() => {
        const fetchTherapistPhone = async () => {
            try {
                const q = query(collection(db, 'users'), where('role', '==', 'therapist'), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    if (data.phone) setTherapistPhone(data.phone);
                }
            } catch (e) {
                console.warn('Could not fetch therapist phone', e);
            }
        };
        fetchTherapistPhone();
    }, []);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const handleSave = async () => {
        if (!mood) { Alert.alert('Fehler', i18n.t('checkin.error_mood')); return; }
        if (!profile?.id) { Alert.alert('Fehler', i18n.t('checkin.error_auth')); return; }

        setSaving(true);
        // Haptic feedback for main action
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            const checkinData = {
                uid: profile.id,
                date: today,
                mood,
                tags: selectedTags,
                note: note.trim(),
                createdAt: new Date().toISOString(),
            };

            // OPTIMISTIC UPDATE:
            // We fire the setDoc into the background. Firestore's persistentLocalCache handles offline queuing.
            // We immediately tell the user it was saved.
            setDoc(doc(db, 'checkins', `${profile.id}_${today}`), checkinData).catch(e => {
                console.warn("Background Check-in sync failed (will retry automatically if offline)", e);
            });

            if (!isConnected) {
                Alert.alert(
                    'Offline gespeichert',
                    'Dein Check-in wurde lokal gesichert und wird synchronisiert, sobald du wieder online bist.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                Alert.alert(i18n.t('checkin.saved_title'), i18n.t('checkin.saved_msg'), [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }

            if (Platform.OS === 'web') {
                router.back();
            }
        } catch (e: any) {
            console.error("Check-in Error:", e);
            Alert.alert('Fehler', i18n.t('checkin.error_save'));
        } finally {
            setSaving(false);
        }
    };

    const contactTherapist = async () => {
        try {
            const message = `Hallo, ich kontaktiere dich aus der Therapie-App.`;
            const url = `whatsapp://send?text=${encodeURIComponent(message)}` + (therapistPhone ? `&phone=${therapistPhone}` : '');

            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                const webUrl = therapistPhone
                    ? `https://wa.me/${therapistPhone}?text=${encodeURIComponent(message)}`
                    : `https://wa.me/?text=${encodeURIComponent(message)}`;
                await Linking.openURL(webUrl);
            }
        } catch (error) {
            console.error('Error opening WhatsApp', error);
            Alert.alert('Fehler', 'Konnte WhatsApp nicht öffnen. Bitte stelle sicher, dass die App installiert ist.');
        }
    };

    const MOODS = getMoods();
    const QUICK_TAGS = getQuickTags();
    const selectedMood = MOODS.find(m => m.value === mood);

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            {/* Animated Header – slides down */}
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
                        {i18n.t('checkin.title')}
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

                {/* Mood Selector – card scales in */}
                <MotiView
                    from={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 120, delay: 100 }}
                >
                    <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Wie geht es dir?</Text>
                        {selectedMood && (
                            <MotiView
                                from={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'timing', duration: 300 }}
                            >
                                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                                    <selectedMood.Icon size={48} color={selectedMood.color} />
                                    <Text
                                        style={{ fontSize: 18, color: '#374151', fontWeight: '700', marginTop: 8, textAlign: 'center', flexWrap: 'wrap' }}
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
                                        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: mood === m.value ? '#2C3E50' : '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: mood === m.value ? 2 : 0, borderColor: '#2C3E50', opacity: alreadyCompleted && mood !== m.value ? 0.3 : 1 }}>
                                        <m.Icon size={24} color={mood === m.value ? '#ffffff' : m.color} />
                                    </TouchableOpacity>
                                </MotiView>
                            ))}
                        </View>
                    </View>
                </MotiView>

                {/* Emotion Tags – card slides up with staggered tags */}
                <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350, delay: 200 }}
                >
                    <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Gefühle & Tags</Text>
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
                                            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? '#2C3E50' : '#F3F4F6', borderWidth: active ? 0 : 1, borderColor: '#E5E7EB', opacity: alreadyCompleted && !active ? 0.4 : 1 }}>
                                            <Text style={{ fontWeight: '600', fontSize: 13, color: active ? '#fff' : '#4B5563' }}>{tag}</Text>
                                        </TouchableOpacity>
                                    </MotiView>
                                );
                            })}
                        </View>
                    </View>
                </MotiView>

                {/* Notes – card slides up */}
                <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350, delay: 300 }}
                >
                    <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Notiz (optional)</Text>
                        <TextInput
                            multiline value={note} onChangeText={setNote}
                            placeholder={alreadyCompleted ? '' : i18n.t('checkin.note_placeholder')}
                            placeholderTextColor="#9CA3AF" textAlignVertical="top"
                            editable={!alreadyCompleted}
                            style={{ fontSize: 14, color: '#111827', minHeight: 120, lineHeight: 22, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', opacity: alreadyCompleted ? 0.7 : 1 }}
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
                            style={{ backgroundColor: mood ? '#2C3E50' : '#D1D5DB', padding: 18, borderRadius: 18, alignItems: 'center', marginBottom: 16 }}>
                            {saving ? <ActivityIndicator color="#fff" /> :
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Check-in speichern ✓</Text>
                            }
                        </TouchableOpacity>
                    </MotiView>
                ) : (
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                    >
                        <View style={{ backgroundColor: '#F3F4F6', padding: 18, borderRadius: 18, alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ color: '#4B5563', fontWeight: '800', fontSize: 16 }}>{i18n.t('checkin.completed')}</Text>
                        </View>
                    </MotiView>
                )}

                {/* WhatsApp Button – slides in from right */}
                <MotiView
                    from={{ opacity: 0, translateX: 40 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'timing', duration: 300, delay: 400 }}
                >
                    <TouchableOpacity onPress={contactTherapist}
                        style={{ backgroundColor: '#25D366', padding: 16, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Therapeut kontaktieren (WhatsApp)</Text>
                    </TouchableOpacity>
                </MotiView>

            </ScrollView>
        </View>
    );
}

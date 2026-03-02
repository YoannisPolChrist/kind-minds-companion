import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { useNetwork } from '../../contexts/NetworkContext';
import { submitCheckin } from '../../services/checkinService';
import i18n from '../../utils/i18n';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, CheckCircle2 } from 'lucide-react-native';
import ExpoMindfulTracking from '../../modules/expo-mindful-tracking';

const DURATIONS = [
    { label: '5', value: 5 },
    { label: '15', value: 15 },
    { label: '30', value: 30 },
    { label: '60', value: 60 },
];

export default function AccessDurationScreen() {
    const { profile } = useAuth();
    const { isConnected } = useNetwork();
    const router = useRouter();
    const params = useLocalSearchParams();

    const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const handleFinish = async () => {
        if (!selectedDuration) return;
        if (!profile?.id) return;

        setSaving(true);
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            const checkinData = {
                uid: profile.id,
                date: today,
                mood: Number(params.mood),
                tags: params.tags ? (params.tags as string).split(',') : [],
                note: (params.note as string) || '',
                duration: selectedDuration,
                createdAt: new Date().toISOString(),
            };

            // Grant native access via our updated module
            if (Platform.OS === 'android') {
                try {
                    ExpoMindfulTracking.grantTemporaryAccess(selectedDuration);
                } catch (e) {
                    console.warn('Native access grant failed:', e);
                }
            }

            // Save via CheckinService
            await submitCheckin(checkinData, isConnected);

            if (!isConnected) {
                Alert.alert(
                    'Offline gespeichert',
                    'Dein Check-in wurde lokal gesichert und wird synchronisiert, sobald du wieder online bist.',
                    [{ text: 'OK', onPress: () => router.dismissAll() }]
                );
            } else {
                Alert.alert(i18n.t('checkin.saved_title'), i18n.t('checkin.saved_msg'), [
                    { text: 'OK', onPress: () => router.dismissAll() }
                ]);
            }

            if (Platform.OS === 'web') {
                router.dismissAll();
            }
        } catch (e: any) {
            console.error("Final Save Error:", e);
            Alert.alert('Fehler', i18n.t('checkin.error_save'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <MotiView
                from={{ opacity: 0, translateY: -50 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400 }}
            >
                <LinearGradient
                    colors={['#1a365d', '#2C3E50']}
                    style={{ paddingTop: 60, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
                >
                    <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 16 }}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>← {i18n.t('exercise.back')}</Text>
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{i18n.t('checkin.duration.title')}</Text>
                </LinearGradient>
            </MotiView>

            <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
                <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', delay: 100 }}
                    style={{ backgroundColor: '#fff', borderRadius: 32, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 }}
                >
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <View style={{ backgroundColor: '#F3F4F6', padding: 16, borderRadius: 24, marginBottom: 16 }}>
                            <Clock size={32} color="#2C3E50" />
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
                            {i18n.t('checkin.duration.subtitle')}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 }}>
                            {i18n.t('checkin.duration.desc')}
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
                        {DURATIONS.map((d, idx) => (
                            <MotiView
                                key={d.value}
                                from={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', delay: 200 + (idx * 50) }}
                            >
                                <TouchableOpacity
                                    onPress={() => {
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        setSelectedDuration(d.value);
                                    }}
                                    style={{
                                        width: 130,
                                        height: 100,
                                        borderRadius: 24,
                                        backgroundColor: selectedDuration === d.value ? '#2C3E50' : '#F3F4F6',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderWidth: 2,
                                        borderColor: selectedDuration === d.value ? '#2C3E50' : '#F3F4F6',
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                        <Text style={{ fontSize: 28, fontWeight: '900', color: selectedDuration === d.value ? '#fff' : '#111827' }}>
                                            {d.label}
                                        </Text>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: selectedDuration === d.value ? '#fff' : '#6B7280', marginLeft: 4 }}>
                                            {i18n.t('checkin.duration.unit')}
                                        </Text>
                                    </View>
                                    {selectedDuration === d.value && (
                                        <MotiView from={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', top: 10, right: 10 }}>
                                            <CheckCircle2 size={18} color="#C09D59" />
                                        </MotiView>
                                    )}
                                </TouchableOpacity>
                            </MotiView>
                        ))}
                    </View>

                    <TouchableOpacity
                        onPress={handleFinish}
                        disabled={!selectedDuration || saving}
                        style={{
                            backgroundColor: selectedDuration ? '#2C3E50' : '#E5E7EB',
                            padding: 20,
                            borderRadius: 20,
                            alignItems: 'center',
                        }}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                                {i18n.t('checkin.duration.btn_finish')} ✓
                            </Text>
                        )}
                    </TouchableOpacity>
                </MotiView>
            </View>
        </View>
    );
}

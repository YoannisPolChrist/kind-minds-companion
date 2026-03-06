import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SectionList, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '../../../../../hooks/useSafeBack';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../../utils/firebase';
import i18n from '../../../../../utils/i18n';
import { MotiView } from 'moti';
import { ArrowLeft, Calendar, Activity } from 'lucide-react-native';
import { CheckinCard } from '../../../../../components/checkins/CheckinCard';
import { CheckinAnalytics } from '../../../../../components/checkins/CheckinAnalytics';

export default function TherapistClientCheckinsScreen() {
    const router = useRouter();
    const goBack = useSafeBack();
    const { id } = useLocalSearchParams();
    const [checkins, setCheckins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCheckins = async () => {
        if (!id) return;
        try {
            const q = query(
                collection(db, 'checkins'),
                where("uid", "==", id)
            );
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort client-side descending
            data.sort((a: any, b: any) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
                return dateB - dateA;
            });

            setCheckins(data);
        } catch (error) {
            console.error("Error fetching checkins:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCheckins(); }, [id]);

    const formatDate = (checkin: any) => {
        const dateObj = checkin.createdAt ? new Date(checkin.createdAt) : new Date(checkin.date);
        return dateObj.toLocaleDateString(i18n.locale || 'de', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const formatTime = (checkin: any) => {
        if (checkin.createdAt) {
            return new Date(checkin.createdAt).toLocaleTimeString(i18n.locale || 'de', { hour: '2-digit', minute: '2-digit' });
        }
        return '';
    };

    const groupByDate = (items: any[]) => {
        const groups: { [key: string]: any[] } = {};
        items.forEach(item => {
            const key = formatDate(item);
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return Object.entries(groups);
    };

    const sections = groupByDate(checkins).map(([title, data]) => ({ title, data }));

    return (
        <View style={{ flex: 1, backgroundColor: '#F7F4EE' }}>
            {/* Header */}
            <MotiView from={{ opacity: 0, translateY: -30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 380 }}>
                <View style={{ backgroundColor: '#2D666B', paddingTop: 64, paddingBottom: 28, paddingHorizontal: 28 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <TouchableOpacity onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
                            <ArrowLeft size={18} color="white" />
                            <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8, fontSize: 15 }}>ZurÃ¼ck</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={{ color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>Stimmungs-Tagebuch</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                        {checkins.length} {checkins.length === 1 ? 'Check-in' : 'Check-ins'} insgesamt
                    </Text>
                </View>
            </MotiView>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#2D666B" />
                </View>
            ) : checkins.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 }}>
                    <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ alignItems: 'center' }}>
                        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 28, borderWidth: 2, borderColor: '#F3EEE6' }}>
                            <Activity size={48} color="#8B938E" />
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#182428', letterSpacing: -0.5, marginBottom: 12, textAlign: 'center' }}>Keine Check-ins</Text>
                        <Text style={{ fontSize: 16, color: '#6F7472', textAlign: 'center', lineHeight: 24, maxWidth: 300, fontWeight: '500' }}>
                            Der Klient hat bisher noch keinen Check-in durchgefÃ¼hrt.
                        </Text>
                    </MotiView>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 24, paddingBottom: 120, maxWidth: 860, alignSelf: 'center', width: '100%' }}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <CheckinAnalytics checkins={checkins} />
                    }
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E7E0D4', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}>
                                <Calendar size={14} color="#788E76" />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1F2528', marginLeft: 6 }}>{title}</Text>
                            </View>
                            <View style={{ flex: 1, height: 1, backgroundColor: '#E7E0D4', marginLeft: 12 }} />
                        </View>
                    )}
                    renderItem={({ item }) => (
                        <View style={{ paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: '#E7E0D4' }}>
                            <CheckinCard checkin={item} formatTime={formatTime} />
                        </View>
                    )}
                    renderSectionFooter={() => <View style={{ marginBottom: 32 }} />}
                />
            )}
        </View>
    );
}



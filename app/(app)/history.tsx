import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Lock } from 'lucide-react-native';
import { getEmotionByScore, getEmotionLabel } from '../../constants/emotions';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatMoodScore, normalizeMoodToTen } from '../../utils/checkinMood';
import { db } from '../../utils/firebase';
import i18n from '../../utils/i18n';
import { getLocalCache, setLocalCache } from '../../utils/SyncManager';

function formatDate(dateStr: string, locale: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });
}

function getHistoryDate(item: any) {
    if (item.isCheckin) {
        return item.createdAt || item.date || Date.now();
    }

    return item.lastCompletedAt || item.createdAt || Date.now();
}

function groupByWeek(items: any[]) {
    const weeks: Record<string, any[]> = {};
    items.forEach((item) => {
        const d = new Date(getHistoryDate(item));
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const key = monday.toISOString().split('T')[0];
        if (!weeks[key]) weeks[key] = [];
        weeks[key].push(item);
    });
    return Object.entries(weeks).sort(([a], [b]) => b.localeCompare(a));
}

function flattenGroupedData(groupedData: [string, any[]][]) {
    const flatList: any[] = [];
    groupedData.forEach(([weekStart, items]) => {
        flatList.push({ isHeader: true, weekStart });
        items.forEach((item) => flatList.push(item));
    });
    return flatList;
}

function weekLabel(dateStr: string, locale: string) {
    const d = new Date(dateStr);
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    return `${d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: '2-digit' })}`;
}

export default function HistoryScreen() {
    const { profile } = useAuth();
    const router = useRouter();
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { locale } = useLanguage();

    useEffect(() => {
        if (profile?.id) fetchHistory();
    }, [profile?.id]);

    const fetchHistory = async () => {
        try {
            const cachedData = await getLocalCache<any[]>(`history_${profile?.id}`);
            if (cachedData && cachedData.length > 0) {
                setExercises(cachedData);
                setLoading(false);
            } else {
                setLoading(true);
            }

            const exQuery = query(
                collection(db, 'exercises'),
                where('clientId', '==', profile!.id),
                where('completed', '==', true),
            );
            const checkinsQuery = query(
                collection(db, 'checkins'),
                where('uid', '==', profile!.id)
            );

            const [exSnap, checkinSnap] = await Promise.all([
                getDocs(exQuery),
                getDocs(checkinsQuery),
            ]);

            const exData = exSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
            const checkinData = checkinSnap.docs.map((docSnap) => ({ id: docSnap.id, isCheckin: true, ...docSnap.data() }));
            const data = [...exData, ...checkinData];

            data.sort((a: any, b: any) => {
                const ta = new Date(getHistoryDate(a)).getTime();
                const tb = new Date(getHistoryDate(b)).getTime();
                return tb - ta;
            });

            setExercises(data);
            await setLocalCache(`history_${profile?.id}`, data);
        } catch (error) {
            console.error('History fetch error', error);
        } finally {
            setLoading(false);
        }
    };

    const grouped = groupByWeek(exercises);

    return (
        <View style={{ flex: 1, backgroundColor: '#F7F4EE' }}>
            <View style={{ backgroundColor: '#22474D', paddingTop: 60, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
                <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 16 }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{'<-'} {i18n.t('exercise.back')}</Text>
                </TouchableOpacity>
                <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{i18n.t('history.title')}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
                    {i18n.t('history.subtitle', { count: exercises.length })}
                </Text>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#1F2528" />
                </View>
            ) : exercises.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#EEF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        <Text style={{ fontSize: 28, fontWeight: '900', color: '#788E76' }}>OK</Text>
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#1F2528', marginBottom: 8, textAlign: 'center' }}>{i18n.t('history.empty_title')}</Text>
                    <Text style={{ fontSize: 14, color: '#6F7472', textAlign: 'center', lineHeight: 22 }}>
                        {i18n.t('history.empty_desc')}
                    </Text>
                </View>
            ) : (
                <View style={{ flex: 1, minHeight: 200 }}>
                    <FlashList<any>
                        data={flattenGroupedData(grouped)}
                        
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                        renderItem={({ item, index }) => {
                            if (item.isHeader) {
                                return (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: index > 0 ? 24 : 0, gap: 8 }}>
                                        <View style={{ flex: 1, height: 1, backgroundColor: '#E7E0D4' }} />
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B938E', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {weekLabel(item.weekStart, locale)}
                                        </Text>
                                        <View style={{ flex: 1, height: 1, backgroundColor: '#E7E0D4' }} />
                                    </View>
                                );
                            }

                            if (item.isCheckin) {
                                const emotion = getEmotionByScore(normalizeMoodToTen(item.mood));
                                return (
                                    <View style={{ flexDirection: 'row', marginBottom: 12, gap: 12 }}>
                                        <View style={{ alignItems: 'center', width: 24 }}>
                                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#4E7E82', borderWidth: 2, borderColor: '#fff', shadowColor: '#4E7E82', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 4, marginTop: 4 }} />
                                            <View style={{ width: 2, flex: 1, backgroundColor: '#D8E6E4', marginTop: 4 }} />
                                        </View>
                                        <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#D8E6E4', padding: 14, marginBottom: 2 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <View style={{ flex: 1, marginRight: 8 }}>
                                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2528', marginBottom: 2 }}>Check-in</Text>
                                                    <Text style={{ fontSize: 12, color: '#6F7472' }}>
                                                        {formatDate(getHistoryDate(item), locale)}
                                                    </Text>
                                                    <View style={{ alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#EEF4F3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                                                        <Text style={{ fontSize: 11, color: '#2D666B', fontWeight: '800' }}>
                                                            Stimmung {formatMoodScore(item.mood)}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={{ alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 24 }}>{emotion.emoji}</Text>
                                                    <Text style={{ fontSize: 11, color: '#6F7472', fontWeight: '700', marginTop: 4 }}>
                                                        {getEmotionLabel(emotion, i18n.locale)}
                                                    </Text>
                                                </View>
                                            </View>
                                            {item.energy !== undefined && item.energy !== null && (
                                                <Text style={{ fontSize: 12, color: '#788E76', fontWeight: '700', marginTop: 10 }}>
                                                    Energie {item.energy}/10
                                                </Text>
                                            )}
                                            {item.tags && item.tags.length > 0 && (
                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                                                    {item.tags.map((tag: string) => (
                                                        <View key={tag} style={{ backgroundColor: '#F3EEE6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                                            <Text style={{ fontSize: 10, color: '#5E655F', fontWeight: '600' }}>{tag}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                            {item.note ? (
                                                <Text style={{ fontSize: 13, color: '#5E655F', marginTop: 8, fontStyle: 'italic' }}>"{item.note}"</Text>
                                            ) : null}
                                        </View>
                                    </View>
                                );
                            }

                            const ex = item;
                            return (
                                <TouchableOpacity onPress={() => router.push(`/(app)/exercise/${ex.id}` as any)} style={{ flexDirection: 'row', marginBottom: 12, gap: 12 }}>
                                    <View style={{ alignItems: 'center', width: 24 }}>
                                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#B08C57', borderWidth: 2, borderColor: '#fff', shadowColor: '#B08C57', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 4, marginTop: 4 }} />
                                        <View style={{ width: 2, flex: 1, backgroundColor: '#E7DCCB', marginTop: 4 }} />
                                    </View>

                                    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#E7DCCB', padding: 14, marginBottom: 2 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2528', marginBottom: 2 }}>{ex.title}</Text>
                                                <Text style={{ fontSize: 12, color: '#6F7472' }}>
                                                    {i18n.t('history.modules', { count: ex.blocks?.length ?? 0 })} - {formatDate(ex.lastCompletedAt || ex.createdAt, locale)}
                                                </Text>
                                            </View>
                                            <View style={{ backgroundColor: '#E7DCCB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                                                <Text style={{ color: '#8A6A53', fontWeight: '700', fontSize: 12 }}>{i18n.t('history.done')}</Text>
                                            </View>
                                        </View>

                                        {ex.completed && ex.sharedAnswers === false ? (
                                            <View style={{ marginTop: 10, backgroundColor: '#F7F4EE', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E7E0D4', flexDirection: 'row', alignItems: 'center' }}>
                                                <Lock size={12} color="#8B938E" style={{ marginRight: 6 }} />
                                                <Text style={{ fontSize: 11, color: '#6F7472', flex: 1 }}>Private Antwort</Text>
                                            </View>
                                        ) : (
                                            ex.answers && Object.keys(ex.answers).length > 0 && (
                                                <View style={{ marginTop: 10, backgroundColor: '#F7F4EE', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E7E0D4' }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#8B938E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{i18n.t('history.answers')}</Text>
                                                    {Object.values(ex.answers).slice(0, 2).map((ans, j) => (
                                                        <Text key={j} numberOfLines={1} style={{ fontSize: 12, color: '#5E655F', marginBottom: 2 }}>
                                                            - {String(ans)}
                                                        </Text>
                                                    ))}
                                                    {Object.keys(ex.answers).length > 2 && (
                                                        <Text style={{ fontSize: 11, color: '#8B938E', marginTop: 2 }}>{i18n.t('history.more', { count: Object.keys(ex.answers).length - 2 })}</Text>
                                                    )}
                                                </View>
                                            )
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            )}
        </View>
    );
}




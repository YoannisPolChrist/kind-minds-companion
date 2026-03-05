import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { MOOD_COLORS, MOOD_EMOJIS, MOOD_LABELS } from './CheckinCard';
import { Activity, Star, Hash } from 'lucide-react-native';

const screenWidth = Math.min(Dimensions.get('window').width - 48, 800); // 48 padding

interface CheckinAnalyticsProps {
    checkins: any[];
}

export const CheckinAnalytics = ({ checkins }: CheckinAnalyticsProps) => {

    const analytics = useMemo(() => {
        if (!checkins || checkins.length === 0) return null;

        let totalMood = 0;
        let moodCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const tagCounts: { [key: string]: number } = {};

        checkins.forEach(c => {
            if (c.mood) {
                totalMood += c.mood;
                if (moodCounts[c.mood as keyof typeof moodCounts] !== undefined) {
                    moodCounts[c.mood as keyof typeof moodCounts]++;
                }
            }
            if (c.tags && c.tags.length > 0) {
                c.tags.forEach((t: string) => {
                    tagCounts[t] = (tagCounts[t] || 0) + 1;
                });
            }
        });

        const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3); // Top 3 tags

        const validCheckinCount = checkins.filter(c => c.mood).length;
        const averageMood = validCheckinCount > 0 ? (totalMood / validCheckinCount).toFixed(1) : '0';

        const chartConfig = {
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Emerald 500
            labelColor: (opacity = 1) => `rgba(36, 56, 66, ${opacity})`,
            strokeWidth: 2, // optional, default 3
            barPercentage: 0.5,
            useShadowColorFromDataset: false // optional
        };

        const barData = {
            labels: ["1", "2", "3", "4", "5"],
            datasets: [
                {
                    data: [
                        moodCounts[1],
                        moodCounts[2],
                        moodCounts[3],
                        moodCounts[4],
                        moodCounts[5]
                    ],
                    colors: [
                        (opacity = 1) => MOOD_COLORS[1],
                        (opacity = 1) => MOOD_COLORS[2],
                        (opacity = 1) => MOOD_COLORS[3],
                        (opacity = 1) => MOOD_COLORS[4],
                        (opacity = 1) => MOOD_COLORS[5],
                    ]
                }
            ]
        };

        const pieData = Object.entries(moodCounts)
            .filter(([_, count]) => count > 0)
            .map(([moodStr, count]) => {
                const moodNum = parseInt(moodStr) as keyof typeof MOOD_LABELS;
                return {
                    name: MOOD_EMOJIS[moodNum],
                    count: count,
                    color: MOOD_COLORS[moodNum],
                    legendFontColor: '#64748B',
                    legendFontSize: 13
                }
            });

        return {
            averageMood,
            sortedTags,
            barData,
            pieData,
            chartConfig
        };
    }, [checkins]);

    if (!analytics) return null;

    return (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
            style={{ marginBottom: 32 }}
        >
            <View style={{ backgroundColor: 'white', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.04, shadowRadius: 24, elevation: 4 }}>

                {/* Header: Average Mood & Stats */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 20 }}>
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Star size={16} color="#F59E0B" fill="#F59E0B" />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Durchschnitt</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={{ fontSize: 42, fontWeight: '900', color: '#243842', letterSpacing: -1 }}>{analytics.averageMood}</Text>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#94A3B8', ml: 4 }}> / 5</Text>
                        </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                        <View style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>{checkins.length} Einträge</Text>
                        </View>
                        {analytics.sortedTags.length > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                                <Activity size={12} color="#10B981" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981', marginLeft: 4 }}>Aktiv</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Body: Charts & Tags */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>

                    {/* Charts */}
                    <View style={{ flex: 1, minWidth: 280 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#243842', marginBottom: 16 }}>Stimmungsverteilung</Text>
                        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, overflow: 'hidden' }}>
                            {analytics.pieData.length > 0 ? (
                                <PieChart
                                    data={analytics.pieData}
                                    width={Math.min(screenWidth, 320)}
                                    height={160}
                                    chartConfig={analytics.chartConfig}
                                    accessor={"count"}
                                    backgroundColor={"transparent"}
                                    paddingLeft={"15"}
                                    center={[10, 0]}
                                    absolute
                                />
                            ) : (
                                <Text style={{ textAlign: 'center', color: '#94A3B8' }}>Keine Daten für Tabelle</Text>
                            )}
                        </View>
                    </View>

                    {/* Top Tags */}
                    {analytics.sortedTags.length > 0 && (
                        <View style={{ flex: 1, minWidth: 280 }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#243842', marginBottom: 16 }}>Häufigste Aktivitäten</Text>
                            <View style={{ gap: 12 }}>
                                {analytics.sortedTags.map(([tag, count], index) => (
                                    <View key={tag} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: index === 0 ? '#FEF3C7' : (index === 1 ? '#F1F5F9' : '#FFF7ED'), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '800', color: index === 0 ? '#D97706' : (index === 1 ? '#64748B' : '#C2410C') }}>#{index + 1}</Text>
                                            </View>
                                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#334155' }}>{tag}</Text>
                                        </View>
                                        <View style={{ backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748B' }}>{count}x</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                </View>
            </View>
        </MotiView>
    );
};

import React, { useMemo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { getEmotionByScore, getEmotionLabel, EMOTION_PRESETS } from '../../constants/emotions';
import { Activity, Star } from 'lucide-react-native';
import i18n from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';

interface CheckinAnalyticsProps {
    checkins: any[];
}

export const CheckinAnalytics = ({ checkins }: CheckinAnalyticsProps) => {
    const { colors, isDark } = useTheme();

    const analytics = useMemo(() => {
        if (!checkins || checkins.length === 0) return null;

        let totalScore = 0;
        let validScoresCount = 0;

        // Count frequencies of each specific preset ID we encounter
        const emotionCountMap: Record<string, { count: number, preset: typeof EMOTION_PRESETS[0] }> = {};
        const tagCounts: { [key: string]: number } = {};

        checkins.forEach(c => {
            if (c.mood) {
                totalScore += c.mood;
                validScoresCount++;
                const emotion = getEmotionByScore(c.mood);

                if (!emotionCountMap[emotion.id]) {
                    emotionCountMap[emotion.id] = { count: 0, preset: emotion };
                }
                emotionCountMap[emotion.id].count++;
            }
            if (c.tags && c.tags.length > 0) {
                c.tags.forEach((t: string) => {
                    tagCounts[t] = (tagCounts[t] || 0) + 1;
                });
            }
        });

        // Top 3 tags
        const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        // Top 3 emotions
        const topEmotions = Object.values(emotionCountMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 4); // show up to top 4

        const averageMood = validScoresCount > 0 ? (totalScore / validScoresCount).toFixed(1) : '0';

        return {
            averageMood,
            sortedTags,
            topEmotions,
            validScoresCount
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
            <View style={{ backgroundColor: colors.surface, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', shadowColor: isDark ? '#000' : '#0F172A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.04, shadowRadius: 24, elevation: 4 }}>

                {/* Header: Average Mood & Stats */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9', paddingBottom: 20 }}>
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Star size={16} color="#F59E0B" fill="#F59E0B" />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSubtle || '#64748B', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Durchschnitt</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={{ fontSize: 42, fontWeight: '900', color: colors.text, letterSpacing: -1 }}>{analytics.averageMood}</Text>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#64748B' : '#94A3B8', marginLeft: 4 }}> / 10</Text>
                        </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#475569' }}>{checkins.length} Einträge</Text>
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
                        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 16 }}>Häufigste Emotionen</Text>
                        <View style={{ gap: 12 }}>
                            {analytics.topEmotions.length > 0 ? analytics.topEmotions.map((item, index) => {
                                // Calculate percentage
                                const percentage = Math.round((item.count / analytics.validScoresCount) * 100);

                                return (
                                    <View key={item.preset.id} style={{ flexDirection: 'column', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${item.preset.color}25`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                                    <Text style={{ fontSize: 16 }}>{item.preset.emoji}</Text>
                                                </View>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{getEmotionLabel(item.preset, i18n.locale)}</Text>
                                            </View>
                                            <Text style={{ fontSize: 14, fontWeight: '800', color: item.preset.color }}>{percentage}%</Text>
                                        </View>

                                        {/* Progress Bar */}
                                        <View style={{ height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                            <MotiView
                                                from={{ width: '0%' }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ type: 'timing', duration: 1000, delay: index * 100 }}
                                                style={{ height: '100%', backgroundColor: item.preset.color, borderRadius: 3 }}
                                            />
                                        </View>
                                    </View>
                                );
                            }) : (
                                <Text style={{ textAlign: 'center', color: isDark ? '#64748B' : '#94A3B8', padding: 20 }}>Keine Daten für Diagramm</Text>
                            )}
                        </View>
                    </View>

                    {/* Top Tags */}
                    {analytics.sortedTags.length > 0 && (
                        <View style={{ flex: 1, minWidth: 280 }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 16 }}>Häufigste Aktivitäten</Text>
                            <View style={{ gap: 12 }}>
                                {analytics.sortedTags.map(([tag, count], index) => (
                                    <View key={tag} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', padding: 16, borderRadius: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: index === 0 ? (isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7') : (index === 1 ? (isDark ? 'rgba(100, 116, 139, 0.2)' : '#F1F5F9') : (isDark ? 'rgba(194, 65, 12, 0.2)' : '#FFF7ED')), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '800', color: index === 0 ? '#D97706' : (index === 1 ? '#64748B' : '#C2410C') }}>#{index + 1}</Text>
                                            </View>
                                            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{tag}</Text>
                                        </View>
                                        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: isDark ? 'transparent' : '#E2E8F0' }}>
                                            <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#CBD5E1' : '#64748B' }}>{count}x</Text>
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

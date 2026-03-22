import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { MotiView } from 'moti';
import { Activity, Star } from 'lucide-react-native';
import i18n from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';
import { getEmotionByScore, getEmotionLabel, EMOTION_PRESETS } from '../../constants/emotions';

interface CheckinAnalyticsProps {
    checkins: any[];
}

const TAG_BADGE_COLORS = [
    { light: '#FEF3C7', dark: 'rgba(217,119,6,0.2)', text: '#D97706' },
    { light: '#E2E8F0', dark: 'rgba(100,116,139,0.25)', text: '#64748B' },
    { light: '#FFF7ED', dark: 'rgba(194,65,12,0.2)', text: '#C2410C' },
];

export const CheckinAnalytics = ({ checkins }: CheckinAnalyticsProps) => {
    const { colors, isDark } = useTheme();

    const analytics = useMemo(() => {
        if (!checkins || checkins.length === 0) return null;

        let totalScore = 0;
        let validScoresCount = 0;
        const emotionCountMap: Record<string, { count: number; preset: typeof EMOTION_PRESETS[0] }> = {};
        const tagCounts: Record<string, number> = {};

        checkins.forEach((entry) => {
            if (typeof entry.mood === 'number') {
                totalScore += entry.mood;
                validScoresCount++;
                const emotion = getEmotionByScore(entry.mood);
                if (!emotionCountMap[emotion.id]) {
                    emotionCountMap[emotion.id] = { count: 0, preset: emotion };
                }
                emotionCountMap[emotion.id].count++;
            }
            (entry.tags || []).forEach((tag: string) => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        const topEmotions = Object.values(emotionCountMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);

        return {
            averageMood: validScoresCount ? Number((totalScore / validScoresCount).toFixed(1)) : 0,
            sortedTags,
            topEmotions,
            validScoresCount,
        };
    }, [checkins]);

    if (!analytics) return null;

    const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder;
    const sectionBg = isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC';
    const chipBg = isDark ? 'rgba(255,255,255,0.08)' : '#ECFDF5';
    const chipText = isDark ? '#A7F3D0' : '#047857';

    return (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
            style={{ marginBottom: 32 }}
        >
            <View
                style={{
                    backgroundColor: colors.surface,
                    borderRadius: 32,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: cardBorder,
                    shadowColor: isDark ? '#000' : '#0F172A',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.04,
                    shadowRadius: 24,
                    elevation: 4,
                }}
            >
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 24,
                        borderBottomWidth: 1,
                        borderBottomColor: cardBorder,
                        paddingBottom: 20,
                    }}
                >
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Star size={16} color="#F59E0B" fill="#F59E0B" />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSubtle, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {i18n.t('dashboard.average', { defaultValue: 'Durchschnitt' })}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={{ fontSize: 42, fontWeight: '900', color: colors.text, letterSpacing: -1 }}>{analytics.averageMood}</Text>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textSubtle, marginLeft: 4 }}>/ 10</Text>
                        </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                        <View style={{ backgroundColor: chipBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: chipText }}>
                                {checkins.length} {i18n.t('dashboard.checkins_label', { defaultValue: 'Check-ins' })}
                            </Text>
                        </View>
                        {analytics.sortedTags.length > 0 ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: chipBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                                <Activity size={12} color={chipText} />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: chipText, marginLeft: 4 }}>
                                    {i18n.t('dashboard.tag_active', { defaultValue: 'Aktiv' })}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
                    <View style={{ flex: 1, minWidth: 280 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 16 }}>
                            {i18n.t('dashboard.emotions_title', { defaultValue: 'Häufigste Emotionen' })}
                        </Text>
                        <View style={{ gap: 12 }}>
                            {analytics.topEmotions.length ? (
                                analytics.topEmotions.map((item, index) => {
                                    const percentage = Math.round((item.count / analytics.validScoresCount) * 100);
                                    return (
                                        <View
                                            key={item.preset.id}
                                            style={{
                                                backgroundColor: sectionBg,
                                                padding: 16,
                                                borderRadius: 16,
                                                borderWidth: 1,
                                                borderColor: cardBorder,
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <View
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 10,
                                                            backgroundColor: `${item.preset.color}1F`,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginRight: 12,
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 16 }}>{item.preset.emoji}</Text>
                                                    </View>
                                                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                                                        {getEmotionLabel(item.preset, i18n.locale)}
                                                    </Text>
                                                </View>
                                                <Text style={{ fontSize: 14, fontWeight: '800', color: item.preset.color }}>{percentage}%</Text>
                                            </View>
                                            <View style={{ height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                                <MotiView
                                                    from={{ width: '0%' }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ type: 'timing', duration: 1000, delay: index * 100 }}
                                                    style={{ height: '100%', backgroundColor: item.preset.color, borderRadius: 3 }}
                                                />
                                            </View>
                                        </View>
                                    );
                                })
                            ) : (
                                <Text style={{ textAlign: 'center', color: colors.textSubtle, padding: 20 }}>
                                    {i18n.t('dashboard.no_emotion_data', { defaultValue: 'Keine Daten für Diagramm' })}
                                </Text>
                            )}
                        </View>
                    </View>

                    {analytics.sortedTags.length ? (
                        <View style={{ flex: 1, minWidth: 280 }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 16 }}>
                                {i18n.t('dashboard.tags_title', { defaultValue: 'Häufigste Aktivitäten' })}
                            </Text>
                            <View style={{ gap: 12 }}>
                                {analytics.sortedTags.map(([tag, count], index) => {
                                    const palette = TAG_BADGE_COLORS[index] || TAG_BADGE_COLORS[0];
                                    const badgeBg = isDark ? palette.dark : palette.light;
                                    const badgeText = palette.text;
                                    return (
                                        <View
                                            key={tag}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                backgroundColor: sectionBg,
                                                padding: 16,
                                                borderRadius: 16,
                                                borderWidth: 1,
                                                borderColor: cardBorder,
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View
                                                    style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: 14,
                                                        backgroundColor: badgeBg,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: 12,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 13, fontWeight: '800', color: badgeText }}>#{index + 1}</Text>
                                                </View>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{tag}</Text>
                                            </View>
                                            <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: cardBorder }}>
                                                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSubtle }}>{count}x</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ) : null}
                </View>
            </View>
        </MotiView>
    );
};

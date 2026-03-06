import React from 'react';
import { Text, View } from 'react-native';
import { MotiView } from 'moti';
import { Activity, Gauge, Tag } from 'lucide-react-native';
import { getEmotionByScore, getEmotionLabel } from '../../constants/emotions';
import { formatMoodScore, normalizeMoodToTen } from '../../utils/checkinMood';
import i18n from '../../utils/i18n';

export const CheckinCard = React.memo(({ checkin, formatTime }: { checkin: any, formatTime: (c: any) => string }) => {
    const activeEmotion = getEmotionByScore(normalizeMoodToTen(checkin.mood));

    return (
        <MotiView
            from={{ opacity: 0, translateY: 10, scale: 0.98 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            style={{ marginBottom: 20 }}
        >
            <View
                style={{
                    backgroundColor: 'white',
                    borderRadius: 24,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: 'rgba(231, 224, 212, 0.9)',
                    shadowColor: '#182428',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.04,
                    shadowRadius: 28,
                    elevation: 3,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: checkin.note ? 16 : 8, gap: 12 }}>
                    <View style={{ flex: 1, gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: `${activeEmotion.color}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: `${activeEmotion.color}20` }}>
                            <Text style={{ fontSize: 16, marginRight: 6 }}>{activeEmotion.emoji}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: activeEmotion.color }}>
                                {getEmotionLabel(activeEmotion, i18n.locale)}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#EEF4F3', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                            <Gauge size={12} color="#2D666B" />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#2D666B', marginLeft: 6 }}>
                                Stimmung {formatMoodScore(checkin.mood)}
                            </Text>
                        </View>
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B938E', marginTop: 2 }}>{formatTime(checkin)}</Text>
                </View>

                {checkin.note && checkin.note.trim().length > 0 && (
                    <Text style={{ fontSize: 18, color: '#1F2528', lineHeight: 28, fontWeight: '500', marginBottom: 16 }}>
                        {checkin.note}
                    </Text>
                )}

                {(checkin.energy !== undefined || checkin.tags?.length > 0 || checkin.duration) && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F5F1EA' }}>
                        {checkin.energy !== undefined && checkin.energy !== null && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF3EE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                                <Activity size={12} color="#788E76" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#788E76', marginLeft: 6 }}>
                                    Energie {checkin.energy}/10
                                </Text>
                            </View>
                        )}

                        {checkin.duration !== undefined && checkin.duration !== null && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F1EA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                                <Activity size={12} color="#6F7472" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#6F7472', marginLeft: 6 }}>
                                    {checkin.duration} Min
                                </Text>
                            </View>
                        )}

                        {checkin.tags?.map((tag: string, idx: number) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3EEE6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                                <Tag size={12} color="#6F7472" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#5E655F', marginLeft: 4 }}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {(!checkin.note || checkin.note.trim().length === 0) && (!checkin.tags || checkin.tags.length === 0) && (checkin.duration === undefined || checkin.duration === null) && checkin.energy === undefined && (
                    <Text style={{ fontSize: 14, color: '#8B938E', fontStyle: 'italic', marginTop: 8 }}>
                        Nur Stimmung protokolliert.
                    </Text>
                )}
            </View>
        </MotiView>
    );
});


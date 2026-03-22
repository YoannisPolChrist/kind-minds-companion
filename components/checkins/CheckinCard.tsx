import React from 'react';
import { View, Text } from 'react-native';
import { MotiView } from 'moti';
import { Clock, Activity, Tag } from 'lucide-react-native';
import i18n from '../../utils/i18n';
import { getEmotionByScore, getEmotionLabel } from '../../constants/emotions';

export const CheckinCard = React.memo(({ checkin, formatTime }: { checkin: any, formatTime: (c: any) => string }) => {
    const activeEmotion = getEmotionByScore(checkin.mood);

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
                    borderColor: 'rgba(226, 232, 240, 0.6)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.04,
                    shadowRadius: 28,
                    elevation: 3
                }}
            >
                {/* Header Row: Mood and Time */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: checkin.note ? 16 : 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${activeEmotion.color}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: `${activeEmotion.color}20` }}>
                        <Text style={{ fontSize: 16, marginRight: 6 }}>{activeEmotion.emoji}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: activeEmotion.color }}>
                            {getEmotionLabel(activeEmotion, i18n.locale)}
                        </Text>
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8' }}>{formatTime(checkin)}</Text>
                </View>

                {/* Primary Content: The textual Note */}
                {checkin.note && checkin.note.trim().length > 0 && (
                    <Text style={{ fontSize: 18, color: '#0F172A', lineHeight: 28, fontWeight: '500', marginBottom: 16 }}>
                        {checkin.note}
                    </Text>
                )}

                {/* Tags & Metadata Row */}
                {(checkin.tags?.length > 0 || checkin.duration) && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F8FAFC' }}>
                        {checkin.duration !== undefined && checkin.duration !== null && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                                <Activity size={12} color="#64748B" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginLeft: 6 }}>
                                    {checkin.duration} {checkin.duration === 1 ? 'Min' : 'Min'}
                                </Text>
                            </View>
                        )}

                        {checkin.tags?.map((tag: string, idx: number) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                                <Tag size={12} color="#64748B" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginLeft: 4 }}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Empty State when only mood is logged */}
                {(!checkin.note || checkin.note.trim().length === 0) && (!checkin.tags || checkin.tags.length === 0) && (checkin.duration === undefined || checkin.duration === null) && (
                    <Text style={{ fontSize: 14, color: '#94A3B8', fontStyle: 'italic', marginTop: 8 }}>
                        Nur Stimmung protokolliert.
                    </Text>
                )}
            </View>
        </MotiView>
    );
});

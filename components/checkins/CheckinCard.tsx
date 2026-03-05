import React from 'react';
import { View, Text } from 'react-native';
import { MotiView } from 'moti';
import { Clock, Activity, Tag } from 'lucide-react-native';

export const MOOD_COLORS = {
    1: '#EF4444', // Red - Bad
    2: '#F97316', // Orange - Poor
    3: '#FBBF24', // Yellow - Neutral
    4: '#34D399', // Green - Good
    5: '#10B981'  // Dark Green - Great
};

export const MOOD_EMOJIS = {
    1: '😫',
    2: '🙁',
    3: '😐',
    4: '🙂',
    5: '😁'
};

export const MOOD_LABELS = {
    1: 'Sehr schlecht',
    2: 'Schlecht',
    3: 'Neutral',
    4: 'Gut',
    5: 'Sehr gut'
};

export const CheckinCard = React.memo(({ checkin, formatTime }: { checkin: any, formatTime: (c: any) => string }) => {
    return (
        <MotiView
            from={{ opacity: 0, translateX: -12, scale: 0.98 }}
            animate={{ opacity: 1, translateX: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 120 }}
            style={{ marginBottom: 20, position: 'relative' }}
        >
            {/* Timeline dot */}
            <View style={{ position: 'absolute', left: -24, top: 24, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#F9F8F6', zIndex: 10 }} />

            <View
                style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 16, elevation: 3 }}
            >
                {/* Top row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                            <Clock size={13} color="#10B981" />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981', marginLeft: 5 }}>{formatTime(checkin)}</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                        <Text style={{ fontSize: 18, marginRight: 6 }}>{MOOD_EMOJIS[checkin.mood as keyof typeof MOOD_EMOJIS] || '😐'}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: MOOD_COLORS[checkin.mood as keyof typeof MOOD_COLORS] || '#64748B' }}>
                            {checkin.mood}/5
                        </Text>
                    </View>
                </View>

                {/* Duration */}
                {checkin.duration !== undefined && checkin.duration !== null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#F8FAFC', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' }}>
                        <Activity size={16} color="#64748B" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#334155', marginLeft: 8 }}>
                            Dauer: {checkin.duration} {checkin.duration === 1 ? 'Minute' : 'Minuten'}
                        </Text>
                    </View>
                )}

                {/* Tags */}
                {checkin.tags && checkin.tags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        {checkin.tags.map((tag: string, idx: number) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                                <Tag size={12} color="#64748B" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginLeft: 4 }}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Notes */}
                {checkin.note && checkin.note.trim().length > 0 && (
                    <View style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#10B981' }}>
                        <Text style={{ fontSize: 15, color: '#334155', lineHeight: 22, fontWeight: '500' }}>
                            {checkin.note}
                        </Text>
                    </View>
                )}

                {/* Empty State when only mood is logged */}
                {(!checkin.note || checkin.note.trim().length === 0) && (!checkin.tags || checkin.tags.length === 0) && (checkin.duration === undefined || checkin.duration === null) && (
                    <Text style={{ fontSize: 14, color: '#94A3B8', fontStyle: 'italic' }}>
                        Nur Stimmung protokolliert.
                    </Text>
                )}
            </View>
        </MotiView>
    );
});

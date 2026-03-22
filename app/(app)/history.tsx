import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import i18n from '../../utils/i18n';
import { useLanguage } from '../../contexts/LanguageContext';
import { useHistoryFeed } from '../../hooks/useHistoryFeed';
import { formatHistoryDate, formatHistoryWeekLabel, HistoryFlatEntry } from '../../modules/history';

export default function HistoryScreen() {
    const { profile } = useAuth();
    const router = useRouter();
    const { locale } = useLanguage();
    const { entries, flatEntries, loading } = useHistoryFeed(profile?.id);

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <View style={{ backgroundColor: '#2C3E50', paddingTop: 60, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
                <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 16 }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>&larr; {i18n.t('exercise.back')}</Text>
                </TouchableOpacity>
                <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{i18n.t('history.title')}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
                    {i18n.t('history.subtitle', { count: entries.length })}
                </Text>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#2C3E50" />
                </View>
            ) : entries.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <Text style={{ fontSize: 48, marginBottom: 16 }}>🌱</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' }}>{i18n.t('history.empty_title')}</Text>
                    <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 }}>
                        {i18n.t('history.empty_desc')}
                    </Text>
                </View>
            ) : (
                <View style={{ flex: 1, minHeight: 200 }}>
                    <FlashList<HistoryFlatEntry>
                        data={flatEntries}
                        estimatedItemSize={120}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                        renderItem={({ item, index }) => {
                            if ('isHeader' in item && item.isHeader) {
                                return (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: index > 0 ? 24 : 0, gap: 8 }}>
                                        <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {formatHistoryWeekLabel(item.weekStart, locale)}
                                        </Text>
                                        <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                                    </View>
                                );
                            }

                            if (item.isCheckin) {
                                const emoji = { great: '😄', good: '🙂', okay: '😐', bad: '😔', terrible: '😫' }[item.mood as unknown as string] || '😐';

                                return (
                                    <View style={{ flexDirection: 'row', marginBottom: 12, gap: 12 }}>
                                        <View style={{ alignItems: 'center', width: 24 }}>
                                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#3B82F6', borderWidth: 2, borderColor: '#fff', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 4, marginTop: 4 }} />
                                            <View style={{ width: 2, flex: 1, backgroundColor: '#DBEAFE', marginTop: 4 }} />
                                        </View>
                                        <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#DBEAFE', padding: 14, marginBottom: 2 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <View style={{ flex: 1, marginRight: 8 }}>
                                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 }}>Check-in</Text>
                                                    <Text style={{ fontSize: 12, color: '#6B7280' }}>
                                                        {formatHistoryDate(item.date, locale)}
                                                    </Text>
                                                </View>
                                                <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                            </View>
                                            {item.tags && item.tags.length > 0 && (
                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                                                    {item.tags.map((tag: string) => (
                                                        <View key={tag} style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                                            <Text style={{ fontSize: 10, color: '#4B5563', fontWeight: '600' }}>{tag}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                            {item.note ? (
                                                <Text style={{ fontSize: 13, color: '#374151', marginTop: 8, fontStyle: 'italic' }}>"{item.note}"</Text>
                                            ) : null}
                                        </View>
                                    </View>
                                );
                            }

                            return (
                                <TouchableOpacity onPress={() => router.push(`/(app)/exercise/${item.id}` as any)} style={{ flexDirection: 'row', marginBottom: 12, gap: 12 }}>
                                    <View style={{ alignItems: 'center', width: 24 }}>
                                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff', shadowColor: '#10B981', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 4, marginTop: 4 }} />
                                        <View style={{ width: 2, flex: 1, backgroundColor: '#D1FAE5', marginTop: 4 }} />
                                    </View>

                                    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#D1FAE5', padding: 14, marginBottom: 2 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 }}>{item.title}</Text>
                                                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                                                    {i18n.t('history.modules', { count: item.blocks?.length ?? 0 })} · {formatHistoryDate((item.lastCompletedAt || item.createdAt) as string, locale)}
                                                </Text>
                                            </View>
                                            <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                                                <Text style={{ color: '#065F46', fontWeight: '700', fontSize: 12 }}>{i18n.t('history.done')}</Text>
                                            </View>
                                        </View>

                                        {item.completed && item.sharedAnswers === false ? (
                                            <View style={{ marginTop: 10, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center' }}>
                                                <Lock size={12} color="#9CA3AF" style={{ marginRight: 6 }} />
                                                <Text style={{ fontSize: 11, color: '#6B7280', flex: 1 }}>Private Antwort</Text>
                                            </View>
                                        ) : (
                                            item.answers && Object.keys(item.answers).length > 0 && (
                                                <View style={{ marginTop: 10, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#F3F4F6' }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{i18n.t('history.answers')}</Text>
                                                    {Object.values(item.answers).slice(0, 2).map((answer, answerIndex) => (
                                                        <Text key={answerIndex} numberOfLines={1} style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}>
                                                            · {String(answer)}
                                                        </Text>
                                                    ))}
                                                    {Object.keys(item.answers).length > 2 && (
                                                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{i18n.t('history.more', { count: Object.keys(item.answers).length - 2 })}</Text>
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

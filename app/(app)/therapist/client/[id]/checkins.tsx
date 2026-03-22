import React from 'react';
import { ActivityIndicator, SectionList, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Activity, Calendar } from 'lucide-react-native';
import i18n from '../../../../../utils/i18n';
import { useSafeBack } from '../../../../../hooks/useSafeBack';
import { CheckinCard } from '../../../../../components/checkins/CheckinCard';
import { CheckinAnalytics } from '../../../../../components/checkins/CheckinAnalytics';
import { TherapistClientScreenHeader } from '../../../../../components/therapist/client/TherapistClientScreenHeader';
import { useClientCheckins } from '../../../../../hooks/therapist/useClientCheckins';

export default function TherapistClientCheckinsScreen() {
  const goBack = useSafeBack();
  const { id } = useLocalSearchParams();
  const { checkins, sections, loading, formatTime } = useClientCheckins(
    typeof id === 'string' ? id : id?.[0],
    i18n.locale || 'de'
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F3EE' }}>
      <TherapistClientScreenHeader
        clientId={id as string}
        title="Check-ins"
        subtitle="Stimmung, Verlauf und Muster auf einen Blick."
        onBack={goBack}
        seedSuffix="checkins"
        stats={[
          {
            key: 'count',
            label: 'Eintraege',
            value: checkins.length,
          },
        ]}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#137386" />
        </View>
      ) : checkins.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 }}>
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: 'white',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 28,
                borderWidth: 2,
                borderColor: '#F1F5F9',
              }}
            >
              <Activity size={48} color="#94A3B8" />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, marginBottom: 12, textAlign: 'center' }}>
              Keine Check-ins
            </Text>
            <Text style={{ fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24, maxWidth: 320, fontWeight: '500' }}>
              Der Klient hat bisher noch keinen Check-in durchgefuehrt.
            </Text>
          </View>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24, paddingBottom: 120, maxWidth: 860, alignSelf: 'center', width: '100%' }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<CheckinAnalytics checkins={checkins} />}
          renderSectionHeader={({ section: { title } }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#E8E6E1',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                }}
              >
                <Calendar size={14} color="#10B981" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#243842', marginLeft: 6 }}>{title}</Text>
              </View>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E8E6E1', marginLeft: 12 }} />
            </View>
          )}
          renderItem={({ item }) => (
            <View style={{ paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: '#E8E6E1' }}>
              <CheckinCard checkin={item} formatTime={formatTime} />
            </View>
          )}
          renderSectionFooter={() => <View style={{ marginBottom: 32 }} />}
        />
      )}
    </View>
  );
}

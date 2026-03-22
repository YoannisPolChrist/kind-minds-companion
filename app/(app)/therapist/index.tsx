import { Platform, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { ArrowRight, Settings } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { PressableScale } from '../../../components/ui/PressableScale';

const HERO_IMAGE = require('../../../assets/HomeUi3.webp');

const AREAS = [
  {
    key: 'clients',
    title: 'Klienten',
    description: 'Begleitung, Fortschritt und direkte Eintraege.',
    image: require('../../../assets/HomeUi2.webp'),
  },
  {
    key: 'templates',
    title: 'Vorlagen',
    description: 'Uebungen erstellen und schnell zuweisen.',
    image: require('../../../assets/HomeUi4.webp'),
  },
  {
    key: 'resources',
    title: 'Bibliothek',
    description: 'Dateien, Links und Materialien zentral halten.',
    image: require('../../../assets/HomeUi6.webp'),
  },
] as const;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

export default function TherapistDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1100;
  const isTablet = width >= 720;
  const sidePadding = width < 420 ? 16 : width < 900 ? 20 : 28;
  const maxWidth = 1180;

  const navigateTo = (key: string) => {
    if (key === 'clients') {
      router.push('/(app)/therapist/clients' as any);
      return;
    }

    if (key === 'templates') {
      router.push('/(app)/therapist/templates' as any);
      return;
    }

    router.push('/(app)/therapist/resources' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F3EEE6' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            overflow: 'hidden',
            borderBottomLeftRadius: isTablet ? 46 : 34,
            borderBottomRightRadius: isTablet ? 46 : 34,
            backgroundColor: '#12303B',
            marginBottom: 20,
          }}
        >
          <Image source={HERO_IMAGE} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
          <LinearGradient
            colors={['rgba(9, 21, 28, 0.36)', 'rgba(15, 37, 46, 0.9)']}
            style={{ position: 'absolute', inset: 0 }}
          />

          <View
            style={{
              maxWidth,
              width: '100%',
              alignSelf: 'center',
              paddingHorizontal: sidePadding,
              paddingTop: Platform.OS === 'android' ? 58 : 72,
              paddingBottom: isTablet ? 36 : 28,
            }}
          >
            <MotiView
              from={{ opacity: 0, translateY: -10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 280 }}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.72)',
                    fontSize: 12,
                    fontWeight: '800',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}
                >
                  {getGreeting()}
                </Text>
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: width < 420 ? 31 : isTablet ? 42 : 36,
                    fontWeight: '900',
                    letterSpacing: -1.2,
                  }}
                >
                  {profile?.firstName || 'Therapeut'}
                </Text>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.84)',
                    fontSize: 15,
                    fontWeight: '600',
                    lineHeight: 22,
                    marginTop: 10,
                    maxWidth: 560,
                  }}
                >
                  Waehle einen Bereich fuer die Klientenbegleitung. Die drei wichtigsten Zugaenge
                  sind direkt hier auf der ersten Seite.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(app)/settings' as any)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.9}
              >
                <Settings size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 320, delay: 90 }}
              style={{
                marginTop: 22,
                alignSelf: 'flex-start',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.14)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.18)',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '800',
                  letterSpacing: 1.1,
                  textTransform: 'uppercase',
                }}
              >
                Therapeuten-Dashboard
              </Text>
            </MotiView>
          </View>
        </View>

        <View
          style={{
            maxWidth,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: sidePadding,
          }}
        >
          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              gap: 16,
            }}
          >
            {AREAS.map((area, index) => (
              <MotiView
                key={area.key}
                from={{ opacity: 0, translateY: 20, scale: 0.98 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{ type: 'timing', duration: 320, delay: 120 + index * 70 }}
                style={{ flex: isDesktop ? 1 : undefined }}
              >
                <PressableScale onPress={() => navigateTo(area.key)}>
                  <View
                    style={{
                      minHeight: isDesktop ? 380 : isTablet ? 300 : 250,
                      borderRadius: 32,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: 'rgba(16, 33, 42, 0.08)',
                      backgroundColor: '#D8D7D1',
                      shadowColor: '#12303B',
                      shadowOffset: { width: 0, height: 12 },
                      shadowOpacity: 0.12,
                      shadowRadius: 28,
                      elevation: 5,
                    }}
                  >
                    <Image source={area.image} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
                    <LinearGradient
                      colors={['rgba(15, 34, 44, 0.06)', 'rgba(15, 34, 44, 0.3)', 'rgba(15, 34, 44, 0.92)']}
                      locations={[0, 0.45, 1]}
                      style={{ position: 'absolute', inset: 0 }}
                    />

                    <View
                      style={{
                        flex: 1,
                        justifyContent: 'flex-end',
                        paddingHorizontal: 24,
                        paddingVertical: 24,
                      }}
                    >
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.72)',
                          fontSize: 12,
                          fontWeight: '800',
                          letterSpacing: 1.3,
                          textTransform: 'uppercase',
                          marginBottom: 8,
                        }}
                      >
                        Bereich
                      </Text>
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontSize: isTablet ? 34 : 30,
                          fontWeight: '900',
                          letterSpacing: -1,
                        }}
                      >
                        {area.title}
                      </Text>
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.84)',
                          fontSize: 14,
                          fontWeight: '600',
                          lineHeight: 20,
                          marginTop: 8,
                          maxWidth: 320,
                        }}
                      >
                        {area.description}
                      </Text>
                      <View
                        style={{
                          marginTop: 18,
                          alignSelf: 'flex-start',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          paddingHorizontal: 14,
                          paddingVertical: 9,
                          borderRadius: 999,
                          backgroundColor: 'rgba(255,255,255,0.12)',
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.15)',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Oeffnen</Text>
                        <ArrowRight size={14} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </PressableScale>
              </MotiView>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

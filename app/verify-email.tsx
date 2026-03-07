import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { MotiView } from 'moti';
import { CheckCircle2, MailCheck, TriangleAlert } from 'lucide-react-native';
import { PressableScale } from '../components/ui/PressableScale';
import { auth } from '../utils/firebase';

type VerifyState = 'loading' | 'success' | 'error';

export default function VerifyEmailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ oobCode?: string; email?: string }>();
    const [state, setState] = useState<VerifyState>('loading');
    const [message, setMessage] = useState('Wir bestaetigen gerade deine E-Mail-Adresse.');

    const email = useMemo(() => {
        if (typeof params.email !== 'string') {
            return '';
        }
        return params.email;
    }, [params.email]);

    useEffect(() => {
        const oobCode = typeof params.oobCode === 'string' ? params.oobCode : '';

        if (!oobCode) {
            setState('error');
            setMessage('Der Bestaetigungslink ist unvollstaendig. Bitte fordere eine neue E-Mail an.');
            return;
        }

        let cancelled = false;

        const run = async () => {
            try {
                await checkActionCode(auth, oobCode);
                await applyActionCode(auth, oobCode);

                if (!cancelled) {
                    setState('success');
                    setMessage('Deine E-Mail-Adresse wurde erfolgreich bestaetigt. Du kannst dich jetzt anmelden.');
                }
            } catch (error) {
                if (!cancelled) {
                    setState('error');
                    setMessage('Der Link ist abgelaufen oder wurde bereits verwendet. Bitte fordere eine neue Bestaetigungs-Mail an.');
                }
            }
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [params.oobCode]);

    return (
        <View style={{ flex: 1, backgroundColor: '#F1ECE3', justifyContent: 'center', padding: 24 }}>
            <View style={{ position: 'absolute', top: -120, right: -60, width: 280, height: 280, borderRadius: 999, backgroundColor: 'rgba(45,102,107,0.08)' }} />
            <View style={{ position: 'absolute', bottom: -120, left: -80, width: 320, height: 320, borderRadius: 999, backgroundColor: 'rgba(176,140,87,0.12)' }} />

            <MotiView
                from={{ opacity: 0, translateY: 24, scale: 0.96 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 90 }}
                style={{
                    width: '100%',
                    maxWidth: 540,
                    alignSelf: 'center',
                    backgroundColor: 'rgba(255,255,255,0.92)',
                    borderRadius: 32,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.8)',
                    overflow: 'hidden',
                    shadowColor: '#1F2528',
                    shadowOffset: { width: 0, height: 16 },
                    shadowOpacity: 0.08,
                    shadowRadius: 36,
                    elevation: 8,
                }}
            >
                <View
                    style={{
                        paddingHorizontal: 28,
                        paddingTop: 32,
                        paddingBottom: 28,
                        backgroundColor: '#183035',
                    }}
                >
                    <Image
                        source={require('../assets/logo-transparent.png')}
                        style={{ width: 180, height: 56, resizeMode: 'contain', marginBottom: 22 }}
                    />
                    <Text style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 10 }}>
                        Konto aktivieren
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', lineHeight: 36 }}>
                        E-Mail bestaetigen
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.76)', fontSize: 15, lineHeight: 24, marginTop: 10 }}>
                        Ein letzter Schritt, dann ist dein Zugang bereit.
                    </Text>
                </View>

                <View style={{ padding: 28 }}>
                    <View
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: 36,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 18,
                            backgroundColor:
                                state === 'success'
                                    ? 'rgba(120,142,118,0.14)'
                                    : state === 'error'
                                        ? 'rgba(239,68,68,0.12)'
                                        : 'rgba(45,102,107,0.12)',
                        }}
                    >
                        {state === 'loading' ? (
                            <ActivityIndicator color="#2D666B" />
                        ) : state === 'success' ? (
                            <CheckCircle2 size={32} color="#788E76" />
                        ) : (
                            <TriangleAlert size={32} color="#DC2626" />
                        )}
                    </View>

                    <Text style={{ color: '#1F2528', fontSize: 24, fontWeight: '900', marginBottom: 10 }}>
                        {state === 'loading' ? 'Wir pruefen deinen Link' : state === 'success' ? 'Alles bereit' : 'Link nicht mehr gueltig'}
                    </Text>

                    <Text style={{ color: '#5E655F', fontSize: 15, lineHeight: 24, marginBottom: 18 }}>
                        {message}
                    </Text>

                    {email ? (
                        <View
                            style={{
                                backgroundColor: '#F7F4EE',
                                borderRadius: 18,
                                borderWidth: 1,
                                borderColor: '#E7E0D4',
                                padding: 18,
                                marginBottom: 22,
                            }}
                        >
                            <Text style={{ color: '#8B938E', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 }}>
                                Adresse
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <MailCheck size={18} color="#2D666B" />
                                <Text style={{ color: '#1F2528', fontSize: 15, fontWeight: '700', flex: 1 }}>
                                    {email}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    <View style={{ gap: 12 }}>
                        <PressableScale
                            intensity="medium"
                            onPress={() => router.replace('/(auth)/login')}
                            style={{
                                backgroundColor: '#2D666B',
                                paddingVertical: 16,
                                borderRadius: 18,
                                alignItems: 'center',
                                shadowColor: '#2D666B',
                                shadowOffset: { width: 0, height: 10 },
                                shadowOpacity: 0.22,
                                shadowRadius: 20,
                                elevation: 5,
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900' }}>
                                Zur Anmeldung
                            </Text>
                        </PressableScale>

                        <PressableScale
                            intensity="subtle"
                            onPress={() => router.replace('/(auth)/login')}
                            style={{
                                backgroundColor: '#F7F4EE',
                                borderRadius: 18,
                                borderWidth: 1,
                                borderColor: '#E7E0D4',
                                paddingVertical: 15,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#5E655F', fontSize: 14, fontWeight: '700' }}>
                                Neue Bestaetigungs-Mail anfordern
                            </Text>
                        </PressableScale>
                    </View>
                </View>
            </MotiView>
        </View>
    );
}

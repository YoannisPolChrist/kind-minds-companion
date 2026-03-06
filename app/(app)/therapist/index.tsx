import { View, Text, ActivityIndicator, FlatList, Linking, Platform, TextInput, Modal, useWindowDimensions } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import { BlurView } from 'expo-blur';
import { ClientService } from '../../../services/clientService';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import i18n from '../../../utils/i18n';
import { Skeleton } from '../../../components/ui/Skeleton';
import { FileText, Library, MessageCircle, FolderOpen, Smile, TrendingUp, Search, Plus, Moon, Sun, Trash2, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AddClientModal from '../../../components/therapist/AddClientModal';
import { useTheme } from '../../../contexts/ThemeContext';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { PressableScale } from '../../../components/ui/PressableScale';
import { TherapistMetricCard } from '../../../components/therapist/TherapistMetricCard';
import { isHighMood, isLowMood, normalizeMoodToHundred } from '../../../utils/checkinMood';

const HOME_BACKGROUNDS = [
    require('../../../assets/HomeUi1.webp'),
    require('../../../assets/HomeUi2.webp'),
    require('../../../assets/HomeUi3.webp'),
    require('../../../assets/HomeUi4.webp'),
    require('../../../assets/HomeUi5.webp'),
    require('../../../assets/HomeUi6.webp'),
];

type ClientFilter = 'all' | 'attention' | 'engaged';

const FILTER_LABELS: Record<ClientFilter, string> = {
    all: 'Alle',
    attention: 'Aufmerksam',
    engaged: 'Aktiv',
};

const getCompletionRate = (client: any) => {
    const value = Number(client?.completionRate ?? 0);
    return Number.isFinite(value) ? value : 0;
};

const getMoodValue = (client: any) => {
    const value = Number(client?.latestMood);
    return Number.isFinite(value) ? normalizeMoodToHundred(value) : null;
};

const getClientSegment = (client: any): Exclude<ClientFilter, 'all'> | 'steady' => {
    const completionRate = getCompletionRate(client);
    const moodValue = getMoodValue(client);

    if (completionRate < 50 || (moodValue !== null && isLowMood(moodValue))) {
        return 'attention';
    }

    if (completionRate >= 70 || (moodValue !== null && isHighMood(moodValue))) {
        return 'engaged';
    }

    return 'steady';
};

const getClientStatusMeta = (client: any) => {
    const segment = getClientSegment(client);

    if (segment === 'attention') {
        return { label: 'Aufmerksam', variant: 'warning' as const };
    }

    if (segment === 'engaged') {
        return { label: 'Aktiv', variant: 'success' as const };
    }

    return { label: 'Stabil', variant: 'muted' as const };
};

export default function TherapistDashboard() {
    const { profile, signOut } = useAuth();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<ClientFilter>('all');
    const [isAddClientModalVisible, setIsAddClientModalVisible] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<any>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const router = useRouter();
    const { isDark, colors, setTheme } = useTheme();
    const searchInputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const handleKeyDown = (e: any) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }

            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                setIsAddClientModalVisible(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const { width: screenWidth } = useWindowDimensions();
    const isTablet = screenWidth > 768;
    const isDesktop = screenWidth > 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;
    const randomBg = useMemo(() => HOME_BACKGROUNDS[Math.floor(Math.random() * HOME_BACKGROUNDS.length)], []);

    useEffect(() => {
        if (profile?.id) {
            fetchClients();
        }
    }, [profile?.id]);

    const fetchClients = async () => {
        if (!profile?.id) return;

        try {
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'client'),
                where('therapistId', '==', profile.id)
            );
            const querySnapshot = await getDocs(q);
            const activeDocs = querySnapshot.docs.filter(docSnap => !docSnap.data().isArchived);

            const clientData = await Promise.all(
                activeDocs.map(async docSnap => {
                    const client = { id: docSnap.id, ...docSnap.data() } as any;

                    try {
                        const [checksRes, exRes] = await Promise.all([
                            getDocs(query(
                                collection(db, 'checkins'),
                                where('uid', '==', docSnap.id),
                                orderBy('date', 'desc'),
                                limit(10)
                            )),
                            getDocs(query(collection(db, 'exercises'), where('clientId', '==', docSnap.id))),
                        ]);

                        const checkins = checksRes.docs.map(d => d.data());
                        if (checkins.length > 0) {
                            checkins.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                            client.latestMood = checkins[0].mood;
                        }

                        const totalEx = exRes.size;
                        const completedEx = exRes.docs.filter(d => d.data().completed).length;
                        client.completionRate = totalEx > 0 ? Math.round((completedEx / totalEx) * 100) : 0;
                    } catch (e) {
                        console.warn(`Failed fetching stats for client ${docSnap.id}`, e);
                    }

                    return client;
                })
            );

            setClients(clientData);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const notifyClient = async (clientData: any) => {
        try {
            const phoneNumber = clientData.phone || '';
            const message = i18n.t('therapist.whatsapp_msg', { name: clientData.firstName });
            const url = `whatsapp://send?text=${encodeURIComponent(message)}` + (phoneNumber ? `&phone=${phoneNumber}` : '');

            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                await Linking.openURL(webUrl);
            }
        } catch (error) {
            console.warn('Could not open WhatsApp', error);
        }
    };

    const dashboardStats = useMemo(() => {
        const totalClients = clients.length;
        const attentionCount = clients.filter(client => getClientSegment(client) === 'attention').length;
        const engagedCount = clients.filter(client => getClientSegment(client) === 'engaged').length;
        const avgCompletion = totalClients
            ? Math.round(clients.reduce((sum, client) => sum + getCompletionRate(client), 0) / totalClients)
            : 0;

        return {
            totalClients,
            attentionCount,
            engagedCount,
            avgCompletion,
        };
    }, [clients]);

    const filteredClients = useMemo(() => {
        const queryText = searchQuery.trim().toLowerCase();

        return clients
            .filter(client => {
                if (!queryText) return true;
                const haystack = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
                return haystack.includes(queryText);
            })
            .filter(client => {
                if (activeFilter === 'all') return true;
                return getClientSegment(client) === activeFilter;
            });
    }, [clients, searchQuery, activeFilter]);

    const filterCounts = useMemo(
        () => ({
            all: clients.length,
            attention: clients.filter(client => getClientSegment(client) === 'attention').length,
            engaged: clients.filter(client => getClientSegment(client) === 'engaged').length,
        }),
        [clients]
    );

    const handleNotify = async (clientData: any) => {
        if (Platform.OS !== 'web') {
            const Haptics = await import('expo-haptics');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        notifyClient(clientData);
    };

    const handleOpenRecord = async (clientId: string) => {
        if (Platform.OS !== 'web') {
            const Haptics = await import('expo-haptics');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        router.push(`/(app)/therapist/client/${clientId}` as any);
    };

    const handleDeleteClient = (client: any) => {
        setClientToDelete(client);
    };

    const confirmDeleteClient = async () => {
        if (!clientToDelete) return;
        setDeleteLoading(true);
        try {
            await ClientService.deleteClient(clientToDelete.id);
            setClients(prev => prev.filter(client => client.id !== clientToDelete.id));
        } catch {
            // Keep current behavior: modal closes and user can retry later.
        } finally {
            setDeleteLoading(false);
            setClientToDelete(null);
        }
    };

    const renderClientItem = ({ item, index }: { item: any; index: number }) => {
        const completionRate = getCompletionRate(item);
        const moodValue = getMoodValue(item);
        const status = getClientStatusMeta(item);

        return (
            <MotiView
                from={{ opacity: 0, translateY: 30, scale: 0.97 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{ type: 'timing', duration: 320, delay: Math.min((index % 10) * 50, 400) }}
                className={`mb-4 ${numColumns > 1 ? 'flex-1 max-w-[500px]' : 'w-full'}`}
            >
                <Card
                    variant="elevated"
                    padding="lg"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                        shadowColor: isDark ? '#000' : '#182428',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: isDark ? 0.18 : 0.05,
                        shadowRadius: 28,
                        elevation: 4,
                    }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', flex: 1, paddingRight: 12, alignItems: 'center' }}>
                            <LinearGradient
                                colors={['#4E7E82', '#2D666B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{ width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}
                            >
                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 17 }}>
                                    {item.firstName?.charAt(0)}{item.lastName?.charAt(0)}
                                </Text>
                            </LinearGradient>

                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 8 }} numberOfLines={1}>
                                    {item.firstName} {item.lastName}
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {moodValue !== null ? (
                                        <Badge variant={isLowMood(moodValue) ? 'warning' : 'default'}>Stimmung {moodValue}/100</Badge>
                                    ) : (
                                        <Badge variant="muted">Keine Check-ins</Badge>
                                    )}
                                    <Badge variant={completionRate >= 70 ? 'success' : completionRate < 50 ? 'warning' : 'secondary'}>
                                        {completionRate}% erledigt
                                    </Badge>
                                </View>
                            </View>
                        </View>
                        <Badge variant={status.variant}>{status.label}</Badge>
                    </View>

                    <View style={{ marginBottom: 18 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                Therapie-Fortschritt
                            </Text>
                            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{completionRate}%</Text>
                        </View>
                        <View style={{ height: 8, borderRadius: 999, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EEF2F6', overflow: 'hidden' }}>
                            <View
                                style={{
                                    width: `${Math.max(6, completionRate)}%`,
                                    height: '100%',
                                    borderRadius: 999,
                                    backgroundColor: completionRate >= 70 ? colors.success : completionRate < 50 ? '#F59E0B' : colors.primary,
                                }}
                            />
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <PressableScale
                            style={{
                                backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.07)',
                                borderWidth: 1,
                                borderColor: 'rgba(239,68,68,0.18)',
                                width: 46,
                                height: 46,
                                borderRadius: 14,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onPress={() => handleDeleteClient(item)}
                            intensity="subtle"
                        >
                            <Trash2 size={17} color="#EF4444" strokeWidth={2.5} />
                        </PressableScale>
                        <PressableScale
                            style={{
                                flex: 1,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
                                paddingVertical: 13,
                                paddingHorizontal: 14,
                                borderRadius: 14,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 7,
                            }}
                            onPress={() => handleNotify(item)}
                            intensity="subtle"
                        >
                            <MessageCircle size={17} color={colors.text} strokeWidth={2.5} />
                            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>Nachricht</Text>
                        </PressableScale>
                        <PressableScale
                            style={{
                                flex: 1.2,
                                paddingVertical: 13,
                                paddingHorizontal: 14,
                                borderRadius: 14,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 7,
                                overflow: 'hidden',
                                position: 'relative',
                                shadowColor: '#2D666B',
                                shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: 0.25,
                                shadowRadius: 14,
                                elevation: 6,
                            }}
                            onPress={() => handleOpenRecord(item.id)}
                            intensity="bold"
                        >
                            <LinearGradient
                                colors={['#4E7E82', '#2D666B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                            />
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, zIndex: 10 }}>Akte öffnen</Text>
                            <FolderOpen size={16} color="#ffffff" strokeWidth={2.5} />
                        </PressableScale>
                    </View>
                </Card>
            </MotiView>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 bg-[#F7F4EE]">
                <View style={{ backgroundColor: '#1F2528', paddingTop: Platform.OS === 'android' ? 48 : 56, paddingBottom: 40, paddingHorizontal: 24, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}>
                    <Skeleton width={180} height={34} borderRadius={8} />
                    <Skeleton width={140} height={16} borderRadius={4} style={{ marginTop: 12 }} />
                </View>
                <View style={{ paddingTop: 32, paddingHorizontal: 32 }}>
                    <View className="flex-col gap-6">
                        {[1, 2, 3].map(i => (
                            <View key={i} className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100/50 w-full" style={{ shadowColor: '#1F2528', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 24, elevation: 2 }}>
                                <View className="flex-row justify-between items-start mb-6">
                                    <View className="flex-1 pr-4">
                                        <Skeleton width={180} height={24} borderRadius={8} style={{ marginBottom: 12 }} />
                                        <View className="flex-row gap-2 mt-2">
                                            <Skeleton width={100} height={28} borderRadius={12} />
                                            <Skeleton width={90} height={28} borderRadius={12} />
                                        </View>
                                    </View>
                                    <Skeleton width={60} height={26} borderRadius={10} />
                                </View>
                                <View className="flex-row gap-4 mt-4 border-t border-gray-50 pt-5">
                                    <Skeleton width="48%" height={56} borderRadius={20} />
                                    <Skeleton width="48%" height={56} borderRadius={20} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        );
    }

    const listHeaderElement = (
        <View>
            <MotiView
                from={{ opacity: 0, translateY: -40 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 350, delay: 50 }}
                style={{
                    backgroundColor: colors.background,
                    paddingTop: Platform.OS === 'android' ? 84 : 100,
                    paddingBottom: 80,
                    paddingHorizontal: 24,
                    borderBottomLeftRadius: 40,
                    borderBottomRightRadius: 40,
                    overflow: 'hidden',
                    zIndex: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.16,
                    shadowRadius: 16,
                    elevation: 10,
                }}
            >
                <Image
                    source={randomBg}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={300}
                />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)' }} />

                <View style={{ zIndex: 10, width: '100%', maxWidth: 1120, alignSelf: 'center' }} pointerEvents="box-none">
                    <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={{ borderRadius: 36, overflow: 'hidden', padding: 24, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255,255,255,0.95)', marginBottom: 24 }}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <Image
                                source={require('../../../assets/logo-transparent.png')}
                                style={{ width: 280, height: 90, tintColor: isDark ? '#ffffff' : undefined }}
                                contentFit="contain"
                            />
                        </View>
                        <View style={{ flexDirection: screenWidth < 760 ? 'column' : 'row', justifyContent: 'space-between', alignItems: screenWidth < 760 ? 'flex-start' : 'center', gap: 16 }}>
                            <View>
                                <Text style={{ fontSize: 34, fontWeight: '900', color: colors.text, letterSpacing: -1, marginBottom: 2 }}>{i18n.t('therapist.cockpit')}</Text>
                                <Text style={{ color: colors.textSubtle, marginTop: 4, fontWeight: '600', fontSize: 14 }}>
                                    {i18n.t('therapist.welcome', { name: profile?.firstName || 'Therapeut' })}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <PressableScale
                                    onPress={() => setTheme(isDark ? 'light' : 'dark')}
                                    intensity="subtle"
                                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    {isDark ? <Sun color={colors.text} size={20} /> : <Moon color={colors.text} size={20} />}
                                </PressableScale>
                                <PressableScale
                                    onPress={signOut}
                                    intensity="subtle"
                                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 }}
                                >
                                    <Text style={{ color: colors.text, fontWeight: '700' }}>{i18n.t('therapist.logout')}</Text>
                                </PressableScale>
                            </View>
                        </View>
                    </BlurView>

                    <View style={{ flexDirection: screenWidth < 900 ? 'column' : 'row', gap: 16 }}>
                        <PressableScale onPress={() => router.push('/(app)/therapist/templates')}>
                            <Card
                                variant="elevated"
                                padding="lg"
                                style={{
                                    flex: 1,
                                    minHeight: 152,
                                    minWidth: screenWidth < 900 ? undefined : 0,
                                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255,255,255,0.95)',
                                }}
                            >
                                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(19,115,134,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <FileText size={22} color={colors.primary} strokeWidth={2.5} />
                                </View>
                                <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 4 }}>{i18n.t('therapist.templates')}</Text>
                                <Text style={{ color: colors.textSubtle, fontWeight: '600', fontSize: 13, lineHeight: 18 }}>
                                    Übungsvorlagen erstellen und verwalten
                                </Text>
                            </Card>
                        </PressableScale>

                        <PressableScale onPress={() => router.push('/(app)/therapist/resources')}>
                            <Card
                                variant="elevated"
                                padding="lg"
                                style={{
                                    flex: 1,
                                    minHeight: 152,
                                    minWidth: screenWidth < 900 ? undefined : 0,
                                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255,255,255,0.95)',
                                }}
                            >
                                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(192,157,89,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <Library size={22} color="#B08C57" strokeWidth={2.5} />
                                </View>
                                <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 4 }}>Bibliothek</Text>
                                <Text style={{ color: colors.textSubtle, fontWeight: '600', fontSize: 13, lineHeight: 18 }}>
                                    Gemeinsames Material und Dokumente
                                </Text>
                            </Card>
                        </PressableScale>
                    </View>
                </View>
            </MotiView>

            <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: numColumns === 1 ? 24 : 20, paddingTop: 28 }}>
                <View style={{ flexDirection: screenWidth < 1080 ? 'column' : 'row', gap: 16, marginBottom: 28 }}>
                    <TherapistMetricCard
                        icon={User}
                        label="Klienten gesamt"
                        value={String(dashboardStats.totalClients)}
                        hint={dashboardStats.totalClients === 1 ? 'Aktuell ist ein aktiver Klient verbunden.' : `Aktuell sind ${dashboardStats.totalClients} aktive Klienten verbunden.`}
                        tone="primary"
                    />
                    <TherapistMetricCard
                        icon={TrendingUp}
                        label="Durchschnitt"
                        value={`${dashboardStats.avgCompletion}%`}
                        hint="Mittlere Abschlussquote über alle zugewiesenen Übungen."
                        tone="success"
                    />
                    <TherapistMetricCard
                        icon={Smile}
                        label="Aufmerksam"
                        value={String(dashboardStats.attentionCount)}
                        hint={dashboardStats.attentionCount === 0 ? 'Derzeit fällt kein Client durch niedrige Aktivität auf.' : `${dashboardStats.attentionCount} Klienten brauchen wahrscheinlich zeitnahen Blick.`}
                        tone="warning"
                    />
                </View>

                <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300, delay: 150 }}>
                    <View style={{ flexDirection: screenWidth < 760 ? 'column' : 'row', alignItems: screenWidth < 760 ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
                        <View>
                            <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: -0.5 }}>{i18n.t('therapist.clients')}</Text>
                            <Text style={{ color: colors.textSubtle, fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                                {filteredClients.length} von {clients.length} sichtbar
                            </Text>
                        </View>
                        <Badge variant={dashboardStats.engagedCount > 0 ? 'success' : 'muted'}>
                            {dashboardStats.engagedCount} aktiv im Flow
                        </Badge>
                    </View>

                    <View style={{ flexDirection: screenWidth < 760 ? 'column' : 'row', gap: 12, marginBottom: 16 }}>
                        <Input
                            ref={searchInputRef}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={Platform.OS === 'web' ? 'Klienten suchen... (Cmd/Ctrl + K)' : 'Klienten suchen...'}
                            autoCapitalize="none"
                            leading={<Search size={18} color={colors.textSubtle} />}
                            containerStyle={{ flex: 1 }}
                        />
                        <PressableScale
                            onPress={() => setIsAddClientModalVisible(true)}
                            intensity="medium"
                            style={{
                                backgroundColor: colors.primary,
                                minHeight: 52,
                                paddingHorizontal: 18,
                                borderRadius: 18,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 8,
                                shadowColor: colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.25,
                                shadowRadius: 10,
                                elevation: 6,
                            }}
                        >
                            <Plus size={18} color="#FFF" />
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>
                                {Platform.OS === 'web' ? 'Neuer Klient (Cmd+N)' : 'Neuer Klient'}
                            </Text>
                        </PressableScale>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 36 }}>
                        {(['all', 'attention', 'engaged'] as ClientFilter[]).map(filter => {
                            const isActive = activeFilter === filter;

                            return (
                                <PressableScale
                                    key={filter}
                                    onPress={() => setActiveFilter(filter)}
                                    intensity="subtle"
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 8,
                                        borderRadius: 999,
                                        paddingVertical: 10,
                                        paddingHorizontal: 14,
                                        borderWidth: 1,
                                        borderColor: isActive ? colors.primary : colors.border,
                                        backgroundColor: isActive ? (isDark ? 'rgba(25,163,188,0.14)' : 'rgba(19,115,134,0.08)') : colors.card,
                                    }}
                                >
                                    <Text style={{ color: isActive ? colors.primary : colors.text, fontWeight: '800', fontSize: 13 }}>
                                        {FILTER_LABELS[filter]}
                                    </Text>
                                    <Badge variant={filter === 'attention' ? 'warning' : filter === 'engaged' ? 'success' : 'muted'}>
                                        {filterCounts[filter]}
                                    </Badge>
                                </PressableScale>
                            );
                        })}
                    </View>

                    {clients.length === 0 && (
                        <Card
                            variant="elevated"
                            padding="lg"
                            style={{
                                alignItems: 'center',
                                marginBottom: 24,
                                backgroundColor: colors.card,
                                borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                            }}
                        >
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7F4EE', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                <Smile size={30} color={colors.textSubtle} strokeWidth={2.25} />
                            </View>
                            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 20, marginBottom: 8, textAlign: 'center' }}>
                                {i18n.t('therapist.no_clients')}
                            </Text>
                            <Text style={{ color: colors.textSubtle, textAlign: 'center', fontWeight: '600', lineHeight: 22, maxWidth: 320 }}>
                                {i18n.t('therapist.clients_must_register', { defaultValue: 'Klient:innen müssen sich zuerst in der App registrieren, bevor du ihnen konkrete Therapieaufgaben zuweisen kannst.' })}
                            </Text>
                        </Card>
                    )}
                </MotiView>
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <FlatList
                data={filteredClients}
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 48, paddingHorizontal: numColumns === 1 ? 24 : 12 }}
                showsVerticalScrollIndicator={false}
                bounces={false}
                key={numColumns}
                numColumns={numColumns}
                keyExtractor={item => item.id}
                ListHeaderComponent={listHeaderElement}
                ListEmptyComponent={clients.length > 0 ? (
                    <Card
                        variant="elevated"
                        padding="lg"
                        style={{
                            marginTop: 8,
                            marginHorizontal: numColumns === 1 ? 0 : 12,
                            alignItems: 'center',
                            backgroundColor: colors.card,
                            borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                        }}
                    >
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 8, textAlign: 'center' }}>
                            Keine Treffer für diese Ansicht
                        </Text>
                        <Text style={{ color: colors.textSubtle, fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 21, marginBottom: 16 }}>
                            Passe Suche oder Filter an, um wieder Klienten in der Liste zu sehen.
                        </Text>
                        <PressableScale
                            onPress={() => {
                                setSearchQuery('');
                                setActiveFilter('all');
                            }}
                            intensity="medium"
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                borderRadius: 16,
                                backgroundColor: colors.primary,
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: '800' }}>Filter zurücksetzen</Text>
                        </PressableScale>
                    </Card>
                ) : null}
                renderItem={renderClientItem}
                columnWrapperStyle={numColumns > 1 ? { gap: 16, paddingHorizontal: 12, justifyContent: 'flex-start' } : undefined}
            />

            {profile && (
                <AddClientModal
                    visible={isAddClientModalVisible}
                    onClose={() => setIsAddClientModalVisible(false)}
                    therapistId={profile.id}
                    onClientAdded={fetchClients}
                />
            )}

            <Modal visible={!!clientToDelete} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 24 }}>
                    <MotiView
                        from={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ width: '100%', maxWidth: 380, backgroundColor: colors.card, borderRadius: 40, padding: 36, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 10 }}
                    >
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Trash2 size={32} color="#EF4444" />
                            </View>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 8 }}>Klienten löschen?</Text>
                            <Text style={{ fontSize: 15, color: colors.textSubtle, textAlign: 'center', lineHeight: 22 }}>
                                Möchtest du{' '}
                                <Text style={{ fontWeight: '800', color: colors.text }}>{clientToDelete?.firstName} {clientToDelete?.lastName}</Text>
                                {' '}wirklich entfernen? Der Firebase-Zugang bleibt bestehen.
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <PressableScale
                                onPress={() => setClientToDelete(null)}
                                intensity="subtle"
                                style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3EEE6', paddingVertical: 16, borderRadius: 20, alignItems: 'center' }}
                            >
                                <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>Abbrechen</Text>
                            </PressableScale>
                            <PressableScale
                                onPress={confirmDeleteClient}
                                disabled={deleteLoading}
                                intensity="medium"
                                style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 16, borderRadius: 20, alignItems: 'center', opacity: deleteLoading ? 0.7 : 1 }}
                            >
                                <Text style={{ fontWeight: '800', color: 'white', fontSize: 16 }}>{deleteLoading ? 'Wird gelöscht...' : 'Löschen'}</Text>
                            </PressableScale>
                        </View>
                    </MotiView>
                </View>
            </Modal>
        </View>
    );
}



import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Linking, Platform, ScrollView, TextInput, Modal, useWindowDimensions } from 'react-native';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Image } from 'expo-image';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import { BlurView } from 'expo-blur';
import { ClientService } from '../../../services/clientService';

const HOME_BACKGROUNDS = [
    require('../../../assets/HomeUi1.webp'),
    require('../../../assets/HomeUi2.webp'),
    require('../../../assets/HomeUi3.webp'),
    require('../../../assets/HomeUi4.webp'),
    require('../../../assets/HomeUi5.webp'),
    require('../../../assets/HomeUi6.webp')
];
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import i18n from '../../../utils/i18n';
import { DarkAmbientOrbs } from '../../../components/ui/AmbientOrbs';
import { Skeleton } from '../../../components/ui/Skeleton';
import { FileText, Library, MessageCircle, FolderOpen, Smile, TrendingUp, Search, Plus, User, Moon, Sun, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AddClientModal from '../../../components/therapist/AddClientModal';
import { useTheme } from '../../../contexts/ThemeContext';

export default function TherapistDashboard() {
    const { profile, signOut } = useAuth();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddClientModalVisible, setIsAddClientModalVisible] = useState(false);
    const router = useRouter();
    const { isDark, colors, theme, setTheme } = useTheme();
    const searchInputRef = useRef<TextInput>(null);

    // Keyboard Shortcuts (Desktop Feel)
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const handleKeyDown = (e: any) => {
            // CMD+K or CTRL+K to Search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            // CMD+N or CTRL+N for New Client
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                setIsAddClientModalVisible(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Responsive Setup
    const { width: screenWidth } = useWindowDimensions();
    const isTablet = screenWidth > 768;
    const isDesktop = screenWidth > 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

    // Delete client state
    const [clientToDelete, setClientToDelete] = useState<any>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const randomBg = useMemo(() => HOME_BACKGROUNDS[Math.floor(Math.random() * HOME_BACKGROUNDS.length)], []);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const q = query(collection(db, "users"), where("role", "==", "client"));
            const querySnapshot = await getDocs(q);

            // Filter out soft-deleted clients
            const activeDocs = querySnapshot.docs.filter(doc => !doc.data().isArchived);

            // Fix #12: Parallel fetch instead of sequential N+1 loop
            const clientData = await Promise.all(
                activeDocs.map(async (docSnap) => {
                    const client = { id: docSnap.id, ...docSnap.data() } as any;

                    try {
                        const [checksRes, exRes] = await Promise.all([
                            getDocs(query(
                                collection(db, 'checkins'),
                                where('uid', '==', docSnap.id),
                                orderBy('date', 'desc'),
                                limit(10)
                            )),
                            getDocs(query(collection(db, 'exercises'), where('clientId', '==', docSnap.id)))
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
            console.error("Error fetching clients:", error);
        } finally {
            setLoading(false);
        }
    };

    const notifyClient = async (clientData: any) => {
        try {
            const phoneNumber = clientData.phone || ''; // Ensure the database structure has phone or adapt as needed

            const message = i18n.t('therapist.whatsapp_msg', { name: clientData.firstName });
            const url = `whatsapp://send?text=${encodeURIComponent(message)}` + (phoneNumber ? `&phone=${phoneNumber}` : '');

            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                // Fallback for web or if whatsapp is not installed
                const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                await Linking.openURL(webUrl);
            }
        } catch (error) {
            console.warn('Could not open WhatsApp', error);
        }
    };

    const filteredClients = useMemo(() => {
        if (!searchQuery.trim()) return clients;
        const q = searchQuery.toLowerCase();
        return clients.filter(c =>
            c.firstName?.toLowerCase().includes(q) ||
            c.lastName?.toLowerCase().includes(q)
        );
    }, [clients, searchQuery]);

    // Add Haptics to press actions
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
            setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
        } catch {
            // silent — modal closes, user can retry
        } finally {
            setDeleteLoading(false);
            setClientToDelete(null);
        }
    };

    const renderClientItem = ({ item, index }: { item: any, index: number }) => (
        <MotiView
            from={{ opacity: 0, translateY: 30, scale: 0.97 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'timing', duration: 320, delay: Math.min((index % 10) * 50, 400) }}
            className={`flex-col justify-between overflow-hidden relative mb-4 ${numColumns > 1 ? 'flex-1 max-w-[500px]' : 'w-full'}`}
            style={{ backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: isDark ? colors.border : 'rgba(0,0,0,0.07)', padding: 24, shadowColor: isDark ? '#000' : '#137386', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.25 : 0.07, shadowRadius: 20, elevation: 4 }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', flex: 1, paddingRight: 12, alignItems: 'center' }}>
                    {/* Avatar */}
                    <LinearGradient
                        colors={['#1a8b9f', '#105e6d']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}
                    >
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 17 }}>
                            {item.firstName?.charAt(0)}{item.lastName?.charAt(0)}
                        </Text>
                    </LinearGradient>

                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 6 }} numberOfLines={1}>
                            {item.firstName} {item.lastName}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {item.latestMood && (
                                <View style={{ backgroundColor: 'rgba(19,115,134,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(19,115,134,0.12)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Smile size={11} color="#137386" strokeWidth={3} />
                                    <Text style={{ color: '#137386', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 }}>{item.latestMood}/10</Text>
                                </View>
                            )}
                            <View style={{ backgroundColor: 'rgba(16,185,129,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.12)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <TrendingUp size={11} color="#10b981" strokeWidth={3} />
                                <Text style={{ color: '#059669', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 }}>{item.completionRate ?? 0}%</Text>
                            </View>
                        </View>
                    </View>
                </View>
                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(19,115,134,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(19,115,134,0.1)' }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: isDark ? colors.textSubtle : '#137386', textTransform: 'uppercase', letterSpacing: 1.2 }}>{i18n.t('therapist.active')}</Text>
                </View>
            </View>

            {/* Separator */}
            <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', marginBottom: 16 }} />

            <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                    style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.07)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.18)', width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => handleDeleteClient(item)}
                    activeOpacity={0.7}
                >
                    <Trash2 size={17} color="#EF4444" strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)', paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }}
                    onPress={() => handleNotify(item)}
                    activeOpacity={0.7}
                >
                    <MessageCircle size={17} color={colors.text} strokeWidth={2.5} />
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>Nachricht</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ flex: 1.2, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, overflow: 'hidden', position: 'relative', shadowColor: '#137386', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 }}
                    onPress={() => handleOpenRecord(item.id)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#1a8b9f', '#137386']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                    />
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, zIndex: 10 }}>Akte öffnen</Text>
                    <FolderOpen size={16} color="#ffffff" strokeWidth={2.5} />
                </TouchableOpacity>
            </View>
        </MotiView>
    );

    if (loading) {
        return (
            <View className="flex-1 bg-[#F9F8F6]">
                <View style={{ backgroundColor: '#2C3E50', paddingTop: Platform.OS === 'android' ? 48 : 56, paddingBottom: 40, paddingHorizontal: 24, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}>
                    <Skeleton width={180} height={34} borderRadius={8} />
                    <Skeleton width={140} height={16} borderRadius={4} style={{ marginTop: 12 }} />
                </View>
                <View style={{ paddingTop: 32, paddingHorizontal: 32 }}>
                    <View className="flex-col gap-6">
                        {[1, 2, 3].map(i => (
                            <View key={i} className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100/50 w-full" style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 24, elevation: 2 }}>
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
            {/* Header Section */}
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
                    shadowOpacity: 0.2,
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
                {/* Overlay to ensure the foreground content pops more and text is readable */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)' }} />

                {/* Foreground Content */}
                <View style={{ zIndex: 10, width: '100%', maxWidth: 1024, marginHorizontal: 'auto' }} pointerEvents="box-none">
                    <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={{ borderRadius: 36, overflow: 'hidden', padding: 24, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255,255,255,0.95)', marginBottom: 24 }}>
                        {/* Logo */}
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <Image
                                source={require('../../../assets/logo-transparent.png')}
                                style={{ width: 280, height: 90, tintColor: isDark ? '#ffffff' : undefined }}
                                contentFit="contain"
                            />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                                <Text style={{ fontSize: 34, fontWeight: '900', color: colors.text, letterSpacing: -1, marginBottom: 2 }}>{i18n.t('therapist.cockpit')}</Text>
                                <Text style={{ color: colors.textSubtle, marginTop: 4, fontWeight: '600', fontSize: 14 }}>{i18n.t('therapist.welcome', { name: profile?.firstName || 'Therapeut' })}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    onPress={() => setTheme(isDark ? 'light' : 'dark')}
                                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    {isDark ? <Sun color={colors.text} size={20} /> : <Moon color={colors.text} size={20} />}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={signOut}
                                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 }}
                                >
                                    <Text style={{ color: colors.text, fontWeight: '700' }}>{i18n.t('therapist.logout')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </BlurView>

                    {/* Quick Actions */}
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 120, delay: 100 }}
                        style={{ flexDirection: 'row', gap: 16 }}
                    >
                        <TouchableOpacity
                            style={{ flex: 1, borderRadius: 32, overflow: 'hidden' }}
                            onPress={() => router.push('/(app)/therapist/templates')}
                            activeOpacity={0.8}
                        >
                            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={{ padding: 24, flex: 1, backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255,255,255,0.95)' }}>
                                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(19,115,134,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <FileText size={22} color={colors.primary} strokeWidth={2.5} />
                                </View>
                                <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 4 }}>{i18n.t('therapist.templates')}</Text>
                                <Text style={{ color: colors.textSubtle, fontWeight: '600', fontSize: 13, lineHeight: 18 }}>Übungsvorlagen erstellen und verwalten</Text>
                            </BlurView>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ flex: 1, borderRadius: 32, overflow: 'hidden', marginLeft: 16 }}
                            onPress={() => router.push('/(app)/therapist/resources')}
                            activeOpacity={0.8}
                        >
                            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={{ padding: 24, flex: 1, backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255,255,255,0.95)' }}>
                                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(192,157,89,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <Library size={22} color="#C09D59" strokeWidth={2.5} />
                                </View>
                                <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 4 }}>Bibliothek</Text>
                                <Text style={{ color: colors.textSubtle, fontWeight: '600', fontSize: 13, lineHeight: 18 }}>Gemeinsames Material & Dokumente</Text>
                            </BlurView>
                        </TouchableOpacity>
                    </MotiView>
                </View>
            </MotiView>

            <View className="pt-10 w-full max-w-5xl mx-auto px-8">
                <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300, delay: 150 }}>
                    <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 24, letterSpacing: -0.5 }}>{i18n.t('therapist.clients')}</Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 48 }}>
                        <View style={{ flex: 1, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
                            <Search size={18} color={colors.textSubtle} />
                            <TextInput
                                ref={searchInputRef}
                                style={{ flex: 1, marginLeft: 10, fontSize: 15, color: colors.text }}
                                placeholderTextColor={colors.textSubtle}
                                placeholder={Platform.OS === 'web' ? "Klienten suchen... (Cmd/Ctrl + K)" : "Klienten suchen..."}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={() => setIsAddClientModalVisible(true)}
                            activeOpacity={0.8}
                            style={{ backgroundColor: colors.primary, height: 48, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 }}
                        >
                            <Plus size={18} color="#FFF" />
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>
                                {Platform.OS === 'web' ? 'Neuer Klient (Cmd+N)' : 'Neuer Klient'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </MotiView>

                {clients.length === 0 && (
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'timing', duration: 350, delay: 200 }}
                        className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm items-center mt-4"
                        style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4 }}
                    >
                        <View className="w-20 h-20 bg-[#F9F8F6] rounded-full items-center justify-center mb-6">
                            <Text className="text-[32px]">👥</Text>
                        </View>
                        <Text className="text-[#243842] font-black text-[20px] tracking-tight mb-3 text-center">{i18n.t('therapist.no_clients')}</Text>
                        <Text className="text-[#243842]/60 text-center font-medium leading-relaxed max-w-[300px]">{i18n.t('therapist.clients_must_register', { defaultValue: 'Clients must register in the app before you can assign them specific therapy tasks.' })}</Text>
                    </MotiView>
                )}
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

            {/* Delete Client Confirmation Modal */}
            <Modal visible={!!clientToDelete} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 24 }}>
                    <MotiView
                        from={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ width: '100%', maxWidth: 380, backgroundColor: 'white', borderRadius: 40, padding: 36, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 10 }}
                    >
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Trash2 size={32} color="#EF4444" />
                            </View>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#243842', textAlign: 'center', marginBottom: 8 }}>Klienten löschen?</Text>
                            <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22 }}>
                                Möchtest du{' '}
                                <Text style={{ fontWeight: '800', color: '#243842' }}>{clientToDelete?.firstName} {clientToDelete?.lastName}</Text>
                                {' '}wirklich entfernen?
                                Hinweis: Nur der Eintrag wird entfernt, der Firebase-Zugang bleibt bestehen.
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setClientToDelete(null)}
                                style={{ flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: 20, alignItems: 'center' }}
                            >
                                <Text style={{ fontWeight: '700', color: '#243842', fontSize: 16 }}>Abbrechen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={confirmDeleteClient}
                                disabled={deleteLoading}
                                style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 16, borderRadius: 20, alignItems: 'center', opacity: deleteLoading ? 0.7 : 1 }}
                            >
                                <Text style={{ fontWeight: '800', color: 'white', fontSize: 16 }}>{deleteLoading ? 'Wird gelöscht...' : 'Löschen'}</Text>
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                </View>
            </Modal>
        </View>
    );
}

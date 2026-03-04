import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Linking, Alert, Platform, Image, ScrollView, TextInput } from 'react-native';
import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import { BlurView } from 'expo-blur';

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
import { FileText, Library, MessageCircle, FolderOpen, Smile, TrendingUp, Search, Plus, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AddClientModal from '../../../components/therapist/AddClientModal';

export default function TherapistDashboard() {
    const { profile, signOut } = useAuth();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddClientModalVisible, setIsAddClientModalVisible] = useState(false);
    const router = useRouter();

    const randomBg = useMemo(() => HOME_BACKGROUNDS[Math.floor(Math.random() * HOME_BACKGROUNDS.length)], []);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const q = query(collection(db, "users"), where("role", "==", "client"));
            const querySnapshot = await getDocs(q);

            // Fix #12: Parallel fetch instead of sequential N+1 loop
            const clientData = await Promise.all(
                querySnapshot.docs.map(async (docSnap) => {
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
            console.error('Error opening WhatsApp', error);
            Alert.alert('Fehler', i18n.t('therapist.whatsapp_err'));
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

    const renderClientItem = ({ item, index }: { item: any, index: number }) => (
        <MotiView
            key={item.id}
            from={{ opacity: 0, translateY: 40, scale: 0.95 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'timing', duration: 350, delay: 150 + (index * 50) }}
            className="bg-white rounded-[36px] border border-gray-100/80 flex-col justify-between overflow-hidden w-full relative mb-4"
            style={{ padding: 32, shadowColor: '#137386', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 36, elevation: 6 }}
        >
            {/* Subtle background glow */}
            <View className="absolute -right-20 -top-20 w-64 h-64 bg-[#137386]/[0.04] rounded-full" pointerEvents="none" />

            <View className="flex-row justify-between items-start mb-6 z-10">
                <View className="flex-row flex-1 pr-4 items-center">
                    {/* Premium Avatar */}
                    <LinearGradient
                        colors={['#1a8b9f', '#105e6d']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="w-16 h-16 rounded-[22px] items-center justify-center mr-4 shadow-sm"
                        style={{ shadowColor: '#137386', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}
                    >
                        <Text className="text-white font-black text-[22px]">
                            {item.firstName?.charAt(0)}{item.lastName?.charAt(0)}
                        </Text>
                    </LinearGradient>

                    <View className="flex-1 justify-center">
                        <Text className="text-[22px] font-black text-[#243842] tracking-tight mb-2" numberOfLines={1}>
                            {item.firstName} {item.lastName}
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                            {item.latestMood && (
                                <View className="bg-[#137386]/10 px-2.5 py-1.5 rounded-xl border border-[#137386]/10 flex-row items-center gap-1.5">
                                    <Smile size={12} color="#137386" strokeWidth={3} />
                                    <Text className="text-[#137386] text-[12px] font-black tracking-wide">{item.latestMood}/10</Text>
                                </View>
                            )}
                            <View className="bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/10 flex-row items-center gap-1.5">
                                <TrendingUp size={12} color="#10b981" strokeWidth={3} />
                                <Text className="text-emerald-600 text-[12px] font-black tracking-wide">{item.completionRate ?? 0}%</Text>
                            </View>
                        </View>
                    </View>
                </View>
                <View className="bg-white/80 px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                    <Text className="text-[10px] font-black text-[#243842]/60 tracking-widest uppercase">{i18n.t('therapist.active')}</Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, paddingTop: 24, marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', zIndex: 10 }}>
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, shadowColor: '#243842', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }}
                    onPress={() => notifyClient(item)}
                    activeOpacity={0.7}
                >
                    <MessageCircle size={20} color="#243842" strokeWidth={2.5} />
                    <Text style={{ color: '#243842', fontWeight: '900', fontSize: 16 }}>Nachricht</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ flex: 1.2, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, overflow: 'hidden', position: 'relative', shadowColor: '#137386', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 8 }}
                    onPress={() => router.push(`/(app)/therapist/client/${item.id}` as any)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#1a8b9f', '#137386']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                    />
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, zIndex: 10 }}>Akte öffnen</Text>
                    <FolderOpen size={18} color="#ffffff" strokeWidth={2.5} />
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

    return (
        <View className="flex-1 bg-[#F9F8F6]">
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
                bounces={false}
            >
                {/* Header Section */}
                <MotiView
                    from={{ opacity: 0, translateY: -40 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350, delay: 50 }}
                    style={{
                        backgroundColor: '#F9F8F6',
                        paddingTop: Platform.OS === 'android' ? 48 : 56,
                        paddingBottom: 40,
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
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        contentFit="cover"
                    />

                    {/* Foreground Content */}
                    <View style={{ zIndex: 10, width: '100%', maxWidth: 1024, marginHorizontal: 'auto' }} pointerEvents="box-none">
                        <BlurView intensity={Platform.OS === 'android' ? 100 : 60} tint="light" style={{ borderRadius: 36, overflow: 'hidden', padding: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', backgroundColor: 'rgba(255,255,255,0.75)', marginBottom: 24 }}>
                            {/* Logo */}
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <Image
                                    source={require('../../../assets/logo-transparent.png')}
                                    style={{ width: 200, height: 60 }}
                                    contentFit="contain"
                                />
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View>
                                    <Text style={{ fontSize: 28, fontWeight: '900', color: '#243842', letterSpacing: -0.5 }}>{i18n.t('therapist.cockpit')}</Text>
                                    <Text style={{ color: 'rgba(36,56,66,0.8)', marginTop: 4, fontWeight: '500', fontSize: 13 }}>{i18n.t('therapist.welcome', { name: profile?.firstName || 'Therapeut' })}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={signOut}
                                    style={{ backgroundColor: 'rgba(0,0,0,0.04)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' }}
                                >
                                    <Text style={{ color: '#243842', fontWeight: '700' }}>{i18n.t('therapist.logout')}</Text>
                                </TouchableOpacity>
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
                                style={{ backgroundColor: 'rgba(255,255,255,0.1)', flex: 1, padding: 24, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}
                                onPress={() => router.push('/(app)/therapist/templates')}
                                activeOpacity={0.8}
                            >
                                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <FileText size={20} color="#ffffff" strokeWidth={2.5} />
                                </View>
                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, marginBottom: 2 }}>{i18n.t('therapist.templates')}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 13, lineHeight: 18 }}>Übungsvorlagen erstellen und verwalten</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ backgroundColor: 'rgba(255,255,255,0.1)', flex: 1, padding: 24, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}
                                onPress={() => router.push('/(app)/therapist/resources')}
                                activeOpacity={0.8}
                            >
                                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <Library size={20} color="#ffffff" strokeWidth={2.5} />
                                </View>
                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, marginBottom: 2 }}>Bibliothek</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 13, lineHeight: 18 }}>Gemeinsame Materialien & Dokumente</Text>
                            </TouchableOpacity>
                        </MotiView>
                    </View>
                </MotiView>

                <View className="pt-10 flex-1 w-full max-w-5xl mx-auto px-8">
                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300, delay: 150 }}>
                        <Text className="text-[26px] font-black text-[#243842] mb-6 tracking-tight">{i18n.t('therapist.clients')}</Text>

                        {/* Filter und Add Bar */}
                        <View className="flex-row items-center gap-4 mb-6">
                            <View className="flex-1 bg-white flex-row items-center px-4 py-3 rounded-2xl border border-gray-200">
                                <Search size={20} color="#9CA3AF" />
                                <TextInput
                                    className="flex-1 ml-3 text-base text-[#243842]"
                                    placeholder="Klienten suchen..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>
                            <TouchableOpacity
                                className="bg-[#137386] h-12 px-5 rounded-2xl items-center justify-center flex-row gap-2 shadow-sm"
                                onPress={() => setIsAddClientModalVisible(true)}
                            >
                                <>
                                    <Plus size={20} color="#FFF" />
                                    <Text className="text-white font-bold text-sm">Neuer Klient</Text>
                                </>
                            </TouchableOpacity>
                        </View>
                    </MotiView>

                    {clients.length === 0 ? (
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
                    ) : (
                        <View className="flex-col gap-8 w-full">
                            {filteredClients.map((item, index) => renderClientItem({ item, index }))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {profile && (
                <AddClientModal
                    visible={isAddClientModalVisible}
                    onClose={() => setIsAddClientModalVisible(false)}
                    therapistId={profile.id}
                    onClientAdded={fetchClients}
                />
            )}
        </View >
    );
}

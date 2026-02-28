import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Linking, Alert, Platform, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import i18n from '../../../utils/i18n';
import { DarkAmbientOrbs } from '../../../components/ui/AmbientOrbs';
import { Skeleton } from '../../../components/ui/Skeleton';

export default function TherapistDashboard() {
    const { profile, signOut } = useAuth();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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

            // Phase 7: Mock Client creation if no real clients exist
            if (clientData.length === 0) {
                const mockClient = {
                    id: "mock_client_123",
                    firstName: "Max",
                    lastName: "Mustermann (Beispiel-Klient)",
                    email: "max.mustermann@beispiel.de",
                    role: "client",
                    completionRate: 0,
                    latestMood: 5
                };
                setClients([mockClient]);
                return;
            }

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
    const renderClientItem = ({ item, index }: { item: any, index: number }) => (
        <MotiView
            from={{ opacity: 0, translateY: 40, scale: 0.95 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'timing', duration: 350, delay: 150 + (index * 50) }}
            className="bg-white p-6 rounded-3xl mb-4 shadow-sm border border-gray-100 flex-col justify-between mx-6 overflow-hidden"
        >
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-4">
                    <Text className="text-xl font-extrabold text-[#243842] tracking-tight mb-0.5">
                        {item.firstName} {item.lastName}
                    </Text>
                    <View className="flex-row items-center mt-1">
                        {item.latestMood && (
                            <View className="bg-blue-50 px-2 py-1 rounded-md mr-2">
                                <Text className="text-blue-600 text-xs font-bold">Stimmung: {item.latestMood}/10</Text>
                            </View>
                        )}
                        <View className="bg-emerald-50 px-2 py-1 rounded-md">
                            <Text className="text-emerald-600 text-xs font-bold">Fortschritt: {item.completionRate ?? 0}%</Text>
                        </View>
                    </View>
                </View>
                <View className="bg-[#F9F8F6] px-3 py-1.5 rounded-lg border border-gray-100">
                    <Text className="text-xs font-bold text-slate-500">{i18n.t('therapist.active')}</Text>
                </View>
            </View>
            <View className="flex-row gap-3">
                <TouchableOpacity
                    className="flex-1 bg-[#F9F8F6] border border-gray-100 py-3.5 rounded-2xl items-center justify-center flex-row"
                    onPress={() => notifyClient(item)}
                    activeOpacity={0.7}
                >
                    <Text className="text-[#243842] font-bold text-[15px]">{i18n.t('therapist.msg_btn')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-1 bg-[#137386] py-3.5 rounded-2xl shadow-sm items-center justify-center flex-row"
                    onPress={() => router.push(`/(app)/therapist/client/${item.id}` as any)}
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-extrabold text-[15px]">{i18n.t('therapist.exercises_btn')}</Text>
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
                <View style={{ paddingTop: 24 }}>
                    {[1, 2, 3].map(i => (
                        <View key={i} className="bg-white p-6 rounded-3xl mb-4 shadow-sm border border-gray-100 mx-6">
                            <View className="flex-row justify-between items-start mb-4">
                                <View className="flex-1 pr-4">
                                    <Skeleton width={150} height={20} borderRadius={6} style={{ marginBottom: 6 }} />
                                    <View className="flex-row gap-2 mt-2">
                                        <Skeleton width={80} height={24} borderRadius={6} />
                                        <Skeleton width={80} height={24} borderRadius={6} />
                                    </View>
                                </View>
                                <Skeleton width={60} height={24} borderRadius={8} />
                            </View>
                            <View className="flex-row gap-3 mt-2">
                                <Skeleton width="48%" height={48} borderRadius={16} />
                                <Skeleton width="48%" height={48} borderRadius={16} />
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#F9F8F6]">
            {/* Header Section */}
            <MotiView
                from={{ opacity: 0, translateY: -40 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 350, delay: 50 }}
                style={{
                    backgroundColor: '#137386',
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
                {/* Ambient 3D depth orbs */}
                <DarkAmbientOrbs />

                {/* Foreground Content */}
                <View style={{ zIndex: 10, width: '100%', maxWidth: 1024, marginHorizontal: 'auto' }} pointerEvents="box-none">
                    {/* Logo */}
                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                        <Image
                            source={require('../../../assets/logo-transparent.png')}
                            style={{ width: 200, height: 60, resizeMode: 'contain', tintColor: '#ffffff' }}
                        />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <View>
                            <Text style={{ fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -0.5 }}>{i18n.t('therapist.cockpit')}</Text>
                            <Text style={{ color: 'rgba(249,248,246,0.8)', marginTop: 4, fontWeight: '500', fontSize: 13 }}>{i18n.t('therapist.welcome', { name: profile?.firstName || 'Therapeut' })}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={signOut}
                            style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                            <Text style={{ color: 'white', fontWeight: '700' }}>{i18n.t('therapist.logout')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Quick Actions */}
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 120, delay: 100 }}
                        style={{ flexDirection: 'row', gap: 12 }}
                    >
                        <TouchableOpacity
                            style={{ backgroundColor: 'rgba(255,255,255,0.15)', flex: 1, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}
                            onPress={() => router.push('/(app)/therapist/templates')}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>{i18n.t('therapist.templates')}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '500', fontSize: 12, marginTop: 2 }}>{i18n.t('therapist.templates_desc')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ backgroundColor: 'rgba(255,255,255,0.15)', flex: 1, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}
                            onPress={() => router.push('/(app)/therapist/resources')}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>{i18n.t('therapist.resources_title', { defaultValue: 'Resources' })}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '500', fontSize: 12, marginTop: 2 }}>{i18n.t('therapist.resources_manage', { defaultValue: 'Manage Library' })}</Text>
                        </TouchableOpacity>
                    </MotiView>
                </View>
            </MotiView>

            <View className="pt-8 flex-1 w-full max-w-5xl mx-auto">
                <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300, delay: 150 }}>
                    <Text className="text-xl font-bold text-[#243842] mb-4 px-6">{i18n.t('therapist.clients')}</Text>
                </MotiView>

                {clients.length === 0 ? (
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'timing', duration: 350, delay: 200 }}
                        className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm items-center mx-6"
                    >
                        <View className="w-16 h-16 bg-[#F9F8F6] rounded-full items-center justify-center mb-4">
                            <Text className="text-2xl">👥</Text>
                        </View>
                        <Text className="text-[#243842] font-extrabold text-lg tracking-tight mb-2 text-center">{i18n.t('therapist.no_clients')}</Text>
                        <Text className="text-[#243842]/60 text-center font-medium leading-5">{i18n.t('therapist.clients_must_register', { defaultValue: 'Clients must register in the app before you can assign them specific therapy tasks.' })}</Text>
                    </MotiView>
                ) : (
                    <FlatList
                        data={clients}
                        keyExtractor={(item) => item.id}
                        renderItem={renderClientItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />
                )}
            </View>
        </View >
    );
}

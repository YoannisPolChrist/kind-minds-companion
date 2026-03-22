import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { ArrowLeft, ArrowRight, Plus, Search, Users } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import AddClientModal from '../../../components/therapist/AddClientModal';
import { PressableScale } from '../../../components/ui/PressableScale';
import { SurfaceCard } from '../../../components/ui/SurfaceCard';
import { useTherapistClients } from '../../../hooks/therapist/useClients';
import { useEntranceAnimation } from '../../../hooks/useEntranceAnimation';

export default function TherapistClients() {
    const router = useRouter();
    const { profile } = useAuth();
    const { width } = useWindowDimensions();
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const { clients, filteredClients, loading, refreshClients } = useTherapistClients(profile?.id, search);

    const contentMaxWidth = width >= 1200 ? 1120 : width >= 860 ? 980 : undefined;

    return (
        <View style={{ flex: 1, backgroundColor: '#F4F1EA' }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
                <View style={{ borderBottomLeftRadius: 42, borderBottomRightRadius: 42, overflow: 'hidden', backgroundColor: '#10212A', marginBottom: 24 }}>
                    <Image source={require('../../../assets/HomeUi2.webp')} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
                    <LinearGradient colors={['rgba(19,34,45,0.28)', 'rgba(19,34,45,0.82)']} style={{ position: 'absolute', inset: 0 }} />
                    <View style={{ paddingTop: Platform.OS === 'android' ? 54 : 68, paddingBottom: 28, paddingHorizontal: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <TouchableOpacity
                                onPress={() => router.push('/(app)/therapist' as any)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
                            >
                                <ArrowLeft size={16} color="#FFFFFF" />
                                <Text style={{ color: 'white', fontWeight: '800' }}>Dashboard</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowAddModal(true)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' }}
                            >
                                <Plus size={16} color="#FFFFFF" />
                                <Text style={{ color: 'white', fontWeight: '900' }}>Hinzufuegen</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: 'white', fontSize: 30, fontWeight: '900', letterSpacing: -0.8, marginBottom: 4 }}>Klienten</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.74)', fontSize: 15, fontWeight: '700', marginBottom: 22 }}>
                            {clients.length} aktive Klienten
                        </Text>

                        <View style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', flexDirection: 'row', alignItems: 'center' }}>
                            <Search size={18} color="rgba(255,255,255,0.76)" />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Klienten suchen..."
                                placeholderTextColor="rgba(255,255,255,0.48)"
                                style={{ flex: 1, marginLeft: 12, color: 'white', fontSize: 16, fontWeight: '700' } as any}
                            />
                        </View>
                    </View>
                </View>

                <View style={[contentMaxWidth ? { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' } : undefined, { paddingHorizontal: 20 }]}>
                    {loading ? (
                        <View style={{ paddingVertical: 72, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#137386" />
                        </View>
                    ) : filteredClients.length === 0 ? (
                        <SurfaceCard style={{ alignItems: 'center', padding: 28 }}>
                            <View style={{ width: 76, height: 76, borderRadius: 26, backgroundColor: '#F7F4EE', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                                <Users size={32} color="#243842" />
                            </View>
                            <Text style={{ color: '#243842', fontSize: 22, fontWeight: '900', marginBottom: 8 }}>
                                {search ? 'Kein Klient gefunden' : 'Noch keine Klienten'}
                            </Text>
                            <Text style={{ color: '#6B7C85', fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 360 }}>
                                {search ? 'Versuche einen anderen Suchbegriff.' : 'Fuege deinen ersten Klienten hinzu und starte die Begleitung direkt in der App.'}
                            </Text>
                        </SurfaceCard>
                    ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
                            {filteredClients.map((client, index) => (
                                <AnimatedClientCard
                                    key={client.id}
                                    client={client}
                                    index={index}
                                    width={width}
                                    onPress={() => router.push(`/(app)/therapist/client/${client.id}` as any)}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            <AddClientModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                therapistId={profile?.id || ''}
                onClientAdded={refreshClients}
            />
        </View>
    );
}

function AnimatedClientCard({
    client,
    index,
    width,
    onPress,
}: {
    client: any;
    index: number;
    width: number;
    onPress: () => void;
}) {
    const entrance = useEntranceAnimation({ index, duration: 300, stagger: 40 });

    return (
        <MotiView
            {...entrance}
            style={{ width: width >= 1080 ? '33.33%' : width >= 760 ? '50%' : '100%', paddingHorizontal: 8, paddingBottom: 16 }}
        >
            <PressableScale onPress={onPress}>
                <SurfaceCard style={{ padding: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: '#F7F4EE', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#243842', fontSize: 18, fontWeight: '900' }}>
                                {client.firstName?.charAt(0)}{client.lastName?.charAt(0)}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#243842', fontSize: 18, fontWeight: '900', marginBottom: 2 }}>
                                {client.firstName} {client.lastName}
                            </Text>
                            <Text style={{ color: '#6B7C85', fontSize: 13 }} numberOfLines={1}>
                                {client.email || 'Offline-Profil'}
                            </Text>
                        </View>
                        <ArrowRight size={16} color="#6B7C85" />
                    </View>
                </SurfaceCard>
            </PressableScale>
        </MotiView>
    );
}

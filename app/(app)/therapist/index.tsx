import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';

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
            const clientData: any[] = [];
            querySnapshot.forEach((doc) => {
                clientData.push({ id: doc.id, ...doc.data() });
            });
            setClients(clientData);
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setLoading(false);
        }
    };

    const notifyClient = (client: any) => {
        // WhatsApp manual link logic will go here
        const message = encodeURIComponent(`Hallo ${client.firstName},\nich habe dir eine neue Übung in der Therapie-App freigeschaltet. Liebe Grüße Johannes`);
        const waUrl = `https://wa.me/?text=${message}`; // Without number attached it asks to choose contact
        if (typeof window !== 'undefined') {
            window.open(waUrl, '_blank');
        }
    };

    const renderClientItem = ({ item }: { item: any }) => (
        <View className="bg-white p-4 rounded-xl mb-4 shadow-sm border border-gray-100 flex-row justify-between items-center">
            <View>
                <Text className="text-lg font-bold text-[#2C3E50]">
                    {item.firstName} {item.lastName}
                </Text>
                <Text className="text-gray-500 text-sm">Klient</Text>
            </View>
            <View className="flex-row space-x-2">
                <TouchableOpacity
                    className="bg-blue-500 px-4 py-2 rounded-lg"
                    onPress={() => router.push(`/(app)/therapist/client/${item.id}` as any)}
                >
                    <Text className="text-white font-medium">Übungen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="bg-green-500 px-4 py-2 rounded-lg"
                    onPress={() => notifyClient(item)}
                >
                    <Text className="text-white font-medium">WA Info</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#FAF9F6]">
                <ActivityIndicator size="large" color="#2C3E50" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#FAF9F6] p-6">
            <View className="flex-row justify-between items-center mb-8">
                <View>
                    <Text className="text-3xl font-bold text-[#2C3E50]">Therapeuten Dashboard</Text>
                    <Text className="text-[#7F8C8D]">Willkommen, {profile?.firstName}!</Text>
                </View>
                <TouchableOpacity onPress={signOut} className="bg-red-500 px-4 py-2 rounded-xl">
                    <Text className="text-white font-bold">Logout</Text>
                </TouchableOpacity>
            </View>

            <Text className="text-xl font-bold text-[#2C3E50] mb-4">Deine Klienten</Text>

            {clients.length === 0 ? (
                <View className="bg-white p-6 rounded-xl border border-gray-200 items-center">
                    <Text className="text-gray-500">Bisher sind keine Klienten registriert.</Text>
                </View>
            ) : (
                <FlatList
                    data={clients}
                    keyExtractor={(item) => item.id}
                    renderItem={renderClientItem}
                    className="flex-1"
                />
            )}
        </View>
    );
}

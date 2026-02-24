import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useRouter } from 'expo-router';

export default function ClientDashboard() {
    const { profile, signOut } = useAuth();
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (profile?.id) {
            fetchMyExercises();
        }
    }, [profile?.id]);

    const fetchMyExercises = async () => {
        try {
            const q = query(collection(db, "exercises"), where("clientId", "==", profile?.id));
            const querySnapshot = await getDocs(q);
            const exData: any[] = [];
            querySnapshot.forEach((doc) => {
                exData.push({ id: doc.id, ...doc.data() });
            });
            setExercises(exData);
        } catch (error) {
            console.error("Error fetching exercises", error);
        } finally {
            setLoading(false);
        }
    };

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
                    <Text className="text-3xl font-bold text-[#2C3E50]">Hallo {profile?.firstName} 👋</Text>
                    <Text className="text-[#7F8C8D]">Dein Therapie-Dashboard</Text>
                </View>
                <TouchableOpacity onPress={signOut} className="bg-red-500 px-4 py-2 rounded-xl">
                    <Text className="text-white font-bold">Logout</Text>
                </TouchableOpacity>
            </View>

            <Text className="text-xl font-bold text-[#2C3E50] mb-4">Deine offenen Aufgaben</Text>

            <ScrollView className="flex-1">
                {exercises.length === 0 ? (
                    <View className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm items-center">
                        <Text className="text-gray-500 text-center">
                            Super! Du hast aktuell keine offenen Aufgaben.
                        </Text>
                        <Text className="text-gray-400 text-sm mt-2 text-center">
                            Sobald dein Therapeut dir eine Übung zuweist, erscheint sie hier.
                        </Text>
                    </View>
                ) : (
                    exercises.map((ex) => (
                        <TouchableOpacity
                            key={ex.id}
                            className={`p-4 rounded-xl border mb-4 shadow-sm ${ex.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200'}`}
                            onPress={() => router.push(`/(app)/exercise/${ex.id}` as any)}
                        >
                            <View className="flex-row justify-between items-center">
                                <View>
                                    <Text className={`text-lg font-bold ${ex.completed ? 'text-gray-500 line-through' : 'text-[#2C3E50]'}`}>
                                        {ex.title}
                                    </Text>
                                    <Text className="text-gray-400 text-sm mt-1">
                                        {ex.blocks?.length || 0} Schritte • {ex.completed ? 'Erledigt' : 'Zu erledigen'}
                                    </Text>
                                </View>
                                {!ex.completed && (
                                    <View className="bg-blue-100 px-3 py-1 rounded-full">
                                        <Text className="text-blue-700 font-bold text-xs">Starten</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

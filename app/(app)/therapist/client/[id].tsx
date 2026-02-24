import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../utils/firebase';
import ExerciseBuilder, { ExerciseBlock } from '../../../../components/therapist/ExerciseBuilder';

export default function ClientView() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [client, setClient] = useState<any>(null);
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBuilder, setShowBuilder] = useState(false);

    useEffect(() => {
        if (id) {
            fetchClientData();
            fetchExercises();
        }
    }, [id]);

    const fetchClientData = async () => {
        try {
            const docRef = doc(db, 'users', id as string);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setClient(docSnap.data());
            }
        } catch (error) {
            console.error("Error fetching client", error);
        }
    };

    const fetchExercises = async () => {
        try {
            const q = query(collection(db, "exercises"), where("clientId", "==", id));
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

    const saveExercise = async (title: string, blocks: ExerciseBlock[]) => {
        try {
            await addDoc(collection(db, "exercises"), {
                clientId: id,
                title,
                blocks,
                createdAt: serverTimestamp(),
                completed: false,
            });
            setShowBuilder(false);
            fetchExercises(); // Refresh the list
            Alert.alert("Erfolg", "Übung wurde zugewiesen!");
        } catch (error) {
            console.error("Error saving exercise", error);
            Alert.alert("Fehler", "Übung konnte nicht gespeichert werden.");
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
            <View className="flex-row items-center justify-between mb-8">
                <TouchableOpacity onPress={() => router.back()} className="bg-gray-200 px-4 py-2 rounded-lg">
                    <Text className="text-[#2C3E50] font-medium">Zurück</Text>
                </TouchableOpacity>
                <View className="items-end">
                    <Text className="text-2xl font-bold text-[#2C3E50]">
                        {client?.firstName ? `${client.firstName} ${client.lastName}` : 'Klient Details'}
                    </Text>
                </View>
            </View>

            <Text className="text-xl font-bold text-[#2C3E50] mb-4">Aktive Übungen</Text>

            <ScrollView className="flex-1 mb-6">
                {exercises.length === 0 ? (
                    <View className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm items-center">
                        <Text className="text-gray-500 italic">Noch keine Übungen zugewiesen.</Text>
                    </View>
                ) : (
                    exercises.map(ex => (
                        <View key={ex.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                            <Text className="text-lg font-bold text-[#2C3E50]">{ex.title}</Text>
                            <Text className="text-gray-400 text-sm mt-1">Status: {ex.completed ? 'Abgeschlossen' : 'Offen'}</Text>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Button to open Builder */}
            <TouchableOpacity
                className="bg-blue-500 py-4 rounded-xl items-center mt-auto"
                onPress={() => setShowBuilder(true)}
            >
                <Text className="text-white font-bold text-lg">+ Neue Übung zuweisen</Text>
            </TouchableOpacity>

            {/* Exercise Builder Modal */}
            <Modal visible={showBuilder} animationType="slide" presentationStyle="formSheet">
                <View className="flex-1 bg-white pt-10 px-4">
                    <Text className="text-xl font-bold text-gray-800 mb-4 ml-6">Übung erstellen für {client?.firstName}</Text>
                    <ExerciseBuilder
                        onSave={saveExercise}
                        onCancel={() => setShowBuilder(false)}
                    />
                </View>
            </Modal>
        </View>
    );
}

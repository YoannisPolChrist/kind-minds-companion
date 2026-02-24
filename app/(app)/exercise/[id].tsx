import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function ExerciseExecutionView() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [exercise, setExercise] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timerValues, setTimerValues] = useState<Record<string, number>>({});

    useEffect(() => {
        if (id) {
            fetchExercise();
        }
    }, [id]);

    const fetchExercise = async () => {
        try {
            const docRef = doc(db, 'exercises', id as string);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setExercise({ id: docSnap.id, ...data });

                // Initialize timer values if needed
                const timers: Record<string, number> = {};
                data.blocks.forEach((b: any) => {
                    if (b.type === 'timer') timers[b.id] = b.duration;
                });
                setTimerValues(timers);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleTextAnswer = (blockId: string, text: string) => {
        setAnswers(prev => ({ ...prev, [blockId]: text }));
    };

    const handleComplete = async () => {
        try {
            const docRef = doc(db, 'exercises', id as string);
            await updateDoc(docRef, {
                completed: true,
                answers: answers
            });
            Alert.alert("Super!", "Du hast die Übung erfolgreich abgeschlossen.");
            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert("Fehler", "Konnte den Fortschritt nicht speichern.");
        }
    };

    const exportPDF = async () => {
        let htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #2C3E50;">${exercise.title}</h1>
          <hr/>
    `;

        exercise.blocks.forEach((block: any) => {
            if (block.type === 'text') {
                htmlContent += `
          <div style="margin-top: 20px;">
            <h3>Frage/Aufgabe:</h3>
            <p>${block.content}</p>
            <h3>Deine Antwort/Reflektion:</h3>
            <p style="padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
              ${answers[block.id] || "<i>Keine Antwort verfasst</i>"}
            </p>
          </div>
        `;
            }
        });

        htmlContent += `</body></html>`;

        try {
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri);
        } catch (error) {
            console.error(error);
            Alert.alert('Fehler', 'PDF konnte nicht generiert werden.');
        }
    };

    if (loading) return <ActivityIndicator className="mt-10" size="large" color="#2C3E50" />;

    return (
        <View className="flex-1 bg-[#FAF9F6]">
            <View className="p-6 bg-white border-b border-gray-200 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()} className="px-4 py-2 bg-gray-100 rounded-lg">
                    <Text className="text-gray-700 font-bold">Zurück</Text>
                </TouchableOpacity>
                <Text className="text-xl font-bold text-[#2C3E50]">{exercise?.title}</Text>
            </View>

            <ScrollView className="p-6">
                {exercise?.blocks?.map((block: any, index: number) => (
                    <View key={block.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">

                        {block.type === 'text' && (
                            <View>
                                <Text className="text-gray-500 font-bold mb-2">SCHRITT {index + 1}: AUFGABE</Text>
                                <Text className="text-lg text-[#2C3E50] mb-4">{block.content}</Text>
                                <Text className="text-gray-500 font-bold mb-2">DEINE REFLEKTION:</Text>
                                <TextInput
                                    multiline
                                    placeholder="Schreibe deine Gedanken hier auf..."
                                    className="bg-gray-50 p-4 rounded-xl border border-gray-200 min-h-[120px] text-[#2C3E50]"
                                    textAlignVertical="top"
                                    value={answers[block.id] || ''}
                                    onChangeText={(val) => handleTextAnswer(block.id, val)}
                                />
                            </View>
                        )}

                        {block.type === 'timer' && (
                            <View className="items-center">
                                <Text className="text-gray-500 font-bold mb-2">SCHRITT {index + 1}: TIMER</Text>
                                <View className="w-40 h-40 rounded-full border-8 border-blue-500 items-center justify-center mb-4">
                                    <Text className="text-4xl font-bold text-[#2C3E50]">
                                        {Math.floor(timerValues[block.id] / 60)}:{(timerValues[block.id] % 60).toString().padStart(2, '0')}
                                    </Text>
                                </View>
                                <TouchableOpacity className="bg-[#2C3E50] px-8 py-3 rounded-full">
                                    <Text className="text-white font-bold">Start / Stop (Demo)</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                    </View>
                ))}

                <View className="flex-row gap-4 mb-10">
                    <TouchableOpacity
                        onPress={exportPDF}
                        className="flex-1 bg-white border border-[#2C3E50] py-4 rounded-xl items-center"
                    >
                        <Text className="font-bold text-[#2C3E50]">PDF Exportieren</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleComplete}
                        disabled={exercise?.completed}
                        className={`flex-1 py-4 rounded-xl items-center ${exercise?.completed ? 'bg-gray-300' : 'bg-green-500'}`}
                    >
                        <Text className="font-bold text-white">
                            {exercise?.completed ? 'Bereits abgeschlossen' : 'Übung abschließen'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

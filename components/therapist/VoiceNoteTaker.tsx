import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { MotiView } from 'moti';
import { Mic, Square } from 'lucide-react-native';

interface Props {
    onTranscriptionComplete: (text: string) => void;
    type?: 'session' | 'journal';
}

export function VoiceNoteTaker({ onTranscriptionComplete, type = 'session' }: Props) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [permissionResponse, requestPermission] = Audio.usePermissions();

    async function startRecording() {
        try {
            if (permissionResponse?.status !== 'granted') {
                await requestPermission();
            }
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        setRecording(null);
        setIsRecording(false);
        setIsProcessing(true);

        try {
            if (recording) {
                await recording.stopAndUnloadAsync();
                await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
                const uri = recording.getURI();
                console.log('Recording stopped and stored at', uri);

                // Simulate AI Transcription & Summarization Delay
                setTimeout(() => {
                    setIsProcessing(false);
                    let mockResult = '';
                    if (type === 'session') {
                        mockResult = `**Subjective:** Klient berichtet über verbesserte Stimmung diese Woche.\n**Objective:** Klient wirkt entspannt und engagiert.\n**Assessment:** Positive Reaktion auf Mindfulness-Übungen.\n**Plan:** Fortführung des aktuellen App-Protokolls. Nächste Sitzung in 2 Wochen.`;
                    } else {
                        mockResult = `Mein Tag war heute eigentlich ganz gut. Ich war morgens etwas gestresst, aber am Nachmittag konnte ich mich gut entspannen, als ich draußen spazieren war. Mir ist aufgefallen, dass mir frische Luft sehr guttut, wenn ich mich überfordert fühle.`;
                    }
                    onTranscriptionComplete(mockResult);
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
            setIsProcessing(false);
        }
    }

    return (
        <View className="bg-white border border-[#E2E8F0] p-5 rounded-3xl shadow-sm mb-4">
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[#0F172A] font-bold text-lg">
                    {type === 'session' ? 'AI Session Notes' : 'Sprachnotiz'}
                </Text>
                {isRecording && (
                    <MotiView
                        from={{ opacity: 0.3 }}
                        animate={{ opacity: 1 }}
                        transition={{ loop: true, type: 'timing', duration: 800 }}
                        className="flex-row items-center"
                    >
                        <View className="w-2 h-2 bg-red-500 rounded-full mr-1.5" />
                        <Text className="text-red-500 text-xs font-bold uppercase tracking-wider">Aufnahme läuft...</Text>
                    </MotiView>
                )}
            </View>
            <Text className="text-[#64748B] text-sm mb-4 leading-5 font-medium">
                {type === 'session'
                    ? 'Nimm deine Notizen nach der Sitzung per Sprache auf. Die AI fasst sie automatisch zusammen.'
                    : 'Sprich deine Gedanken ein. Sie werden automatisch transkribiert.'}
            </Text>

            {isProcessing ? (
                <View className="bg-[#EEF2FF] p-4 rounded-xl items-center flex-row justify-center">
                    <ActivityIndicator color="#4F46E5" className="mr-3" />
                    <Text className="text-[#4338CA] font-bold">Verarbeite Audio...</Text>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={isRecording ? stopRecording : startRecording}
                    className={`py-3 px-5 rounded-2xl items-center flex-row justify-center shadow-sm ${isRecording ? 'bg-red-500' : 'bg-[#137386]'}`}
                >
                    {isRecording ? <Square size={18} color="white" style={{ marginRight: 8 }} /> : <Mic size={18} color="white" style={{ marginRight: 8 }} />}
                    <Text className="text-white font-bold">{isRecording ? 'Aufnahme beenden' : 'Aufnehmen'}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

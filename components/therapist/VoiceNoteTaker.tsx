import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Audio } from 'expo-av';
import i18n from '../../utils/i18n';
import { MotiView } from 'moti';

interface Props {
    onTranscriptionComplete: (text: string) => void;
}

export function VoiceNoteTaker({ onTranscriptionComplete }: Props) {
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
                    const mockSoapNote = `**Subjective:** Klient berichtet über verbesserte Stimmung diese Woche.\n**Objective:** Klient wirkt entspannt und engagiert.\n**Assessment:** Positive Reaktion auf Mindfulness-Übungen.\n**Plan:** Fortführung des aktuellen App-Protokolls. Nächste Sitzung in 2 Wochen.`;
                    onTranscriptionComplete(mockSoapNote);
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
            setIsProcessing(false);
        }
    }

    return (
        <View className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm mb-4">
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[#2C3E50] font-bold text-lg">AI Session Notes</Text>
                {isRecording && (
                    <MotiView
                        from={{ opacity: 0.3 }}
                        animate={{ opacity: 1 }}
                        transition={{ loop: true, type: 'timing', duration: 800 }}
                        className="flex-row items-center"
                    >
                        <View className="w-2 h-2 bg-red-500 rounded-full mr-1.5" />
                        <Text className="text-red-500 text-xs font-bold uppercase tracking-wider">Recording...</Text>
                    </MotiView>
                )}
            </View>
            <Text className="text-gray-500 text-sm mb-4 leading-5">
                Nimm deine Notizen nach der Sitzung per Sprache auf. Die AI fasst sie automatisch zusammen.
            </Text>

            {isProcessing ? (
                <View className="bg-blue-50 p-4 rounded-xl items-center flex-row justify-center">
                    <ActivityIndicator color="#0088cc" className="mr-3" />
                    <Text className="text-blue-800 font-bold">Verarbeite Audio & erstelle SOAP Note...</Text>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={isRecording ? stopRecording : startRecording}
                    className={`py-4 rounded-xl items-center flex-row justify-center shadow-sm ${isRecording ? 'bg-red-500' : 'bg-[#137386]'}`}
                >
                    <Text className="text-white text-lg mr-2">{isRecording ? '⏹️' : '🎙️'}</Text>
                    <Text className="text-white font-bold">{isRecording ? 'Aufnahme beenden' : 'Notiz aufsprechen'}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

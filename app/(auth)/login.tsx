import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import { router } from 'expo-router';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Use the context mostly for state, but sign in directly with Firebase
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben.');
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Navigation is handled automatically by the auth state listener in _layout
            router.replace('/(app)/');
        } catch (error: any) {
            let message = 'Ein Fehler ist aufgetreten.';
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                message = 'E-Mail oder Passwort ist falsch.';
            }
            Alert.alert('Login fehlgeschlagen', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 justify-center px-6 bg-[#FAF9F6]">
            <View className="items-center mb-10">
                <Text className="text-3xl font-bold text-[#2C3E50]">Willkommen</Text>
                <Text className="text-[#7F8C8D] mt-2 text-center">
                    Logge dich ein, um deine Therapie-Übungen zu sehen.
                </Text>
            </View>

            <View className="space-y-4">
                <TextInput
                    className="bg-white px-4 py-3 rounded-xl border border-gray-200 text-[#2C3E50]"
                    placeholder="E-Mail Adresse"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput
                    className="bg-white px-4 py-3 rounded-xl border border-gray-200 text-[#2C3E50]"
                    placeholder="Passwort"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    className="bg-[#2C3E50] py-4 rounded-xl items-center mt-2"
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="text-white font-semibold text-lg">Einloggen</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

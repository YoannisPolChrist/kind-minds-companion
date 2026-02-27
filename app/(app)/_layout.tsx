import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function AppLayout() {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F8F6' }}>
                <ActivityIndicator size="large" color="#137386" />
            </View>
        );
    }

    if (!user) return <Redirect href="/(auth)/login" />;

    // Therapeut → immer direkt zum Therapeuten-Dashboard
    if (profile?.role === 'therapist') {
        return (
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="therapist/index" />
                <Stack.Screen name="therapist/templates" />
                <Stack.Screen name="therapist/template/[id]" />
                <Stack.Screen name="therapist/client/[id]" />
                <Stack.Screen name="therapist/client/assign/[clientId]" />
            </Stack>
        );
    }

    // Klient → Client-Dashboard mit allen Sub-Screens
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="exercise/[id]" />
            <Stack.Screen name="checkin" />
            <Stack.Screen name="history" />
            <Stack.Screen name="settings" />
        </Stack>
    );
}

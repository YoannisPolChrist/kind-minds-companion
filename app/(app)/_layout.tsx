import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function AppLayout() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    // Redirect to login if user is not authenticated
    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Dashboard', headerShown: false }} />
            <Stack.Screen name="therapist" options={{ title: 'Therapeuten-Ansicht' }} />
        </Stack>
    );
}

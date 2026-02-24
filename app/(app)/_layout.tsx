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

    // Role-based routing
    if (profile?.role === 'therapist') {
        return (
            <Stack>
                <Stack.Screen name="therapist/index" options={{ title: 'Dashboard', headerShown: false }} />
                {/* Further therapist routes can be added here */}
            </Stack>
        );
    }

    // Fallback for default 'client'
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Übersicht', headerShown: false }} />
        </Stack>
    );
}

import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { registerForPushNotificationsAsync } from '../../utils/notifications';

export default function AppLayout() {
    const { user, profile, loading } = useAuth();

    useEffect(() => {
        let isMounted = true;

        async function updatePlatformAndToken() {
            if (!user) return;

            const platform = Platform.OS === 'web' ? 'web' : 'app';
            let pushToken = null;

            if (platform === 'app') {
                pushToken = await registerForPushNotificationsAsync();
            }

            if (!isMounted) return;

            const updateData: any = { lastActivePlatform: platform };
            // Optional: You could update the timestamp here too, but just platform acts as a good indicator
            if (pushToken) {
                updateData.pushToken = pushToken;
            }

            try {
                await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });
            } catch (error) {
                console.error('Failed to update platform info in Firestore:', error);
            }
        }

        updatePlatformAndToken();

        return () => { isMounted = false; };
    }, [user]);

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
    // Onboarding check for clients
    if (!profile?.onboardingCompleted) {
        return (
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                <Stack.Screen name="onboarding" />
            </Stack>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="exercise/[id]" />
            <Stack.Screen name="checkin" />
            <Stack.Screen name="history" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="notes" />
        </Stack>
    );
}

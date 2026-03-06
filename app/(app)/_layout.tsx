import { Redirect, Stack, useSegments } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { registerForPushNotificationsAsync } from '../../utils/notifications';

export default function AppLayout() {
    const { user, profile, loading } = useAuth();
    const segments = useSegments();

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

    if (loading || (user && !profile)) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F4EE' }}>
                <ActivityIndicator size="large" color="#2D666B" />
            </View>
        );
    }

    if (!user || !profile) {
        return <Redirect href="/(auth)/login" />;
    }

    const inTherapistArea = segments.includes('therapist');
    const onOnboardingScreen = segments.includes('onboarding');

    if (profile.role === 'therapist' && !inTherapistArea) {
        return <Redirect href="/(app)/therapist" />;
    }

    if (profile.role !== 'therapist') {
        if (inTherapistArea) {
            return <Redirect href="/(app)" />;
        }

        if (!profile.onboardingCompleted && !onOnboardingScreen) {
            return <Redirect href="/(app)/onboarding" />;
        }

        if (profile.onboardingCompleted && onOnboardingScreen) {
            return <Redirect href="/(app)" />;
        }
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}


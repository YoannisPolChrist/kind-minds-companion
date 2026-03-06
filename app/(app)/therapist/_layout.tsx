import { Redirect, Slot } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';

export default function TherapistLayout() {
    const { user, profile, loading } = useAuth();

    if (loading || (user && !profile)) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F4EE' }}>
                <ActivityIndicator size="large" color="#2D666B" />
            </View>
        );
    }

    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    if (profile?.role !== 'therapist') {
        return <Redirect href="/(app)" />;
    }

    return <Slot />;
}



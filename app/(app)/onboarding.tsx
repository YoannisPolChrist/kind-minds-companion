import { View, Text, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MotiView } from 'moti';
import i18n from '../../utils/i18n';
import { Check, AlertCircle } from 'lucide-react-native';
import { PressableScale } from '../../components/ui/PressableScale';

export default function OnboardingScreen() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // We only need to ask for first name, last name, and birth date in this MVP
    const [formData, setFormData] = useState({
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        birthDate: profile?.birthDate || ''
    });

    const [errors, setErrors] = useState<{ firstName?: string, lastName?: string, birthDate?: string }>({});

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = () => {
        const newErrors: any = {};
        if (!formData.firstName.trim()) newErrors.firstName = 'Vorname ist erforderlich';
        if (!formData.lastName.trim()) newErrors.lastName = 'Nachname ist erforderlich';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCompleteOnboarding = async () => {
        if (!validateForm() || !user?.uid) return;

        setLoading(true);
        setSaveError(null);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                birthDate: formData.birthDate.trim(),
                onboardingCompleted: true
            });

            router.replace('/(app)/');
        } catch (error) {
            console.error('Error saving onboarding data:', error);
            setSaveError('Profil konnte nicht gespeichert werden. Bitte versuche es erneut.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#F7F4EE' }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 500 }}
                    style={{ width: '100%', maxWidth: 480, backgroundColor: 'white', padding: 40, borderRadius: 32, shadowColor: '#1F2528', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 4 }}
                >
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        <Image source={require('../../assets/logo-transparent.png')} style={{ width: 160, height: 60, resizeMode: 'contain', marginBottom: 24 }} />
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#1F2528', textAlign: 'center', marginBottom: 8 }}>Willkommen!</Text>
                        <Text style={{ fontSize: 16, color: '#6F7472', textAlign: 'center', marginBottom: 32 }}>Lass uns dein Profil vervollständigen.</Text>
                    </View>

                    {saveError && (
                        <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 }}>
                            <AlertCircle size={18} color="#DC2626" />
                            <Text style={{ color: '#DC2626', fontWeight: '600', flex: 1 }}>{saveError}</Text>
                        </MotiView>
                    )}

                    <View style={{ gap: 20 }}>
                        <View>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#6F7472', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>Vorname *</Text>
                            <TextInput
                                style={{ backgroundColor: '#F5F1EA', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: errors.firstName ? '#EF4444' : '#E2E8F0', fontSize: 16, color: '#1F2528' }}
                                placeholder="Max"
                                value={formData.firstName}
                                onChangeText={(t) => handleChange('firstName', t)}
                            />
                            {errors.firstName && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.firstName}</Text>}
                        </View>

                        <View>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#6F7472', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>Nachname *</Text>
                            <TextInput
                                style={{ backgroundColor: '#F5F1EA', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: errors.lastName ? '#EF4444' : '#E2E8F0', fontSize: 16, color: '#1F2528' }}
                                placeholder="Mustermann"
                                value={formData.lastName}
                                onChangeText={(t) => handleChange('lastName', t)}
                            />
                            {errors.lastName && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.lastName}</Text>}
                        </View>

                        <View>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#6F7472', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>Geburtsdatum (Optional)</Text>
                            <TextInput
                                style={{ backgroundColor: '#F5F1EA', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#1F2528' }}
                                placeholder="TT.MM.JJJJ"
                                value={formData.birthDate}
                                onChangeText={(t) => handleChange('birthDate', t)}
                            />
                        </View>
                    </View>

                    <PressableScale
                        onPress={handleCompleteOnboarding}
                        disabled={loading}
                        intensity="medium"
                        style={{ backgroundColor: '#2D666B', padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 32, flexDirection: 'row' }}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Check size={20} color="white" style={{ marginRight: 8 }} />
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Profil speichern</Text>
                            </>
                        )}
                    </PressableScale>
                </MotiView>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}


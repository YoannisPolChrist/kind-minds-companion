import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, ActivityIndicator, Share, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MotiView } from 'moti';
import { X, Copy, Share2, UserPlus, Link as LinkIcon, Mail, Key, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { createInvitation } from '../../services/invitationService';
import { ClientService } from '../../services/clientService';
import { ErrorHandler } from '../../utils/errors';
import { PressableScale } from '../ui/PressableScale';
import { formatBirthDateInput } from '../../utils/dateInput';

interface AddClientModalProps {
    visible: boolean;
    onClose: () => void;
    therapistId: string;
    onClientAdded: () => void;
    offlineProfile?: any | null;
}

export default function AddClientModal({ visible, onClose, therapistId, onClientAdded, offlineProfile = null }: AddClientModalProps) {
    const [activeTab, setActiveTab] = useState<'manual' | 'invite'>('manual');
    const [loading, setLoading] = useState(false);

    // Manual Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [birthDate, setBirthDate] = useState('');

    // Result State — shown after account is created
    const [createdAccount, setCreatedAccount] = useState<{ email: string; resetSent: boolean } | null>(null);

    // Invite State
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    // Error state for inline feedback
    const [formError, setFormError] = useState<string | null>(null);

    // Auto-switch to invite tab if an offline profile is passed
    useEffect(() => {
        if (visible) {
            if (offlineProfile) {
                setActiveTab('invite');
            } else {
                setActiveTab('manual');
            }
            setGeneratedCode(null);
            setCreatedAccount(null);
            setFormError(null);
            setFirstName('');
            setLastName('');
            setEmail('');
            setBirthDate('');
        }
    }, [visible, offlineProfile]);

    /** Creates a full Firebase Auth + Firestore account for the client.
     *  The therapist remains logged in throughout. */
    const handleCreateWithAccount = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            setFormError('Bitte Vor- und Nachname eingeben.');
            return;
        }
        if (!email.trim()) {
            setFormError('Bitte E-Mail-Adresse eingeben, um einen Zugang zu erstellen.');
            return;
        }

        setLoading(true);
        setFormError(null);
        try {
            const { email: createdEmail, resetSent } = await ClientService.createClientAccount({
                firstName,
                lastName,
                email,
                birthDate,
                therapistId
            });

            setCreatedAccount({ email: createdEmail, resetSent });
            onClientAdded();
        } catch (error: any) {
            const { message } = ErrorHandler.handle(error, 'Create Client Account');
            setFormError(message);
        } finally {
            setLoading(false);
        }
    };

    /** Creates an offline profile WITHOUT a login account. */
    const handleCreateOfflineProfile = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            setFormError('Bitte Vor- und Nachname eingeben.');
            return;
        }

        setLoading(true);
        setFormError(null);
        try {
            await ClientService.createOfflineProfile({
                firstName,
                lastName,
                email,
                birthDate,
                therapistId
            });

            onClientAdded();
            onClose();
        } catch (error) {
            console.error('Error creating offline client:', error);
            setFormError('Klient konnte nicht angelegt werden.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateLink = async () => {
        setLoading(true);
        setFormError(null);
        try {
            const profileId = offlineProfile ? offlineProfile.id : undefined;
            const code = await createInvitation(therapistId, profileId);
            setGeneratedCode(code);
        } catch (error) {
            console.error('Error generating invitation:', error);
            setFormError('Einladungscode konnte nicht generiert werden.');
        } finally {
            setLoading(false);
        }
    };

    const handleShareCode = () => {
        if (generatedCode) {
            const message = offlineProfile
                ? `Hallo ${offlineProfile.firstName},\nlade dir die App herunter und nutze diesen Einladungscode, um dich mit deiner Akte zu verbinden: ${generatedCode}`
                : `Lade dir die Therapie-App herunter und nutze diesen Einladungscode, um dich mit mir zu verbinden: ${generatedCode}`;
            Share.share({ message });
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
            >
                <MotiView
                    from={{ translateY: 400 }}
                    animate={{ translateY: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, width: '100%', maxWidth: 640, alignSelf: 'center', maxHeight: '92%' }}
                >
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#1F2528', letterSpacing: -0.5 }}>
                            {offlineProfile ? 'Profil verknüpfen' : 'Neuer Klient'}
                        </Text>
                        <PressableScale onPress={handleClose} intensity="subtle" style={{ backgroundColor: '#F3EEE6', padding: 8, borderRadius: 20 }}>
                            <X size={22} color="#4F5D63" />
                        </PressableScale>
                    </View>

                    {/* Tabs — only show if not linking an offline profile */}
                    {!offlineProfile && (
                        <View style={{ flexDirection: 'row', backgroundColor: '#F3EEE6', padding: 4, borderRadius: 20, marginBottom: 24 }}>
                            <PressableScale
                                onPress={() => setActiveTab('manual')}
                                intensity="subtle"
                                style={{ flex: 1, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: activeTab === 'manual' ? 'white' : 'transparent' }}
                            >
                                <UserPlus size={16} color={activeTab === 'manual' ? '#2D666B' : '#56636B'} />
                                <Text style={{ fontWeight: '700', color: activeTab === 'manual' ? '#2D666B' : '#56636B', fontSize: 14 }}>Klient anlegen</Text>
                            </PressableScale>
                            <PressableScale
                                onPress={() => setActiveTab('invite')}
                                intensity="subtle"
                                style={{ flex: 1, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: activeTab === 'invite' ? 'white' : 'transparent' }}
                            >
                                <LinkIcon size={16} color={activeTab === 'invite' ? '#2D666B' : '#56636B'} />
                                <Text style={{ fontWeight: '700', color: activeTab === 'invite' ? '#2D666B' : '#56636B', fontSize: 14 }}>Einladungscode</Text>
                            </PressableScale>
                        </View>
                    )}

                    {/* Tab Content: Manual Create */}
                    {activeTab === 'manual' && !offlineProfile && (
                        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                            {/* Success State */}
                            {createdAccount ? (
                                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ alignItems: 'center', padding: 24 }}>
                                    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <CheckCircle2 size={36} color="#788E76" />
                                    </View>
                                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#1F2528', textAlign: 'center', marginBottom: 8 }}>Klient angelegt!</Text>
                                    <Text style={{ fontSize: 15, color: '#55636B', textAlign: 'center', marginBottom: 16, lineHeight: 22 }}>
                                        Der Account für{'\n'}
                                        <Text style={{ fontWeight: '800', color: '#2D666B' }}>{createdAccount.email}</Text>
                                        {'\n'}wurde erfolgreich erstellt.
                                    </Text>
                                    {createdAccount.resetSent ? (
                                        <View style={{ backgroundColor: '#EEF4F3', borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: '#D8E6E4' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <Mail size={20} color="#2D666B" />
                                                <Text style={{ flex: 1, color: '#1F4B6E', fontWeight: '700', fontSize: 14 }}>
                                                    Eine E-Mail mit dem Link zum Passwort-Setzen wurde verschickt.
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={{ backgroundColor: '#F6F0E7', borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: '#FDE68A' }}>
                                            <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 14 }}>
                                                Wichtig: Die Willkommens-E-Mail konnte nicht versendet werden. Bitte teile dem Klienten den Zugang manuell mit.
                                            </Text>
                                        </View>
                                    )}
                                    <PressableScale
                                        onPress={handleClose}
                                        intensity="medium"
                                        style={{ marginTop: 24, backgroundColor: '#2D666B', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 20 }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Fertig</Text>
                                    </PressableScale>
                                </MotiView>
                            ) : (
                                <>
                                    {/* Info Banner */}
                                    <View style={{ backgroundColor: '#EEF4F3', borderRadius: 16, padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                        <Key size={18} color="#2D666B" style={{ marginTop: 1 }} />
                                        <Text style={{ flex: 1, color: '#1F4B6E', fontWeight: '600', fontSize: 13, lineHeight: 19 }}>
                                            Mit E-Mail-Adresse: Klient erhält automatisch eine E-Mail zum Passwort setzen und kann sich sofort einloggen.{'\n'}
                                            Ohne E-Mail: Es wird eine Offline-Akte angelegt.
                                        </Text>
                                    </View>

                                    {/* Error Banner */}
                                    {formError && (
                                        <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 }}>
                                            <AlertCircle size={18} color="#DC2626" />
                                            <Text style={{ color: '#DC2626', fontWeight: '600', flex: 1 }}>{formError}</Text>
                                        </MotiView>
                                    )}

                                    {/* Form Fields */}
                                    <View style={{ gap: 16 }}>
                                        <View>
                                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#56636B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Vorname *</Text>
                                            <TextInput
                                                style={{ backgroundColor: '#F5F1EA', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#1F2528', fontWeight: '500' }}
                                                placeholder="Max"
                                                placeholderTextColor="#8B938E"
                                                value={firstName}
                                                onChangeText={setFirstName}
                                            />
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#56636B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Nachname *</Text>
                                            <TextInput
                                                style={{ backgroundColor: '#F5F1EA', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#1F2528', fontWeight: '500' }}
                                                placeholder="Mustermann"
                                                placeholderTextColor="#8B938E"
                                                value={lastName}
                                                onChangeText={setLastName}
                                            />
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#56636B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>E-Mail (für App-Zugang)</Text>
                                            <TextInput
                                                style={{ backgroundColor: '#F5F1EA', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#1F2528', fontWeight: '500' }}
                                                placeholder="max@beispiel.de"
                                                placeholderTextColor="#8B938E"
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                value={email}
                                                onChangeText={setEmail}
                                            />
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#56636B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Geburtsdatum (Optional)</Text>
                                            <TextInput
                                                style={{ backgroundColor: '#F5F1EA', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#1F2528', fontWeight: '500' }}
                                                placeholder="TT.MM.JJJJ"
                                                placeholderTextColor="#8B938E"
                                                value={birthDate}
                                                onChangeText={(value) => setBirthDate(formatBirthDateInput(value))}
                                                keyboardType="numbers-and-punctuation"
                                                maxLength={10}
                                            />
                                        </View>
                                    </View>

                                    {/* Action Buttons */}
                                    <View style={{ marginTop: 24, gap: 12 }}>
                                        {email.trim() ? (
                                            <PressableScale
                                                onPress={handleCreateWithAccount}
                                                disabled={loading || !firstName.trim() || !lastName.trim()}
                                                intensity="medium"
                                                style={{ backgroundColor: (!firstName.trim() || !lastName.trim()) ? '#E2E8F0' : '#2D666B', padding: 18, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator color="white" />
                                                ) : (
                                                    <>
                                                        <Mail size={20} color={(!firstName.trim() || !lastName.trim()) ? '#607078' : 'white'} />
                                                        <Text style={{ color: (!firstName.trim() || !lastName.trim()) ? '#607078' : 'white', fontWeight: '800', fontSize: 16 }}>Account anlegen & E-Mail senden</Text>
                                                    </>
                                                )}
                                            </PressableScale>
                                        ) : (
                                            <PressableScale
                                                onPress={handleCreateOfflineProfile}
                                                disabled={loading || !firstName.trim() || !lastName.trim()}
                                                intensity="medium"
                                                style={{ backgroundColor: (!firstName.trim() || !lastName.trim()) ? '#E2E8F0' : '#6F7472', padding: 18, borderRadius: 18, alignItems: 'center' }}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator color="white" />
                                                ) : (
                                                    <Text style={{ color: (!firstName.trim() || !lastName.trim()) ? '#607078' : 'white', fontWeight: '800', fontSize: 16 }}>Offline-Akte erstellen</Text>
                                                )}
                                            </PressableScale>
                                        )}
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    )}

                    {/* Tab Content: Invite Code */}
                    {activeTab === 'invite' && (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
                            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0F9FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                <Share2 size={32} color="#4E7E82" />
                            </View>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#1F2528', textAlign: 'center', marginBottom: 8 }}>Einladungscode generieren</Text>
                            <Text style={{ color: '#55636B', textAlign: 'center', fontWeight: '600', lineHeight: 22, maxWidth: 300, marginBottom: 28 }}>
                                {offlineProfile
                                    ? `Generiere einen Code für ${offlineProfile.firstName} ${offlineProfile.lastName}. Er verknüpft den neuen Account mit der bisherigen Akte.`
                                    : 'Dein Klient gibt den Code bei der Registrierung ein und wird direkt mit dir verbunden.'}
                            </Text>

                            {generatedCode ? (
                                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', alignItems: 'center' }}>
                                    <View style={{ backgroundColor: '#F0F9FF', borderWidth: 2, borderColor: '#BAE6FD', borderStyle: 'dashed', paddingHorizontal: 32, paddingVertical: 24, borderRadius: 24, marginBottom: 20, width: '100%', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 48, fontWeight: '900', color: '#245B60', letterSpacing: 8 }}>{generatedCode}</Text>
                                    </View>
                                    <PressableScale
                                        onPress={handleShareCode}
                                        intensity="medium"
                                        style={{ backgroundColor: '#2D666B', width: '100%', padding: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    >
                                        <Copy size={20} color="white" />
                                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Code teilen / kopieren</Text>
                                    </PressableScale>
                                </MotiView>
                            ) : (
                                <PressableScale
                                    onPress={handleGenerateLink}
                                    disabled={loading}
                                    intensity="medium"
                                    style={{ backgroundColor: '#2D666B', width: '100%', padding: 18, borderRadius: 18, alignItems: 'center' }}
                                >
                                    {loading ? <ActivityIndicator color="white" /> : (
                                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Code generieren</Text>
                                    )}
                                </PressableScale>
                            )}
                        </View>
                    )}
                </MotiView>
            </KeyboardAvoidingView>
        </Modal>
    );
}


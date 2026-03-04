import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ActivityIndicator, Share, Alert, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { X, Copy, Share2, UserPlus, Link as LinkIcon, Mail, Key, CheckCircle2 } from 'lucide-react-native';
import { createInvitation } from '../../services/invitationService';
import { ClientService } from '../../services/clientService';
import { ErrorHandler } from '../../utils/errors';

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
            Alert.alert('Fehler', 'Bitte Vor- und Nachname eingeben.');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Fehler', 'Bitte E-Mail-Adresse eingeben, um einen Zugang zu erstellen.');
            return;
        }

        setLoading(true);
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
            Alert.alert('Fehler', message);
        } finally {
            setLoading(false);
        }
    };

    /** Creates an offline profile WITHOUT a login account. */
    const handleCreateOfflineProfile = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            Alert.alert('Fehler', 'Bitte Vor- und Nachname eingeben.');
            return;
        }

        setLoading(true);
        try {
            await ClientService.createOfflineProfile({
                firstName,
                lastName,
                email,
                birthDate,
                therapistId
            });

            Alert.alert('Erfolg', 'Offline-Akte wurde erfolgreich angelegt.');
            onClientAdded();
            onClose();
        } catch (error) {
            console.error('Error creating offline client:', error);
            Alert.alert('Fehler', 'Klient konnte nicht angelegt werden.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateLink = async () => {
        setLoading(true);
        try {
            const profileId = offlineProfile ? offlineProfile.id : undefined;
            const code = await createInvitation(therapistId, profileId);
            setGeneratedCode(code);
        } catch (error) {
            console.error('Error generating invitation:', error);
            Alert.alert('Fehler', 'Einladungscode konnte nicht generiert werden.');
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
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <MotiView
                    from={{ translateY: 400 }}
                    animate={{ translateY: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, width: '100%', maxWidth: 640, alignSelf: 'center', maxHeight: '92%' }}
                >
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#243842', letterSpacing: -0.5 }}>
                            {offlineProfile ? 'Profil verknüpfen' : 'Neuer Klient'}
                        </Text>
                        <TouchableOpacity onPress={handleClose} style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 20 }}>
                            <X size={22} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs — only show if not linking an offline profile */}
                    {!offlineProfile && (
                        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 4, borderRadius: 20, marginBottom: 24 }}>
                            <TouchableOpacity
                                onPress={() => setActiveTab('manual')}
                                style={{ flex: 1, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: activeTab === 'manual' ? 'white' : 'transparent' }}
                            >
                                <UserPlus size={16} color={activeTab === 'manual' ? '#137386' : '#64748B'} />
                                <Text style={{ fontWeight: '700', color: activeTab === 'manual' ? '#137386' : '#64748B', fontSize: 14 }}>Klient anlegen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('invite')}
                                style={{ flex: 1, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: activeTab === 'invite' ? 'white' : 'transparent' }}
                            >
                                <LinkIcon size={16} color={activeTab === 'invite' ? '#137386' : '#64748B'} />
                                <Text style={{ fontWeight: '700', color: activeTab === 'invite' ? '#137386' : '#64748B', fontSize: 14 }}>Einladungscode</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Tab Content: Manual Create */}
                    {activeTab === 'manual' && !offlineProfile && (
                        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                            {/* Success State */}
                            {createdAccount ? (
                                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ alignItems: 'center', padding: 24 }}>
                                    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <CheckCircle2 size={36} color="#10B981" />
                                    </View>
                                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#243842', textAlign: 'center', marginBottom: 8 }}>Klient angelegt!</Text>
                                    <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 16, lineHeight: 22 }}>
                                        Der Account für{'\n'}
                                        <Text style={{ fontWeight: '800', color: '#137386' }}>{createdAccount.email}</Text>
                                        {'\n'}wurde erfolgreich erstellt.
                                    </Text>
                                    {createdAccount.resetSent ? (
                                        <View style={{ backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: '#BFDBFE' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <Mail size={20} color="#2563EB" />
                                                <Text style={{ flex: 1, color: '#1D4ED8', fontWeight: '700', fontSize: 14 }}>
                                                    Eine E-Mail mit dem Link zum Passwort-Setzen wurde verschickt.
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={{ backgroundColor: '#FEF3C7', borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: '#FDE68A' }}>
                                            <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 14 }}>
                                                ⚠ Die Willkommens-E-Mail konnte nicht versendet werden. Bitte teile dem Klienten den Zugang manuell mit.
                                            </Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        onPress={handleClose}
                                        style={{ marginTop: 24, backgroundColor: '#137386', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 20 }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Fertig</Text>
                                    </TouchableOpacity>
                                </MotiView>
                            ) : (
                                <>
                                    {/* Info Banner */}
                                    <View style={{ backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                        <Key size={18} color="#2563EB" style={{ marginTop: 1 }} />
                                        <Text style={{ flex: 1, color: '#1D4ED8', fontWeight: '600', fontSize: 13, lineHeight: 19 }}>
                                            Mit E-Mail-Adresse: Klient erhält automatisch eine E-Mail zum Passwort setzen und kann sich sofort einloggen.{'\n'}
                                            Ohne E-Mail: Es wird eine Offline-Akte angelegt.
                                        </Text>
                                    </View>

                                    {/* Form Fields */}
                                    <View style={{ gap: 16 }}>
                                        <View>
                                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Vorname *</Text>
                                            <TextInput
                                                style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#243842', fontWeight: '500' }}
                                                placeholder="Max"
                                                placeholderTextColor="#94A3B8"
                                                value={firstName}
                                                onChangeText={setFirstName}
                                            />
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Nachname *</Text>
                                            <TextInput
                                                style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#243842', fontWeight: '500' }}
                                                placeholder="Mustermann"
                                                placeholderTextColor="#94A3B8"
                                                value={lastName}
                                                onChangeText={setLastName}
                                            />
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>E-Mail (für App-Zugang)</Text>
                                            <TextInput
                                                style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#243842', fontWeight: '500' }}
                                                placeholder="max@beispiel.de"
                                                placeholderTextColor="#94A3B8"
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                value={email}
                                                onChangeText={setEmail}
                                            />
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Geburtsdatum (Optional)</Text>
                                            <TextInput
                                                style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#243842', fontWeight: '500' }}
                                                placeholder="TT.MM.JJJJ"
                                                placeholderTextColor="#94A3B8"
                                                value={birthDate}
                                                onChangeText={setBirthDate}
                                            />
                                        </View>
                                    </View>

                                    {/* Action Buttons */}
                                    <View style={{ marginTop: 24, gap: 12 }}>
                                        {email.trim() ? (
                                            <TouchableOpacity
                                                onPress={handleCreateWithAccount}
                                                disabled={loading || !firstName.trim() || !lastName.trim()}
                                                style={{ backgroundColor: (!firstName.trim() || !lastName.trim()) ? '#E2E8F0' : '#137386', padding: 18, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator color="white" />
                                                ) : (
                                                    <>
                                                        <Mail size={20} color="white" />
                                                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Account anlegen & E-Mail senden</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                onPress={handleCreateOfflineProfile}
                                                disabled={loading || !firstName.trim() || !lastName.trim()}
                                                style={{ backgroundColor: (!firstName.trim() || !lastName.trim()) ? '#E2E8F0' : '#64748B', padding: 18, borderRadius: 18, alignItems: 'center' }}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator color="white" />
                                                ) : (
                                                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Offline-Akte erstellen</Text>
                                                )}
                                            </TouchableOpacity>
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
                                <Share2 size={32} color="#0EA5E9" />
                            </View>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#243842', textAlign: 'center', marginBottom: 8 }}>Einladungscode generieren</Text>
                            <Text style={{ color: '#64748B', textAlign: 'center', fontWeight: '600', lineHeight: 22, maxWidth: 300, marginBottom: 28 }}>
                                {offlineProfile
                                    ? `Generiere einen Code für ${offlineProfile.firstName} ${offlineProfile.lastName}. Er verknüpft den neuen Account mit der bisherigen Akte.`
                                    : 'Dein Klient gibt den Code bei der Registrierung ein und wird direkt mit dir verbunden.'}
                            </Text>

                            {generatedCode ? (
                                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', alignItems: 'center' }}>
                                    <View style={{ backgroundColor: '#F0F9FF', borderWidth: 2, borderColor: '#BAE6FD', borderStyle: 'dashed', paddingHorizontal: 32, paddingVertical: 24, borderRadius: 24, marginBottom: 20, width: '100%', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 48, fontWeight: '900', color: '#0EA5E9', letterSpacing: 8 }}>{generatedCode}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={handleShareCode}
                                        style={{ backgroundColor: '#137386', width: '100%', padding: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    >
                                        <Copy size={20} color="white" />
                                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Code teilen / kopieren</Text>
                                    </TouchableOpacity>
                                </MotiView>
                            ) : (
                                <TouchableOpacity
                                    onPress={handleGenerateLink}
                                    disabled={loading}
                                    style={{ backgroundColor: '#137386', width: '100%', padding: 18, borderRadius: 18, alignItems: 'center' }}
                                >
                                    {loading ? <ActivityIndicator color="white" /> : (
                                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Code generieren</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </MotiView>
            </View>
        </Modal>
    );
}
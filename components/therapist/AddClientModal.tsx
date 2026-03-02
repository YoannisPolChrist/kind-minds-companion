import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ActivityIndicator, Share, Clipboard, Alert } from 'react-native';
import { MotiView } from 'moti';
import { X, Copy, Share2, UserPlus, Link as LinkIcon } from 'lucide-react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { createInvitation } from '../../services/invitationService';

interface AddClientModalProps {
    visible: boolean;
    onClose: () => void;
    therapistId: string;
    onClientAdded: () => void;
}

export default function AddClientModal({ visible, onClose, therapistId, onClientAdded }: AddClientModalProps) {
    const [activeTab, setActiveTab] = useState<'manual' | 'invite'>('manual');
    const [loading, setLoading] = useState(false);

    // Manual Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState(''); // Optional for offline profiles
    const [birthDate, setBirthDate] = useState(''); // Simple string for now, could be improved with a date picker

    // Invite State
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    const handleManualCreate = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            Alert.alert('Fehler', 'Bitte Vor- und Nachname eingeben.');
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'users'), {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim() || null,
                birthDate: birthDate.trim() || null,
                role: 'client',
                therapistId,
                isOfflineProfile: true,
                createdAt: serverTimestamp()
            });

            Alert.alert('Erfolg', 'Offline-Akte wurde erfolgreich angelegt.');
            onClientAdded();
            handleClose();
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
            const code = await createInvitation(therapistId);
            setGeneratedCode(code);
        } catch (error) {
            console.error('Error generating invitation:', error);
            Alert.alert('Fehler', 'Einladungscode konnte nicht generiert werden.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (generatedCode) {
            // Note: In Expo, using expo-clipboard is preferred, but React Native Clipboard works for simple use cases
            // Assuming Clipboard is available or we can just use Share
            Share.share({
                message: `Lade dir die Therapie-App herunter und nutze diesen Einladungscode, um dich mit mir zu verbinden: ${generatedCode}`
            });
        }
    };

    const handleClose = () => {
        setFirstName('');
        setLastName('');
        setEmail('');
        setBirthDate('');
        setGeneratedCode(null);
        setActiveTab('manual');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View className="flex-1 justify-end bg-black/40">
                <MotiView
                    from={{ translateY: 400 }}
                    animate={{ translateY: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="bg-white rounded-t-[32px] p-6 w-full max-w-2xl mx-auto h-[80%]"
                >
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-black text-[#243842] tracking-tight">Neuer Klient</Text>
                        <TouchableOpacity onPress={handleClose} className="bg-gray-100 p-2 rounded-full">
                            <X size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View className="flex-row bg-gray-100 p-1 rounded-2xl mb-8">
                        <TouchableOpacity
                            onPress={() => setActiveTab('manual')}
                            className={`flex-1 py-3 rounded-xl flex-row justify-center items-center gap-2 ${activeTab === 'manual' ? 'bg-white shadow-sm' : ''}`}
                        >
                            <UserPlus size={18} color={activeTab === 'manual' ? '#137386' : '#64748B'} />
                            <Text className={`font-bold ${activeTab === 'manual' ? 'text-[#137386]' : 'text-[#64748B]'}`}>Manuell anlegen</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('invite')}
                            className={`flex-1 py-3 rounded-xl flex-row justify-center items-center gap-2 ${activeTab === 'invite' ? 'bg-white shadow-sm' : ''}`}
                        >
                            <LinkIcon size={18} color={activeTab === 'invite' ? '#137386' : '#64748B'} />
                            <Text className={`font-bold ${activeTab === 'invite' ? 'text-[#137386]' : 'text-[#64748B]'}`}>Einladungscode</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tab Content: Manual */}
                    {activeTab === 'manual' && (
                        <View className="flex-1">
                            <Text className="text-[#64748B] font-medium mb-6">
                                Lege eine Offline-Akte an, um Übungen und Notizen für einen Klienten zu verwalten, der die App (noch) nicht nutzt.
                            </Text>

                            <View className="gap-4">
                                <View>
                                    <Text className="text-[13px] font-bold text-[#64748B] uppercase tracking-wider mb-2 ml-1">Vorname *</Text>
                                    <TextInput
                                        className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl text-base font-medium text-[#243842]"
                                        placeholder="Max"
                                        placeholderTextColor="#94A3B8"
                                        value={firstName}
                                        onChangeText={setFirstName}
                                    />
                                </View>
                                <View>
                                    <Text className="text-[13px] font-bold text-[#64748B] uppercase tracking-wider mb-2 ml-1">Nachname *</Text>
                                    <TextInput
                                        className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl text-base font-medium text-[#243842]"
                                        placeholder="Mustermann"
                                        placeholderTextColor="#94A3B8"
                                        value={lastName}
                                        onChangeText={setLastName}
                                    />
                                </View>
                                <View>
                                    <Text className="text-[13px] font-bold text-[#64748B] uppercase tracking-wider mb-2 ml-1">E-Mail (Optional)</Text>
                                    <TextInput
                                        className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl text-base font-medium text-[#243842]"
                                        placeholder="max@beispiel.de"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>
                                <View>
                                    <Text className="text-[13px] font-bold text-[#64748B] uppercase tracking-wider mb-2 ml-1">Geburtsdatum (Optional)</Text>
                                    <TextInput
                                        className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl text-base font-medium text-[#243842]"
                                        placeholder="TT.MM.JJJJ"
                                        placeholderTextColor="#94A3B8"
                                        value={birthDate}
                                        onChangeText={setBirthDate}
                                    />
                                </View>
                            </View>

                            <View className="mt-auto pt-6">
                                <TouchableOpacity
                                    onPress={handleManualCreate}
                                    disabled={loading || !firstName.trim() || !lastName.trim()}
                                    className={`p-4 rounded-2xl items-center justify-center flex-row ${(!firstName.trim() || !lastName.trim()) ? 'bg-gray-200' : 'bg-[#137386]'}`}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text className={`font-bold text-lg ${(!firstName.trim() || !lastName.trim()) ? 'text-gray-400' : 'text-white'}`}>
                                            Offline-Akte erstellen
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Tab Content: Invite */}
                    {activeTab === 'invite' && (
                        <View className="flex-1 items-center justify-center py-8">
                            <View className="w-20 h-20 bg-sky-50 rounded-full items-center justify-center mb-6">
                                <Share2 size={32} color="#0EA5E9" />
                            </View>
                            <Text className="text-2xl font-black text-[#243842] text-center mb-4">Einladungscode generieren</Text>
                            <Text className="text-[#64748B] text-center font-medium leading-relaxed max-w-[300px] mb-8">
                                Generiere einen 6-stelligen Code. Dein Klient kann diesen bei der Registrierung in der App eingeben, um sich direkt mit dir zu verbinden.
                            </Text>

                            {generatedCode ? (
                                <MotiView
                                    from={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full items-center"
                                >
                                    <View className="bg-sky-50 border-2 border-sky-200 border-dashed px-8 py-6 rounded-3xl mb-6 w-full items-center">
                                        <Text className="text-5xl font-black text-[#0EA5E9] tracking-[8px]">{generatedCode}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={handleCopyCode}
                                        className="bg-[#137386] w-full p-4 rounded-2xl items-center justify-center flex-row gap-2"
                                    >
                                        <Copy size={20} color="#fff" />
                                        <Text className="text-white font-bold text-lg">Code teilen / kopieren</Text>
                                    </TouchableOpacity>
                                </MotiView>
                            ) : (
                                <TouchableOpacity
                                    onPress={handleGenerateLink}
                                    disabled={loading}
                                    className="bg-[#137386] w-full p-4 rounded-2xl items-center justify-center"
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text className="text-white font-bold text-lg">Code generieren</Text>
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
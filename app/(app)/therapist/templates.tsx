import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { collection, query, getDocs, deleteDoc, doc, limit, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import { useRouter } from 'expo-router';
import i18n from '../../../utils/i18n';
import { MotiView } from 'moti';
import { Search, Plus, Trash2, Send, X, FileText } from 'lucide-react-native';

export default function TherapistTemplates() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Assignment Mock State
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedTemplateForAssign, setSelectedTemplateForAssign] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]); // To be populated from TherapistDashboard context

    const router = useRouter();

    useEffect(() => {
        fetchTemplates();
        fetchClientsForAssignment();
    }, []);

    const fetchClientsForAssignment = async () => {
        // Pulls active clients so the therapist can pick who gets the template
        try {
            const q = query(collection(db, "users"));
            const querySnapshot = await getDocs(q);
            const rawClients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((c: any) => c.role === 'client');

            // Phase 7 Mock Client Logic Fallback
            if (rawClients.length === 0) {
                setClients([{ id: "mock_client_123", firstName: "Max", lastName: "Mustermann (Beispiel-Klient)" }]);
            } else {
                setClients(rawClients);
            }
        } catch (e) {
            console.error("Error fetching clients for modal", e);
        }
    };

    const fetchTemplates = async () => {
        try {
            const q = query(collection(db, "exercise_templates"), limit(50));
            const querySnapshot = await getDocs(q);
            const templateData: any[] = [];
            querySnapshot.forEach((doc) => {
                templateData.push({ id: doc.id, ...doc.data() });
            });
            const activeTemplates = templateData.filter(t => !t.archived);
            setTemplates(activeTemplates);
            setFilteredTemplates(activeTemplates);
        } catch (error) {
            console.error("Error fetching templates:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setFilteredTemplates(templates);
        } else {
            const lowercasedQuery = text.toLowerCase();
            const filtered = templates.filter(t =>
                t.title?.toLowerCase().includes(lowercasedQuery) ||
                t.blocks?.some((b: any) => b.content?.toLowerCase().includes(lowercasedQuery))
            );
            setFilteredTemplates(filtered);
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert(
            i18n.t('templates.delete_title'),
            i18n.t('templates.delete_confirm'),
            [
                { text: i18n.t('therapist.cancel'), style: "cancel" },
                {
                    text: i18n.t('templates.delete_btn'),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await updateDoc(doc(db, "exercise_templates", id), { archived: true });
                            const updated = templates.filter(t => t.id !== id);
                            setTemplates(updated);
                            handleSearch(searchQuery); // trigger re-filter
                        } catch (error) {
                            Alert.alert("Fehler", i18n.t('templates.delete_err'));
                        }
                    }
                }
            ]
        );
    };

    const openAssignModal = (template: any) => {
        setSelectedTemplateForAssign(template);
        setAssignModalVisible(true);
    };

    const confirmAssignToClient = async (clientId: string) => {
        if (!selectedTemplateForAssign) return;
        try {
            // Create a new exercise document for the specific client based on the template
            const newExerciseRef = doc(collection(db, "exercises"));
            await setDoc(newExerciseRef, {
                title: selectedTemplateForAssign.title,
                blocks: selectedTemplateForAssign.blocks || [],
                clientId: clientId,
                completed: false,
                assignedAt: new Date().toISOString(),
            });

            setAssignModalVisible(false);
            Alert.alert("Zuweisung Erfolgreich", `Die Vorlage "${selectedTemplateForAssign.title}" wurde dem Klienten zugewiesen.`);
        } catch (e) {
            Alert.alert("Fehler", "Zuweisung fehlgeschlagen.");
            console.error(e);
        }
    };

    const renderTemplateItem = ({ item, index }: { item: any, index: number }) => (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: index * 50 }}
            className="bg-white p-5 rounded-3xl mb-4 shadow-sm border border-gray-100 mx-6 overflow-hidden"
        >
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-4">
                    <Text className="text-xl font-extrabold text-[#243842] mb-1">{item.title}</Text>
                    <View className="flex-row items-center">
                        <FileText size={14} color="#C09D59" />
                        <Text className="text-gray-500 font-medium text-sm ml-1.5">{item.blocks?.length || 0} Module</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} className="bg-red-50 p-2.5 rounded-xl">
                    <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <View className="flex-row gap-3">
                <TouchableOpacity
                    className="bg-[#F9F8F6] border border-gray-100 flex-1 py-3.5 rounded-2xl items-center justify-center flex-row"
                    onPress={() => router.push(`/(app)/therapist/template/${item.id}` as any)}
                >
                    <Text className="text-[#243842] font-bold text-[15px]">{i18n.t('templates.edit')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="bg-[#137386] flex-1 py-3.5 rounded-2xl shadow-sm items-center justify-center flex-row"
                    onPress={() => openAssignModal(item)}
                >
                    <Send size={16} color="white" className="mr-2" />
                    <Text className="text-white font-extrabold text-[15px]">Zuweisen</Text>
                </TouchableOpacity>
            </View>
        </MotiView>
    );

    return (
        <View className="flex-1 bg-[#FAF9F6]">
            {/* Header Section matching index.tsx premium colors */}
            <MotiView
                className="bg-[#137386] pt-16 pb-8 px-6 rounded-b-[40px] z-10 shadow-lg"
                style={{ paddingTop: Platform.OS === 'android' ? 48 : 56 }}
            >
                <View className="flex-row items-center justify-between mb-6">
                    <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2.5 rounded-2xl backdrop-blur-md">
                        <Text className="text-white font-bold">{i18n.t('exercise.back')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/(app)/therapist/template/new')} className="bg-white/20 px-4 py-2.5 rounded-2xl flex-row items-center">
                        <Plus size={18} color="white" className="mr-1" />
                        <Text className="text-white font-bold">{i18n.t('templates.new')}</Text>
                    </TouchableOpacity>
                </View>

                <Text className="text-3xl font-black text-white tracking-tight mb-4">{i18n.t('templates.title')}</Text>

                {/* Search Bar */}
                <View className="flex-row items-center bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
                    <Search size={20} color="rgba(255,255,255,0.7)" />
                    <TextInput
                        placeholder="Vorlagen durchsuchen..."
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        className="flex-1 text-white font-medium ml-3 text-[16px]"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <X size={20} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    )}
                </View>
            </MotiView>

            <View className="flex-1 mt-6">
                {loading ? (
                    <ActivityIndicator size="large" color="#137386" className="mt-10" />
                ) : filteredTemplates.length === 0 ? (
                    <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm items-center mx-6 mt-4">
                        <View className="w-16 h-16 bg-[#F9F8F6] rounded-full items-center justify-center mb-4">
                            <Text className="text-2xl">📋</Text>
                        </View>
                        <Text className="text-[#243842] font-black text-lg text-center mb-2">Keine Vorlagen gefunden</Text>
                        <Text className="text-[#243842]/60 text-center font-medium leading-5">
                            Erstelle neue interaktive Therapie-Bausteine oder passe deinen Suchfilter an.
                        </Text>
                    </MotiView>
                ) : (
                    <FlatList
                        data={filteredTemplates}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTemplateItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                    />
                )}
            </View>

            {/* Assignment Modal */}
            <Modal visible={assignModalVisible} transparent animationType="slide">
                <View className="flex-1 justify-end bg-black/40">
                    <View className="bg-white rounded-t-3xl pt-6 pb-12 px-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-black text-[#243842]">Klient Zuweisen</Text>
                            <TouchableOpacity onPress={() => setAssignModalVisible(false)} className="bg-gray-100 p-2 rounded-full">
                                <X size={20} color="#243842" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-gray-500 font-medium mb-4">Wähle einen aktiven Klienten aus, um die Übung "{selectedTemplateForAssign?.title}" in deren Dashboard zu kopieren.</Text>

                        <FlatList
                            data={clients}
                            keyExtractor={(c) => c.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => confirmAssignToClient(item.id)}
                                    className="bg-[#F9F8F6] p-4 rounded-xl border border-gray-100 mb-2 flex-row items-center justify-between"
                                >
                                    <Text className="font-bold text-[#243842] text-base">{item.firstName} {item.lastName}</Text>
                                    <Send size={18} color="#137386" />
                                </TouchableOpacity>
                            )}
                            style={{ maxHeight: 300 }}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

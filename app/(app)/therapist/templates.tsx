import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, Modal, ScrollView, useWindowDimensions, Image } from 'react-native';
import { useEffect, useState } from 'react';
import React from 'react';
import { collection, query, getDocs, deleteDoc, doc, limit, updateDoc, setDoc, where } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import { useRouter, useFocusEffect } from 'expo-router';
import i18n from '../../../utils/i18n';
import { MotiView } from 'moti';
import { Search, Plus, Trash2, Send, X, FileText, Sparkles, LayoutTemplate, Palette } from 'lucide-react-native';
import { DarkAmbientOrbs } from '../../../components/ui/AmbientOrbs';
import { SuccessAnimation } from '../../../components/ui/SuccessAnimation';

const THEME_COLORS = ['#137386', '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#10B981', '#64748B'];

export default function TherapistTemplates() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Assignment Mock State
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedTemplateForAssign, setSelectedTemplateForAssign] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]); // To be populated from TherapistDashboard context

    // Modals state
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<any>(null);
    
    const [colorModalVisible, setColorModalVisible] = useState(false);
    const [templateToColor, setTemplateToColor] = useState<any>(null);

    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;

    useFocusEffect(
        React.useCallback(() => {
            fetchTemplates();
            fetchClientsForAssignment();
        }, [])
    );

    const fetchClientsForAssignment = async () => {
        try {
            const q = query(collection(db, "users"), where("role", "==", "client"));
            const querySnapshot = await getDocs(q);
            const rawClients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

    const confirmDeleteTemplate = async () => {
        if (!templateToDelete) return;
        try {
            await updateDoc(doc(db, "exercise_templates", templateToDelete.id), { archived: true });
            setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
            setFilteredTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
            setDeleteModalVisible(false);
            setTemplateToDelete(null);
        } catch (error) {
            Alert.alert("Fehler", i18n.t('templates.delete_err'));
        }
    };

    const handleDelete = (template: any) => {
        setTemplateToDelete(template);
        setDeleteModalVisible(true);
    };

    const handleUpdateThemeColor = async (color: string) => {
        if (!templateToColor) return;
        try {
            await updateDoc(doc(db, "exercise_templates", templateToColor.id), { themeColor: color });
            setTemplates(prev => prev.map(t => t.id === templateToColor.id ? { ...t, themeColor: color } : t));
            setFilteredTemplates(prev => prev.map(t => t.id === templateToColor.id ? { ...t, themeColor: color } : t));
            setColorModalVisible(false);
            setTemplateToColor(null);
        } catch (error) {
            Alert.alert("Fehler", "Farbe konnte nicht aktualisiert werden.");
        }
    };

    const openAssignModal = (template: any) => {
        setSelectedTemplateForAssign(template);
        setAssignModalVisible(true);
    };

    const confirmAssignToClient = async (clientId: string) => {
        if (!selectedTemplateForAssign) return;
        try {
            const newExerciseRef = doc(collection(db, "exercises"));
            await setDoc(newExerciseRef, {
                title: selectedTemplateForAssign.title,
                blocks: selectedTemplateForAssign.blocks || [],
                clientId: clientId,
                completed: false,
                assignedAt: new Date().toISOString(),
            });

            setAssignModalVisible(false);
            setSuccessMessage(`Die Vorlage "${selectedTemplateForAssign.title}" wurde zugewiesen.`);
            setShowSuccess(true);
        } catch (e) {
            if (Platform.OS === 'web') window.alert("Zuweisung fehlgeschlagen.");
            else Alert.alert("Fehler", "Zuweisung fehlgeschlagen.");
            console.error(e);
        }
    };

    const renderTemplateItem = ({ item, index }: { item: any, index: number }) => {
        const themeColor = item.themeColor || '#6366F1'; // Default to Indigo if not set

        return (
            <MotiView
                key={item.id}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 350, delay: index * 50 }}
                style={{
                    backgroundColor: '#ffffff',
                    padding: 28,
                    borderRadius: 32,
                    borderWidth: 2,
                    borderColor: `${themeColor}40`,
                    shadowColor: '#243842',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.05,
                    shadowRadius: 24,
                    elevation: 4,
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flex: 1,
                    minWidth: isDesktop ? 340 : '100%',
                    maxWidth: isDesktop ? '48%' : '100%',
                }}
            >
                <View className="mb-8">
                    {item.coverImage ? (
                        <View className="w-full h-32 rounded-[20px] overflow-hidden mb-6 bg-gray-100/50 border border-gray-100">
                            <Image source={{ uri: item.coverImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </View>
                    ) : null}
                    <View className="flex-row justify-between items-start">
                        <View className="flex-1 pr-4">
                            <View className="w-14 h-14 rounded-[20px] items-center justify-center mb-4 border" style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}40` }}>
                                <LayoutTemplate size={24} color={themeColor} />
                            </View>
                            <Text className="text-[22px] font-black text-[#243842] mb-3 leading-tight tracking-tight">{item.title}</Text>
                            <View className="flex-row items-center bg-gray-50 px-3 py-1.5 rounded-xl self-start border border-gray-100">
                                <FileText size={14} color="#6B7280" />
                                <Text className="text-gray-600 font-bold text-[13px] ml-2">{item.blocks?.length || 0} Module</Text>
                            </View>
                        </View>
                        <View
                            style={{
                                backgroundColor: 'rgba(249, 248, 246, 0.9)',
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: 'rgba(36, 56, 66, 0.07)',
                                padding: 6,
                                gap: 6,
                                shadowColor: '#243842',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.06,
                                shadowRadius: 12,
                                elevation: 2,
                                alignItems: 'center',
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => handleDelete(item)}
                                style={{
                                    width: 40, height: 40, borderRadius: 14,
                                    backgroundColor: '#FEF2F2',
                                    borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <Trash2 size={18} color="#EF4444" />
                            </TouchableOpacity>
                            <View style={{ width: 28, height: 1, backgroundColor: 'rgba(36,56,66,0.06)' }} />
                            <TouchableOpacity
                                onPress={() => { setTemplateToColor(item); setColorModalVisible(true); }}
                                style={{
                                    width: 40, height: 40, borderRadius: 14,
                                    backgroundColor: `${themeColor}15`,
                                    borderWidth: 1, borderColor: `${themeColor}25`,
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <Palette size={18} color={themeColor} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View className="flex-row gap-3 pt-5 border-t border-gray-50">
                    <TouchableOpacity
                        className="bg-[#F9F8F6] border border-gray-100 flex-1 py-4 rounded-[20px] items-center justify-center flex-row"
                        onPress={() => router.push(`/(app)/therapist/template/${item.id}` as any)}
                    >
                        <Text className="text-[#243842] font-black text-[15px]">{i18n.t('templates.edit')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-[#137386] flex-1 py-4 rounded-[20px] items-center justify-center flex-row"
                        style={{ shadowColor: '#137386', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 }}
                        onPress={() => openAssignModal(item)}
                    >
                        <Send size={18} color="white" className="mr-2" />
                        <Text className="text-white font-black text-[15px]">Zuweisen</Text>
                    </TouchableOpacity>
                </View>
            </MotiView>
        );
    };

    return (
        <View className="flex-1 bg-[#F9F8F6]">
            {/* Premium Header matching Dashboard */}
            <MotiView
                from={{ opacity: 0, translateY: -40 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 350, delay: 50 }}
                style={{
                    backgroundColor: '#137386',
                    paddingTop: Platform.OS === 'android' ? 48 : 56,
                    paddingBottom: 40,
                    paddingHorizontal: 24,
                    borderBottomLeftRadius: 40,
                    borderBottomRightRadius: 40,
                    overflow: 'hidden',
                    zIndex: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.2,
                    shadowRadius: 16,
                    elevation: 10,
                }}
            >
                <DarkAmbientOrbs />

                <View style={{ zIndex: 10, width: '100%', maxWidth: 1024, marginHorizontal: 'auto' }} pointerEvents="box-none">
                    <View className="flex-row items-center justify-between mb-8">
                        <TouchableOpacity onPress={() => router.back()} className="bg-white/10 px-4 py-3 rounded-[16px] backdrop-blur-md border border-white/10">
                            <Text className="text-white font-bold">{i18n.t('exercise.back')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/(app)/therapist/template/new')} className="bg-white px-5 py-3 rounded-[16px] flex-row items-center shadow-lg">
                            <Plus size={18} color="#137386" className="mr-1.5" strokeWidth={3} />
                            <Text className="text-[#137386] font-black text-[15px]">{i18n.t('templates.new')}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text className="text-[32px] font-black text-white tracking-tight mb-2">{i18n.t('templates.title')}</Text>
                    <Text className="text-white/70 font-medium text-[15px] mb-8">Erstelle und verwalte interaktive Vorlagen für deine Klienten.</Text>

                    {/* Search Bar - Glassmorphism */}
                    <View className="flex-row items-center bg-white/10 border border-white/20 rounded-[20px] px-5 py-4 backdrop-blur-md">
                        <Search size={22} color="rgba(255,255,255,0.7)" />
                        <TextInput
                            placeholder="Vorlagen durchsuchen..."
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            className="flex-1 text-white font-bold ml-3 text-[16px]"
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')} className="bg-white/10 p-2 rounded-full">
                                <X size={16} color="rgba(255,255,255,0.9)" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </MotiView>

            <View className="flex-1 w-full max-w-5xl mx-auto pt-8">
                {loading ? (
                    <ActivityIndicator size="large" color="#137386" className="mt-12" />
                ) : filteredTemplates.length === 0 ? (
                    <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 200 }} className="bg-white p-10 rounded-[32px] border border-gray-100 shadow-sm items-center mx-8 mt-4" style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 4 }}>
                        <View className="w-20 h-20 bg-indigo-50 rounded-[28px] items-center justify-center mb-6 border border-indigo-100/50">
                            <Sparkles size={32} color="#6366F1" />
                        </View>
                        <Text className="text-[#243842] font-black text-[22px] tracking-tight mb-2 text-center">Keine Vorlagen</Text>
                        <Text className="text-[#243842]/50 text-[15px] text-center font-medium leading-relaxed max-w-[300px]">
                            {searchQuery ? 'Es wurden keine Vorlagen für diese Suche gefunden.' : 'Erstelle jetzt deine erste Übungsvorlage für deine Klienten.'}
                        </Text>
                        {!searchQuery && (
                            <TouchableOpacity onPress={() => router.push('/(app)/therapist/template/new')} className="mt-8 bg-[#137386] px-8 py-4 rounded-[20px] shadow-lg">
                                <Text className="text-white font-black text-[16px]">Erste Vorlage erstellen</Text>
                            </TouchableOpacity>
                        )}
                    </MotiView>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 32 }}
                    >
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
                            {filteredTemplates.map((item, index) => renderTemplateItem({ item, index }))}
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* Assignment Modal (Premium Style) */}
            <Modal visible={assignModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/40 p-4">
                    <MotiView
                        from={{ opacity: 0, scale: 0.95, translateY: 20 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
                    >
                        <View className="bg-gray-50/50 p-6 border-b border-gray-100 flex-row justify-between items-center">
                            <Text className="text-[20px] font-black text-[#243842] tracking-tight">Klient Zuweisen</Text>
                            <TouchableOpacity onPress={() => setAssignModalVisible(false)} className="bg-white shadow-sm p-2.5 rounded-full border border-gray-100">
                                <X size={20} color="#243842" />
                            </TouchableOpacity>
                        </View>

                        <View className="p-6">
                            <Text className="text-[#243842]/60 font-medium text-[15px] mb-6 leading-relaxed">
                                Wem möchtest du die Vorlage <Text className="font-bold text-[#137386]">"{selectedTemplateForAssign?.title}"</Text> zuweisen?
                            </Text>

                            <FlatList
                                data={clients}
                                keyExtractor={(c) => c.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => confirmAssignToClient(item.id)}
                                        className="bg-white p-5 rounded-[20px] border border-gray-100 mb-3 flex-row items-center justify-between"
                                        style={{ shadowColor: '#243842', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 1 }}
                                    >
                                        <View className="flex-row items-center">
                                            <View className="w-10 h-10 bg-[#137386]/10 rounded-full items-center justify-center mr-3">
                                                <Text className="text-[#137386] font-bold">{item.firstName?.charAt(0)}{item.lastName?.charAt(0)}</Text>
                                            </View>
                                            <Text className="font-black text-[#243842] text-[16px]">{item.firstName} {item.lastName}</Text>
                                        </View>
                                        <View className="bg-[#137386] w-9 h-9 rounded-full items-center justify-center opacity-90">
                                            <Send size={14} color="#ffffff" style={{ marginLeft: -2 }} />
                                        </View>
                                    </TouchableOpacity>
                                )}
                                style={{ maxHeight: 300 }}
                                showsVerticalScrollIndicator={false}
                            />
                        </View>
                    </MotiView>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal visible={deleteModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/40 p-4">
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl p-6"
                        style={{ backgroundColor: 'white' }}
                    >
                        <View className="items-center mb-6">
                            <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
                                <Trash2 size={32} color="#EF4444" />
                            </View>
                            <Text className="text-[20px] font-black text-[#243842] mb-2 text-center">{i18n.t('templates.delete_title')}</Text>
                            <Text className="text-[#243842]/60 font-medium text-center text-[15px] leading-relaxed mb-4">
                                {i18n.t('templates.delete_confirm')}
                            </Text>
                            
                            {templateToDelete && (
                                <View className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 flex-row items-center">
                                    <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: `${templateToDelete.themeColor || '#6366F1'}15` }}>
                                        <LayoutTemplate size={20} color={templateToDelete.themeColor || '#6366F1'} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-bold text-[#243842] text-[15px]" numberOfLines={1}>{templateToDelete.title}</Text>
                                        <Text className="text-gray-500 text-[12px] mt-0.5">{templateToDelete.blocks?.length || 0} Module</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                        <View className="flex-row gap-3">
                            <TouchableOpacity onPress={() => setDeleteModalVisible(false)} className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center">
                                <Text className="font-bold text-[#243842]">{i18n.t('therapist.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmDeleteTemplate} className="flex-1 bg-red-500 py-3.5 rounded-xl items-center shadow-sm" style={{ shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 2 }}>
                                <Text className="font-bold text-white">{i18n.t('templates.delete_btn')}</Text>
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                </View>
            </Modal>

            {/* Color Picker Modal */}
            <Modal visible={colorModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/40 p-4">
                    <MotiView
                        from={{ opacity: 0, scale: 0.95, translateY: 20 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        className="rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl p-6"
                        style={{ backgroundColor: 'white' }}
                    >
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-[20px] font-black text-[#243842]">Farbe auswählen</Text>
                            <TouchableOpacity onPress={() => setColorModalVisible(false)} className="bg-gray-100 p-2 rounded-full">
                                <X size={20} color="#243842" />
                            </TouchableOpacity>
                        </View>
                        <View className="flex-row flex-wrap gap-4 justify-center mb-4">
                            {THEME_COLORS.map(color => (
                                <TouchableOpacity
                                    key={color}
                                    onPress={() => handleUpdateThemeColor(color)}
                                    style={{
                                        width: 48, height: 48, borderRadius: 24, backgroundColor: color,
                                        borderWidth: 3, borderColor: templateToColor?.themeColor === color ? '#243842' : 'transparent',
                                        shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
                                    }}
                                />
                            ))}
                        </View>
                    </MotiView>
                </View>
            </Modal>

            <SuccessAnimation
                visible={showSuccess}
                message={successMessage}
                onAnimationDone={() => setShowSuccess(false)}
            />
        </View>
    );
}

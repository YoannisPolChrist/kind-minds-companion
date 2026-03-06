import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, Modal, ScrollView, useWindowDimensions, Image } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import React from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import i18n from '../../../utils/i18n';
import { MotiView } from 'moti';
import { Search, Plus, Trash2, Send, X, FileText, Sparkles, LayoutTemplate, Palette } from 'lucide-react-native';
import { DarkAmbientOrbs } from '../../../components/ui/AmbientOrbs';
import { SuccessAnimation } from '../../../components/ui/SuccessAnimation';
import { useDebounce } from '../../../hooks/useDebounce';
import { TemplateRepository, ExerciseTemplate } from '../../../utils/repositories/TemplateRepository';
import { ClientRepository } from '../../../utils/repositories/ClientRepository';
import { ErrorHandler } from '../../../utils/errors';
import { useAuth } from '../../../contexts/AuthContext';

const THEME_COLORS = ['#137386', '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#10B981', '#64748B'];

export default function TherapistTemplates() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 300);
    const [loading, setLoading] = useState(true);
    const { profile } = useAuth();

    // Assignment Mock State
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedTemplateForAssign, setSelectedTemplateForAssign] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]); // To be populated from TherapistDashboard context

    // Modals state
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<any>(null);

    const [colorModalVisible, setColorModalVisible] = useState(false);
    const [templateToColor, setTemplateToColor] = useState<any>(null);

    const [toast, setToast] = useState<{ visible: boolean, message: string, subMessage?: string, type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });

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
            const rawClients = await ClientRepository.findAllClients();
            setClients(rawClients);
        } catch (error) {
            const { message } = ErrorHandler.handle(error, 'Fetch Clients For Assignment');
            setToast({ visible: true, message: "Fehler", subMessage: message, type: 'error' });
        }
    };

    const fetchTemplates = async () => {
        try {
            if (!profile?.id) return;
            const activeTemplates = await TemplateRepository.findActiveTemplates(50, profile.id);
            setTemplates(activeTemplates);
            setFilteredTemplates(activeTemplates);
        } catch (error) {
            const { message } = ErrorHandler.handle(error, 'Fetch Templates');
            setToast({ visible: true, message: "Fehler", subMessage: message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Re-filter whenever the debounced query or template list changes
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setFilteredTemplates(templates);
        } else {
            const q = debouncedQuery.toLowerCase();
            setFilteredTemplates(templates.filter(t =>
                t.title?.toLowerCase().includes(q) ||
                t.blocks?.some((b: any) => b.content?.toLowerCase().includes(q))
            ));
        }
    }, [debouncedQuery, templates]);

    const confirmDeleteTemplate = async () => {
        if (!templateToDelete) return;
        try {
            await TemplateRepository.archiveTemplate(templateToDelete.id);
            setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
            setFilteredTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
            setDeleteModalVisible(false);
            setTemplateToDelete(null);
            setToast({ visible: true, message: "Gelöscht", subMessage: "Vorlage wurde erfolgreich gelöscht.", type: 'success' });
        } catch (error) {
            setDeleteModalVisible(false);
            const { message } = ErrorHandler.handle(error, 'Archive Template');
            setToast({ visible: true, message: "Fehler", subMessage: message, type: 'error' });
        }
    };

    const handleDelete = (template: any) => {
        setTemplateToDelete(template);
        setDeleteModalVisible(true);
    };

    const handleUpdateThemeColor = async (color: string) => {
        if (!templateToColor) return;
        try {
            await TemplateRepository.updateThemeColor(templateToColor.id, color);
            setTemplates(prev => prev.map(t => t.id === templateToColor.id ? { ...t, themeColor: color } : t));
            setFilteredTemplates(prev => prev.map(t => t.id === templateToColor.id ? { ...t, themeColor: color } : t));
            setColorModalVisible(false);
            setTemplateToColor(null);
            setToast({ visible: true, message: "Gespeichert", subMessage: "Farbe wurde erfolgreich aktualisiert.", type: 'success' });
        } catch (error) {
            setColorModalVisible(false);
            const { message } = ErrorHandler.handle(error, 'Update Template ThemeColor');
            setToast({ visible: true, message: "Fehler", subMessage: message, type: 'error' });
        }
    };

    const openAssignModal = (template: any) => {
        setSelectedTemplateForAssign(template);
        setAssignModalVisible(true);
    };

    const confirmAssignToClient = async (clientId: string) => {
        if (!selectedTemplateForAssign) return;
        try {
            await TemplateRepository.assignToClient(selectedTemplateForAssign, clientId);
            setAssignModalVisible(false);
            setToast({ visible: true, message: "Erfolg", subMessage: `Die Vorlage "${selectedTemplateForAssign.title}" wurde zugewiesen.`, type: 'success' });
        } catch (error) {
            setAssignModalVisible(false);
            const { message } = ErrorHandler.handle(error, 'Assign Template to Client');
            setToast({ visible: true, message: "Fehler", subMessage: message, type: 'error' });
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
                    padding: 32,
                    borderRadius: 36,
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
                                borderRadius: 24,
                                borderWidth: 1,
                                borderColor: 'rgba(36, 56, 66, 0.07)',
                                padding: 8,
                                gap: 8,
                                shadowColor: '#243842',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.06,
                                shadowRadius: 16,
                                elevation: 2,
                                alignItems: 'center',
                                flexDirection: 'row',
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => handleDelete(item)}
                                style={{
                                    width: 48, height: 48, borderRadius: 16,
                                    backgroundColor: '#FEF2F2',
                                    borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <Trash2 size={22} color="#EF4444" />
                            </TouchableOpacity>
                            <View style={{ width: 1, height: 32, backgroundColor: 'rgba(36,56,66,0.06)' }} />
                            <TouchableOpacity
                                onPress={() => { setTemplateToColor(item); setColorModalVisible(true); }}
                                style={{
                                    width: 48, height: 48, borderRadius: 16,
                                    backgroundColor: `${themeColor}15`,
                                    borderWidth: 1, borderColor: `${themeColor}25`,
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <Palette size={22} color={themeColor} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 14, paddingTop: 24, marginTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: '#F9F8F6', borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                        onPress={() => router.push(`/(app)/therapist/template/${item.id}` as any)}
                    >
                        <Text style={{ color: '#243842', fontWeight: '900', fontSize: 16 }}>{i18n.t('templates.edit')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: '#137386', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: '#137386', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 }}
                        onPress={() => openAssignModal(item)}
                    >
                        <Send size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Zuweisen</Text>
                    </TouchableOpacity>
                </View>
            </MotiView>
        );
    };

    return (
        <View className="flex-1 bg-[#F9F8F6]">
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
                bounces={false}
            >
                {/* Premium Header matching Dashboard */}
                <MotiView
                    from={{ opacity: 0, translateY: -40 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350, delay: 50 }}
                    style={{
                        backgroundColor: '#137386',
                        paddingTop: Platform.OS === 'android' ? 56 : 64,
                        paddingBottom: 40,
                        paddingHorizontal: 24,
                        borderBottomLeftRadius: 32,
                        borderBottomRightRadius: 32,
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                            <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{i18n.t('exercise.back')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => router.push('/(app)/therapist/template/new')}
                                activeOpacity={0.8}
                                style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', height: 48, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                            >
                                <Plus size={18} color="#FFF" />
                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>Neue Vorlage</Text>
                            </TouchableOpacity>
                        </View>

                        <Text className="text-[32px] font-black text-white tracking-tight mb-2">{i18n.t('templates.title')}</Text>
                        <Text className="text-white/70 font-medium text-[16px] mb-8">Erstelle und verwalte interaktive Vorlagen für deine Klienten.</Text>

                        {/* Search Bar - Glassmorphism */}
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 28, paddingHorizontal: 24, paddingVertical: 18, flexDirection: 'row', alignItems: 'center' } as any}>
                            <Search size={24} color="rgba(255,255,255,0.85)" />
                            <TextInput
                                placeholder="Vorlagen durchsuchen..."
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                style={{ flex: 1, color: 'white', fontWeight: '700', marginLeft: 16, fontSize: 18 } as any}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 12 }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                    <X size={20} color="rgba(255,255,255,0.9)" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </MotiView>

                <View className="w-full max-w-5xl mx-auto pt-10 px-6">
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
                        </MotiView>
                    ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24, paddingBottom: 120 }}>
                            {filteredTemplates.map((item, index) => renderTemplateItem({ item, index }))}
                        </View>
                    )}
                </View>
            </ScrollView>



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
                            <TouchableOpacity onPress={() => setAssignModalVisible(false)} className="bg-white shadow-sm p-2.5 rounded-full border border-gray-100" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
                <View className="flex-1 justify-center items-center bg-black/40 p-6">
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ width: '100%', maxWidth: 384, backgroundColor: 'white', borderRadius: 40, padding: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 10 }}
                    >
                        <View className="items-center mb-10">
                            <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-6">
                                <Trash2 size={40} color="#EF4444" />
                            </View>
                            <Text className="text-[24px] font-black text-[#243842] mb-3 text-center tracking-tight">{i18n.t('templates.delete_title')}</Text>
                            <Text className="text-[#243842]/60 font-medium text-center text-[16px] leading-relaxed mb-8">
                                {i18n.t('templates.delete_confirm')}
                            </Text>

                            {templateToDelete && (
                                <View className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-5 flex-row items-center">
                                    <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: `${templateToDelete.themeColor || '#6366F1'}15` }}>
                                        <LayoutTemplate size={24} color={templateToDelete.themeColor || '#6366F1'} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-bold text-[#243842] text-[17px]" numberOfLines={1}>{templateToDelete.title}</Text>
                                        <Text className="text-gray-500 text-[13px] mt-1">{templateToDelete.blocks?.length || 0} Module</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{ flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 18, borderRadius: 20, alignItems: 'center' }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#243842' }}>{i18n.t('therapist.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmDeleteTemplate} style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 18, borderRadius: 20, alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 17, color: 'white' }}>{i18n.t('templates.delete_btn')}</Text>
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                </View>
            </Modal>

            {/* Color Picker Modal */}
            <Modal visible={colorModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/40 p-6">
                    <MotiView
                        from={{ opacity: 0, scale: 0.95, translateY: 20 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        style={{ width: '100%', maxWidth: 384, backgroundColor: 'white', borderRadius: 40, padding: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 10 }}
                    >
                        <View className="flex-row justify-between items-center mb-10">
                            <Text className="text-[24px] font-black text-[#243842] tracking-tight">Farbe wählen</Text>
                            <TouchableOpacity onPress={() => setColorModalVisible(false)} className="bg-gray-100 p-2.5 rounded-full" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <X size={22} color="#243842" />
                            </TouchableOpacity>
                        </View>
                        <View className="flex-row flex-wrap gap-7 justify-center mb-4">
                            {THEME_COLORS.map(color => (
                                <TouchableOpacity
                                    key={color}
                                    onPress={() => handleUpdateThemeColor(color)}
                                    style={{
                                        width: 68, height: 68, borderRadius: 34, backgroundColor: color,
                                        borderWidth: 4, borderColor: templateToColor?.themeColor === color ? '#243842' : 'transparent',
                                        shadowColor: color, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6
                                    }}
                                />
                            ))}
                        </View>
                    </MotiView>
                </View>
            </Modal>

            <SuccessAnimation
                visible={toast.visible}
                type={toast.type}
                message={toast.message}
                subMessage={toast.subMessage}
                onAnimationDone={() => setToast(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

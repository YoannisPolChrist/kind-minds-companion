import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PressableScale } from '../../../components/ui/PressableScale';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { ArrowLeft, FileImage, FileText, LayoutTemplate, Palette, Plus, Search, Send, Sparkles, Trash2, X } from 'lucide-react-native';
import i18n from '../../../utils/i18n';
import { TemplateRepository, ExerciseTemplate } from '../../../utils/repositories/TemplateRepository';
import { ClientRepository } from '../../../utils/repositories/ClientRepository';
import { ErrorHandler } from '../../../utils/errors';
import { useAuth } from '../../../contexts/AuthContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { useTheme } from '../../../contexts/ThemeContext';
import { SuccessAnimation } from '../../../components/ui/SuccessAnimation';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { TherapistMetricCard } from '../../../components/therapist/TherapistMetricCard';

const THEME_COLORS = ['#2D666B', '#4E7E82', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#788E76', '#6F7472'];

const HOME_BACKGROUNDS = [
    require('../../../assets/HomeUi1.webp'),
    require('../../../assets/HomeUi2.webp'),
    require('../../../assets/HomeUi3.webp'),
    require('../../../assets/HomeUi4.webp'),
    require('../../../assets/HomeUi5.webp'),
    require('../../../assets/HomeUi6.webp'),
];

type ToastState = {
    visible: boolean;
    message: string;
    subMessage?: string;
    type: 'success' | 'error' | 'warning';
};

type ClientSummary = {
    id: string;
    firstName?: string;
    lastName?: string;
};

export default function TherapistTemplates() {
    const router = useRouter();
    const { profile } = useAuth();
    const { colors, isDark } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const isCompact = screenWidth < 720;
    const isNarrow = screenWidth < 440;
    const isTablet = screenWidth > 768;
    const isDesktop = screenWidth > 1120;
    const heroBackground = useMemo(
        () => HOME_BACKGROUNDS[Math.floor(Math.random() * HOME_BACKGROUNDS.length)],
        []
    );

    const [templates, setTemplates] = useState<ExerciseTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 250);
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedTemplateForAssign, setSelectedTemplateForAssign] = useState<ExerciseTemplate | null>(null);
    const [clients, setClients] = useState<ClientSummary[]>([]);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<ExerciseTemplate | null>(null);
    const [colorModalVisible, setColorModalVisible] = useState(false);
    const [templateToColor, setTemplateToColor] = useState<ExerciseTemplate | null>(null);
    const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });
    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            mountedRef.current = true;
            fetchTemplates();
            fetchClientsForAssignment();
        }, [profile?.id])
    );

    const fetchClientsForAssignment = async () => {
        try {
            if (!profile?.id) {
                if (mountedRef.current) {
                    setClients([]);
                }
                return;
            }

            const rawClients = await ClientRepository.findAllClients(profile.id);
            if (mountedRef.current) {
                setClients(rawClients);
            }
        } catch (error) {
            const { message } = ErrorHandler.handle(error, 'Fetch Clients For Assignment');
            setToast({ visible: true, message: 'Fehler', subMessage: message, type: 'error' });
        }
    };

    const fetchTemplates = async () => {
        try {
            if (!profile?.id) {
                setLoading(false);
                return;
            }

            const activeTemplates = await TemplateRepository.findActiveTemplates(50, profile.id);
            if (mountedRef.current) {
                setTemplates(activeTemplates);
            }
        } catch (error) {
            const { message } = ErrorHandler.handle(error, 'Fetch Templates');
            setToast({ visible: true, message: 'Fehler', subMessage: message, type: 'error' });
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    };

    const filteredTemplates = useMemo(() => {
        const query = debouncedQuery.trim().toLowerCase();

        if (!query) {
            return templates;
        }

        return templates.filter(template => {
            const titleMatch = template.title?.toLowerCase().includes(query);
            const blockMatch = template.blocks?.some((block: any) => String(block.content || '').toLowerCase().includes(query));
            return titleMatch || blockMatch;
        });
    }, [debouncedQuery, templates]);

    const totalBlocks = useMemo(
        () => templates.reduce((sum, template) => sum + (template.blocks?.length || 0), 0),
        [templates]
    );
    const averageBlocks = templates.length ? Math.round(totalBlocks / templates.length) : 0;
    const coverCount = useMemo(
        () => templates.filter(template => Boolean(template.coverImage)).length,
        [templates]
    );

    const confirmDeleteTemplate = async () => {
        if (!templateToDelete?.id) return;

        try {
            await TemplateRepository.archiveTemplate(templateToDelete.id);
            setTemplates(prev => prev.filter(template => template.id !== templateToDelete.id));
            setDeleteModalVisible(false);
            setTemplateToDelete(null);
            setToast({
                visible: true,
                message: 'Gelöscht',
                subMessage: 'Die Vorlage wurde archiviert.',
                type: 'success',
            });
        } catch (error) {
            setDeleteModalVisible(false);
            const { message } = ErrorHandler.handle(error, 'Archive Template');
            setToast({ visible: true, message: 'Fehler', subMessage: message, type: 'error' });
        }
    };

    const handleUpdateThemeColor = async (color: string) => {
        if (!templateToColor?.id) return;

        try {
            await TemplateRepository.updateThemeColor(templateToColor.id, color);
            setTemplates(prev =>
                prev.map(template => (
                    template.id === templateToColor.id ? { ...template, themeColor: color } : template
                ))
            );
            setColorModalVisible(false);
            setTemplateToColor(null);
            setToast({
                visible: true,
                message: 'Gespeichert',
                subMessage: 'Die Akzentfarbe wurde aktualisiert.',
                type: 'success',
            });
        } catch (error) {
            setColorModalVisible(false);
            const { message } = ErrorHandler.handle(error, 'Update Template ThemeColor');
            setToast({ visible: true, message: 'Fehler', subMessage: message, type: 'error' });
        }
    };

    const confirmAssignToClient = async (clientId: string) => {
        if (!selectedTemplateForAssign) return;

        try {
            await TemplateRepository.assignToClient(selectedTemplateForAssign, clientId);
            setAssignModalVisible(false);
            setToast({
                visible: true,
                message: 'Zugewiesen',
                subMessage: `Die Vorlage "${selectedTemplateForAssign.title}" wurde übernommen.`,
                type: 'success',
            });
        } catch (error) {
            setAssignModalVisible(false);
            const { message } = ErrorHandler.handle(error, 'Assign Template to Client');
            setToast({ visible: true, message: 'Fehler', subMessage: message, type: 'error' });
        }
    };

    const openAssignModal = (template: ExerciseTemplate) => {
        setSelectedTemplateForAssign(template);
        setAssignModalVisible(true);
    };

    const openDeleteModal = (template: ExerciseTemplate) => {
        setTemplateToDelete(template);
        setDeleteModalVisible(true);
    };

    const openColorModal = (template: ExerciseTemplate) => {
        setTemplateToColor(template);
        setColorModalVisible(true);
    };

    const contentMaxWidth = screenWidth > 1280 ? 1180 : 1120;
    const cardWidth = isDesktop ? '31.9%' : isTablet ? '48.5%' : '100%';

    const renderTemplateCard = (template: ExerciseTemplate, index: number) => {
        const themeColor = template.themeColor || colors.primary;
        const moduleCount = template.blocks?.length || 0;

        return (
            <MotiView
                key={template.id}
                from={{ opacity: 0, translateY: 24, scale: 0.98 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{ type: 'timing', duration: 320, delay: Math.min(index * 45, 260) }}
                style={{ width: cardWidth as any }}
            >
                <Card
                    variant="elevated"
                    padding="none"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                        shadowColor: isDark ? '#000' : '#182428',
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: isDark ? 0.22 : 0.06,
                        shadowRadius: 28,
                        elevation: 4,
                    }}
                >
                    <LinearGradient
                        colors={[`${themeColor}1A`, isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.98)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ padding: 22 }}
                    >
                        {template.coverImage ? (
                            <View
                                style={{
                                    height: 168,
                                    borderRadius: 24,
                                    overflow: 'hidden',
                                    marginBottom: 18,
                                    borderWidth: 1,
                                    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                                }}
                            >
                                <Image source={{ uri: template.coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                            </View>
                        ) : (
                            <LinearGradient
                                colors={[`${themeColor}20`, `${themeColor}05`]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                    height: 168,
                                    borderRadius: 24,
                                    marginBottom: 18,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1,
                                    borderColor: `${themeColor}33`,
                                }}
                            >
                                <View
                                    style={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: 20,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: `${themeColor}22`,
                                        marginBottom: 12,
                                    }}
                                >
                                    <LayoutTemplate size={28} color={themeColor} />
                                </View>
                                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>Ohne Cover</Text>
                                <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                                    Die Vorlage wirkt trotzdem sofort einsetzbar.
                                </Text>
                            </LinearGradient>
                        )}
                        <View style={{ flexDirection: isNarrow ? 'column' : 'row', justifyContent: 'space-between', alignItems: isNarrow ? 'stretch' : 'flex-start', gap: isNarrow ? 12 : 0, marginBottom: 16 }}>
                            <View style={{ flex: 1, paddingRight: isNarrow ? 0 : 12 }}>
                                <View
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 16,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: `${themeColor}18`,
                                        borderWidth: 1,
                                        borderColor: `${themeColor}30`,
                                        marginBottom: 14,
                                    }}
                                >
                                    <LayoutTemplate size={22} color={themeColor} />
                                </View>
                                <Text style={{ color: colors.text, fontSize: 21, fontWeight: '900', letterSpacing: -0.5 }} numberOfLines={2}>
                                    {template.title}
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 8, alignSelf: isNarrow ? 'flex-start' : 'auto' }}>
                                <PressableScale
                                    onPress={() => openColorModal(template)}
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 14,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: `${themeColor}15`,
                                        borderWidth: 1,
                                        borderColor: `${themeColor}28`,
                                    }}
                                >
                                    <Palette size={18} color={themeColor} />
                                </PressableScale>
                                <PressableScale
                                    onPress={() => openDeleteModal(template)}
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 14,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isDark ? 'rgba(248,113,113,0.14)' : 'rgba(239,68,68,0.08)',
                                        borderWidth: 1,
                                        borderColor: 'rgba(239,68,68,0.16)',
                                    }}
                                >
                                    <Trash2 size={18} color={colors.danger} />
                                </PressableScale>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                            <Badge variant="default">{moduleCount} Module</Badge>
                            <Badge variant={template.coverImage ? 'secondary' : 'muted'}>
                                {template.coverImage ? 'Cover aktiv' : 'Nur Inhalt'}
                            </Badge>
                        </View>

                        <Text style={{ color: colors.textSubtle, fontSize: 14, lineHeight: 21, fontWeight: '600', marginBottom: 20 }}>
                            {moduleCount === 0
                                ? 'Noch leer. Ideal, um eine neue Struktur für eine Sitzung aufzubauen.'
                                : 'Direkt editierbar und bereit, einem Klienten als nächsten Schritt zugewiesen zu werden.'}
                        </Text>

                        <View style={{ flexDirection: isNarrow ? 'column' : 'row', gap: 10 }}>
                            <PressableScale
                                onPress={() => router.push(`/(app)/therapist/template/${template.id}` as any)}
                                style={{
                                    flex: 1,
                                    minHeight: 50,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                }}
                            >
                                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{i18n.t('templates.edit')}</Text>
                            </PressableScale>

                            <PressableScale
                                onPress={() => openAssignModal(template)}
                                style={{
                                    flex: 1.15,
                                    minHeight: 50,
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    shadowColor: themeColor,
                                    shadowOffset: { width: 0, height: 6 },
                                    shadowOpacity: 0.28,
                                    shadowRadius: 14,
                                    elevation: 5,
                                }}
                            >
                                <LinearGradient
                                    colors={[themeColor, colors.primaryDark]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        paddingHorizontal: 14,
                                    }}
                                >
                                    <Send size={16} color="#FFFFFF" />
                                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>Zuweisen</Text>
                                </LinearGradient>
                            </PressableScale>
                        </View>
                    </LinearGradient>
                </Card>
            </MotiView>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 64 }}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <MotiView
                    from={{ opacity: 0, translateY: -28 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 320 }}
                    style={{
                        overflow: 'hidden',
                        borderBottomLeftRadius: 40,
                        borderBottomRightRadius: 40,
                        marginBottom: 24,
                        shadowColor: colors.primaryDark,
                        shadowOffset: { width: 0, height: 14 },
                        shadowOpacity: 0.18,
                        shadowRadius: 28,
                        elevation: 10,
                    }}
                >
                    <Image
                        source={heroBackground}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        contentFit="cover"
                    />
                    <LinearGradient
                        colors={['rgba(18,33,38,0.68)', 'rgba(19,115,134,0.55)', 'rgba(18,33,38,0.72)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />

                    <View
                        style={{
                            paddingTop: Platform.OS === 'android' ? 52 : 72,
                            paddingBottom: 28,
                            paddingHorizontal: screenWidth < 720 ? 18 : 24,
                            width: '100%',
                            maxWidth: contentMaxWidth,
                            alignSelf: 'center',
                        }}
                    >
                        <BlurView
                            intensity={Platform.OS === 'android' ? 100 : 72}
                            tint={isDark ? 'dark' : 'light'}
                            style={{
                                borderRadius: 34,
                                overflow: 'hidden',
                                padding: screenWidth < 720 ? 16 : 22,
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.24)',
                                backgroundColor: isDark ? 'rgba(16,25,28,0.78)' : 'rgba(255,255,255,0.82)',
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: isCompact ? 'column' : 'row',
                                    justifyContent: 'space-between',
                                    alignItems: isCompact ? 'flex-start' : 'center',
                                    gap: 12,
                                    marginBottom: 22,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <PressableScale
                                        onPress={() => router.back()}
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 16,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                        }}
                                    >
                                        <ArrowLeft size={20} color={colors.text} />
                                    </PressableScale>
                                    <Badge variant="secondary">Vorlagen-Board</Badge>
                                </View>

                                <PressableScale
                                    onPress={() => router.push('/(app)/therapist/template/new' as any)}
                                    style={{
                                        minHeight: 48,
                                        borderRadius: 16,
                                        paddingHorizontal: 18,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        width: isCompact ? '100%' : undefined,
                                        backgroundColor: colors.primary,
                                        shadowColor: colors.primary,
                                        shadowOffset: { width: 0, height: 6 },
                                        shadowOpacity: 0.24,
                                        shadowRadius: 14,
                                        elevation: 5,
                                    }}
                                >
                                    <Plus size={18} color="#FFFFFF" />
                                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>Neue Vorlage</Text>
                                </PressableScale>
                            </View>

                            <Text style={{ color: colors.text, fontSize: isCompact ? 28 : 34, fontWeight: '900', letterSpacing: -1, marginBottom: 8 }}>
                                {i18n.t('templates.title')}
                            </Text>
                            <Text style={{ color: colors.textSubtle, fontSize: 15, lineHeight: 22, fontWeight: '600', marginBottom: 20, maxWidth: 620 }}>
                                Entwirf Vorlagen mit derselben ruhigen, hochwertigen Sprache wie im Hauptdashboard und halte die Zuweisung für deinen Workflow in einem Board.
                            </Text>

                            <Input
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Vorlagen, Inhalte oder Module durchsuchen..."
                                leading={<Search size={18} color={colors.textSubtle} />}
                                trailing={searchQuery ? (
                                    <PressableScale onPress={() => setSearchQuery('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                        <X size={18} color={colors.textSubtle} />
                                    </PressableScale>
                                ) : undefined}
                                containerStyle={{
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                }}
                            />
                        </BlurView>
                    </View>
                </MotiView>

                <View
                    style={{
                        width: '100%',
                        maxWidth: contentMaxWidth,
                        alignSelf: 'center',
                        paddingHorizontal: isCompact ? 18 : 24,
                    }}
                >
                    <View style={{ flexDirection: screenWidth < 1080 ? 'column' : 'row', gap: 16, marginBottom: 28 }}>
                        <TherapistMetricCard
                            icon={LayoutTemplate}
                            label="Vorlagen gesamt"
                            value={String(templates.length)}
                            hint={templates.length === 0 ? 'Noch keine gespeicherten Vorlagen.' : `${templates.length} sofort einsatzbereite Vorlagen in deiner Bibliothek.`}
                            tone="primary"
                        />
                        <TherapistMetricCard
                            icon={FileText}
                            label="Module im Schnitt"
                            value={String(averageBlocks)}
                            hint={templates.length === 0 ? 'Sobald du Inhalte anlegst, erscheint hier die Komplexität pro Vorlage.' : 'Guter Richtwert für Dichte und Umfang einer Vorlage.'}
                            tone="success"
                        />
                        <TherapistMetricCard
                            icon={FileImage}
                            label="Mit Cover"
                            value={String(coverCount)}
                            hint={coverCount === 0 ? 'Noch ohne visuelle Einstiege.' : `${coverCount} Vorlagen haben bereits einen visuellen Einstieg.`}
                            tone="warning"
                        />
                    </View>

                    <MotiView
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 280, delay: 80 }}
                    >
                        <View
                            style={{
                                flexDirection: screenWidth < 760 ? 'column' : 'row',
                                alignItems: screenWidth < 760 ? 'flex-start' : 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                marginBottom: 20,
                            }}
                        >
                            <View>
                                <Text style={{ color: colors.text, fontSize: 27, fontWeight: '900', letterSpacing: -0.6 }}>
                                    Deine Bibliothek
                                </Text>
                                <Text style={{ color: colors.textSubtle, fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                                    {filteredTemplates.length} von {templates.length} Vorlagen sichtbar
                                </Text>
                            </View>
                            <Badge variant={searchQuery.trim() ? 'default' : 'muted'}>
                                {searchQuery.trim() ? 'Suchansicht aktiv' : 'Alles im Blick'}
                            </Badge>
                        </View>
                    </MotiView>

                    {loading ? (
                        <View style={{ paddingVertical: 72, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{ color: colors.textSubtle, fontSize: 14, fontWeight: '600', marginTop: 12 }}>
                                Vorlagen werden geladen...
                            </Text>
                        </View>
                    ) : filteredTemplates.length === 0 ? (
                        <Card
                            variant="elevated"
                            padding="lg"
                            style={{
                                alignItems: 'center',
                                paddingVertical: 48,
                                backgroundColor: colors.card,
                                borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                            }}
                        >
                            <View
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 28,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 18,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7F4EE',
                                }}
                            >
                                <Sparkles size={30} color={colors.primary} />
                            </View>
                            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center' }}>
                                {searchQuery.trim() ? 'Keine passende Vorlage' : 'Noch keine Vorlage angelegt'}
                            </Text>
                            <Text style={{ color: colors.textSubtle, fontSize: 14, fontWeight: '600', lineHeight: 22, textAlign: 'center', maxWidth: 360, marginBottom: 20 }}>
                                {searchQuery.trim()
                                    ? 'Passe Suchbegriff oder Inhalt an, um wieder Vorlagen im Board zu sehen.'
                                    : 'Lege deine erste Struktur an und baue damit denselben hochwertigen Einstieg wie im Dashboard.'}
                            </Text>
                            {!searchQuery.trim() ? (
                                <PressableScale
                                    onPress={() => router.push('/(app)/therapist/template/new' as any)}
                                    style={{
                                        minHeight: 48,
                                        paddingHorizontal: 18,
                                        borderRadius: 16,
                                        backgroundColor: colors.primary,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>Erste Vorlage erstellen</Text>
                                </PressableScale>
                            ) : null}
                        </Card>
                    ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                            {filteredTemplates.map((template, index) => renderTemplateCard(template, index))}
                        </View>
                    )}
                </View>
            </ScrollView>

            <Modal visible={assignModalVisible} transparent animationType="fade" onRequestClose={() => setAssignModalVisible(false)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 20 }}>
                    <Card
                        variant="elevated"
                        padding="none"
                        style={{
                            width: '100%',
                            maxWidth: 520,
                            backgroundColor: colors.card,
                            borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                        }}
                    >
                        <View
                            style={{
                                paddingHorizontal: 24,
                                paddingVertical: 20,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                                flexDirection: isNarrow ? 'column' : 'row',
                                alignItems: isNarrow ? 'flex-start' : 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                            }}
                        >
                            <View>
                                <Text style={{ color: colors.text, fontSize: 21, fontWeight: '900' }}>Vorlage zuweisen</Text>
                                <Text style={{ color: colors.textSubtle, fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                                    {selectedTemplateForAssign?.title || 'Vorlage'}
                                </Text>
                            </View>
                            <PressableScale
                                onPress={() => setAssignModalVisible(false)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                }}
                            >
                                <X size={18} color={colors.text} />
                            </PressableScale>
                        </View>

                        <View style={{ padding: 24 }}>
                            <Text style={{ color: colors.textSubtle, fontSize: 14, lineHeight: 22, fontWeight: '600', marginBottom: 18 }}>
                                Wähle den Klienten aus, dem du diese Struktur direkt in den Alltag geben willst.
                            </Text>

                            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                                {clients.map(client => (
                                    <PressableScale
                                        key={client.id}
                                        onPress={() => confirmAssignToClient(client.id)}
                                        style={{
                                            minHeight: 72,
                                            borderRadius: 20,
                                            paddingHorizontal: 18,
                                            paddingVertical: 14,
                                            marginBottom: 12,
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F7F4EE',
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            flexDirection: isNarrow ? 'column' : 'row',
                                            alignItems: isNarrow ? 'flex-start' : 'center',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <LinearGradient
                                                colors={['#4E7E82', '#2D666B']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={{ width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15 }}>
                                                    {(client.firstName || '?').charAt(0)}{(client.lastName || '?').charAt(0)}
                                                </Text>
                                            </LinearGradient>
                                            <View>
                                                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>
                                                    {client.firstName} {client.lastName}
                                                </Text>
                                                <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                                                    Sofortige Zuweisung als neue Aufgabe
                                                </Text>
                                            </View>
                                        </View>
                                        <View
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 12,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: colors.primary,
                                                alignSelf: isNarrow ? 'flex-end' : 'auto',
                                            }}
                                        >
                                            <Send size={15} color="#FFFFFF" />
                                        </View>
                                    </PressableScale>
                                ))}
                            </ScrollView>
                        </View>
                    </Card>
                </View>
            </Modal>

            <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 20 }}>
                    <Card
                        variant="elevated"
                        padding="lg"
                        style={{
                            width: '100%',
                            maxWidth: 420,
                            backgroundColor: colors.card,
                            borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                        }}
                    >
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View
                                style={{
                                    width: 76,
                                    height: 76,
                                    borderRadius: 26,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 18,
                                    backgroundColor: isDark ? 'rgba(248,113,113,0.14)' : 'rgba(239,68,68,0.08)',
                                }}
                            >
                                <Trash2 size={30} color={colors.danger} />
                            </View>
                            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center' }}>
                                Vorlage archivieren?
                            </Text>
                            <Text style={{ color: colors.textSubtle, fontSize: 14, lineHeight: 22, fontWeight: '600', textAlign: 'center' }}>
                                Die Vorlage verschwindet aus der Bibliothek, bestehende Zuweisungen bleiben aber unberührt.
                            </Text>
                        </View>

                        {templateToDelete ? (
                            <View
                                style={{
                                    borderRadius: 20,
                                    padding: 16,
                                    marginBottom: 18,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F7F4EE',
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                }}
                            >
                                <View
                                    style={{
                                        width: 46,
                                        height: 46,
                                        borderRadius: 16,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: `${templateToDelete.themeColor || colors.primary}18`,
                                    }}
                                >
                                    <LayoutTemplate size={20} color={templateToDelete.themeColor || colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
                                        {templateToDelete.title}
                                    </Text>
                                    <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                                        {templateToDelete.blocks?.length || 0} Module
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                        <View style={{ flexDirection: isNarrow ? 'column' : 'row', gap: 12 }}>
                            <PressableScale
                                onPress={() => setDeleteModalVisible(false)}
                                style={{
                                    flex: 1,
                                    minHeight: 50,
                                    borderRadius: 18,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F3EEE6',
                                }}
                            >
                                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{i18n.t('therapist.cancel')}</Text>
                            </PressableScale>
                            <PressableScale
                                onPress={confirmDeleteTemplate}
                                style={{
                                    flex: 1,
                                    minHeight: 50,
                                    borderRadius: 18,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: colors.danger,
                                }}
                            >
                                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900' }}>{i18n.t('templates.delete_btn')}</Text>
                            </PressableScale>
                        </View>
                    </Card>
                </View>
            </Modal>

            <Modal visible={colorModalVisible} transparent animationType="fade" onRequestClose={() => setColorModalVisible(false)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 20 }}>
                    <Card
                        variant="elevated"
                        padding="lg"
                        style={{
                            width: '100%',
                            maxWidth: 420,
                            backgroundColor: colors.card,
                            borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                        }}
                    >
                        <View style={{ flexDirection: isNarrow ? 'column' : 'row', alignItems: isNarrow ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
                            <View>
                                <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>Akzentfarbe</Text>
                                <Text style={{ color: colors.textSubtle, fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                                    Für Karte, Vorschau und CTA
                                </Text>
                            </View>
                            <PressableScale
                                onPress={() => setColorModalVisible(false)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                }}
                            >
                                <X size={18} color={colors.text} />
                            </PressableScale>
                        </View>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                            {THEME_COLORS.map(color => {
                                const isActive = templateToColor?.themeColor === color;

                                return (
                                    <PressableScale
                                        key={color}
                                        onPress={() => handleUpdateThemeColor(color)}
                                        style={{
                                            width: 58,
                                            height: 58,
                                            borderRadius: 20,
                                            backgroundColor: color,
                                            borderWidth: 3,
                                            borderColor: isActive ? colors.text : 'transparent',
                                            shadowColor: color,
                                            shadowOffset: { width: 0, height: 6 },
                                            shadowOpacity: 0.26,
                                            shadowRadius: 12,
                                            elevation: 4,
                                        }}
                                    />
                                );
                            })}
                        </View>
                    </Card>
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


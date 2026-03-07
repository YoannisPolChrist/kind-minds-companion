import { View, Text, TouchableOpacity, ActivityIndicator, Linking, RefreshControl, Platform, Modal, Pressable, StyleSheet } from 'react-native';
import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import i18n from '../../utils/i18n';
import { FileText, Link as LinkIcon, Download, X, Eye, Video, Image as ImageIcon, ArrowLeft } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useClientResources } from '../../hooks/firebase/useClientResources';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ClientMetricCard } from '../../components/dashboard/ClientMetricCard';
import { DashboardSectionHeader } from '../../components/dashboard/DashboardSectionHeader';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

type ResourceKind = 'document' | 'pdf' | 'video' | 'image' | 'link';
type ResourceCategory = 'all' | 'docs' | 'links';

const getResourceMeta = (type?: string) => {
    const kind = (type || 'link') as ResourceKind;

    switch (kind) {
        case 'document':
            return {
                label: 'Geteiltes Dokument',
                badge: 'secondary' as const,
                circleColor: 'rgba(99,102,241,0.12)',
                iconColor: '#6366F1',
                cta: 'Details und Vorschau',
                icon: FileText,
            };
        case 'pdf':
            return {
                label: 'PDF Dokument',
                badge: 'danger' as const,
                circleColor: 'rgba(239,68,68,0.12)',
                iconColor: '#DC2626',
                cta: 'Details und Vorschau',
                icon: FileText,
            };
        case 'video':
            return {
                label: 'Video',
                badge: 'warning' as const,
                circleColor: 'rgba(192,157,89,0.14)',
                iconColor: '#B08C57',
                cta: 'Video ansehen',
                icon: Video,
            };
        case 'image':
            return {
                label: 'Bild',
                badge: 'default' as const,
                circleColor: 'rgba(219,39,119,0.12)',
                iconColor: '#DB2777',
                cta: 'Bild ansehen',
                icon: ImageIcon,
            };
        default:
            return {
                label: 'Web Link',
                badge: 'default' as const,
                circleColor: 'rgba(45,102,107,0.12)',
                iconColor: '#2D666B',
                cta: 'Vorschau öffnen',
                icon: LinkIcon,
            };
    }
};

const normalizeResourceUrl = (url?: string) => {
    const trimmed = (url || '').trim();
    if (!trimmed) return '';
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
};

export default function ResourcesScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { resources, loading, refreshing, onRefresh } = useClientResources();
    const [selectedResource, setSelectedResource] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | null>(null);
    const { isXs, isSm, isTablet, isDesktop, contentMaxWidth, gutter, sectionGap, headerTop } = useResponsiveLayout();
    const previewUrl = normalizeResourceUrl(selectedResource?.url);
    const listColumnWidth = isTablet ? (isDesktop ? '48.8%' : '48.4%') : '100%';
    const modalContentWidth = isDesktop ? 1120 : isTablet ? 920 : undefined;
    const isWeb = Platform.OS === 'web';
    const contentWrapperStyle = contentMaxWidth
        ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' as const }
        : { width: '100%' as const };

    const resourceStats = useMemo(() => {
        const totals = {
            all: resources.length,
            docs: resources.filter(resource => resource.type === 'document' || resource.type === 'pdf').length,
            links: resources.filter(resource => !resource.type || resource.type === 'link').length,
        };

        return totals;
    }, [resources]);

    const categoryResources = useMemo(() => {
        if (!selectedCategory) return [];
        if (selectedCategory === 'docs') {
            return resources.filter(resource => resource.type === 'document' || resource.type === 'pdf');
        }
        if (selectedCategory === 'links') {
            return resources.filter(resource => !resource.type || resource.type === 'link');
        }
        return resources;
    }, [resources, selectedCategory]);

    const categoryTitle = useMemo(() => {
        if (selectedCategory === 'docs') return 'Dokumente';
        if (selectedCategory === 'links') return 'Links';
        return 'Gesamt';
    }, [selectedCategory]);

    const handleOpenResource = (url: string) => {
        const validUrl = normalizeResourceUrl(url);
        if (!validUrl) {
            alert(i18n.t('resources.open_error', { defaultValue: 'Die Ressource konnte nicht geöffnet werden.' }));
            return;
        }
        Linking.openURL(validUrl).catch(err => {
            console.error('Cannot open url', err);
            alert(i18n.t('resources.open_error', { defaultValue: 'Die Ressource konnte nicht geöffnet werden.' }));
        });
    };

    const openResourcePreview = (resource: any) => {
        setSelectedCategory(null);
        setSelectedResource(resource);
    };

    const renderResourceCard = (item: any, index: number, keyPrefix: string = 'resource') => {
        const meta = getResourceMeta(item.type);
        const Icon = meta.icon;

        return (
            <Animated.View
                key={`${keyPrefix}-${item.id}`}
                entering={FadeInDown.delay(100 + (index * 50)).springify()}
                layout={Layout.springify()}
                style={{ marginBottom: 16 }}
            >
                <Card
                    variant="elevated"
                    padding={isSm ? 'md' : 'lg'}
                    style={{
                        width: listColumnWidth as any,
                        backgroundColor: colors.card,
                        borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                        shadowColor: isDark ? '#000' : '#182428',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: isDark ? 0.16 : 0.04,
                        shadowRadius: 20,
                        elevation: 2,
                    }}
                >
                    <View style={{ flexDirection: isXs ? 'column' : 'row', alignItems: 'flex-start', marginBottom: 18 }}>
                        <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: meta.circleColor, alignItems: 'center', justifyContent: 'center', marginRight: isXs ? 0 : 16, marginBottom: isXs ? 12 : 0 }}>
                            <Icon size={24} color={meta.iconColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontSize: isXs ? 18 : 20, fontWeight: '900', lineHeight: isXs ? 24 : 26, marginBottom: 8 }}>
                                {item.title}
                            </Text>
                            <Badge variant={meta.badge}>{meta.label}</Badge>
                        </View>
                    </View>

                    {item.description ? (
                        <Text style={{ color: colors.textSubtle, fontSize: 14, lineHeight: 21, fontWeight: '500', marginBottom: 20 }}>
                            {item.description}
                        </Text>
                    ) : null}

                    <TouchableOpacity
                        onPress={() => openResourcePreview(item)}
                        style={{
                            backgroundColor: meta.iconColor,
                            paddingVertical: 14,
                            borderRadius: 18,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                        }}
                    >
                        <Eye size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>
                            {meta.cta}
                        </Text>
                    </TouchableOpacity>
                </Card>
            </Animated.View>
        );
    };

    const renderCategorySheet = () => (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View
                style={{
                    backgroundColor: colors.primary,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: headerTop,
                    paddingBottom: isXs ? 18 : 24,
                    paddingHorizontal: gutter,
                    borderBottomLeftRadius: isSm ? 24 : 32,
                    borderBottomRightRadius: isSm ? 24 : 32,
                    zIndex: 10,
                }}
            >
                <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: '900' }} numberOfLines={1}>
                        {categoryTitle}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedCategory(null)} style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.24)', borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                    <X size={20} color="white" />
                </TouchableOpacity>
            </View>

            <Animated.ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: gutter,
                    paddingTop: gutter,
                    paddingBottom: isSm ? 32 : 48,
                    width: '100%',
                    maxWidth: modalContentWidth,
                    alignSelf: 'center',
                }}
            >
                {categoryResources.length === 0 ? (
                    <Card
                        variant="elevated"
                        padding={isSm ? 'md' : 'lg'}
                        style={{
                            alignItems: 'center',
                            marginTop: 8,
                            backgroundColor: colors.card,
                            borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                        }}
                    >
                        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center' }}>
                            Keine Einträge
                        </Text>
                        <Text style={{ color: colors.textSubtle, textAlign: 'center', lineHeight: 22, fontWeight: '600', maxWidth: 320 }}>
                            In dieser Kategorie sind aktuell keine Ressourcen vorhanden.
                        </Text>
                    </Card>
                ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'stretch', marginTop: 8 }}>
                        {categoryResources.map((item, index) => renderResourceCard(item, index, `category-${selectedCategory}`))}
                    </View>
                )}
            </Animated.ScrollView>
        </View>
    );

    const renderResourcePreviewSheet = () => {
        if (!selectedResource) return null;

        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <View
                    style={{
                        backgroundColor: colors.primary,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: headerTop,
                        paddingBottom: isXs ? 18 : 24,
                        paddingHorizontal: gutter,
                        borderBottomLeftRadius: isSm ? 24 : 32,
                        borderBottomRightRadius: isSm ? 24 : 32,
                        zIndex: 10,
                    }}
                >
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', maxWidth: '80%' }} numberOfLines={1}>
                        {selectedResource?.title || 'Vorschau'}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedResource(null)} style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.24)', borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                        <X size={20} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                    <View style={{ flex: 1, width: '100%', maxWidth: modalContentWidth, alignSelf: 'center' }}>
                        <Card
                            variant="elevated"
                            padding={isSm ? 'md' : 'lg'}
                            style={{
                                marginHorizontal: gutter,
                                marginTop: gutter,
                                backgroundColor: colors.card,
                                borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                                shadowColor: isDark ? '#000' : '#182428',
                                shadowOffset: { width: 0, height: 10 },
                                shadowOpacity: isDark ? 0.18 : 0.05,
                                shadowRadius: 24,
                                elevation: 3,
                            }}
                        >
                            <Badge variant={getResourceMeta(selectedResource.type).badge}>
                                {getResourceMeta(selectedResource.type).label}
                            </Badge>

                            {selectedResource.description ? (
                                <Text style={{ color: colors.textSubtle, fontSize: 15, lineHeight: 24, marginTop: 14, marginBottom: 18 }}>
                                    {selectedResource.description}
                                </Text>
                            ) : null}

                            <TouchableOpacity
                                onPress={() => handleOpenResource(selectedResource.url)}
                                style={{
                                    backgroundColor: colors.secondary,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingVertical: 14,
                                    borderRadius: 18,
                                }}
                            >
                                {selectedResource.type !== 'link' && <Download size={20} color="white" style={{ marginRight: 8 }} />}
                                <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>
                                    {selectedResource.type === 'link' ? 'Im Browser öffnen' : 'Speichern oder herunterladen'}
                                </Text>
                            </TouchableOpacity>
                        </Card>

                        <View
                            style={{
                                flex: 1,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1ECE4',
                                marginTop: gutter,
                                marginHorizontal: gutter,
                                marginBottom: isSm ? 16 : 24,
                                borderRadius: isSm ? 22 : 28,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: colors.border,
                                minHeight: isTablet ? 520 : 360,
                            }}
                        >
                            {selectedResource.type === 'image' ? (
                                <Image
                                    source={{ uri: previewUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="contain"
                                />
                            ) : selectedResource.type === 'pdf' || selectedResource.type === 'document' ? (
                                Platform.OS === 'web' ? (
                                    // @ts-ignore
                                    <iframe src={previewUrl} width="100%" height="100%" style={{ border: 'none', backgroundColor: 'transparent' }} />
                                ) : (
                                    <WebView
                                        source={{ uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(previewUrl)}` }}
                                        style={{ flex: 1, backgroundColor: 'transparent' }}
                                        startInLoadingState={true}
                                        renderLoading={() => <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: 'center' }} />}
                                    />
                                )
                            ) : (
                                Platform.OS === 'web' ? (
                                    // @ts-ignore
                                    <iframe src={previewUrl} width="100%" height="100%" style={{ border: 'none', backgroundColor: 'transparent' }} />
                                ) : (
                                    <WebView
                                        source={{ uri: previewUrl }}
                                        style={{ flex: 1, backgroundColor: 'transparent' }}
                                        startInLoadingState={true}
                                        renderLoading={() => <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: 'center' }} />}
                                    />
                                )
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderOverlay = (content: JSX.Element, onDismiss: () => void) => (
        <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: isSm ? 12 : 24,
            zIndex: 100,
        }}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
            <View style={{
                width: '100%',
                maxWidth: modalContentWidth || 1024,
                maxHeight: '90%',
                borderRadius: isSm ? 24 : 32,
                overflow: 'hidden',
                backgroundColor: colors.background,
            }}>
                {content}
            </View>
        </View>
    );

    const previewSheet = renderResourcePreviewSheet();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Animated.ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingBottom: isSm ? 40 : 60,
                }}
            >
                <MotiView
                    from={{ opacity: 0, translateY: -40 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 400, delay: 50 }}
                >
                    <LinearGradient
                        colors={[colors.primaryDark, colors.primary]}
                        style={{
                            paddingTop: headerTop,
                            paddingBottom: isXs ? 20 : 28,
                            paddingHorizontal: gutter,
                            borderBottomLeftRadius: isSm ? 24 : 32,
                            borderBottomRightRadius: isSm ? 24 : 32,
                            shadowColor: colors.primaryDark,
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.2,
                            shadowRadius: 16,
                            elevation: 8,
                            zIndex: 10,
                        }}
                    >
                        <View
                            style={[
                                contentWrapperStyle,
                                {
                                    width: '100%',
                                    alignSelf: 'center',
                                    flexDirection: isSm ? 'column' : 'row',
                                    justifyContent: 'space-between',
                                    alignItems: isSm ? 'stretch' : 'flex-start',
                                    gap: 16,
                                },
                            ]}
                        >
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.14)',
                                    paddingHorizontal: isXs ? 12 : 16,
                                    paddingVertical: 10,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.18)',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    alignSelf: isSm ? 'flex-start' : 'auto',
                                }}
                            >
                                <ArrowLeft size={18} color="white" />
                                <Text style={{ color: 'white', fontWeight: '800', marginLeft: 6 }}>Zurück</Text>
                            </TouchableOpacity>

                            <View style={{ flex: 1, alignItems: isSm ? 'flex-start' : 'flex-end' }}>
                                <Text style={{ fontSize: isXs ? 24 : 28, fontWeight: '900', color: 'white', marginTop: 12, letterSpacing: -0.8 }}>
                                    {i18n.t('resources.title', { defaultValue: 'Bibliothek' })}
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginTop: 4, maxWidth: isSm ? '100%' : 320, textAlign: isSm ? 'left' : 'right' }}>
                                    Material, Links und Dokumente, die dir dein Therapeut zur Verfügung gestellt hat.
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </MotiView>

                <View style={[contentWrapperStyle, { paddingHorizontal: gutter, paddingTop: gutter }]}>
                    <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: sectionGap, marginBottom: 24 }}>
                        <TouchableOpacity onPress={() => setSelectedCategory('all')} style={{ flex: 1 }}>
                            <ClientMetricCard
                                icon={FileText}
                                label="Gesamt"
                                value={String(resourceStats.all)}
                                hint={resourceStats.all === 0 ? 'Noch wurden keine Ressourcen geteilt.' : 'Alle freigegebenen Materialien in einem eigenen Fenster ansehen.'}
                                tone="primary"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSelectedCategory('docs')} style={{ flex: 1 }}>
                            <ClientMetricCard
                                icon={Download}
                                label="Dokumente"
                                value={String(resourceStats.docs)}
                                hint="PDFs und Unterlagen gesammelt in einer separaten Ansicht."
                                tone="secondary"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSelectedCategory('links')} style={{ flex: 1 }}>
                            <ClientMetricCard
                                icon={LinkIcon}
                                label="Links"
                                value={String(resourceStats.links)}
                                hint="Alle geteilten Links direkt in einem eigenen Fenster durchsuchen."
                                tone="success"
                            />
                        </TouchableOpacity>
                    </View>

                    <DashboardSectionHeader
                        title="Zuletzt geteilt"
                        subtitle="Neue Inhalte erscheinen hier automatisch nach Aktualisierung."
                    />

                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                    ) : resources.length === 0 ? (
                        <Card
                            variant="elevated"
                            padding={isSm ? 'md' : 'lg'}
                            style={{
                                alignItems: 'center',
                                marginTop: 8,
                                backgroundColor: colors.card,
                                borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                            }}
                        >
                            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F1EA', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                <FileText size={34} color={colors.textSubtle} />
                            </View>
                            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center' }}>
                                {i18n.t('resources.no_resources', { defaultValue: 'Keine Ressourcen' })}
                            </Text>
                            <Text style={{ color: colors.textSubtle, textAlign: 'center', lineHeight: 22, fontWeight: '600', maxWidth: 320 }}>
                                {i18n.t('resources.no_documents_uploaded', { defaultValue: 'Dein Therapeut hat noch keine Dokumente hinterlegt.' })}
                            </Text>
                        </Card>
                    ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'stretch', marginTop: 8 }}>
                            {resources.map((item, index) => renderResourceCard(item, index))}
                        </View>
                    )}
                </View>
            </Animated.ScrollView>

            {isWeb
                ? (selectedCategory ? renderOverlay(renderCategorySheet(), () => setSelectedCategory(null)) : null)
                : (selectedCategory ? (
                    <Modal
                        visible
                        animationType="slide"
                        presentationStyle="pageSheet"
                        onRequestClose={() => setSelectedCategory(null)}
                    >
                        {renderCategorySheet()}
                    </Modal>
                ) : null)}

            {isWeb
                ? (previewSheet ? renderOverlay(previewSheet, () => setSelectedResource(null)) : null)
                : (previewSheet ? (
                    <Modal
                        visible
                        animationType="slide"
                        presentationStyle="pageSheet"
                        onRequestClose={() => setSelectedResource(null)}
                    >
                        {previewSheet}
                    </Modal>
                ) : null)}
        </View>
    );
}


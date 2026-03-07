import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import i18n from '../../../../utils/i18n';
import { db } from '../../../../utils/firebase';
import { uploadFile, generateStoragePath, getExtension } from '../../../../utils/uploadFile';
import ExerciseBuilder from '../../../../components/therapist/ExerciseBuilder';
import { useAuth } from '../../../../contexts/AuthContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import { SuccessAnimation } from '../../../../components/ui/SuccessAnimation';

const HOME_BACKGROUNDS = [
    require('../../../../assets/HomeUi1.webp'),
    require('../../../../assets/HomeUi2.webp'),
    require('../../../../assets/HomeUi3.webp'),
    require('../../../../assets/HomeUi4.webp'),
    require('../../../../assets/HomeUi5.webp'),
    require('../../../../assets/HomeUi6.webp'),
];

type TemplateState = {
    title: string;
    blocks: any[];
    coverImage?: string;
    themeColor?: string;
};

type ToastState = {
    visible: boolean;
    message: string;
    subMessage?: string;
    type: 'success' | 'error' | 'warning';
};

export default function TemplateDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const isNew = id === 'new';
    const { profile } = useAuth();
    const { colors } = useTheme();
    const heroBackground = useMemo(
        () => HOME_BACKGROUNDS[Math.floor(Math.random() * HOME_BACKGROUNDS.length)],
        []
    );

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [builderVersion, setBuilderVersion] = useState(0);
    const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });
    const [template, setTemplate] = useState<TemplateState>({
        title: '',
        blocks: [],
    });

    useEffect(() => {
        if (!isNew && profile?.id) {
            fetchTemplate();
        }
    }, [id, isNew, profile?.id]);

    const fetchTemplate = async () => {
        try {
            if (!profile?.id) {
                setToast({ visible: true, message: i18n.t('templates.error'), subMessage: i18n.t('templates.not_found'), type: 'error' });
                router.back();
                return;
            }

            const docRef = doc(db, 'exercise_templates', id as string);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.therapistId !== profile.id) {
                    setToast({ visible: true, message: i18n.t('templates.error'), subMessage: i18n.t('templates.not_found'), type: 'error' });
                    router.back();
                    return;
                }
                setTemplate({
                    title: data.title || '',
                    blocks: data.blocks || [],
                    coverImage: data.coverImage,
                    themeColor: data.themeColor,
                });
            } else {
                setToast({ visible: true, message: i18n.t('templates.error'), subMessage: i18n.t('templates.not_found'), type: 'error' });
                router.back();
            }
        } catch (error) {
            console.error('Error loading template', error);
            setToast({ visible: true, message: i18n.t('templates.error'), subMessage: i18n.t('templates.load_err'), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (title: string, blocks: any[], coverImage?: string, themeColor?: string) => {
        if (!title) {
            setToast({ visible: true, message: i18n.t('templates.error'), subMessage: i18n.t('templates.title_req'), type: 'error' });
            return;
        }

        if (!profile?.id) {
            setToast({
                visible: true,
                message: i18n.t('templates.error', { defaultValue: 'Fehler' }),
                subMessage: i18n.t('templates.permission_required', { defaultValue: 'Bitte melde dich erneut an, um Vorlagen zu speichern.' }),
                type: 'error',
            });
            return;
        }

        setSaving(true);

        try {
            let processedCoverImage = coverImage;
            if (coverImage && !coverImage.startsWith('http')) {
                try {
                    const ext = getExtension(coverImage) || 'jpg';
                    const path = generateStoragePath('template_covers', ext);
                    processedCoverImage = await uploadFile(coverImage, path);
                } catch (uploadError) {
                    console.error('Error uploading cover image:', uploadError);
                    setToast({ visible: true, message: i18n.t('templates.error'), subMessage: 'Fehler beim Hochladen des Titelbilds.', type: 'error' });
                    setSaving(false);
                    return;
                }
            }

            const processedBlocks = await Promise.all(blocks.map(async block => {
                if (block.type === 'media' && block.mediaUri && !block.mediaUri.startsWith('http')) {
                    try {
                        const ext = getExtension(block.mediaUri) || 'jpg';
                        const path = generateStoragePath('exercise_media', ext);
                        const downloadUrl = await uploadFile(block.mediaUri, path);
                        return { ...block, mediaUri: downloadUrl };
                    } catch (uploadError) {
                        console.error('Error uploading media:', uploadError);
                        throw new Error(i18n.t('templates.media_upload_err'));
                    }
                }

                return block;
            }));

            if (isNew) {
                const newRef = doc(collection(db, 'exercise_templates'));
                await setDoc(newRef, {
                    title,
                    coverImage: processedCoverImage || null,
                    themeColor: themeColor || null,
                    blocks: processedBlocks,
                    therapistId: profile?.id,
                    createdAt: new Date().toISOString(),
                });
            } else {
                const docRef = doc(db, 'exercise_templates', id as string);
                await updateDoc(docRef, {
                    title,
                    coverImage: processedCoverImage || null,
                    themeColor: themeColor || null,
                    blocks: processedBlocks,
                    therapistId: profile?.id,
                });
            }

            setTemplate({
                title,
                blocks: processedBlocks,
                coverImage: processedCoverImage || undefined,
                themeColor: themeColor || undefined,
            });
            setBuilderVersion(prev => prev + 1);
            setSaving(false);
            setShowSuccess(true);
        } catch (error: any) {
            console.error('Error saving template', error);
            setToast({ visible: true, message: i18n.t('templates.error'), subMessage: error.message || i18n.t('templates.save_err'), type: 'error' });
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <Image
                    source={heroBackground}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    contentFit="cover"
                />
                <LinearGradient
                    colors={['rgba(18,33,38,0.76)', 'rgba(19,115,134,0.48)', 'rgba(18,33,38,0.84)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <MotiView
                    from={{ opacity: 0, translateY: 18 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 320 }}
                    style={{
                        width: '100%',
                        maxWidth: 460,
                        marginHorizontal: 20,
                        padding: 28,
                        borderRadius: 32,
                        backgroundColor: 'rgba(255,255,255,0.12)',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.16)',
                    }}
                >
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.6, marginTop: 18, marginBottom: 8 }}>
                        Vorlage wird geladen
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 21, fontWeight: '600' }}>
                        Der Editor wird mit Inhalt, Cover und Modulen vorbereitet.
                    </Text>
                </MotiView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ExerciseBuilder
                key={`${String(id)}-${builderVersion}`}
                initialTitle={template.title}
                initialBlocks={template.blocks}
                initialCoverImage={template.coverImage}
                initialThemeColor={template.themeColor}
                onSave={handleSave}
                onCancel={() => router.back()}
            />

            {saving ? (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.34)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 360,
                            borderRadius: 28,
                            padding: 24,
                            backgroundColor: Platform.OS === 'android' ? colors.card : 'rgba(255,255,255,0.92)',
                            borderWidth: 1,
                            borderColor: colors.border,
                            alignItems: 'center',
                        }}
                    >
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 14, marginBottom: 8 }}>
                            Vorlage wird gespeichert
                        </Text>
                        <Text style={{ color: colors.textSubtle, fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center' }}>
                            Medien und Inhalte werden vorbereitet und in die Bibliothek geschrieben.
                        </Text>
                    </View>
                </View>
            ) : null}

            <SuccessAnimation
                visible={showSuccess}
                message={isNew ? i18n.t('templates.created', { defaultValue: 'Vorlage erstellt!' }) : i18n.t('templates.updated', { defaultValue: 'Vorlage aktualisiert!' })}
                onAnimationDone={() => {
                    setShowSuccess(false);
                    router.back();
                }}
            />

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


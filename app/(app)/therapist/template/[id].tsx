import { View, ActivityIndicator } from 'react-native';
import i18n from '../../../../utils/i18n';
import { useEffect, useState } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';
import ExerciseBuilder from '../../../../components/therapist/ExerciseBuilder';
import { useAuth } from '../../../../contexts/AuthContext';
import { SuccessAnimation } from '../../../../components/ui/SuccessAnimation';
import { useTemplateEditor } from '../../../../hooks/therapist/useTemplateEditor';

export default function TemplateDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { profile } = useAuth();
    const [showSuccess, setShowSuccess] = useState(false);
    const [toast, setToast] = useState<{ visible: boolean, message: string, subMessage?: string, type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });
    const { isNew, loading, saving, template, notFound, loadError, saveTemplate } = useTemplateEditor(
        typeof id === 'string' ? id : undefined,
        profile?.id,
    );

    const handleSave = async (title: string, blocks: any[], coverImage?: string, themeColor?: string) => {
        if (!title) {
            setToast({ visible: true, message: i18n.t('templates.error'), subMessage: i18n.t('templates.title_req'), type: 'error' });
            return;
        }

        try {
            await saveTemplate({
                title,
                blocks,
                coverImage,
                themeColor,
            });
            setShowSuccess(true);
        } catch (error: any) {
            console.error("Error saving template", error);
            setToast({ visible: true, message: i18n.t('templates.error'), subMessage: error.message || i18n.t('templates.save_err'), type: 'error' });
        }
    };

    useEffect(() => {
        if (loading || isNew) return;

        if (notFound) {
            setToast({ visible: true, message: i18n.t('templates.error'), subMessage: i18n.t('templates.not_found'), type: 'error' });
            router.back();
            return;
        }

        if (loadError) {
            console.error('Error loading template', loadError);
            setToast({ visible: true, message: i18n.t('templates.error'), subMessage: i18n.t('templates.load_err'), type: 'error' });
            router.back();
        }
    }, [isNew, loadError, loading, notFound, router]);

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#F9F8F6]">
                <ActivityIndicator size="large" color="#137386" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#F9F8F6' }}>
            <ExerciseBuilder
                initialTitle={template.title}
                initialBlocks={template.blocks}
                initialCoverImage={template.coverImage}
                initialThemeColor={template.themeColor}
                onSave={handleSave}
                onCancel={() => router.back()}
            />

            {saving && (
                <View className="absolute inset-0 bg-black/30 justify-center items-center">
                    <ActivityIndicator size="large" color="#ffffff" />
                </View>
            )}

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

import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import i18n from '../../../../utils/i18n';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db, storage } from '../../../../utils/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { uploadFile, generateStoragePath, getExtension } from '../../../../utils/uploadFile';

import { useLocalSearchParams, useRouter } from 'expo-router';
import ExerciseBuilder from '../../../../components/therapist/ExerciseBuilder';
import { useAuth } from '../../../../contexts/AuthContext';
import { SuccessAnimation } from '../../../../components/ui/SuccessAnimation';
import { ChevronLeft } from 'lucide-react-native';

export default function TemplateDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const isNew = id === 'new';
    const { profile } = useAuth();

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [toast, setToast] = useState<{ visible: boolean, message: string, subMessage?: string, type: 'success' | 'error' | 'warning' }>({ visible: false, message: '', type: 'success' });
    const [template, setTemplate] = useState<{ title: string, blocks: any[], coverImage?: string, themeColor?: string }>({
        title: '',
        blocks: []
    });

    useEffect(() => {
        if (!isNew) {
            fetchTemplate();
        }
    }, [id]);

    const fetchTemplate = async () => {
        try {
            const docRef = doc(db, 'exercise_templates', id as string);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setTemplate({
                    title: data.title || '',
                    blocks: data.blocks || [],
                    coverImage: data.coverImage,
                    themeColor: data.themeColor
                });
            } else {
                setToast({ visible: true, message: i18n.t('templates.error'), subMessage: i18n.t('templates.not_found'), type: 'error' });
                router.back();
            }
        } catch (error) {
            console.error("Error loading template", error);
            setToast({ visible: true, message: i18n.t('templates.error'), subMessage: i18n.t('templates.load_err'), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Removed inline import for uploadFile
    const handleSave = async (title: string, blocks: any[], coverImage?: string, themeColor?: string) => {
        if (!title) {
            setToast({ visible: true, message: i18n.t('templates.error'), subMessage: i18n.t('templates.title_req'), type: 'error' });
            return;
        }

        setSaving(true);
        try {
            // Upload cover image if it's a local URI
            let processedCoverImage = coverImage;
            if (coverImage && !coverImage.startsWith('http')) {
                try {
                    const ext = getExtension(coverImage) || 'jpg';
                    const path = generateStoragePath('template_covers', ext);
                    processedCoverImage = await uploadFile(coverImage, path);
                } catch (uploadError) {
                    console.error("Error uploading cover image:", uploadError);
                    setToast({ visible: true, message: i18n.t('templates.error'), subMessage: "Fehler beim Hochladen des Titelbilds.", type: 'error' });
                    setSaving(false);
                    return;
                }
            }

            // Upload media blocks
            const processedBlocks = await Promise.all(blocks.map(async (block) => {
                if (block.type === 'media' && block.mediaUri && !block.mediaUri.startsWith('http')) {
                    try {
                        const ext = getExtension(block.mediaUri) || 'jpg';
                        const path = generateStoragePath('exercise_media', ext);
                        const downloadUrl = await uploadFile(block.mediaUri, path);
                        return { ...block, mediaUri: downloadUrl };
                    } catch (uploadError) {
                        console.error("Error uploading media:", uploadError);
                        throw new Error(i18n.t('templates.media_upload_err'));
                    }
                }
                return block;
            }));

            if (isNew) {
                const newRef = doc(collection(db, "exercise_templates"));
                await setDoc(newRef, {
                    title,
                    coverImage: processedCoverImage || null,
                    themeColor: themeColor || null,
                    blocks: processedBlocks,
                    therapistId: profile?.id, // Fix #18: track ownership
                    createdAt: new Date().toISOString()
                });
            } else {
                const docRef = doc(db, 'exercise_templates', id as string);
                await updateDoc(docRef, {
                    title,
                    coverImage: processedCoverImage || null,
                    themeColor: themeColor || null,
                    blocks: processedBlocks
                });
            }

            setSaving(false);
            setShowSuccess(true);
        } catch (error: any) {
            console.error("Error saving template", error);
            setToast({ visible: true, message: i18n.t('templates.error'), subMessage: error.message || i18n.t('templates.save_err'), type: 'error' });
            setSaving(false);
        }
    };

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

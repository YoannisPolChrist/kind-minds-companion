import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import i18n from '../../../../utils/i18n';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db, storage } from '../../../../utils/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ExerciseBuilder from '../../../../components/therapist/ExerciseBuilder';
import { useAuth } from '../../../../contexts/AuthContext';

export default function TemplateDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const isNew = id === 'new';
    const { profile } = useAuth();

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [template, setTemplate] = useState<{ title: string, blocks: any[] }>({
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
                setTemplate({ title: data.title || '', blocks: data.blocks || [] });
            } else {
                Alert.alert(i18n.t('templates.error'), i18n.t('templates.not_found'));
                router.back();
            }
        } catch (error) {
            console.error("Error loading template", error);
            Alert.alert(i18n.t('templates.error'), i18n.t('templates.load_err'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (title: string, blocks: any[]) => {
        if (!title) {
            Alert.alert(i18n.t('templates.error'), i18n.t('templates.title_req'));
            return;
        }

        setSaving(true);
        try {
            // Upload media blocks first
            const processedBlocks = await Promise.all(blocks.map(async (block) => {
                if (block.type === 'media' && block.mediaUri && !block.mediaUri.startsWith('http')) {
                    try {
                        const response = await fetch(block.mediaUri);
                        const blob = await response.blob();
                        const filename = block.mediaUri.substring(block.mediaUri.lastIndexOf('/') + 1);
                        const ext = filename.split('.').pop() || (block.mediaType === 'video' ? 'mp4' : 'jpg');
                        const storageRef = ref(storage, `exercise_media/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`);

                        await uploadBytes(storageRef, blob);
                        const downloadUrl = await getDownloadURL(storageRef);
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
                    blocks: processedBlocks,
                    therapistId: profile?.id, // Fix #18: track ownership
                    createdAt: new Date().toISOString()
                });
                if (Platform.OS === 'web') {
                    window.alert(`${i18n.t('templates.success')}:\n${i18n.t('templates.created')}`);
                    router.back();
                } else {
                    Alert.alert(i18n.t('templates.success'), i18n.t('templates.created'), [
                        { text: "OK", onPress: () => router.back() }
                    ]);
                }
            } else {
                const docRef = doc(db, 'exercise_templates', id as string);
                await updateDoc(docRef, { title, blocks: processedBlocks });
                if (Platform.OS === 'web') {
                    window.alert(`${i18n.t('templates.success')}:\n${i18n.t('templates.updated')}`);
                    router.back();
                } else {
                    Alert.alert(i18n.t('templates.success'), i18n.t('templates.updated'), [
                        { text: "OK", onPress: () => router.back() }
                    ]);
                }
            }
        } catch (error: any) {
            console.error("Error saving template", error);
            Alert.alert(i18n.t('templates.error'), error.message || i18n.t('templates.save_err'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#FAF9F6]">
                <ActivityIndicator size="large" color="#2C3E50" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#FAF9F6]">
            {/* Header */}
            <View className="bg-[#2C3E50] pt-16 pb-6 px-6 rounded-b-3xl shadow-md z-10 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()} className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md">
                    <Text className="text-white font-bold">{i18n.t('templates.back')}</Text>
                </TouchableOpacity>
                <Text className="text-xl font-extrabold text-white flex-1 text-right ml-4">
                    {isNew ? i18n.t('templates.new_title') : i18n.t('templates.edit_title')}
                </Text>
            </View>

            <View className="flex-1 p-4">
                <ExerciseBuilder
                    initialTitle={template.title}
                    initialBlocks={template.blocks}
                    onSave={handleSave}
                    onCancel={() => router.back()}
                />
            </View>

            {saving && (
                <View className="absolute inset-0 bg-black/30 justify-center items-center">
                    <ActivityIndicator size="large" color="#ffffff" />
                </View>
            )}
        </View>
    );
}

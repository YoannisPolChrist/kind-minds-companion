import { useCallback, useEffect, useState } from 'react';
import { fetchTemplateById, saveTemplateEditorDraft } from '../../modules/templates';
import { TemplateEditorInput } from '../../modules/templates/types';

type ToastType = 'success' | 'error' | 'warning';

export function useTemplateEditor(templateId?: string, therapistId?: string) {
    const isNew = !templateId || templateId === 'new';
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [loadError, setLoadError] = useState<Error | null>(null);
    const [template, setTemplate] = useState<TemplateEditorInput>({
        title: '',
        blocks: [],
    });

    const loadTemplate = useCallback(async () => {
        if (isNew || !templateId) {
            setLoading(false);
            return null;
        }

        try {
            setLoading(true);
            setNotFound(false);
            setLoadError(null);
            const data = await fetchTemplateById(templateId);
            if (!data) {
                setNotFound(true);
                return null;
            }

            const nextTemplate = {
                title: data.title || '',
                blocks: data.blocks || [],
                coverImage: data.coverImage,
                themeColor: data.themeColor,
            };
            setTemplate(nextTemplate);
            return nextTemplate;
        } catch (error) {
            setLoadError(error as Error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [isNew, templateId]);

    useEffect(() => {
        void loadTemplate();
    }, [loadTemplate]);

    const saveTemplate = useCallback(async (input: TemplateEditorInput) => {
        setSaving(true);
        try {
            const savedId = await saveTemplateEditorDraft({
                templateId: isNew ? undefined : templateId,
                therapistId,
                ...input,
            });
            setTemplate(input);
            return savedId;
        } finally {
            setSaving(false);
        }
    }, [isNew, templateId, therapistId]);

    return {
        isNew,
        loading,
        saving,
        notFound,
        loadError,
        template,
        setTemplate,
        reloadTemplate: loadTemplate,
        saveTemplate,
    };
}

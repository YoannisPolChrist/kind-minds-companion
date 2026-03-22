import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
    archiveTemplateForTherapist,
    assignTemplateToClient,
    fetchTherapistTemplates,
    filterTemplatesByQuery,
    TemplateRecord,
    updateTemplateThemeColorForTherapist,
} from '../../modules/templates';

export function useTherapistTemplates(therapistId?: string, search = '') {
    const [templates, setTemplates] = useState<TemplateRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTemplates = useCallback(async (options?: { forceFresh?: boolean }) => {
        if (!therapistId) {
            setTemplates([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const nextTemplates = await fetchTherapistTemplates(therapistId, options);
            setTemplates(nextTemplates);
        } catch (error) {
            console.error('Failed to load therapist templates', error);
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    }, [therapistId]);

    useFocusEffect(
        useCallback(() => {
            loadTemplates();
        }, [loadTemplates])
    );

    const filteredTemplates = useMemo(
        () => filterTemplatesByQuery(templates, search),
        [search, templates]
    );

    const assign = useCallback(async (template: TemplateRecord, clientId: string) => {
        await assignTemplateToClient(template, clientId);
    }, []);

    const archive = useCallback(async (templateId: string) => {
        if (!therapistId) return;
        await archiveTemplateForTherapist(templateId, therapistId);
        setTemplates((current) => current.filter((template) => template.id !== templateId));
    }, [therapistId]);

    const updateThemeColor = useCallback(async (templateId: string, color: string) => {
        if (!therapistId) return;
        await updateTemplateThemeColorForTherapist(templateId, therapistId, color);
        setTemplates((current) =>
            current.map((template) => template.id === templateId ? { ...template, themeColor: color } : template)
        );
    }, [therapistId]);

    return {
        templates,
        filteredTemplates,
        loading,
        assignTemplate: assign,
        archiveTemplate: archive,
        updateThemeColor,
        refreshTemplates: () => loadTemplates({ forceFresh: true }),
    };
}

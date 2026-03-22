import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    assignResourcesToClients,
    createLinkResource,
    deleteResourceEntry,
    fetchTherapistResources,
    filterResources,
    ResourceFilter,
    ResourceRecord,
    togglePinnedResource,
    uploadFileResource,
} from '../../modules/resources';

export function useTherapistResources() {
    const [resources, setResources] = useState<ResourceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<ResourceFilter>('all');

    const loadResources = useCallback(async (options?: { forceFresh?: boolean }) => {
        try {
            setLoading(true);
            const nextResources = await fetchTherapistResources(options);
            setResources(nextResources);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadResources();
    }, [loadResources]);

    const filteredResources = useMemo(
        () => filterResources(resources, searchQuery, activeFilter),
        [resources, searchQuery, activeFilter]
    );

    const saveLink = useCallback(async (payload: { title: string; description: string; linkUrl: string; tagsInput: string }) => {
        setSaving(true);
        try {
            await createLinkResource(payload);
            await loadResources({ forceFresh: true });
        } finally {
            setSaving(false);
        }
    }, [loadResources]);

    const uploadResourceFile = useCallback(async (payload: { title: string; description: string; tagsInput: string }) => {
        setSaving(true);
        try {
            await uploadFileResource(payload);
            await loadResources({ forceFresh: true });
        } finally {
            setSaving(false);
        }
    }, [loadResources]);

    const assignResources = useCallback(async (therapistId: string, clientIds: string[], entries: ResourceRecord[]) => {
        setAssigning(true);
        try {
            await assignResourcesToClients(therapistId, clientIds, entries);
        } finally {
            setAssigning(false);
        }
    }, []);

    const removeResource = useCallback(async (resource: ResourceRecord) => {
        await deleteResourceEntry(resource);
        setResources((current) => current.filter((entry) => entry.id !== resource.id));
    }, []);

    const togglePin = useCallback(async (resource: ResourceRecord) => {
        const nextPinned = await togglePinnedResource(resource);
        setResources((current) =>
            current
                .map((entry) => entry.id === resource.id ? { ...entry, isPinned: nextPinned } : entry)
                .sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                })
        );
    }, []);

    return {
        resources,
        filteredResources,
        loading,
        saving,
        assigning,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
        refreshResources: () => loadResources({ forceFresh: true }),
        saveLink,
        uploadResourceFile,
        assignResources,
        removeResource,
        togglePin,
    };
}

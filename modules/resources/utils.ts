import { ResourceFilter, ResourceRecord, ResourceType } from './types';

export function sortResources(resources: ResourceRecord[]): ResourceRecord[] {
    return [...resources].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });
}

export function filterResources(resources: ResourceRecord[], searchQuery: string, activeFilter: ResourceFilter): ResourceRecord[] {
    const term = searchQuery.trim().toLowerCase();

    return resources.filter((resource) => {
        const matchSearch = !term ||
            `${resource.title || ''}`.toLowerCase().includes(term) ||
            `${resource.description || ''}`.toLowerCase().includes(term) ||
            (resource.tags || []).some((tag) => tag.toLowerCase().includes(term));

        let matchFilter = true;
        if (activeFilter === 'documents') matchFilter = ['document', 'pdf', 'file'].includes(resource.type);
        if (activeFilter === 'media') matchFilter = ['image', 'video'].includes(resource.type);
        if (activeFilter === 'links') matchFilter = resource.type === 'link';

        return matchSearch && matchFilter;
    });
}

export function inferResourceType(mimeType?: string | null): ResourceType {
    if (!mimeType) return 'document';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'document';
}

export function normalizeTags(tagsInput: string): string[] {
    return tagsInput.split(',').map((entry) => entry.trim()).filter(Boolean);
}

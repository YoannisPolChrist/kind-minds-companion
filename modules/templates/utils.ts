import { TemplateRecord } from './types';

export function filterTemplatesByQuery(templates: TemplateRecord[], query: string): TemplateRecord[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return templates;

    return templates.filter((template) => {
        const inTitle = `${template.title || ''}`.toLowerCase().includes(normalizedQuery);
        const inBlocks = (template.blocks || []).some((block) =>
            `${block?.content || ''}`.toLowerCase().includes(normalizedQuery)
        );

        return inTitle || inBlocks;
    });
}

export function isRemoteAsset(uri?: string | null): boolean {
    if (!uri) return false;
    return uri.startsWith('http://') || uri.startsWith('https://');
}

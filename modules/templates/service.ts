import { TemplateRepository } from '../../utils/repositories/TemplateRepository';
import { generateStoragePath, getExtension, uploadFile } from '../../utils/uploadFile';
import { clearCachedResource, getCachedResource, resolveCachePolicy, setCachedResource } from '../shared';
import { TemplateEditorInput, TemplateRecord } from './types';
import { isRemoteAsset } from './utils';

function getTemplateListCacheKey(therapistId: string) {
    return `templates:list:${therapistId}`;
}

function getTemplateDetailCacheKey(templateId: string) {
    return `templates:detail:${templateId}`;
}

export async function fetchTherapistTemplates(
    therapistId: string,
    options?: { forceFresh?: boolean; staleTimeMs?: number; limitCount?: number }
): Promise<TemplateRecord[]> {
    const cacheKey = getTemplateListCacheKey(therapistId);
    const policy = resolveCachePolicy(options?.staleTimeMs ? {
        category: 'summary',
        memoryTtlMs: options.staleTimeMs,
        diskTtlMs: options.staleTimeMs,
    } : 'summary');

    if (!options?.forceFresh) {
        const cached = await getCachedResource<TemplateRecord[]>(cacheKey, policy);
        if (cached) {
            return cached.data;
        }
    }

    const templates = await TemplateRepository.findActiveTemplates(options?.limitCount ?? 50, therapistId);
    await setCachedResource(cacheKey, templates, policy);
    return templates;
}

export async function assignTemplateToClient(template: TemplateRecord, clientId: string): Promise<void> {
    await TemplateRepository.assignToClient(template, clientId);
}

export async function fetchTemplateById(templateId: string): Promise<TemplateRecord | null> {
    const cacheKey = getTemplateDetailCacheKey(templateId);
    const policy = resolveCachePolicy('detail');
    const cached = await getCachedResource<TemplateRecord>(cacheKey, policy);
    if (cached) {
        return cached.data;
    }

    const template = await TemplateRepository.findById(templateId);
    if (template) {
        await setCachedResource(cacheKey, template, policy);
    }

    return template;
}

async function uploadTemplateCoverIfNeeded(coverImage?: string): Promise<string | null> {
    if (!coverImage) return null;
    if (isRemoteAsset(coverImage)) return coverImage;

    const extension = getExtension(coverImage) || 'jpg';
    const path = generateStoragePath('template_covers', extension);
    return uploadFile(coverImage, path);
}

async function uploadTemplateBlocksIfNeeded(blocks: any[]): Promise<any[]> {
    return Promise.all(
        blocks.map(async (block) => {
            if (block.type !== 'media' || !block.mediaUri || isRemoteAsset(block.mediaUri)) {
                return block;
            }

            const extension = getExtension(block.mediaUri) || 'jpg';
            const path = generateStoragePath('exercise_media', extension);
            const downloadUrl = await uploadFile(block.mediaUri, path);

            return {
                ...block,
                mediaUri: downloadUrl,
            };
        })
    );
}

export async function saveTemplateEditorDraft(
    input: TemplateEditorInput & { templateId?: string; therapistId?: string }
): Promise<string> {
    const coverImage = await uploadTemplateCoverIfNeeded(input.coverImage);
    const blocks = await uploadTemplateBlocksIfNeeded(input.blocks || []);

    if (input.templateId) {
        await TemplateRepository.updateTemplate(input.templateId, {
            title: input.title,
            coverImage,
            themeColor: input.themeColor || null,
            blocks,
        });
        await clearCachedResource(getTemplateDetailCacheKey(input.templateId));
        if (input.therapistId) {
            await clearCachedResource(getTemplateListCacheKey(input.therapistId));
        }
        return input.templateId;
    }

    const createdId = await TemplateRepository.createTemplate({
        title: input.title,
        coverImage,
        themeColor: input.themeColor || null,
        blocks,
        therapistId: input.therapistId,
        createdAt: new Date().toISOString(),
    });

    if (input.therapistId) {
        await clearCachedResource(getTemplateListCacheKey(input.therapistId));
    }

    return createdId;
}

export async function archiveTemplateForTherapist(templateId: string, therapistId: string): Promise<void> {
    await TemplateRepository.archiveTemplate(templateId);
    await clearCachedResource(getTemplateListCacheKey(therapistId));
    await clearCachedResource(getTemplateDetailCacheKey(templateId));
}

export async function updateTemplateThemeColorForTherapist(
    templateId: string,
    therapistId: string,
    color: string
): Promise<void> {
    await TemplateRepository.updateThemeColor(templateId, color);
    await clearCachedResource(getTemplateListCacheKey(therapistId));
    await clearCachedResource(getTemplateDetailCacheKey(templateId));
}

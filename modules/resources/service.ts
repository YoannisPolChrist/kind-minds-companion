import * as DocumentPicker from 'expo-document-picker';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../../utils/firebase';
import { ClientRepository } from '../../utils/repositories/ClientRepository';
import { ResourceRepository } from '../../utils/repositories/ResourceRepository';
import { uploadFile } from '../../utils/uploadFile';
import { createResourceSharedNotification } from '../notifications';
import { clearCachedResource, loadCachedQuery } from '../shared';
import { CreateFileResourceInput, CreateLinkResourceInput, ResourceRecord } from './types';
import { inferResourceType, normalizeTags, sortResources } from './utils';

const RESOURCE_CACHE_KEY = 'resources:list';

export async function fetchTherapistResources(options?: { forceFresh?: boolean; staleTimeMs?: number }): Promise<ResourceRecord[]> {
    const policy = options?.staleTimeMs ? {
        category: 'summary',
        memoryTtlMs: options.staleTimeMs,
        diskTtlMs: options.staleTimeMs,
    } : 'summary';

    return loadCachedQuery({
        key: RESOURCE_CACHE_KEY,
        policy,
        forceFresh: options?.forceFresh,
        onOfflineFallback: (error) => console.warn('Using offline resources cache', error),
        load: async () => sortResources(await ResourceRepository.findAll()),
    });
}

async function invalidateResourceList(): Promise<void> {
    await clearCachedResource(RESOURCE_CACHE_KEY);
}

export async function createLinkResource(input: CreateLinkResourceInput): Promise<void> {
    await addDoc(collection(db, 'resources'), {
        title: input.title.trim(),
        description: input.description.trim(),
        type: 'link',
        url: input.linkUrl.trim(),
        isPinned: false,
        tags: normalizeTags(input.tagsInput),
        createdAt: serverTimestamp(),
    });
    await invalidateResourceList();
}

export async function uploadFileResource(input: CreateFileResourceInput): Promise<void> {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) {
        return;
    }

    const asset = result.assets[0];
    const type = inferResourceType(asset.mimeType);
    const storagePath = `resources/${Date.now()}_${asset.name}`;
    const url = await uploadFile(asset.uri, storagePath, asset.mimeType || undefined);

    await addDoc(collection(db, 'resources'), {
        title: input.title.trim(),
        description: input.description.trim(),
        type,
        url,
        storagePath,
        originalName: asset.name,
        isPinned: false,
        tags: normalizeTags(input.tagsInput),
        createdAt: serverTimestamp(),
    });

    await invalidateResourceList();
}

export async function assignResourcesToClients(
    therapistId: string,
    clientIds: string[],
    resources: ResourceRecord[]
): Promise<void> {
    const work: Promise<unknown>[] = [];

    for (const clientId of clientIds) {
        for (const resource of resources) {
            work.push(addDoc(collection(db, 'client_resources'), {
                clientId,
                therapistId,
                title: resource.title,
                description: resource.description || '',
                type: resource.type,
                url: resource.url || '',
                originalName: resource.originalName || null,
                storagePath: resource.storagePath || null,
                originalResourceId: resource.id,
                createdAt: serverTimestamp(),
            }));
        }

        work.push(createResourceSharedNotification({
            userId: clientId,
            resourceTitle: resources.length === 1 ? resources[0]?.title : undefined,
            resourceType: resources.length === 1 ? resources[0]?.type : undefined,
            resourceCount: resources.length,
        }));
    }

    await Promise.all(work);
}

export async function deleteResourceEntry(resource: ResourceRecord): Promise<void> {
    if (resource.type !== 'link' && resource.storagePath) {
        try {
            await deleteObject(ref(storage, resource.storagePath));
        } catch (error) {
            console.warn('Storage delete failed', error);
        }
    }

    await deleteDoc(doc(db, 'resources', resource.id));
    await invalidateResourceList();
}

export async function togglePinnedResource(resource: ResourceRecord): Promise<boolean> {
    const nextPinned = !resource.isPinned;
    await updateDoc(doc(db, 'resources', resource.id), { isPinned: nextPinned });
    await invalidateResourceList();
    return nextPinned;
}

export async function fetchTherapistResourceClients(therapistId: string) {
    return ClientRepository.findAllClients(therapistId);
}

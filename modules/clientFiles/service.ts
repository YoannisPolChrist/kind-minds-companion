import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../../utils/firebase';
import { uploadFile } from '../../utils/uploadFile';
import { createFileUploadedNotification } from '../notifications';
import { clearCachedResource, getCachedResource, resolveCachePolicy, setCachedResource } from '../shared';
import { ClientFileRecord, ClientFileUploadInput } from './types';
import { sortClientFiles } from './utils';

function buildClientFilesCacheKey(clientId: string): string {
    return `clientFiles:list:${clientId}`;
}

export async function fetchClientFilesSnapshot(
    clientId: string,
    options?: { forceFresh?: boolean; staleTimeMs?: number }
): Promise<ClientFileRecord[]> {
    const cacheKey = buildClientFilesCacheKey(clientId);
    const policy = resolveCachePolicy(options?.staleTimeMs ? {
        category: 'heavy',
        memoryTtlMs: options.staleTimeMs,
    } : 'heavy');

    if (!options?.forceFresh) {
        const cached = await getCachedResource<ClientFileRecord[]>(cacheKey, policy);
        if (cached) {
            return cached.data;
        }
    }

    const snapshot = await getDocs(query(collection(db, 'client_resources'), where('clientId', '==', clientId)));
    const files = sortClientFiles(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as ClientFileRecord)));
    await setCachedResource(cacheKey, files, policy);
    return files;
}

export async function uploadClientFile(input: ClientFileUploadInput): Promise<void> {
    const mimeType = input.asset.mimeType || 'application/octet-stream';
    const storagePath = `client_resources/${input.clientId}/${Date.now()}_${input.asset.name}`;
    const downloadUrl = await uploadFile(input.asset.uri, storagePath, mimeType);

    await addDoc(collection(db, 'client_resources'), {
        clientId: input.clientId,
        therapistId: input.therapistId,
        title: input.title.trim(),
        description: input.description.trim(),
        type: 'document',
        url: downloadUrl,
        originalName: input.asset.name,
        storagePath,
        fileSize: input.asset.size,
        mimeType,
        createdAt: serverTimestamp(),
    });

    await createFileUploadedNotification({
        userId: input.clientId,
        fileName: input.title.trim() || input.asset.name,
    });

    await clearCachedResource(buildClientFilesCacheKey(input.clientId));
}

export async function deleteClientFile(file: ClientFileRecord): Promise<void> {
    if (file.storagePath) {
        try {
            await deleteObject(ref(storage, file.storagePath));
        } catch (error) {
            console.warn('Storage delete failed', error);
        }
    }

    await deleteDoc(doc(db, 'client_resources', file.id));

    if (file.clientId) {
        await clearCachedResource(buildClientFilesCacheKey(file.clientId));
    }
}

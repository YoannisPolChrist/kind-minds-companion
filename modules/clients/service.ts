import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { ClientRepository } from '../../utils/repositories/ClientRepository';
import { createAppointmentSavedNotification, formatAppointmentNotificationLabel } from '../notifications';
import { clearCachedResource, getCachedResource, resolveCachePolicy, setCachedResource } from '../shared';
import { ClientOverview, ClientProfile } from './types';

function getClientsListCacheKey(therapistId: string): string {
    return `clients:list:${therapistId}`;
}

function getClientOverviewCacheKey(clientId: string): string {
    return `clients:overview:${clientId}`;
}

export async function clearClientScopedCaches(clientId: string): Promise<void> {
    await Promise.all([
        clearCachedResource(getClientOverviewCacheKey(clientId)),
        clearCachedResource(`checkins:list:${clientId}`),
        clearCachedResource(`checkins:status:${clientId}`),
        clearCachedResource(`clientFiles:list:${clientId}`),
        clearCachedResource(`history:feed:${clientId}`),
        clearCachedResource(`exercises:list:${clientId}`),
    ]);
}

export async function fetchTherapistClients(
    therapistId: string,
    options?: { forceFresh?: boolean; staleTimeMs?: number }
): Promise<ClientProfile[]> {
    const cacheKey = getClientsListCacheKey(therapistId);
    const policy = resolveCachePolicy(options?.staleTimeMs ? {
        category: 'summary',
        memoryTtlMs: options.staleTimeMs,
        diskTtlMs: options.staleTimeMs,
    } : 'summary');

    if (!options?.forceFresh) {
        const cached = await getCachedResource<ClientProfile[]>(cacheKey, policy);
        if (cached) {
            return cached.data;
        }
    }

    const clients = await ClientRepository.findAllClients(therapistId);
    await setCachedResource(cacheKey, clients, policy);
    return clients;
}

export async function fetchClientOverview(
    clientId: string,
    options?: { forceFresh?: boolean; staleTimeMs?: number }
): Promise<ClientOverview> {
    const cacheKey = getClientOverviewCacheKey(clientId);
    const policy = resolveCachePolicy(options?.staleTimeMs ? {
        category: 'detail',
        memoryTtlMs: options.staleTimeMs,
        diskTtlMs: options.staleTimeMs,
    } : 'detail');

    if (!options?.forceFresh) {
        const cached = await getCachedResource<ClientOverview>(cacheKey, policy);
        if (cached) {
            return cached.data;
        }
    }

    const client = await ClientRepository.findById(clientId);
    const [exerciseSnapshot, checkinSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'exercises'), where('clientId', '==', clientId))),
        getDocs(query(collection(db, 'checkins'), where('uid', '==', clientId))),
    ]);

    const overview: ClientOverview = {
        client,
        exerciseCount: exerciseSnapshot.size,
        completedCount: exerciseSnapshot.docs.filter((entry) => Boolean(entry.data().completed)).length,
        checkinCount: checkinSnapshot.size,
    };

    await setCachedResource(cacheKey, overview, policy);
    return overview;
}

export async function updateClientAppointment(clientId: string, nextAppointment: string): Promise<void> {
    await updateDoc(doc(db, 'users', clientId), { nextAppointment });

    if (nextAppointment.trim()) {
        try {
            await createAppointmentSavedNotification({
                userId: clientId,
                appointmentLabel: formatAppointmentNotificationLabel(nextAppointment),
            });
        } catch (error) {
            console.warn('Could not create appointment notification', error);
        }
    }

    await clearCachedResource(getClientOverviewCacheKey(clientId));
}

export async function deleteClientWorkspace(clientId: string): Promise<void> {
    const collectionsToDelete = ['exercises', 'checkins', 'client_notes', 'client_files', 'client_resources'];
    const fieldMap: Record<string, string> = {
        exercises: 'clientId',
        checkins: 'uid',
        client_notes: 'clientId',
        client_files: 'clientId',
        client_resources: 'clientId',
    };

    for (const collectionName of collectionsToDelete) {
        const snapshot = await getDocs(query(collection(db, collectionName), where(fieldMap[collectionName], '==', clientId)));
        await Promise.all(snapshot.docs.map((entry) => deleteDoc(doc(db, collectionName, entry.id))));
    }

    await deleteDoc(doc(db, 'users', clientId));
    await clearClientScopedCaches(clientId);
}

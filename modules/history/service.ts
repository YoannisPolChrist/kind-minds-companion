import { collection, getDocs, query, where } from 'firebase/firestore';
import { ExerciseRepository } from '../../utils/repositories/ExerciseRepository';
import { db } from '../../utils/firebase';
import { loadCachedQuery } from '../shared';
import { CheckinRecord } from '../checkins/types';
import { HistoryEntry, sortHistoryEntries } from './utils';

export async function fetchHistoryFeed(
    userId: string,
    options?: { forceFresh?: boolean; staleTimeMs?: number }
): Promise<HistoryEntry[]> {
    const cacheKey = `history:feed:${userId}`;
    const policy = options?.staleTimeMs ? {
        category: 'summary',
        memoryTtlMs: options.staleTimeMs,
        diskTtlMs: options.staleTimeMs,
    } : 'summary';

    return loadCachedQuery({
        key: cacheKey,
        policy,
        forceFresh: options?.forceFresh,
        onOfflineFallback: (error) => console.warn('Using offline history cache', error),
        load: async () => {
            const [exercises, checkinsSnapshot] = await Promise.all([
                ExerciseRepository.findAllByClientId(userId),
                getDocs(query(collection(db, 'checkins'), where('uid', '==', userId))),
            ]);

            const completedExercises = exercises
                .filter((entry) => entry.completed)
                .map((entry) => ({ ...entry, isCheckin: false as const }));

            const checkins = checkinsSnapshot.docs.map((entry) => ({
                id: entry.id,
                isCheckin: true as const,
                ...(entry.data() as CheckinRecord),
            }));

            return sortHistoryEntries([...completedExercises, ...checkins]);
        },
    });
}

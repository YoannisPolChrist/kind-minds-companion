import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Exercise } from '../../types';
import { normalizeExercise } from '../../utils/domain/exercises';
import { db } from '../../utils/firebase';
import { clearCachedResource, clearCacheByPrefix, getCachedResource, resolveCachePolicy, setCachedResource } from '../shared';
import { sanitizeExerciseAnswers } from './utils';

function buildExerciseCacheKey(exerciseId: string): string {
    return `exercise:detail:${exerciseId}`;
}

export async function fetchClientExercise(
    exerciseId: string,
    options?: { forceFresh?: boolean; staleTimeMs?: number }
): Promise<Exercise | null> {
    const cacheKey = buildExerciseCacheKey(exerciseId);
    const policy = resolveCachePolicy(options?.staleTimeMs ? {
        category: 'detail',
        memoryTtlMs: options.staleTimeMs,
        diskTtlMs: options.staleTimeMs,
    } : 'detail');

    if (!options?.forceFresh) {
        const cached = await getCachedResource<Exercise>(cacheKey, policy);
        if (cached) {
            return cached.data;
        }
    }

    const snapshot = await getDoc(doc(db, 'exercises', exerciseId));
    if (!snapshot.exists()) {
        return null;
    }

    const exercise = normalizeExercise({ id: snapshot.id, ...snapshot.data() } as Exercise);
    await setCachedResource(cacheKey, exercise, policy);
    return exercise;
}

export async function completeClientExercise(
    exerciseId: string,
    payload: { answers: Record<string, unknown>; sharedAnswers: boolean }
): Promise<Record<string, unknown>> {
    const cleanAnswers = sanitizeExerciseAnswers(payload.answers);
    const exerciseRef = doc(db, 'exercises', exerciseId);
    const snapshot = await getDoc(exerciseRef);
    const exercise = snapshot.exists() ? normalizeExercise({ id: snapshot.id, ...snapshot.data() } as Exercise) : null;

    await updateDoc(exerciseRef, {
        answers: cleanAnswers,
        completed: true,
        status: 'completed',
        sharedAnswers: payload.sharedAnswers,
        lastCompletedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
    });

    await clearCachedResource(buildExerciseCacheKey(exerciseId));
    if (exercise?.clientId) {
        await Promise.all([
            clearCachedResource(`exercises:list:${exercise.clientId}`),
            clearCachedResource(`clients:overview:${exercise.clientId}`),
            clearCachedResource(`history:feed:${exercise.clientId}`),
            clearCacheByPrefix(`checkins:status:${exercise.clientId}`),
        ]);
    }
    return cleanAnswers;
}

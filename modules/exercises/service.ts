import { InteractionManager } from 'react-native';
import * as Calendar from 'expo-calendar';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Exercise } from '../../types';
import { db } from '../../utils/firebase';
import { syncExercisesToCalendar } from '../../utils/calendar';
import { scheduleExerciseReminders } from '../../utils/notifications';
import { normalizeExercise } from '../../utils/domain/exercises';
import { clearCachedResource, getCachedResource, resolveCachePolicy, setCachedResource } from '../shared';
import { isRecurrenceResetDue } from './recurrence';

async function resetRecurringExercise(exerciseId: string): Promise<void> {
    await updateDoc(doc(db, 'exercises', exerciseId), {
        completed: false,
        answers: {},
        status: 'open',
    });
}

export async function fetchClientExercisesSnapshot(
    clientId: string,
    options?: { forceFresh?: boolean; staleTimeMs?: number }
): Promise<Exercise[]> {
    const cacheKey = `exercises:list:${clientId}`;
    const policy = resolveCachePolicy(options?.staleTimeMs ? {
        category: 'summary',
        memoryTtlMs: options.staleTimeMs,
        diskTtlMs: options.staleTimeMs,
    } : 'summary');

    if (!options?.forceFresh) {
        const cached = await getCachedResource<Exercise[]>(cacheKey, policy);
        if (cached) {
            return cached.data;
        }
    }

    const snapshot = await getDocs(query(collection(db, 'exercises'), where('clientId', '==', clientId)));
    const nextExercisesRaw = await Promise.all(snapshot.docs.map(async (entry) => {
        const exercise = { id: entry.id, ...entry.data() } as Exercise;
        if (!isRecurrenceResetDue(exercise)) {
            return normalizeExercise(exercise);
        }

        try {
            await resetRecurringExercise(exercise.id);
            return normalizeExercise({
                ...exercise,
                completed: false,
                answers: {},
                status: 'open',
            });
        } catch (error) {
            console.error('Reset failed:', error);
            return normalizeExercise(exercise);
        }
    }));

    const nextExercises = nextExercisesRaw.filter((exercise) => !exercise.archived);
    await setCachedResource(cacheKey, nextExercises, policy);
    return nextExercises;
}

export function warmExerciseSideEffects(exercises: Exercise[]) {
    InteractionManager.runAfterInteractions(async () => {
        scheduleExerciseReminders(exercises).catch((error) => console.error('Failed to schedule reminders:', error));
        try {
            const { status } = await Calendar.getCalendarPermissionsAsync();
            if (status === 'granted') {
                syncExercisesToCalendar(exercises, true);
            }
        } catch (error) {
            console.error('Failed to auto-sync calendar:', error);
        }
    });
}

export async function completeExercise(exerciseId: string, answers: Record<string, any>): Promise<void> {
    const exerciseRef = doc(db, 'exercises', exerciseId);
    const snapshot = await getDoc(exerciseRef);
    const clientId = snapshot.exists() ? `${snapshot.data().clientId || ''}` : '';

    await updateDoc(exerciseRef, {
        completed: true,
        status: 'completed',
        answers,
        lastCompletedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
    });

    if (clientId) {
        await Promise.all([
            clearCachedResource(`exercises:list:${clientId}`),
            clearCachedResource(`history:feed:${clientId}`),
            clearCachedResource(`clients:overview:${clientId}`),
        ]);
    }
}

export async function resetExercise(exerciseId: string): Promise<void> {
    const exerciseRef = doc(db, 'exercises', exerciseId);
    const snapshot = await getDoc(exerciseRef);
    const clientId = snapshot.exists() ? `${snapshot.data().clientId || ''}` : '';

    await updateDoc(exerciseRef, {
        completed: false,
        status: 'open',
        answers: {},
        updatedAt: serverTimestamp(),
    });

    if (clientId) {
        await Promise.all([
            clearCachedResource(`exercises:list:${clientId}`),
            clearCachedResource(`history:feed:${clientId}`),
            clearCachedResource(`clients:overview:${clientId}`),
        ]);
    }
}

export async function archiveExercise(exerciseId: string): Promise<void> {
    const exerciseRef = doc(db, 'exercises', exerciseId);
    const snapshot = await getDoc(exerciseRef);
    const clientId = snapshot.exists() ? `${snapshot.data().clientId || ''}` : '';

    await updateDoc(exerciseRef, {
        archived: true,
        status: 'archived',
        archivedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
    });

    if (clientId) {
        await Promise.all([
            clearCachedResource(`exercises:list:${clientId}`),
            clearCachedResource(`history:feed:${clientId}`),
            clearCachedResource(`clients:overview:${clientId}`),
        ]);
    }
}

export async function saveDraftAnswers(exerciseId: string, answers: Record<string, any>): Promise<void> {
    const exerciseRef = doc(db, 'exercises', exerciseId);
    const snapshot = await getDoc(exerciseRef);
    const clientId = snapshot.exists() ? `${snapshot.data().clientId || ''}` : '';

    await updateDoc(exerciseRef, {
        status: 'in_progress',
        draftAnswers: answers,
        draftSavedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
    });

    if (clientId) {
        await clearCachedResource(`exercises:list:${clientId}`);
    }
}

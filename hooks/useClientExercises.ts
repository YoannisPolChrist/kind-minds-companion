import { useState, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Exercise } from '../types';
import { scheduleExerciseReminders } from '../utils/notifications';
import { syncExercisesToCalendar } from '../utils/calendar';
import { getLocalCache, setLocalCache } from '../utils/SyncManager';
import * as Calendar from 'expo-calendar';

function isRecurrenceResetDue(exercise: Exercise): boolean {
    if (!exercise.completed || !exercise.lastCompletedAt) return false;
    if (!exercise.recurrence || exercise.recurrence === 'none') return false;

    const lastCompleted = new Date(exercise.lastCompletedAt);
    const today = new Date();
    const lastMidnight = startOfDay(lastCompleted);
    const todayMidnight = startOfDay(today);

    if (exercise.recurrence === 'daily') {
        return todayMidnight.getTime() > lastMidnight.getTime();
    }
    if (exercise.recurrence === 'weekly') {
        const diffDays = daysBetween(todayMidnight, lastMidnight);
        return diffDays >= 7;
    }
    return false;
}

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(a: Date, b: Date): number {
    return Math.ceil(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

async function resetExercise(exerciseId: string): Promise<void> {
    await updateDoc(doc(db, 'exercises', exerciseId), {
        completed: false,
        answers: {},
    });
}

export function useClientExercises(clientId: string | undefined) {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchExercises = useCallback(async () => {
        if (!clientId) {
            setLoading(false);
            return;
        }
        try {
            // ── Offline-first: render cache instantly ──────────────────────
            const cacheKey = `exercises_${clientId}`;
            const cached = await getLocalCache<Exercise[]>(cacheKey);
            if (cached && cached.length > 0) {
                setExercises(cached);
                setLoading(false); // already has data to show; Firestore fetch runs silently
            } else {
                setLoading(true);
            }

            // ── Always fetch fresh data from Firestore ─────────────────────
            const snapshot = await getDocs(
                query(collection(db, 'exercises'), where('clientId', '==', clientId))
            );

            const resultsRaw = await Promise.all(snapshot.docs
                .map(async (docSnap) => {
                    const exercise = { id: docSnap.id, ...docSnap.data() } as Exercise;
                    if (isRecurrenceResetDue(exercise)) {
                        try {
                            await resetExercise(exercise.id);
                            return { ...exercise, completed: false, answers: {} };
                        } catch (err) {
                            console.error('Reset failed:', err);
                            return exercise;
                        }
                    }
                    return exercise;
                }));
            const results = resultsRaw.filter(ex => !ex.archived);

            setExercises(results);
            // Persist fresh data so next load is instant
            await setLocalCache(cacheKey, results);

            InteractionManager.runAfterInteractions(async () => {
                scheduleExerciseReminders(results).catch(err => console.error('Failed to schedule reminders:', err));
                try {
                    const { status } = await Calendar.getCalendarPermissionsAsync();
                    if (status === 'granted') {
                        syncExercisesToCalendar(results, true);
                    }
                } catch (e) {
                    console.error('Failed to auto-sync calendar:', e);
                }
            });
        } catch (error) {
            console.error('Failed to fetch exercises:', error);
            // If we had cached data we already set it above, so only reset if truly empty
            if (exercises.length === 0) setExercises([]);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    return { exercises, loading, fetchExercises };
}

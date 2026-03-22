import { useCallback, useState } from 'react';
import { Exercise } from '../types';
import { fetchClientExercisesSnapshot, warmExerciseSideEffects } from '../modules/exercises';

export function useClientExercises(clientId: string | undefined) {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchExercises = useCallback(async (options?: { forceFresh?: boolean }) => {
        if (!clientId) {
            setExercises([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const nextExercises = await fetchClientExercisesSnapshot(clientId, options);
            setExercises(nextExercises);
            warmExerciseSideEffects(nextExercises);
        } catch (error) {
            console.error('Failed to fetch exercises:', error);
            setExercises([]);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    return { exercises, loading, fetchExercises };
}

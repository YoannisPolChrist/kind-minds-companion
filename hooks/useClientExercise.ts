import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Exercise } from '../types';
import { UserProfile } from '../stores/authStore';
import { buildExercisePdfHtml, completeClientExercise, fetchClientExercise } from '../modules/clientExercise';

type ExerciseFeedback = {
    visible: boolean;
    message: string;
    subMessage?: string;
    type: 'success' | 'error' | 'warning';
    onDone?: () => void;
};

export function useClientExercise(
    exerciseId: string | undefined,
    profile: UserProfile | null,
    onCompleted?: () => void
) {
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [sharedAnswers, setSharedAnswers] = useState(true);
    const [feedback, setFeedback] = useState<ExerciseFeedback>({
        visible: false,
        message: '',
        type: 'success',
    });
    const hydratedRef = useRef(false);

    const loadExercise = useCallback(async (options?: { forceFresh?: boolean }) => {
        if (!exerciseId) {
            setExercise(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const nextExercise = await fetchClientExercise(exerciseId, options);
            setExercise(nextExercise);

            if (nextExercise && !hydratedRef.current) {
                setAnswers((nextExercise.draftAnswers as Record<string, unknown>) || nextExercise.answers || {});
                setSharedAnswers(nextExercise.sharedAnswers ?? true);
                hydratedRef.current = true;
            }
        } catch (error) {
            console.error('Failed to load client exercise', error);
        } finally {
            setLoading(false);
        }
    }, [exerciseId]);

    useEffect(() => {
        hydratedRef.current = false;
        void loadExercise();
    }, [loadExercise]);

    const showFeedback = useCallback((
        message: string,
        subMessage?: string,
        type: ExerciseFeedback['type'] = 'success',
        callback?: () => void
    ) => {
        setFeedback({
            visible: true,
            message,
            subMessage,
            type,
            onDone: callback,
        });
    }, []);

    const dismissFeedback = useCallback(() => {
        setFeedback((current) => {
            if (current.onDone) {
                current.onDone();
            }

            return { ...current, visible: false, onDone: undefined };
        });
    }, []);

    const handleAnswerChange = useCallback((key: string, value: unknown) => {
        setAnswers((current) => ({ ...current, [key]: value }));
    }, []);

    const triggerCompletionWebhook = useCallback(async () => {
        if (!exerciseId || !exercise) {
            return;
        }

        try {
            const webhookUrl = 'https://cloud.activepieces.com/api/v1/webhooks/PLACEHOLDER_COMPLETION';
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'exercise_completed',
                    clientId: profile?.id,
                    clientName: profile?.firstName || 'Ein Klient',
                    exerciseId,
                    exerciseTitle: exercise.title,
                    isShared: sharedAnswers,
                    therapistId: exercise.therapistId,
                }),
            });
        } catch (error) {
            console.log('Failed to send completion webhook', error);
        }
    }, [exercise, exerciseId, profile?.firstName, profile?.id, sharedAnswers]);

    const markComplete = useCallback(async () => {
        if (!exerciseId) {
            return;
        }

        try {
            const cleanAnswers = await completeClientExercise(exerciseId, {
                answers,
                sharedAnswers,
            });

            if (Platform.OS !== 'web') {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            await triggerCompletionWebhook();
            setExercise((current) => current ? {
                ...current,
                completed: true,
                status: 'completed',
                answers: cleanAnswers as Record<string, string>,
                sharedAnswers,
                lastCompletedAt: new Date().toISOString(),
            } : current);

            showFeedback('Erfolg', 'Die Uebung wurde abgeschlossen.', 'success', onCompleted);
        } catch (error) {
            console.error('Failed to complete exercise', error);
            showFeedback('Fehler', 'Konnte den Fortschritt nicht speichern.', 'error');
        }
    }, [answers, exerciseId, onCompleted, sharedAnswers, showFeedback, triggerCompletionWebhook]);

    const exportPdf = useCallback(async () => {
        if (!exercise) {
            return;
        }

        try {
            const [{ printToFileAsync }, sharingModule] = await Promise.all([
                import('expo-print'),
                import('expo-sharing'),
            ]);
            const { uri } = await printToFileAsync({
                html: buildExercisePdfHtml(exercise, answers),
            });

            await sharingModule.shareAsync(uri);
        } catch (error) {
            console.error('Failed to export exercise PDF', error);
            showFeedback('Fehler', 'PDF konnte nicht generiert werden.', 'error');
        }
    }, [answers, exercise, showFeedback]);

    return {
        exercise,
        loading,
        answers,
        sharedAnswers,
        setSharedAnswers,
        feedback,
        dismissFeedback,
        handleAnswerChange,
        markComplete,
        exportPdf,
        reloadExercise: loadExercise,
    };
}

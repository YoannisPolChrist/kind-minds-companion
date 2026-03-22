import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { clearClientScopedCaches, deleteClientWorkspace, fetchClientOverview, updateClientAppointment } from '../../modules/clients';
import { ClientProfile } from '../../modules/clients/types';
import { calculateCompletionRate } from '../../modules/clients/utils';

function resolveClientLanguage(client: ClientProfile | null): string {
    return `${client?.preferences?.language || client?.language || 'de'}`;
}

export function useClientOverview(clientId?: string) {
    const lastClientIdRef = useRef<string | undefined>(clientId);
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [exerciseCount, setExerciseCount] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [checkinCount, setCheckinCount] = useState(0);
    const [nextAppointment, setNextAppointment] = useState('');
    const [clientLanguage, setClientLanguage] = useState('de');

    const loadOverview = useCallback(async (options?: { forceFresh?: boolean }) => {
        if (!clientId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const overview = await fetchClientOverview(clientId, options);
            setClient(overview.client);
            setNextAppointment(`${overview.client?.nextAppointment || ''}`);
            setClientLanguage(resolveClientLanguage(overview.client));
            setExerciseCount(overview.exerciseCount);
            setCompletedCount(overview.completedCount);
            setCheckinCount(overview.checkinCount);
        } catch (error) {
            console.error('Failed to load client overview', error);
            setClient(null);
            setExerciseCount(0);
            setCompletedCount(0);
            setCheckinCount(0);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useFocusEffect(
        useCallback(() => {
            void loadOverview();
            lastClientIdRef.current = clientId;

            return () => {
                const previousClientId = lastClientIdRef.current;
                if (previousClientId) {
                    void clearClientScopedCaches(previousClientId);
                }
            };
        }, [clientId, loadOverview])
    );

    const progressLabel = useMemo(() => calculateCompletionRate(completedCount, exerciseCount), [completedCount, exerciseCount]);

    const stats = useMemo(() => ([
        { key: 'assigned', label: 'Uebungen', value: exerciseCount },
        { key: 'done', label: 'Erledigt', value: completedCount },
        { key: 'checkins', label: 'Check-ins', value: checkinCount },
        { key: 'progress', label: 'Fortschritt', value: progressLabel },
    ]), [checkinCount, completedCount, exerciseCount, progressLabel]);

    const persistAppointment = useCallback(async (value: string) => {
        if (!clientId) return;
        await updateClientAppointment(clientId, value);
        setNextAppointment(value);
    }, [clientId]);

    const removeClient = useCallback(async () => {
        if (!clientId) return;
        await deleteClientWorkspace(clientId);
    }, [clientId]);

    return {
        client,
        loading,
        stats,
        exerciseCount,
        completedCount,
        checkinCount,
        nextAppointment,
        setNextAppointment,
        persistAppointment,
        clientLanguage,
        setClientLanguage,
        refreshOverview: () => loadOverview({ forceFresh: true }),
        removeClient,
    };
}

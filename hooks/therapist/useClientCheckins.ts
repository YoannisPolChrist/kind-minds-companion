import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchTherapistClientCheckins,
    formatTherapistCheckinDate,
    formatTherapistCheckinTime,
    groupCheckinsByFormattedDate,
    TherapistCheckinRecord,
} from '../../modules/checkins';

export function useClientCheckins(clientId: string | undefined, locale: string) {
    const [checkins, setCheckins] = useState<TherapistCheckinRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const loadCheckins = useCallback(async (options?: { forceFresh?: boolean }) => {
        if (!clientId) {
            setCheckins([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const nextCheckins = await fetchTherapistClientCheckins(clientId, options);
            setCheckins(nextCheckins);
        } catch (error) {
            console.error('Failed to fetch therapist checkins', error);
            setCheckins([]);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        void loadCheckins();
    }, [loadCheckins]);

    const sections = useMemo(
        () => groupCheckinsByFormattedDate(checkins, locale),
        [checkins, locale]
    );

    return {
        checkins,
        sections,
        loading,
        refreshCheckins: () => loadCheckins({ forceFresh: true }),
        formatDate: (checkin: TherapistCheckinRecord) => formatTherapistCheckinDate(checkin, locale),
        formatTime: (checkin: TherapistCheckinRecord) => formatTherapistCheckinTime(checkin, locale),
    };
}

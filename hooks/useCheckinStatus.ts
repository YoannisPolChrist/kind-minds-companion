import { useCallback, useState } from 'react';
import { fetchCheckinStatusSnapshot } from '../modules/checkins';
import { CheckinRecord } from '../modules/checkins/types';

export function useCheckinStatus(userId: string | undefined) {
    const [checkedInToday, setCheckedInToday] = useState(false);
    const [recentCheckins, setRecentCheckins] = useState<CheckinRecord[]>([]);

    const fetchCheckinStatus = useCallback(async () => {
        if (!userId) return;
        try {
            const snapshot = await fetchCheckinStatusSnapshot(userId);
            setCheckedInToday(snapshot.checkedInToday);
            setRecentCheckins(snapshot.recentCheckins);
        } catch (error) {
            console.warn('Konnte Check-in Status nicht laden:', error);
            setCheckedInToday(false);
            setRecentCheckins([]);
        }
    }, [userId]);

    return { checkedInToday, recentCheckins, fetchCheckinStatus };
}

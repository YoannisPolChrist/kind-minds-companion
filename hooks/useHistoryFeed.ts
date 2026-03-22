import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHistoryFeed, flattenHistoryGroups, groupHistoryByWeek, HistoryEntry } from '../modules/history';

export function useHistoryFeed(userId: string | undefined) {
    const [entries, setEntries] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = useCallback(async (options?: { forceFresh?: boolean }) => {
        if (!userId) {
            setEntries([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const nextEntries = await fetchHistoryFeed(userId, options);
            setEntries(nextEntries);
        } catch (error) {
            console.error('Failed to fetch history feed', error);
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void loadHistory();
    }, [loadHistory]);

    const groupedEntries = useMemo(() => groupHistoryByWeek(entries), [entries]);
    const flatEntries = useMemo(() => flattenHistoryGroups(groupedEntries), [groupedEntries]);

    return {
        entries,
        groupedEntries,
        flatEntries,
        loading,
        refreshHistory: () => loadHistory({ forceFresh: true }),
    };
}

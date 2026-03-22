import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { FileResource } from '../../types/firebase';

export function useClientResources() {
    const { profile } = useAuth();
    const [resources, setResources] = useState<FileResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchResources = useCallback(async () => {
        if (!profile?.id) {
            setLoading(false);
            return;
        }
        try {
            const data: FileResource[] = [];

            // Fetch global & client resources in parallel (no dependency between them)
            const qGlobal = query(collection(db, "resources"));
            const qClient = query(collection(db, "client_resources"), where("clientId", "==", profile.id));
            const [snapGlobal, snapClient] = await Promise.all([getDocs(qGlobal), getDocs(qClient)]);

            snapGlobal.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() } as FileResource);
            });
            snapClient.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() } as FileResource);
            });

            // Client-side sort if index missing
            data.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            });

            // Remove duplicates by URL so assigned global resources don't show up twice
            const uniqueData = data.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);
            setResources(uniqueData);
        } catch (error) {
            console.error("Error fetching resources:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchResources();
    }, [fetchResources]);

    return { resources, loading, refreshing, onRefresh };
}

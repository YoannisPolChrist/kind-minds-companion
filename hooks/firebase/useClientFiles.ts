import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { FileResource } from '../../types/firebase';

export function useClientFiles(clientId: string | string[] | undefined) {
    const [clientFiles, setClientFiles] = useState<FileResource[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchClientFiles = useCallback(async () => {
        if (!clientId || Array.isArray(clientId)) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const q = query(collection(db, 'client_resources'), where('clientId', '==', clientId));
            const snap = await getDocs(q);
            const files = snap.docs.map(d => ({ id: d.id, ...d.data() } as FileResource));

            // Client side sorting
            files.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            });

            setClientFiles(files);
        } catch (error) {
            console.error('Error fetching client files', error);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        fetchClientFiles();
    }, [fetchClientFiles]);

    return { clientFiles, setClientFiles, loading, refetch: fetchClientFiles };
}

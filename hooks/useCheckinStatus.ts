import { useState, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../utils/firebase';

export function useCheckinStatus(userId: string | undefined) {
    const [checkedInToday, setCheckedInToday] = useState(false);
    const [recentCheckins, setRecentCheckins] = useState<any[]>([]);

    const fetchCheckinStatus = useCallback(async () => {
        if (!userId) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const snap = await getDoc(doc(db, 'checkins', `${userId}_${today}`));
            setCheckedInToday(snap.exists());

            // Fetch recent checkins for the mood chart (Sort locally to avoid composite index overhead in Firebase)
            const checksRef = collection(db, 'checkins');
            const q = query(checksRef, where('uid', '==', userId));
            const checksSnap = await getDocs(q);
            const allChecks = checksSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
            allChecks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const checks = allChecks.slice(0, 14).reverse(); // Oldest to newest (max 14)
            setRecentCheckins(checks);

        } catch (e) {
            console.warn("Konnte Check-in Status nicht laden (vllt. fehlen Firestore-Rechte):", e);
            setCheckedInToday(false);
            setRecentCheckins([]);
        }
    }, [userId]);

    return { checkedInToday, recentCheckins, fetchCheckinStatus };
}

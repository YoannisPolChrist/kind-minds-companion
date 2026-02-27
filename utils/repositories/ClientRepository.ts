/**
 * ClientRepository
 *
 * All Firestore operations for the "users" collection (clients + therapists).
 */

import {
    collection, query, where, getDocs, getDoc, doc,
    updateDoc, limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface UserProfile {
    id: string;
    role: 'therapist' | 'client';
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    bookingUrl?: string;
    latestMood?: number;
    completionRate?: number;
}

export class ClientRepository {
    /** Single user by ID */
    static async findById(id: string): Promise<UserProfile | null> {
        const snap = await getDoc(doc(db, 'users', id));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as UserProfile;
    }

    /** All clients */
    static async findAllClients(): Promise<UserProfile[]> {
        const q = query(collection(db, 'users'), where('role', '==', 'client'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
    }

    /** First therapist — used by client dashboard to fetch bookingUrl */
    static async findFirstTherapist(): Promise<UserProfile | null> {
        const q = query(collection(db, 'users'), where('role', '==', 'therapist'), firestoreLimit(1));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
    }

    /** Update any profile fields */
    static async update(id: string, data: Partial<UserProfile>): Promise<void> {
        const { id: _drop, ...rest } = data as any;
        await updateDoc(doc(db, 'users', id), rest);
    }

    /** Save booking URL for a therapist */
    static async setBookingUrl(id: string, url: string): Promise<void> {
        await updateDoc(doc(db, 'users', id), { bookingUrl: url });
    }
}

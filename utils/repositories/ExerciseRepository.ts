/**
 * ExerciseRepository
 *
 * All Firestore operations for the "exercises" collection.
 * Screens never import firebase directly — they call these methods instead.
 */

import {
    collection, query, where, getDocs, addDoc,
    deleteDoc, updateDoc, doc, serverTimestamp, limit,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Exercise {
    id: string;
    clientId: string;
    title: string;
    blocks: any[];
    completed: boolean;
    archived?: boolean;
    recurrence?: string;
    reminderFrequency?: string;
    assignedAt?: any;
    dueDate?: string;
}

export interface CreateExerciseDto {
    clientId: string;
    title: string;
    blocks: any[];
    recurrence?: string;
    reminderFrequency?: string;
    dueDate?: string;
}

export class ExerciseRepository {
    /** All active (non-archived) exercises for a client */
    static async findByClientId(clientId: string): Promise<Exercise[]> {
        const q = query(collection(db, 'exercises'), where('clientId', '==', clientId));
        const snap = await getDocs(q);
        const data: Exercise[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Exercise));
        return data.filter(ex => !ex.archived);
    }

    /** All exercises for a client — including archived (for analytics) */
    static async findAllByClientId(clientId: string): Promise<Exercise[]> {
        const q = query(collection(db, 'exercises'), where('clientId', '==', clientId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Exercise));
    }

    /** Create and assign a new exercise to a client */
    static async create(data: CreateExerciseDto): Promise<string> {
        const ref = await addDoc(collection(db, 'exercises'), {
            ...data,
            completed: false,
            archived: false,
            assignedAt: serverTimestamp(),
        });
        return ref.id;
    }

    /** Mark as completed */
    static async markComplete(id: string): Promise<void> {
        await updateDoc(doc(db, 'exercises', id), { completed: true });
    }

    /** Soft-delete (archive) */
    static async archive(id: string): Promise<void> {
        await updateDoc(doc(db, 'exercises', id), { archived: true });
    }

    /** Hard delete */
    static async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'exercises', id));
    }

    /** Statistics: completion rate for a client (0–100) */
    static async getCompletionRate(clientId: string): Promise<number> {
        const all = await this.findAllByClientId(clientId);
        if (all.length === 0) return 0;
        const done = all.filter(ex => ex.completed).length;
        return Math.round((done / all.length) * 100);
    }
}

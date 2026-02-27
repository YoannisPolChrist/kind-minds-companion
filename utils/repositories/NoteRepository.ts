/**
 * NoteRepository
 *
 * All Firestore operations for the "client_notes" collection.
 */

import {
    collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface ClientNote {
    id: string;
    clientId: string;
    content: string;
    type: 'ai-session-summary' | 'manual';
    createdAt: string;
}

export interface CreateNoteDto {
    clientId: string;
    content: string;
    type?: 'ai-session-summary' | 'manual';
}

export class NoteRepository {
    /** All notes for a client, newest first */
    static async findByClientId(clientId: string): Promise<ClientNote[]> {
        const q = query(collection(db, 'client_notes'), where('clientId', '==', clientId));
        const snap = await getDocs(q);
        const notes = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientNote));
        return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    /** Create a new note */
    static async create(data: CreateNoteDto): Promise<string> {
        const ref = await addDoc(collection(db, 'client_notes'), {
            ...data,
            type: data.type ?? 'ai-session-summary',
            createdAt: new Date().toISOString(),
        });
        return ref.id;
    }

    /** Delete a note */
    static async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'client_notes', id));
    }
}

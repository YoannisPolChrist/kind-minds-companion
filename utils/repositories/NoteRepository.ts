/**
 * NoteRepository
 *
 * All Firestore operations for the "client_notes" collection.
 */

import {
    collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { logger } from '../errors';

export interface ClientNote {
    id: string;
    clientId: string;
    authorRole?: 'therapist' | 'client';
    isShared?: boolean;
    title?: string;
    content: string;
    imageUrl?: string;
    type: 'session' | 'journal' | 'ai-session-summary' | 'manual';
    createdAt: string;
}

export interface CreateNoteDto {
    clientId: string;
    authorRole?: 'therapist' | 'client';
    isShared?: boolean;
    title?: string;
    content: string;
    imageUrl?: string;
    type?: 'session' | 'journal' | 'ai-session-summary' | 'manual';
}

export class NoteRepository {
    /** All notes for a client, newest first */
    static async findByClientId(clientId: string): Promise<ClientNote[]> {
        try {
            const q = query(collection(db, 'client_notes'), where('clientId', '==', clientId));
            const snap = await getDocs(q);
            const notes = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientNote));
            return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch (error) {
            logger.error(`Failed to fetch notes for client ${clientId}`, error);
            throw error;
        }
    }

    /** Create a new note */
    static async create(data: CreateNoteDto): Promise<string> {
        try {
            const ref = await addDoc(collection(db, 'client_notes'), {
                ...data,
                type: data.type ?? 'ai-session-summary',
                title: data.title || null,
                imageUrl: data.imageUrl || null,
                authorRole: data.authorRole || 'therapist',
                isShared: data.isShared || false,
                createdAt: new Date().toISOString(),
            });
            logger.info('Created new client note', { noteId: ref.id, clientId: data.clientId });
            return ref.id;
        } catch (error: any) {
            console.error('Note creation error inner details:', error?.code, error?.message, error);
            logger.error('Failed to create note', error, { clientId: data.clientId });
            throw error;
        }
    }

    /** Delete a note */
    static async delete(id: string): Promise<void> {
        try {
            await deleteDoc(doc(db, 'client_notes', id));
            logger.info('Deleted client note', { noteId: id });
        } catch (error) {
            logger.error(`Failed to delete note ${id}`, error);
            throw error;
        }
    }
}

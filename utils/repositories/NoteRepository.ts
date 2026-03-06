/**
 * NoteRepository
 *
 * All Firestore operations for the "client_notes" collection.
 */

import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { logger } from '../errors';
import { db } from '../firebase';

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
    updatedAt?: string;
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

function getNoteTimestamp(value: any) {
    if (!value) return 0;
    if (typeof value === 'string' || value instanceof Date) return new Date(value).getTime();
    if (typeof value?.seconds === 'number') return value.seconds * 1000;
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    return 0;
}

export class NoteRepository {
    static async findByClientId(clientId: string): Promise<ClientNote[]> {
        try {
            const q = query(collection(db, 'client_notes'), where('clientId', '==', clientId));
            const snap = await getDocs(q);
            const notes = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ClientNote));

            return notes.sort((left, right) => {
                const leftTime = getNoteTimestamp(left.updatedAt || left.createdAt);
                const rightTime = getNoteTimestamp(right.updatedAt || right.createdAt);
                return rightTime - leftTime;
            });
        } catch (error) {
            logger.error(`Failed to fetch notes for client ${clientId}`, error);
            throw error;
        }
    }

    static async create(data: CreateNoteDto): Promise<string> {
        try {
            const now = new Date().toISOString();
            const ref = await addDoc(collection(db, 'client_notes'), {
                ...data,
                type: data.type ?? 'ai-session-summary',
                title: data.title || null,
                imageUrl: data.imageUrl || null,
                authorRole: data.authorRole || 'therapist',
                isShared: data.isShared || false,
                createdAt: now,
                updatedAt: now,
            });
            logger.info('Created new client note', { noteId: ref.id, clientId: data.clientId });
            return ref.id;
        } catch (error: any) {
            console.error('Note creation error inner details:', error?.code, error?.message, error);
            logger.error('Failed to create note', error, { clientId: data.clientId });
            throw error;
        }
    }

    static async update(id: string, data: Partial<ClientNote>): Promise<void> {
        try {
            const { id: _, clientId, ...updateData } = data as any;
            const updatePayload: any = {
                ...updateData,
                updatedAt: new Date().toISOString(),
            };

            Object.keys(updatePayload).forEach((key) => {
                if (updatePayload[key] === undefined) {
                    delete updatePayload[key];
                }
            });

            await import('firebase/firestore').then(({ updateDoc }) =>
                updateDoc(doc(db, 'client_notes', id), updatePayload)
            );
            logger.info('Updated client note', { noteId: id });
        } catch (error) {
            logger.error(`Failed to update note ${id}`, error);
            throw error;
        }
    }

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

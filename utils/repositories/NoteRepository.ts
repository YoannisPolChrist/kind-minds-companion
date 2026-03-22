/**
 * NoteRepository
 *
 * All Firestore operations for the "client_notes" collection.
 */

import {
    collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { logger } from '../errors';
import { sortJournalEntries } from '../domain/journal';

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
    /** All notes for a therapist, newest first */
    static async findForTherapist(clientId: string): Promise<ClientNote[]> {
        try {
            const q = query(collection(db, 'client_notes'), where('clientId', '==', clientId));
            const snap = await getDocs(q);
            const notes = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientNote));
            return sortJournalEntries(notes);
        } catch (error) {
            logger.error(`Failed to fetch notes for client ${clientId}`, error);
            throw error;
        }
    }

    /** Client-visible journal: own entries + shared therapist entries */
    static async findVisibleToClient(clientId: string): Promise<ClientNote[]> {
        try {
            const ownEntriesQuery = query(
                collection(db, 'client_notes'),
                where('clientId', '==', clientId),
                where('authorRole', '==', 'client')
            );
            const sharedTherapistQuery = query(
                collection(db, 'client_notes'),
                where('clientId', '==', clientId),
                where('authorRole', '==', 'therapist'),
                where('isShared', '==', true)
            );

            const [ownEntriesSnap, sharedTherapistSnap] = await Promise.all([
                getDocs(ownEntriesQuery),
                getDocs(sharedTherapistQuery),
            ]);

            const notesById = new Map<string, ClientNote>();
            [...ownEntriesSnap.docs, ...sharedTherapistSnap.docs].forEach((docSnap) => {
                notesById.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as ClientNote);
            });

            return sortJournalEntries(Array.from(notesById.values()));
        } catch (error) {
            logger.error(`Failed to fetch client-visible notes for ${clientId}`, error);
            throw error;
        }
    }

    /** Backwards-compatible alias while screens migrate to journal naming */
    static async findByClientId(clientId: string): Promise<ClientNote[]> {
        return this.findForTherapist(clientId);
    }

    /** Create a new note */
    static async create(data: CreateNoteDto): Promise<string> {
        try {
            const ref = await addDoc(collection(db, 'client_notes'), {
                ...data,
                type: data.type ?? 'journal',
                title: data.title || null,
                imageUrl: data.imageUrl || null,
                authorRole: data.authorRole || 'therapist',
                isShared: data.isShared || false,
                createdAt: new Date().toISOString(),
                updatedAt: serverTimestamp(),
            });
            logger.info('Created new client note', { noteId: ref.id, clientId: data.clientId });
            return ref.id;
        } catch (error: any) {
            console.error('Note creation error inner details:', error?.code, error?.message, error);
            logger.error('Failed to create note', error, { clientId: data.clientId });
            throw error;
        }
    }

    /** Update an existing note */
    static async update(id: string, data: Partial<ClientNote>): Promise<void> {
        try {
            const { id: _, clientId, ...updateData } = data as any; // Don't update id or clientId
            const updatePayload: any = { ...updateData };

            // Clean up undefined values
            Object.keys(updatePayload).forEach(key => {
                if (updatePayload[key] === undefined) {
                    delete updatePayload[key];
                }
            });

            await updateDoc(doc(db, 'client_notes', id), {
                ...updatePayload,
                updatedAt: serverTimestamp(),
            });
            logger.info('Updated client note', { noteId: id });
        } catch (error) {
            logger.error(`Failed to update note ${id}`, error);
            throw error;
        }
    }

    static async setShared(id: string, isShared: boolean): Promise<void> {
        await updateDoc(doc(db, 'client_notes', id), {
            isShared,
            updatedAt: serverTimestamp(),
        });
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

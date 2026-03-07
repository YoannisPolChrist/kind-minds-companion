/**
 * ResourceRepository
 *
 * All Firestore + Storage operations for the "resources" collection.
 */

import {
    collection, getDocs, addDoc, deleteDoc, doc, query, serverTimestamp, where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

export interface Resource {
    id: string;
    title: string;
    description?: string;
    type: 'pdf' | 'link';
    url: string;
    storagePath?: string;
    createdAt?: any;
    therapistId?: string;
}

export interface CreateLinkDto {
    title: string;
    description?: string;
    url: string;
    therapistId: string;
}

export interface CreatePdfDto {
    title: string;
    description?: string;
    fileUri: string;
    filename: string;
    therapistId: string;
}

export class ResourceRepository {
    /** All resources, newest first */
    static async findAll(therapistId: string): Promise<Resource[]> {
        const snap = await getDocs(query(collection(db, 'resources'), where('therapistId', '==', therapistId)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Resource));
        return data.sort((a, b) => {
            const aT = (a.createdAt as any)?.seconds ?? 0;
            const bT = (b.createdAt as any)?.seconds ?? 0;
            return bT - aT;
        });
    }

    /** Add a web link resource */
    static async createLink(data: CreateLinkDto): Promise<string> {
        const ref = await addDoc(collection(db, 'resources'), {
            ...data,
            type: 'link',
            createdAt: serverTimestamp(),
        });
        return ref.id;
    }

    /** Upload a PDF to Storage and create a Firestore record */
    static async createPdf(data: CreatePdfDto): Promise<string> {
        const response = await fetch(data.fileUri);
        const blob = await response.blob();
        const storagePath = `resources/${Date.now()}_${data.filename}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);

        const docRef = await addDoc(collection(db, 'resources'), {
            title: data.title,
            description: data.description ?? '',
            type: 'pdf',
            url,
            storagePath,
            therapistId: data.therapistId,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    }

    /** Delete resource (and the file from Storage if applicable) */
    static async delete(resource: Resource): Promise<void> {
        if (resource.type === 'pdf' && resource.storagePath) {
            try {
                await deleteObject(ref(storage, resource.storagePath));
            } catch {
                // File might already be gone; proceed with Firestore delete
            }
        }
        await deleteDoc(doc(db, 'resources', resource.id));
    }
}

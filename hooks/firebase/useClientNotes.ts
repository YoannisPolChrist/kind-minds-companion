import { useState, useCallback, useEffect } from 'react';
import { NoteRepository } from '../../utils/repositories/NoteRepository';
import { useAuth } from '../../contexts/AuthContext';
import { Note } from '../../types/firebase';
import { uploadFile, generateStoragePath, getExtension } from '../../utils/uploadFile';
import { ErrorHandler } from '../../utils/errors';

export function useClientNotes() {
    const { profile } = useAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchNotes = useCallback(async () => {
        if (!profile?.id) return;
        try {
            const data = await NoteRepository.findByClientId(profile.id);
            setNotes(data as Note[]);
        } catch (error) {
            console.error("Error fetching notes:", error);
        } finally {
            setLoading(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const saveNote = async (
        editingNoteId: string | null,
        newNoteTitle: string,
        newNoteContent: string,
        newNoteImage: { uri: string, base64?: string | null, file?: any } | null,
        isShared: boolean,
        onSuccess: () => void,
        onError: (message: string) => void
    ) => {
        if ((!newNoteContent.trim() && !newNoteImage) || !profile?.id) {
            onError('Bitte gib einen Text ein oder lade ein Bild hoch.');
            return;
        }

        setSaving(true);
        try {
            let uploadedImageUrl = null;
            if (newNoteImage && newNoteImage.uri && !newNoteImage.uri.startsWith('http')) {
                const ext = getExtension(newNoteImage.uri) || 'jpg';
                const path = generateStoragePath(`client_notes/${profile.id}`, ext);

                uploadedImageUrl = await uploadFile(
                    newNoteImage.uri,
                    path,
                    `image/${ext === 'png' ? 'png' : 'jpeg'}`
                );
            } else if (newNoteImage && newNoteImage.uri.startsWith('http')) {
                uploadedImageUrl = newNoteImage.uri;
            }

            if (editingNoteId) {
                await NoteRepository.update(editingNoteId, {
                    title: newNoteTitle.trim() || undefined,
                    content: newNoteContent.trim(),
                    imageUrl: uploadedImageUrl || undefined,
                    isShared: isShared
                });
            } else {
                await NoteRepository.create({
                    clientId: profile.id,
                    title: newNoteTitle.trim() || undefined,
                    content: newNoteContent.trim(),
                    imageUrl: uploadedImageUrl || undefined,
                    type: 'journal',
                    authorRole: 'client',
                    isShared: isShared
                });
            }

            await fetchNotes();
            onSuccess();
        } catch (error) {
            const { message } = ErrorHandler.handle(error, 'Save Note');
            onError(message);
        } finally {
            setSaving(false);
        }
    };

    const deleteNote = async (noteId: string, onSuccess: () => void, onError: (message: string) => void) => {
        try {
            await NoteRepository.delete?.(noteId);
            setNotes(prev => prev.filter(n => n.id !== noteId));
            onSuccess();
        } catch (error) {
            const { message } = ErrorHandler.handle(error, 'Delete Note');
            onError(message);
        }
    };

    return { notes, loading, saving, fetchNotes, saveNote, deleteNote };
}

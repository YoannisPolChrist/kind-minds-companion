import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Note } from '../../types/firebase';
import { ErrorHandler } from '../../utils/errors';
import { getExtension, generateStoragePath, uploadFile } from '../../utils/uploadFile';
import { NoteRepository } from '../../utils/repositories/NoteRepository';

function stripHtml(content: string) {
    return content
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

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
            console.error('Error fetching notes:', error);
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
        const plainTextContent = stripHtml(newNoteContent);
        if ((!plainTextContent && !newNoteImage) || !profile?.id) {
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
            } else if (newNoteImage?.uri?.startsWith('http')) {
                uploadedImageUrl = newNoteImage.uri;
            }

            const payload = {
                title: newNoteTitle.trim() || undefined,
                content: newNoteContent.trim(),
                imageUrl: uploadedImageUrl || undefined,
                isShared,
            };

            if (editingNoteId) {
                await NoteRepository.update(editingNoteId, payload);
            } else {
                await NoteRepository.create({
                    clientId: profile.id,
                    ...payload,
                    type: 'journal',
                    authorRole: 'client',
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
            await NoteRepository.delete(noteId);
            setNotes((prev) => prev.filter((note) => note.id !== noteId));
            onSuccess();
        } catch (error) {
            const { message } = ErrorHandler.handle(error, 'Delete Note');
            onError(message);
        }
    };

    return { notes, loading, saving, fetchNotes, saveNote, deleteNote, stripHtml };
}

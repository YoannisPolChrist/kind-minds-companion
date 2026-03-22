import { Note } from "../../types/firebase";

export function isSessionNote(note: Partial<Note>): boolean {
    return note.type === "session";
}

export function isJournalEntry(note: Partial<Note>): boolean {
    return note.type === "journal";
}

export function canClientSeeJournalEntry(note: Partial<Note>): boolean {
    if (note.authorRole === "client") return true;
    if (isSessionNote(note)) return false;
    return !!note.isShared;
}

export function sortJournalEntries<T extends Partial<Note>>(notes: T[]): T[] {
    return [...notes].sort((a, b) => {
        const left = (a.updatedAt as any)?.seconds
            ? (a.updatedAt as any).seconds * 1000
            : (a.updatedAt as any) || (a.createdAt as any) || 0;
        const right = (b.updatedAt as any)?.seconds
            ? (b.updatedAt as any).seconds * 1000
            : (b.updatedAt as any) || (b.createdAt as any) || 0;

        return new Date(right).getTime() - new Date(left).getTime();
    });
}

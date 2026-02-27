/**
 * exerciseService.ts
 *
 * Centralized service for all Firestore mutations related to exercises.
 * Screens and hooks should call these instead of reaching into Firestore directly.
 */

import { db } from '../utils/firebase';
import {
    doc,
    updateDoc,
    addDoc,
    collection,
    serverTimestamp,
} from 'firebase/firestore';
import { Exercise } from '../types';

/**
 * Mark an exercise as completed with answers.
 * Uses a soft "completed" flag — never deletes data.
 */
export async function completeExercise(
    exerciseId: string,
    answers: Record<string, any>
): Promise<void> {
    await updateDoc(doc(db, 'exercises', exerciseId), {
        completed: true,
        answers,
        lastCompletedAt: new Date().toISOString(),
    });
}

/**
 * Reset a recurring exercise back to its initial uncompleted state.
 * Called automatically when a recurrence period has elapsed.
 */
export async function resetExercise(exerciseId: string): Promise<void> {
    await updateDoc(doc(db, 'exercises', exerciseId), {
        completed: false,
        answers: {},
    });
}

/**
 * Soft-archive an exercise so it no longer appears in client views,
 * but historical answers are preserved in Firestore.
 */
export async function archiveExercise(exerciseId: string): Promise<void> {
    await updateDoc(doc(db, 'exercises', exerciseId), {
        archived: true,
        archivedAt: new Date().toISOString(),
    });
}

/**
 * Save a draft of exercise answers (used for auto-save while filling out forms).
 * Does NOT mark as completed — just persists a draft.
 */
export async function saveDraftAnswers(
    exerciseId: string,
    answers: Record<string, any>
): Promise<void> {
    await updateDoc(doc(db, 'exercises', exerciseId), {
        draftAnswers: answers,
        draftSavedAt: new Date().toISOString(),
    });
}

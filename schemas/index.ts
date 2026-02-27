/**
 * schemas/index.ts
 *
 * Zod validation schemas for all user-facing forms.
 * Use these before any Firestore write to ensure data integrity.
 */

import { z } from 'zod';

// ─── Check-in ────────────────────────────────────────────────────────────────
export const CheckinSchema = z.object({
    uid: z.string().min(1, 'User ID fehlt'),
    mood: z.number().int().min(1).max(5),
    note: z.string().max(1000).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD sein'),
});

export type CheckinInput = z.infer<typeof CheckinSchema>;

// ─── Exercise answer ─────────────────────────────────────────────────────────
export const ExerciseAnswerSchema = z.object({
    exerciseId: z.string().min(1),
    answers: z.record(z.string(), z.any()),
});

export type ExerciseAnswerInput = z.infer<typeof ExerciseAnswerSchema>;

// ─── Booking URL (therapist settings) ────────────────────────────────────────
export const BookingUrlSchema = z.object({
    bookingUrl: z
        .string()
        .url('Bitte eine gültige URL eingeben (z.B. https://cal.com/...)')
        .max(500)
        .optional()
        .or(z.literal('')),
});

export type BookingUrlInput = z.infer<typeof BookingUrlSchema>;

// ─── Helper: safe parse with user-friendly error ─────────────────────────────
export function safeValidate<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    // Return first error message
    const firstError = result.error.errors[0]?.message ?? 'Ungültige Eingabe';
    return { success: false, error: firstError };
}

import { addDoc, collection, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../utils/firebase';
import { logger, AppError } from '../utils/errors';

// Use the existing app's firebase API key or fallback.
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCXo45lA08WE-A6Hheg4F7BwS9KZE55mKU';

export interface CreateClientParams {
    firstName: string;
    lastName: string;
    email: string;
    birthDate?: string;
    therapistId: string;
}

export interface CreateOfflineClientParams {
    firstName: string;
    lastName: string;
    email?: string;
    birthDate?: string;
    therapistId: string;
}

export class ClientService {
    /**
     * Creates a Firebase Auth user without affecting the currently logged-in therapist session.
     * Uses the Firebase Identity Toolkit REST API directly.
     */
    private static async createFirebaseUserViaApi(email: string, password: string): Promise<{ uid: string; email: string }> {
        logger.info('Creating Firebase user via REST API', { email });
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: false }),
        });

        const data = await response.json();
        if (!response.ok || data.error) {
            logger.error('Failed to create Firebase Auth user via API', data.error);
            const msg = data.error?.message?.includes('EMAIL_EXISTS')
                ? 'Diese E-Mail-Adresse hat bereits einen Account.'
                : data.error?.message || 'Konto konnte nicht erstellt werden.';

            throw new AppError(response.status, msg, data.error?.message || 'auth_api_error');
        }
        return { uid: data.localId, email: data.email };
    }

    /**
     * Creates a full Firebase Auth + Firestore account for the client.
     * The therapist remains logged in throughout.
     * Automatically sends a password reset email.
     */
    static async createClientAccount(params: CreateClientParams): Promise<{ email: string; resetSent: boolean }> {
        const { firstName, lastName, email, birthDate, therapistId } = params;
        const normalizedEmail = email.trim().toLowerCase();

        try {
            // 1. Generate a secure random temporary password (client will reset it via email)
            const tempPassword = Math.random().toString(36).substring(2, 10) + 'A1!';

            // 2. Create Firebase Auth account via REST to avoid logging out the therapist
            const { uid } = await this.createFirebaseUserViaApi(normalizedEmail, tempPassword);

            // 3. Create the Firestore user profile
            await setDoc(doc(db, 'users', uid), {
                email: normalizedEmail,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                birthDate: birthDate?.trim() || null,
                role: 'client',
                therapistId,
                isOfflineProfile: false,
                onboardingCompleted: true, // Profile already filled by therapist
                createdAt: serverTimestamp(),
                createdByTherapist: true,
            });
            logger.info('Created Firestore profile for new client', { uid, therapistId });

            // 4. Send password reset email so the client can set their own password immediately
            let resetSent = false;
            try {
                await sendPasswordResetEmail(auth, normalizedEmail);
                resetSent = true;
                logger.info('Sent password reset email to new client', { email: normalizedEmail });
            } catch (resetErr) {
                logger.warn('Initial password reset email failed', { error: resetErr, email: normalizedEmail });
            }

            return { email: normalizedEmail, resetSent };
        } catch (error) {
            logger.error('Error during full client account creation', error, { email: normalizedEmail, therapistId });
            throw error; // Let the UI handle it via ErrorHandler
        }
    }

    /**
     * Creates an offline profile WITHOUT a login account.
     */
    static async createOfflineProfile(params: CreateOfflineClientParams): Promise<void> {
        try {
            await addDoc(collection(db, 'users'), {
                firstName: params.firstName.trim(),
                lastName: params.lastName.trim(),
                email: params.email?.trim() || null,
                birthDate: params.birthDate?.trim() || null,
                role: 'client',
                therapistId: params.therapistId,
                isOfflineProfile: true,
                onboardingCompleted: true,
                createdAt: serverTimestamp()
            });
            logger.info('Created offline client profile', { therapistId: params.therapistId });
        } catch (error) {
            logger.error('Failed to create offline profile', error, { therapistId: params.therapistId });
            throw error;
        }
    }
}

import { useState, useCallback } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { router } from 'expo-router';
import i18n from '../utils/i18n';
import { validateInvitationCode, markInvitationAsUsed } from '../services/invitationService';

interface AuthResponse {
    loading: boolean;
    error: string;
    success: string;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, inviteCode?: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    clearMessages: () => void;
}

export function useAuthActions(): AuthResponse {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const clearMessages = useCallback(() => {
        setError('');
        setSuccess('');
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        clearMessages();
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace('/(app)/');
        } catch (err: any) {
            let message = i18n.t('login.error_default');
            if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email'].includes(err.code)) {
                message = i18n.t('login.error_auth');
            } else if (err.code === 'auth/network-request-failed') {
                message = i18n.t('login.error_network');
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [clearMessages]);

    const register = useCallback(async (email: string, password: string, inviteCode?: string) => {
        clearMessages();
        setLoading(true);
        try {
            let therapistId = null;
            let targetOfflineProfileId = null;
            let invitationId = null;

            // Validate invite code if provided
            if (inviteCode) {
                const invite = await validateInvitationCode(inviteCode);
                if (!invite) {
                    setError('Ungültiger oder abgelaufener Einladungscode.');
                    setLoading(false);
                    return;
                }
                therapistId = invite.therapistId;
                targetOfflineProfileId = invite.targetOfflineProfileId;
                invitationId = invite.id;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create initial user profile in Firestore
            const userProfile: any = {
                email: user.email,
                role: 'client', // Default to client for open registration
                createdAt: serverTimestamp(),
            };

            if (therapistId) {
                userProfile.therapistId = therapistId;
            }

            if (targetOfflineProfileId) {
                userProfile.linkedOfflineProfileId = targetOfflineProfileId;
                // Note: Actual merging of offline profile data and exercises would ideally happen via a Cloud Function
                // triggered by this update, or via a separate explicit action after registration.
            }

            await setDoc(doc(db, 'users', user.uid), userProfile);

            // Mark invitation as used
            if (invitationId) {
                await markInvitationAsUsed(invitationId);
            }

            router.replace('/(app)/'); // Could also push to an onboarding screen
        } catch (err: any) {
            console.error('Registration error:', err);
            let message = 'Registrierung fehlgeschlagen.';
            if (err.code === 'auth/email-already-in-use') {
                message = 'Diese E-Mail wird bereits verwendet.';
            } else if (err.code === 'auth/weak-password') {
                message = 'Das Passwort ist zu schwach.';
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [clearMessages]);

    const resetPassword = useCallback(async (email: string) => {
        clearMessages();
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (err: any) {
            // Intentionally do nothing on error — same feedback regardless,
            // so attackers cannot enumerate registered email addresses.
            console.warn('Password reset attempt:', err.code);
        } finally {
            setLoading(false);
            // Always show success to prevent user enumeration (OWASP A07)
            setSuccess(i18n.t('login.reset_sent'));
        }
    }, [clearMessages]);

    return { loading, error, success, login, resetPassword, clearMessages };
}

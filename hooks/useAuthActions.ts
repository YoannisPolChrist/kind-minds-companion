import { useState, useCallback } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { router } from 'expo-router';
import i18n from '../utils/i18n';

interface AuthResponse {
    loading: boolean;
    error: string;
    success: string;
    login: (email: string, password: string) => Promise<void>;
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

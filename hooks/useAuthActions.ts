import { useState, useCallback } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc, getDocs, query, collection, where, addDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { router } from 'expo-router';
import i18n from '../utils/i18n';
import { validateInvitationCode, markInvitationAsUsed } from '../services/invitationService';
import { getMissingProfileErrorMessage, hasInvalidAuthProfileData, UserProfile } from '../stores/authStore';

interface AuthResponse {
    loading: boolean;
    error: string;
    success: string;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, options?: { inviteCode?: string; firstName?: string; lastName?: string; birthDate?: string }) => Promise<void>;
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
            const credential = await signInWithEmailAndPassword(auth, email, password);
            const user = credential.user;

            // Block login for unverified users (skip check for therapist-created accounts via createdByTherapist flag)
            if (!user.emailVerified) {
                await signOut(auth);
                setError('Bitte verifiziere zuerst deine E-Mail-Adresse. Wir haben dir bei der Registrierung einen Link gesendet.');
                return;
            }

            const profileSnap = await getDoc(doc(db, 'users', user.uid));
            const profileData = profileSnap.exists() ? profileSnap.data() as Partial<UserProfile> : null;

            if (!profileSnap.exists() || hasInvalidAuthProfileData(profileData)) {
                await signOut(auth);
                setError(getMissingProfileErrorMessage());
                return;
            }

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

    const register = useCallback(async (email: string, password: string, options?: { inviteCode?: string; firstName?: string; lastName?: string; birthDate?: string }) => {
        clearMessages();
        setLoading(true);
        const { inviteCode, firstName, lastName, birthDate } = options || {};
        const normalizedEmail = email.trim().toLowerCase();
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

            const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
            const user = userCredential.user;

            // Send email verification – via backend to get the custom Resend template
            try {
                await addDoc(collection(db, 'mail_requests'), {
                    email: user.email,
                    firstName: firstName?.trim() || '',
                    type: 'VERIFY_EMAIL',
                    status: 'pending',
                    requestedAt: serverTimestamp()
                });
            } catch (verifyErr) {
                console.warn('Could not send verification email request', verifyErr);
            }

            // Create initial user profile in Firestore
            const userProfile: any = {
                email: user.email,
                firstName: firstName?.trim() || '',
                lastName: lastName?.trim() || '',
                birthDate: birthDate?.trim() || null,
                role: 'client', // Default to client for open registration
                createdAt: serverTimestamp(),
                onboardingCompleted: false
            };

            if (therapistId) {
                userProfile.therapistId = therapistId;
            }

            if (targetOfflineProfileId) {
                userProfile.linkedOfflineProfileId = targetOfflineProfileId;

                try {
                    await updateDoc(doc(db, 'users', targetOfflineProfileId), {
                        isOfflineProfile: false,
                        linkedAuthUid: user.uid,
                        email: user.email,
                        updatedAt: serverTimestamp()
                    });

                    // Transfer Exercises
                    const exQuery = query(collection(db, 'exercises'), where('clientId', '==', targetOfflineProfileId));
                    const exSnap = await getDocs(exQuery);
                    const exPromises = exSnap.docs.map(exDoc =>
                        updateDoc(doc(db, 'exercises', exDoc.id), { clientId: user.uid })
                    );

                    // Transfer Checkins
                    const chkQuery = query(collection(db, 'checkins'), where('uid', '==', targetOfflineProfileId));
                    const chkSnap = await getDocs(chkQuery);
                    const chkPromises = chkSnap.docs.map(chkDoc =>
                        updateDoc(doc(db, 'checkins', chkDoc.id), { uid: user.uid })
                    );

                    await Promise.all([...exPromises, ...chkPromises]);

                } catch (mergeError) {
                    console.error('Failed to merge offline profile data:', mergeError);
                }
            }

            await setDoc(doc(db, 'users', user.uid), userProfile);

            if (invitationId) {
                await markInvitationAsUsed(invitationId, user.uid);
            }

            // Set success message BEFORE signing out, so it renders before auth state changes
            setSuccess('Registrierung erfolgreich. Bitte pruefe dein Postfach und bestaetige zuerst deine E-Mail-Adresse.');

            // Small delay so the success banner renders before Firebase auth state listener fires
            await new Promise(resolve => setTimeout(resolve, 300));

            // Sign user out – they must verify their email before logging in
            await signOut(auth);
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
        const normalizedEmail = email.trim().toLowerCase();

        try {
            await addDoc(collection(db, 'mail_requests'), {
                email: normalizedEmail,
                type: 'PASSWORD_RESET',
                status: 'pending',
                requestedAt: serverTimestamp(),
            });
            setSuccess(i18n.t('login.reset_sent'));
        } catch (err) {
            console.error('Failed to queue password reset mail request:', err);
            setError('Passwort-Reset konnte gerade nicht angefordert werden. Bitte versuche es in wenigen Minuten erneut.');
        } finally {
            setLoading(false);
        }
    }, [clearMessages]);

    return { loading, error, success, login, register, resetPassword, clearMessages };
}

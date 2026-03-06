import { create } from 'zustand';
import { User, onIdTokenChanged } from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { Platform } from 'react-native';

export interface UserProfile {
    id: string;
    role: 'client' | 'therapist';
    email: string;
    firstName?: string;
    lastName?: string;
    therapistId?: string;
    photoURL?: string;
    bookingUrl?: string;
    createdAt?: string;
    onboardingCompleted?: boolean;
    birthDate?: string;
    pushToken?: string;
    lastActivePlatform?: string;
    nextAppointment?: string;
}

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    session: string | null;
    isLoading: boolean;
    error: Error | null;
    setUser: (user: User | null) => void;
    setProfile: (profile: UserProfile | null) => void;
    setSession: (session: string | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: Error | null) => void;
    refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    error: null,
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setSession: (session) => set({ session }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    refreshProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            let profile: UserProfile;

            if (docSnap.exists()) {
                profile = { id: docSnap.id, ...docSnap.data() } as UserProfile;
            } else {
                // Falls noch kein Firestore-Dokument existiert (z.B. neuer User)
                profile = {
                    id: user.uid,
                    email: user.email || '',
                    role: 'client'
                };

                // Wir speichern das Profil direkt, wenn es nicht existiert
                await setDoc(docRef, profile);
            }

            // Register Push Token & Platform after successfully getting the document
            try {
                const pushToken = await registerForPushNotificationsAsync();
                const lastActivePlatform = Platform.OS;

                await setDoc(docRef, {
                    lastActivePlatform,
                    ...(pushToken ? { pushToken } : {})
                }, { merge: true });

                profile.pushToken = pushToken;
                profile.lastActivePlatform = lastActivePlatform;
            } catch (tokenErr) {
                console.warn("Failed to register push token during auth refresh:", tokenErr);
            }

            set({ profile });
        } catch (error: any) {
            console.error('Error fetching user profile:', error);
            set({ error });
        }
    }
}));

// Initialize the Firebase Auth listener outside of the components
let initialized = false;

export function initializeAuthListener() {
    if (initialized) return;
    initialized = true;

    const { setUser, setSession, setLoading, refreshProfile } = useAuthStore.getState();

    // Use onIdTokenChanged to catch session token invalidations
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
        setLoading(true);
        if (firebaseUser) {
            const token = await firebaseUser.getIdToken();
            setSession(token);
            setUser(firebaseUser);
            // Fetch profile separately to not block main thread with DB read
            await refreshProfile();
        } else {
            setSession(null);
            setUser(null);
            useAuthStore.getState().setProfile(null);
        }
        setLoading(false);
    });

    return unsubscribe;
}


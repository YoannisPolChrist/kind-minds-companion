import { createContext, useContext, useEffect } from "react";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../utils/firebase";
import { useAuthStore, initializeAuthListener, UserProfile } from "../stores/authStore";

// Export the types for backwards compatibility
export { UserProfile };

// We export a unified hook that uses Zustand hook selectors to prevent re-renders
export const useAuth = () => {
    const user = useAuthStore(state => state.user);
    const profile = useAuthStore(state => state.profile);
    const loading = useAuthStore(state => state.isLoading);
    const session = useAuthStore(state => state.session);

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    return { user, profile, loading, session, signOut };
};

// We don't actually need the Context Provider anymore for Zustand, 
// but we keep the AuthProvider wrapper to initialize the listener once
// and preserve the <AuthProvider> layout nesting in app/_layout.tsx
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
        // Start listening to Firebase Auth changes when the app mounts
        const unsubscribe = initializeAuthListener();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    return <>{children}</>;
};

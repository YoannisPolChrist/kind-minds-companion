import { create } from "zustand";
import { onIdTokenChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc, type DocumentReference } from "firebase/firestore/lite";
import type { UserProfile } from "../lib/auth/types";
import { getFirebaseAuth, getFirestoreLite } from "./firebase";

type ProfileEnhancerResult = Partial<UserProfile> | void;
type ProfileEnhancer = (input: {
  user: User;
  profileRef: DocumentReference;
  profile: UserProfile;
}) => Promise<ProfileEnhancerResult> | ProfileEnhancerResult;

const detectPlatformLabel = () => {
  if (typeof navigator === "undefined") {
    return "server";
  }
  return navigator.product === "ReactNative" ? "app" : "web";
};

let profileEnhancer: ProfileEnhancer | null = async ({ profileRef }) => {
  const lastActivePlatform = detectPlatformLabel();
  await setDoc(profileRef, { lastActivePlatform }, { merge: true });
  return { lastActivePlatform };
};

export function configureAuthStore(options?: { enhanceProfile?: ProfileEnhancer | null }) {
  profileEnhancer = options?.enhanceProfile ?? profileEnhancer;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: string | null;
  loading: boolean;
  error: Error | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSession: (token: string | null) => void;
  setLoading: (value: boolean) => void;
  setError: (error: Error | null) => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,
  error: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSession: (token) => set({ session: token }),
  setLoading: (value) => set({ loading: value }),
  setError: (error) => set({ error }),
  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    const dbLite = getFirestoreLite();
    const profileRef = doc(dbLite, "users", user.uid);
    const snapshot = await getDoc(profileRef);

    let profile: UserProfile;

    if (snapshot.exists()) {
      profile = { id: snapshot.id, ...(snapshot.data() as Record<string, unknown>) } as UserProfile;
    } else {
      profile = {
        id: user.uid,
        email: user.email || "",
        role: "client",
      };

      await setDoc(profileRef, profile);
    }

    if (profileEnhancer) {
      try {
        const result = await profileEnhancer({ user, profileRef, profile });
        if (result && Object.keys(result).length > 0) {
          profile = { ...profile, ...result };
        }
      } catch (err) {
        console.warn("Profile enhancer failed:", err);
      }
    }

    set({ profile });
  },
}));

if (typeof window !== "undefined" && (import.meta as any)?.env?.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__KM_AUTH_STORE__ = useAuthStore;
}

let listenerCleanup: (() => void) | null = null;
let listenerActive = false;

export function initializeAuthListener() {
  if (listenerActive && listenerCleanup) {
    return listenerCleanup;
  }

  const auth = getFirebaseAuth();
  const { setUser, setSession, setLoading, refreshProfile, setProfile, setError } = useAuthStore.getState() as AuthState & {
    setError: (error: Error | null) => void;
  };

  const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
    setLoading(true);

    try {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setSession(token);
        setUser(firebaseUser);
        await refreshProfile();
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error("Auth listener error:", error);
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  });

  listenerActive = true;
  listenerCleanup = () => {
    unsubscribe();
    listenerActive = false;
    listenerCleanup = null;
  };

  return listenerCleanup;
}

export function resetAuthListenerForTests() {
  listenerCleanup?.();
  listenerCleanup = null;
  listenerActive = false;
}

export async function signOut() {
  await firebaseSignOut(getFirebaseAuth());
  useAuthStore.getState().setProfile(null);
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setSession(null);
}

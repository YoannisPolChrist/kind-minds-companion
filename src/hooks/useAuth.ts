import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut as fbSignOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export interface UserProfile {
  id: string;
  email: string;
  role: "client" | "therapist";
  firstName?: string;
  lastName?: string;
  therapistId?: string;
  nextAppointment?: string;
  bookingUrl?: string;
  onboardingCompleted?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!isActive) return;

      setUser(firebaseUser);
      setLoading(false);

      if (!firebaseUser) {
        setProfile(null);
        return;
      }

      void (async () => {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (!isActive) return;
          if (snap.exists()) {
            setProfile({ id: snap.id, ...snap.data() } as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (e) {
          if (isActive) {
            console.error("Error fetching profile:", e);
            setProfile(null);
          }
        }
      })();
    });

    const safetyTimer = window.setTimeout(() => {
      if (isActive) setLoading(false);
    }, 5000);

    return () => {
      isActive = false;
      window.clearTimeout(safetyTimer);
      unsub();
    };
  }, []);

  const signOut = () => fbSignOut(auth);

  return { user, profile, loading, signOut };
}


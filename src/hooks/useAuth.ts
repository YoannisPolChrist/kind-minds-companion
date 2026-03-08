import { useState, useEffect } from "react";
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
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            setProfile({ id: snap.id, ...snap.data() } as UserProfile);
          }
        } catch (e) {
          console.error("Error fetching profile:", e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signOut = () => fbSignOut(auth);

  return { user, profile, loading, signOut };
}

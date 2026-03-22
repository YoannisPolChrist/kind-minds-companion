import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore/lite";
import { dbLite } from "../firebaseDbLite";
import type { UserProfile } from "./types";

function fallbackProfile(user: User): UserProfile {
  return {
    id: user.uid,
    email: user.email || "",
    role: "client",
  };
}

export async function loadUserProfile(user: User): Promise<UserProfile> {
  const snap = await getDoc(doc(dbLite, "users", user.uid));

  if (!snap.exists()) {
    return fallbackProfile(user);
  }

  return {
    id: snap.id,
    ...snap.data(),
  } as UserProfile;
}

export function buildFallbackProfile(user: User): UserProfile {
  return fallbackProfile(user);
}

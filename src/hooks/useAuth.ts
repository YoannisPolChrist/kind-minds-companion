import { useAuthStore, signOut as signOutFromStore } from "../runtime/authStore";
import type { UserProfile } from "../lib/auth/types";

export type { UserProfile } from "../lib/auth/types";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  return {
    user,
    profile,
    loading,
    error,
    signOut: signOutFromStore,
  };
}

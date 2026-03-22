import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import AppShell from "./AppShell";

export default function ClientShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();

  return (
    <AppShell profile={profile} signOut={signOut}>
      {children}
    </AppShell>
  );
}

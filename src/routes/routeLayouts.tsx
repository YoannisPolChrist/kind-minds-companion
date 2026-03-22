import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import type { User } from "firebase/auth";
import { Navigate, Outlet } from "react-router-dom";
import type { UserProfile } from "../lib/auth/types";

const AppShell = lazy(() => import("../components/layout/AppShell"));

export const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export function PublicOnlyRoute({
  user,
  loading,
  children,
}: {
  user: User | null;
  loading: boolean;
  children?: ReactNode;
}) {
  if (loading) {
    return <PageSpinner />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export function ProtectedAppRoute({
  user,
  loading,
  profile,
  signOut,
  error,
}: {
  user: User | null;
  loading: boolean;
  profile: UserProfile | null;
  signOut: () => Promise<void>;
  error?: Error | null;
}) {
  if (loading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-5 py-10">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Verbindung unterbrochen</p>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Workspace konnte nicht geladen werden</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Bitte lade die Seite neu oder melde dich kurz ab und wieder an. Der Login wird dadurch nicht gelöscht.
          </p>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-bold text-foreground"
            >
              Neu versuchen
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Suspense fallback={<PageSpinner />}>
      <AppShell profile={profile} signOut={signOut}>
        <Outlet />
      </AppShell>
    </Suspense>
  );
}

export function TherapistRoute({ profile }: { profile: UserProfile | null }) {
  if (profile?.role !== "therapist") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

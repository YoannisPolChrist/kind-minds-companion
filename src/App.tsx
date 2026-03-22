
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./hooks/useAuth";
import { LanguageSync, useLanguage } from "./hooks/useLanguage";
import type { UserProfile } from "./lib/auth/types";

const RouterTree = lazy(() => import("./RouterTree"));
const ClientOnboardingProvider = lazy(() =>
  import("./components/onboarding/ClientOnboarding").then((module) => ({
    default: module.ClientOnboardingProvider,
  }))
);

const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  const { user, loading, profile, signOut, error } = useAuth();
  useLanguage();

  return (
    <Suspense fallback={<PageSpinner />}>
      <LanguageSync />
      <MaybeOnboardingProvider user={user} loading={loading} profile={profile}>
        <Suspense fallback={<PageSpinner />}>
          <RouterTree
            user={user}
            profile={profile}
            signOut={signOut}
            authLoading={loading}
            authError={error}
          />
        </Suspense>
      </MaybeOnboardingProvider>
    </Suspense>
  );
}

function MaybeOnboardingProvider({
  children,
  user,
  profile,
  loading,
}: {
  children: ReactNode;
  user: ReturnType<typeof useAuth>["user"];
  profile: UserProfile | null;
  loading: boolean;
}) {
  const needsOnboarding =
    !loading &&
    !!user &&
    profile?.role === "client" &&
    profile.onboardingCompleted !== true;

  if (!needsOnboarding) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={<>{children}</>}>
      <ClientOnboardingProvider user={user} loading={loading} profile={profile}>
        {children}
      </ClientOnboardingProvider>
    </Suspense>
  );
}

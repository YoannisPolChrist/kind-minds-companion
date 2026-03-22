import { lazy, Suspense, useLayoutEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { User } from "firebase/auth";
import type { UserProfile } from "./lib/auth/types";
import { PageSpinner, ProtectedAppRoute, PublicOnlyRoute, TherapistRoute } from "./routes/routeLayouts";
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard         = lazy(() => import("./pages/Dashboard"));
const Checkin           = lazy(() => import("./pages/Checkin"));
const CheckinsOverview  = lazy(() => import("./pages/CheckinsOverview"));
const ExercisesOverview = lazy(() => import("./pages/ExercisesOverview"));
const Exercise          = lazy(() => import("./pages/Exercise"));
const Settings          = lazy(() => import("./pages/Settings"));
const Notes             = lazy(() => import("./pages/Notes"));
const Resources         = lazy(() => import("./pages/Resources"));
const History           = lazy(() => import("./pages/History"));
const TherapistDashboard = lazy(() => import("./pages/therapist/TherapistDashboard"));
const ClientDetail       = lazy(() => import("./pages/therapist/ClientDetail"));
const ClientExercises    = lazy(() => import("./pages/therapist/ClientExercises"));
const ClientCheckins     = lazy(() => import("./pages/therapist/ClientCheckins"));
const ClientNotes        = lazy(() => import("./pages/therapist/ClientNotes"));
const ClientFiles        = lazy(() => import("./pages/therapist/ClientFiles"));
const TherapistTemplates = lazy(() => import("./pages/therapist/TherapistTemplates"));
const TherapistResources = lazy(() => import("./pages/therapist/TherapistResources"));
const TherapistClients   = lazy(() => import("./pages/therapist/TherapistClients"));
const ExerciseBuilderPage = lazy(() => import("./pages/therapist/ExerciseBuilder"));

function ScrollToTopOnNavigation() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export default function RouterTree({
  user,
  profile,
  signOut,
  authLoading,
  authError,
}: {
  user: User | null;
  profile: UserProfile | null;
  signOut: () => Promise<void>;
  authLoading: boolean;
  authError: Error | null;
}) {
  const isTherapist = profile?.role === "therapist";

  return (
    <Suspense fallback={<PageSpinner />}>
      <ScrollToTopOnNavigation />
      <Routes>
        <Route element={<PublicOnlyRoute user={user} loading={authLoading} />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route
          element={
            <ProtectedAppRoute
              user={user}
              loading={authLoading}
              profile={profile}
              signOut={signOut}
              error={authError}
            />
          }
        >
          <Route path="/" element={isTherapist ? <TherapistDashboard /> : <Dashboard />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/checkins" element={<CheckinsOverview />} />
          <Route path="/exercises" element={<ExercisesOverview />} />
          <Route path="/exercise/:id" element={<Exercise />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />

          <Route element={<TherapistRoute profile={profile} />}>
            <Route path="/therapist" element={<Navigate to="/" replace />} />
            <Route path="/therapist/clients" element={<TherapistClients />} />
            <Route path="/therapist/client/:id" element={<ClientDetail />} />
            <Route path="/therapist/client/:id/exercises" element={<ClientExercises />} />
            <Route path="/therapist/client/:id/checkins" element={<ClientCheckins />} />
            <Route path="/therapist/client/:id/notes" element={<ClientNotes />} />
            <Route path="/therapist/client/:id/files" element={<ClientFiles />} />
            <Route path="/therapist/templates" element={<TherapistTemplates />} />
            <Route path="/therapist/resources" element={<TherapistResources />} />
            <Route path="/therapist/template/:id" element={<ExerciseBuilderPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

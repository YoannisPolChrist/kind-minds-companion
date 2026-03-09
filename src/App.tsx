import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import type { User } from "firebase/auth";
import { useAuth } from "./hooks/useAuth";

// Eagerly loaded (needed on first paint / auth check)
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazily loaded — only fetched when the route is visited
const Dashboard         = lazy(() => import("./pages/Dashboard"));
const Checkin           = lazy(() => import("./pages/Checkin"));
const CheckinsOverview  = lazy(() => import("./pages/CheckinsOverview"));
const ExercisesOverview = lazy(() => import("./pages/ExercisesOverview"));
const Exercise          = lazy(() => import("./pages/Exercise"));
const Settings          = lazy(() => import("./pages/Settings"));
const Notes             = lazy(() => import("./pages/Notes"));
const Resources         = lazy(() => import("./pages/Resources"));
const History           = lazy(() => import("./pages/History"));

// Therapist pages — lazily loaded
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

const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function ProtectedRoute({
  children,
  user,
  loading,
}: {
  children: React.ReactNode;
  user: User | null;
  loading: boolean;
}) {
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading, profile } = useAuth();
  const isTherapist = profile?.role === "therapist";
  const withAuth = (element: React.ReactNode) => (
    <ProtectedRoute user={user} loading={loading}>{element}</ProtectedRoute>
  );

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/login" element={!loading && user ? <Navigate to="/" replace /> : <Login />} />

        {/* Main dashboard - role based */}
        <Route path="/" element={withAuth(isTherapist ? <TherapistDashboard /> : <Dashboard />)} />

        {/* Client pages */}
        <Route path="/checkin"    element={withAuth(<Checkin />)} />
        <Route path="/checkins"   element={withAuth(<CheckinsOverview />)} />
        <Route path="/exercises"  element={withAuth(<ExercisesOverview />)} />
        <Route path="/exercise/:id" element={withAuth(<Exercise />)} />
        <Route path="/notes"      element={withAuth(<Notes />)} />
        <Route path="/resources"  element={withAuth(<Resources />)} />
        <Route path="/history"    element={withAuth(<History />)} />
        <Route path="/settings"   element={withAuth(<Settings />)} />

        {/* Therapist pages */}
        <Route path="/therapist"                         element={withAuth(<TherapistDashboard />)} />
        <Route path="/therapist/clients"                 element={withAuth(<TherapistClients />)} />
        <Route path="/therapist/client/:id"              element={withAuth(<ClientDetail />)} />
        <Route path="/therapist/client/:id/exercises"    element={withAuth(<ClientExercises />)} />
        <Route path="/therapist/client/:id/checkins"     element={withAuth(<ClientCheckins />)} />
        <Route path="/therapist/client/:id/notes"        element={withAuth(<ClientNotes />)} />
        <Route path="/therapist/client/:id/files"        element={withAuth(<ClientFiles />)} />
        <Route path="/therapist/templates"               element={withAuth(<TherapistTemplates />)} />
        <Route path="/therapist/resources"               element={withAuth(<TherapistResources />)} />
        <Route path="/therapist/template/:id"            element={withAuth(<ExerciseBuilderPage />)} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}


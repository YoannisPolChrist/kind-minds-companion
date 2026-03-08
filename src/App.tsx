import { Routes, Route, Navigate } from "react-router-dom";
import type { User } from "firebase/auth";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Checkin from "./pages/Checkin";
import CheckinsOverview from "./pages/CheckinsOverview";
import ExercisesOverview from "./pages/ExercisesOverview";
import Exercise from "./pages/Exercise";
import Settings from "./pages/Settings";
import Notes from "./pages/Notes";
import Resources from "./pages/Resources";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

// Therapist pages
import TherapistDashboard from "./pages/therapist/TherapistDashboard";
import ClientDetail from "./pages/therapist/ClientDetail";
import ClientExercises from "./pages/therapist/ClientExercises";
import ClientCheckins from "./pages/therapist/ClientCheckins";
import ClientNotes from "./pages/therapist/ClientNotes";
import ClientFiles from "./pages/therapist/ClientFiles";
import TherapistTemplates from "./pages/therapist/TherapistTemplates";
import TherapistResources from "./pages/therapist/TherapistResources";
import ExerciseBuilderPage from "./pages/therapist/ExerciseBuilder";

function ProtectedRoute({
  children,
  user,
  loading,
}: {
  children: React.ReactNode;
  user: User | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
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
    <Routes>
      <Route path="/login" element={!loading && user ? <Navigate to="/" replace /> : <Login />} />

      {/* Main dashboard - role based */}
      <Route path="/" element={withAuth(isTherapist ? <TherapistDashboard /> : <Dashboard />)} />

      {/* Client pages */}
      <Route path="/checkin" element={withAuth(<Checkin />)} />
      <Route path="/checkins" element={withAuth(<CheckinsOverview />)} />
      <Route path="/exercises" element={withAuth(<ExercisesOverview />)} />
      <Route path="/exercise/:id" element={withAuth(<Exercise />)} />
      <Route path="/notes" element={withAuth(<Notes />)} />
      <Route path="/resources" element={withAuth(<Resources />)} />
      <Route path="/history" element={withAuth(<History />)} />
      <Route path="/settings" element={withAuth(<Settings />)} />

      {/* Therapist pages */}
      <Route path="/therapist" element={withAuth(<TherapistDashboard />)} />
      <Route path="/therapist/client/:id" element={withAuth(<ClientDetail />)} />
      <Route path="/therapist/client/:id/exercises" element={withAuth(<ClientExercises />)} />
      <Route path="/therapist/client/:id/checkins" element={withAuth(<ClientCheckins />)} />
      <Route path="/therapist/client/:id/notes" element={withAuth(<ClientNotes />)} />
      <Route path="/therapist/client/:id/files" element={withAuth(<ClientFiles />)} />
      <Route path="/therapist/templates" element={withAuth(<TherapistTemplates />)} />
      <Route path="/therapist/resources" element={withAuth(<TherapistResources />)} />
      <Route path="/therapist/template/:id" element={withAuth(<ExerciseBuilderPage />)} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}


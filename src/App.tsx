import { Routes, Route, Navigate } from "react-router-dom";
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
import ExerciseBuilderPage from "./pages/therapist/ExerciseBuilder";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
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

  return (
    <Routes>
      <Route
        path="/login"
        element={!loading && user ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Main dashboard - role based */}
      <Route path="/" element={
        <ProtectedRoute>
          {isTherapist ? <TherapistDashboard /> : <Dashboard />}
        </ProtectedRoute>
      } />

      {/* Client pages */}
      <Route path="/checkin" element={<ProtectedRoute><Checkin /></ProtectedRoute>} />
      <Route path="/checkins" element={<ProtectedRoute><CheckinsOverview /></ProtectedRoute>} />
      <Route path="/exercises" element={<ProtectedRoute><ExercisesOverview /></ProtectedRoute>} />
      <Route path="/exercise/:id" element={<ProtectedRoute><Exercise /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      {/* Therapist pages */}
      <Route path="/therapist" element={<ProtectedRoute><TherapistDashboard /></ProtectedRoute>} />
      <Route path="/therapist/client/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
      <Route path="/therapist/client/:id/exercises" element={<ProtectedRoute><ClientExercises /></ProtectedRoute>} />
      <Route path="/therapist/client/:id/checkins" element={<ProtectedRoute><ClientCheckins /></ProtectedRoute>} />
      <Route path="/therapist/client/:id/notes" element={<ProtectedRoute><ClientNotes /></ProtectedRoute>} />
      <Route path="/therapist/client/:id/files" element={<ProtectedRoute><ClientFiles /></ProtectedRoute>} />
      <Route path="/therapist/templates" element={<ProtectedRoute><TherapistTemplates /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

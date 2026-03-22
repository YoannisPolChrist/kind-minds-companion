import { useNavigate } from "react-router-dom";
import { PageTransition } from "../../components/motion";
import { useAuth } from "../../hooks/useAuth";
import TherapistDashboardTiles from "../../components/therapist/TherapistDashboardTiles";

export default function TherapistDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <PageTransition className="min-h-screen bg-primary-dark">
      <TherapistDashboardTiles
        therapistName={profile?.firstName || "Therapeut"}
        onNavigate={navigate}
      />
    </PageTransition>
  );
}

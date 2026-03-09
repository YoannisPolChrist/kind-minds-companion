import { useNavigate } from "react-router-dom";
import { PageTransition } from "../../components/motion";
import { useAuth } from "../../hooks/useAuth";
import TherapistDashboardTiles from "../../components/therapist/TherapistDashboardTiles";

export default function TherapistDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <PageTransition className="h-screen bg-background overflow-hidden">
      <TherapistDashboardTiles
        onNavigate={navigate}
        onOpenSettings={() => navigate("/settings")}
        therapistName={profile?.firstName || "Therapeut"}
      />
    </PageTransition>
  );
}


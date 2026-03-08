import { useNavigate } from "react-router-dom";
import { PageTransition } from "../../components/motion";
import TherapistDashboardTiles from "../../components/therapist/TherapistDashboardTiles";

export default function TherapistDashboard() {
  const navigate = useNavigate();

  return (
    <PageTransition className="h-screen bg-background overflow-hidden">
      <TherapistDashboardTiles
        onNavigate={navigate}
        onOpenSettings={() => navigate("/settings")}
      />
    </PageTransition>
  );
}


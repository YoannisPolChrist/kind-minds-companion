import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { motion } from "motion/react";
import { PageTransition, HeaderOrbs, PressableScale } from "../../components/motion";
import { useAuth } from "../../hooks/useAuth";
import { getRandomHeaderImage } from "../../constants/headerImages";
import TherapistDashboardTiles from "../../components/therapist/TherapistDashboardTiles";

const headerImg = getRandomHeaderImage();

export default function TherapistDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Guten Morgen";
    if (h < 18) return "Guten Tag";
    return "Guten Abend";
  };

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl shadow-primary/15 relative overflow-hidden">
        <img src={headerImg} alt="Beruhigendes Header-Bild" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/35 to-primary/45" />
        <HeaderOrbs />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-9 sm:pt-12 sm:pb-10 relative z-10">
          <motion.div
            className="flex items-start justify-between gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div>
              <motion.p
                className="text-primary-foreground/75 text-xs sm:text-sm font-bold uppercase tracking-wider mb-2"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {greeting()} 👋
              </motion.p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                {profile?.firstName || "Therapeut"}
              </h1>
              <p className="text-primary-foreground/85 text-sm sm:text-base font-medium mt-2">
                Wähle einen Bereich für die Klientenbegleitung.
              </p>
            </div>

            <PressableScale onClick={() => navigate("/settings")}> 
              <div className="p-3 rounded-2xl bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
                <Settings size={20} />
              </div>
            </PressableScale>
          </motion.div>
        </div>
      </div>

      <TherapistDashboardTiles onNavigate={navigate} />
    </PageTransition>
  );
}

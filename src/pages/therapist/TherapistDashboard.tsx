import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  Users, BookOpen, FileText, LayoutTemplate, Settings,
} from "lucide-react";
import { motion } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem, HeaderOrbs,
  PressableScale,
} from "../../components/motion";
import { getRandomHeaderImage } from "../../constants/headerImages";

const headerImg = getRandomHeaderImage();

export default function TherapistDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl shadow-primary/15 relative overflow-hidden">
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/30 to-primary/40" />
        <HeaderOrbs />
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-10 relative z-10">
          <motion.div
            className="flex items-center justify-between mb-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Therapeuten-Dashboard
              </h1>
              <p className="text-white/70 text-sm font-medium mt-1">
                Hallo {profile?.firstName || "Therapeut"}
              </p>
            </div>
            <PressableScale onClick={() => navigate("/settings")}>
              <div className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
                <Settings size={20} />
              </div>
            </PressableScale>
          </motion.div>
        </div>
      </div>

      <StaggerContainer className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Navigation Cards */}
        <StaggerItem>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PressableScale onClick={() => navigate("/therapist/clients")}>
              <div className="bg-card rounded-3xl border-2 border-primary/20 p-8 flex flex-col items-center justify-center gap-4 shadow-sm hover:border-primary/40 transition-colors min-h-[180px]">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Users size={32} className="text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-foreground">Klienten</h3>
                  <p className="text-sm text-muted-foreground mt-1">Alle Klienten verwalten</p>
                </div>
              </div>
            </PressableScale>
            <PressableScale onClick={() => navigate("/therapist/templates")}>
              <div className="bg-card rounded-3xl border-2 border-primary/20 p-8 flex flex-col items-center justify-center gap-4 shadow-sm hover:border-primary/40 transition-colors min-h-[180px]">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <LayoutTemplate size={32} className="text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-foreground">Vorlagen</h3>
                  <p className="text-sm text-muted-foreground mt-1">Übungsvorlagen erstellen & verwalten</p>
                </div>
              </div>
            </PressableScale>
            <PressableScale onClick={() => navigate("/therapist/resources")}>
              <div className="bg-card rounded-3xl border-2 border-accent/20 p-8 flex flex-col items-center justify-center gap-4 shadow-sm hover:border-accent/40 transition-colors min-h-[180px]">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <FileText size={32} className="text-accent" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-foreground">Bibliothek</h3>
                  <p className="text-sm text-muted-foreground mt-1">Ressourcen & Materialien verwalten</p>
                </div>
              </div>
            </PressableScale>
          </div>
        </StaggerItem>

        <div className="h-8" />
      </StaggerContainer>
    </PageTransition>
  );
}
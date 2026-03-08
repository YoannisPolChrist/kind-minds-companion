import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, LogOut, Key, BarChart3, BookOpen, User, Edit3, FileText, History } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useState } from "react";
import { motion } from "motion/react";
import { PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, PressableScale } from "../components/motion";
import { getRandomHeaderImage } from "../constants/headerImages";

const headerImg = getRandomHeaderImage();

export default function Settings() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  const handlePasswordReset = async () => {
    if (!profile?.email) return;
    try {
      await sendPasswordResetEmail(auth, profile.email);
      setResetSent(true);
      setResetError("");
    } catch (e: any) {
      setResetError("Konnte E-Mail nicht senden.");
      console.error(e);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isTherapist = profile?.role === "therapist";

  const navItems = isTherapist
    ? [
        { path: "/therapist/clients", icon: BarChart3, label: "Alle Klienten", desc: "Klienten verwalten & Übersicht" },
        { path: "/therapist/templates", icon: BookOpen, label: "Vorlagen", desc: "Übungsvorlagen erstellen & verwalten" },
        { path: "/therapist/resources", icon: FileText, label: "Bibliothek", desc: "Ressourcen & Materialien" },
      ]
    : [
        { path: "/checkins", icon: BarChart3, label: "Mein Tagebuch", desc: "Check-in Verlauf & Statistiken" },
        { path: "/exercises", icon: BookOpen, label: "Alle Übungen", desc: "Übersicht aller zugewiesenen Übungen" },
        { path: "/notes", icon: Edit3, label: "Therapie-Tagebuch", desc: "Eigene Notizen & Emotionen" },
        { path: "/resources", icon: FileText, label: "Bibliothek", desc: "Dokumente & Links vom Therapeuten" },
        { path: "/history", icon: History, label: "Verlauf", desc: "Alle erledigten Aktivitäten" },
      ];

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2rem] px-5 pt-14 pb-8 relative overflow-hidden">
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/65 to-primary/50" />
        <HeaderOrbs />
        <div className="max-w-xl mx-auto relative z-10">
          <motion.button
            onClick={() => navigate(-1)}
            className="text-white/80 hover:text-white font-bold text-sm bg-white/20 px-4 py-2 rounded-xl mb-5 inline-flex items-center gap-1 hover:bg-white/30 transition-all"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} /> Zurück
          </motion.button>
          <h1 className="text-2xl font-black tracking-tight">Einstellungen</h1>
        </div>
      </div>

      <StaggerContainer className="max-w-xl mx-auto px-5 py-6 space-y-4">
        {/* Profile info */}
        <StaggerItem>
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <motion.div
                className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <User size={24} className="text-primary" />
              </motion.div>
              <div>
                <p className="font-bold text-foreground text-lg">{profile?.firstName} {profile?.lastName}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{profile?.role || "Klient"}</p>
              </div>
            </div>
          </div>
        </StaggerItem>

        {/* Navigation */}
        <StaggerItem>
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden divide-y divide-border">
            {navItems.map(({ path, icon: Icon, label, desc }, i) => (
              <PressableScale key={path} onClick={() => navigate(path)}>
                <div className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors text-left w-full">
                  <Icon size={20} className="text-primary shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              </PressableScale>
            ))}
          </div>
        </StaggerItem>

        {/* Actions */}
        <StaggerItem>
          <PressableScale onClick={handlePasswordReset}>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors text-left w-full">
                <Key size={20} className="text-primary shrink-0" />
                <div>
                  <p className="font-bold text-foreground">Passwort zurücksetzen</p>
                  <p className="text-xs text-muted-foreground">Passwort-Reset E-Mail anfordern</p>
                </div>
              </div>
            </div>
          </PressableScale>
        </StaggerItem>

        {resetSent && (
          <motion.div
            className="bg-success/10 text-success text-sm font-semibold rounded-2xl px-4 py-3 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            ✓ Ein Link zum Zurücksetzen wurde an {profile?.email} gesendet.
          </motion.div>
        )}
        {resetError && (
          <motion.div
            className="bg-destructive/10 text-destructive text-sm font-semibold rounded-2xl px-4 py-3 text-center"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
            transition={{ duration: 0.4 }}
          >
            {resetError}
          </motion.div>
        )}

        {/* Sign out */}
        <StaggerItem>
          <motion.button
            onClick={handleSignOut}
            className="w-full py-4 rounded-2xl bg-destructive/10 text-destructive font-black flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02, backgroundColor: "hsl(var(--destructive) / 0.2)" }}
            whileTap={{ scale: 0.97 }}
          >
            <LogOut size={20} />
            Abmelden
          </motion.button>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}

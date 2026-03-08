import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, LogOut, Key, History, BarChart3, BookOpen, User } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useState } from "react";

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

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2rem] px-5 pt-14 pb-8">
        <div className="max-w-xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-white/80 hover:text-white font-bold text-sm bg-white/20 px-4 py-2 rounded-xl mb-5 inline-flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Zurück
          </button>
          <h1 className="text-2xl font-black tracking-tight">Einstellungen</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-6 space-y-4">
        {/* Profile info */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={24} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">{profile?.firstName} {profile?.lastName}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{profile?.role || "Klient"}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden divide-y divide-border">
          <button
            onClick={() => navigate("/checkins")}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors text-left"
          >
            <BarChart3 size={20} className="text-primary shrink-0" />
            <div>
              <p className="font-bold text-foreground">Mein Tagebuch</p>
              <p className="text-xs text-muted-foreground">Check-in Verlauf & Statistiken</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/exercises")}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors text-left"
          >
            <BookOpen size={20} className="text-primary shrink-0" />
            <div>
              <p className="font-bold text-foreground">Alle Übungen</p>
              <p className="text-xs text-muted-foreground">Übersicht aller zugewiesenen Übungen</p>
            </div>
          </button>
        </div>

        {/* Actions */}
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden divide-y divide-border">
          <button
            onClick={handlePasswordReset}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors text-left"
          >
            <Key size={20} className="text-primary shrink-0" />
            <div>
              <p className="font-bold text-foreground">Passwort zurücksetzen</p>
              <p className="text-xs text-muted-foreground">Passwort-Reset E-Mail anfordern</p>
            </div>
          </button>
        </div>

        {resetSent && (
          <div className="bg-success/10 text-success text-sm font-semibold rounded-2xl px-4 py-3 text-center">
            ✓ Ein Link zum Zurücksetzen wurde an {profile?.email} gesendet.
          </div>
        )}
        {resetError && (
          <div className="bg-destructive/10 text-destructive text-sm font-semibold rounded-2xl px-4 py-3 text-center">
            {resetError}
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full py-4 rounded-2xl bg-destructive/10 text-destructive font-black flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors"
        >
          <LogOut size={20} />
          Abmelden
        </button>
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, LogOut, Key, History } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useState } from "react";

export default function Settings() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [resetSent, setResetSent] = useState(false);

  const handlePasswordReset = async () => {
    if (!profile?.email) return;
    try {
      await addDoc(collection(db, "mail_requests"), {
        email: profile.email,
        type: "PASSWORD_RESET",
        createdAt: serverTimestamp(),
      });
      setResetSent(true);
    } catch (e) {
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
        <button
          onClick={() => navigate(-1)}
          className="text-white/80 hover:text-white font-bold text-sm bg-white/20 px-4 py-2 rounded-xl mb-5 inline-flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Zurück
        </button>
        <h1 className="text-2xl font-black tracking-tight">Einstellungen</h1>
      </div>

      <div className="max-w-xl mx-auto px-5 py-6 space-y-4">
        {/* Profile info */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-3">Profil</h3>
          <p className="font-bold text-foreground">{profile?.firstName} {profile?.lastName}</p>
          <p className="text-sm text-text-subtle">{profile?.email}</p>
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
              <p className="text-xs text-text-subtle">Passwort-Reset E-Mail anfordern</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/history")}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors text-left"
          >
            <History size={20} className="text-primary shrink-0" />
            <div>
              <p className="font-bold text-foreground">Übungs-Verlauf</p>
              <p className="text-xs text-text-subtle">Alle abgeschlossenen Übungen</p>
            </div>
          </button>
        </div>

        {resetSent && (
          <div className="bg-success/10 text-success text-sm font-semibold rounded-2xl px-4 py-3 text-center">
            Ein Link zum Zurücksetzen wurde an deine E-Mail gesendet.
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

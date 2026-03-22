import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Sparkles, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { auth } from "../lib/firebaseAuth";
import { db } from "../lib/firebaseDb";
import { LoginOrbs, PageTransition } from "../components/motion";

const getRegisterErrorMessage = (error: unknown) => {
  const code = (error as FirebaseError | undefined)?.code;

  switch (code) {
    case "auth/email-already-in-use":
      return "Diese E-Mail-Adresse wird bereits verwendet.";
    case "auth/invalid-email":
      return "Die eingegebene E-Mail-Adresse ist ungültig.";
    case "auth/weak-password":
      return "Das Passwort ist zu schwach (mindestens 6 Zeichen erforderlich).";
    case "auth/network-request-failed":
      return "Netzwerkfehler. Bitte prüfe deine Internetverbindung.";
    default:
      return "Registrierung fehlgeschlagen. Bitte erneut versuchen.";
  }
};


export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [therapistId, setTherapistId] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("Bitte fülle alle Pflichtfelder aus.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Create firestore profile
      const userDocRef = doc(db, "users", user.uid);
      const profileData: Record<string, any> = {
        email: user.email,
        role: "client",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        createdAt: serverTimestamp(),
      };

      if (therapistId.trim()) {
        profileData.therapistId = therapistId.trim();
      }

      await setDoc(userDocRef, profileData);

      // Navigate to dashboard
      navigate("/");
    } catch (regError) {
      setError(getRegisterErrorMessage(regError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background leading-relaxed">
      <LoginOrbs />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <PageTransition className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
                    <motion.section
            className="relative overflow-hidden rounded-[2.25rem] border border-primary/10 text-primary-foreground shadow-2xl shadow-primary/15"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="absolute inset-0">
              <img
                src="/images/nature-header-3.webp"
                alt="Therapie Workspace"
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/80 via-primary/78 to-primary/60 backdrop-blur-[1px]" />
            </div>

            <div className="relative flex h-full flex-col justify-between gap-10 p-6 sm:p-8 lg:p-10">
              <div className="space-y-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em]">
                  <Sparkles size={14} />
                  Browser Workspace
                </div>

                <div className="max-w-2xl space-y-4 text-balance">
                  <img
                    src="/images/logo-transparent.png"
                    alt="Kind Minds"
                    className="h-14 object-contain sm:h-16"
                  />
                  <h1 className="text-2xl font-black tracking-tight">
                    Konto anlegen und direkt starten.
                  </h1>
                  <p className="max-w-xl text-sm leading-7 text-primary-foreground/85 sm:text-base">
                    Registriere dich, verknüpfe optional deinen Therapeuten-Code und arbeite anschließend in einem ruhigen Browser-Setup.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.75rem] border border-white/15 bg-white/12 p-5 backdrop-blur-md">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-primary-foreground/75">
                    Schneller Einstieg
                  </p>
                  <p className="mt-2 text-lg font-semibold leading-snug text-primary-foreground">
                    Login- und Dashboard-Oberflächen bleiben identisch auf Desktop, Tablet und Handy.
                  </p>
                </div>
                <div className="rounded-[1.75rem] border border-white/15 bg-white/12 p-5 backdrop-blur-md">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-primary-foreground/75">
                    Ruhiger Ablauf
                  </p>
                  <p className="mt-2 text-lg font-semibold leading-snug text-primary-foreground">
                    Keine Feature-Tafeln mehr – nur der Fokus auf Check-ins, Tagebuch und Ressourcen.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            className="rounded-[2.25rem] border border-border bg-card p-6 shadow-2xl shadow-primary/5 sm:p-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Konto Erstellen</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground">Neu hier?</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Fülle die Daten unten aus, um dich als Klient:in zu registrieren.
              </p>
            </div>

            <motion.form
              onSubmit={handleRegister}
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.16 }}
            >
              {error && (
                <motion.div
                  className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  {error}
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Vorname
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-foreground font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Max"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Nachname
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-foreground font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Mustermann"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-foreground font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="name@beispiel.de"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Passwort
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-foreground font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Min. 6 Zeichen"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Passwort bestätigen
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-foreground font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Passwort wiederholen"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Therapeuten-ID (Optional)
                </label>
                <input
                  type="text"
                  value={therapistId}
                  onChange={(event) => setTherapistId(event.target.value)}
                  className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-foreground font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="ID des Therapeuten einfügen"
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-base font-black text-primary-foreground shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <>
                    <motion.span
                      className="inline-block h-5 w-5 rounded-full border-2 border-primary-foreground border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Registrierung läuft...
                  </>
                ) : (
                  <>
                    Konto erstellen
                    <UserPlus size={18} />
                  </>
                )}
              </motion.button>

              <div className="pt-2">
                <div className="text-center text-sm font-medium text-muted-foreground">
                  Bereits ein Konto?{" "}
                  <Link to="/login" className="font-bold text-primary hover:underline">
                    Hier einloggen
                  </Link>
                </div>
              </div>
            </motion.form>

            <p className="mt-6 text-center text-xs text-text-subtle">
              &copy; 2026 johanneschrist.com - Alle Rechte vorbehalten.
            </p>
          </motion.section>
        </PageTransition>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { auth } from "../lib/firebaseAuth";
import { db } from "../lib/firebaseDb";
import { LoginOrbs, PageTransition } from "../components/motion";

const getLoginErrorMessage = (error: unknown) => {
  const code = (error as FirebaseError | undefined)?.code;

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-Mail oder Passwort sind nicht korrekt.";
    case "auth/too-many-requests":
      return "Zu viele Versuche. Bitte kurz warten und dann erneut einloggen.";
    case "auth/network-request-failed":
      return "Netzwerkfehler. Bitte prüfe deine Internetverbindung.";
    case "auth/unauthorized-domain":
      return "Die Live-Domain ist in Firebase Authentication noch nicht freigeschaltet.";
    default:
      return "Login fehlgeschlagen. Bitte erneut versuchen.";
  }
};

const heroFocus = ["Check-ins", "Materialien", "Termine"];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !password) {
      setError("Bitte fülle beide Felder aus.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate("/");
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Bitte gib zuerst deine E-Mail-Adresse ein.");
      return;
    }

    try {
      await addDoc(collection(db, "mail_requests"), {
        email: email.trim(),
        type: "PASSWORD_RESET",
        createdAt: serverTimestamp(),
      });
      setResetSent(true);
      setError("");
    } catch {
      setError("Die Passwort-Mail konnte gerade nicht ausgelost werden.");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <LoginOrbs />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <PageTransition className="grid w-full gap-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(400px,0.84fr)]">
          <motion.section
            className="relative overflow-hidden rounded-[2.25rem] border border-primary/10 text-primary-foreground shadow-2xl shadow-primary/15"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="absolute inset-0">
              <img
                src="/images/nature-header-2.webp"
                alt="Therapeutischer Workspace"
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/80 via-primary/80 to-primary/65 backdrop-blur-[1px]" />
            </div>

            <div className="relative flex h-full flex-col justify-between gap-10 p-6 sm:p-8 lg:p-10">
              <div className="space-y-6 text-balance">
                <div className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-primary-foreground/90">
                  Kind Minds Companion
                </div>

                <div className="max-w-xl space-y-4">
                  <img
                    src="/images/logo-transparent.png"
                    alt="Kind Minds"
                    className="h-11 object-contain sm:h-12"
                  />
                  <h1 className="text-2xl font-black leading-tight tracking-tight">
                    Alles für deinen Prozess an einem Ort.
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary-foreground/88">
                {heroFocus.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/25 bg-white/15 px-4 py-2 backdrop-blur-sm"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            className="rounded-[2.25rem] border border-border bg-card p-6 shadow-2xl shadow-primary/5 sm:p-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Sicher anmelden
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground">
                Willkommen zurück
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Melde dich mit deiner E-Mail-Adresse und deinem Passwort an.
              </p>
            </div>

            <motion.form
              onSubmit={handleLogin}
              className="space-y-5"
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

              {resetSent && (
                <motion.div
                  className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  Falls die Adresse registriert ist, wurde eine Reset-Mail ausgelost.
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setResetSent(false);
                  }}
                  className="w-full rounded-2xl border border-border bg-secondary px-4 py-3.5 font-medium text-foreground transition-all placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="name@beispiel.de"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Passwort
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-border bg-secondary px-4 py-3.5 font-medium text-foreground transition-all placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Passwort eingeben"
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-base font-black text-primary-foreground shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
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
                    Anmeldung läuft...
                  </>
                ) : (
                  <>
                    Einloggen
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full text-center text-sm font-semibold text-text-subtle transition-colors hover:text-primary"
                >
                  Passwort vergessen?
                </button>
                <div className="text-center text-sm font-medium text-muted-foreground">
                  Noch kein Konto?{" "}
                  <Link to="/register" className="font-bold text-primary hover:underline">
                    Jetzt registrieren
                  </Link>
                </div>
              </div>
            </motion.form>

            <p className="mt-8 text-center text-xs text-text-subtle">
              &copy; 2026 johanneschrist.com - Alle Rechte vorbehalten.
            </p>
          </motion.section>
        </PageTransition>
      </div>
    </div>
  );
}

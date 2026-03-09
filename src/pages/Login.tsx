import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { auth } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { motion } from "motion/react";
import { LoginOrbs, PageTransition } from "../components/motion";

const getLoginErrorMessage = (error: unknown) => {
  const code = (error as FirebaseError | undefined)?.code;

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-Mail oder Passwort falsch.";
    case "auth/too-many-requests":
      return "Zu viele Versuche. Bitte kurz warten und erneut versuchen.";
    case "auth/network-request-failed":
      return "Netzwerkfehler. Bitte Internetverbindung prüfen.";
    case "auth/unauthorized-domain":
      return "Live-Domain nicht freigeschaltet. Bitte die Published-Domain in Firebase Authentication > Authorized domains ergänzen.";
    default:
      return "Login fehlgeschlagen. Bitte erneut versuchen.";
  }
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Bitte fülle alle Felder aus.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Bitte gib deine E-Mail Adresse ein.");
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
      setError("Fehler beim Senden der E-Mail.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <LoginOrbs />

      <PageTransition className="w-full max-w-md relative z-10">
        {/* Logo area */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 80 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 10, stiffness: 80, delay: 0.1 }}
          >
            <motion.span
              className="text-4xl"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              🧠
            </motion.span>
          </motion.div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            Therapie-App
          </h1>
          <p className="text-text-subtle mt-2 font-medium">
            Logge dich ein, um deine digitalen Therapie-Übungen zu sehen.
          </p>
        </motion.div>

        {/* Form card */}
        <motion.form
          onSubmit={handleLogin}
          className="bg-card rounded-3xl shadow-xl shadow-primary/5 border border-border p-8 space-y-5"
          initial={{ opacity: 0, y: 24, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 90, delay: 0.15 }}
          style={{ perspective: 900 }}
        >
          {error && (
            <motion.div
              className="bg-destructive/10 text-destructive text-sm font-semibold rounded-2xl px-4 py-3 text-center"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
              transition={{ duration: 0.4 }}
            >
              {error}
            </motion.div>
          )}
          {resetSent && (
            <motion.div
              className="bg-success/10 text-success text-sm font-semibold rounded-2xl px-4 py-3 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              Falls diese E-Mail registriert ist, wurde ein Link versendet.
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <label className="block text-xs font-bold text-text-subtle uppercase tracking-wider mb-2">
              E-Mail Adresse
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-secondary border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="name@beispiel.de"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.32 }}
          >
            <label className="block text-xs font-bold text-text-subtle uppercase tracking-wider mb-2">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-secondary border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="••••••••"
            />
          </motion.div>

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <motion.span
                  className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full inline-block"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                Einloggen...
              </span>
            ) : (
              "Einloggen"
            )}
          </motion.button>

          <motion.button
            type="button"
            onClick={handleForgotPassword}
            className="w-full text-center text-sm text-text-subtle font-semibold hover:text-primary transition-colors"
            whileHover={{ scale: 1.03 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Passwort vergessen?
          </motion.button>
        </motion.form>

        <motion.p
          className="text-center text-xs text-text-subtle mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          &copy; 2025 johanneschrist.com — Alle Rechte vorbehalten.
        </motion.p>
      </PageTransition>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

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
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch {
      setError("E-Mail oder Passwort falsch.");
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
        email,
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-6">
            <span className="text-4xl">🧠</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            Therapie-App
          </h1>
          <p className="text-text-subtle mt-2 font-medium">
            Logge dich ein, um deine digitalen Therapie-Übungen zu sehen.
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleLogin}
          className="bg-card rounded-3xl shadow-xl shadow-primary/5 border border-border p-8 space-y-5"
        >
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm font-semibold rounded-2xl px-4 py-3 text-center">
              {error}
            </div>
          )}
          {resetSent && (
            <div className="bg-success/10 text-success text-sm font-semibold rounded-2xl px-4 py-3 text-center">
              Falls diese E-Mail registriert ist, wurde ein Link versendet.
            </div>
          )}

          <div>
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
          </div>

          <div>
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Einloggen...
              </span>
            ) : (
              "Einloggen"
            )}
          </button>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="w-full text-center text-sm text-text-subtle font-semibold hover:text-primary transition-colors"
          >
            Passwort vergessen?
          </button>
        </form>

        <p className="text-center text-xs text-text-subtle mt-8">
          &copy; 2025 johanneschrist.com — Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  );
}

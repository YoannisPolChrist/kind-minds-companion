import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, CheckCircle, TrendingUp } from "lucide-react";

const EMOTIONS = [
  { id: "terrible", emoji: "😖", label: "Sehr schlecht", mood: 1, color: "#EF4444" },
  { id: "bad", emoji: "😔", label: "Schlecht", mood: 2, color: "#F97316" },
  { id: "not_great", emoji: "😕", label: "Nicht gut", mood: 3, color: "#F59E0B" },
  { id: "neutral", emoji: "😐", label: "Neutral", mood: 4, color: "#A3A3A3" },
  { id: "okay", emoji: "🙂", label: "Okay", mood: 5, color: "#84CC16" },
  { id: "good", emoji: "😊", label: "Gut", mood: 6, color: "#22C55E" },
  { id: "very_good", emoji: "😄", label: "Sehr gut", mood: 7, color: "#10B981" },
  { id: "great", emoji: "🥰", label: "Toll", mood: 8, color: "#14B8A6" },
  { id: "awesome", emoji: "🤩", label: "Großartig", mood: 9, color: "#06B6D4" },
  { id: "fantastic", emoji: "✨", label: "Fantastisch", mood: 10, color: "#8B5CF6" },
];

const QUICK_TAGS = ["Erschöpft", "Ängstlich", "Ruhig", "Motiviert", "Traurig", "Dankbar", "Überfordert", "Fokussiert"];

export default function Checkin() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [energy, setEnergy] = useState(5);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const activeEmotion = EMOTIONS.find((e) => e.id === selectedEmotion);
  const today = new Date().toISOString().split("T")[0];

  const handleSave = async () => {
    if (!selectedEmotion || !activeEmotion) {
      setError("Bitte wähle eine Stimmung aus.");
      return;
    }
    if (!profile?.id) return;
    setSaving(true);
    setError("");
    try {
      await addDoc(collection(db, "checkins"), {
        uid: profile.id,
        date: today,
        mood: activeEmotion.mood,
        energy,
        tags,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      });
      setSaved(true);
    } catch (e) {
      setError("Check-in konnte nicht gespeichert werden.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full animate-in fade-in">
          <div className="w-28 h-28 rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center mx-auto mb-8">
            <CheckCircle size={56} className="text-success" />
          </div>
          <h2 className="text-3xl font-black text-foreground mb-3">Check-in gespeichert! 🎉</h2>
          <p className="text-text-subtle font-medium mb-10">
            Super gemacht — du hast heute wieder auf dich geachtet!
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <TrendingUp size={20} />
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="rounded-b-[2rem] px-5 pt-14 pb-8"
        style={{
          background: activeEmotion
            ? `linear-gradient(135deg, ${activeEmotion.color}E6, ${activeEmotion.color}99)`
            : "linear-gradient(135deg, hsl(var(--primary-dark)), hsl(var(--primary)))",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="text-white/80 hover:text-white font-bold text-sm bg-white/20 px-4 py-2 rounded-xl mb-5 inline-flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Zurück
        </button>
        <h1 className="text-white text-2xl sm:text-3xl font-black tracking-tight">Tägliches Check-in</h1>
        <p className="text-white/60 text-sm font-medium mt-1">
          {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm font-semibold rounded-2xl px-4 py-3 text-center">
            {error}
          </div>
        )}

        {/* Mood Selection */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-4">
            Wie fühlst du dich jetzt gerade?
          </h3>
          <div className="flex flex-wrap gap-2.5 justify-center">
            {EMOTIONS.map((em) => (
              <button
                key={em.id}
                onClick={() => setSelectedEmotion(em.id)}
                className="px-3.5 py-2.5 rounded-3xl flex items-center gap-1.5 font-bold text-sm transition-all"
                style={{
                  backgroundColor: selectedEmotion === em.id ? em.color : "hsl(var(--secondary))",
                  color: selectedEmotion === em.id ? "#fff" : "hsl(var(--foreground))",
                  border: selectedEmotion === em.id ? "none" : "1px solid hsl(var(--border))",
                }}
              >
                <span className="text-lg">{em.emoji}</span>
                {em.label}
              </button>
            ))}
          </div>
        </div>

        {/* Energy */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-4">
            Dein Energielevel (1-10)
          </h3>
          <div className="flex justify-between text-sm font-bold text-text-subtle mb-3 px-1">
            <span>Erschöpft</span>
            <span className="text-xl" style={{ color: activeEmotion?.color || "hsl(var(--primary))" }}>
              {energy}
            </span>
            <span>Voller Energie</span>
          </div>
          <div className="flex gap-1.5 items-center">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
              <button
                key={val}
                onClick={() => setEnergy(val)}
                className="flex-1 h-8 rounded-lg transition-all"
                style={{
                  backgroundColor: val <= energy
                    ? (activeEmotion?.color || "hsl(var(--primary))")
                    : "hsl(var(--secondary))",
                  opacity: val <= energy ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-4">
            Was beschreibt dich gerade? (Optional)
          </h3>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
                  tags.includes(tag)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground border border-border hover:border-primary/30"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-4">
            Möchtest du noch etwas ergänzen? (Optional)
          </h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notizen zum heutigen Tag..."
            rows={4}
            className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !selectedEmotion}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg disabled:opacity-50 shadow-lg shadow-primary/20 transition-all hover:opacity-90"
        >
          {saving ? "Speichern..." : "Check-in Speichern"}
        </button>

        <div className="h-6" />
      </div>
    </div>
  );
}

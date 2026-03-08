import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";

const EMOTION_PRESETS = [
  { id: "awesome", score: 10, emoji: "🤩", color: "#8B5CF6", label: "Großartig" },
  { id: "motivated", score: 9, emoji: "🔥", color: "#0EA5E9", label: "Motiviert" },
  { id: "proud", score: 9, emoji: "🥰", color: "#6366F1", label: "Stolz" },
  { id: "happy", score: 8, emoji: "😊", color: "#10B981", label: "Fröhlich" },
  { id: "grateful", score: 8, emoji: "🙏", color: "#22C55E", label: "Dankbar" },
  { id: "content", score: 7, emoji: "🙂", color: "#4ADE80", label: "Zufrieden" },
  { id: "calm", score: 6, emoji: "😌", color: "#A3E635", label: "Entspannt" },
  { id: "neutral", score: 5, emoji: "😐", color: "#9CA3AF", label: "Neutral" },
  { id: "bored", score: 5, emoji: "🥱", color: "#94A3B8", label: "Gelangweilt" },
  { id: "stressed", score: 4, emoji: "🤯", color: "#FB923C", label: "Gestresst" },
  { id: "anxious", score: 4, emoji: "😰", color: "#FBBF24", label: "Ängstlich" },
  { id: "sad", score: 3, emoji: "😢", color: "#FB7185", label: "Traurig" },
  { id: "exhausted", score: 2, emoji: "😫", color: "#F87171", label: "Erschöpft" },
  { id: "angry", score: 2, emoji: "😡", color: "#F43F5E", label: "Wütend" },
  { id: "despair", score: 1, emoji: "😭", color: "#EF4444", label: "Verzweifelt" },
];

const QUICK_TAGS = ["Erschöpft", "Ängstlich", "Ruhig", "Motiviert", "Traurig", "Dankbar", "Überfordert", "Fokussiert", "Einsam", "Hoffnungsvoll"];

export default function Checkin() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedEmotionId, setSelectedEmotionId] = useState<string | null>(null);
  const [energy, setEnergy] = useState(5);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);

  const activeEmotion = EMOTION_PRESETS.find((e) => e.id === selectedEmotionId);
  const today = new Date().toISOString().split("T")[0];
  const currentSlot = new Date().getHours() < 12 ? "morning" : "evening";

  // Check if already completed for this slot
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const slotDocId = `${profile.id}_${today}_${currentSlot}`;
        const snap = await getDoc(doc(db, "checkins", slotDocId));
        if (snap.exists()) {
          const data = snap.data();
          setAlreadyCompleted(true);
          // Pre-fill with existing data
          const preset = EMOTION_PRESETS.find((e) => e.score === data.mood);
          if (preset) setSelectedEmotionId(preset.id);
          if (data.energy) setEnergy(data.energy);
          if (data.note) setNote(data.note);
          if (data.tags) setTags(data.tags);
        }
      } catch (e) {
        console.warn("Could not check existing checkin:", e);
      } finally {
        setLoadingCheck(false);
      }
    })();
  }, [profile?.id]);

  const handleSave = async () => {
    if (!selectedEmotionId || !activeEmotion) {
      setError("Bitte wähle eine Stimmung aus.");
      return;
    }
    if (!profile?.id) return;
    setSaving(true);
    setError("");
    try {
      const docId = `${profile.id}_${today}_${currentSlot}`;
      await setDoc(doc(db, "checkins", docId), {
        uid: profile.id,
        date: today,
        slot: currentSlot,
        mood: activeEmotion.score,
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
    if (alreadyCompleted) return;
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  if (loadingCheck) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <div className="w-28 h-28 rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center mx-auto mb-8">
            <CheckCircle size={56} className="text-success" />
          </div>
          <h2 className="text-3xl font-black text-foreground mb-3">Check-in gespeichert! 🎉</h2>
          <p className="text-muted-foreground font-medium mb-10">
            Super gemacht — du hast heute wieder auf dich geachtet!
          </p>
          <button
            onClick={() => navigate("/checkins")}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mb-3"
          >
            <TrendingUp size={20} />
            Meine Auswertung
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 text-muted-foreground font-bold"
          >
            Zurück zur App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="rounded-b-[2rem] px-5 pt-14 pb-8 transition-all duration-300"
        style={{
          background: activeEmotion && !alreadyCompleted
            ? `linear-gradient(135deg, ${activeEmotion.color}E6, ${activeEmotion.color}99)`
            : "linear-gradient(135deg, hsl(var(--primary-dark)), hsl(var(--primary)))",
        }}
      >
        <div className="max-w-xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-white/80 hover:text-white font-bold text-sm bg-white/20 px-4 py-2 rounded-xl mb-5 inline-flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Zurück
          </button>
          <h1 className="text-white text-2xl sm:text-3xl font-black tracking-tight">
            {alreadyCompleted ? "✅ " : ""}Tägliches Check-in
          </h1>
          <p className="text-white/60 text-sm font-medium mt-1">
            {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-destructive shrink-0" />
            <span className="text-destructive text-sm font-semibold">{error}</span>
          </div>
        )}

        {/* Mood Selection */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            Wie fühlst du dich jetzt gerade?
          </h3>
          <div className="flex flex-wrap gap-2.5 justify-center">
            {EMOTION_PRESETS.map((preset) => {
              const isSelected = selectedEmotionId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => !alreadyCompleted && setSelectedEmotionId(preset.id)}
                  className="px-3.5 py-2.5 rounded-3xl flex items-center gap-1.5 font-bold text-sm transition-all"
                  style={{
                    backgroundColor: isSelected ? preset.color : "hsl(var(--secondary))",
                    color: isSelected ? "#fff" : "hsl(var(--foreground))",
                    border: isSelected ? "none" : "1px solid hsl(var(--border))",
                    opacity: alreadyCompleted && !isSelected ? 0.3 : 1,
                  }}
                >
                  <span className="text-lg">{preset.emoji}</span>
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Energy */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            Dein Energielevel (1-10)
          </h3>
          <div className="flex justify-between text-sm font-bold text-muted-foreground mb-3 px-1">
            <span>Erschöpft</span>
            <span className="text-2xl font-black" style={{ color: activeEmotion?.color || "hsl(var(--primary))" }}>
              {energy}
            </span>
            <span>Voller Energie</span>
          </div>
          <div className="relative h-10 flex items-center">
            <div className="absolute inset-y-0 left-0 right-0 flex items-center">
              <div className="w-full h-1.5 bg-muted rounded-full relative">
                <div
                  className="absolute h-full rounded-full transition-all"
                  style={{
                    width: `${((energy - 1) / 9) * 100}%`,
                    backgroundColor: activeEmotion?.color || "hsl(var(--primary))",
                  }}
                />
              </div>
            </div>
            <div className="absolute inset-0 flex justify-between items-center">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                <button
                  key={val}
                  onClick={() => !alreadyCompleted && setEnergy(val)}
                  className="w-8 h-8 flex items-center justify-center z-10"
                >
                  <div
                    className="rounded-full transition-all"
                    style={{
                      width: energy === val ? 24 : 12,
                      height: energy === val ? 24 : 12,
                      backgroundColor: energy === val ? (activeEmotion?.color || "hsl(var(--primary))") : "transparent",
                      border: energy === val ? "none" : "2px solid hsl(var(--border))",
                      boxShadow: energy === val ? `0 4px 12px ${activeEmotion?.color || "hsl(var(--primary))"}50` : "none",
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
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
                style={{ opacity: alreadyCompleted && !tags.includes(tag) ? 0.3 : 1 }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            Möchtest du noch etwas ergänzen? (Optional)
          </h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Gedanken, Notizen..."
            rows={5}
            disabled={alreadyCompleted}
            className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </div>

        {/* Action */}
        {!alreadyCompleted ? (
          <button
            onClick={handleSave}
            disabled={saving || !selectedEmotionId}
            className="w-full py-4 rounded-2xl font-black text-lg transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{
              backgroundColor: selectedEmotionId ? (activeEmotion?.color || "hsl(var(--primary))") : "hsl(var(--muted))",
              color: selectedEmotionId ? "#fff" : "hsl(var(--muted-foreground))",
              boxShadow: selectedEmotionId ? `0 8px 24px ${activeEmotion?.color}40` : "none",
            }}
          >
            {saving ? "Speichern..." : "Check-in speichern"}
            {!saving && <CheckCircle size={20} />}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-success/10 border border-success/20 rounded-2xl py-4 flex items-center justify-center gap-2">
              <CheckCircle size={22} className="text-success" />
              <span className="text-success font-black text-lg">Bereits eingecheckt</span>
            </div>
            <button
              onClick={() => navigate("/checkins")}
              className="w-full py-4 rounded-2xl bg-card border border-border text-muted-foreground font-bold flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
            >
              <TrendingUp size={18} />
              Meine Auswertung anzeigen
            </button>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}

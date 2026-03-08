import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, CheckCircle, TrendingUp, AlertCircle, Sparkles } from "lucide-react";

const EMOTION_PRESETS = [
  // 10 – Euphoria
  { id: "awesome", score: 10, emoji: "🤩", color: "#8B5CF6", label: "Großartig" },
  { id: "ecstatic", score: 10, emoji: "🎉", color: "#A855F7", label: "Ekstatisch" },
  // 9 – Very positive
  { id: "motivated", score: 9, emoji: "🔥", color: "#0EA5E9", label: "Motiviert" },
  { id: "proud", score: 9, emoji: "🥰", color: "#6366F1", label: "Stolz" },
  { id: "inspired", score: 9, emoji: "✨", color: "#818CF8", label: "Inspiriert" },
  { id: "loved", score: 9, emoji: "💕", color: "#EC4899", label: "Geliebt" },
  // 8 – Positive
  { id: "happy", score: 8, emoji: "😊", color: "#10B981", label: "Fröhlich" },
  { id: "grateful", score: 8, emoji: "🙏", color: "#22C55E", label: "Dankbar" },
  { id: "confident", score: 8, emoji: "💪", color: "#14B8A6", label: "Selbstbewusst" },
  { id: "playful", score: 8, emoji: "😜", color: "#F472B6", label: "Verspielt" },
  // 7 – Mildly positive
  { id: "content", score: 7, emoji: "🙂", color: "#4ADE80", label: "Zufrieden" },
  { id: "hopeful", score: 7, emoji: "🌱", color: "#34D399", label: "Hoffnungsvoll" },
  { id: "relieved", score: 7, emoji: "😮‍💨", color: "#6EE7B7", label: "Erleichtert" },
  // 6 – Calm / light
  { id: "calm", score: 6, emoji: "😌", color: "#A3E635", label: "Entspannt" },
  { id: "curious", score: 6, emoji: "🤔", color: "#84CC16", label: "Neugierig" },
  { id: "peaceful", score: 6, emoji: "🕊️", color: "#BEF264", label: "Friedlich" },
  // 5 – Neutral
  { id: "neutral", score: 5, emoji: "😐", color: "#9CA3AF", label: "Neutral" },
  { id: "bored", score: 5, emoji: "🥱", color: "#94A3B8", label: "Gelangweilt" },
  { id: "indifferent", score: 5, emoji: "🫤", color: "#A1A1AA", label: "Gleichgültig" },
  // 4 – Mildly negative
  { id: "stressed", score: 4, emoji: "🤯", color: "#FB923C", label: "Gestresst" },
  { id: "anxious", score: 4, emoji: "😰", color: "#FBBF24", label: "Ängstlich" },
  { id: "overwhelmed", score: 4, emoji: "😵‍💫", color: "#F59E0B", label: "Überfordert" },
  { id: "restless", score: 4, emoji: "😤", color: "#D97706", label: "Unruhig" },
  // 3 – Negative
  { id: "sad", score: 3, emoji: "😢", color: "#FB7185", label: "Traurig" },
  { id: "lonely", score: 3, emoji: "🥺", color: "#F9A8D4", label: "Einsam" },
  { id: "disappointed", score: 3, emoji: "😞", color: "#E879F9", label: "Enttäuscht" },
  { id: "guilty", score: 3, emoji: "😣", color: "#C084FC", label: "Schuldig" },
  // 2 – Very negative
  { id: "exhausted", score: 2, emoji: "😫", color: "#F87171", label: "Erschöpft" },
  { id: "angry", score: 2, emoji: "😡", color: "#F43F5E", label: "Wütend" },
  { id: "frustrated", score: 2, emoji: "🤬", color: "#E11D48", label: "Frustriert" },
  { id: "ashamed", score: 2, emoji: "😶", color: "#BE185D", label: "Beschämt" },
  // 1 – Crisis
  { id: "despair", score: 1, emoji: "😭", color: "#EF4444", label: "Verzweifelt" },
  { id: "numb", score: 1, emoji: "🫥", color: "#DC2626", label: "Taub/Leer" },
  { id: "hopeless", score: 1, emoji: "🖤", color: "#991B1B", label: "Hoffnungslos" },
];

const QUICK_TAGS = [
  "Erschöpft", "Ängstlich", "Ruhig", "Motiviert", "Traurig", "Dankbar",
  "Überfordert", "Fokussiert", "Einsam", "Hoffnungsvoll", "Energiegeladen",
  "Kreativ", "Genervt", "Verletzlich", "Nostalgisch",
];

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

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const slotDocId = `${profile.id}_${today}_${currentSlot}`;
        const snap = await getDoc(doc(db, "checkins", slotDocId));
        if (snap.exists()) {
          const data = snap.data();
          setAlreadyCompleted(true);
          const preset = EMOTION_PRESETS.find((e) => e.id === data.emotionId) ||
                         EMOTION_PRESETS.find((e) => e.score === data.mood);
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
        emotionId: activeEmotion.id,
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
        <div className="text-center max-w-md w-full animate-fade-in">
          <div className="w-28 h-28 rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center mx-auto mb-8 animate-bounce-in">
            <CheckCircle size={56} className="text-success" />
          </div>
          <h2 className="text-3xl font-black text-foreground mb-3">Check-in gespeichert! 🎉</h2>
          <p className="text-muted-foreground font-medium mb-10">
            Super gemacht — du hast heute wieder auf dich geachtet!
          </p>
          <button
            onClick={() => navigate("/checkins")}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mb-3 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <TrendingUp size={20} />
            Meine Auswertung
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 text-muted-foreground font-bold hover:text-foreground transition-colors"
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
        className="rounded-b-[2rem] px-5 pt-14 pb-8 transition-all duration-500 ease-out"
        style={{
          background: activeEmotion && !alreadyCompleted
            ? `linear-gradient(135deg, ${activeEmotion.color}E6, ${activeEmotion.color}99)`
            : "linear-gradient(135deg, hsl(var(--primary-dark)), hsl(var(--primary)))",
        }}
      >
        <div className="max-w-xl mx-auto animate-fade-in">
          <button
            onClick={() => navigate(-1)}
            className="text-white/80 hover:text-white font-bold text-sm bg-white/20 px-4 py-2 rounded-xl mb-5 inline-flex items-center gap-1 hover:bg-white/30 transition-all"
          >
            <ArrowLeft size={16} /> Zurück
          </button>
          <h1 className="text-white text-2xl sm:text-3xl font-black tracking-tight">
            {alreadyCompleted ? "✅ " : ""}Tägliches Check-in
          </h1>
          <p className="text-white/60 text-sm font-medium mt-1">
            {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          {activeEmotion && (
            <div className="mt-4 flex items-center gap-3 animate-fade-in">
              <span className="text-4xl animate-bounce-in">{activeEmotion.emoji}</span>
              <div>
                <p className="text-white font-black text-lg">{activeEmotion.label}</p>
                <p className="text-white/50 text-xs font-bold">{activeEmotion.score}/10</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-3 flex items-center gap-2 animate-shake">
            <AlertCircle size={16} className="text-destructive shrink-0" />
            <span className="text-destructive text-sm font-semibold">{error}</span>
          </div>
        )}

        {/* Mood Selection */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm animate-slide-up" style={{ animationDelay: "0ms" }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            Wie fühlst du dich jetzt gerade?
          </h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {EMOTION_PRESETS.map((preset, idx) => {
              const isSelected = selectedEmotionId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => !alreadyCompleted && setSelectedEmotionId(preset.id)}
                  className={`px-3 py-2 rounded-2xl flex items-center gap-1.5 font-bold text-sm transition-all duration-200 ${
                    isSelected
                      ? "scale-105 shadow-lg ring-2 ring-white/30"
                      : "hover:scale-[1.04] active:scale-95"
                  }`}
                  style={{
                    backgroundColor: isSelected ? preset.color : "hsl(var(--secondary))",
                    color: isSelected ? "#fff" : "hsl(var(--foreground))",
                    border: isSelected ? "none" : "1px solid hsl(var(--border))",
                    opacity: alreadyCompleted && !isSelected ? 0.3 : 1,
                    boxShadow: isSelected ? `0 6px 20px ${preset.color}50` : "none",
                    animationDelay: `${idx * 15}ms`,
                  }}
                >
                  <span className={`text-lg ${isSelected ? "animate-bounce-in" : ""}`}>{preset.emoji}</span>
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Energy */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm animate-slide-up" style={{ animationDelay: "80ms" }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            ⚡ Dein Energielevel (1-10)
          </h3>
          <div className="flex justify-between text-sm font-bold text-muted-foreground mb-3 px-1">
            <span>Erschöpft</span>
            <span
              className="text-2xl font-black transition-all duration-300"
              style={{ color: activeEmotion?.color || "hsl(var(--primary))" }}
            >
              {energy}
            </span>
            <span>Voller Energie</span>
          </div>
          <div className="relative h-10 flex items-center">
            <div className="absolute inset-y-0 left-0 right-0 flex items-center">
              <div className="w-full h-2 bg-muted rounded-full relative overflow-hidden">
                <div
                  className="absolute h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${((energy - 1) / 9) * 100}%`,
                    background: `linear-gradient(90deg, ${activeEmotion?.color || "hsl(var(--primary))"}88, ${activeEmotion?.color || "hsl(var(--primary))"})`,
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
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: energy === val ? 26 : 12,
                      height: energy === val ? 26 : 12,
                      backgroundColor: energy === val ? (activeEmotion?.color || "hsl(var(--primary))") : "transparent",
                      border: energy === val ? "3px solid white" : "2px solid hsl(var(--border))",
                      boxShadow: energy === val ? `0 4px 14px ${activeEmotion?.color || "hsl(var(--primary))"}60` : "none",
                      transform: energy === val ? "scale(1)" : "scale(0.9)",
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm animate-slide-up" style={{ animationDelay: "160ms" }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            🏷️ Was beschreibt dich gerade?
          </h3>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => {
              const isActive = tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                      : "bg-secondary text-foreground border border-border hover:border-primary/30 hover:scale-[1.03] active:scale-95"
                  }`}
                  style={{ opacity: alreadyCompleted && !isActive ? 0.3 : 1 }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Note */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm animate-slide-up" style={{ animationDelay: "240ms" }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            ✏️ Möchtest du noch etwas ergänzen?
          </h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Gedanken, Notizen..."
            rows={5}
            disabled={alreadyCompleted}
            className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-60"
          />
        </div>

        {/* Action */}
        {!alreadyCompleted ? (
          <button
            onClick={handleSave}
            disabled={saving || !selectedEmotionId}
            className="w-full py-4 rounded-2xl font-black text-lg transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] animate-slide-up"
            style={{
              animationDelay: "320ms",
              backgroundColor: selectedEmotionId ? (activeEmotion?.color || "hsl(var(--primary))") : "hsl(var(--muted))",
              color: selectedEmotionId ? "#fff" : "hsl(var(--muted-foreground))",
              boxShadow: selectedEmotionId ? `0 8px 24px ${activeEmotion?.color}40` : "none",
            }}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Speichern...
              </span>
            ) : (
              <>Check-in speichern <CheckCircle size={20} /></>
            )}
          </button>
        ) : (
          <div className="space-y-3 animate-slide-up" style={{ animationDelay: "320ms" }}>
            <div className="bg-success/10 border border-success/20 rounded-2xl py-4 flex items-center justify-center gap-2">
              <CheckCircle size={22} className="text-success" />
              <span className="text-success font-black text-lg">Bereits eingecheckt</span>
            </div>
            <button
              onClick={() => navigate("/checkins")}
              className="w-full py-4 rounded-2xl bg-card border border-border text-muted-foreground font-bold flex items-center justify-center gap-2 hover:bg-secondary hover:scale-[1.01] active:scale-[0.99] transition-all"
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

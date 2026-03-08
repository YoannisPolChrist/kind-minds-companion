import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, CheckCircle, TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem, HeaderOrbs,
  SuccessAnimation, FloatingEmoji,
} from "../components/motion";

const HEADER_IMAGES = [
  "/images/HomeUi1.webp", "/images/HomeUi2.webp", "/images/HomeUi3.webp",
  "/images/HomeUi4.webp", "/images/HomeUi5.webp", "/images/HomeUi6.webp",
];
const checkinHeaderImg = HEADER_IMAGES[Math.floor(Math.random() * HEADER_IMAGES.length)];

const EMOTION_PRESETS = [
  // 10 — Euphorie / Extase
  { id: "awesome", score: 10, emoji: "🤩", color: "#7C3AED", label: "Großartig" },
  { id: "ecstatic", score: 10, emoji: "🎉", color: "#8B5CF6", label: "Ekstatisch" },
  { id: "blissful", score: 10, emoji: "🌈", color: "#A78BFA", label: "Glückselig" },
  // 9 — Begeistert / Energiegeladen
  { id: "motivated", score: 9, emoji: "🔥", color: "#2563EB", label: "Motiviert" },
  { id: "proud", score: 9, emoji: "🥰", color: "#4F46E5", label: "Stolz" },
  { id: "inspired", score: 9, emoji: "✨", color: "#6366F1", label: "Inspiriert" },
  { id: "loved", score: 9, emoji: "💕", color: "#DB2777", label: "Geliebt" },
  { id: "passionate", score: 9, emoji: "💖", color: "#E11D48", label: "Leidenschaftlich" },
  // 8 — Fröhlich / Positiv
  { id: "happy", score: 8, emoji: "😊", color: "#059669", label: "Fröhlich" },
  { id: "grateful", score: 8, emoji: "🙏", color: "#10B981", label: "Dankbar" },
  { id: "confident", score: 8, emoji: "💪", color: "#0D9488", label: "Selbstbewusst" },
  { id: "playful", score: 8, emoji: "😜", color: "#EC4899", label: "Verspielt" },
  { id: "energized", score: 8, emoji: "⚡", color: "#0891B2", label: "Energiegeladen" },
  // 7 — Zufrieden / Warm
  { id: "content", score: 7, emoji: "🙂", color: "#16A34A", label: "Zufrieden" },
  { id: "hopeful", score: 7, emoji: "🌱", color: "#22C55E", label: "Hoffnungsvoll" },
  { id: "relieved", score: 7, emoji: "😮‍💨", color: "#34D399", label: "Erleichtert" },
  { id: "amused", score: 7, emoji: "😄", color: "#4ADE80", label: "Amüsiert" },
  // 6 — Ruhig / Ausgeglichen
  { id: "calm", score: 6, emoji: "😌", color: "#65A30D", label: "Entspannt" },
  { id: "curious", score: 6, emoji: "🤔", color: "#84CC16", label: "Neugierig" },
  { id: "peaceful", score: 6, emoji: "🕊️", color: "#A3E635", label: "Friedlich" },
  { id: "mindful", score: 6, emoji: "🧘", color: "#4D7C0F", label: "Achtsam" },
  // 5 — Neutral / Gleichgültig
  { id: "neutral", score: 5, emoji: "😐", color: "#9CA3AF", label: "Neutral" },
  { id: "bored", score: 5, emoji: "🥱", color: "#94A3B8", label: "Gelangweilt" },
  { id: "indifferent", score: 5, emoji: "🫤", color: "#78716C", label: "Gleichgültig" },
  { id: "distracted", score: 5, emoji: "🫠", color: "#A8A29E", label: "Abgelenkt" },
  // 4 — Angespannt / Unruhig
  { id: "stressed", score: 4, emoji: "🤯", color: "#EA580C", label: "Gestresst" },
  { id: "anxious", score: 4, emoji: "😰", color: "#D97706", label: "Ängstlich" },
  { id: "overwhelmed", score: 4, emoji: "😵‍💫", color: "#B45309", label: "Überfordert" },
  { id: "restless", score: 4, emoji: "😤", color: "#92400E", label: "Unruhig" },
  { id: "nervous", score: 4, emoji: "😬", color: "#A16207", label: "Nervös" },
  // 3 — Traurig / Niedergeschlagen
  { id: "sad", score: 3, emoji: "😢", color: "#BE123C", label: "Traurig" },
  { id: "lonely", score: 3, emoji: "🥺", color: "#9F1239", label: "Einsam" },
  { id: "disappointed", score: 3, emoji: "😞", color: "#881337", label: "Enttäuscht" },
  { id: "guilty", score: 3, emoji: "😣", color: "#7F1D1D", label: "Schuldig" },
  { id: "jealous", score: 3, emoji: "😒", color: "#6B21A8", label: "Eifersüchtig" },
  // 2 — Wütend / Erschöpft
  { id: "exhausted", score: 2, emoji: "😫", color: "#991B1B", label: "Erschöpft" },
  { id: "angry", score: 2, emoji: "😡", color: "#B91C1C", label: "Wütend" },
  { id: "frustrated", score: 2, emoji: "🤬", color: "#7F1D1D", label: "Frustriert" },
  { id: "ashamed", score: 2, emoji: "😶", color: "#6B1E1E", label: "Beschämt" },
  { id: "bitter", score: 2, emoji: "🫠", color: "#5C1414", label: "Verbittert" },
  // 1 — Verzweifelt / Hoffnungslos — sehr dunkle Töne
  { id: "despair", score: 1, emoji: "😭", color: "#450A0A", label: "Verzweifelt" },
  { id: "numb", score: 1, emoji: "🫥", color: "#3B0A0A", label: "Taub/Leer" },
  { id: "hopeless", score: 1, emoji: "🖤", color: "#1C1917", label: "Hoffnungslos" },
  { id: "broken", score: 1, emoji: "💀", color: "#0C0A09", label: "Am Boden" },
];


export default function Checkin() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedEmotionId, setSelectedEmotionId] = useState<string | null>(null);
  const [energy, setEnergy] = useState(50);
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

  const toggleTag = (label: string) => {
    if (alreadyCompleted) return;
    setTags((prev) => (prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]));
  };

  if (loadingCheck) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        <SuccessAnimation emoji="✅">
          <h2 className="text-3xl font-black text-foreground mb-3">Check-in gespeichert! 🎉</h2>
          <p className="text-muted-foreground font-medium mb-10">
            Super gemacht — du hast heute wieder auf dich geachtet!
          </p>
          <motion.button
            onClick={() => navigate("/checkins")}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <TrendingUp size={20} />
            Meine Auswertung
          </motion.button>
          <motion.button
            onClick={() => navigate("/")}
            className="w-full py-3 text-muted-foreground font-bold hover:text-foreground transition-colors mt-3"
            whileHover={{ scale: 1.02 }}
          >
            Zurück zur App
          </motion.button>
        </SuccessAnimation>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        className="rounded-b-[2rem] px-5 pt-14 pb-8 relative overflow-hidden"
        animate={{
          background: activeEmotion && !alreadyCompleted
            ? `linear-gradient(135deg, ${activeEmotion.color}E6, ${activeEmotion.color}99)`
            : "linear-gradient(135deg, hsl(190 38% 18%), hsl(190 38% 30%))",
        }}
        transition={{ duration: 0.5 }}
      >
        <img src={checkinHeaderImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-transparent pointer-events-none" />
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
          <h1 className="text-white text-2xl sm:text-3xl font-black tracking-tight">
            {alreadyCompleted ? "✅ " : ""}Tägliches Check-in
          </h1>
          <p className="text-white/60 text-sm font-medium mt-1">
            {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          {activeEmotion && (
            <motion.div
              className="mt-4 flex items-center gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={activeEmotion.id}
            >
              <motion.span
                className="text-4xl"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 8, stiffness: 150 }}
              >
                {activeEmotion.emoji}
              </motion.span>
              <div>
                <p className="text-white font-black text-lg">{activeEmotion.label}</p>
                <p className="text-white/50 text-xs font-bold">{activeEmotion.score}/10</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <StaggerContainer className="max-w-xl mx-auto px-5 py-6 space-y-5">
        {error && (
          <motion.div
            className="bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-3 flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
            transition={{ duration: 0.4 }}
          >
            <AlertCircle size={16} className="text-destructive shrink-0" />
            <span className="text-destructive text-sm font-semibold">{error}</span>
          </motion.div>
        )}

        {/* Mood Selection */}
        <StaggerItem>
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              Wie fühlst du dich jetzt gerade?
            </h3>
            <motion.div className="flex flex-wrap gap-2 justify-center" layout>
              {EMOTION_PRESETS.map((preset) => (
                <FloatingEmoji
                  key={preset.id}
                  emoji={preset.emoji}
                  label={preset.label}
                  color={preset.color}
                  selected={selectedEmotionId === preset.id}
                  onClick={() => setSelectedEmotionId(preset.id)}
                  disabled={alreadyCompleted}
                />
              ))}
            </motion.div>
          </div>
        </StaggerItem>

        {/* Energy */}
        <StaggerItem>
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              ⚡ Dein Energielevel
            </h3>
            <div className="flex items-center justify-center mb-4">
              <motion.span
                className="text-5xl font-black tabular-nums"
                key={energy}
                initial={{ scale: 1.3, y: -6 }}
                animate={{ scale: 1, y: 0 }}
                style={{ color: activeEmotion?.color || "hsl(var(--primary))" }}
              >
                {energy}
              </motion.span>
              <span className="text-lg font-bold text-muted-foreground ml-1">/100</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2 px-1">
              <span>😴 Erschöpft</span>
              <span>⚡ Voller Energie</span>
            </div>
            <div className="relative group">
              <div className="w-full h-3 bg-muted rounded-full relative overflow-hidden">
                <motion.div
                  className="absolute h-full rounded-full"
                  animate={{ width: `${energy}%` }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  style={{
                    background: `linear-gradient(90deg, #EF4444, #FBBF24, #10B981, #0EA5E9)`,
                  }}
                />
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={energy}
                onChange={(e) => !alreadyCompleted && setEnergy(Number(e.target.value))}
                disabled={alreadyCompleted}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
              />
              {/* Thumb indicator */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                animate={{ left: `${energy}%` }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                style={{ marginLeft: -12 }}
              >
                <div
                  className="w-6 h-6 rounded-full border-[3px] border-white shadow-lg"
                  style={{
                    backgroundColor: activeEmotion?.color || "hsl(var(--primary))",
                    boxShadow: `0 4px 14px ${activeEmotion?.color || "hsl(var(--primary))"}50`,
                  }}
                />
              </motion.div>
            </div>
            {/* Tick marks */}
            <div className="flex justify-between px-0.5 mt-2">
              {[0, 25, 50, 75, 100].map((tick) => (
                <button
                  key={tick}
                  onClick={() => !alreadyCompleted && setEnergy(tick || 1)}
                  className="text-[10px] font-bold text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  {tick}
                </button>
              ))}
            </div>
          </div>
        </StaggerItem>

        {/* Tags — emoji-only */}
        <StaggerItem>
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
              🏷️ Was beschreibt dich gerade?
            </h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_TAGS.map((tag) => {
                const isActive = tags.includes(tag.label);
                return (
                  <motion.button
                    key={tag.label}
                    onClick={() => toggleTag(tag.label)}
                    whileHover={{ scale: 1.15, y: -3 }}
                    whileTap={{ scale: 0.85 }}
                    className="relative group"
                    style={{ opacity: alreadyCompleted && !isActive ? 0.3 : 1 }}
                  >
                    <motion.div
                      animate={{
                        backgroundColor: isActive ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                        boxShadow: isActive ? "0 4px 16px hsl(var(--primary) / 0.3)" : "0 0 0 transparent",
                      }}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                        isActive ? "ring-2 ring-primary/30" : "border border-border"
                      }`}
                    >
                      {tag.emoji}
                    </motion.div>
                    {/* Tooltip on hover */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap bg-card px-2 py-0.5 rounded-lg border border-border shadow-sm">
                        {tag.label}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </StaggerItem>

        {/* Note */}
        <StaggerItem>
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
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
        </StaggerItem>

        {/* Action */}
        <StaggerItem>
          {!alreadyCompleted ? (
            <motion.button
              onClick={handleSave}
              disabled={saving || !selectedEmotionId}
              className="w-full py-4 rounded-2xl font-black text-lg disabled:opacity-40 flex items-center justify-center gap-2"
              whileHover={selectedEmotionId ? { scale: 1.02, y: -2 } : undefined}
              whileTap={selectedEmotionId ? { scale: 0.97 } : undefined}
              animate={{
                backgroundColor: selectedEmotionId ? (activeEmotion?.color || "hsl(190 38% 30%)") : "hsl(var(--muted))",
                color: selectedEmotionId ? "#fff" : "hsl(var(--muted-foreground))",
                boxShadow: selectedEmotionId ? `0 8px 24px ${activeEmotion?.color}40` : "none",
              }}
              transition={{ duration: 0.3 }}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <motion.span
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Speichern...
                </span>
              ) : (
                <>Check-in speichern <CheckCircle size={20} /></>
              )}
            </motion.button>
          ) : (
            <div className="space-y-3">
              <motion.div
                className="bg-success/10 border border-success/20 rounded-2xl py-4 flex items-center justify-center gap-2"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
              >
                <CheckCircle size={22} className="text-success" />
                <span className="text-success font-black text-lg">Bereits eingecheckt</span>
              </motion.div>
              <motion.button
                onClick={() => navigate("/checkins")}
                className="w-full py-4 rounded-2xl bg-card border border-border text-muted-foreground font-bold flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <TrendingUp size={18} /> Meine Auswertungen
              </motion.button>
            </div>
          )}
        </StaggerItem>

        <div className="h-8" />
      </StaggerContainer>
    </PageTransition>
  );
}

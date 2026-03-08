import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, CheckCircle } from "lucide-react";

interface ExerciseBlock {
  id: string;
  type: string;
  content?: string;
  options?: string[];
  minLabel?: string;
  maxLabel?: string;
  duration?: number;
}

interface ExerciseData {
  id: string;
  title: string;
  completed?: boolean;
  blocks?: ExerciseBlock[];
  answers?: Record<string, string>;
  themeColor?: string;
}

export default function Exercise() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<ExerciseData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile?.id || !id) return;
    const load = async () => {
      const snap = await getDoc(doc(db, "users", profile.id, "exercises", id));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as ExerciseData;
        setExercise(data);
        setAnswers(data.answers || {});
      }
      setLoading(false);
    };
    load();
  }, [profile?.id, id]);

  const updateAnswer = (blockId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [blockId]: value }));
  };

  const handleComplete = async () => {
    if (!profile?.id || !id || !exercise) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.id, "exercises", id), {
        completed: true,
        completedAt: new Date().toISOString(),
        lastCompletedAt: new Date().toISOString(),
        answers,
      });
      setSaved(true);
    } catch (e) {
      console.error("Error completing exercise:", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-bold text-foreground">Übung nicht gefunden.</p>
          <button onClick={() => navigate("/")} className="mt-4 text-primary font-bold">
            Zurück
          </button>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-28 h-28 rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center mx-auto mb-8">
            <CheckCircle size={56} className="text-success" />
          </div>
          <h2 className="text-3xl font-black text-foreground mb-3">Super! 🎉</h2>
          <p className="text-text-subtle font-medium mb-10">Du hast die Übung erfolgreich abgeschlossen.</p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-lg shadow-primary/20"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  const themeColor = exercise.themeColor || "#137386";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="rounded-b-[2rem] px-5 pt-14 pb-8"
        style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="text-white/80 hover:text-white font-bold text-sm bg-white/20 px-4 py-2 rounded-xl mb-5 inline-flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Zurück
        </button>
        <h1 className="text-white text-2xl font-black tracking-tight">{exercise.title}</h1>
        <p className="text-white/60 text-sm font-medium mt-1">
          {exercise.blocks?.length || 0} Module
          {exercise.completed && " · ✅ Bereits abgeschlossen"}
        </p>
      </div>

      <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
        {(exercise.blocks || []).map((block, idx) => (
          <div key={block.id} className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {idx + 1}
              </div>
              <span className="text-xs font-bold text-text-subtle uppercase tracking-wider">
                {block.type}
              </span>
            </div>

            {block.content && (
              <p className="text-foreground font-medium mb-4 leading-relaxed">{block.content}</p>
            )}

            {/* Reflection / Text block */}
            {(block.type === "text" || block.type === "reflection") && (
              <textarea
                value={answers[block.id] || ""}
                onChange={(e) => updateAnswer(block.id, e.target.value)}
                placeholder="Deine Reflektion..."
                rows={4}
                disabled={exercise.completed}
                className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
            )}

            {/* Scale block */}
            {block.type === "scale" && (
              <div>
                <div className="flex justify-between text-sm font-semibold text-text-subtle mb-3">
                  <span>{block.minLabel || "Gar nicht"}</span>
                  <span className="text-xl font-black text-primary">{answers[block.id] || "5"}</span>
                  <span>{block.maxLabel || "Sehr stark"}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={answers[block.id] || "5"}
                  onChange={(e) => updateAnswer(block.id, e.target.value)}
                  disabled={exercise.completed}
                  className="w-full accent-primary"
                />
              </div>
            )}

            {/* Choice block */}
            {block.type === "choice" && block.options && (
              <div className="space-y-2">
                {block.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => !exercise.completed && updateAnswer(block.id, opt)}
                    className={`w-full text-left px-4 py-3 rounded-2xl font-medium transition-all ${
                      answers[block.id] === opt
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground border border-border hover:border-primary/30"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Checklist block */}
            {block.type === "checklist" && block.options && (
              <div className="space-y-2">
                {block.options.map((opt) => {
                  let checked: string[] = [];
                  try { checked = JSON.parse(answers[block.id] || "[]"); } catch {}
                  const isChecked = checked.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        if (exercise.completed) return;
                        const updated = isChecked ? checked.filter((c) => c !== opt) : [...checked, opt];
                        updateAnswer(block.id, JSON.stringify(updated));
                      }}
                      className={`w-full text-left px-4 py-3 rounded-2xl font-medium flex items-center gap-3 transition-all ${
                        isChecked
                          ? "bg-success/10 border border-success/30 text-foreground"
                          : "bg-secondary border border-border text-foreground"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs ${
                        isChecked ? "border-success bg-success text-white" : "border-border"
                      }`}>
                        {isChecked && "✓"}
                      </div>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Info block */}
            {block.type === "info" && (
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                <p className="text-foreground font-medium text-sm leading-relaxed">ℹ️ Information</p>
              </div>
            )}
          </div>
        ))}

        {/* Complete button */}
        {!exercise.completed && (
          <button
            onClick={handleComplete}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg disabled:opacity-50 shadow-lg shadow-primary/20 transition-all hover:opacity-90"
          >
            {saving ? "Speichern..." : "Übung abschließen ✓"}
          </button>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}

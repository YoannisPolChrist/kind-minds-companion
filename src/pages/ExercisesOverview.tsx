import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, BookOpen, CheckCircle } from "lucide-react";

interface Exercise {
  id: string;
  title: string;
  completed?: boolean;
  blocks?: any[];
  recurrence?: string;
  themeColor?: string;
  completedAt?: string;
  lastCompletedAt?: string;
}

export default function ExercisesOverview() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        // Try global exercises collection
        const globalSnap = await getDocs(
          query(collection(db, "exercises"), where("clientId", "==", profile.id))
        );
        let exs = globalSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise));

        if (exs.length === 0) {
          const userSnap = await getDocs(query(collection(db, "users", profile.id, "exercises")));
          exs = userSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise));
        }

        setExercises(exs);
      } catch (e) {
        console.error("Error fetching exercises:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const open = useMemo(() => exercises.filter((e) => !e.completed), [exercises]);
  const completed = useMemo(() => exercises.filter((e) => e.completed), [exercises]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold mb-5"
          >
            <ArrowLeft size={16} />
            Zurück
          </button>
          <h1 className="text-3xl font-black tracking-tight">Meine Übungen</h1>
          <p className="text-white/60 text-sm font-semibold mt-1">
            {exercises.length} Übungen · {completed.length} erledigt
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        {exercises.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={48} className="text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-black text-foreground mb-2">Noch keine Übungen</h2>
            <p className="text-muted-foreground">Sobald dein Therapeut dir Übungen zuweist, erscheinen sie hier.</p>
          </div>
        ) : (
          <>
            {open.length > 0 && (
              <section>
                <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                  <BookOpen size={20} className="text-primary" />
                  Offen ({open.length})
                </h2>
                <div className="space-y-3">
                  {open.map((ex) => (
                    <Link
                      key={ex.id}
                      to={`/exercise/${ex.id}`}
                      className="block bg-card rounded-2xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                          style={{ backgroundColor: (ex.themeColor || "#137386") + "20" }}
                        >
                          📋
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground truncate">{ex.title}</h3>
                          <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                            {ex.blocks?.length || 0} Module
                            {ex.recurrence === "daily" && " · 🔁 Täglich"}
                            {ex.recurrence === "weekly" && " · 🔁 Wöchentlich"}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-primary group-hover:translate-x-0.5 transition-transform">Start →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle size={20} className="text-success" />
                  Erledigt ({completed.length})
                </h2>
                <div className="space-y-3">
                  {completed.map((ex) => (
                    <Link
                      key={ex.id}
                      to={`/exercise/${ex.id}`}
                      className="block bg-card rounded-2xl border border-border p-4 opacity-75 hover:opacity-100 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle size={18} className="text-success shrink-0" />
                        <span className="font-semibold text-foreground truncate">{ex.title}</span>
                        {ex.lastCompletedAt && (
                          <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(ex.lastCompletedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, Activity, Edit3, FileText, Calendar, BookOpen,
  CheckCircle, Users,
} from "lucide-react";
import { motion } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, TiltCard,
} from "../../components/motion";

export default function TherapistClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nextAppointment, setNextAppointment] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);

  // Stats
  const [exerciseCount, setExerciseCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [checkinCount, setCheckinCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const cSnap = await getDoc(doc(db, "users", id));
        if (cSnap.exists()) {
          const cData = { id: cSnap.id, ...cSnap.data() };
          setClient(cData);
          if ((cData as any).nextAppointment) setNextAppointment((cData as any).nextAppointment);
        }

        const [exSnap, ciSnap] = await Promise.all([
          getDocs(query(collection(db, "exercises"), where("clientId", "==", id))),
          getDocs(query(collection(db, "checkins"), where("uid", "==", id))),
        ]);
        setExerciseCount(exSnap.size);
        setCompletedCount(exSnap.docs.filter((d) => d.data().completed).length);
        setCheckinCount(ciSnap.size);
      } catch (e) {
        console.error("Error loading client:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSaveAppointment = async () => {
    if (!id) return;
    setSavingAppointment(true);
    try {
      await updateDoc(doc(db, "users", id), { nextAppointment: nextAppointment.trim() });
    } catch (e) {
      console.error("Failed to save appointment", e);
    } finally {
      setSavingAppointment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  const navCards = [
    { path: `/therapist/client/${id}/exercises`, icon: Activity, label: "Übungen", desc: "Zuweisen & Auswerten", color: "#F97316", bg: "bg-orange-50" },
    { path: `/therapist/client/${id}/notes`, icon: Edit3, label: "Session Notes", desc: "Verwalte Notizen", color: "#3B82F6", bg: "bg-blue-50" },
    { path: `/therapist/client/${id}/files`, icon: FileText, label: "Dateien", desc: "Hinterlegte Dokumente", color: "#C09D59", bg: "bg-amber-50" },
    { path: `/therapist/client/${id}/checkins`, icon: Activity, label: "Check-ins", desc: "Stimmungs-Tagebuch", color: "#10B981", bg: "bg-emerald-50" },
  ];

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        <HeaderOrbs />
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-8 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <motion.button
              onClick={() => navigate("/therapist")}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold"
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={16} /> Zurück
            </motion.button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-lg font-black">
                {client?.firstName?.charAt(0)}{client?.lastName?.charAt(0)}
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {client?.firstName} {client?.lastName}
              </h1>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Übungen", value: exerciseCount, sub: `${completedCount} erledigt` },
              { label: "Check-ins", value: checkinCount },
              { label: "Fortschritt", value: exerciseCount > 0 ? `${Math.round((completedCount / exerciseCount) * 100)}%` : "—" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                className="bg-white/10 rounded-2xl p-3 text-center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-[10px] font-bold text-white/50 uppercase">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <StaggerContainer className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Title */}
        <StaggerItem>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Patienten-Akte</h2>
        </StaggerItem>

        {/* Navigation Cards */}
        <StaggerItem>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {navCards.map(({ path, icon: Icon, label, desc, color, bg }) => (
              <TiltCard
                key={path}
                className="bg-card rounded-3xl border border-border p-6 shadow-sm cursor-pointer text-center"
                onClick={() => navigate(path)}
                maxTilt={5}
              >
                <div className={`w-16 h-16 ${bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Icon size={28} style={{ color }} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">{label}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </TiltCard>
            ))}
          </div>
        </StaggerItem>

        {/* Next Appointment */}
        <StaggerItem>
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center">
                <Calendar size={24} className="text-pink-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Nächster Termin</h3>
                <p className="text-sm text-muted-foreground">Wird dem Klienten auf dem Dashboard angezeigt</p>
              </div>
            </div>
            <div className="flex gap-3">
              <input
                type="datetime-local"
                value={nextAppointment}
                onChange={(e) => setNextAppointment(e.target.value)}
                className="flex-1 bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <motion.button
                onClick={handleSaveAppointment}
                disabled={savingAppointment}
                className="bg-primary text-primary-foreground px-6 py-3.5 rounded-2xl font-bold disabled:opacity-50"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {savingAppointment ? "..." : "Speichern"}
              </motion.button>
            </div>
          </div>
        </StaggerItem>

        <div className="h-8" />
      </StaggerContainer>
    </PageTransition>
  );
}

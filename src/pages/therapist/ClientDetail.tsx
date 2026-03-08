import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, Activity, Edit3, FileText, Calendar, BookOpen,
  CheckCircle, Users, Clock, ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, TiltCard,
} from "../../components/motion";

const HEADER_IMAGES = [
  "/images/nature-header-1.webp", "/images/nature-header-2.webp",
  "/images/nature-header-3.webp", "/images/nature-header-4.webp",
];
const headerImg = HEADER_IMAGES[Math.floor(Math.random() * HEADER_IMAGES.length)];

// ─── Custom Calendar ──────────────────────────────────────────────────────────

function MiniCalendar({ selected, onSelect }: { selected: Date | null; onSelect: (d: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(() => selected || new Date());

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday start

  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  const isSelected = (d: number) => selected && selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === d;
  const isPast = (d: number) => {
    const date = new Date(year, month, d);
    date.setHours(23, 59, 59);
    return date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const prev = () => setViewMonth(new Date(year, month - 1, 1));
  const next = () => setViewMonth(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-card rounded-3xl border border-border p-5 shadow-sm">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <motion.button onClick={prev} className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center hover:bg-muted transition-colors" whileTap={{ scale: 0.9 }}>
          <ChevronLeft size={18} className="text-foreground" />
        </motion.button>
        <h4 className="text-base font-black text-foreground">{monthNames[month]} {year}</h4>
        <motion.button onClick={next} className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center hover:bg-muted transition-colors" whileTap={{ scale: 0.9 }}>
          <ChevronRight size={18} className="text-foreground" />
        </motion.button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[11px] font-bold text-muted-foreground uppercase py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const past = isPast(day);
          const sel = isSelected(day);
          const tod = isToday(day);
          return (
            <motion.button
              key={day}
              onClick={() => {
                if (!past) {
                  const newDate = new Date(year, month, day);
                  if (selected) {
                    newDate.setHours(selected.getHours(), selected.getMinutes());
                  }
                  onSelect(newDate);
                }
              }}
              disabled={past}
              className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                sel
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : tod
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : past
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-foreground hover:bg-secondary"
              }`}
              whileTap={!past ? { scale: 0.85 } : undefined}
            >
              {day}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Time Picker ──────────────────────────────────────────────────────────────

function TimePicker({ value, onChange }: { value: { h: number; m: number }; onChange: (v: { h: number; m: number }) => void }) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00
  const minutes = [0, 15, 30, 45];

  return (
    <div className="bg-card rounded-3xl border border-border p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Clock size={20} className="text-primary" />
        </div>
        <h4 className="text-base font-black text-foreground">Uhrzeit</h4>
      </div>

      <div className="flex gap-4">
        {/* Hours */}
        <div className="flex-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Stunde</p>
          <div className="grid grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
            {hours.map(h => (
              <motion.button
                key={h}
                onClick={() => onChange({ ...value, h })}
                className={`py-2 rounded-xl text-sm font-bold transition-all ${
                  value.h === h
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-foreground hover:bg-muted border border-border"
                }`}
                whileTap={{ scale: 0.9 }}
              >
                {String(h).padStart(2, "0")}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Minutes */}
        <div className="w-24">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Minute</p>
          <div className="space-y-1.5">
            {minutes.map(m => (
              <motion.button
                key={m}
                onClick={() => onChange({ ...value, m })}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                  value.m === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-foreground hover:bg-muted border border-border"
                }`}
                whileTap={{ scale: 0.9 }}
              >
                :{String(m).padStart(2, "0")}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 bg-secondary rounded-2xl border border-border p-3 text-center">
        <p className="text-2xl font-black text-foreground">
          {String(value.h).padStart(2, "0")}:{String(value.m).padStart(2, "0")}
        </p>
        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Uhr</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TherapistClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState({ h: 10, m: 0 });
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
          if ((cData as any).nextAppointment) {
            const d = new Date((cData as any).nextAppointment);
            if (!isNaN(d.getTime())) {
              setSelectedDate(d);
              setSelectedTime({ h: d.getHours(), m: d.getMinutes() });
            }
          }
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
    if (!id || !selectedDate) return;
    setSavingAppointment(true);
    try {
      const d = new Date(selectedDate);
      d.setHours(selectedTime.h, selectedTime.m, 0, 0);
      await updateDoc(doc(db, "users", id), { nextAppointment: d.toISOString() });
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

  const appointmentFormatted = selectedDate
    ? `${selectedDate.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })} um ${String(selectedTime.h).padStart(2, "0")}:${String(selectedTime.m).padStart(2, "0")} Uhr`
    : null;

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-soft-light" />
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
              <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center">
                <Calendar size={24} className="text-pink-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Nächster Termin</h3>
                <p className="text-sm text-muted-foreground">Wird dem Klienten auf dem Dashboard angezeigt</p>
              </div>
            </div>

            {/* Selected appointment preview */}
            {appointmentFormatted && (
              <motion.div
                className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-5 flex items-center gap-3"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Calendar size={20} className="text-primary shrink-0" />
                <p className="text-sm font-bold text-foreground">{appointmentFormatted}</p>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />
              <TimePicker value={selectedTime} onChange={setSelectedTime} />
            </div>

            <motion.button
              onClick={handleSaveAppointment}
              disabled={savingAppointment || !selectedDate}
              className="w-full mt-5 bg-primary text-primary-foreground py-4 rounded-2xl font-black text-lg disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {savingAppointment ? (
                <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
              ) : (
                <><Calendar size={18} /> Termin speichern</>
              )}
            </motion.button>
          </div>
        </StaggerItem>

        <div className="h-8" />
      </StaggerContainer>
    </PageTransition>
  );
}

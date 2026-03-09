import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, Activity, Edit3, FileText, Calendar,
  CheckCircle, Clock, ChevronLeft, ChevronRight, Trash2, ArrowRight,
} from "lucide-react";
import { motion } from "motion/react";
import { PageTransition } from "../../components/motion";
import { Toast } from "../../components/ui/Toast";

// ─── Mini Calendar ─────────────────────────────────────────

function MiniCalendar({ selected, onSelect }: { selected: Date | null; onSelect: (d: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(() => selected || new Date());
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  const isSelected = (d: number) => selected && selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === d;
  const isPast = (d: number) => { const date = new Date(year, month, d); date.setHours(23, 59, 59); return date < new Date(today.getFullYear(), today.getMonth(), today.getDate()); };
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center hover:bg-muted"><ChevronLeft size={16} /></button>
        <h4 className="text-sm font-black text-foreground">{monthNames[month]} {year}</h4>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center hover:bg-muted"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map(d => <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const past = isPast(day); const sel = isSelected(day); const tod = isToday(day);
          return (
            <button key={day} onClick={() => { if (!past) { const nd = new Date(year, month, day); if (selected) nd.setHours(selected.getHours(), selected.getMinutes()); onSelect(nd); }}} disabled={past}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all ${sel ? "bg-foreground text-background" : tod ? "bg-primary/10 text-primary" : past ? "text-muted-foreground/30" : "text-foreground hover:bg-secondary"}`}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Time Picker ───────────────────────────────────────────

function TimePicker({ value, onChange }: { value: { h: number; m: number }; onChange: (v: { h: number; m: number }) => void }) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  const minutes = [0, 15, 30, 45];
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={16} className="text-muted-foreground" />
        <h4 className="text-sm font-black text-foreground">Uhrzeit</h4>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Stunde</p>
          <div className="grid grid-cols-4 gap-1 max-h-[140px] overflow-y-auto">
            {hours.map(h => (
              <button key={h} onClick={() => onChange({ ...value, h })} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${value.h === h ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-muted border border-border"}`}>{String(h).padStart(2, "0")}</button>
            ))}
          </div>
        </div>
        <div className="w-20">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Minute</p>
          <div className="space-y-1">
            {minutes.map(m => (
              <button key={m} onClick={() => onChange({ ...value, m })} className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${value.m === m ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-muted border border-border"}`}>:{String(m).padStart(2, "0")}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 bg-secondary rounded-lg border border-border p-2.5 text-center">
        <p className="text-xl font-black text-foreground">{String(value.h).padStart(2, "0")}:{String(value.m).padStart(2, "0")}</p>
        <p className="text-[10px] text-muted-foreground font-medium">Uhr</p>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────

export default function TherapistClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState({ h: 10, m: 0 });
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: "success" | "error" }>({ visible: false, message: "", type: "success" });
  const [clientLang, setClientLang] = useState<string>("de");
  const [savingLang, setSavingLang] = useState(false);
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
          setClientLang((cData as any).language || "de");
          if ((cData as any).nextAppointment) {
            const d = new Date((cData as any).nextAppointment);
            if (!isNaN(d.getTime())) { setSelectedDate(d); setSelectedTime({ h: d.getHours(), m: d.getMinutes() }); }
          }
        }
        const [exSnap, ciSnap] = await Promise.all([
          getDocs(query(collection(db, "exercises"), where("clientId", "==", id))),
          getDocs(query(collection(db, "checkins"), where("uid", "==", id))),
        ]);
        setExerciseCount(exSnap.size);
        setCompletedCount(exSnap.docs.filter((d) => d.data().completed).length);
        setCheckinCount(ciSnap.size);
      } catch (e) { console.error("Error loading client:", e); } finally { setLoading(false); }
    })();
  }, [id]);

  const handleSaveAppointment = async () => {
    if (!id || !selectedDate) return;
    setSavingAppointment(true);
    try {
      const d = new Date(selectedDate);
      d.setHours(selectedTime.h, selectedTime.m, 0, 0);
      await updateDoc(doc(db, "users", id), { nextAppointment: d.toISOString() });
      const dateStr = d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      const timeStr = `${String(selectedTime.h).padStart(2, "0")}:${String(selectedTime.m).padStart(2, "0")}`;
      await addDoc(collection(db, "notifications"), { userId: id, type: "appointment_saved", title: "Neuer Termin 📅", body: `${dateStr} um ${timeStr} Uhr`, status: "pending", createdAt: new Date().toISOString() });
      setToast({ visible: true, message: "Termin gespeichert!", subMessage: `${dateStr} um ${timeStr} Uhr`, type: "success" });
    } catch { setToast({ visible: true, message: "Fehler", subMessage: "Termin konnte nicht gespeichert werden.", type: "error" }); } finally { setSavingAppointment(false); }
  };

  const handleDeleteClient = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      const collections = ["exercises", "checkins", "client_notes", "client_files", "client_resources"];
      const fieldMap: Record<string, string> = { exercises: "clientId", checkins: "uid", client_notes: "clientId", client_files: "clientId", client_resources: "clientId" };
      for (const col of collections) {
        try { const snap = await getDocs(query(collection(db, col), where(fieldMap[col] || "clientId", "==", id))); await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, col, d.id)))); } catch {}
      }
      await deleteDoc(doc(db, "users", id));
      navigate("/therapist");
    } catch { setDeleting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="w-8 h-8 border-3 border-foreground border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  const navCards = [
    { path: `/therapist/client/${id}/exercises`, icon: Activity, label: "Übungen", desc: "Zuweisen & Auswerten" },
    { path: `/therapist/client/${id}/notes`, icon: Edit3, label: "Session Notes", desc: "Notizen verwalten" },
    { path: `/therapist/client/${id}/files`, icon: FileText, label: "Dateien", desc: "Dokumente hinterlegen" },
    { path: `/therapist/client/${id}/checkins`, icon: Activity, label: "Check-ins", desc: "Stimmungs-Tagebuch" },
  ];

  const appointmentFormatted = selectedDate
    ? `${selectedDate.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })} um ${String(selectedTime.h).padStart(2, "0")}:${String(selectedTime.m).padStart(2, "0")} Uhr`
    : null;

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Minimal Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <motion.button onClick={() => navigate("/therapist/clients")} className="text-muted-foreground hover:text-foreground text-sm font-bold mb-5 inline-flex items-center gap-1 transition-colors" whileHover={{ x: -3 }}>
            <ArrowLeft size={16} /> Klienten
          </motion.button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-foreground/5 border border-border flex items-center justify-center text-lg font-black text-foreground">
              {client?.firstName?.charAt(0)}{client?.lastName?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground tracking-tight">{client?.firstName} {client?.lastName}</h1>
              <p className="text-sm text-muted-foreground">{client?.email}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-6 mt-5">
            {[
              { label: "Übungen", value: exerciseCount },
              { label: "Erledigt", value: completedCount },
              { label: "Check-ins", value: checkinCount },
              { label: "Fortschritt", value: exerciseCount > 0 ? `${Math.round((completedCount / exerciseCount) * 100)}%` : "—" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-lg font-black text-foreground">{s.value}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Navigation Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {navCards.map(({ path, icon: Icon, label, desc }) => (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              className="bg-card rounded-xl border border-border p-4 text-left hover:border-foreground/15 transition-colors group"
              whileHover={{ y: -2 }}
            >
              <Icon size={20} className="text-muted-foreground group-hover:text-foreground transition-colors mb-3" />
              <h3 className="text-sm font-black text-foreground mb-0.5">{label}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
              <ArrowRight size={12} className="text-muted-foreground mt-2 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          ))}
        </div>

        {/* Language */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-base">🌐</span>
            <h3 className="text-sm font-black text-foreground">Sprache</h3>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { code: "de", label: "DE", flag: "🇩🇪" }, { code: "en", label: "EN", flag: "🇬🇧" },
              { code: "fr", label: "FR", flag: "🇫🇷" }, { code: "es", label: "ES", flag: "🇪🇸" },
              { code: "it", label: "IT", flag: "🇮🇹" }, { code: "tr", label: "TR", flag: "🇹🇷" },
              { code: "ar", label: "AR", flag: "🇸🇦" },
            ].map(lang => (
              <button key={lang.code} onClick={async () => {
                if (!id || clientLang === lang.code) return;
                setSavingLang(true);
                try { await updateDoc(doc(db, "users", id), { language: lang.code }); setClientLang(lang.code); setToast({ visible: true, message: `Sprache: ${lang.label}`, type: "success" }); }
                catch { setToast({ visible: true, message: "Fehler", type: "error" }); }
                finally { setSavingLang(false); }
              }} disabled={savingLang}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${clientLang === lang.code ? "bg-foreground text-background" : "bg-secondary border border-border text-foreground hover:bg-muted"}`}>
                {lang.flag} {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Appointment */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-4">
            <Calendar size={18} className="text-muted-foreground" />
            <h3 className="text-sm font-black text-foreground">Nächster Termin</h3>
          </div>

          {appointmentFormatted && (
            <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 mb-4 flex items-center gap-2">
              <Calendar size={14} className="text-primary shrink-0" />
              <p className="text-sm font-bold text-foreground">{appointmentFormatted}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />
            <TimePicker value={selectedTime} onChange={setSelectedTime} />
          </div>

          <motion.button onClick={handleSaveAppointment} disabled={savingAppointment || !selectedDate} className="w-full mt-4 bg-foreground text-background py-3 rounded-lg font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2" whileTap={{ scale: 0.97 }}>
            {savingAppointment ? <motion.span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <><Calendar size={14} /> Termin speichern</>}
          </motion.button>
        </div>

        {/* Delete */}
        <div className="bg-card rounded-xl border border-destructive/15 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Trash2 size={16} className="text-destructive" />
            <h3 className="text-sm font-black text-foreground">Klient löschen</h3>
          </div>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-2.5 rounded-lg border border-destructive/25 text-destructive font-bold text-sm hover:bg-destructive/5 transition-colors">
              Klient dauerhaft löschen
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-destructive font-semibold">⚠️ Alle Daten von {client?.firstName} {client?.lastName} werden unwiderruflich gelöscht.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-lg bg-secondary border border-border text-foreground font-bold text-sm">Abbrechen</button>
                <button onClick={handleDeleteClient} disabled={deleting} className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-1.5">
                  {deleting ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full inline-block animate-spin" /> : <><Trash2 size={13} /> Löschen</>}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>

      <Toast visible={toast.visible} message={toast.message} subMessage={toast.subMessage} type={toast.type} onDone={() => setToast(prev => ({ ...prev, visible: false }))} />
    </PageTransition>
  );
}

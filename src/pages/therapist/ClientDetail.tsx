import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  FileText,
  Languages,
  Sparkles,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { buildCalendarLinks } from "../../../modules/scheduling/calendarLinks";
import { buildNotificationDocumentData, formatAppointmentNotificationLabel } from "../../../modules/notifications/utils";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { syncGoogleCalendarAppointment } from "../../lib/calendarConnect";
import { db } from "../../lib/firebaseDb";
import { PageTransition } from "../../components/motion";
import TherapistHeroHeader from "../../components/therapist/TherapistHeroHeader";
import { Toast } from "../../components/ui/Toast";

function MiniCalendar({ selected, onSelect }: { selected: Date | null; onSelect: (date: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(() => selected || new Date());
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const today = new Date();
  const cells: (number | null)[] = [];

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  const isSelected = (day: number) =>
    Boolean(
      selected &&
        selected.getFullYear() === year &&
        selected.getMonth() === month &&
        selected.getDate() === day
    );
  const isPast = (day: number) => {
    const date = new Date(year, month, day);
    date.setHours(23, 59, 59);
    return date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  for (let index = 0; index < offset; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  return (
    <div className="rounded-[1.75rem] border border-border bg-background/80 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary hover:bg-muted"
        >
          <ChevronLeft size={16} />
        </button>
        <h4 className="text-center text-base font-black text-foreground">
          {monthNames[month]} {year}
        </h4>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary hover:bg-muted"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2">
        {dayNames.map((day) => (
          <div key={day} className="py-1 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} className="h-11 sm:h-12" />;

          const selectedDay = isSelected(day);
          const todayDay = isToday(day);
          const pastDay = isPast(day);

          return (
            <button
              type="button"
              key={day}
              onClick={() => {
                if (pastDay) return;
                const nextDate = new Date(year, month, day);
                if (selected) {
                  nextDate.setHours(selected.getHours(), selected.getMinutes());
                }
                onSelect(nextDate);
              }}
              disabled={pastDay}
              className={`flex h-11 w-full items-center justify-center rounded-2xl text-sm font-bold shadow-sm transition-all sm:h-12 ${
                selectedDay
                  ? "bg-foreground text-background shadow-foreground/30"
                  : todayDay
                    ? "bg-primary/15 text-primary"
                    : pastDay
                      ? "cursor-not-allowed text-muted-foreground/40"
                      : "border border-border/60 bg-secondary/60 text-foreground hover:bg-muted"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimePicker({
  value,
  onChange,
}: {
  value: { h: number; m: number };
  onChange: (value: { h: number; m: number }) => void;
}) {
  const hours = Array.from({ length: 14 }, (_, index) => index + 7);
  const minutes = [0, 15, 30, 45];

  return (
    <div className="rounded-[1.75rem] border border-border bg-background/80 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Clock size={16} className="text-muted-foreground" />
        <h4 className="text-sm font-black text-foreground">Uhrzeit</h4>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_164px]">
        <div className="flex-1">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stunde</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {hours.map((hour) => (
              <button
                type="button"
                key={hour}
                onClick={() => onChange({ ...value, h: hour })}
                className={`inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-2 py-2 text-center text-sm font-bold leading-none transition-all ${
                  value.h === hour
                    ? "bg-foreground text-background"
                    : "border border-border bg-secondary text-foreground hover:bg-muted"
                }`}
              >
                {String(hour).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Minute</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
            {minutes.map((minute) => (
              <button
                type="button"
                key={minute}
                onClick={() => onChange({ ...value, m: minute })}
                className={`inline-flex w-full items-center justify-center rounded-2xl py-3 text-center text-sm font-bold leading-none transition-all ${
                  value.m === minute
                    ? "bg-foreground text-background"
                    : "border border-border bg-secondary text-foreground hover:bg-muted"
                }`}
              >
                :{String(minute).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-border bg-secondary p-4 text-center">
        <p className="text-3xl font-black text-foreground">
          {String(value.h).padStart(2, "0")}:{String(value.m).padStart(2, "0")}
        </p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">Uhr</p>
      </div>
    </div>
  );
}

export default function TherapistClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState({ h: 10, m: 0 });
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    subMessage?: string;
    type: "success" | "error";
  }>({ visible: false, message: "", type: "success" });
  const [clientLang, setClientLang] = useState<string>("de");
  const [exerciseCount, setExerciseCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [checkinCount, setCheckinCount] = useState(0);

  useEffect(() => {
    if (!id) return;

    void (async () => {
      try {
        const clientSnapshot = await getDoc(doc(db, "users", id));

        if (clientSnapshot.exists()) {
          const clientData = { id: clientSnapshot.id, ...clientSnapshot.data() };
          setClient(clientData);
          setClientLang((clientData as any).preferences?.language || (clientData as any).language || "de");

          if ((clientData as any).nextAppointment) {
            const date = new Date((clientData as any).nextAppointment);
            if (!Number.isNaN(date.getTime())) {
              setSelectedDate(date);
              setSelectedTime({ h: date.getHours(), m: date.getMinutes() });
            }
          }
        }

        const [exerciseSnapshot, checkinSnapshot] = await Promise.all([
          getDocs(query(collection(db, "exercises"), where("clientId", "==", id))),
          getDocs(query(collection(db, "checkins"), where("uid", "==", id))),
        ]);

        setExerciseCount(exerciseSnapshot.size);
        setCompletedCount(exerciseSnapshot.docs.filter((entry) => entry.data().completed).length);
        setCheckinCount(checkinSnapshot.size);
      } catch (error) {
        console.error("Error loading client:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const appointmentFormatted = selectedDate
              ? `${selectedDate.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })} um ${String(selectedTime.h).padStart(2, "0")}:${String(selectedTime.m).padStart(2, "0")} Uhr`
    : null;

  const appointmentDetails = useMemo(() => {
    if (!id || !selectedDate) return null;

    const start = new Date(selectedDate);
    start.setHours(selectedTime.h, selectedTime.m, 0, 0);

    return {
      id: `therapist-${profile?.id || "therapist"}-client-${id}`,
      title: `Therapietermin mit ${client?.firstName || "Klient"}`,
      description: `Termin für ${client?.firstName || ""} ${client?.lastName || ""}`.trim(),
      startDate: start,
      endDate: new Date(start.getTime() + 45 * 60000),
    };
  }, [client?.firstName, client?.lastName, id, profile?.id, selectedDate, selectedTime.h, selectedTime.m]);

  const appointmentLinks = useMemo(
    () => (appointmentDetails ? buildCalendarLinks(appointmentDetails) : []),
    [appointmentDetails]
  );

  const handleSaveAppointment = async () => {
    if (!id || !selectedDate) return;

    setSavingAppointment(true);

    try {
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(selectedTime.h, selectedTime.m, 0, 0);

      await updateDoc(doc(db, "users", id), { nextAppointment: appointmentDate.toISOString() });

      await addDoc(
        collection(db, "notifications"),
        buildNotificationDocumentData({
          userId: id,
          type: "appointment_saved",
          appointmentLabel: formatAppointmentNotificationLabel(appointmentDate),
          createdAt: new Date().toISOString(),
        })
      );

      if (profile?.calendarConnectionSummary?.google?.status === "connected") {
        await syncGoogleCalendarAppointment({
          id: `therapist-${profile.id}-client-${id}`,
          title: `Therapietermin mit ${client?.firstName || "Klient"}`,
          description: `Termin für ${client?.firstName || ""} ${client?.lastName || ""}`.trim(),
          startAt: appointmentDate.toISOString(),
          endAt: new Date(appointmentDate.getTime() + 45 * 60000).toISOString(),
        });
      }

      setToast({
        visible: true,
        message: "Termin gespeichert!",
            subMessage: `${appointmentDate.toLocaleDateString(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })} um ${String(selectedTime.h).padStart(2, "0")}:${String(selectedTime.m).padStart(2, "0")} Uhr${
          profile?.calendarConnectionSummary?.google?.status === "connected" ? " · Google Sync aktualisiert" : ""
        }`,
        type: "success",
      });
    } catch {
      setToast({
        visible: true,
        message: "Fehler",
        subMessage: "Termin konnte nicht gespeichert werden.",
        type: "error",
      });
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!id) return;

    setDeleting(true);

    try {
      const collectionsToDelete = ["exercises", "checkins", "client_notes", "client_files", "client_resources"];
      const fieldMap: Record<string, string> = {
        exercises: "clientId",
        checkins: "uid",
        client_notes: "clientId",
        client_files: "clientId",
        client_resources: "clientId",
      };

      for (const collectionName of collectionsToDelete) {
        try {
          const snapshot = await getDocs(
            query(collection(db, collectionName), where(fieldMap[collectionName] || "clientId", "==", id))
          );
          await Promise.all(snapshot.docs.map((entry) => deleteDoc(doc(db, collectionName, entry.id))));
        } catch {
          // ignore partial cleanup errors and continue with user deletion
        }
      }

      await deleteDoc(doc(db, "users", id));
      navigate("/therapist");
    } catch {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          className="h-8 w-8 rounded-full border-[3px] border-foreground border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  const completionRate = exerciseCount > 0 ? `${Math.round((completedCount / exerciseCount) * 100)}%` : "Noch offen";
  const clientName = `${client?.firstName || "Klient"} ${client?.lastName || ""}`.trim();
  const clientInitials = `${client?.firstName?.charAt(0) || ""}${client?.lastName?.charAt(0) || ""}` || "KM";
  const heroMetrics = [
    { label: "Übungen", value: String(exerciseCount) },
    { label: "Check-ins", value: String(checkinCount) },
    { label: "Fortschritt", value: completionRate },
    { label: "Sprache", value: clientLang.toUpperCase() },
  ];
  const workspaceCards = [
    {
      path: `/therapist/client/${id}/checkins`,
      icon: Activity,
      title: "Check-ins",
      description: "Stimmungen, Energie und Notizen des Klienten auf einen Blick.",
      stat: `${checkinCount} Einträge`,
      accentClassName: "bg-primary/10 text-primary",
    },
    {
      path: `/therapist/client/${id}/exercises`,
      icon: Activity,
      title: "Übungen",
      description: "Aufgaben zuweisen, Fortschritt prüfen und Verlauf strukturieren.",
      stat: `${exerciseCount} gesamt`,
      accentClassName: "bg-accent/15 text-foreground",
    },
    {
      path: `/therapist/client/${id}/notes`,
      icon: Edit3,
      title: "Session Notes",
      description: "Therapiesitzungen dokumentieren und Gesprächsnotizen ordnen.",
      stat: "Arbeitsbereich",
      accentClassName: "bg-success/10 text-success",
    },
    {
      path: `/therapist/client/${id}/files`,
      icon: FileText,
      title: "Dateien",
      description: "Dokumente, Materialien und Exportlinks zentral bereithalten.",
      stat: "Bibliothek",
      accentClassName: "bg-secondary text-foreground",
    },
  ];

  return (
    <PageTransition className="min-h-screen bg-background">
      <TherapistHeroHeader maxWidthClassName="max-w-6xl" imageIndex={1}>
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr] xl:items-end">
          <div className="max-w-3xl">
            <motion.button
              onClick={() => navigate("/therapist/clients")}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary-foreground/15 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-primary-foreground/25"
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={16} /> Klienten
            </motion.button>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/12 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-primary-foreground">
              <Sparkles size={14} />
              Klientendashboard
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-primary-foreground/14 text-2xl font-black text-primary-foreground shadow-xl shadow-primary-dark/15">
                {clientInitials}
              </div>
            <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-tight text-primary-foreground">
                  {clientName}
                </h1>
                <p className="mt-1 truncate text-sm font-medium text-primary-foreground/70 sm:text-base">
                  {client?.email}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {heroMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[1.25rem] border border-primary-foreground/15 bg-primary-foreground/10 px-4 py-3 backdrop-blur-sm"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary-foreground/60">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-xl font-black text-primary-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate(`/therapist/client/${id}/checkins`)}
              className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-primary-foreground px-5 py-4 text-sm font-black text-primary shadow-xl shadow-primary-dark/20 transition-transform hover:-translate-y-0.5"
            >
              <Activity size={18} />
              Check-ins öffnen
            </button>
            <button
              type="button"
              onClick={() => navigate(`/therapist/client/${id}/exercises`)}
              className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] border border-primary-foreground/30 bg-primary-foreground/10 px-5 py-4 text-sm font-black text-primary-foreground transition-colors hover:bg-primary-foreground/20"
            >
              <FileText size={18} />
              Übungen öffnen
            </button>
          </div>
        </div>
      </TherapistHeroHeader>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {workspaceCards.map(({ path, icon: Icon, title, description, stat, accentClassName }) => (
                <motion.button
                  key={path}
                  onClick={() => navigate(path)}
                  className="group flex h-full flex-col rounded-[2rem] border border-border bg-card p-6 text-left shadow-sm transition-colors hover:border-foreground/10"
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className={`mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${accentClassName}`}>
                    <Icon size={14} />
                    {stat}
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">{title}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                  <div className="mt-auto flex items-center gap-2 pt-8 text-sm font-bold text-foreground">
                    Arbeitsbereich öffnen
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Sprache und Kontext
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                    Sprache des Klienten
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Die Sprache steuert, wie Inhalte und Hinweise für diesen Klienten vorbereitet werden.
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Languages size={22} />
                </div>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-bold text-primary">
                <Languages size={16} />
                Aktuell: {clientLang.toUpperCase()}
              </div>

              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Therapeuten koennen diese Einstellung nicht mehr direkt ueberschreiben. Die Sprachwahl ist jetzt an das jeweilige Nutzerkonto gebunden.
              </p>
            </div>

            <div className="rounded-[2rem] border border-destructive/15 bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Verwaltung
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                    Klient löschen
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Entfernt den Klienten mitsamt verknüpften Einträgen aus deinem Bereich.
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <Trash2 size={22} />
                </div>
              </div>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-6 inline-flex rounded-2xl border border-destructive/25 px-5 py-3 text-sm font-bold text-destructive transition-colors hover:bg-destructive/5"
                >
                  Klient dauerhaft löschen
                </button>
              ) : (
                <div className="mt-6 space-y-4 rounded-[1.5rem] border border-destructive/15 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold leading-6 text-destructive">
                    Alle Daten von {clientName} werden unwiderruflich gelöscht.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="inline-flex rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-bold text-foreground"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleDeleteClient}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 rounded-2xl bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground disabled:opacity-40"
                    >
                      {deleting ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Löschen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="xl:sticky xl:top-24">
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Terminplanung
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                    Nächster Termin
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Lege Datum und Uhrzeit fest und teile den Termin direkt weiter.
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CalendarClock size={22} />
                </div>
              </div>

              {appointmentFormatted ? (
                <div className="mt-6 rounded-[1.5rem] border border-primary/15 bg-primary/5 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Aktueller Termin
                  </p>
                  <div className="mt-3 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Calendar size={18} />
                    </div>
                    <p className="text-sm font-bold leading-6 text-foreground">{appointmentFormatted}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[1.5rem] border border-dashed border-border bg-secondary/50 p-4 text-sm leading-6 text-muted-foreground">
                  Noch kein Termin eingetragen. Wähle unten einen passenden Slot für den Klienten.
                </div>
              )}

              <div className="mt-6 space-y-4">
                <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />
                <TimePicker value={selectedTime} onChange={setSelectedTime} />
              </div>

              <motion.button
                onClick={handleSaveAppointment}
                disabled={savingAppointment || !selectedDate}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-foreground px-5 py-4 text-sm font-black text-background shadow-lg disabled:opacity-40"
                whileTap={{ scale: 0.97 }}
              >
                {savingAppointment ? (
                  <motion.span
                    className="inline-block h-4 w-4 rounded-full border-2 border-background border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  <Calendar size={16} />
                )}
                Termin speichern
              </motion.button>

              {appointmentLinks.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {appointmentLinks.map((link) => (
                    <a
                      key={link.provider}
                      href={link.url}
                      target={link.provider === "google" ? "_blank" : undefined}
                      rel={link.provider === "google" ? "noopener noreferrer" : undefined}
                      download={link.provider === "icloud" ? "therapietermin.ics" : undefined}
                      className="inline-flex items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-3 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                    >
                      <Calendar size={12} />
                      {link.provider === "google" ? "Google Link" : "ICS Export"}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <Toast
        visible={toast.visible}
        message={toast.message}
        subMessage={toast.subMessage}
        type={toast.type}
        onDone={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </PageTransition>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore/lite";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock3,
  Edit3,
  FileText,
  HeartPulse,
  Layers,
  Play,
  Settings,
  Target,
} from "lucide-react";
import { motion } from "motion/react";
import { dbLite } from "../lib/firebaseDbLite";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { translate } from "../lib/webLocale";
import { PageTransition, PressableScale } from "../components/motion";
import { SkeletonCard, SkeletonMetrics } from "../components/ui/Skeleton";
import TriangulumBackdrop from "../components/ui/TriangulumBackdrop";
import { getRandomHeaderImage } from "../constants/headerImages";

interface Exercise {
  id: string;
  title: string;
  completed?: boolean;
  completedAt?: string;
  blocks?: Array<unknown>;
  recurrence?: string;
  themeColor?: string;
  coverImage?: string;
}

interface Checkin {
  id: string;
  mood: number;
  energy?: number;
  date: string;
  note?: string;
  createdAt?: string;
}

function formatAppointment(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ExerciseCard({
  exercise,
  locale,
  onClick,
}: {
  exercise: Exercise;
  locale: string;
  onClick: () => void;
}) {
  const themeColor = exercise.themeColor || "hsl(var(--primary))";
  const blockCount = exercise.blocks?.length ?? 0;
  const estimatedMinutes = Math.max(blockCount * 3, 8);

  return (
    <PressableScale onClick={onClick}>
      <motion.div
        className="group h-full overflow-hidden rounded-[2rem] border bg-card shadow-sm"
        style={{ borderColor: `${themeColor}24` }}
        whileHover={{ y: -4 }}
      >
        <div className="h-1.5" style={{ backgroundColor: themeColor }} />
        <div className="flex h-full flex-col p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl border"
              style={{ backgroundColor: `${themeColor}12`, borderColor: `${themeColor}26`, color: themeColor }}
            >
              <Target size={20} />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              <Layers size={11} />
              {blockCount} {translate(locale, { de: "Module", en: "Modules", es: "Modulos", fr: "Modules", it: "Moduli" })}
            </div>
          </div>

          <h3 className="text-lg font-black tracking-tight text-foreground">{exercise.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {exercise.recurrence === "daily"
              ? translate(locale, {
                  de: "Tägliche Begleitung",
                  en: "Daily support",
                  es: "Acompanamiento diario",
                  fr: "Accompagnement quotidien",
                  it: "Supporto quotidiano",
                })
              : exercise.recurrence === "weekly"
                ? translate(locale, {
                    de: "Wöchentlicher Fokus",
                    en: "Weekly focus",
                    es: "Enfoque semanal",
                    fr: "Focus hebdomadaire",
                    it: "Focus settimanale",
                  })
                : translate(locale, {
                    de: "Starte, wenn du bereit bist",
                    en: "Start whenever you are ready",
                    es: "Empieza cuando estés listo",
                    fr: "Commence quand tu es prêt",
                    it: "Inizia quando sei pronto",
                  })}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground">
              <Clock3 size={12} />
              {estimatedMinutes} Min
            </span>
            {exercise.completed && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-bold text-success">
                <CheckCircle2 size={12} />
                {translate(locale, {
                  de: "Erledigt",
                  en: "Done",
                  es: "Hecho",
                  fr: "Terminé",
                  it: "Completato",
                })}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between pt-6 text-sm font-black">
            <span style={{ color: themeColor }}>
              {exercise.completed
                ? translate(locale, {
                    de: "Erneut öffnen",
                    en: "Open again",
                    es: "Abrir de nuevo",
                    fr: "Ouvrir à nouveau",
                    it: "Apri di nuovo",
                  })
                : translate(locale, {
                    de: "Jetzt starten",
                    en: "Start now",
                    es: "Empezar ahora",
                    fr: "Commencer",
                    it: "Inizia ora",
                  })}
            </span>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg"
              style={{ backgroundColor: themeColor }}
            >
              <Play size={15} className="ml-0.5" fill="currentColor" />
            </div>
          </div>
        </div>
      </motion.div>
    </PressableScale>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  accent,
  onClick,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <PressableScale onClick={onClick}>
      <motion.div
        className="flex h-full flex-col rounded-[2rem] border border-border bg-card p-6 shadow-sm"
        style={{ background: `linear-gradient(180deg, ${accent}12, rgba(255,255,255,0.92))` }}
        whileHover={{ y: -4 }}
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] border"
            style={{ backgroundColor: `${accent}12`, borderColor: `${accent}20`, color: accent }}
          >
            <Icon size={24} />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background">
            <ArrowRight size={16} />
          </div>
        </div>
        <p className="text-lg font-black tracking-tight text-foreground">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </motion.div>
    </PressableScale>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checkedInMorning, setCheckedInMorning] = useState(false);
  const [checkedInEvening, setCheckedInEvening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [nextAppointment, setNextAppointment] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const currentHour = new Date().getHours();
  const isMorningSlot = currentHour < 12;

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);

      try {
        const globalExerciseSnapshot = await getDocs(
          query(collection(dbLite, "exercises"), where("clientId", "==", profile.id))
        );
        let loadedExercises = globalExerciseSnapshot.docs.map(
          (snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Exercise
        );

        if (loadedExercises.length === 0) {
          const nestedExerciseSnapshot = await getDocs(
            query(collection(dbLite, "users", profile.id, "exercises"))
          );
          loadedExercises = nestedExerciseSnapshot.docs.map(
            (snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Exercise
          );
        }

        setExercises(loadedExercises);

        const checkinSnapshot = await getDocs(
          query(collection(dbLite, "checkins"), where("uid", "==", profile.id))
        );
        const loadedCheckins = checkinSnapshot.docs.map(
          (snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Checkin
        );
        loadedCheckins.sort(
          (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
        );
        setCheckins(loadedCheckins.slice(0, 7));

        const morningDocId = `${profile.id}_${today}_morning`;
        const eveningDocId = `${profile.id}_${today}_evening`;
        const [morningSnapshot, eveningSnapshot] = await Promise.all([
          getDoc(doc(dbLite, "checkins", morningDocId)),
          getDoc(doc(dbLite, "checkins", eveningDocId)),
        ]);
        setCheckedInMorning(morningSnapshot.exists());
        setCheckedInEvening(eveningSnapshot.exists());

        if (profile.therapistId) {
          const therapistSnapshot = await getDoc(doc(dbLite, "users", profile.therapistId));
          if (therapistSnapshot.exists()) {
            const therapistData = therapistSnapshot.data();
            if (therapistData.bookingUrl) {
              setBookingUrl(therapistData.bookingUrl);
            }
          }
        }

        if (profile.nextAppointment) {
          setNextAppointment(profile.nextAppointment);
        }
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [profile?.id, profile?.therapistId, profile?.nextAppointment, today]);

  const openExercises = useMemo(() => exercises.filter((exercise) => !exercise.completed), [exercises]);
  const completedExercises = useMemo(
    () => exercises.filter((exercise) => exercise.completed),
    [exercises]
  );
  const latestCheckin = checkins[0];
  const currentSlotCompleted = isMorningSlot ? checkedInMorning : checkedInEvening;
  const currentSlotLabel = isMorningSlot
    ? translate(locale, { de: "Morgen", en: "Morning", es: "Manana", fr: "Matin", it: "Mattina" })
    : translate(locale, { de: "Abend", en: "Evening", es: "Noche", fr: "Soir", it: "Sera" });
  const randomBg = useMemo(() => getRandomHeaderImage(), []);
  const completionRate = exercises.length > 0 ? Math.round((completedExercises.length / exercises.length) * 100) : 0;
  const text = useMemo(() => ({
    settings: translate(locale, { de: "Einstellungen", en: "Settings", es: "Ajustes", fr: "Parametres", it: "Impostazioni" }),
    greeting: translate(locale, { de: "Hi", en: "Hi", es: "Hola", fr: "Salut", it: "Ciao" }),
    doneSuffix: translate(locale, { de: "Check-in erledigt", en: "check-in done", es: "check-in hecho", fr: "check-in termine", it: "check-in completato" }),
    openSuffix: translate(locale, { de: "Check-in offen", en: "check-in open", es: "check-in pendiente", fr: "check-in ouvert", it: "check-in aperto" }),
    openTaskOne: translate(locale, { de: "offene Aufgabe", en: "open task", es: "tarea abierta", fr: "tache ouverte", it: "attivita aperta" }),
    openTaskMany: translate(locale, { de: "offene Aufgaben", en: "open tasks", es: "tareas abiertas", fr: "taches ouvertes", it: "attivita aperte" }),
    progress: translate(locale, { de: "Fortschritt", en: "Progress", es: "Progreso", fr: "Progres", it: "Progresso" }),
    journal: translate(locale, { de: "Zum Tagebuch", en: "Open journal", es: "Abrir diario", fr: "Ouvrir le journal", it: "Apri diario" }),
    exercises: translate(locale, { de: "Aufgaben", en: "Exercises", es: "Ejercicios", fr: "Exercices", it: "Esercizi" }),
    dailyCheckin: translate(locale, { de: "Taeglicher Check-in", en: "Daily check-in", es: "Check-in diario", fr: "Check-in quotidien", it: "Check-in quotidiano" }),
    slotDone: translate(locale, { de: "ist erledigt", en: "is done", es: "esta hecho", fr: "est termine", it: "e completato" }),
    slotWaiting: translate(locale, { de: "wartet auf dich", en: "is waiting for you", es: "te espera", fr: "t'attend", it: "ti aspetta" }),
    checkinSavedBody: translate(locale, {
      de: "Dein Check-in ist gespeichert. Im Tagebuch kannst du Verlauf und Notizen weiterfuehren.",
      en: "Your check-in is saved. You can continue with notes and your timeline in the journal.",
      es: "Tu check-in ya esta guardado. Puedes seguir con notas e historial en el diario.",
      fr: "Ton check-in est enregistre. Tu peux poursuivre avec notes et historique dans le journal.",
      it: "Il tuo check-in e salvato. Puoi continuare con note e cronologia nel diario.",
    }),
    checkinPromptBody: translate(locale, {
      de: "Ein kurzer Eintrag zu Stimmung, Energie und Notiz reicht aus, um deinen heutigen Verlauf sauber zu starten.",
      en: "A short note on mood, energy, and context is enough to start today's timeline clearly.",
      es: "Una breve nota sobre estado de animo, energia y contexto basta para empezar bien el dia.",
      fr: "Une courte note sur l'humeur, l'energie et le contexte suffit pour bien lancer la journee.",
      it: "Una breve nota su umore, energia e contesto basta per iniziare bene la giornata.",
    }),
    activeSlot: translate(locale, { de: "Aktiver Slot", en: "Active slot", es: "Bloque activo", fr: "Creneau actif", it: "Fascia attiva" }),
    historyAvailable: translate(locale, { de: "Verlauf vorhanden", en: "History available", es: "Historial disponible", fr: "Historique disponible", it: "Storico disponibile" }),
    historyEmpty: translate(locale, { de: "Noch keine Historie", en: "No history yet", es: "Sin historial aun", fr: "Pas encore d'historique", it: "Nessuno storico ancora" }),
    appointments: translate(locale, { de: "Termine und Kalender", en: "Appointments and calendar", es: "Citas y calendario", fr: "Rendez-vous et calendrier", it: "Appuntamenti e calendario" }),
    nextAppointment: translate(locale, { de: "Naechster Termin", en: "Next appointment", es: "Proxima cita", fr: "Prochain rendez-vous", it: "Prossimo appuntamento" }),
    noAppointment: translate(locale, { de: "Noch kein Termin sichtbar", en: "No appointment yet", es: "Aun no hay cita", fr: "Aucun rendez-vous pour l'instant", it: "Nessun appuntamento ancora" }),
    manageAppointment: translate(locale, { de: "Termin verwalten", en: "Manage appointment", es: "Gestionar cita", fr: "Gerer le rendez-vous", it: "Gestisci appuntamento" }),
    connectCalendar: translate(locale, { de: "Kalender verbinden", en: "Connect calendar", es: "Conectar calendario", fr: "Connecter le calendrier", it: "Collega calendario" }),
    appointmentHint: translate(locale, {
      de: "Wenn noch kein Termin hinterlegt ist, kannst du in den Einstellungen deinen Kalender verbinden oder den naechsten Termin mit deinem Coach abstimmen.",
      en: "If no appointment is saved yet, connect your calendar in settings or coordinate the next session with your coach.",
      es: "Si aun no hay una cita guardada, conecta tu calendario en ajustes o coordina la proxima sesion con tu coach.",
      fr: "Si aucun rendez-vous n'est encore enregistre, connecte ton calendrier dans les parametres ou planifie le prochain rendez-vous avec ton coach.",
      it: "Se non c'e ancora un appuntamento salvato, collega il calendario nelle impostazioni o pianifica la prossima sessione con il coach.",
    }),
    openExercises: translate(locale, { de: "Offene Aufgaben", en: "Open exercises", es: "Ejercicios abiertos", fr: "Exercices ouverts", it: "Esercizi aperti" }),
    openExercisesBody: translate(locale, {
      de: "Deine naechsten Uebungen fuer heute und die kommenden Tage.",
      en: "Your next exercises for today and the days ahead.",
      es: "Tus proximos ejercicios para hoy y los siguientes dias.",
      fr: "Tes prochains exercices pour aujourd'hui et les jours a venir.",
      it: "I tuoi prossimi esercizi per oggi e i prossimi giorni.",
    }),
    myExercises: translate(locale, { de: "Meine Uebungen", en: "My exercises", es: "Mis ejercicios", fr: "Mes exercices", it: "I miei esercizi" }),
    myExercisesBody: translate(locale, {
      de: "Offene und erledigte Aufgaben in einer klaren Uebersicht.",
      en: "Open and completed exercises in one clear overview.",
      es: "Ejercicios abiertos y completados en una vista clara.",
      fr: "Exercices ouverts et termines dans une vue claire.",
      it: "Esercizi aperti e completati in una vista chiara.",
    }),
    library: translate(locale, { de: "Bibliothek", en: "Library", es: "Biblioteca", fr: "Bibliotheque", it: "Libreria" }),
    libraryBody: translate(locale, {
      de: "Dateien, Links und Materialien von deinem Coach.",
      en: "Files, links, and materials from your coach.",
      es: "Archivos, enlaces y materiales de tu coach.",
      fr: "Fichiers, liens et supports de ton coach.",
      it: "File, link e materiali del tuo coach.",
    }),
    history: translate(locale, { de: "Verlauf", en: "History", es: "Historial", fr: "Historique", it: "Storico" }),
    historyBody: translate(locale, {
      de: "Check-ins, Trends und bisherige Eintraege ansehen.",
      en: "Review check-ins, trends, and past entries.",
      es: "Revisa check-ins, tendencias y entradas anteriores.",
      fr: "Consulte check-ins, tendances et entrees precedentes.",
      it: "Rivedi check-in, tendenze ed entrate precedenti.",
    }),
    notes: translate(locale, { de: "Notizen", en: "Notes", es: "Notas", fr: "Notes", it: "Note" }),
    notesBody: translate(locale, {
      de: "Gedanken, Beobachtungen und wichtige Momente festhalten.",
      en: "Capture thoughts, observations, and important moments.",
      es: "Guarda pensamientos, observaciones y momentos importantes.",
      fr: "Garde pensees, observations et moments importants.",
      it: "Conserva pensieri, osservazioni e momenti importanti.",
    }),
    noExercises: translate(locale, { de: "Keine Aufgaben vorhanden", en: "No exercises yet", es: "Aun no hay ejercicios", fr: "Pas encore d'exercices", it: "Nessun esercizio ancora" }),
  }), [locale]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-10">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="h-10 w-56 animate-pulse rounded-lg bg-secondary" />
            <div className="mt-4 h-4 w-80 animate-pulse rounded bg-secondary" />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <SkeletonCard />
            <SkeletonMetrics />
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-6">
        <section
          data-tour-id="dashboard-home"
          className="relative overflow-hidden rounded-[2.5rem] shadow-xl shadow-primary/15"
        >
          <img
            src={randomBg}
            alt=""
            className="absolute inset-0 h-full w-full object-cover brightness-110"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/60 via-cyan-900/20 to-slate-900/60 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/25 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_35%)] opacity-60 mix-blend-screen" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-10" />
          <TriangulumBackdrop />

          <div className="relative z-10 mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
            <motion.div
              className="rounded-[2rem] border border-white/20 bg-white/72 p-5 shadow-2xl shadow-slate-950/10 backdrop-blur-xl sm:p-6 lg:p-7"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            >
              <div>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <img
                    src="/images/logo-transparent.png"
                    alt="Kind Minds"
                    className="h-12 object-contain sm:h-16"
                  />
                  <button
                    type="button"
                    onClick={() => navigate("/settings")}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-[1.1rem] border border-black/5 bg-black/[0.04] text-foreground transition-colors hover:bg-black/[0.08]"
                    aria-label={text.settings}
                  >
                    <Settings size={18} />
                  </button>
                </div>

                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  {text.greeting} {profile?.firstName || ""}
                </h1>
                <p className="mt-3 text-sm font-semibold text-muted-foreground sm:text-base">
                  {`${currentSlotLabel} ${currentSlotCompleted ? text.doneSuffix : text.openSuffix} - ${openExercises.length} ${openExercises.length === 1 ? text.openTaskOne : text.openTaskMany}`}
                </p>

                {exercises.length > 0 && (
                  <div className="mt-6 max-w-xl">
                    <div className="mb-2 flex items-center justify-between text-sm font-bold text-foreground">
                      <span>{text.progress}</span>
                      <span>{completedExercises.length} / {exercises.length}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-black/10">
                      <motion.div
                        className="h-full rounded-full bg-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${completionRate}%` }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(currentSlotCompleted ? "/checkins" : "/checkin")}
                    className="inline-flex items-center gap-2 rounded-[1.25rem] bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20"
                  >
                    <HeartPulse size={18} />
                    {currentSlotCompleted ? text.journal : `${currentSlotLabel} Check-in`}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/exercises")}
                    className="inline-flex items-center gap-2 rounded-[1.25rem] border border-border bg-white/80 px-4 py-3 text-sm font-black text-foreground transition-colors hover:bg-white"
                  >
                    <Target size={18} />
                    {text.exercises}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <PressableScale onClick={() => navigate("/checkin")}>
            <motion.div
              data-tour-id="dashboard-checkin"
              className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-sm ${
                currentSlotCompleted
                  ? "border-success/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(255,255,255,0.96))]"
                  : "border-primary/20 bg-[linear-gradient(180deg,rgba(17,141,255,0.12),rgba(255,255,255,0.96))]"
              }`}
              whileHover={{ y: -4 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
                    {text.dailyCheckin}
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
                    {currentSlotCompleted ? `${currentSlotLabel} ${text.slotDone}` : `${currentSlotLabel} ${text.slotWaiting}`}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                    {currentSlotCompleted ? text.checkinSavedBody : text.checkinPromptBody}
                  </p>
                </div>
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-[1.4rem] ${
                    currentSlotCompleted ? "bg-success/12 text-success" : "bg-primary/12 text-primary"
                  }`}
                >
                  {currentSlotCompleted ? <CheckCircle2 size={26} /> : <HeartPulse size={26} />}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-2 text-sm font-bold text-foreground shadow-sm">
                  <Clock3 size={14} className="text-muted-foreground" />
                  {text.activeSlot}: {currentSlotLabel}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-2 text-sm font-bold text-foreground shadow-sm">
                  <BarChart3 size={14} className="text-muted-foreground" />
                  {latestCheckin ? text.historyAvailable : text.historyEmpty}
                </span>
              </div>
            </motion.div>
          </PressableScale>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
                  {text.appointments}
                </p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
                  {nextAppointment ? text.nextAppointment : text.noAppointment}
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-pink-100 text-pink-600">
                <Calendar size={22} />
              </div>
            </div>

            {nextAppointment ? (
              <>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {formatAppointment(nextAppointment, locale)}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {bookingUrl ? (
                    <a
                      href={bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-[1.15rem] bg-pink-600 px-4 py-3 text-sm font-black text-white"
                    >
                      {text.manageAppointment}
                      <ArrowRight size={16} />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate("/settings")}
                      className="inline-flex items-center gap-2 rounded-[1.15rem] border border-border bg-secondary px-4 py-3 text-sm font-black text-foreground"
                    >
                      {text.connectCalendar}
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-border bg-secondary/50 p-4 text-sm leading-6 text-muted-foreground">
                {text.appointmentHint}
              </div>
            )}
          </div>
        </section>

        {openExercises.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Target size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">{text.openExercises}</h2>
                <p className="text-sm text-muted-foreground">
                  {text.openExercisesBody}
                </p>
              </div>
              <span className="ml-auto rounded-full bg-accent/10 px-3 py-1 text-sm font-black text-accent">
                {openExercises.length}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {openExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  locale={locale}
                  onClick={() => navigate(`/exercise/${exercise.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FeatureCard
            icon={BookOpen}
            title={text.myExercises}
            description={text.myExercisesBody}
            accent="#1E7A8A"
            onClick={() => navigate("/exercises")}
          />
          <FeatureCard
            icon={FileText}
            title={text.library}
            description={text.libraryBody}
            accent="#8A6D1E"
            onClick={() => navigate("/resources")}
          />
          <FeatureCard
            icon={BarChart3}
            title={text.history}
            description={text.historyBody}
            accent="#C08A2E"
            onClick={() => navigate("/history")}
          />
          <FeatureCard
            icon={Edit3}
            title={text.notes}
            description={text.notesBody}
            accent="#285E61"
            onClick={() => navigate("/notes")}
          />
        </section>

        {exercises.length === 0 && (
          <motion.div
            className="mt-8 rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-secondary text-muted-foreground">
              <FileText size={28} />
            </div>
            <p className="text-lg font-black text-foreground">{text.noExercises}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Sobald dein Therapeut dir eine Übung zuweist, erscheint sie direkt in deinem
              Workspace.
            </p>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import type { UserProfile } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { translate } from "../../lib/webLocale";

type ClientOnboardingStepId =
  | "dashboard-home"
  | "dashboard-checkin"
  | "checkin-form"
  | "notes-editor"
  | "resources-main"
  | "resources-finish";

type BeforeShowAction = "open-notes-editor";

interface ClientOnboardingStep {
  id: ClientOnboardingStepId;
  route: string;
  targetId?: string;
  title: string;
  body: string;
  beforeShow?: BeforeShowAction;
  requiresReady?: boolean;
}

interface ClientOnboardingContextValue {
  active: boolean;
  currentStep: ClientOnboardingStep | null;
  currentStepId: ClientOnboardingStepId | null;
  currentStepIndex: number;
  totalSteps: number;
  isFinishing: boolean;
  completionError: string;
  isCurrentStep: (stepId: ClientOnboardingStepId) => boolean;
  markReady: (stepId: ClientOnboardingStepId) => void;
  next: () => Promise<void>;
  back: () => void;
}

interface ClientOnboardingProviderProps {
  children: React.ReactNode;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

interface HighlightFrame {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
}

function getClientOnboardingSteps(locale: string): ClientOnboardingStep[] {
  return [
    {
      id: "dashboard-home",
      route: "/",
      targetId: "dashboard-home",
      title: translate(locale, {
        de: "Willkommen in deiner Startseite",
        en: "Welcome to your home screen",
        es: "Bienvenido a tu pantalla principal",
        fr: "Bienvenue sur ton écran d'accueil",
        it: "Benvenuto nella tua schermata iniziale",
      }),
      body: translate(locale, {
        de: "Hier findest du deinen Einstieg in die wichtigsten Bereiche, deine offenen Aufgaben und die nächsten Schritte für heute.",
        en: "This is your starting point for the most important areas, your open tasks, and today's next steps.",
        es: "Este es tu punto de partida para las áreas más importantes, tus tareas abiertas y los próximos pasos de hoy.",
        fr: "Voici ton point de départ vers les zones principales, tes tâches ouvertes et les prochaines étapes du jour.",
        it: "Questo è il tuo punto di partenza per le aree più importanti, i compiti aperti e i prossimi passi di oggi.",
      }),
    },
    {
      id: "dashboard-checkin",
      route: "/",
      targetId: "dashboard-checkin",
      title: translate(locale, {
        de: "Starte mit dem täglichen Check-in",
        en: "Start with your daily check-in",
        es: "Empieza con tu check-in diario",
        fr: "Commence par ton check-in quotidien",
        it: "Inizia con il tuo check-in quotidiano",
      }),
      body: translate(locale, {
        de: "Mit dem Check-in hältst du kurz fest, wie es dir gerade geht. Das ist der wichtigste Startpunkt für deinen Alltag in der App.",
        en: "The check-in lets you briefly capture how you are feeling right now. It is the most important starting point for your day in the app.",
        es: "El check-in te permite registrar brevemente cómo te sientes ahora mismo. Es el punto de partida más importante de tu día en la app.",
        fr: "Le check-in te permet de noter brièvement comment tu te sens maintenant. C'est le point de départ le plus important de ta journée dans l'application.",
        it: "Il check-in ti permette di annotare rapidamente come ti senti adesso. È il punto di partenza più importante della tua giornata nell'app.",
      }),
    },
    {
      id: "checkin-form",
      route: "/checkin",
      targetId: "checkin-form",
      title: translate(locale, {
        de: "Stimmung, Energie und kurze Notiz",
        en: "Mood, energy, and a short note",
        es: "Estado de ánimo, energía y una nota breve",
        fr: "Humeur, énergie et courte note",
        it: "Umore, energia e una breve nota",
      }),
      body: translate(locale, {
        de: "Wähle deine aktuelle Stimmung, passe dein Energielevel an und schreibe ein paar Worte dazu. So entsteht ein hilfreicher Verlauf.",
        en: "Choose your current mood, adjust your energy level, and add a few words. That creates a helpful timeline.",
        es: "Elige tu estado de ánimo actual, ajusta tu nivel de energía y añade unas palabras. Así se crea un historial útil.",
        fr: "Choisis ton humeur actuelle, ajuste ton niveau d'énergie et ajoute quelques mots. Cela crée un historique utile.",
        it: "Scegli il tuo umore attuale, regola il livello di energia e aggiungi qualche parola. Così nasce uno storico utile.",
      }),
    },
    {
      id: "notes-editor",
      route: "/notes",
      targetId: "notes-editor",
      title: translate(locale, {
        de: "Hier schreibst du dein Tagebuch",
        en: "This is where you write your journal",
        es: "Aquí escribes tu diario",
        fr: "C'est ici que tu écris ton journal",
        it: "Qui scrivi il tuo diario",
      }),
      body: translate(locale, {
        de: "Im Tagebuch kannst du Gedanken und Gefühle festhalten, formatieren und bei Bedarf auch mit deinem Therapeuten teilen.",
        en: "In the journal you can capture thoughts and feelings, format them, and share them with your therapist when needed.",
        es: "En el diario puedes guardar pensamientos y emociones, darles formato y compartirlos con tu terapeuta cuando lo necesites.",
        fr: "Dans le journal, tu peux noter tes pensées et tes émotions, les mettre en forme et les partager avec ton thérapeute si besoin.",
        it: "Nel diario puoi annotare pensieri ed emozioni, formattarli e condividerli con il tuo terapeuta quando serve.",
      }),
      beforeShow: "open-notes-editor",
      requiresReady: true,
    },
    {
      id: "resources-main",
      route: "/resources",
      targetId: "resources-main",
      title: translate(locale, {
        de: "Hier liegen deine Materialien",
        en: "This is where your materials live",
        es: "Aquí están tus materiales",
        fr: "C'est ici que se trouvent tes ressources",
        it: "Qui trovi i tuoi materiali",
      }),
      body: translate(locale, {
        de: "In der Bibliothek findest du Dokumente, Links und andere Inhalte, die dich zwischen den Terminen begleiten. Hier tauchen auch neue Materialien deines Therapeuten auf.",
        en: "In the library you will find documents, links, and other materials that support you between appointments. New materials from your therapist will appear here too.",
        es: "En la biblioteca encontrarás documentos, enlaces y otros materiales que te acompañan entre citas. Aquí también aparecerán nuevos materiales de tu terapeuta.",
        fr: "Dans la bibliothèque, tu trouveras des documents, des liens et d'autres contenus pour t'accompagner entre les rendez-vous. Les nouveaux contenus de ton thérapeute apparaîtront aussi ici.",
        it: "Nella libreria troverai documenti, link e altri materiali che ti accompagnano tra un appuntamento e l'altro. Qui compariranno anche i nuovi contenuti del tuo terapeuta.",
      }),
    },
    {
      id: "resources-finish",
      route: "/resources",
      title: translate(locale, {
        de: "Du bist startklar",
        en: "You are ready to go",
        es: "Ya estás listo",
        fr: "Tu es prêt",
        it: "Sei pronto",
      }),
      body: translate(locale, {
        de: "Das war der kurze Überblick. Als Nächstes helfen dir vor allem dein Check-in, offene Aufgaben auf der Startseite und neue Materialien oder Termine in deinem Bereich.",
        en: "That was the short tour. Next, your check-in, open tasks on the home screen, and new materials or appointments in your area will help most.",
        es: "Ese fue el recorrido breve. A partir de ahora te ayudarán sobre todo tu check-in, las tareas abiertas en la pantalla principal y los nuevos materiales o citas.",
        fr: "C'était le tour rapide. Ensuite, ton check-in, les tâches ouvertes sur l'écran d'accueil et les nouveaux contenus ou rendez-vous t'aideront le plus.",
        it: "Questo era il tour rapido. Da qui in poi ti aiuteranno soprattutto il check-in, i compiti aperti nella schermata iniziale e i nuovi materiali o appuntamenti.",
      }),
    },
  ];
}

const ClientOnboardingContext = createContext<ClientOnboardingContextValue | null>(null);

export function ClientOnboardingProvider({
  children,
  user,
  profile,
  loading,
}: ClientOnboardingProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale } = useLanguage();
  const steps = useMemo(() => getClientOnboardingSteps(locale), [locale]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedThisSession, setCompletedThisSession] = useState(false);
  const [readyStepId, setReadyStepId] = useState<ClientOnboardingStepId | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [completionError, setCompletionError] = useState("");

  const currentStep = steps[currentStepIndex] ?? null;
  const active =
    !loading &&
    !!user &&
    profile?.role === "client" &&
    profile.onboardingCompleted !== true &&
    !completedThisSession;

  useEffect(() => {
    setCurrentStepIndex(0);
    setCompletedThisSession(false);
    setReadyStepId(null);
    setIsFinishing(false);
    setCompletionError("");
  }, [user?.uid]);

  useEffect(() => {
    if (!active) {
      setReadyStepId(null);
      setIsFinishing(false);
      setCompletionError("");
    }
  }, [active]);

  useEffect(() => {
    if (!active || !currentStep) return;

    setReadyStepId(null);
    setCompletionError("");

    if (location.pathname !== currentStep.route) {
      window.scrollTo({ top: 0, left: 0 });
      navigate(currentStep.route, { replace: true });
      return;
    }

    window.scrollTo({ top: 0, left: 0 });
  }, [active, currentStep?.id, currentStep?.route, location.pathname, navigate]);

  const markReady = useCallback((stepId: ClientOnboardingStepId) => {
    setReadyStepId(stepId);
  }, []);

  const finish = useCallback(async () => {
    if (!user || !profile) return;

    setIsFinishing(true);
    setCompletionError("");

    try {
      const [{ doc, setDoc }, { dbLite }] = await Promise.all([
        import("firebase/firestore/lite"),
        import("../../lib/firebaseDbLite"),
      ]);
      await setDoc(
        doc(dbLite, "users", user.uid),
        {
          onboardingCompleted: true,
          email: profile.email,
          role: "client",
        },
        { merge: true }
      );
      setCompletedThisSession(true);
    } catch (error) {
      console.error("Error completing client onboarding:", error);
      setCompletionError(
        translate(locale, {
          de: "Der Abschluss konnte gerade nicht gespeichert werden. Bitte versuche es erneut.",
          en: "The completion could not be saved right now. Please try again.",
          es: "No se pudo guardar la finalización en este momento. Inténtalo de nuevo.",
          fr: "La finalisation n'a pas pu être enregistrée pour le moment. Veuillez réessayer.",
          it: "La conclusione non può essere salvata in questo momento. Riprova.",
        })
      );
    } finally {
      setIsFinishing(false);
    }
  }, [locale, profile, user]);

  const next = useCallback(async () => {
    if (!currentStep) return;

    if (currentStepIndex >= steps.length - 1) {
      await finish();
      return;
    }

    setCurrentStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }, [currentStep, currentStepIndex, finish, steps.length]);

  const back = useCallback(() => {
    setCompletionError("");
    setCurrentStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  const value = useMemo<ClientOnboardingContextValue>(
    () => ({
      active,
      currentStep,
      currentStepId: currentStep?.id ?? null,
      currentStepIndex,
      totalSteps: steps.length,
      isFinishing,
      completionError,
      isCurrentStep: (stepId) => active && currentStep?.id === stepId,
      markReady,
      next,
      back,
    }),
    [active, completionError, currentStep, currentStepIndex, isFinishing, markReady, next, back, steps.length]
  );

  return (
    <ClientOnboardingContext.Provider value={value}>
      {children}
      <ClientOnboardingOverlay readyStepId={readyStepId} />
    </ClientOnboardingContext.Provider>
  );
}

export function useClientOnboarding() {
  const context = useContext(ClientOnboardingContext);
  if (!context) {
    throw new Error("useClientOnboarding must be used within ClientOnboardingProvider");
  }
  return context;
}

export function useOptionalClientOnboarding() {
  return useContext(ClientOnboardingContext);
}

function ClientOnboardingOverlay({
  readyStepId,
}: {
  readyStepId: ClientOnboardingStepId | null;
}) {
  const location = useLocation();
  const {
    active,
    currentStep,
    currentStepIndex,
    totalSteps,
    completionError,
    isFinishing,
    back,
    next,
  } = useClientOnboarding();
  const { locale } = useLanguage();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [highlightFrame, setHighlightFrame] = useState<HighlightFrame | null>(null);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 720 : window.innerHeight,
  }));
  const [targetMissing, setTargetMissing] = useState(false);

  const waitingForRoute = !!currentStep && location.pathname !== currentStep.route;
  const waitingForReady = !!currentStep?.requiresReady && readyStepId !== currentStep.id;
  const nextDisabled = waitingForRoute || waitingForReady || isFinishing;

  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useLayoutEffect(() => {
    if (!active || !currentStep || waitingForRoute || waitingForReady || !currentStep.targetId) {
      setHighlightFrame(null);
      setTargetMissing(false);
      return;
    }

    let cancelled = false;
    let retryTimeout: number | null = null;
    let scrollTimeout: number | null = null;
    let targetElement: HTMLElement | null = null;

    const updateFrame = () => {
      if (cancelled || !targetElement) return;

      const rect = targetElement.getBoundingClientRect();
      const padding = 8;
      const style = window.getComputedStyle(targetElement);
      const radius = Math.max(
        parseFloat(style.borderTopLeftRadius || "0") || 0,
        parseFloat(style.borderTopRightRadius || "0") || 0,
        parseFloat(style.borderBottomRightRadius || "0") || 0,
        parseFloat(style.borderBottomLeftRadius || "0") || 0,
        18
      );

      setTargetMissing(false);
      setHighlightFrame({
        top: Math.max(rect.top - padding, 12),
        left: Math.max(rect.left - padding, 12),
        width: Math.min(rect.width + padding * 2, window.innerWidth - 24),
        height: Math.min(rect.height + padding * 2, window.innerHeight - 24),
        radius,
      });
    };

    const attachTarget = (element: HTMLElement) => {
      targetElement = element;

      const rect = element.getBoundingClientRect();
      if (rect.top < 24 || rect.bottom > window.innerHeight - 24) {
        element.scrollIntoView({ block: "center", inline: "nearest" });
        scrollTimeout = window.setTimeout(updateFrame, 120);
      } else {
        updateFrame();
      }

      window.addEventListener("resize", updateFrame);
      window.addEventListener("scroll", updateFrame, true);
    };

    const findTarget = (attempt = 0) => {
      if (cancelled) return;

      const element = document.querySelector<HTMLElement>(`[data-tour-id="${currentStep.targetId}"]`);
      if (element) {
        attachTarget(element);
        return;
      }

      if (attempt >= 12) {
        setHighlightFrame(null);
        setTargetMissing(true);
        return;
      }

      retryTimeout = window.setTimeout(() => findTarget(attempt + 1), 120);
    };

    const initialFrame = window.requestAnimationFrame(() => findTarget());

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(initialFrame);
      if (retryTimeout) window.clearTimeout(retryTimeout);
      if (scrollTimeout) window.clearTimeout(scrollTimeout);
      window.removeEventListener("resize", updateFrame);
      window.removeEventListener("scroll", updateFrame, true);
    };
  }, [active, currentStep?.id, currentStep?.targetId, waitingForReady, waitingForRoute]);

  const cardPosition = useMemo(() => {
    if (!highlightFrame || targetMissing || viewportSize.width < 768) {
      return {
        left: "50%",
        width: "min(92vw, 24rem)",
        transform: "translateX(-50%)",
        bottom: "1rem",
        top: "auto",
      } as const;
    }

    const cardWidth = Math.min(384, viewportSize.width - 32);
    const spaceRight = viewportSize.width - highlightFrame.left - highlightFrame.width;
    const fitsRight = spaceRight >= cardWidth + 28;
    const topBelow = highlightFrame.top + highlightFrame.height + 20;
    const fitsBelow = topBelow + 240 <= viewportSize.height - 16;

    const left = fitsRight
      ? highlightFrame.left + highlightFrame.width + 24
      : Math.min(
          Math.max(highlightFrame.left, 16),
          Math.max(16, viewportSize.width - cardWidth - 16)
        );

    const top = fitsRight
      ? Math.min(
          Math.max(highlightFrame.top, 16),
          Math.max(16, viewportSize.height - 256)
        )
      : fitsBelow
        ? topBelow
        : Math.max(16, highlightFrame.top - 252);

    return {
      left,
      top,
      width: cardWidth,
    } as const;
  }, [highlightFrame, targetMissing, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    if (!active || !cardRef.current) return;

    const dialog = cardRef.current;
    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled"));

    const focusFirst = () => {
      const [first] = focusables();
      (first || dialog).focus();
    };

    focusFirst();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        return;
      }

      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active, currentStep?.id, waitingForReady, waitingForRoute]);

  if (!active || !currentStep) return null;

  const progressPercent = ((currentStepIndex + 1) / totalSteps) * 100;
  const actionLabel = currentStepIndex === totalSteps - 1
    ? translate(locale, { de: "Tour abschließen", en: "Finish tour", es: "Finalizar recorrido", fr: "Terminer la visite", it: "Concludi il tour" })
    : translate(locale, { de: "Weiter", en: "Next", es: "Continuar", fr: "Continuer", it: "Continua" });
  const statusHint = waitingForRoute
    ? translate(locale, {
        de: "Wir wechseln gerade in den nächsten Bereich.",
        en: "We are switching to the next area.",
        es: "Estamos cambiando al siguiente apartado.",
        fr: "Nous passons à la zone suivante.",
        it: "Stiamo passando all'area successiva.",
      })
    : waitingForReady
      ? translate(locale, {
          de: "Wir öffnen gerade den passenden Bereich für dich.",
          en: "We are opening the matching area for you.",
          es: "Estamos abriendo el área adecuada para ti.",
          fr: "Nous ouvrons la zone adaptée pour toi.",
          it: "Stiamo aprendo l'area giusta per te.",
        })
      : targetMissing
        ? translate(locale, {
            de: "Der Hinweis bleibt bewusst zentriert, falls das Element gerade nicht sichtbar ist.",
            en: "This hint stays centered in case the element is not visible right now.",
            es: "Este aviso permanece centrado por si el elemento no está visible en este momento.",
            fr: "L'indication reste centrée au cas où l'élément ne serait pas visible pour le moment.",
            it: "Questo suggerimento resta centrato nel caso in cui l'elemento non sia visibile in questo momento.",
          })
        : null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-slate-950/72 backdrop-blur-[2px]" />

        {highlightFrame && !targetMissing && !waitingForRoute && !waitingForReady ? (
          <motion.div
            className="pointer-events-none fixed border-2 border-white/95 bg-transparent"
            initial={{ opacity: 0.9 }}
            animate={{
              top: highlightFrame.top,
              left: highlightFrame.left,
              width: highlightFrame.width,
              height: highlightFrame.height,
              borderRadius: highlightFrame.radius,
            }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            style={{
              boxShadow:
                "0 0 0 9999px rgba(2, 6, 23, 0.72), 0 12px 32px rgba(2, 6, 23, 0.28)",
            }}
          />
        ) : null}

        <motion.div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-onboarding-title"
          tabIndex={-1}
          className="fixed rounded-[28px] border border-white/15 bg-slate-950/92 text-white shadow-2xl backdrop-blur-xl"
          style={cardPosition}
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: "spring", damping: 22, stiffness: 220 }}
        >
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                  {translate(locale, {
                    de: "Schritt",
                    en: "Step",
                    es: "Paso",
                    fr: "Étape",
                    it: "Passo",
                  })} {currentStepIndex + 1} {translate(locale, {
                    de: "von",
                    en: "of",
                    es: "de",
                    fr: "sur",
                    it: "di",
                  })} {totalSteps}
                </p>
                <h2 id="client-onboarding-title" className="mt-2 text-xl font-black leading-tight">
                  {currentStep.title}
                </h2>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                {currentStepIndex === totalSteps - 1 ? (
                  <CheckCircle2 size={22} className="text-emerald-300" />
                ) : (
                  <span className="text-sm font-black text-white/80">{currentStepIndex + 1}</span>
                )}
              </div>
            </div>

            <div className="mb-4 h-2 rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300"
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: "spring", damping: 22, stiffness: 180 }}
              />
            </div>

            <p className="text-sm leading-6 text-white/78">{currentStep.body}</p>

            {statusHint ? (
              <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70">
                {statusHint}
              </p>
            ) : null}

            {completionError ? (
              <p className="mt-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-100">
                {completionError}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                disabled={currentStepIndex === 0 || isFinishing}
                className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ArrowLeft size={16} />
                {translate(locale, { de: "Zurück", en: "Back", es: "Atrás", fr: "Retour", it: "Indietro" })}
              </button>

              <button
                type="button"
                onClick={() => {
                  void next();
                }}
                disabled={nextDisabled}
                className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/50"
              >
                {isFinishing ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    {translate(locale, { de: "Speichert...", en: "Saving...", es: "Guardando...", fr: "Enregistrement...", it: "Salvataggio..." })}
                  </span>
                ) : (
                  <>
                    {actionLabel}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

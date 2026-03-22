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

const STEPS: ClientOnboardingStep[] = [
  {
    id: "dashboard-home",
    route: "/",
    targetId: "dashboard-home",
    title: "Willkommen in deiner Startseite",
    body: "Hier findest du deinen Einstieg in die wichtigsten Bereiche, deine offenen Aufgaben und die nächsten Schritte für heute.",
  },
  {
    id: "dashboard-checkin",
    route: "/",
    targetId: "dashboard-checkin",
    title: "Starte mit dem täglichen Check-in",
    body: "Mit dem Check-in hältst du kurz fest, wie es dir gerade geht. Das ist der wichtigste Startpunkt für deinen Alltag in der App.",
  },
  {
    id: "checkin-form",
    route: "/checkin",
    targetId: "checkin-form",
    title: "Stimmung, Energie und kurze Notiz",
    body: "Wähle deine aktuelle Stimmung, passe dein Energielevel an und schreibe ein paar Worte dazu. So entsteht ein hilfreicher Verlauf.",
  },
  {
    id: "notes-editor",
    route: "/notes",
    targetId: "notes-editor",
    title: "Hier schreibst du dein Tagebuch",
    body: "Im Tagebuch kannst du Gedanken und Gefühle festhalten, formatieren und bei Bedarf auch mit deinem Therapeuten teilen.",
    beforeShow: "open-notes-editor",
    requiresReady: true,
  },
  {
    id: "resources-main",
    route: "/resources",
    targetId: "resources-main",
    title: "Hier liegen deine Materialien",
    body: "In der Bibliothek findest du Dokumente, Links und andere Inhalte, die dich zwischen den Terminen begleiten. Hier tauchen auch neue Materialien deines Therapeuten auf.",
  },
  {
    id: "resources-finish",
    route: "/resources",
    title: "Du bist startklar",
    body: "Das war der kurze Überblick. Als Nächstes helfen dir vor allem dein Check-in, offene Aufgaben auf der Startseite und neue Materialien oder Termine in deinem Bereich.",
  },
];

const ClientOnboardingContext = createContext<ClientOnboardingContextValue | null>(null);

export function ClientOnboardingProvider({
  children,
  user,
  profile,
  loading,
}: ClientOnboardingProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedThisSession, setCompletedThisSession] = useState(false);
  const [readyStepId, setReadyStepId] = useState<ClientOnboardingStepId | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [completionError, setCompletionError] = useState("");

  const currentStep = STEPS[currentStepIndex] ?? null;
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
      setCompletionError("Der Abschluss konnte gerade nicht gespeichert werden. Bitte versuche es erneut.");
    } finally {
      setIsFinishing(false);
    }
  }, [profile, user]);

  const next = useCallback(async () => {
    if (!currentStep) return;

    if (currentStepIndex >= STEPS.length - 1) {
      await finish();
      return;
    }

    setCurrentStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  }, [currentStep, currentStepIndex, finish]);

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
      totalSteps: STEPS.length,
      isFinishing,
      completionError,
      isCurrentStep: (stepId) => active && currentStep?.id === stepId,
      markReady,
      next,
      back,
    }),
    [active, completionError, currentStep, currentStepIndex, isFinishing, markReady, next, back]
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
  const actionLabel = currentStepIndex === totalSteps - 1 ? "Tour abschliessen" : "Weiter";
  const statusHint = waitingForRoute
    ? "Wir wechseln gerade in den nächsten Bereich."
    : waitingForReady
      ? "Wir öffnen gerade den passenden Bereich für dich."
      : targetMissing
        ? "Der Hinweis bleibt bewusst zentriert, falls das Element gerade nicht sichtbar ist."
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
                  Schritt {currentStepIndex + 1} von {totalSteps}
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
                Zurück
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
                    Speichert...
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

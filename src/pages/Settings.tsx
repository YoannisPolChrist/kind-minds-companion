import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  ArrowLeft,
  LogOut,
  Key,
  BarChart3,
  BookOpen,
  User,
  Edit3,
  FileText,
  History,
  Calendar,
  RefreshCw,
  Unplug,
  ExternalLink,
  Cloud,
  Languages,
} from "lucide-react";
import { db } from "../lib/firebaseDb";
import { motion } from "motion/react";
import { PageTransition, StaggerContainer, StaggerItem, PressableScale } from "../components/motion";
import { BannerToast } from "../components/ui/Toast";
import { startGoogleCalendarConnect, disconnectGoogleCalendar, syncGoogleCalendarAppointment } from "../lib/calendarConnect";
import { buildCalendarLinks } from "../../modules/scheduling/calendarLinks";
import type { ProviderConnectionSummary, AppointmentDetails } from "../../modules/scheduling";
import { getRandomHeaderImage } from "../constants/headerImages";
import { useLanguage } from "../hooks/useLanguage";
import { queueAuthEmailRequest } from "../../modules/auth/requestAuthEmail";

const LANGUAGE_OPTIONS = [
  { code: "de", label: "DE" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "fr", label: "FR" },
  { code: "it", label: "IT" },
] as const;

function formatDateTime(value: string | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Settings() {
  const { profile, signOut } = useAuth();
  const { locale, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const headerImage = getRandomHeaderImage();
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [calendarBusy, setCalendarBusy] = useState<"connect" | "disconnect" | "sync" | null>(null);
  const [googleSummary, setGoogleSummary] = useState<ProviderConnectionSummary | undefined>(profile?.calendarConnectionSummary?.google);

  useEffect(() => {
    setGoogleSummary(profile?.calendarConnectionSummary?.google);
  }, [profile?.calendarConnectionSummary?.google]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const calendarState = params.get("calendar");
    if (!calendarState) return;

    if (calendarState === "google-connected") {
      setToast({ message: "Google Kalender verbunden", type: "success" });
    } else if (calendarState === "google-config-missing") {
      setToast({ message: "Google Kalender ist noch nicht konfiguriert", type: "error" });
    } else {
      setToast({ message: "Google Kalender Verbindung fehlgeschlagen", type: "error" });
    }
  }, [location.search]);

  const handlePasswordReset = async () => {
    if (!profile?.email) return;
    try {
      await queueAuthEmailRequest(db, {
        email: profile.email,
        type: "PASSWORD_RESET",
        language: locale,
        userId: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
      setResetSent(true);
      setResetError("");
    } catch (error) {
      setResetError("Konnte E-Mail nicht senden.");
      console.error(error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleGoogleConnect = async () => {
    try {
      setCalendarBusy("connect");
      await startGoogleCalendarConnect();
    } catch (error) {
      console.error(error);
      setToast({ message: error instanceof Error ? error.message : "Google Kalender konnte nicht gestartet werden.", type: "error" });
      setCalendarBusy(null);
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      setCalendarBusy("disconnect");
      await disconnectGoogleCalendar();
      setGoogleSummary({ provider: "google", status: "disconnected" });
      setToast({ message: "Google Kalender getrennt", type: "success" });
    } catch (error) {
      console.error(error);
      setToast({ message: error instanceof Error ? error.message : "Trennen fehlgeschlagen.", type: "error" });
    } finally {
      setCalendarBusy(null);
    }
  };

  const appointmentDetails = useMemo<AppointmentDetails | null>(() => {
    if (!profile?.nextAppointment) return null;
    const startDate = new Date(profile.nextAppointment);
    if (Number.isNaN(startDate.getTime())) return null;

    return {
      id: `next-appointment-${profile.id}`,
      title: profile.role === "therapist" ? "Therapietermin" : "Therapietermin",
      description: profile.role === "therapist"
        ? "Termin aus der Therapie-App."
        : "Dein nächster Termin aus der Therapie-App.",
      startDate,
      endDate: new Date(startDate.getTime() + 45 * 60000),
    };
  }, [profile?.id, profile?.nextAppointment, profile?.role]);

  const calendarLinks = useMemo(() => (appointmentDetails ? buildCalendarLinks(appointmentDetails) : []), [appointmentDetails]);
  const googleManualLink = calendarLinks.find((link) => link.provider === "google");
  const appleFallbackLink = calendarLinks.find((link) => link.provider === "icloud");
  const isTherapist = profile?.role === "therapist";
  const isGoogleConnected = googleSummary?.status === "connected";

  const handleGoogleSync = async () => {
    if (!appointmentDetails) {
      setToast({ message: "Kein Termin zum Synchronisieren vorhanden", type: "info" });
      return;
    }

    try {
      setCalendarBusy("sync");
      const payload = await syncGoogleCalendarAppointment({
        id: appointmentDetails.id,
        title: appointmentDetails.title,
        description: appointmentDetails.description,
        startAt: appointmentDetails.startDate.toISOString(),
        endAt: appointmentDetails.endDate.toISOString(),
        location: appointmentDetails.location,
      });
      setGoogleSummary((current) => ({
        provider: "google",
        status: "connected",
        email: current?.email,
        connectedAt: current?.connectedAt,
        lastSyncedAt: payload?.lastSyncedAt || new Date().toISOString(),
      }));
      setToast({ message: "Termin in Google Kalender synchronisiert", type: "success" });
    } catch (error) {
      console.error(error);
      setToast({ message: error instanceof Error ? error.message : "Termin-Sync fehlgeschlagen.", type: "error" });
    } finally {
      setCalendarBusy(null);
    }
  };

  const navItems = isTherapist
    ? [
        { path: "/therapist/clients", icon: BarChart3, label: "Alle Klienten", desc: "Klienten verwalten und Übersicht behalten" },
        { path: "/therapist/templates", icon: BookOpen, label: "Vorlagen", desc: "Übungsvorlagen erstellen und verwalten" },
        { path: "/therapist/resources", icon: FileText, label: "Bibliothek", desc: "Ressourcen und Materialien" },
      ]
    : [
        { path: "/checkins", icon: BarChart3, label: "Mein Tagebuch", desc: "Check-in Verlauf und Statistiken" },
        { path: "/exercises", icon: BookOpen, label: "Alle Übungen", desc: "Übersicht aller zugewiesenen Übungen" },
        { path: "/notes", icon: Edit3, label: "Therapie-Tagebuch", desc: "Eigene Notizen und Gedanken" },
        { path: "/resources", icon: FileText, label: "Bibliothek", desc: "Dokumente und Links vom Therapeuten" },
        { path: "/history", icon: History, label: "Verlauf", desc: "Alle erledigten Aktivitäten" },
      ];

  return (
    <PageTransition className="min-h-screen bg-background">
      {toast && (
        <BannerToast
          visible={true}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      <div className="relative overflow-hidden border-b border-border bg-slate-950/80 px-5 pb-8 pt-10 text-primary-foreground">
        <img
          src={headerImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover brightness-110"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-cyan-900/25 to-slate-950/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:34px_34px] opacity-12" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.35),_transparent_60%)] opacity-60 mix-blend-screen" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 rounded-xl bg-white/14 px-4 py-2 text-sm font-bold text-white/85 transition-all hover:bg-white/22 hover:text-white"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} /> Zurück
          </motion.button>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/65">
                Workspace Einstellungen
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-tight">
                Konto, Kalender und Verbindungen
              </h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/60">Rolle</p>
                <p className="mt-2 text-lg font-black text-white">
                  {isTherapist ? "Therapeut" : "Klient"}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/60">Kalender</p>
                <p className="mt-2 text-lg font-black text-white">
                  {isGoogleConnected ? "Google verbunden" : "Noch offen"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StaggerContainer className="max-w-6xl mx-auto px-5 py-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <StaggerItem className="xl:col-span-2">
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <motion.div
                className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <User size={24} className="text-primary" />
              </motion.div>
              <div>
                <p className="font-bold text-foreground text-lg">{profile?.firstName} {profile?.lastName}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{profile?.role || "Klient"}</p>
              </div>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem className="xl:col-span-2">
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-[1.75rem] bg-primary/12 flex items-center justify-center shrink-0">
                <Languages size={22} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-black text-foreground">Sprache</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Beim ersten Start wird die Geräte- oder Browsersprache übernommen. Hier kannst du sie jederzeit dauerhaft für dein Konto ändern.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((option) => {
                const active = locale === option.code;
                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => {
                      void (async () => {
                        await setLanguage(option.code);
                        setToast({ message: `Sprache auf ${option.label} umgestellt`, type: "success" });
                      })();
                    }}
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "border-border bg-secondary text-foreground hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </StaggerItem>

        <StaggerItem className="xl:col-start-1">
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4 h-full">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-[1.75rem] bg-primary/12 flex items-center justify-center shrink-0">
                <Calendar size={22} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-black text-foreground">Kalender verbinden</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Google kann direkt verbunden werden. Apple läuft auf dem Web als klarer ICS-Fallback und auf iPhone/iPad weiter über den Gerätekalender.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/80 bg-secondary/50 p-5 space-y-4 shadow-inner shadow-black/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Cloud size={16} className="text-primary" />
                    <p className="font-bold text-foreground">Google Kalender</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isGoogleConnected
      ? `${googleSummary?.email || "Verbunden"}${googleSummary?.lastSyncedAt ? ` · Letzter Sync ${formatDateTime(googleSummary.lastSyncedAt, locale)}` : ""}`
                      : "Verbinde dein Google-Konto für direkten Termin-Sync."}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black ${isGoogleConnected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {isGoogleConnected ? "Verbunden" : "Nicht verbunden"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {isGoogleConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleSync}
                      disabled={calendarBusy !== null || !appointmentDetails}
                      className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
                    >
                      <RefreshCw size={16} className={calendarBusy === "sync" ? "animate-spin" : ""} />
                      Termin synchronisieren
                    </button>
                    <button
                      type="button"
                      onClick={handleGoogleDisconnect}
                      disabled={calendarBusy !== null}
                      className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground disabled:opacity-50"
                    >
                      <Unplug size={16} />
                      Trennen
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleConnect}
                    disabled={calendarBusy !== null}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
                  >
                    <Cloud size={16} className={calendarBusy === "connect" ? "animate-pulse" : ""} />
                    Google verbinden
                  </button>
                )}

                {googleManualLink && (
                  <a
                    href={googleManualLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground"
                  >
                    <ExternalLink size={16} />
                    Manuell in Google öffnen
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/80 bg-secondary/50 p-5 space-y-4 shadow-inner shadow-black/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-accent" />
                    <p className="font-bold text-foreground">Apple Kalender / ICS</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Auf dem Web liefern wir einen klaren ICS-Export. In der nativen App bleibt der Abgleich über den Gerätekalender möglich.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-muted text-muted-foreground">
                  Hybrid
                </span>
              </div>

              {appleFallbackLink ? (
                <a
                  href={appleFallbackLink.url}
                  download="therapietermin.ics"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground"
                >
                  <ExternalLink size={16} />
                  ICS herunterladen
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Sobald ein nächster Termin vorhanden ist, kannst du ihn hier als ICS laden.</p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Nächster Termin</p>
                <p className="text-sm font-bold text-foreground mt-1">{formatDateTime(profile?.nextAppointment, locale) || "Noch kein Termin eingetragen"}</p>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem className="xl:col-start-2 xl:row-span-3 xl:sticky xl:top-24 xl:self-start">
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden divide-y divide-border">
            {navItems.map(({ path, icon: Icon, label, desc }) => (
              <PressableScale key={path} onClick={() => navigate(path)}>
                <div className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors text-left w-full">
                  <Icon size={20} className="text-primary shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              </PressableScale>
            ))}
          </div>
        </StaggerItem>

        <StaggerItem className="xl:col-start-1">
          <PressableScale onClick={handlePasswordReset}>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors text-left w-full">
                <Key size={20} className="text-primary shrink-0" />
                <div>
                  <p className="font-bold text-foreground">Passwort zurücksetzen</p>
                  <p className="text-xs text-muted-foreground">Passwort-Reset E-Mail anfordern</p>
                </div>
              </div>
            </div>
          </PressableScale>
        </StaggerItem>

        {resetSent && (
          <motion.div
            className="xl:col-start-1 bg-success/10 text-success text-sm font-semibold rounded-2xl px-4 py-3 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            Ein Link zum Zurücksetzen wurde an {profile?.email} gesendet.
          </motion.div>
        )}
        {resetError && (
          <motion.div
            className="xl:col-start-1 bg-destructive/10 text-destructive text-sm font-semibold rounded-2xl px-4 py-3 text-center"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
            transition={{ duration: 0.4 }}
          >
            {resetError}
          </motion.div>
        )}

        <StaggerItem className="xl:col-start-1">
          <motion.button
            onClick={handleSignOut}
            className="w-full py-4 rounded-2xl bg-destructive/10 text-destructive font-black flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02, backgroundColor: "hsl(var(--destructive) / 0.2)" }}
            whileTap={{ scale: 0.97 }}
          >
            <LogOut size={20} />
            Abmelden
          </motion.button>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}

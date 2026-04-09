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
import { translate } from "../lib/webLocale";
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
  const isTherapist = profile?.role === "therapist";
  const isGoogleConnected = googleSummary?.status === "connected";

  const copy = useMemo(() => ({
    back: translate(locale, { de: "Zurück", en: "Back", es: "Volver", fr: "Retour", it: "Indietro" }),
    workspaceSettings: translate(locale, {
      de: "Workspace Einstellungen",
      en: "Workspace settings",
      es: "Configuracion del espacio",
      fr: "Parametres de l'espace",
      it: "Impostazioni workspace",
    }),
    accountCalendarConnections: translate(locale, {
      de: "Konto, Kalender und Verbindungen",
      en: "Account, calendar and connections",
      es: "Cuenta, calendario y conexiones",
      fr: "Compte, calendrier et connexions",
      it: "Account, calendario e connessioni",
    }),
    role: translate(locale, { de: "Rolle", en: "Role", es: "Rol", fr: "Role", it: "Ruolo" }),
    therapist: translate(locale, { de: "Therapeut", en: "Therapist", es: "Terapeuta", fr: "Therapeute", it: "Terapeuta" }),
    client: translate(locale, { de: "Klient", en: "Client", es: "Cliente", fr: "Client", it: "Cliente" }),
    calendar: translate(locale, { de: "Kalender", en: "Calendar", es: "Calendario", fr: "Calendrier", it: "Calendario" }),
    googleConnected: translate(locale, {
      de: "Google verbunden",
      en: "Google connected",
      es: "Google conectado",
      fr: "Google connecte",
      it: "Google connesso",
    }),
    stillOpen: translate(locale, {
      de: "Noch offen",
      en: "Still open",
      es: "Todavia pendiente",
      fr: "Encore ouvert",
      it: "Ancora aperto",
    }),
    language: translate(locale, { de: "Sprache", en: "Language", es: "Idioma", fr: "Langue", it: "Lingua" }),
    languageBody: translate(locale, {
      de: "Beim ersten Start wird die Geraete- oder Browsersprache uebernommen. Hier kannst du sie jederzeit dauerhaft fuer dein Konto aendern.",
      en: "On first launch, the device or browser language is used automatically. Here you can change it permanently for your account at any time.",
      es: "En el primer inicio se usa automaticamente el idioma del dispositivo o del navegador. Aqui puedes cambiarlo de forma permanente para tu cuenta en cualquier momento.",
      fr: "Au premier lancement, la langue de l'appareil ou du navigateur est utilisee automatiquement. Ici, tu peux la modifier durablement pour ton compte a tout moment.",
      it: "Al primo avvio viene usata automaticamente la lingua del dispositivo o del browser. Qui puoi cambiarla in modo permanente per il tuo account in qualsiasi momento.",
    }),
    connectCalendarTitle: translate(locale, {
      de: "Kalender verbinden",
      en: "Connect calendar",
      es: "Conectar calendario",
      fr: "Connecter le calendrier",
      it: "Collega calendario",
    }),
    connectCalendarBody: translate(locale, {
      de: "Google kann direkt verbunden werden. Apple laeuft auf dem Web als klarer ICS-Fallback und auf iPhone/iPad weiter ueber den Geraetekalender.",
      en: "Google can be connected directly. On the web, Apple works as a clear ICS fallback and on iPhone/iPad it still uses the device calendar.",
      es: "Google se puede conectar directamente. En la web, Apple funciona como una alternativa ICS clara y en iPhone/iPad sigue usando el calendario del dispositivo.",
      fr: "Google peut etre connecte directement. Sur le web, Apple fonctionne comme solution ICS claire et sur iPhone/iPad continue via le calendrier de l'appareil.",
      it: "Google puo essere collegato direttamente. Sul web Apple funziona come fallback ICS chiaro e su iPhone/iPad continua tramite il calendario del dispositivo.",
    }),
    googleCalendar: translate(locale, {
      de: "Google Kalender",
      en: "Google Calendar",
      es: "Google Calendar",
      fr: "Google Agenda",
      it: "Google Calendar",
    }),
    googleConnectHint: translate(locale, {
      de: "Verbinde dein Google-Konto fuer direkten Termin-Sync.",
      en: "Connect your Google account for direct appointment sync.",
      es: "Conecta tu cuenta de Google para sincronizar citas directamente.",
      fr: "Connecte ton compte Google pour synchroniser les rendez-vous directement.",
      it: "Collega il tuo account Google per sincronizzare direttamente gli appuntamenti.",
    }),
    connected: translate(locale, { de: "Verbunden", en: "Connected", es: "Conectado", fr: "Connecte", it: "Connesso" }),
    disconnected: translate(locale, {
      de: "Nicht verbunden",
      en: "Not connected",
      es: "No conectado",
      fr: "Non connecte",
      it: "Non connesso",
    }),
    lastSync: translate(locale, {
      de: "Letzter Sync",
      en: "Last sync",
      es: "Ultima sincronizacion",
      fr: "Derniere synchro",
      it: "Ultima sincronizzazione",
    }),
    syncAppointment: translate(locale, {
      de: "Termin synchronisieren",
      en: "Sync appointment",
      es: "Sincronizar cita",
      fr: "Synchroniser le rendez-vous",
      it: "Sincronizza appuntamento",
    }),
    disconnect: translate(locale, { de: "Trennen", en: "Disconnect", es: "Desconectar", fr: "Deconnecter", it: "Disconnetti" }),
    connectGoogle: translate(locale, {
      de: "Google verbinden",
      en: "Connect Google",
      es: "Conectar Google",
      fr: "Connecter Google",
      it: "Collega Google",
    }),
    openManualGoogle: translate(locale, {
      de: "Manuell in Google oeffnen",
      en: "Open manually in Google",
      es: "Abrir manualmente en Google",
      fr: "Ouvrir manuellement dans Google",
      it: "Apri manualmente in Google",
    }),
    appleCalendar: translate(locale, {
      de: "Apple Kalender / ICS",
      en: "Apple Calendar / ICS",
      es: "Apple Calendar / ICS",
      fr: "Calendrier Apple / ICS",
      it: "Calendario Apple / ICS",
    }),
    appleBody: translate(locale, {
      de: "Auf dem Web liefern wir einen klaren ICS-Export. In der nativen App bleibt der Abgleich ueber den Geraetekalender moeglich.",
      en: "On the web we provide a clear ICS export. In the native app, syncing through the device calendar remains available.",
      es: "En la web ofrecemos una exportacion ICS clara. En la app nativa sigue siendo posible sincronizar con el calendario del dispositivo.",
      fr: "Sur le web, nous proposons un export ICS clair. Dans l'application native, la synchronisation via le calendrier de l'appareil reste disponible.",
      it: "Sul web forniamo una chiara esportazione ICS. Nell'app nativa resta disponibile la sincronizzazione tramite il calendario del dispositivo.",
    }),
    hybrid: translate(locale, { de: "Hybrid", en: "Hybrid", es: "Hibrido", fr: "Hybride", it: "Ibrido" }),
    downloadIcs: translate(locale, {
      de: "ICS herunterladen",
      en: "Download ICS",
      es: "Descargar ICS",
      fr: "Telecharger ICS",
      it: "Scarica ICS",
    }),
    noAppointmentIcs: translate(locale, {
      de: "Sobald ein naechster Termin vorhanden ist, kannst du ihn hier als ICS laden.",
      en: "As soon as a next appointment exists, you can download it here as an ICS file.",
      es: "En cuanto haya una proxima cita, podras descargarla aqui como archivo ICS.",
      fr: "Des qu'un prochain rendez-vous existe, tu peux le telecharger ici en fichier ICS.",
      it: "Non appena e disponibile un prossimo appuntamento, potrai scaricarlo qui come file ICS.",
    }),
    nextAppointment: translate(locale, {
      de: "Naechster Termin",
      en: "Next appointment",
      es: "Proxima cita",
      fr: "Prochain rendez-vous",
      it: "Prossimo appuntamento",
    }),
    noAppointment: translate(locale, {
      de: "Noch kein Termin eingetragen",
      en: "No appointment entered yet",
      es: "Todavia no hay ninguna cita registrada",
      fr: "Aucun rendez-vous enregistre pour le moment",
      it: "Nessun appuntamento inserito finora",
    }),
    resetPassword: translate(locale, {
      de: "Passwort zuruecksetzen",
      en: "Reset password",
      es: "Restablecer contrasena",
      fr: "Reinitialiser le mot de passe",
      it: "Reimposta password",
    }),
    resetPasswordDesc: translate(locale, {
      de: "Passwort-Reset E-Mail anfordern",
      en: "Request password reset email",
      es: "Solicitar correo de restablecimiento de contrasena",
      fr: "Demander un e-mail de reinitialisation du mot de passe",
      it: "Richiedi e-mail di reimpostazione password",
    }),
    resetSent: translate(locale, {
      de: "Ein Link zum Zuruecksetzen wurde an",
      en: "A reset link was sent to",
      es: "Se envio un enlace de restablecimiento a",
      fr: "Un lien de reinitialisation a ete envoye a",
      it: "Un link di reimpostazione e stato inviato a",
    }),
    resetError: translate(locale, {
      de: "Konnte E-Mail nicht senden.",
      en: "Could not send email.",
      es: "No se pudo enviar el correo.",
      fr: "Impossible d'envoyer l'e-mail.",
      it: "Impossibile inviare l'e-mail.",
    }),
    signOut: translate(locale, { de: "Abmelden", en: "Sign out", es: "Cerrar sesion", fr: "Se deconnecter", it: "Disconnetti" }),
    googleConnectedToast: translate(locale, {
      de: "Google Kalender verbunden",
      en: "Google Calendar connected",
      es: "Google Calendar conectado",
      fr: "Google Agenda connecte",
      it: "Google Calendar connesso",
    }),
    googleConfigMissingToast: translate(locale, {
      de: "Google Kalender ist noch nicht konfiguriert",
      en: "Google Calendar is not configured yet",
      es: "Google Calendar todavia no esta configurado",
      fr: "Google Agenda n'est pas encore configure",
      it: "Google Calendar non e ancora configurato",
    }),
    googleFailedToast: translate(locale, {
      de: "Google Kalender Verbindung fehlgeschlagen",
      en: "Google Calendar connection failed",
      es: "La conexion con Google Calendar fallo",
      fr: "La connexion Google Agenda a echoue",
      it: "Connessione Google Calendar non riuscita",
    }),
    googleStartFailed: translate(locale, {
      de: "Google Kalender konnte nicht gestartet werden.",
      en: "Google Calendar could not be started.",
      es: "No se pudo iniciar Google Calendar.",
      fr: "Impossible de lancer Google Agenda.",
      it: "Impossibile avviare Google Calendar.",
    }),
    googleDisconnectedToast: translate(locale, {
      de: "Google Kalender getrennt",
      en: "Google Calendar disconnected",
      es: "Google Calendar desconectado",
      fr: "Google Agenda deconnecte",
      it: "Google Calendar disconnesso",
    }),
    disconnectFailed: translate(locale, {
      de: "Trennen fehlgeschlagen.",
      en: "Disconnect failed.",
      es: "La desconexion fallo.",
      fr: "La deconnexion a echoue.",
      it: "Disconnessione non riuscita.",
    }),
    noAppointmentToSync: translate(locale, {
      de: "Kein Termin zum Synchronisieren vorhanden",
      en: "No appointment available to sync",
      es: "No hay ninguna cita para sincronizar",
      fr: "Aucun rendez-vous a synchroniser",
      it: "Nessun appuntamento disponibile da sincronizzare",
    }),
    syncedToast: translate(locale, {
      de: "Termin in Google Kalender synchronisiert",
      en: "Appointment synced to Google Calendar",
      es: "Cita sincronizada con Google Calendar",
      fr: "Rendez-vous synchronise avec Google Agenda",
      it: "Appuntamento sincronizzato con Google Calendar",
    }),
    syncFailed: translate(locale, {
      de: "Termin-Sync fehlgeschlagen.",
      en: "Appointment sync failed.",
      es: "La sincronizacion de la cita fallo.",
      fr: "La synchronisation du rendez-vous a echoue.",
      it: "Sincronizzazione appuntamento non riuscita.",
    }),
    appointmentTitle: translate(locale, {
      de: "Therapietermin",
      en: "Therapy appointment",
      es: "Cita de terapia",
      fr: "Rendez-vous therapeutique",
      it: "Appuntamento terapeutico",
    }),
    appointmentDescriptionTherapist: translate(locale, {
      de: "Termin aus der Therapie-App.",
      en: "Appointment from the therapy app.",
      es: "Cita de la app de terapia.",
      fr: "Rendez-vous provenant de l'application de therapie.",
      it: "Appuntamento dall'app di terapia.",
    }),
    appointmentDescriptionClient: translate(locale, {
      de: "Dein naechster Termin aus der Therapie-App.",
      en: "Your next appointment from the therapy app.",
      es: "Tu proxima cita desde la app de terapia.",
      fr: "Ton prochain rendez-vous depuis l'application de therapie.",
      it: "Il tuo prossimo appuntamento dall'app di terapia.",
    }),
    navTherapistClients: translate(locale, {
      de: "Alle Klienten",
      en: "All clients",
      es: "Todos los clientes",
      fr: "Tous les clients",
      it: "Tutti i clienti",
    }),
    navTherapistClientsDesc: translate(locale, {
      de: "Klienten verwalten und Uebersicht behalten",
      en: "Manage clients and keep the overview",
      es: "Gestiona clientes y manten la vision general",
      fr: "Gerer les clients et garder la vue d'ensemble",
      it: "Gestisci i clienti e mantieni la panoramica",
    }),
    navTemplates: translate(locale, {
      de: "Vorlagen",
      en: "Templates",
      es: "Plantillas",
      fr: "Modeles",
      it: "Modelli",
    }),
    navTemplatesDesc: translate(locale, {
      de: "Uebungsvorlagen erstellen und verwalten",
      en: "Create and manage exercise templates",
      es: "Crear y gestionar plantillas de ejercicios",
      fr: "Creer et gerer des modeles d'exercices",
      it: "Crea e gestisci modelli di esercizi",
    }),
    navLibrary: translate(locale, {
      de: "Bibliothek",
      en: "Library",
      es: "Biblioteca",
      fr: "Bibliotheque",
      it: "Libreria",
    }),
    navLibraryDesc: translate(locale, {
      de: "Ressourcen und Materialien",
      en: "Resources and materials",
      es: "Recursos y materiales",
      fr: "Ressources et materiaux",
      it: "Risorse e materiali",
    }),
    navJournal: translate(locale, {
      de: "Mein Tagebuch",
      en: "My journal",
      es: "Mi diario",
      fr: "Mon journal",
      it: "Il mio diario",
    }),
    navJournalDesc: translate(locale, {
      de: "Check-in Verlauf und Statistiken",
      en: "Check-in history and statistics",
      es: "Historial de check-ins y estadisticas",
      fr: "Historique des check-ins et statistiques",
      it: "Storico check-in e statistiche",
    }),
    navExercises: translate(locale, {
      de: "Alle Uebungen",
      en: "All exercises",
      es: "Todos los ejercicios",
      fr: "Tous les exercices",
      it: "Tutti gli esercizi",
    }),
    navExercisesDesc: translate(locale, {
      de: "Uebersicht aller zugewiesenen Uebungen",
      en: "Overview of all assigned exercises",
      es: "Vista general de todos los ejercicios asignados",
      fr: "Vue d'ensemble de tous les exercices assignes",
      it: "Panoramica di tutti gli esercizi assegnati",
    }),
    navNotes: translate(locale, {
      de: "Therapie-Tagebuch",
      en: "Therapy journal",
      es: "Diario terapeutico",
      fr: "Journal therapeutique",
      it: "Diario terapeutico",
    }),
    navNotesDesc: translate(locale, {
      de: "Eigene Notizen und Gedanken",
      en: "Your own notes and thoughts",
      es: "Tus propias notas y pensamientos",
      fr: "Tes notes et pensees personnelles",
      it: "Le tue note e i tuoi pensieri",
    }),
    navResourcesDesc: translate(locale, {
      de: "Dokumente und Links vom Therapeuten",
      en: "Documents and links from your therapist",
      es: "Documentos y enlaces del terapeuta",
      fr: "Documents et liens du therapeute",
      it: "Documenti e link dal terapeuta",
    }),
    navHistory: translate(locale, { de: "Verlauf", en: "History", es: "Historial", fr: "Historique", it: "Storico" }),
    navHistoryDesc: translate(locale, {
      de: "Alle erledigten Aktivitaeten",
      en: "All completed activities",
      es: "Todas las actividades completadas",
      fr: "Toutes les activites terminees",
      it: "Tutte le attivita completate",
    }),
  }), [locale]);

  useEffect(() => {
    setGoogleSummary(profile?.calendarConnectionSummary?.google);
  }, [profile?.calendarConnectionSummary?.google]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const calendarState = params.get("calendar");
    if (!calendarState) return;

    if (calendarState === "google-connected") {
      setToast({ message: copy.googleConnectedToast, type: "success" });
    } else if (calendarState === "google-config-missing") {
      setToast({ message: copy.googleConfigMissingToast, type: "error" });
    } else {
      setToast({ message: copy.googleFailedToast, type: "error" });
    }
  }, [location.search, copy.googleConnectedToast, copy.googleConfigMissingToast, copy.googleFailedToast]);

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
      setResetError(copy.resetError);
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
      setToast({ message: error instanceof Error ? error.message : copy.googleStartFailed, type: "error" });
      setCalendarBusy(null);
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      setCalendarBusy("disconnect");
      await disconnectGoogleCalendar();
      setGoogleSummary({ provider: "google", status: "disconnected" });
      setToast({ message: copy.googleDisconnectedToast, type: "success" });
    } catch (error) {
      console.error(error);
      setToast({ message: error instanceof Error ? error.message : copy.disconnectFailed, type: "error" });
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
      title: copy.appointmentTitle,
      description: profile.role === "therapist"
        ? copy.appointmentDescriptionTherapist
        : copy.appointmentDescriptionClient,
      startDate,
      endDate: new Date(startDate.getTime() + 45 * 60000),
    };
  }, [profile?.id, profile?.nextAppointment, profile?.role, copy.appointmentTitle, copy.appointmentDescriptionTherapist, copy.appointmentDescriptionClient]);

  const calendarLinks = useMemo(() => (appointmentDetails ? buildCalendarLinks(appointmentDetails) : []), [appointmentDetails]);
  const googleManualLink = calendarLinks.find((link) => link.provider === "google");
  const appleFallbackLink = calendarLinks.find((link) => link.provider === "icloud");
  const handleGoogleSync = async () => {
    if (!appointmentDetails) {
      setToast({ message: copy.noAppointmentToSync, type: "info" });
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
      setToast({ message: copy.syncedToast, type: "success" });
    } catch (error) {
      console.error(error);
      setToast({ message: error instanceof Error ? error.message : copy.syncFailed, type: "error" });
    } finally {
      setCalendarBusy(null);
    }
  };

  const navItems = isTherapist
    ? [
        { path: "/therapist/clients", icon: BarChart3, label: copy.navTherapistClients, desc: copy.navTherapistClientsDesc },
        { path: "/therapist/templates", icon: BookOpen, label: copy.navTemplates, desc: copy.navTemplatesDesc },
        { path: "/therapist/resources", icon: FileText, label: copy.navLibrary, desc: copy.navLibraryDesc },
      ]
    : [
        { path: "/checkins", icon: BarChart3, label: copy.navJournal, desc: copy.navJournalDesc },
        { path: "/exercises", icon: BookOpen, label: copy.navExercises, desc: copy.navExercisesDesc },
        { path: "/notes", icon: Edit3, label: copy.navNotes, desc: copy.navNotesDesc },
        { path: "/resources", icon: FileText, label: copy.navLibrary, desc: copy.navResourcesDesc },
        { path: "/history", icon: History, label: copy.navHistory, desc: copy.navHistoryDesc },
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
            <ArrowLeft size={16} /> {copy.back}
          </motion.button>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/65">
                {copy.workspaceSettings}
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-tight">
                {copy.accountCalendarConnections}
              </h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/60">{copy.role}</p>
                <p className="mt-2 text-lg font-black text-white">
                  {isTherapist ? copy.therapist : copy.client}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/60">{copy.calendar}</p>
                <p className="mt-2 text-lg font-black text-white">
                  {isGoogleConnected ? copy.googleConnected : copy.stillOpen}
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
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {profile?.role === "therapist" ? copy.therapist : copy.client}
                </p>
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
                <p className="font-black text-foreground">{copy.language}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {copy.languageBody}
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
                    onClick={() => void setLanguage(option.code)}
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
                <p className="font-black text-foreground">{copy.connectCalendarTitle}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {copy.connectCalendarBody}
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/80 bg-secondary/50 p-5 space-y-4 shadow-inner shadow-black/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Cloud size={16} className="text-primary" />
                    <p className="font-bold text-foreground">{copy.googleCalendar}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isGoogleConnected
      ? `${googleSummary?.email || copy.connected}${googleSummary?.lastSyncedAt ? ` · ${copy.lastSync} ${formatDateTime(googleSummary.lastSyncedAt, locale)}` : ""}`
                      : copy.googleConnectHint}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black ${isGoogleConnected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {isGoogleConnected ? copy.connected : copy.disconnected}
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
                      {copy.syncAppointment}
                    </button>
                    <button
                      type="button"
                      onClick={handleGoogleDisconnect}
                      disabled={calendarBusy !== null}
                      className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground disabled:opacity-50"
                    >
                      <Unplug size={16} />
                      {copy.disconnect}
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
                    {copy.connectGoogle}
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
                    {copy.openManualGoogle}
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/80 bg-secondary/50 p-5 space-y-4 shadow-inner shadow-black/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-accent" />
                    <p className="font-bold text-foreground">{copy.appleCalendar}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {copy.appleBody}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-muted text-muted-foreground">
                  {copy.hybrid}
                </span>
              </div>

              {appleFallbackLink ? (
                <a
                  href={appleFallbackLink.url}
                  download="therapietermin.ics"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground"
                >
                  <ExternalLink size={16} />
                  {copy.downloadIcs}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">{copy.noAppointmentIcs}</p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{copy.nextAppointment}</p>
                <p className="text-sm font-bold text-foreground mt-1">{formatDateTime(profile?.nextAppointment, locale) || copy.noAppointment}</p>
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
                  <p className="font-bold text-foreground">{copy.resetPassword}</p>
                  <p className="text-xs text-muted-foreground">{copy.resetPasswordDesc}</p>
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
            {copy.resetSent} {profile?.email} gesendet.
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
            {copy.signOut}
          </motion.button>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
